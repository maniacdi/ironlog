import React, { useState } from "react";
import { ScrollView, View, Text, Pressable, TextInput, Modal, Alert } from "react-native";
import { Icon } from "../components/Icon";
import { C, S } from "../theme";
import { uid, norm, MUSCLES } from "../helpers";

export default function ExercisesScreen({ data, setData }) {
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [muscle, setMuscle] = useState("Pecho");
  const [edit, setEdit] = useState(null);

  const usage = (id) =>
    data.routines.reduce((a, r) => a + r.days.reduce((x, d) => x + d.exercises.filter((e) => e.exerciseId === id).length, 0), 0) +
    data.logs.reduce((a, l) => a + l.entries.filter((e) => e.exerciseId === id).length, 0);

  const add = () => {
    if (!name.trim()) return;
    setData((d) => ({ ...d, exercises: [...d.exercises, { id: uid(), name: name.trim(), muscle }] }));
    setName(""); setAdding(false);
  };
  const del = (id) => {
    if (usage(id) > 0) { Alert.alert("En uso", "Este ejercicio está en rutinas o en tu historial. No se puede borrar."); return; }
    setData((d) => ({ ...d, exercises: d.exercises.filter((e) => e.id !== id) }));
  };
  const saveEdit = () => { setData((d) => ({ ...d, exercises: d.exercises.map((e) => (e.id === edit.id ? edit : e)) })); setEdit(null); };

  const filtered = data.exercises.filter((e) => norm(e.name).includes(norm(q)));
  const byMuscle = {};
  filtered.forEach((e) => { (byMuscle[e.muscle] = byMuscle[e.muscle] || []).push(e); });

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <View style={[S.row, { gap: 10, marginBottom: 12 }]}>
        <Icon name="search" size={18} color={C.muted} />
        <TextInput style={[S.input, { flex: 1 }]} placeholder="Buscar ejercicio…" placeholderTextColor={C.muted} value={q} onChangeText={setQ} />
      </View>

      {!adding ? (
        <Pressable style={[S.btn, S.btnGhost]} onPress={() => setAdding(true)}><Icon name="plus" size={16} color={C.text} /><Text style={S.btnTextGhost}>Nuevo ejercicio</Text></Pressable>
      ) : (
        <View style={S.card}>
          <TextInput style={S.input} placeholder="Nombre del ejercicio" placeholderTextColor={C.muted} value={name} onChangeText={setName} autoFocus />
          <View style={[S.row, { flexWrap: "wrap", gap: 6, marginVertical: 12 }]}>
            {MUSCLES.map((m) => <Pressable key={m} onPress={() => setMuscle(m)} style={[S.pillBtn, muscle === m && S.pillBtnOn]}><Text style={muscle === m ? S.pillTextOn : S.pillText}>{m}</Text></Pressable>)}
          </View>
          <View style={[S.row, { gap: 8 }]}>
            <Pressable style={[S.btn, { flex: 1, paddingVertical: 9 }]} onPress={add}><Text style={S.btnText}>Guardar</Text></Pressable>
            <Pressable style={[S.btn, S.btnGhost, { flex: 1, paddingVertical: 9 }]} onPress={() => setAdding(false)}><Text style={S.btnTextGhost}>Cancelar</Text></Pressable>
          </View>
        </View>
      )}

      <View style={{ height: 12 }} />
      {Object.keys(byMuscle).sort().map((m) => (
        <View key={m} style={{ marginBottom: 6 }}>
          <Text style={S.label}>{m}</Text>
          {byMuscle[m].sort((a, b) => a.name.localeCompare(b.name)).map((e) => (
            <View key={e.id} style={[S.card, S.between, { paddingVertical: 10, paddingHorizontal: 12 }]}>
              <View>
                <Text style={{ color: C.text, fontWeight: "600" }}>{e.name}</Text>
                <Text style={S.sub}>{usage(e.id)} usos</Text>
              </View>
              <View style={[S.row, { gap: 8 }]}>
                <Pressable style={S.iconBtn} onPress={() => setEdit({ ...e })}><Icon name="edit-2" size={14} color={C.muted} /></Pressable>
                <Pressable style={S.iconBtn} onPress={() => del(e.id)}><Icon name="trash-2" size={14} color={C.muted} /></Pressable>
              </View>
            </View>
          ))}
        </View>
      ))}

      <Modal visible={!!edit} transparent animationType="slide" onRequestClose={() => setEdit(null)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(8,9,11,0.6)" }} onPress={() => setEdit(null)} />
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderColor: C.line, padding: 18 }}>
          <View style={{ width: 38, height: 4, backgroundColor: C.line, borderRadius: 2, alignSelf: "center", marginBottom: 14 }} />
          <Text style={S.label}>Editar ejercicio</Text>
          {edit && <TextInput style={S.input} value={edit.name} onChangeText={(t) => setEdit({ ...edit, name: t })} />}
          <View style={[S.row, { flexWrap: "wrap", gap: 6, marginVertical: 12 }]}>
            {MUSCLES.map((m) => <Pressable key={m} onPress={() => setEdit({ ...edit, muscle: m })} style={[S.pillBtn, edit?.muscle === m && S.pillBtnOn]}><Text style={edit?.muscle === m ? S.pillTextOn : S.pillText}>{m}</Text></Pressable>)}
          </View>
          <Pressable style={S.btn} onPress={saveEdit}><Icon name="save" size={16} /><Text style={S.btnText}>Guardar</Text></Pressable>
        </View>
      </Modal>
    </ScrollView>
  );
}
