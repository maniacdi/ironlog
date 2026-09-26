import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Icon } from '../../components/Icon';
import { Stepper } from '../../components/Stepper';
import { SwipeRow } from '../../components/SwipeRow';
import { C, S } from '../../theme';

// Cabecera de columnas; `fields` viene de setFields(type).
export function SetHeader({ fields }) {
  return (
    <View style={{ flexDirection: 'row', marginTop: 12, marginBottom: 2, alignItems: 'center' }}>
      <Text style={{ width: 14 }} />
      {fields.map((f) => (
        <Text key={f.key} style={[S.sub, { flex: 1, textAlign: 'center', fontSize: 11 }]}>
          {f.label}
        </Text>
      ))}
      <Text style={{ width: 36 }} />
    </View>
  );
}

export function SetRow({ index, set, fields, onChange, onToggleDone, onSkip, onDelete }) {
  const locked = set.skipped || set.done;
  const compact = fields.length > 2;
  return (
    <SwipeRow onDelete={onDelete} onSkip={onSkip}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 5,
          opacity: set.skipped ? 0.35 : 1,
        }}
      >
        <Text
          style={{
            width: 14,
            textAlign: 'center',
            color: C.muted,
            fontSize: 12,
            fontWeight: '700',
          }}
        >
          {index + 1}
        </Text>
        {fields.map((f) => (
          <View key={f.key} style={{ flex: 1 }}>
            <Stepper
              value={set[f.key] ?? 0}
              step={f.step}
              compact={compact}
              disabled={locked}
              onChange={(v) => onChange(f.key, v)}
            />
          </View>
        ))}
        <Pressable
          onPress={onToggleDone}
          hitSlop={6}
          style={[
            S.iconBtn,
            { width: 36, height: 36 },
            set.done && { backgroundColor: C.positive },
            set.skipped && { backgroundColor: C.surface2 },
          ]}
        >
          <Icon
            name={set.skipped ? 'minus' : 'check'}
            size={16}
            color={set.done ? '#06231a' : set.skipped ? C.skipped : C.muted}
          />
        </Pressable>
      </View>
    </SwipeRow>
  );
}
