import React, { useState } from "react";
import { ScrollView, View, Text, Pressable, TextInput } from "react-native";
import { Icon } from "../components/Icon";
import { Stepper } from "../components/Stepper";
import { ExercisePicker } from "../components/ExercisePicker";
import { C, S } from "../theme";
import { uid, clone, norm, exName } from "../helpers";

export default function RoutinesScreen({ data, setData, unit }) {
  const [editing, setEditing] = useState(null);

  const createExercise = (name, muscle) => {
    const found = data.exercises.find((e) => norm(e.name) === norm(name));
    if (found) return found.id;
    const ex = { id: uid(), name: name.trim(), muscle: muscle || "Otro" };
    setData((d) => ({ ...d, exercises: [...d.exercises, ex] }));
    return ex.id;
  };
  const saveRoutine = (r) => {
    const cleanR = { id: r.id, name: r.name || "Sin nombre", days: r.days.map((d) => ({ ...d, exercises: d.exercises.filter((e) => e.exerciseId) })) };
    setData((d) => {
      const exists = d.routines.some((x) => x.id === r.id);
      return { ...d, routines: exists ? d.routines.map((x) => (x.id === r.id ? cleanR : x)) : [...d.routines, cleanR] };
    });
    setEditing(null);
  };
  const del = (id) => setData((d) => ({ ...d, routines: d.routines.filter((r) => r.id !== id) }));
  const duplicate = (r) => {
    const c = clone(r); c.id = uid(); c.name = r.name + " (copia)";
    c.days.forEach((dy) => { dy.id = uid(); dy.exercises.forEach((e) => (e.id = uid())); });
    setData((d) => ({ ...d, routines: [...d.routines, c] }));
  };

  if (editing) return <RoutineEditor routine={editing} exercises={data.exercises} dataRef={data} createExercise={createExercise} onSave={saveRoutine} onCancel={() => setEditing(null)} unit={unit} />;

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Pressable style={S.btn} onPress={() => setEditing({ id: uid(), name: "", days: [] })}><Icon name="plus" size={17} /><Text style={S.btnText}>Nueva rutina</Text></Pressable>
      <View style={{ height: 16 }} />
      {!data.routines.length && (
        <View style={{ alignItems: "center", padding: 30 }}><Icon name="list" size={48} color={C.muted} /><Text style={[S.sub, { textAlign: "center", marginTop: 12 }]}>Crea tu primera rutina para empezar.</Text></View>
      )}
      {data.routines.map((r) => (
        <View key={r.id} style={S.card}>
          <View style={S.between}>
            <Text style={[S.disp, { fontSize: 18, flex: 1 }]}>{r.name}</Text>
            <View style={[S.row, { gap: 8 }]}>
              <Pressable style={S.iconBtn} onPress={() => duplicate(r)}><Icon name="copy" size={15} color={C.muted} /></Pressable>
              <Pressable style={S.iconBtn} onPress={() => setEditing(clone(r))}><Icon name="edit-2" size={15} color={C.muted} /></Pressable>
              <Pressable style={S.iconBtn} onPress={() => del(r.id)}><Icon name="trash-2" size={15} color={C.muted} /></Pressable>
            </View>
          </View>
          {r.days.map((day) => (
            <View key={day.id} style={{ marginTop: 10 }}>
              <Text style={S.label}>{day.name} · {day.exercises.length} ejercicios</Text>
              <View style={[S.row, { flexWrap: "wrap", gap: 6 }]}>
                {day.exercises.map((e) => <View key={e.id} style={S.chip}><Text style={S.chipText}>{exName(data, e.exerciseId)}</Text></View>)}
              </View>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

function RoutineEditor({ routine, exercises, dataRef, createExercise, onSave, onCancel, unit }) {
  const [r, setR] = useState(clone(routine));
  const [picker, setPicker] = useState(null);
  const set = (fn) => setR((p) => { const n = clone(p); fn(n); return n; });
  const move = (arr, i, dir) => { const j = i + dir; if (j < 0 || j >= arr.length) return; const t = arr[i]; arr[i] = arr[j]; arr[j] = t; };

  const restOpts = [["auto", null], ["60", 60], ["90", 90], ["120", 120], ["150", 150]];
  const restAfterOpts = [["auto", null], ["30", 30], ["45", 45], ["60", 60], ["90", 90]];

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Pressable onPress={onCancel} style={[S.row, { gap: 4, marginBottom: 12 }]}><Icon name="arrow-left" size={16} color={C.accent} /><Text style={S.link}>Volver</Text></Pressable>
      <Text style={S.label}>Nombre de la rutina</Text>
      <TextInput style={S.input} value={r.name} placeholder="Ej. Full Body 3 días" placeholderTextColor={C.muted} onChangeText={(t) => set((n) => (n.name = t))} />

      {r.days.map((day, di) => (
        <View key={day.id} style={[S.card, { marginTop: 14 }]}>
          <View style={[S.row, { gap: 10 }]}>
            <TextInput style={[S.input, { flex: 1 }]} value={day.name} placeholder="Nombre del día" placeholderTextColor={C.muted} onChangeText={(t) => set((n) => (n.days[di].name = t))} />
            <Pressable style={S.iconBtn} onPress={() => set((n) => n.days.splice(di, 1))}><Icon name="trash-2" size={15} color={C.muted} /></Pressable>
          </View>

          {day.exercises.map((item, ei) => (
            <View key={item.id} style={{ marginTop: 10, padding: 10, backgroundColor: C.surface2, borderRadius: 10 }}>
              <View style={[S.row, { gap: 6 }]}>
                <Pressable onPress={() => setPicker({ di, ei })} style={[S.between, { flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 12 }]}>
                  <Text style={{ color: item.exerciseId ? C.text : C.muted }}>{item.exerciseId ? exName(dataRef, item.exerciseId) : "Elegir ejercicio…"}</Text>
                  <Icon name="chevron-right" size={16} color={C.muted} />
                </Pressable>
                <Pressable style={S.iconBtn} onPress={() => set((n) => move(n.days[di].exercises, ei, -1))}><Icon name="chevron-up" size={15} color={C.muted} /></Pressable>
                <Pressable style={S.iconBtn} onPress={() => set((n) => move(n.days[di].exercises, ei, 1))}><Icon name="chevron-down" size={15} color={C.muted} /></Pressable>
                <Pressable style={S.iconBtn} onPress={() => set((n) => n.days[di].exercises.splice(ei, 1))}><Icon name="x" size={15} color={C.muted} /></Pressable>
              </View>
              <View style={[S.row, { marginTop: 8, gap: 8 }]}>
                <View style={{ flex: 1 }}><Text style={[S.sub, { marginBottom: 4 }]}>Series</Text><Stepper value={item.sets} step={1} min={1} onChange={(v) => set((n) => (n.days[di].exercises[ei].sets = v))} /></View>
                <View style={{ flex: 1.3 }}><Text style={[S.sub, { marginBottom: 4 }]}>Reps</Text>
                  <TextInput style={[S.input, { textAlign: "center", paddingVertical: 9 }]} value={String(item.reps)} placeholder="8-10" placeholderTextColor={C.muted} onChangeText={(t) => set((n) => (n.days[di].exercises[ei].reps = t))} /></View>
                <View style={{ flex: 1 }}><Text style={[S.sub, { marginBottom: 4 }]}>Peso {unit}</Text><Stepper value={item.weight} step={2.5} onChange={(v) => set((n) => (n.days[di].exercises[ei].weight = v))} /></View>
              </View>
              <TextInput style={[S.input, { marginTop: 8, fontSize: 13 }]} value={item.note || ""} placeholder="Nota (ej. Busca 75 kg, RPE 9…)" placeholderTextColor={C.muted} onChangeText={(t) => set((n) => (n.days[di].exercises[ei].note = t))} />
              <View style={[S.between, { marginTop: 8 }]}>
                <Text style={S.sub}>Peso por mano/pierna (c/u)</Text>
                <Pressable onPress={() => set((n) => (n.days[di].exercises[ei].perSide = !n.days[di].exercises[ei].perSide))} style={[S.pillBtn, item.perSide && S.pillBtnOn]}>
                  <Text style={item.perSide ? S.pillTextOn : S.pillText}>{item.perSide ? "c/u sí" : "c/u no"}</Text>
                </Pressable>
              </View>
              <Text style={[S.sub, { marginTop: 8, marginBottom: 4 }]}>Descanso entre series</Text>
              <View style={[S.row, { flexWrap: "wrap", gap: 6 }]}>
                {restOpts.map(([lbl, val]) => (
                  <Pressable key={lbl} onPress={() => set((n) => (n.days[di].exercises[ei].rest = val))} style={[S.pillBtn, (item.rest ?? null) === val && S.pillBtnOn]}>
                    <Text style={(item.rest ?? null) === val ? S.pillTextOn : S.pillText}>{lbl === "auto" ? "auto" : lbl + "s"}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[S.sub, { marginTop: 8, marginBottom: 4 }]}>Descanso al cambiar de ejercicio</Text>
              <View style={[S.row, { flexWrap: "wrap", gap: 6 }]}>
                {restAfterOpts.map(([lbl, val]) => (
                  <Pressable key={lbl} onPress={() => set((n) => (n.days[di].exercises[ei].restAfter = val))} style={[S.pillBtn, (item.restAfter ?? null) === val && S.pillBtnOn]}>
                    <Text style={(item.restAfter ?? null) === val ? S.pillTextOn : S.pillText}>{lbl === "auto" ? "auto" : lbl + "s"}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
          <Pressable onPress={() => set((n) => n.days[di].exercises.push({ id: uid(), exerciseId: null, sets: 3, reps: "8-10", weight: 20, note: "", rest: null, restAfter: null, perSide: false }))}>
            <Text style={[S.link, { marginTop: 10 }]}>+ añadir ejercicio</Text>
          </Pressable>
        </View>
      ))}

      <Pressable style={[S.btn, S.btnGhost, { marginTop: 14 }]} onPress={() => set((n) => n.days.push({ id: uid(), name: "Día " + (n.days.length + 1), exercises: [] }))}>
        <Icon name="plus" size={16} color={C.text} /><Text style={S.btnTextGhost}>Añadir día</Text>
      </Pressable>
      <Pressable style={[S.btn, { marginTop: 10 }]} onPress={() => onSave(r)}><Icon name="save" size={16} /><Text style={S.btnText}>Guardar rutina</Text></Pressable>
      <View style={{ height: 30 }} />

      <ExercisePicker visible={!!picker} exercises={exercises} onCreate={createExercise} onClose={() => setPicker(null)}
        onPick={(exId) => { set((n) => (n.days[picker.di].exercises[picker.ei].exerciseId = exId)); setPicker(null); }} />
    </ScrollView>
  );
}
