import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable, Modal, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../components/Icon';
import { LineChart } from '../../components/Charts';
import { ConfirmModal } from '../../components/ConfirmModal';
import { C, S } from '../../theme';
import { fmtDateLong, exName, exMuscle } from '../../helpers';
import { formatSet, isDoneSet, logVolume } from '../../domain/sets';
import { typeOf } from '../../domain/session';
import { runHealthDiagnostic, getHealthLog } from '../../healthConnect';
import { logWindow } from './useHealthSync';

function Stat({ value, label, color, icon }) {
  return (
    <View style={S.stat}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {icon}
        <Text style={[S.bignum, { fontSize: 22 }, color && { color }]}>{value}</Text>
      </View>
      <Text style={S.sub}>{label}</Text>
    </View>
  );
}

// Detalle de una sesión guardada. `log` se lee siempre de `data`, así que
// refleja al momento la sincronización con el reloj.
export function LogDetail({ log, data, unit, onClose, enrich, onDelete }) {
  const insets = useSafeAreaInsets();
  const [syncing, setSyncing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (!log) return null;

  const sync = async () => {
    setSyncing(true);
    try {
      const health = await enrich(log, { requestPerms: true });
      if (!health) {
        const { start, end } = logWindow(log);
        const report = await runHealthDiagnostic(start, end);
        const body = report.steps.map((s) => `• ${s.label}: ${s.value}`).join('\n');
        Alert.alert(report.ok ? 'Sin datos del entreno' : 'Sin datos — diagnóstico', body, [
          { text: 'Ver logs', onPress: () => Alert.alert('Logs Health Connect', getHealthLog()) },
          { text: 'OK' },
        ]);
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo conectar con Health Connect.\n\n' + String(e?.message || e));
    }
    setSyncing(false);
  };

  const h = log.health;
  const volume = Math.round(logVolume(log, (id) => typeOf(data, id)));

  return (
    <Modal visible animationType='slide' presentationStyle='fullScreen' onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: insets.top + 14,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderColor: C.line,
            backgroundColor: C.surface,
          }}
        >
          <Pressable onPress={onClose} style={[S.iconBtn, { marginRight: 12 }]}>
            <Icon name='chevron-left' size={18} color={C.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[S.disp, { fontSize: 18 }]}>{log.dayName}</Text>
            <Text style={S.sub}>{fmtDateLong(log.date)}</Text>
          </View>
          <Pressable onPress={() => setConfirmDelete(true)} style={S.iconBtn}>
            <Icon name='trash-2' size={15} color={C.muted} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
          <View style={[S.row, { gap: 10, flexWrap: 'wrap' }]}>
            {volume > 0 && <Stat value={volume} label={`vol (${unit})`} color={C.accent} />}
            {log.durationMin != null && <Stat value={`${log.durationMin}'`} label='duración' />}
            {!!h?.avgHr && (
              <Stat
                value={h.avgHr}
                label='fc media'
                icon={<Icon name='heart' size={14} color={C.negative} />}
              />
            )}
            {!!h?.maxHr && <Stat value={h.maxHr} label='fc máx' color={C.negative} />}
            {!!h?.kcal && <Stat value={h.kcal} label='kcal' />}
          </View>

          {!!h?.hrSeries && h.hrSeries.length > 1 && (
            <View style={[S.card, { marginTop: 12 }]}>
              <View style={[S.between, { marginBottom: 4 }]}>
                <Text style={S.label}>Frecuencia cardíaca</Text>
                <View style={[S.row, { gap: 8 }]}>
                  {!!h.minHr && <Text style={S.sub}>mín {h.minHr}</Text>}
                  {!!h.maxHr && <Text style={[S.sub, { color: C.negative }]}>máx {h.maxHr}</Text>}
                </View>
              </View>
              <LineChart
                height={140}
                data={h.hrSeries.map((bpm) => ({ label: '', bpm }))}
                series={[{ key: 'bpm', color: C.negative, width: 2 }]}
              />
            </View>
          )}

          {h ? (
            <Pressable
              style={{ marginTop: 10, alignSelf: 'flex-end' }}
              disabled={syncing}
              onPress={sync}
            >
              <Text style={[S.sub, { color: C.accent, fontSize: 12 }]}>
                {syncing ? 'sincronizando…' : '↻ re-sincronizar reloj'}
              </Text>
            </Pressable>
          ) : (
            <View style={{ marginTop: 12 }}>
              <Text style={[S.sub, { fontSize: 12, marginBottom: 8 }]}>
                Sin datos del reloj para esta sesión.
              </Text>
              <Pressable
                style={[S.btn, S.btnGhost, { paddingVertical: 10 }]}
                disabled={syncing}
                onPress={sync}
              >
                <Icon name={syncing ? 'clock' : 'heart'} size={15} color={C.muted} />
                <Text style={S.btnTextGhost}>
                  {syncing ? 'Sincronizando…' : 'Sincronizar datos del reloj'}
                </Text>
              </Pressable>
            </View>
          )}

          {!!log.feeling && (
            <View style={{ marginTop: 16 }}>
              <Text style={S.label}>Sensación</Text>
              <Text style={{ color: C.text }}>{log.feeling}</Text>
            </View>
          )}
          {!!log.note && (
            <View style={{ marginTop: 12 }}>
              <Text style={S.label}>Nota</Text>
              <Text style={{ color: C.text }}>{log.note}</Text>
            </View>
          )}

          <Text style={[S.label, { marginTop: 20 }]}>Ejercicios</Text>
          {log.entries.map((e, i) => {
            const type = e.type || typeOf(data, e.exerciseId);
            // Solo las series realizadas; las saltadas se resumen en una línea.
            const done = e.sets.filter(isDoneSet);
            const skipped = e.sets.filter((s) => s.skipped).length;
            return (
              <View key={e.id || i} style={[S.card, e.skipped && { opacity: 0.5 }]}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text
                    style={{
                      color: C.text,
                      fontWeight: '700',
                      fontSize: 14,
                      flexShrink: 1,
                      textDecorationLine: e.skipped ? 'line-through' : 'none',
                    }}
                  >
                    {exName(data, e.exerciseId)}
                  </Text>
                  <Text style={[S.sub, { color: C.blue, fontSize: 12 }]}>
                    {exMuscle(data, e.exerciseId)}
                  </Text>
                </View>
                {!!e.swappedFrom && (
                  <Text style={[S.sub, { fontSize: 12, marginTop: 2 }]}>
                    en lugar de {exName(data, e.swappedFrom)}
                  </Text>
                )}
                {e.skipped ? (
                  <Text style={[S.sub, { color: C.skipped, marginTop: 6 }]}>Saltado</Text>
                ) : (
                  <View style={{ marginTop: 8 }}>
                    {done.map((s, si) => (
                      <Text key={s.id || si} style={[S.sub, { fontSize: 13 }]}>
                        Serie {si + 1}: {formatSet(type, s, unit, e.perSide)}
                      </Text>
                    ))}
                    {skipped > 0 && (
                      <Text style={[S.sub, { fontSize: 12, opacity: 0.6 }]}>
                        {skipped} serie(s) saltada(s)
                      </Text>
                    )}
                  </View>
                )}
                {!!e.note && (
                  <Text style={[S.sub, { marginTop: 6, fontSize: 12, fontStyle: 'italic' }]}>
                    {e.note}
                  </Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>

      <ConfirmModal
        visible={confirmDelete}
        title='¿Borrar sesión?'
        message='Se eliminará esta sesión del historial. No se puede deshacer.'
        confirmLabel='Borrar'
        destructive
        onConfirm={() => {
          setConfirmDelete(false);
          onDelete(log.id);
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </Modal>
  );
}
