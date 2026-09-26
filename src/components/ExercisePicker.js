import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { Icon } from './Icon';
import { BottomSheet } from './BottomSheet';
import { C, S } from '../theme';
import { norm, MUSCLES } from '../helpers';
import { TYPE_LABELS } from '../domain/exerciseTypes';

// Selector de ejercicio con búsqueda y alta rápida.
// `preferMuscle`: esos ejercicios aparecen primero (sustituciones en sesión).
// `excludeId`: no se ofrece (el ejercicio que se está sustituyendo).
export function ExercisePicker({
  visible,
  exercises,
  onPick,
  onClose,
  onCreate,
  title,
  preferMuscle,
  excludeId,
}) {
  const [q, setQ] = useState('');
  const [mf, setMf] = useState('Todos');
  const [newMuscle, setNewMuscle] = useState(preferMuscle || 'Otro');
  const muscles = ['Todos', ...Array.from(new Set(exercises.map((e) => e.muscle)))];
  const list = exercises
    .filter(
      (e) =>
        e.id !== excludeId && (mf === 'Todos' || e.muscle === mf) && norm(e.name).includes(norm(q)),
    )
    .sort(
      (a, b) =>
        (b.muscle === preferMuscle) - (a.muscle === preferMuscle) || a.name.localeCompare(b.name),
    );
  const exact = exercises.some((e) => norm(e.name) === norm(q));
  const firstOther = preferMuscle ? list.findIndex((e) => e.muscle !== preferMuscle) : -1;

  const close = () => {
    setQ('');
    setMf('Todos');
    onClose();
  };
  const pick = (id) => {
    setQ('');
    setMf('Todos');
    onPick(id);
  };

  return (
    <BottomSheet visible={visible} onClose={close} maxHeight='82%'>
      {!!title && <Text style={[S.disp, { fontSize: 16, marginBottom: 10 }]}>{title}</Text>}
      <View style={[S.row, { gap: 10, marginBottom: 12 }]}>
        <Icon name='search' size={18} color={C.muted} />
        <TextInput
          style={[S.input, { flex: 1 }]}
          placeholder='Buscar o escribir nuevo…'
          placeholderTextColor={C.muted}
          value={q}
          onChangeText={setQ}
          autoFocus={!preferMuscle}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 8, flexGrow: 0 }}
      >
        <View style={[S.row, { gap: 6 }]}>
          {muscles.map((m) => (
            <Pressable
              key={m}
              onPress={() => setMf(m)}
              style={[S.pillBtn, mf === m && S.pillBtnOn]}
            >
              <Text style={mf === m ? S.pillTextOn : S.pillText}>{m}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <ScrollView keyboardShouldPersistTaps='handled'>
        {q.trim().length > 0 && !exact && (
          <View style={[S.card, { backgroundColor: C.surface2 }]}>
            <Text style={{ color: C.text, fontWeight: '700', marginBottom: 8 }}>
              Crear «{q.trim()}»
            </Text>
            <View style={[S.row, { flexWrap: 'wrap', gap: 6, marginBottom: 12 }]}>
              {MUSCLES.map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setNewMuscle(m)}
                  style={[S.pillBtn, newMuscle === m && S.pillBtnOn]}
                >
                  <Text style={newMuscle === m ? S.pillTextOn : S.pillText}>{m}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={[S.btn, { alignSelf: 'flex-start', paddingVertical: 9 }]}
              onPress={() => pick(onCreate(q.trim(), newMuscle))}
            >
              <Icon name='plus' size={14} />
              <Text style={S.btnText}>Añadir y elegir</Text>
            </Pressable>
          </View>
        )}
        {list.map((e, i) => (
          <React.Fragment key={e.id}>
            {i === 0 && firstOther !== 0 && preferMuscle && (
              <Text style={[S.label, { marginTop: 4 }]}>{preferMuscle}</Text>
            )}
            {i === firstOther && firstOther > 0 && (
              <Text style={[S.label, { marginTop: 14 }]}>Otros</Text>
            )}
            <Pressable
              onPress={() => pick(e.id)}
              style={[
                S.between,
                { paddingVertical: 13, borderBottomWidth: 1, borderColor: C.line },
              ]}
            >
              <Text style={{ color: C.text, fontSize: 15, flex: 1 }}>{e.name}</Text>
              <View style={[S.row, { gap: 4 }]}>
                {e.type && e.type !== 'strength' && (
                  <Text style={[S.chipText, { fontSize: 11 }]}>{TYPE_LABELS[e.type]}</Text>
                )}
                <View style={S.chip}>
                  <Text style={[S.chipText, { color: C.blue }]}>{e.muscle}</Text>
                </View>
              </View>
            </Pressable>
          </React.Fragment>
        ))}
        <View style={{ height: 20 }} />
      </ScrollView>
    </BottomSheet>
  );
}
