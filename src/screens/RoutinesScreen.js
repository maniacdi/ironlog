import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { Icon } from '../components/Icon';
import { ConfirmModal } from '../components/ConfirmModal';
import { C, S } from '../theme';
import { uid, clone, norm, exName } from '../helpers';
import { makeExercise } from '../dataModel';
import RoutineEditor from './RoutineEditor';

export default function RoutinesScreen({ data, setData, unit }) {
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const createExercise = (name, muscle) => {
    const found = data.exercises.find((e) => norm(e.name) === norm(name));
    if (found) return found;
    const ex = makeExercise(name, muscle);
    setData((d) => ({ ...d, exercises: [...d.exercises, ex] }));
    return ex;
  };
  const saveRoutine = (r) => {
    const cleanR = {
      id: r.id,
      name: r.name.trim() || 'Sin nombre',
      days: r.days.map((d) => ({ ...d, exercises: d.exercises.filter((e) => e.exerciseId) })),
    };
    setData((d) => {
      const exists = d.routines.some((x) => x.id === r.id);
      return {
        ...d,
        routines: exists
          ? d.routines.map((x) => (x.id === r.id ? cleanR : x))
          : [...d.routines, cleanR],
      };
    });
    setEditing(null);
  };
  const duplicate = (r) => {
    const c = clone(r);
    c.id = uid();
    c.name = r.name + ' (copia)';
    c.days.forEach((dy) => {
      dy.id = uid();
      dy.exercises.forEach((e) => (e.id = uid()));
    });
    setData((d) => ({ ...d, routines: [...d.routines, c] }));
  };

  if (editing)
    return (
      <RoutineEditor
        routine={editing}
        data={data}
        createExercise={createExercise}
        onSave={saveRoutine}
        onCancel={() => setEditing(null)}
        unit={unit}
      />
    );

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Pressable style={S.btn} onPress={() => setEditing({ id: uid(), name: '', days: [] })}>
        <Icon name='plus' size={17} />
        <Text style={S.btnText}>Nueva rutina</Text>
      </Pressable>
      <View style={{ height: 16 }} />
      {!data.routines.length && (
        <View style={{ alignItems: 'center', padding: 30 }}>
          <Icon name='list' size={48} color={C.muted} />
          <Text style={[S.sub, { textAlign: 'center', marginTop: 12 }]}>
            Crea tu primera rutina para empezar.
          </Text>
        </View>
      )}
      {data.routines.map((r) => (
        <View key={r.id} style={S.card}>
          <View style={S.between}>
            <Text style={[S.disp, { fontSize: 18, flex: 1 }]}>{r.name}</Text>
            <View style={[S.row, { gap: 8 }]}>
              <Pressable style={S.iconBtn} onPress={() => duplicate(r)}>
                <Icon name='copy' size={15} color={C.muted} />
              </Pressable>
              <Pressable style={S.iconBtn} onPress={() => setEditing(clone(r))}>
                <Icon name='edit-2' size={15} color={C.muted} />
              </Pressable>
              <Pressable style={S.iconBtn} onPress={() => setToDelete(r)}>
                <Icon name='trash-2' size={15} color={C.muted} />
              </Pressable>
            </View>
          </View>
          {r.days.map((day) => (
            <View key={day.id} style={{ marginTop: 10 }}>
              <Text style={S.label}>
                {day.name} · {day.exercises.length} ejercicios
              </Text>
              <View style={[S.row, { flexWrap: 'wrap', gap: 6 }]}>
                {day.exercises.map((e) => (
                  <View key={e.id} style={S.chip}>
                    <Text style={S.chipText}>{exName(data, e.exerciseId)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      ))}

      <ConfirmModal
        visible={!!toDelete}
        title='¿Borrar rutina?'
        message={`Se eliminará «${toDelete?.name}». Tu historial de entrenamientos se conserva.`}
        confirmLabel='Borrar'
        destructive
        onConfirm={() => {
          const id = toDelete.id;
          setToDelete(null);
          setData((d) => ({ ...d, routines: d.routines.filter((r) => r.id !== id) }));
        }}
        onCancel={() => setToDelete(null)}
      />
    </ScrollView>
  );
}
