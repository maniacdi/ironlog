import React, { useState } from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { Icon } from './Icon';
import { C, MONO } from '../theme';
import { parseDecimalInput } from '../helpers';

const fmt = (v) => (v == null || Number.isNaN(v) ? '0' : String(v));

// Mientras se escribe se mantiene el texto tal cual ("22." o "22,"), y cada
// valor completo se aplica al instante para que marcar la serie sin cerrar
// el teclado use lo tecleado. Al perder el foco se muestra el valor aplicado.
export function Stepper({ value, onChange, step = 1, min = 0, disabled = false, compact = false }) {
  const [text, setText] = useState(null);
  const bump = (dir) => {
    setText(null);
    onChange(Math.max(min, +((value || 0) + dir * step).toFixed(2)));
  };
  const btn = {
    width: compact ? 22 : 28,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: compact ? 0 : 4,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Pressable disabled={disabled} onPress={() => bump(-1)} hitSlop={8} style={btn}>
        <Icon name='minus' size={compact ? 14 : 16} color={C.muted} />
      </Pressable>
      <TextInput
        value={text ?? fmt(value)}
        keyboardType='decimal-pad'
        editable={!disabled}
        selectTextOnFocus
        onChangeText={(t) => {
          const r = parseDecimalInput(t);
          if (!r) return; // carácter no numérico: se ignora
          setText(r.text);
          if (r.value != null) onChange(Math.max(min, r.value));
        }}
        onBlur={() => setText(null)}
        style={{
          minWidth: compact ? 36 : 44,
          textAlign: 'center',
          color: C.text,
          fontSize: compact ? 15 : 17,
          fontWeight: '700',
          fontFamily: MONO,
          fontVariant: ['tabular-nums'],
          paddingVertical: 6,
          paddingHorizontal: 2,
          borderBottomWidth: 2,
          borderBottomColor: C.line,
        }}
      />
      <Pressable disabled={disabled} onPress={() => bump(1)} hitSlop={8} style={btn}>
        <Icon name='plus' size={compact ? 14 : 16} color={C.muted} />
      </Pressable>
    </View>
  );
}
