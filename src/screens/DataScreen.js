import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Icon } from '../components/Icon';
import { ConfirmModal } from '../components/ConfirmModal';
import { C, S } from '../theme';
import { mmss, todayISO, toCSV, sessionToMarkdown, sessionsToJSON } from '../helpers';
import { seed } from '../dataModel';
import { byRecent } from '../domain/session';
import {
  routinesToJSON,
  routinesToCSVRows,
  logsToCSVRows,
  buildRoutinesFromRows,
  parseImport,
} from '../domain/transfer';
import { writeAndShare } from '../share';
import { runHealthDiagnostic, getHealthLog, openHealthConnectSettings } from '../healthConnect';
import { useExactAlarmStatus } from '../hooks/useExactAlarm';
import { openExactAlarmSettings } from '../exactAlarm';

const ALARM_TEXT = {
  granted: 'Concedido: el aviso de fin de descanso llega a su hora.',
  denied: 'Sin permiso: Android puede retrasar el aviso de fin de descanso varios minutos.',
  unknown: 'No disponible en esta versión de la app.',
};

function Row({ onPress, icon, label, danger, detail }) {
  return (
    <Pressable
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderColor: C.line,
      }}
      onPress={onPress}
    >
      <Icon name={icon} size={17} color={danger ? C.negative : C.accent} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: danger ? C.negative : C.text, fontWeight: '600', fontSize: 14 }}>
          {label}
        </Text>
        {!!detail && <Text style={[S.sub, { fontSize: 12, marginTop: 2 }]}>{detail}</Text>}
      </View>
      <Icon name='chevron-right' size={15} color={C.muted} />
    </Pressable>
  );
}

