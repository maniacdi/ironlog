import React from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { Icon } from '../../components/Icon';
import { C, S } from '../../theme';

export function SessionSummary({ summary, unit, onClose }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <View style={[S.card, { alignItems: 'center', paddingTop: 24, backgroundColor: C.surface }]}>
        <Icon name='check' size={40} color={C.positive} />
        <Text style={[S.disp, { fontSize: 22, marginTop: 8 }]}>¡Entrenamiento guardado!</Text>
        <View style={[S.row, { gap: 10, marginTop: 16 }]}>
          <View style={S.stat}>
            <Text style={[S.bignum, { color: C.accent }]}>{summary.sets}</Text>
            <Text style={S.sub}>series</Text>
          </View>
          {summary.hasLoad && (
            <View style={S.stat}>
              <Text style={S.bignum}>{summary.volume}</Text>
              <Text style={S.sub}>vol ({unit})</Text>
            </View>
          )}
          {summary.durationMin != null && (
            <View style={S.stat}>
              <Text style={S.bignum}>{summary.durationMin}'</Text>
              <Text style={S.sub}>duración</Text>
            </View>
          )}
        </View>
        {summary.skipped > 0 && (
          <Text style={[S.sub, { marginTop: 12, color: C.skipped }]}>
            {summary.skipped} ejercicio(s) saltado(s)
          </Text>
        )}
        {summary.prs.length > 0 && (
          <View style={{ marginTop: 12, alignItems: 'center' }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: C.surface2,
                borderRadius: 999,
                paddingVertical: 3,
                paddingHorizontal: 9,
              }}
            >
              <Icon name='flame' size={13} color={C.accent} />
              <Text style={{ color: C.accent, fontWeight: '700', fontSize: 12 }}>
                {summary.prs.length} récord(s)
              </Text>
            </View>
            <Text style={[S.sub, { marginTop: 8 }]}>{summary.prs.join(' · ')}</Text>
          </View>
        )}
      </View>
      <Pressable style={[S.btn, S.btnGhost]} onPress={onClose}>
        <Text style={S.btnTextGhost}>Volver a Hoy</Text>
      </Pressable>
    </ScrollView>
  );
}
