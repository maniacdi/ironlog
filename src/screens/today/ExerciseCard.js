import React from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { Icon } from '../../components/Icon';
import { C, S } from '../../theme';
import { isLoaded, setFields, TYPE_LABELS } from '../../domain/exerciseTypes';
import { formatRef } from '../../domain/sets';
import { SetHeader, SetRow } from './SetRow';

const targetSuffix = (type) => (type === 'time' ? 's' : type === 'cardio' ? "'" : '');

// Tarjeta de un ejercicio dentro del entreno en curso.
export function ExerciseCard({ entry, name, muscle, unit, collapsed, onToggleCollapse, actions }) {
  const { type } = entry;

  if (entry.skipped) {
    return (
      <View style={{ marginBottom: 8, opacity: 0.5 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Icon name='minus-circle' size={15} color={C.skipped} />
          <Text
            style={{ color: C.muted, fontSize: 14, flex: 1, textDecorationLine: 'line-through' }}
          >
            {name}
          </Text>
          <Pressable onPress={actions.restore} hitSlop={8}>
            <Text style={[S.sub, { color: C.accent, fontSize: 12 }]}>restaurar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const allDone = entry.sets.length > 0 && entry.sets.every((s) => s.done || s.skipped);
  const doneCount = entry.sets.filter((s) => s.done).length;
  const fields = setFields(type, unit, entry.perSide);
  const ref = formatRef(type, entry.ref, unit);
  const canSwap = !entry.sets.some((s) => s.done);

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderColor: C.line,
        borderLeftWidth: collapsed ? 0 : 3,
        borderLeftColor: allDone ? C.positive : C.accent,
        paddingLeft: collapsed ? 0 : 13,
        paddingVertical: 14,
        opacity: allDone ? 0.55 : 1,
      }}
    >
      <Pressable onPress={onToggleCollapse} style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {allDone && <Icon name='check-circle' size={15} color={C.positive} />}
            <Text
              style={{
                color: allDone ? C.positive : C.text,
                fontWeight: '800',
                fontSize: 16,
                letterSpacing: 0.3,
                flexShrink: 1,
              }}
            >
              {name}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            <Text style={[S.sub, { color: C.blue, fontSize: 12 }]}>{muscle}</Text>
            {type !== 'strength' && (
              <Text style={[S.sub, { fontSize: 12 }]}>· {TYPE_LABELS[type]}</Text>
            )}
            {!!entry.prescription && (
              <Text style={[S.sub, { fontSize: 12 }]}>
                · {entry.sets.length}×{entry.prescription}
                {targetSuffix(type)}
              </Text>
            )}
            {!!entry.swappedFrom && (
              <Text style={[S.sub, { fontSize: 12, color: C.accent }]}>· sustituto</Text>
            )}
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {allDone && collapsed && (
            <Text style={{ color: C.positive, fontSize: 12, fontWeight: '700' }}>
              {doneCount}/{entry.sets.length} ✓
            </Text>
          )}
          {!!ref && !collapsed && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[S.sub, { fontSize: 11 }]}>última</Text>
              <Text style={{ color: C.text, fontWeight: '700', fontSize: 13 }}>{ref}</Text>
            </View>
          )}
          <Icon name={collapsed ? 'chevron-down' : 'chevron-up'} size={16} color={C.muted} />
        </View>
      </Pressable>

      {!collapsed && (
        <>
          {!!entry.cue && (
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, alignItems: 'flex-start' }}>
              <Icon name='flame' size={13} color={C.accent} />
              <Text style={{ color: C.accent, fontSize: 13, flex: 1 }}>{entry.cue}</Text>
            </View>
          )}

          <View style={[S.row, { gap: 8, marginTop: 10, flexWrap: 'wrap' }]}>
            {canSwap && (
              <Pressable
                onPress={actions.swap}
                style={[S.pillBtn, S.row, { gap: 6, paddingVertical: 6 }]}
              >
                <Icon name='repeat' size={13} color={C.muted} />
                <Text style={S.pillText}>cambiar</Text>
              </Pressable>
            )}
            {isLoaded(type) && (
              <Pressable
                onPress={actions.togglePerSide}
                style={[S.pillBtn, { paddingVertical: 6 }, entry.perSide && S.pillBtnOn]}
              >
                <Text style={entry.perSide ? S.pillTextOn : S.pillText}>
                  {entry.perSide ? 'peso por mancuerna/lado' : 'peso total'}
                </Text>
              </Pressable>
            )}
          </View>

          <SetHeader fields={fields} />
          {entry.sets.map((s, i) => (
            <SetRow
              key={s.id}
              index={i}
              set={s}
              fields={fields}
              onChange={(k, v) => actions.changeSet(s.id, k, v)}
              onToggleDone={() => actions.toggleDone(s)}
              onSkip={() => actions.skipSet(s)}
              onDelete={() => actions.deleteSet(s)}
            />
          ))}
          <Text style={[S.sub, { fontSize: 11, marginTop: 6 }]}>← borrar · saltar serie →</Text>

          <Pressable onPress={actions.addSet}>
            <Text style={[S.link, { marginTop: 12 }]}>+ añadir serie</Text>
          </Pressable>

          <TextInput
            style={[S.input, { marginTop: 12, fontSize: 13 }]}
            placeholder='Sensaciones / notas…'
            placeholderTextColor={C.muted}
            value={entry.note}
            onChangeText={actions.setNote}
          />

          <Pressable
            onPress={actions.skipExercise}
            style={{ marginTop: 10, alignSelf: 'flex-start' }}
          >
            <Text style={[S.sub, { color: C.skipped, fontSize: 12 }]}>saltar ejercicio →</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
