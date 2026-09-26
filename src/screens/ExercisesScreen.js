import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable, TextInput, Alert } from 'react-native';
import { Icon } from '../components/Icon';
import { BottomSheet } from '../components/BottomSheet';
import { ConfirmModal } from '../components/ConfirmModal';
import { C, S } from '../theme';
import { norm, MUSCLES } from '../helpers';
import { makeExercise } from '../dataModel';
import { EXERCISE_TYPES, TYPE_LABELS, inferType, normalizeType } from '../domain/exerciseTypes';

function PillGroup({ options, value, onChange, label = (x) => x }) {
  return (
    <View style={[S.row, { flexWrap: 'wrap', gap: 6 }]}>
      {options.map((o) => (
        <Pressable
          key={o}
          onPress={() => onChange(o)}
          style={[S.pillBtn, value === o && S.pillBtnOn]}
        >
          <Text style={value === o ? S.pillTextOn : S.pillText}>{label(o)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// Formulario compartido por alta y edición.
function ExerciseForm({ value, onChange }) {
  return (
    <>
      <TextInput
        style={S.input}
        placeholder='Nombre del ejercicio'
        placeholderTextColor={C.muted}
        value={value.name}
        onChangeText={(name) => onChange({ ...value, name })}
      />
      <Text style={[S.label, { marginTop: 12 }]}>Músculo</Text>
      <PillGroup
        options={MUSCLES}
        value={value.muscle}
        onChange={(muscle) => onChange({ ...value, muscle })}
      />
      <Text style={[S.label, { marginTop: 12 }]}>Tipo</Text>
      <PillGroup
        options={EXERCISE_TYPES}
        value={value.type}
        label={(t) => TYPE_LABELS[t]}
        onChange={(type) => onChange({ ...value, type })}
      />
    </>
  );
}

export default function ExercisesScreen({ data, setData, session }) {
  const [q, setQ] = useState('');
  const [draft, setDraft] = useState(null); // alta
  const [edit, setEdit] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const usage = (id) =>
    data.routines.reduce(
      (a, r) =>
        a + r.days.reduce((x, d) => x + d.exercises.filter((e) => e.exerciseId === id).length, 0),
      0,
    ) +
    data.logs.reduce((a, l) => a + l.entries.filter((e) => e.exerciseId === id).length, 0) +
    // El entreno en curso aún no está en el historial, pero también lo usa.
    (session?.entries || []).filter((e) => e.exerciseId === id || e.swappedFrom === id).length;

  const nameError = (name, selfId) => {
    if (!name.trim()) return 'Ponle un nombre.';
    if (data.exercises.some((e) => e.id !== selfId && norm(e.name) === norm(name)))
      return 'Ya existe un ejercicio con ese nombre.';
    return null;
  };

  const add = () => {
    const err = nameError(draft.name);
    if (err) return Alert.alert('Revisa el ejercicio', err);
    setData((d) => ({
      ...d,
      exercises: [...d.exercises, makeExercise(draft.name, draft.muscle, draft.type)],
    }));
    setDraft(null);
  };
  const saveEdit = () => {
    const err = nameError(edit.name, edit.id);
    if (err) return Alert.alert('Revisa el ejercicio', err);
    const clean = { ...edit, name: edit.name.trim() };
    setData((d) => ({ ...d, exercises: d.exercises.map((e) => (e.id === clean.id ? clean : e)) }));
    setEdit(null);
  };
  const del = (e) => {
    if (usage(e.id) > 0)
      return Alert.alert(
        'En uso',
        'Este ejercicio está en rutinas o en tu historial. No se puede borrar.',
      );
    setToDelete(e);
  };

  const filtered = data.exercises.filter((e) => norm(e.name).includes(norm(q)));
  const byMuscle = {};
  filtered.forEach((e) => (byMuscle[e.muscle] = byMuscle[e.muscle] || []).push(e));

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps='handled'>
      <View style={[S.row, { gap: 10, marginBottom: 12 }]}>
        <Icon name='search' size={18} color={C.muted} />
        <TextInput
          style={[S.input, { flex: 1 }]}
          placeholder='Buscar ejercicio…'
          placeholderTextColor={C.muted}
          value={q}
          onChangeText={setQ}
        />
      </View>

      {!draft ? (
        <Pressable
          style={[S.btn, S.btnGhost]}
          onPress={() => setDraft({ name: '', muscle: 'Pecho', type: 'strength' })}
        >
          <Icon name='plus' size={16} color={C.text} />
          <Text style={S.btnTextGhost}>Nuevo ejercicio</Text>
        </Pressable>
      ) : (
        <View style={S.card}>
          <ExerciseForm
            value={draft}
            onChange={(v) =>
              // Mientras no se elija tipo a mano, se deduce del nombre/músculo.
              setDraft(
                v.type !== draft.type
                  ? { ...v, typeTouched: true }
                  : draft.typeTouched
                    ? v
                    : { ...v, type: inferType(v.name, v.muscle) },
              )
            }
          />
          <View style={[S.row, { gap: 8, marginTop: 14 }]}>
            <Pressable style={[S.btn, { flex: 1, paddingVertical: 9 }]} onPress={add}>
              <Text style={S.btnText}>Guardar</Text>
            </Pressable>
            <Pressable
              style={[S.btn, S.btnGhost, { flex: 1, paddingVertical: 9 }]}
              onPress={() => setDraft(null)}
            >
              <Text style={S.btnTextGhost}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={{ height: 12 }} />
      {Object.keys(byMuscle)
        .sort()
        .map((m) => (
          <View key={m} style={{ marginBottom: 6 }}>
            <Text style={S.label}>{m}</Text>
            {byMuscle[m]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((e) => (
                <View
                  key={e.id}
                  style={[S.card, S.between, { paddingVertical: 10, paddingHorizontal: 12 }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.text, fontWeight: '600' }}>{e.name}</Text>
                    <Text style={S.sub}>
                      {TYPE_LABELS[normalizeType(e.type)]} · {usage(e.id)} usos
                    </Text>
                  </View>
                  <View style={[S.row, { gap: 8 }]}>
                    <Pressable
                      style={S.iconBtn}
                      onPress={() => setEdit({ ...e, type: normalizeType(e.type) })}
                    >
                      <Icon name='edit-2' size={14} color={C.muted} />
                    </Pressable>
                    <Pressable style={S.iconBtn} onPress={() => del(e)}>
                      <Icon name='trash-2' size={14} color={C.muted} />
                    </Pressable>
                  </View>
                </View>
              ))}
          </View>
        ))}

      <BottomSheet visible={!!edit} onClose={() => setEdit(null)} maxHeight='90%' padding={18}>
        <Text style={S.label}>Editar ejercicio</Text>
        <ScrollView keyboardShouldPersistTaps='handled'>
          {edit && <ExerciseForm value={edit} onChange={setEdit} />}
          {edit && usage(edit.id) > 0 && (
            <Text style={[S.sub, { fontSize: 12, marginTop: 10 }]}>
              Cambiar el tipo no modifica las sesiones ya registradas.
            </Text>
          )}
          <Pressable style={[S.btn, { marginTop: 14 }]} onPress={saveEdit}>
            <Icon name='save' size={16} />
            <Text style={S.btnText}>Guardar</Text>
          </Pressable>
          <View style={{ height: 10 }} />
        </ScrollView>
      </BottomSheet>

      <ConfirmModal
        visible={!!toDelete}
        title='¿Borrar ejercicio?'
        message={`Se eliminará «${toDelete?.name}» de la biblioteca.`}
        confirmLabel='Borrar'
        destructive
        onConfirm={() => {
          const id = toDelete.id;
          setToDelete(null);
          setData((d) => ({ ...d, exercises: d.exercises.filter((e) => e.id !== id) }));
        }}
        onCancel={() => setToDelete(null)}
      />
    </ScrollView>
  );
}
