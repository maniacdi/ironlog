import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Icon } from './Icon';
import { C, S } from '../theme';
import { mmss } from '../helpers';

export function RestBar({ remaining, label, onAdd, onSkip }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: C.surface,
        borderTopWidth: 1,
        borderColor: C.accent,
      }}
    >
      <Icon name='clock' size={18} color={C.accent} />
      <Text style={S.sub}>{label}</Text>
      <Text style={{ color: C.accent, fontSize: 26, fontWeight: '800', minWidth: 64 }}>
        {mmss(remaining)}
      </Text>
      <View style={{ flex: 1 }} />
      <Pressable style={S.iconBtn} onPress={onAdd}>
        <Icon name='plus' size={15} color={C.muted} />
      </Pressable>
      <Pressable style={S.iconBtn} onPress={onSkip}>
        <Icon name='skip-forward' size={15} color={C.muted} />
      </Pressable>
    </View>
  );
}
