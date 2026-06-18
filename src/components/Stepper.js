import React from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { Icon } from './Icon';
import { C } from '../theme';

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
        backgroundColor: C.surface2,
        borderRadius: 10,
        overflow: 'hidden',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Pressable
        disabled={disabled}
        onPress={() => onChange(Math.max(min, +(value - step).toFixed(2)))}
        style={{
          width: 32,
          height: 40,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name='minus' size={15} color={C.text} />
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
          width: 46,
          textAlign: 'center',
          color: C.text,
          fontSize: 16,
          fontWeight: '700',
          padding: 0,
        }}
      />
      <Pressable
        disabled={disabled}
        onPress={() => onChange(+(value + step).toFixed(2))}
        style={{
          width: 32,
          height: 40,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name='plus' size={15} color={C.text} />
      </Pressable>
    </View>
  );
}
