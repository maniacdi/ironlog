import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { Icon } from '../../components/Icon';
import { C, S } from '../../theme';
import { fmtDate } from '../../helpers';
import { logVolume, logDoneSetCount } from '../../domain/sets';
import { buildSession, byRecent, suggestedDayId, typeOf } from '../../domain/session';
import { ensureNotifPermission } from '../../notifications';
import { useHealthSync, ensureHealthPermissions } from './useHealthSync';
import { SessionView } from './SessionView';
import { SessionSummary } from './SessionSummary';
import { DayPicker } from './DayPicker';
import { LogDetail } from './LogDetail';

export default function TodayScreen({
  data,
  setData,
  session,
  setSession,
  unit,
  startRest,
  stopRest,
}) {
  const [picking, setPicking] = useState(false);
  const [summary, setSummary] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const { enrich, syncAfterFinish } = useHealthSync(setData);

  const startDay = (routine, day) => {
    setSession(buildSession(data, routine, day));
    setPicking(false);
    // Permisos pedidos ahora (acción del usuario), no al terminar ni en reintentos.
    (async () => {
      await ensureNotifPermission();
      await ensureHealthPermissions();
    })();
  };

  const openDetail = (l) => {
    setDetailId(l.id);
    if (!l.health) enrich(l); // silencioso, sin pedir permisos
  };

  if (summary)
    return <SessionSummary summary={summary} unit={unit} onClose={() => setSummary(null)} />;

  if (session)
    return (
      <SessionView
        data={data}
        setData={setData}
        session={session}
        setSession={setSession}
        unit={unit}
        startRest={startRest}
        onFinished={(sum, log) => {
          setSummary(sum);
          setSession(null);
          stopRest();
          syncAfterFinish(log);
        }}
        onDiscard={() => {
          setSession(null);
          stopRest();
        }}
      />
    );

  if (!data.routines.length)
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 }}>
        <Icon name='dumbbell' size={48} color={C.muted} />
        <Text style={[S.sub, { textAlign: 'center', marginTop: 12 }]}>
          Aún no tienes rutinas. Crea una en Rutinas o impórtala desde Datos.
        </Text>
      </View>
    );

  const recent = [...data.logs].sort(byRecent).slice(0, 5);
  const detail = detailId ? data.logs.find((l) => l.id === detailId) : null;
  const tOf = (id) => typeOf(data, id);

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Pressable style={S.btn} onPress={() => setPicking(true)}>
        <Icon name='play' size={17} />
        <Text style={S.btnText}>Empezar entrenamiento</Text>
      </Pressable>

      <Text style={[S.label, { marginTop: 22 }]}>Recientes</Text>
      {!recent.length && <Text style={S.sub}>Todavía no has registrado ninguno.</Text>}
      {recent.map((l) => {
        const sets = logDoneSetCount(l);
        const skipped = l.entries.filter((e) => e.skipped).length;
        const vol = Math.round(logVolume(l, tOf));
        return (
          <Pressable
            key={l.id}
            onPress={() => openDetail(l)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderColor: C.line,
            }}
          >
            <View style={{ flex: 1 }}>
              <View style={[S.row, { gap: 8 }]}>
                <Text style={{ color: C.text, fontWeight: '700', flexShrink: 1 }}>{l.dayName}</Text>
                {!!l.feeling && <Text style={[S.sub, { fontSize: 12 }]}>{l.feeling}</Text>}
                {!!l.health?.avgHr && <Icon name='heart' size={12} color={C.negative} />}
              </View>
              <Text style={S.sub}>
                {fmtDate(l.date)} · {l.entries.length} ejercicios · {sets} series
                {l.durationMin ? ` · ${l.durationMin}'` : ''}
                {skipped > 0 ? ` · ${skipped} saltado(s)` : ''}
              </Text>
            </View>
            {vol > 0 && (
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: C.text, fontWeight: '800', fontSize: 17 }}>{vol}</Text>
                <Text style={S.sub}>{unit}</Text>
              </View>
            )}
            <View style={{ marginLeft: 8 }}>
              <Icon name='chevron-right' size={16} color={C.muted} />
            </View>
          </Pressable>
        );
      })}

      <DayPicker
        visible={picking}
        routines={data.routines}
        suggestedDayId={suggestedDayId(data)}
        onPick={startDay}
        onClose={() => setPicking(false)}
      />

      {detail && (
        <LogDetail
          log={detail}
          data={data}
          unit={unit}
          enrich={enrich}
          onClose={() => setDetailId(null)}
          onDelete={(id) => {
            setDetailId(null);
            setData((d) => ({ ...d, logs: d.logs.filter((x) => x.id !== id) }));
          }}
        />
      )}
    </ScrollView>
  );
}
