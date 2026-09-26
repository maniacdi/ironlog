import React from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { BottomSheet } from '../../components/BottomSheet';
import { C, S } from '../../theme';

export function DayPicker({ visible, routines, suggestedDayId, onPick, onClose }) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={[S.disp, { fontSize: 18, marginBottom: 12 }]}>¿Qué entrenas hoy?</Text>
      <ScrollView>
        {routines.map((r) => (
          <View key={r.id} style={{ marginBottom: 14 }}>
            <Text style={S.label}>{r.name}</Text>
            {r.days.map((day) => (
              <Pressable
                key={day.id}
                onPress={() => onPick(r, day)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderColor: C.line,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
                  <Text style={{ color: C.text, fontWeight: '700', flexShrink: 1 }}>
                    {day.name}
                  </Text>
                  {day.id === suggestedDayId && (
                    <View
                      style={{
                        backgroundColor: C.accent,
                        borderRadius: 999,
                        paddingVertical: 2,
                        paddingHorizontal: 7,
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                        sugerido
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={S.sub}>{day.exercises.length} ejercicios</Text>
              </Pressable>
            ))}
          </View>
        ))}
        <View style={{ height: 20 }} />
      </ScrollView>
    </BottomSheet>
  );
}
