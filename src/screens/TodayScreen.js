import React, { useState, useRef } from "react";
import { ScrollView, View, Text, Pressable, TextInput, Modal, Alert, PanResponder, Animated } from "react-native";
import { Icon } from "../components/Icon";
import { Stepper } from "../components/Stepper";
import { C, S } from "../theme";
import { uid, clone, todayISO, e1rm, firstInt, fmtDate, fmtDateLong, exName, exMuscle, FEELINGS } from "../helpers";
import { initHealthConnect, hasHealthPermissions, requestHealthPermissions, readSessionHealthData } from "../healthConnect";

function SwipeRow({ onDelete, onSkip, children }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dy) < 15,
      onPanResponderMove: (_, g) => translateX.setValue(g.dx),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -70) {
          // izquierda → borrar, sale por la izquierda
          Animated.timing(translateX, { toValue: -400, duration: 180, useNativeDriver: true }).start(onDelete);
        } else if (g.dx > 70) {
          // derecha → skip, vuelve al sitio
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          onSkip();
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  return (
    <Animated.View style={{ transform: [{ translateX }] }} {...pan.panHandlers}>
      {children}
    </Animated.View>
  );
}

export default function TodayScreen({ data, setData, session, setSession, unit, startRest, stopRest }) {
  const [picking, setPicking] = useState(false);
  const [summary, setSummary] = useState(null);
  const [collapsed, setCollapsed] = useState({});
  const [detail, setDetail] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const lastWeightFor = (exId) => {
    const logs = data.logs.filter((l) => l.entries.some((e) => e.exerciseId === exId)).sort((a, b) => b.date.localeCompare(a.date));
    if (!logs.length) return null;
    const entry = logs[0].entries.find((e) => e.exerciseId === exId);
    return Math.max(0, ...entry.sets.map((s) => s.weight || 0));
  };
  const bestE1rmFor = (exId) => {
    let best = 0;
    data.logs.forEach((l) => l.entries.filter((e) => e.exerciseId === exId).forEach((e) => e.sets.forEach((s) => { if (s.done !== false) best = Math.max(best, e1rm(s.weight, s.reps)); })));
    return best;
  };
  const suggestedDayId = (() => {
    if (!data.logs.length) return null;
    const last = [...data.logs].sort((a, b) => b.date.localeCompare(a.date))[0];
    const r = data.routines.find((x) => x.id === last.routineId);
    if (!r) return null;
    const idx = r.days.findIndex((d) => d.id === last.dayId);
    return r.days[(idx + 1) % r.days.length]?.id || null;
  })();

  const startDay = (routine, day) => {
    setSession({
      routineId: routine.id, dayId: day.id, dayName: day.name, feeling: null, note: "", startedAt: Date.now(),
      entries: day.exercises.filter((it) => it.exerciseId).map((it) => ({
        exerciseId: it.exerciseId, note: "", skipped: false,
        prescription: it.reps, cue: it.note || "", rest: it.rest ?? null, restAfter: it.restAfter ?? null, perSide: it.perSide || false,
        lastWeight: lastWeightFor(it.exerciseId), prevBest: bestE1rmFor(it.exerciseId),
        sets: Array.from({ length: it.sets }, () => ({ reps: firstInt(it.reps), weight: lastWeightFor(it.exerciseId) ?? it.weight, done: false, skipped: false })),
      })),
    });
    setCollapsed({});
    setPicking(false);
    // Pedimos permiso de Health Connect en segundo plano, sin bloquear el inicio del entreno.
    // Si el usuario ya lo concedió antes, esto no muestra ningún diálogo.
    (async () => {
      try {
        const ok = await initHealthConnect();
        if (!ok) return;
        const already = await hasHealthPermissions();
        if (!already) await requestHealthPermissions();
      } catch {}
    })();
  };

  const mut = (fn) => setSession((s) => { const n = clone(s); fn(n); return n; });

  // Auto-colapsar ejercicio cuando todas sus series están done o skipped
  const maybeCollapse = (session, ei) => {
    const entry = session.entries[ei];
    const allSettled = entry.sets.every((s) => s.done || s.skipped);
    if (allSettled && !entry.skipped) {
      setCollapsed((c) => ({ ...c, [ei]: true }));
    }
  };

  const skipExercise = (ei) => {
    Alert.alert("Saltar ejercicio", "¿Marcar este ejercicio como saltado en esta sesión?", [
      { text: "Cancelar" },
      { text: "Saltar", onPress: () => {
        mut((n) => {
          n.entries[ei].skipped = true;
          n.entries[ei].sets = n.entries[ei].sets.map((s) => ({ ...s, skipped: true, done: false }));
        });
        setCollapsed((c) => ({ ...c, [ei]: true }));
      }},
    ]);
  };

  const finish = async () => {
    const entries = session.entries.map((e) => ({
      exerciseId: e.exerciseId,
      note: e.note,
      skipped: e.skipped || false,
      sets: e.sets,
    })).filter((e) => e.skipped || e.sets.some((s) => s.done));

    let volume = 0; const prs = [];
    entries.forEach((e) => {
      const orig = session.entries.find((x) => x.exerciseId === e.exerciseId);
      e.sets.filter((s) => s.done).forEach((s) => (volume += (s.weight || 0) * (s.reps || 0)));
      const top = Math.max(0, ...e.sets.filter((s) => s.done).map((s) => e1rm(s.weight, s.reps)));
      if (top > (orig.prevBest || 0) + 0.01) prs.push(exName(data, e.exerciseId));
    });
    const startedAt = session.startedAt;
    const endedAt = Date.now();
    const durationMin = startedAt ? Math.max(1, Math.round((endedAt - startedAt) / 60000)) : null;
    const logId = uid();
    const log = { id: logId, date: todayISO(), routineId: session.routineId, dayId: session.dayId, dayName: session.dayName, feeling: session.feeling, note: session.note, durationMin, entries, health: null };
    setData((d) => ({ ...d, logs: [...d.logs, log] }));
    setSummary({ volume: Math.round(volume), sets: entries.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0), skipped: entries.filter((e) => e.skipped).length, prs, durationMin });
    setSession(null); stopRest();

    // Intentamos enriquecer con datos del reloj (Samsung Health vía Health Connect).
    // No bloquea el guardado: si falla o no hay permisos, el log se queda sin 'health'.
    if (startedAt) {
      try {
        const ok = await initHealthConnect();
        if (ok) {
          const granted = await hasHealthPermissions();
          if (granted) {
            const health = await readSessionHealthData(startedAt, endedAt);
            if (health) {
              setData((d) => ({ ...d, logs: d.logs.map((l) => (l.id === logId ? { ...l, health } : l)) }));
            }
          }
        }
      } catch {
        // silencioso: la sesión ya está guardada igualmente
      }
    }
  };

  if (summary)
    return (
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={[S.card, { alignItems: "center", paddingTop: 24, backgroundColor: C.surface }]}>
          <Icon name="check" size={40} color={C.positive} />
          <Text style={[S.disp, { fontSize: 22, marginTop: 8 }]}>¡Entrenamiento guardado!</Text>
          <View style={[S.row, { gap: 10, marginTop: 16 }]}>
            <View style={S.stat}><Text style={[S.bignum, { color: C.accent }]}>{summary.sets}</Text><Text style={S.sub}>series</Text></View>
            <View style={S.stat}><Text style={S.bignum}>{summary.volume}</Text><Text style={S.sub}>vol ({unit})</Text></View>
            {summary.durationMin != null && <View style={S.stat}><Text style={S.bignum}>{summary.durationMin}'</Text><Text style={S.sub}>duración</Text></View>}
          </View>
          {summary.skipped > 0 && (
            <Text style={[S.sub, { marginTop: 12, color: C.skipped }]}>
              {summary.skipped} ejercicio(s) saltado(s)
            </Text>
          )}
          {summary.prs.length > 0 && (
            <View style={{ marginTop: 12, alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.surface2, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 }}>
                <Icon name="flame" size={13} color={C.accent} /><Text style={{ color: C.accent, fontWeight: "700", fontSize: 12 }}>{summary.prs.length} récord(s)</Text>
              </View>
              <Text style={[S.sub, { marginTop: 8 }]}>{summary.prs.join(" · ")}</Text>
            </View>
          )}
        </View>
        <Pressable style={[S.btn, S.btnGhost]} onPress={() => setSummary(null)}><Text style={S.btnTextGhost}>Volver a Hoy</Text></Pressable>
      </ScrollView>
    );

  if (session) {
    const done = session.entries.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
    const total = session.entries.reduce((a, e) => a + e.sets.filter((s) => !s.skipped).length, 0);
    const skippedExs = session.entries.filter((e) => e.skipped).length;

    return (
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        {/* Cabecera sesión */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={[S.disp, { fontSize: 16 }]} numberOfLines={2}>{session.dayName}</Text>
            <Text style={S.sub}>{fmtDateLong(todayISO())}</Text>
          </View>
          <View style={{ alignItems: "flex-end", minWidth: 52 }}>
            <Text style={[S.bignum, { fontSize: 22, color: C.accent }]}>{done}/{total}</Text>
            <Text style={S.sub}>{skippedExs > 0 ? `${skippedExs} saltado(s)` : "series"}</Text>
          </View>
        </View>

        {session.entries.map((ex, ei) => {
          const allDone = ex.sets.every((s) => s.done || s.skipped);
          const isCollapsed = collapsed[ei] || false;
          const doneCount = ex.sets.filter((s) => s.done).length;
          const totalSets = ex.sets.length;

          if (ex.skipped) {
            return (
              <View key={ex.exerciseId} style={{ marginBottom: 8, opacity: 0.5 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Icon name="minus-circle" size={15} color={C.skipped} />
                  <Text style={{ color: C.muted, fontSize: 14, flex: 1, textDecorationLine: "line-through" }}>{exName(data, ex.exerciseId)}</Text>
                  <Pressable onPress={() => { mut((n) => { n.entries[ei].skipped = false; n.entries[ei].sets = n.entries[ei].sets.map((s) => ({ ...s, skipped: false })); }); setCollapsed((c) => ({ ...c, [ei]: false })); }}>
                    <Text style={[S.sub, { color: C.accent, fontSize: 12 }]}>restaurar</Text>
                  </Pressable>
                </View>
              </View>
            );
          }

          return (
            <View key={ex.exerciseId} style={[S.card, allDone && { opacity: 0.75 }]}>
              {/* Header ejercicio */}
              <Pressable onPress={() => setCollapsed((c) => ({ ...c, [ei]: !isCollapsed }))} style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    {allDone && <Icon name="check-circle" size={14} color={C.positive} />}
                    <Text style={{ color: allDone ? C.positive : C.text, fontWeight: "700", fontSize: 15 }}>{exName(data, ex.exerciseId)}</Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                    <Text style={[S.sub, { color: C.blue, fontSize: 12 }]}>{exMuscle(data, ex.exerciseId)}</Text>
                    {!!ex.prescription && <Text style={[S.sub, { fontSize: 12 }]}>· {ex.sets.length}×{ex.prescription}</Text>}
                    {ex.perSide && <Text style={[S.sub, { fontSize: 12, color: C.accent }]}>· c/u</Text>}
                  </View>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  {allDone && isCollapsed && (
                    <Text style={{ color: C.positive, fontSize: 12, fontWeight: "700" }}>{doneCount}/{totalSets} ✓</Text>
                  )}
                  {ex.lastWeight != null && !isCollapsed && (
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={[S.sub, { fontSize: 11 }]}>última</Text>
                      <Text style={{ color: C.text, fontWeight: "700", fontSize: 13 }}>{ex.lastWeight}{unit}</Text>
                    </View>
                  )}
                  <Icon name={isCollapsed ? "chevron-down" : "chevron-up"} size={16} color={C.muted} />
                </View>
              </Pressable>

              {/* Cuerpo colapsable */}
              {!isCollapsed && (
                <>
                  {!!ex.cue && (
                    <View style={{ flexDirection: "row", gap: 6, marginTop: 10, alignItems: "flex-start" }}>
                      <Icon name="flame" size={13} color={C.accent} />
                      <Text style={{ color: C.accent, fontSize: 13, flex: 1 }}>{ex.cue}</Text>
                    </View>
                  )}

                  {/* Cabecera columnas */}
                  <View style={{ flexDirection: "row", marginTop: 12, marginBottom: 2, alignItems: "center" }}>
                    <Text style={[S.sub, { width: 14, textAlign: "center", fontSize: 11 }]}></Text>
                    <Text style={[S.sub, { flex: 1, textAlign: "center", fontSize: 11 }]}>REPS</Text>
                    <Text style={[S.sub, { flex: 1, textAlign: "center", fontSize: 11 }]}>PESO{ex.perSide ? " c/u" : ""}</Text>
                    <Text style={{ width: 36 }}></Text>
                  </View>

                  {ex.sets.map((s, si) => (
                    <SwipeRow
                      key={si}
                      onDelete={() => mut((n) => n.entries[ei].sets.splice(si, 1))}
                      onSkip={() => {
                        mut((n) => {
                          const cur = n.entries[ei].sets[si].skipped;
                          n.entries[ei].sets[si].skipped = !cur;
                          n.entries[ei].sets[si].done = false;
                        });
                        setSession((prev) => {
                          const copy = clone(prev);
                          const allSettled = copy.entries[ei].sets.every((x) => x.done || x.skipped);
                          if (allSettled) setCollapsed((c) => ({ ...c, [ei]: true }));
                          return copy;
                        });
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, gap: 5, opacity: s.skipped ? 0.35 : 1, backgroundColor: C.surface }}>
                        <Text style={{ width: 14, textAlign: "center", color: s.skipped ? C.skipped : C.muted, fontWeight: "700", fontSize: 12 }}>{si + 1}</Text>
                        <View style={{ flex: 1 }}><Stepper value={s.reps} step={1} disabled={s.skipped || s.done} onChange={(v) => mut((n) => (n.entries[ei].sets[si].reps = v))} /></View>
                        <View style={{ flex: 1 }}><Stepper value={s.weight} step={2.5} disabled={s.skipped || s.done} onChange={(v) => mut((n) => (n.entries[ei].sets[si].weight = v))} /></View>
                        {/* Check */}
                        <Pressable
                          onPress={() => {
                            if (s.skipped) return;
                            const willDo = !s.done;
                            mut((n) => {
                              n.entries[ei].sets[si].done = willDo;
                              if (willDo) {
                                const isLast = si === ex.sets.length - 1;
                                if (isLast && ex.restAfter) startRest(ex.restAfter, "Cambio de ejercicio");
                                else startRest(ex.rest);
                              }
                            });
                            setSession((prev) => {
                              const copy = clone(prev);
                              copy.entries[ei].sets[si].done = !s.done;
                              const allSettled = copy.entries[ei].sets.every((x) => x.done || x.skipped);
                              if (allSettled && !s.done) setCollapsed((c) => ({ ...c, [ei]: true }));
                              return copy;
                            });
                          }}
                          style={[S.iconBtn, { width: 36, height: 36 }, s.done && { backgroundColor: C.positive }, s.skipped && { backgroundColor: C.surface2 }]}>
                          <Icon name={s.skipped ? "minus" : "check"} size={16} color={s.done ? "#06231a" : s.skipped ? C.skipped : C.muted} />
                        </Pressable>
                      </View>
                    </SwipeRow>
                  ))}
                  <Text style={[S.sub, { fontSize: 11, marginTop: 6 }]}>← borrar · skip serie →</Text>

                  <Pressable onPress={() => mut((n) => { const l = n.entries[ei].sets[n.entries[ei].sets.length - 1] || { reps: 8, weight: 0 }; n.entries[ei].sets.push({ reps: l.reps, weight: l.weight, done: false, skipped: false }); })}>
                    <Text style={[S.link, { marginTop: 12 }]}>+ añadir serie</Text>
                  </Pressable>

                  <TextInput
                    style={[S.input, { marginTop: 10, fontSize: 13 }]}
                    placeholder="Sensaciones / notas…"
                    placeholderTextColor={C.muted}
                    value={ex.note}
                    onChangeText={(t) => mut((n) => (n.entries[ei].note = t))}
                  />

                  {/* Saltar ejercicio completo */}
                  <Pressable onPress={() => skipExercise(ei)} style={{ marginTop: 10, alignSelf: "flex-end" }}>
                    <Text style={[S.sub, { color: C.skipped, fontSize: 12 }]}>saltar ejercicio →</Text>
                  </Pressable>
                </>
              )}
            </View>
          );
        })}

        {/* Sensación */}
        <View style={S.card}>
          <Text style={S.label}>Sensación general</Text>
          <View style={[S.row, { gap: 6 }]}>
            {FEELINGS.map((f) => (
              <Pressable key={f} style={[S.pillBtn, { flex: 1, alignItems: "center" }, session.feeling === f && S.pillBtnOn]} onPress={() => mut((n) => (n.feeling = n.feeling === f ? null : f))}>
                <Text style={session.feeling === f ? S.pillTextOn : S.pillText}>{f}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable style={S.btn} onPress={finish}>
          <Icon name="save" size={17} />
          <Text style={S.btnText}>Terminar y guardar</Text>
        </Pressable>
        <Pressable
          style={{ marginTop: 10, alignItems: "center", paddingVertical: 12 }}
          onPress={() => { setSession(null); stopRest(); }}>
          <Text style={{ color: C.negative, fontWeight: "700", fontSize: 14 }}>Cancelar entrenamiento</Text>
        </Pressable>
        <View style={{ height: 20 }} />
      </ScrollView>
    );
  }

  if (!data.routines.length)
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 30 }}>
        <Icon name="dumbbell" size={48} color={C.muted} />
        <Text style={[S.sub, { textAlign: "center", marginTop: 12 }]}>Aún no tienes rutinas. Crea una en Rutinas o impórtala desde Datos.</Text>
      </View>
    );

  const recent = [...data.logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Pressable style={S.btn} onPress={() => setPicking(true)}>
        <Icon name="play" size={17} />
        <Text style={S.btnText}>Empezar entrenamiento</Text>
      </Pressable>

      <Text style={[S.label, { marginTop: 22 }]}>Recientes</Text>
      {!recent.length && <Text style={S.sub}>Todavía no has registrado ninguno.</Text>}
      {recent.map((l) => {
        const sets = l.entries.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
        const skipped = l.entries.filter((e) => e.skipped).length;
        const vol = Math.round(l.entries.reduce((a, e) => a + e.sets.filter((s) => s.done).reduce((x, s) => x + (s.weight || 0) * (s.reps || 0), 0), 0));
        return (
          <Pressable key={l.id} onPress={() => setDetail(l)} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderColor: C.line }}>
            <View style={{ flex: 1 }}>
              <View style={[S.row, { gap: 8 }]}>
                <Text style={{ color: C.text, fontWeight: "700" }}>{l.dayName}</Text>
                {!!l.feeling && <Text style={[S.sub, { fontSize: 12 }]}>{l.feeling}</Text>}
                {!!l.health?.avgHr && <Icon name="heart" size={12} color={C.negative} />}
              </View>
              <Text style={S.sub}>{fmtDate(l.date)} · {l.entries.length} ejercicios · {sets} series{l.durationMin ? ` · ${l.durationMin}'` : ""}{skipped > 0 ? ` · ${skipped} saltado(s)` : ""}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ color: C.text, fontWeight: "800", fontSize: 17 }}>{vol}</Text>
              <Text style={S.sub}>{unit}</Text>
            </View>
            <View style={{ marginLeft: 8 }}><Icon name="chevron-right" size={16} color={C.muted} /></View>
          </Pressable>
        );
      })}

      <Modal visible={picking} transparent animationType="slide" onRequestClose={() => setPicking(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(8,9,11,0.6)" }} onPress={() => setPicking(false)} />
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, maxHeight: "80%", backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderColor: C.line, padding: 16 }}>
          <View style={{ width: 38, height: 4, backgroundColor: C.line, borderRadius: 2, alignSelf: "center", marginBottom: 14 }} />
          <Text style={[S.disp, { fontSize: 18, marginBottom: 12 }]}>¿Qué entrenas hoy?</Text>
          <ScrollView>
            {data.routines.map((r) => (
              <View key={r.id} style={{ marginBottom: 14 }}>
                <Text style={S.label}>{r.name}</Text>
                {r.days.map((day) => (
                  <Pressable key={day.id} onPress={() => startDay(r, day)}
                    style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderColor: C.line }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={{ color: C.text, fontWeight: "700" }}>{day.name}</Text>
                      {day.id === suggestedDayId && <View style={{ backgroundColor: C.accent, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 7 }}><Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>sugerido</Text></View>}
                    </View>
                    <Text style={S.sub}>{day.exercises.length} ejercicios</Text>
                  </Pressable>
                ))}
              </View>
            ))}
            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={!!detail} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setDetail(null)}>
        {detail && (
          <View style={{ flex: 1, backgroundColor: C.bg }}>
            <View style={{ flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderColor: C.line, backgroundColor: C.surface }}>
              <Pressable onPress={() => setDetail(null)} style={[S.iconBtn, { marginRight: 12 }]}>
                <Icon name="chevron-left" size={18} color={C.text} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={[S.disp, { fontSize: 18 }]}>{detail.dayName}</Text>
                <Text style={S.sub}>{fmtDateLong(detail.date)}</Text>
              </View>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {/* Stats generales */}
              <View style={[S.row, { gap: 10, flexWrap: "wrap" }]}>
                <View style={S.stat}>
                  <Text style={[S.bignum, { fontSize: 22, color: C.accent }]}>
                    {Math.round(detail.entries.reduce((a, e) => a + e.sets.filter((s) => s.done).reduce((x, s) => x + (s.weight || 0) * (s.reps || 0), 0), 0))}
                  </Text>
                  <Text style={S.sub}>vol ({unit})</Text>
                </View>
                {detail.durationMin != null && (
                  <View style={S.stat}><Text style={[S.bignum, { fontSize: 22 }]}>{detail.durationMin}'</Text><Text style={S.sub}>duración</Text></View>
                )}
                {!!detail.health?.avgHr && (
                  <View style={S.stat}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Icon name="heart" size={14} color={C.negative} />
                      <Text style={[S.bignum, { fontSize: 22 }]}>{detail.health.avgHr}</Text>
                    </View>
                    <Text style={S.sub}>fc media</Text>
                  </View>
                )}
                {!!detail.health?.maxHr && (
                  <View style={S.stat}><Text style={[S.bignum, { fontSize: 22, color: C.negative }]}>{detail.health.maxHr}</Text><Text style={S.sub}>fc máx</Text></View>
                )}
                {!!detail.health?.kcal && (
                  <View style={S.stat}><Text style={[S.bignum, { fontSize: 22 }]}>{detail.health.kcal}</Text><Text style={S.sub}>kcal</Text></View>
                )}
              </View>

              {!detail.health && (
                <View style={{ marginTop: 12 }}>
                  <Text style={[S.sub, { fontSize: 12, marginBottom: 8 }]}>
                    Sin datos del reloj para esta sesión.
                  </Text>
                  <Pressable
                    style={[S.btn, S.btnGhost, { paddingVertical: 10 }]}
                    disabled={syncing}
                    onPress={async () => {
                      setSyncing(true);
                      try {
                        const ok = await initHealthConnect();
                        if (ok) {
                          // Estimamos el rango: si no tenemos startedAt, usamos durationMin
                          const endMs = new Date(detail.date + "T23:59:59").getTime();
                          const startMs = detail.durationMin
                            ? endMs - detail.durationMin * 60000
                            : endMs - 2 * 3600000; // fallback: 2h antes del fin del día
                          const health = await readSessionHealthData(startMs, endMs);
                          if (health) {
                            setData((d) => ({ ...d, logs: d.logs.map((l) => l.id === detail.id ? { ...l, health } : l) }));
                            setDetail((prev) => ({ ...prev, health }));
                          } else {
                            Alert.alert("Sin datos", "Samsung Health no tiene registros de FC/kcal para ese rango horario. Asegúrate de que el reloj esté sincronizado.");
                          }
                        }
                      } catch (e) {
                        Alert.alert("Error", "No se pudo conectar con Health Connect.");
                      }
                      setSyncing(false);
                    }}
                  >
                    <Icon name={syncing ? "clock" : "heart"} size={15} color={C.muted} />
                    <Text style={S.btnTextGhost}>{syncing ? "Sincronizando…" : "Sincronizar datos del reloj"}</Text>
                  </Pressable>
                </View>
              )}

              {!!detail.feeling && (
                <View style={{ marginTop: 16 }}>
                  <Text style={S.label}>Sensación</Text>
                  <Text style={{ color: C.text }}>{detail.feeling}</Text>
                </View>
              )}
              {!!detail.note && (
                <View style={{ marginTop: 12 }}>
                  <Text style={S.label}>Nota</Text>
                  <Text style={{ color: C.text }}>{detail.note}</Text>
                </View>
              )}

              {/* Ejercicios */}
              <Text style={[S.label, { marginTop: 20 }]}>Ejercicios</Text>
              {detail.entries.map((e, i) => (
                <View key={i} style={[S.card, e.skipped && { opacity: 0.5 }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ color: C.text, fontWeight: "700", fontSize: 14, textDecorationLine: e.skipped ? "line-through" : "none" }}>
                      {exName(data, e.exerciseId)}
                    </Text>
                    <Text style={[S.sub, { color: C.blue, fontSize: 12 }]}>{exMuscle(data, e.exerciseId)}</Text>
                  </View>
                  {e.skipped ? (
                    <Text style={[S.sub, { color: C.skipped, marginTop: 6 }]}>Saltado</Text>
                  ) : (
                    <View style={{ marginTop: 8 }}>
                      {e.sets.map((s, si) => (
                        <Text key={si} style={[S.sub, { fontSize: 13, opacity: s.skipped ? 0.4 : 1 }]}>
                          Serie {si + 1}: {s.skipped ? "saltada" : `${s.reps} reps × ${s.weight}${unit}`}
                        </Text>
                      ))}
                    </View>
                  )}
                  {!!e.note && <Text style={[S.sub, { marginTop: 6, fontSize: 12, fontStyle: "italic" }]}>{e.note}</Text>}
                </View>
              ))}
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        )}
      </Modal>
    </ScrollView>
  );
}