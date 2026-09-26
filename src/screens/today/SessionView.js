import React, { useRef, useState } from 'react';
import { ScrollView, View, Text, Pressable, Alert } from 'react-native';
import { Icon } from '../../components/Icon';
import { ConfirmModal } from '../../components/ConfirmModal';
import { ExercisePicker } from '../../components/ExercisePicker';
import { C, S } from '../../theme';
import { fmtDateLong, todayISO, exName, exMuscle, FEELINGS, uid } from '../../helpers';
import { makeExercise } from '../../dataModel';
import { isPR, swapEntry, finishSession } from '../../domain/session';
import { useExactAlarmStatus } from '../../hooks/useExactAlarm';
import { openExactAlarmSettings } from '../../exactAlarm';
import { ExerciseCard } from './ExerciseCard';

const settledExcept = (entry, setId) =>
  entry.sets.every((x) => x.id === setId || x.done || x.skipped);

export function SessionView({
  data,
  setData,
  session,
  setSession,
  unit,
  startRest,
  onFinished,
  onDiscard,
}) {
  const [collapsed, setCollapsed] = useState({});
  const [prBanner, setPrBanner] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [swapFor, setSwapFor] = useState(null); // entry que se sustituye
  const created = useRef([]); // ejercicios creados desde el selector aún no presentes en `data`
  const alarm = useExactAlarmStatus();

  const collapse = (id, v = true) => setCollapsed((c) => ({ ...c, [id]: v }));

  // Mutaciones puras sobre la sesión (sin efectos dentro del updater).
  const updateEntry = (entryId, fn) =>
    setSession((s) => ({ ...s, entries: s.entries.map((e) => (e.id === entryId ? fn(e) : e)) }));
  const updateSet = (entryId, setId, fn) =>
    updateEntry(entryId, (e) => ({ ...e, sets: e.sets.map((x) => (x.id === setId ? fn(x) : x)) }));

  const flashPR = (name) => {
    setPrBanner(name);
    setTimeout(() => setPrBanner((cur) => (cur === name ? null : cur)), 3500);
  };

  const actionsFor = (entry) => ({
    changeSet: (setId, key, v) => updateSet(entry.id, setId, (x) => ({ ...x, [key]: v })),

    toggleDone: (set) => {
      if (set.skipped) return;
      const willDo = !set.done;
      updateSet(entry.id, set.id, (x) => ({ ...x, done: willDo }));
      if (!willDo) return;
      // Efectos fuera del updater: se deciden con el estado de esta render.
      if (!entry.prFlashed && isPR(entry, set)) {
        updateEntry(entry.id, (e) => ({ ...e, prFlashed: true }));
        flashPR(exName(data, entry.exerciseId));
      }
      const settled = settledExcept(entry, set.id);
      if (settled && entry.restAfter) startRest(entry.restAfter, 'Cambio de ejercicio');
      else if (entry.type !== 'cardio') startRest(entry.rest);
      if (settled) collapse(entry.id);
    },

    skipSet: (set) => {
      const willSkip = !set.skipped;
      updateSet(entry.id, set.id, (x) => ({ ...x, skipped: willSkip, done: false }));
      if (willSkip && settledExcept(entry, set.id)) collapse(entry.id);
    },

    deleteSet: (set) =>
      updateEntry(entry.id, (e) => ({ ...e, sets: e.sets.filter((x) => x.id !== set.id) })),

    addSet: () =>
      updateEntry(entry.id, (e) => {
        const last = e.sets[e.sets.length - 1] || {};
        const { id: _id, done: _d, skipped: _s, ...values } = last;
        return { ...e, sets: [...e.sets, { ...values, id: uid(), done: false, skipped: false }] };
      }),

    setNote: (t) => updateEntry(entry.id, (e) => ({ ...e, note: t })),

    togglePerSide: () => updateEntry(entry.id, (e) => ({ ...e, perSide: !e.perSide })),

    swap: () => setSwapFor(entry),

    skipExercise: () =>
      Alert.alert('Saltar ejercicio', '¿Marcar este ejercicio como saltado en esta sesión?', [
        { text: 'Cancelar' },
        {
          text: 'Saltar',
          onPress: () => {
            updateEntry(entry.id, (e) => ({
              ...e,
              skipped: true,
              sets: e.sets.map((s) => ({ ...s, skipped: true, done: false })),
            }));
            collapse(entry.id);
          },
        },
      ]),

    restore: () => {
      updateEntry(entry.id, (e) => ({
        ...e,
        skipped: false,
        sets: e.sets.map((s) => ({ ...s, skipped: false })),
      }));
      collapse(entry.id, false);
    },
  });

  const createExercise = (name, muscle) => {
    const ex = makeExercise(name, muscle);
    created.current.push(ex);
    setData((d) => ({ ...d, exercises: [...d.exercises, ex] }));
    return ex.id;
  };

  const pickSwap = (exId) => {
    const target = swapFor;
    setSwapFor(null);
    if (!target) return;
    const known = new Set(data.exercises.map((e) => e.id));
    const dataNow = {
      ...data,
      exercises: [...data.exercises, ...created.current.filter((e) => !known.has(e.id))],
    };
    try {
      setSession((s) => swapEntry(s, target.id, dataNow, exId));
      collapse(target.id, false);
    } catch {
      Alert.alert('No se puede cambiar', 'Ya hay series hechas de este ejercicio.');
    }
  };

  const finish = () => {
    const anyDone = session.entries.some((e) => e.sets.some((s) => s.done));
    if (!anyDone) {
      Alert.alert(
        'Sin series completadas',
        'No has marcado ninguna serie como hecha. Márcalas con ✓ o cancela el entrenamiento.',
      );
      return;
    }
    const { log, summary } = finishSession(session, data);
    setData((d) => ({ ...d, logs: [...d.logs, log] }));
    onFinished(summary, log);
  };

  const done = session.entries.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
  const total = session.entries.reduce((a, e) => a + e.sets.filter((s) => !s.skipped).length, 0);
  const skippedExs = session.entries.filter((e) => e.skipped).length;
  const showAlarmTip = alarm === 'denied' && !data.settings.exactAlarmTipDismissed;

  return (
    <View style={{ flex: 1 }}>
      {prBanner && (
        <View
          style={{
            position: 'absolute',
            top: 12,
            left: 16,
            right: 16,
            zIndex: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: C.accent,
            borderRadius: 999,
            paddingVertical: 10,
            paddingHorizontal: 16,
          }}
        >
          <Icon name='flame' size={16} color='#fff' />
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>
            ¡Récord en {prBanner}!
          </Text>
        </View>
      )}
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps='handled'>
        {showAlarmTip && (
          <View style={[S.card, { borderLeftWidth: 3, borderLeftColor: C.accent }]}>
            <Text style={{ color: C.text, fontWeight: '700', marginBottom: 4 }}>
              El aviso de descanso puede llegar tarde
            </Text>
            <Text style={[S.sub, { lineHeight: 18 }]}>
              Android retrasa las notificaciones si IronLog no tiene permiso de «Alarmas y
              recordatorios».
            </Text>
            <View style={[S.row, { gap: 14, marginTop: 10 }]}>
              <Pressable onPress={openExactAlarmSettings}>
                <Text style={S.link}>Activar</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  setData((d) => ({
                    ...d,
                    settings: { ...d.settings, exactAlarmTipDismissed: true },
                  }))
                }
              >
                <Text style={[S.sub, { fontSize: 13 }]}>No mostrar más</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
            gap: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={[S.disp, { fontSize: 16 }]} numberOfLines={2}>
              {session.dayName}
            </Text>
            <Text style={S.sub}>{fmtDateLong(todayISO())}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', minWidth: 52 }}>
            <Text style={[S.bignum, { fontSize: 22, color: C.accent }]}>
              {done}/{total}
            </Text>
            <Text style={S.sub}>{skippedExs > 0 ? `${skippedExs} saltado(s)` : 'series'}</Text>
          </View>
        </View>

        {session.entries.map((entry) => (
          <ExerciseCard
            key={entry.id}
            entry={entry}
            name={exName(data, entry.exerciseId)}
            muscle={exMuscle(data, entry.exerciseId)}
            unit={unit}
            collapsed={!!collapsed[entry.id]}
            onToggleCollapse={() => collapse(entry.id, !collapsed[entry.id])}
            actions={actionsFor(entry)}
          />
        ))}

        <View style={S.card}>
          <Text style={S.label}>Sensación general</Text>
          <View style={[S.row, { gap: 6 }]}>
            {FEELINGS.map((f) => (
              <Pressable
                key={f}
                style={[
                  S.pillBtn,
                  { flex: 1, alignItems: 'center' },
                  session.feeling === f && S.pillBtnOn,
                ]}
                onPress={() => setSession((s) => ({ ...s, feeling: s.feeling === f ? null : f }))}
              >
                <Text style={session.feeling === f ? S.pillTextOn : S.pillText}>{f}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable style={S.btn} onPress={finish}>
          <Icon name='save' size={17} />
          <Text style={S.btnText}>Terminar y guardar</Text>
        </Pressable>
        <Pressable
          style={{ alignItems: 'center', paddingVertical: 16 }}
          onPress={() => setConfirmCancel(true)}
        >
          <Text style={{ color: C.negative, fontWeight: '700', fontSize: 14 }}>
            Cancelar entrenamiento
          </Text>
        </Pressable>
        <View style={{ height: 20 }} />
      </ScrollView>

      <ExercisePicker
        visible={!!swapFor}
        title={swapFor ? `Sustituir ${exName(data, swapFor.exerciseId)}` : ''}
        exercises={data.exercises}
        preferMuscle={swapFor ? exMuscle(data, swapFor.exerciseId) : undefined}
        excludeId={swapFor?.exerciseId}
        onCreate={createExercise}
        onClose={() => setSwapFor(null)}
        onPick={pickSwap}
      />

      <ConfirmModal
        visible={confirmCancel}
        title='¿Cancelar entrenamiento?'
        message={`Se descartarán ${done} serie(s) registradas y el tiempo transcurrido. No se puede deshacer.`}
        confirmLabel='Descartar'
        cancelLabel='Seguir'
        destructive
        onConfirm={() => {
          setConfirmCancel(false);
          onDiscard();
        }}
        onCancel={() => setConfirmCancel(false)}
      />
    </View>
  );
}
