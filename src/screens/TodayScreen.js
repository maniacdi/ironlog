import React, { useState } from "react";
import { ScrollView, View, Text, Pressable, TextInput, Modal } from "react-native";
import { Icon } from "../components/Icon";
import { Stepper } from "../components/Stepper";
import { C, S } from "../theme";
import { uid, clone, todayISO, e1rm, firstInt, fmtDate, fmtDateLong, exName, exMuscle, FEELINGS } from "../helpers";

export default function TodayScreen({ data, setData, session, setSession, unit, startRest, stopRest }) {
  const [picking, setPicking] = useState(false);
  const [summary, setSummary] = useState(null);

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
        exerciseId: it.exerciseId, note: "",
        prescription: it.reps, cue: it.note || "", rest: it.rest ?? null, restAfter: it.restAfter ?? null, perSide: it.perSide || false,
        lastWeight: lastWeightFor(it.exerciseId), prevBest: bestE1rmFor(it.exerciseId),
        sets: Array.from({ length: it.sets }, () => ({ reps: firstInt(it.reps), weight: lastWeightFor(it.exerciseId) ?? it.weight, done: false })),
      })),
    });
    setPicking(false);
  };

  const mut = (fn) => setSession((s) => { const n = clone(s); fn(n); return n; });

  const finish = () => {
    const entries = session.entries.map((e) => ({ exerciseId: e.exerciseId, note: e.note, sets: e.sets.filter((s) => s.done) })).filter((e) => e.sets.length);
    let volume = 0; const prs = [];
    entries.forEach((e) => {
      const orig = session.entries.find((x) => x.exerciseId === e.exerciseId);
      e.sets.forEach((s) => (volume += (s.weight || 0) * (s.reps || 0)));
      const top = Math.max(0, ...e.sets.map((s) => e1rm(s.weight, s.reps)));
      if (top > (orig.prevBest || 0) + 0.01) prs.push(exName(data, e.exerciseId));
    });
    const durationMin = session.startedAt ? Math.max(1, Math.round((Date.now() - session.startedAt) / 60000)) : null;
    const log = { id: uid(), date: todayISO(), routineId: session.routineId, dayId: session.dayId, dayName: session.dayName, feeling: session.feeling, note: session.note, durationMin, entries };
    setData((d) => ({ ...d, logs: [...d.logs, log] }));
    setSummary({ volume: Math.round(volume), sets: entries.reduce((a, e) => a + e.sets.length, 0), prs, durationMin });
    setSession(null); stopRest();
  };

  if (summary)
    return (
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={[S.card, { alignItems: "center", paddingTop: 24 }]}>
          <Icon name="check" size={40} color={C.positive} />
          <Text style={[S.disp, { fontSize: 22, marginTop: 8 }]}>¡Entrenamiento guardado!</Text>
          <View style={[S.row, { gap: 10, marginTop: 16 }]}>
            <View style={S.stat}><Text style={[S.bignum, { color: C.accent }]}>{summary.sets}</Text><Text style={S.sub}>series</Text></View>
            <View style={S.stat}><Text style={S.bignum}>{summary.volume}</Text><Text style={S.sub}>vol ({unit})</Text></View>
            {summary.durationMin != null && <View style={S.stat}><Text style={S.bignum}>{summary.durationMin}'</Text><Text style={S.sub}>duración</Text></View>}
          </View>
          {summary.prs.length > 0 && (
            <View style={{ marginTop: 16, alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: C.accent, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 }}>
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
    const total = session.entries.reduce((a, e) => a + e.sets.length, 0);
    return (
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <View style={[S.card, S.between]}>
          <View>
            <Text style={[S.disp, { fontSize: 18 }]}>{session.dayName}</Text>
            <Text style={S.sub}>{fmtDateLong(todayISO())}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[S.bignum, { fontSize: 22, color: C.accent }]}>{done}/{total}</Text>
            <Text style={S.sub}>series</Text>
          </View>
        </View>

        {session.entries.map((ex, ei) => (
          <View style={S.card} key={ex.exerciseId}>
            <View style={S.between}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontWeight: "700", fontSize: 15 }}>{exName(data, ex.exerciseId)}</Text>
                <View style={[S.row, { gap: 6, marginTop: 5, flexWrap: "wrap" }]}>
                  <View style={S.chip}><Text style={[S.chipText, { color: C.blue }]}>{exMuscle(data, ex.exerciseId)}</Text></View>
                  {!!ex.prescription && <View style={S.chip}><Text style={S.chipText}>objetivo {ex.sets.length}×{ex.prescription}</Text></View>}
                  {ex.perSide && <View style={[S.chip, { borderColor: C.accent }]}><Text style={[S.chipText, { color: C.accent }]}>c/u</Text></View>}
                </View>
              </View>
              {ex.lastWeight != null && (
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={S.sub}>última vez</Text>
                  <Text style={{ color: C.text, fontWeight: "700" }}>{ex.lastWeight} {unit}{ex.perSide ? " c/u" : ""}</Text>
                </View>
              )}
            </View>
            {!!ex.cue && (
              <View style={[S.row, { gap: 6, marginTop: 8, alignItems: "flex-start" }]}>
                <Icon name="flame" size={13} color={C.accent} /><Text style={{ color: C.accent, fontSize: 13, flex: 1 }}>{ex.cue}</Text>
              </View>
            )}
            <View style={{ flexDirection: "row", marginTop: 10, marginBottom: 2 }}>
              <Text style={[S.sub, { width: 28, textAlign: "center", fontSize: 11 }]}></Text>
              <Text style={[S.sub, { flex: 1, textAlign: "center", fontSize: 11 }]}>REPS</Text>
              <Text style={[S.sub, { flex: 1, textAlign: "center", fontSize: 11 }]}>PESO ({unit}){ex.perSide ? " c/u" : ""}</Text>
              <Text style={{ width: 40 }}></Text>
            </View>
            {ex.sets.map((s, si) => (
              <View key={si} style={{ flexDirection: "row", alignItems: "center", marginTop: 8, gap: 7 }}>
                <Text style={{ width: 24, textAlign: "center", color: C.muted, fontWeight: "700" }}>{si + 1}</Text>
                <View style={{ flex: 1 }}><Stepper value={s.reps} step={1} onChange={(v) => mut((n) => (n.entries[ei].sets[si].reps = v))} /></View>
                <View style={{ flex: 1 }}><Stepper value={s.weight} step={2.5} onChange={(v) => mut((n) => (n.entries[ei].sets[si].weight = v))} /></View>
                <Pressable
                  onPress={() => {
                    const willDo = !s.done;
                    mut((n) => (n.entries[ei].sets[si].done = willDo));
                    if (willDo) {
                      const isLast = si === ex.sets.length - 1;
                      if (isLast && ex.restAfter) startRest(ex.restAfter, "Cambio de ejercicio");
                      else startRest(ex.rest);
                    }
                  }}
                  onLongPress={() => mut((n) => n.entries[ei].sets.splice(si, 1))}
                  style={[S.iconBtn, s.done && { backgroundColor: C.positive, borderColor: C.positive }]}>
                  <Icon name="check" size={16} color={s.done ? "#06231a" : C.muted} />
                </Pressable>
              </View>
            ))}
            <Pressable onPress={() => mut((n) => { const l = n.entries[ei].sets[n.entries[ei].sets.length - 1] || { reps: 8, weight: 0 }; n.entries[ei].sets.push({ reps: l.reps, weight: l.weight, done: false }); })}>
              <Text style={[S.link, { marginTop: 10 }]}>+ añadir serie</Text>
            </Pressable>
            <TextInput style={[S.input, { marginTop: 10, fontSize: 13 }]} placeholder="Sensaciones / notas…" placeholderTextColor={C.muted}
              value={ex.note} onChangeText={(t) => mut((n) => (n.entries[ei].note = t))} />
          </View>
        ))}

        <View style={S.card}>
          <Text style={S.label}>Sensación general del día</Text>
          <View style={[S.row, { gap: 6 }]}>
            {FEELINGS.map((f) => (
              <Pressable key={f} style={[S.pillBtn, { flex: 1, alignItems: "center" }, session.feeling === f && S.pillBtnOn]} onPress={() => mut((n) => (n.feeling = n.feeling === f ? null : f))}>
                <Text style={session.feeling === f ? S.pillTextOn : S.pillText}>{f}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable style={S.btn} onPress={finish}><Icon name="save" size={17} /><Text style={S.btnText}>Terminar y guardar</Text></Pressable>
        <Pressable style={[S.btn, { backgroundColor: "transparent", borderWidth: 1, borderColor: C.line, marginTop: 10 }]} onPress={() => { setSession(null); stopRest(); }}>
          <Text style={{ color: C.negative, fontWeight: "700" }}>Cancelar entrenamiento</Text>
        </Pressable>
        <Text style={[S.sub, { textAlign: "center", marginTop: 10 }]}>Mantén pulsado el check para borrar una serie.</Text>
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
      <Pressable style={S.btn} onPress={() => setPicking(true)}><Icon name="play" size={17} /><Text style={S.btnText}>Empezar entrenamiento</Text></Pressable>

      <Text style={[S.label, { marginTop: 22 }]}>Entrenamientos recientes</Text>
      {!recent.length && <Text style={S.sub}>Todavía no has registrado ninguno.</Text>}
      {recent.map((l) => {
        const sets = l.entries.reduce((a, e) => a + e.sets.length, 0);
        const vol = Math.round(l.entries.reduce((a, e) => a + e.sets.reduce((x, s) => x + (s.weight || 0) * (s.reps || 0), 0), 0));
        return (
          <View key={l.id} style={[S.card, S.between]}>
            <View style={{ flex: 1 }}>
              <View style={[S.row, { gap: 8 }]}>
                <Text style={{ color: C.text, fontWeight: "700" }}>{l.dayName}</Text>
                {!!l.feeling && <View style={S.chip}><Text style={S.chipText}>{l.feeling}</Text></View>}
              </View>
              <Text style={S.sub}>{fmtDate(l.date)} · {l.entries.length} ejercicios · {sets} series{l.durationMin ? ` · ${l.durationMin}'` : ""}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}><Text style={[S.disp, { fontSize: 17 }]}>{vol}</Text><Text style={S.sub}>{unit} vol</Text></View>
          </View>
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
                    style={[S.between, { backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 12, marginBottom: 8 }]}>
                    <View>
                      <View style={[S.row, { gap: 8 }]}>
                        <Text style={{ color: C.text, fontWeight: "700" }}>{day.name}</Text>
                        {day.id === suggestedDayId && <View style={[S.chip, { borderColor: C.accent }]}><Text style={[S.chipText, { color: C.accent }]}>sugerido</Text></View>}
                      </View>
                      <Text style={[S.sub, { marginTop: 2 }]}>{day.exercises.length} ejercicios</Text>
                    </View>
                    <Icon name="chevron-right" size={18} color={C.muted} />
                  </Pressable>
                ))}
              </View>
            ))}
            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}
