import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Icon } from '../components/Icon';
import { C, S } from '../theme';
import { uid, norm, mmss, exName, exMuscle, parseCSV, toCSV } from '../helpers';
import { seed } from '../dataModel';

export default function DataScreen({ data, setData }) {
  const [msg, setMsg] = useState(null);
  const unit = data.settings.unit;

  const writeAndShare = async (filename, content) => {
    try {
      const uri = FileSystem.documentDirectory + filename;
      await FileSystem.writeAsStringAsync(uri, content);
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
      else Alert.alert('Guardado', `Archivo creado: ${filename}`);
    } catch (e) {
      Alert.alert('Error', 'No se pudo exportar el archivo.');
    }
  };

  const exportJSON = () => {
    const out = {
      routines: data.routines.map((r) => ({
        name: r.name,
        days: r.days.map((d) => ({
          name: d.name,
          exercises: d.exercises.map((e) => ({
            name: exName(data, e.exerciseId),
            muscle: exMuscle(data, e.exerciseId),
            sets: e.sets,
            reps: e.reps,
            weight: e.weight,
            note: e.note || '',
            rest: e.rest ?? null,
            restAfter: e.restAfter ?? null,
            perSide: e.perSide || false,
          })),
        })),
      })),
    };
    writeAndShare('rutinas.json', JSON.stringify(out, null, 2));
  };
  const exportCSV = () => {
    const rows = [];
    data.routines.forEach((r) =>
      r.days.forEach((d) =>
        d.exercises.forEach((e) =>
          rows.push({
            rutina: r.name,
            dia: d.name,
            ejercicio: exName(data, e.exerciseId),
            musculo: exMuscle(data, e.exerciseId),
            series: e.sets,
            reps: e.reps,
            peso: e.weight,
            notas: e.note || '',
            descanso: e.rest ?? '',
            descanso_ejercicio: e.restAfter ?? '',
            cu: e.perSide ? 'si' : '',
          }),
        ),
      ),
    );
    writeAndShare('rutinas.csv', toCSV(rows));
  };
  const exportLogs = () => {
    const rows = [];
    data.logs.forEach((l) =>
      l.entries.forEach((e) =>
        e.sets.forEach((s, i) =>
          rows.push({
            fecha: l.date,
            dia: l.dayName,
            ejercicio: exName(data, e.exerciseId),
            serie: i + 1,
            reps: s.reps,
            peso: s.weight,
            sensacion_dia: l.feeling || '',
            duracion_min: l.durationMin ?? '',
          }),
        ),
      ),
    );
    writeAndShare('historial.csv', toCSV(rows));
  };

  const buildFromRows = (rows) => {
    const lib = [...data.exercises];
    const byName = {};
    lib.forEach((e) => (byName[norm(e.name)] = e));
    const ensure = (name, muscle) => {
      const k = norm(name);
      if (!k) return null;
      if (byName[k]) return byName[k].id;
      const ex = {
        id: uid(),
        name: String(name).trim(),
        muscle: muscle || 'Otro',
      };
      lib.push(ex);
      byName[k] = ex;
      return ex.id;
    };
    const byR = {};
    rows.forEach((row) => {
      const rk = row.rutina || row.routine || 'Importada';
      const dk = row.dia || row.day || 'Día 1';
      byR[rk] = byR[rk] || {};
      byR[rk][dk] = byR[rk][dk] || [];
      byR[rk][dk].push({
        id: uid(),
        exerciseId: ensure(
          row.ejercicio || row.exercise || row.name,
          row.musculo || row.muscle,
        ),
        sets: +(row.series || row.sets) || 3,
        reps: String(row.reps ?? '').trim() || '10',
        weight: +(row.peso || row.weight) || 0,
        note: row.notas || row.note || '',
        rest:
          row.descanso || row.rest ? +(row.descanso || row.rest) || null : null,
        restAfter:
          row.descanso_ejercicio || row.restAfter
            ? +(row.descanso_ejercicio || row.restAfter) || null
            : null,
        perSide: ['si', 'sí', 'true', '1', 'yes', 'x'].includes(
          norm(row.cu || row.perSide || row.c_u || ''),
        ),
      });
    });
    const routines = Object.entries(byR).map(([name, days]) => ({
      id: uid(),
      name,
      days: Object.entries(days).map(([dn, ex]) => ({
        id: uid(),
        name: dn,
        exercises: ex.filter((e) => e.exerciseId),
      })),
    }));
    return { lib, routines };
  };

  const importFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'application/json',
          'text/csv',
          'text/comma-separated-values',
          '*/*',
        ],
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const file = res.assets ? res.assets[0] : res;
      const text = await FileSystem.readAsStringAsync(file.uri);
      let rows;
      if (
        (file.name || '').toLowerCase().endsWith('.json') ||
        text.trim().startsWith('{') ||
        text.trim().startsWith('[')
      ) {
        const p = JSON.parse(text);
        const rs = Array.isArray(p) ? p : p.routines;
        rows = [];
        rs.forEach((r) =>
          (r.days || []).forEach((d) =>
            (d.exercises || []).forEach((e) =>
              rows.push({
                rutina: r.name,
                dia: d.name,
                ejercicio: e.name,
                musculo: e.muscle,
                series: e.sets,
                reps: e.reps,
                peso: e.weight,
                notas: e.note || '',
                descanso: e.rest ?? '',
                descanso_ejercicio: e.restAfter ?? '',
                cu: e.perSide ? 'si' : '',
              }),
            ),
          ),
        );
      } else {
        rows = parseCSV(text);
      }
      const { lib, routines } = buildFromRows(rows);
      setData((d) => ({
        ...d,
        exercises: lib,
        routines: [...d.routines, ...routines],
      }));
      setMsg({ ok: true, t: `Importadas ${routines.length} rutina(s).` });
    } catch (e) {
      setMsg({
        ok: false,
        t: 'No se pudo leer el archivo. Revisa el formato.',
      });
    }
  };

  const Btn = ({ onPress, icon, label }) => (
    <Pressable
      style={[S.btn, S.btnGhost, { flex: 1, paddingVertical: 10 }]}
      onPress={onPress}
    >
      <Icon name={icon} size={14} color={C.text} />
      <Text style={[S.btnTextGhost, { fontSize: 12 }]}>{label}</Text>
    </Pressable>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <View style={S.card}>
        <Text style={S.label}>Importar</Text>
        <Text style={[S.sub, { marginBottom: 12 }]}>
          CSV con columnas rutina, dia, ejercicio, musculo, series, reps, peso
          (más notas, descanso, descanso_ejercicio, cu) o JSON con la misma
          estructura. Los ejercicios nuevos se añaden a tu biblioteca.
        </Text>
        <Pressable style={S.btn} onPress={importFile}>
          <Icon name='upload' size={16} />
          <Text style={S.btnText}>Subir CSV / JSON</Text>
        </Pressable>
        {msg && (
          <Text
            style={[
              S.sub,
              { marginTop: 10, color: msg.ok ? C.positive : C.negative },
            ]}
          >
            {msg.t}
          </Text>
        )}
      </View>

      <View style={S.card}>
        <Text style={S.label}>Exportar</Text>
        <View style={[S.row, { gap: 8, flexWrap: 'wrap' }]}>
          <Btn onPress={exportJSON} icon='download' label='Rutinas JSON' />
          <Btn onPress={exportCSV} icon='download' label='Rutinas CSV' />
          <Btn onPress={exportLogs} icon='download' label='Historial CSV' />
        </View>
      </View>

      <View style={S.card}>
        <Text style={S.label}>Unidad de peso</Text>
        <View style={[S.row, { gap: 6 }]}>
          {['kg', 'lb'].map((u) => (
            <Pressable
              key={u}
              onPress={() =>
                setData((d) => ({ ...d, settings: { ...d.settings, unit: u } }))
              }
              style={[S.pillBtn, unit === u && S.pillBtnOn]}
            >
              <Text style={unit === u ? S.pillTextOn : S.pillText}>{u}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={S.card}>
        <Text style={S.label}>Descanso por defecto</Text>
        <View style={[S.row, { gap: 6, flexWrap: 'wrap' }]}>
          {[60, 90, 120, 180].map((s) => (
            <Pressable
              key={s}
              onPress={() =>
                setData((d) => ({
                  ...d,
                  settings: { ...d.settings, restSeconds: s },
                }))
              }
              style={[
                S.pillBtn,
                data.settings.restSeconds === s && S.pillBtnOn,
              ]}
            >
              <Text
                style={
                  data.settings.restSeconds === s ? S.pillTextOn : S.pillText
                }
              >
                {mmss(s)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={S.card}>
        <Text style={S.label}>Zona de peligro</Text>
        <Pressable
          style={[
            S.btn,
            {
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderColor: C.line,
            },
          ]}
          onPress={() =>
            Alert.alert('Restablecer', '¿Borrar todo y volver al ejemplo?', [
              { text: 'Cancelar' },
              {
                text: 'Restablecer',
                style: 'destructive',
                onPress: () => {
                  setData(seed());
                  setMsg({ ok: true, t: 'Datos restablecidos.' });
                },
              },
            ])
          }
        >
          <Icon name='trash-2' size={15} color={C.negative} />
          <Text style={{ color: C.negative, fontWeight: '700' }}>
            Restablecer todo
          </Text>
        </Pressable>
      </View>
      <Text style={[S.sub, { textAlign: 'center', marginTop: 4 }]}>
        Tus datos se guardan en el dispositivo.
      </Text>
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}
