import React, { useState } from "react";
import { Modal, View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { Icon } from "./Icon";
import { C, S } from "../theme";
import { norm, MUSCLES } from "../helpers";

export function ExercisePicker({ visible, exercises, onPick, onClose, onCreate }) {
  const [q, setQ] = useState("");
  const [mf, setMf] = useState("Todos");
  const [newMuscle, setNewMuscle] = useState("Otro");
  const muscles = ["Todos", ...Array.from(new Set(exercises.map((e) => e.muscle)))];
  const list = exercises
    .filter((e) => (mf === "Todos" || e.muscle === mf) && norm(e.name).includes(norm(q)))
    .sort((a, b) => a.name.localeCompare(b.name));
  const exact = exercises.some((e) => norm(e.name) === norm(q));

  const close = () => { setQ(""); setMf("Todos"); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(8,9,11,0.6)" }} onPress={close} />
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, maxHeight: "82%", backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderColor: C.line, padding: 16 }}>
        <View style={{ width: 38, height: 4, backgroundColor: C.line, borderRadius: 2, alignSelf: "center", marginBottom: 14 }} />
        <View style={[S.row, { gap: 10, marginBottom: 12 }]}>
          <Icon name="search" size={18} color={C.muted} />
          <TextInput style={[S.input, { flex: 1 }]} placeholder="Buscar o escribir nuevo…" placeholderTextColor={C.muted} value={q} onChangeText={setQ} autoFocus />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8, flexGrow: 0 }}>
          <View style={[S.row, { gap: 6 }]}>
            {muscles.map((m) => (
              <Pressable key={m} onPress={() => setMf(m)} style={[S.pillBtn, mf === m && S.pillBtnOn]}>
                <Text style={mf === m ? S.pillTextOn : S.pillText}>{m}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <ScrollView keyboardShouldPersistTaps="handled">
          {q.trim().length > 0 && !exact && (
            <View style={[S.card, { backgroundColor: C.surface2 }]}>
              <Text style={{ color: C.text, fontWeight: "700", marginBottom: 8 }}>Crear «{q.trim()}»</Text>
              <View style={[S.row, { flexWrap: "wrap", gap: 6, marginBottom: 12 }]}>
                {MUSCLES.map((m) => (
                  <Pressable key={m} onPress={() => setNewMuscle(m)} style={[S.pillBtn, newMuscle === m && S.pillBtnOn]}>
                    <Text style={newMuscle === m ? S.pillTextOn : S.pillText}>{m}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable style={[S.btn, { alignSelf: "flex-start", paddingVertical: 9 }]} onPress={() => { const idNew = onCreate(q.trim(), newMuscle); close(); onPick(idNew); }}>
                <Icon name="plus" size={14} /><Text style={S.btnText}>Añadir y elegir</Text>
              </Pressable>
            </View>
          )}
          {list.map((e) => (
            <Pressable key={e.id} onPress={() => { close(); onPick(e.id); }}
              style={[S.between, { paddingVertical: 13, borderBottomWidth: 1, borderColor: C.line }]}>
              <Text style={{ color: C.text, fontSize: 15 }}>{e.name}</Text>
              <View style={[S.chip]}><Text style={[S.chipText, { color: C.blue }]}>{e.muscle}</Text></View>
            </Pressable>
          ))}
          <View style={{ height: 20 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}
