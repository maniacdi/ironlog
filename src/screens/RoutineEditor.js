import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View, Text, Pressable, TextInput, BackHandler } from 'react-native';
import { Icon } from '../components/Icon';
import { Stepper } from '../components/Stepper';
import { ExercisePicker } from '../components/ExercisePicker';
import { ConfirmModal } from '../components/ConfirmModal';
import { C, S, DISPLAY } from '../theme';
import { uid, clone, exName } from '../helpers';
import {
  isLoaded,
  weightStep,
  targetLabel,
  targetPlaceholder,
  defaultTarget,
  defaultSetCount,
  TYPE_LABELS,
  normalizeType,
} from '../domain/exerciseTypes';

const REST_OPTS = [
  ['auto', null],
  ['60', 60],
  ['90', 90],
  ['120', 120],
  ['150', 150],
];
const REST_AFTER_OPTS = [
  ['auto', null],
  ['30', 30],
  ['45', 45],
  ['60', 60],
  ['90', 90],
];

const newItem = () => ({
  id: uid(),
  exerciseId: null,
  sets: 3,
  reps: '8-10',
  weight: 20,
  note: '',
  rest: null,
  restAfter: null,
  perSide: false,
});

function Pills({ opts, value, onChange }) {
  return (
    <View style={[S.row, { flexWrap: 'wrap', gap: 6 }]}>
      {opts.map(([lbl, val]) => {
        const on = (value ?? null) === val;
        return (
          <Pressable key={lbl} onPress={() => onChange(val)} style={[S.pillBtn, on && S.pillBtnOn]}>
            <Text style={on ? S.pillTextOn : S.pillText}>
              {lbl === 'auto' ? 'auto' : lbl + 's'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const Field = ({ label, flex = 1, children }) => (
  <View style={{ flex }}>
    <Text style={[S.sub, { marginBottom: 4, fontSize: 11 }]}>{label}</Text>
    {children}
  </View>
);

export default function RoutineEditor({ routine, data, createExercise, onSave, onCancel, unit }) {
  const [initial] = useState(() => JSON.stringify(routine));
  const [r, setR] = useState(() => clone(routine));
  const [picker, setPicker] = useState(null);
  // Ejercicios creados desde el selector: aún no están en `data` hasta la siguiente render.
  const created = useRef([]);
  const typeOf = (id) =>
    normalizeType([...data.exercises, ...created.current].find((e) => e.id === id)?.type);
  const onCreate = (name, muscle) => {
    const ex = createExercise(name, muscle);
    created.current.push(ex);
    return ex.id;
  };
  const [adv, setAdv] = useState({}); // opciones avanzadas abiertas por id de item
  const [confirm, setConfirm] = useState(null); // { title, message, label, action }
  const set = (fn) =>
    setR((p) => {
      const n = clone(p);
      fn(n);
      return n;
    });
  const move = (arr, i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  };
  const dirty = JSON.stringify(r) !== initial;
  const headInput = {
    fontFamily: DISPLAY,
    fontSize: 20,
    color: C.text,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingVertical: 4,
    flex: 1,
  };

  const back = () =>
    dirty
      ? setConfirm({
          title: '¿Salir sin guardar?',
          message: 'Perderás los cambios hechos en esta rutina.',
          label: 'Descartar',
          action: onCancel,
        })
      : onCancel();

  // Botón atrás de Android: mismo aviso que «Volver».
  const backRef = useRef(back);
  backRef.current = back;
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      backRef.current();
      return true;
    });
    return () => sub.remove();
  }, []);

  const pickExercise = (exId) => {
    const { di, ei } = picker;
    setPicker(null);
    // Al elegir, el objetivo por defecto se adapta al tipo del ejercicio.
    const type = typeOf(exId);
    set((n) => {
      const it = n.days[di].exercises[ei];
      const prevType = it.exerciseId ? typeOf(it.exerciseId) : 'strength';
      it.exerciseId = exId;
      if (type !== prevType) {
        it.reps = defaultTarget(type);
        it.sets = defaultSetCount(type);
      }
    });
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps='handled'>
      <Pressable onPress={back} style={[S.row, { gap: 4, marginBottom: 16 }]}>
        <Icon name='arrow-left' size={16} color={C.accent} />
        <Text style={S.link}>Volver</Text>
      </Pressable>
      <Text style={S.label}>Nombre de la rutina</Text>
      <TextInput
        style={S.input}
        value={r.name}
        placeholder='Ej. Full Body 3 días'
        placeholderTextColor={C.muted}
        onChangeText={(t) => set((n) => (n.name = t))}
      />

      {r.days.map((day, di) => (
        <View key={day.id} style={{ marginTop: 28 }}>
          <View
            style={[
              S.row,
              { gap: 10, borderBottomWidth: 2, borderColor: C.accent, paddingBottom: 8 },
            ]}
          >
            <TextInput
              style={headInput}
              value={day.name}
              placeholder='NOMBRE DEL DÍA'
              placeholderTextColor={C.muted}
              onChangeText={(t) => set((n) => (n.days[di].name = t))}
            />
            <Pressable
              hitSlop={8}
              onPress={() =>
                day.exercises.length
                  ? setConfirm({
                      title: '¿Borrar día?',
                      message: `Se eliminará «${day.name}» con sus ${day.exercises.length} ejercicios.`,
                      label: 'Borrar',
                      action: () => set((n) => n.days.splice(di, 1)),
                    })
                  : set((n) => n.days.splice(di, 1))
              }
            >
              <Icon name='trash-2' size={16} color={C.muted} />
            </Pressable>
          </View>

          {day.exercises.map((item, ei) => {
            const type = item.exerciseId ? typeOf(item.exerciseId) : 'strength';
            const upd = (fn) => set((n) => fn(n.days[di].exercises[ei]));
            return (
              <View
                key={item.id}
                style={{ borderBottomWidth: 1, borderColor: C.line, paddingVertical: 14 }}
              >
                <View style={[S.row, { gap: 10 }]}>
                  <Text style={{ fontFamily: DISPLAY, fontSize: 20, color: C.muted, width: 30 }}>
                    {String(ei + 1).padStart(2, '0')}
                  </Text>
                  <Pressable onPress={() => setPicker({ di, ei })} style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: item.exerciseId ? C.text : C.muted,
                        fontWeight: '700',
                        fontSize: 15,
                      }}
                      numberOfLines={1}
                    >
                      {item.exerciseId ? exName(data, item.exerciseId) : 'Elegir ejercicio…'}
                    </Text>
                    {type !== 'strength' && (
                      <Text style={[S.sub, { fontSize: 11 }]}>{TYPE_LABELS[type]}</Text>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={() => set((n) => move(n.days[di].exercises, ei, -1))}
                    hitSlop={6}
                  >
                    <Icon name='chevron-up' size={17} color={C.muted} />
                  </Pressable>
                  <Pressable
                    onPress={() => set((n) => move(n.days[di].exercises, ei, 1))}
                    hitSlop={6}
                  >
                    <Icon name='chevron-down' size={17} color={C.muted} />
                  </Pressable>
                  <Pressable
                    onPress={() => set((n) => n.days[di].exercises.splice(ei, 1))}
                    hitSlop={6}
                  >
                    <Icon name='x' size={17} color={C.muted} />
                  </Pressable>
                </View>

                <View style={[S.row, { marginTop: 12, gap: 8, paddingLeft: 40 }]}>
                  <Field label='SERIES'>
                    <Stepper
                      value={item.sets}
                      step={1}
                      min={1}
                      onChange={(v) => upd((it) => (it.sets = v))}
                    />
                  </Field>
                  <Field label={targetLabel(type)} flex={1.3}>
                    <TextInput
                      style={[S.input, { textAlign: 'center', paddingVertical: 9 }]}
                      value={String(item.reps ?? '')}
                      placeholder={targetPlaceholder(type)}
                      placeholderTextColor={C.muted}
                      onChangeText={(t) => upd((it) => (it.reps = t))}
                    />
                  </Field>
                  {isLoaded(type) && (
                    <Field label={`${type === 'bodyweight' ? 'LASTRE' : 'PESO'} ${unit}`}>
                      <Stepper
                        value={item.weight ?? 0}
                        step={weightStep(unit)}
                        onChange={(v) => upd((it) => (it.weight = v))}
                      />
                    </Field>
                  )}
                </View>
                {type === 'cardio' && (
                  <View style={[S.row, { marginTop: 10, gap: 8, paddingLeft: 40 }]}>
                    <Field label='KM/H'>
                      <Stepper
                        value={item.speed ?? 0}
                        step={0.5}
                        onChange={(v) => upd((it) => (it.speed = v))}
                      />
                    </Field>
                    <Field label='INCLINACIÓN %'>
                      <Stepper
                        value={item.incline ?? 0}
                        step={0.5}
                        onChange={(v) => upd((it) => (it.incline = v))}
                      />
                    </Field>
                  </View>
                )}

                <Pressable
                  onPress={() => setAdv((a) => ({ ...a, [item.id]: !a[item.id] }))}
                  style={{ marginTop: 10, paddingLeft: 40 }}
                >
                  <Text style={[S.sub, { color: C.accent, fontSize: 12 }]}>
                    {adv[item.id]
                      ? '– ocultar opciones'
                      : isLoaded(type)
                        ? '+ opciones (nota · descanso · c/u)'
                        : '+ opciones (nota · descanso)'}
                  </Text>
                </Pressable>

                {adv[item.id] && (
                  <View style={{ marginTop: 10, paddingLeft: 40 }}>
                    <TextInput
                      style={[S.input, { fontSize: 13 }]}
                      value={item.note || ''}
                      placeholder='Nota (ej. Busca 75 kg, RPE 9…)'
                      placeholderTextColor={C.muted}
                      onChangeText={(t) => upd((it) => (it.note = t))}
                    />
                    {isLoaded(type) && (
                      <View style={[S.between, { marginTop: 10 }]}>
                        <Text style={S.sub}>Peso por mancuerna/lado (c/u)</Text>
                        <Pressable
                          onPress={() => upd((it) => (it.perSide = !it.perSide))}
                          style={[S.pillBtn, item.perSide && S.pillBtnOn]}
                        >
                          <Text style={item.perSide ? S.pillTextOn : S.pillText}>
                            {item.perSide ? 'c/u sí' : 'c/u no'}
                          </Text>
                        </Pressable>
                      </View>
                    )}
                    <Text style={[S.sub, { marginTop: 10, marginBottom: 6, fontSize: 11 }]}>
                      DESCANSO ENTRE SERIES
                    </Text>
                    <Pills
                      opts={REST_OPTS}
                      value={item.rest}
                      onChange={(v) => upd((it) => (it.rest = v))}
                    />
                    <Text style={[S.sub, { marginTop: 10, marginBottom: 6, fontSize: 11 }]}>
                      DESCANSO AL CAMBIAR DE EJERCICIO
                    </Text>
                    <Pills
                      opts={REST_AFTER_OPTS}
                      value={item.restAfter}
                      onChange={(v) => upd((it) => (it.restAfter = v))}
                    />
                  </View>
                )}
              </View>
            );
          })}
          <Pressable onPress={() => set((n) => n.days[di].exercises.push(newItem()))}>
            <Text style={[S.link, { marginTop: 14 }]}>+ añadir ejercicio</Text>
          </Pressable>
        </View>
      ))}

      <Pressable
        style={[S.btn, S.btnGhost, { marginTop: 24 }]}
        onPress={() =>
          set((n) => n.days.push({ id: uid(), name: 'Día ' + (n.days.length + 1), exercises: [] }))
        }
      >
        <Icon name='plus' size={16} color={C.text} />
        <Text style={S.btnTextGhost}>Añadir día</Text>
      </Pressable>
      <Pressable style={[S.btn, { marginTop: 10 }]} onPress={() => onSave(r)}>
        <Icon name='save' size={16} />
        <Text style={S.btnText}>Guardar rutina</Text>
      </Pressable>
      <View style={{ height: 30 }} />

      <ExercisePicker
        visible={!!picker}
        exercises={data.exercises}
        onCreate={onCreate}
        onClose={() => setPicker(null)}
        onPick={pickExercise}
      />

      <ConfirmModal
        visible={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.label}
        destructive
        onConfirm={() => {
          const a = confirm.action;
          setConfirm(null);
          a();
        }}
        onCancel={() => setConfirm(null)}
      />
    </ScrollView>
  );
}