export default function DataScreen({ data, setData, onChangeUnit, hasSession }) {
  const [msg, setMsg] = useState(null);
  const [confirm, setConfirm] = useState(null); // { title, message, label, destructive, action }
  const alarm = useExactAlarmStatus();
  const unit = data.settings.unit;

  const ask = (c) => setConfirm(c);
  // Reemplazar todos los datos con un entreno en curso dejaría la sesión
  // apuntando a ejercicios que quizá ya no existen.
  const blockedBySession = () => {
    if (!hasSession) return false;
    Alert.alert(
      'Entreno en curso',
      'Termina o cancela el entrenamiento en curso antes de continuar.',
    );
    return true;
  };

  const withLogs = (fn) => () => {
    const sorted = [...data.logs].sort(byRecent);
    if (!sorted.length) return Alert.alert('Sin datos', 'Aún no tienes sesiones registradas.');
    fn(sorted);
  };

  const exportProgressMD = withLogs((sorted) => {
    const parts = sorted.slice(0, 20).map((l) => sessionToMarkdown(l, data, unit));
    writeAndShare(
      'progreso.md',
      `# Historial de entrenamiento — IronLog\n\n> Exportado para análisis con IA. Pesos en ${unit}.\n\n---\n\n${parts.join('\n\n---\n\n')}`,
    );
  });
  const exportProgressJSON = withLogs((sorted) =>
    writeAndShare(
      'progreso.json',
      JSON.stringify(
        {
          exportado: new Date().toISOString(),
          unidad: unit,
          sesiones: sessionsToJSON(sorted, data),
        },
        null,
        2,
      ),
    ),
  );
  const exportBackup = () =>
    writeAndShare(
      'ironlog-backup.json',
      JSON.stringify({ _ironlogBackup: true, exportado: new Date().toISOString(), data }, null, 2),
    );

  const checkHealthConnect = async () => {
    const startMs = new Date(todayISO() + 'T00:00:00').getTime();
    const endMs = new Date(todayISO() + 'T23:59:59').getTime();
    setMsg({ ok: true, t: 'Comprobando Health Connect…' });
    try {
      const report = await runHealthDiagnostic(startMs, endMs);
      const body = report.steps.map((s) => `• ${s.label}: ${s.value}`).join('\n');
      Alert.alert(report.ok ? 'Health Connect OK' : 'Health Connect — diagnóstico', body, [
        { text: 'Abrir ajustes', onPress: () => openHealthConnectSettings() },
        {
          text: 'Ver logs',
          onPress: () => Alert.alert('Logs Health Connect', getHealthLog() || 'sin logs'),
        },
        { text: 'OK' },
      ]);
    } catch (e) {
      Alert.alert('Error', String(e?.message || e));
    }
    setMsg(null);
  };

  const importFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/csv', 'text/comma-separated-values', '*/*'],
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const file = res.assets ? res.assets[0] : res;
      const text = await FileSystem.readAsStringAsync(file.uri);
      const parsed = parseImport(text, file.name || '');

      if (parsed.kind === 'backup') {
        if (blockedBySession()) return;
        const d = parsed.data;
        ask({
          title: 'Restaurar copia',
          message: `Esto REEMPLAZARÁ todos tus datos actuales por los de la copia: ${d.routines.length} rutina(s), ${d.exercises.length} ejercicio(s) y ${d.logs.length} sesión(es). ¿Continuar?`,
          label: 'Restaurar',
          destructive: true,
          action: () => {
            setData(d);
            setMsg({ ok: true, t: 'Copia restaurada.' });
          },
        });
        return;
      }
      const { exercises, routines } = buildRoutinesFromRows(data, parsed.rows);
      if (!routines.length) throw new Error('No se encontraron rutinas en el archivo.');
      setData((d) => ({ ...d, exercises, routines: [...d.routines, ...routines] }));
      setMsg({ ok: true, t: `Importadas ${routines.length} rutina(s).` });
    } catch (e) {
      setMsg({ ok: false, t: `No se pudo importar: ${e?.message || 'revisa el formato.'}` });
    }
  };

  const changeUnit = (u) => {
    if (u === unit) return;
    ask({
      title: `Cambiar a ${u}`,
      message: `Se convertirán todos los pesos guardados (rutinas, historial${hasSession ? ' y entreno en curso' : ''}) de ${unit} a ${u}.`,
      label: 'Convertir',
      action: () => onChangeUnit(u),
    });
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={S.label}>Importar</Text>
      <Text style={[S.sub, { marginBottom: 12 }]}>
        CSV o JSON con columnas rutina, dia, ejercicio, musculo, tipo, series, reps, peso… También
        copias completas y de rescate.
      </Text>
      <Pressable style={[S.btn, { marginBottom: 20 }]} onPress={importFile}>
        <Icon name='upload' size={16} />
        <Text style={S.btnText}>Subir CSV / JSON</Text>
      </Pressable>
      {msg && (
        <Text
          style={[
            S.sub,
            { marginTop: -12, marginBottom: 16, color: msg.ok ? C.positive : C.negative },
          ]}
        >
          {msg.t}
        </Text>
      )}

      <Text style={S.label}>Exportar rutinas</Text>
      <View style={{ marginBottom: 20 }}>
        <Row
          onPress={() =>
            writeAndShare('rutinas.json', JSON.stringify(routinesToJSON(data), null, 2))
          }
          icon='download'
          label='Rutinas → JSON'
        />
        <Row
          onPress={() => writeAndShare('rutinas.csv', toCSV(routinesToCSVRows(data)))}
          icon='download'
          label='Rutinas → CSV'
        />
        <Row
          onPress={() => writeAndShare('historial.csv', toCSV(logsToCSVRows(data)))}
          icon='download'
          label='Historial completo → CSV'
        />
      </View>

      <Text style={S.label}>Exportar progreso para IA</Text>
      <Text style={[S.sub, { marginBottom: 10 }]}>
        Genera un archivo listo para pasarle a un modelo de IA y que analice tu progreso.
      </Text>
      <View style={{ marginBottom: 20 }}>
        <Row onPress={exportProgressMD} icon='file-text' label='Progreso → Markdown (.md)' />
        <Row onPress={exportProgressJSON} icon='code' label='Progreso → JSON' />
      </View>

      <Text style={S.label}>Copia de seguridad</Text>
      <Text style={[S.sub, { marginBottom: 10 }]}>
        Guarda o restaura TODO (rutinas, ejercicios, historial y ajustes) en un único archivo. Para
        importarla, súbela arriba con "Subir CSV / JSON".
      </Text>
      <View style={{ marginBottom: 20 }}>
        <Row onPress={exportBackup} icon='save' label='Exportar copia completa (.json)' />
      </View>

      <Text style={S.label}>Notificaciones de descanso</Text>
      <View style={{ marginBottom: 20 }}>
        <Row
          onPress={openExactAlarmSettings}
          icon={alarm === 'denied' ? 'alert-triangle' : 'bell'}
          danger={alarm === 'denied'}
          label='Alarmas y recordatorios'
          detail={ALARM_TEXT[alarm]}
        />
      </View>

      <Text style={S.label}>Reloj / Health Connect</Text>
      <Text style={[S.sub, { marginBottom: 10 }]}>
        Comprueba por qué no se sincronizan los datos de Samsung Health.
      </Text>
      <View style={{ marginBottom: 20 }}>
        <Row onPress={checkHealthConnect} icon='activity' label='Comprobar Health Connect' />
        <Row
          onPress={() => openHealthConnectSettings()}
          icon='settings'
          label='Abrir ajustes de Health Connect'
        />
      </View>

      <Text style={S.label}>Ajustes</Text>
      <View style={{ marginBottom: 20 }}>
        <View style={{ paddingVertical: 14, borderBottomWidth: 1, borderColor: C.line }}>
          <Text style={[S.sub, { marginBottom: 8 }]}>Unidad de peso</Text>
          <View style={[S.row, { gap: 8 }]}>
            {['kg', 'lb'].map((u) => (
              <Pressable
                key={u}
                onPress={() => changeUnit(u)}
                style={[S.pillBtn, unit === u && S.pillBtnOn]}
              >
                <Text style={unit === u ? S.pillTextOn : S.pillText}>{u}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={{ paddingVertical: 14, borderBottomWidth: 1, borderColor: C.line }}>
          <Text style={[S.sub, { marginBottom: 8 }]}>Descanso por defecto</Text>
          <View style={[S.row, { gap: 8, flexWrap: 'wrap' }]}>
            {[60, 90, 120, 180].map((s) => (
              <Pressable
                key={s}
                onPress={() =>
                  setData((d) => ({ ...d, settings: { ...d.settings, restSeconds: s } }))
                }
                style={[S.pillBtn, data.settings.restSeconds === s && S.pillBtnOn]}
              >
                <Text style={data.settings.restSeconds === s ? S.pillTextOn : S.pillText}>
                  {mmss(s)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <Text style={S.label}>Admin</Text>
      <View>
        <Row
          danger
          icon='trash-2'
          label='Limpiar historial (conserva rutinas)'
          onPress={() =>
            ask({
              title: 'Limpiar historial',
              message:
                '¿Borrar todos los registros de sesiones? Las rutinas y ejercicios se conservan.',
              label: 'Limpiar',
              destructive: true,
              action: () => {
                setData((d) => ({ ...d, logs: [] }));
                setMsg({ ok: true, t: 'Historial eliminado.' });
              },
            })
          }
        />
        <Row
          danger
          icon='alert-triangle'
          label='Restablecer todo'
          onPress={() =>
            !blockedBySession() &&
            ask({
              title: 'Restablecer',
              message: '¿Borrar todo y volver a la biblioteca de ejercicios inicial?',
              label: 'Restablecer',
              destructive: true,
              action: () => {
                setData(seed());
                setMsg({ ok: true, t: 'Datos restablecidos.' });
              },
            })
          }
        />
      </View>

      <Text style={[S.sub, { textAlign: 'center', marginTop: 20, marginBottom: 4 }]}>
        Datos guardados en el dispositivo.
      </Text>
      <View style={{ height: 20 }} />

      <ConfirmModal
        visible={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.label}
        destructive={!!confirm?.destructive}
        onConfirm={() => {
          const a = confirm.action;
          setConfirm(null);
          a();
        }}
        onCancel={() => setConfirm(null)}
      />
    </ScrollView>
  );
}
