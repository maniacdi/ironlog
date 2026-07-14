import React from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { Icon } from './Icon';
import { C, MONO } from '../theme';

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  disabled = false,
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Pressable
        disabled={disabled}
        onPress={() => onChange(Math.max(min, +(value - step).toFixed(2)))}
        hitSlop={8}
        style={{ width: 28, height: 38, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name='minus' size={16} color={C.muted} />
      </Pressable>
      <TextInput
        value={String(value)}
        keyboardType='decimal-pad'
        editable={!disabled}
        onChangeText={(t) => {
          const v = parseFloat(t);
          onChange(isNaN(v) ? 0 : v);
        }}
        style={{
          minWidth: 44,
          textAlign: 'center',
          color: C.text,
          fontSize: 17,
          fontWeight: '700',
          fontFamily: MONO,
          fontVariant: ['tabular-nums'],
          paddingVertical: 6,
          paddingHorizontal: 2,
          borderBottomWidth: 2,
          borderBottomColor: C.line,
        }}
      />
      <Pressable
        disabled={disabled}
        onPress={() => onChange(+(value + step).toFixed(2))}
        hitSlop={8}
        style={{ width: 28, height: 38, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name='plus' size={16} color={C.muted} />
      </Pressable>
    </View>
  );
}
