// Importación y exportación (lógica pura, sin E/S).
import { uid, norm, exName, exMuscle, parseCSV } from '../helpers';
import { makeExercise, migrate } from '../dataModel';
import { dataFromDump, isDump } from '../storage';
import { normalizeType, EXERCISE_TYPES, TYPE_LABELS } from './exerciseTypes';
import { isDoneSet } from './sets';

const exTypeName = (data, id) => normalizeType(data.exercises.find((e) => e.id === id)?.type);

// ── Exportar ────────────────────────────────────────────────────────────────
export function routinesToJSON(data) {
  return {
    routines: data.routines.map((r) => ({
      name: r.name,
      days: r.days.map((d) => ({
        name: d.name,
        exercises: d.exercises.map((e) => ({
          name: exName(data, e.exerciseId),
          muscle: exMuscle(data, e.exerciseId),
          type: exTypeName(data, e.exerciseId),
          sets: e.sets,
          reps: e.reps,
          weight: e.weight,
          speed: e.speed ?? null,
          incline: e.incline ?? null,
          note: e.note || '',
          rest: e.rest ?? null,
          restAfter: e.restAfter ?? null,
          perSide: e.perSide || false,
        })),
      })),
    })),
  };
}

export function routinesToCSVRows(data) {
  const rows = [];
  data.routines.forEach((r) =>
    r.days.forEach((d) =>
      d.exercises.forEach((e) =>
        rows.push({
          rutina: r.name,
          dia: d.name,
          ejercicio: exName(data, e.exerciseId),
          musculo: exMuscle(data, e.exerciseId),
          tipo: exTypeName(data, e.exerciseId),
          series: e.sets,
          reps: e.reps,
          peso: e.weight ?? '',
          velocidad: e.speed ?? '',
          inclinacion: e.incline ?? '',
          notas: e.note || '',
          descanso: e.rest ?? '',
          descanso_ejercicio: e.restAfter ?? '',
          cu: e.perSide ? 'si' : '',
        }),
      ),
    ),
  );
  return rows;
}

export function logsToCSVRows(data) {
  const rows = [];
  data.logs.forEach((l) =>
    l.entries.forEach((e) =>
      e.sets.forEach((s, i) =>
        rows.push({
          fecha: l.date,
          dia: l.dayName,
          ejercicio: exName(data, e.exerciseId),
          tipo: e.type || exTypeName(data, e.exerciseId),
          sustituye_a: e.swappedFrom ? exName(data, e.swappedFrom) : '',
          saltado_ejercicio: e.skipped ? 'si' : '',
          serie: i + 1,
          reps: s.reps ?? '',
          peso: s.weight ?? '',
          cu: e.perSide ? 'si' : '',
          segundos: s.secs ?? '',
          minutos: s.mins ?? '',
          velocidad: s.speed ?? '',
          inclinacion: s.incline ?? '',
          completada: isDoneSet(s) ? 'si' : '',
          saltada: s.skipped ? 'si' : '',
          sensacion_dia: l.feeling || '',
          duracion_min: l.durationMin ?? '',
        }),
      ),
    ),
  );
  return rows;
}

// ── Importar ────────────────────────────────────────────────────────────────
const TYPE_ALIASES = {
  fuerza: 'strength',
  'peso corporal': 'bodyweight',
  corporal: 'bodyweight',
  tiempo: 'time',
  isometrico: 'time',
  isométrico: 'time',
  cardio: 'cardio',
};
const parseType = (v) => {
  const k = norm(v);
  if (!k) return undefined;
  if (EXERCISE_TYPES.includes(k)) return k;
  const byLabel = EXERCISE_TYPES.find((t) => norm(TYPE_LABELS[t]) === k);
  return byLabel || TYPE_ALIASES[k];
};
const num = (v) => {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const YES = ['si', 'sí', 'true', '1', 'yes', 'x'];

// Crea rutinas a partir de filas planas (CSV o JSON de rutinas). Reutiliza
// los ejercicios existentes por nombre y crea los que falten.
export function buildRoutinesFromRows(data, rows) {
  const exercises = [...data.exercises];
  const byName = {};
  exercises.forEach((e) => (byName[norm(e.name)] = e));
  const ensure = (name, muscle, type) => {
    const k = norm(name);
    if (!k) return null;
    if (byName[k]) return byName[k].id;
    const ex = makeExercise(name, muscle, type);
    exercises.push(ex);
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
        parseType(row.tipo || row.type),
      ),
      sets: num(row.series ?? row.sets) || 3,
      reps: String(row.reps ?? '').trim() || '10',
      weight: num(row.peso ?? row.weight) ?? 0,
      speed: num(row.velocidad ?? row.speed),
      incline: num(row.inclinacion ?? row.incline),
      note: row.notas || row.note || '',
      rest: num(row.descanso ?? row.rest) || null,
      restAfter: num(row.descanso_ejercicio ?? row.restAfter) || null,
      perSide: YES.includes(norm(String(row.cu ?? row.perSide ?? row.c_u ?? ''))),
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
  return { exercises, routines };
}

const rowsFromRoutineJSON = (p) => {
  const rs = Array.isArray(p) ? p : p.routines;
  if (!Array.isArray(rs)) throw new Error('El JSON no contiene rutinas.');
  const rows = [];
  rs.forEach((r) =>
    (r.days || []).forEach((d) =>
      (d.exercises || []).forEach((e) =>
        rows.push({
          rutina: r.name,
          dia: d.name,
          ejercicio: e.name,
          musculo: e.muscle,
          tipo: e.type,
          series: e.sets,
          reps: e.reps,
          peso: e.weight,
          velocidad: e.speed,
          inclinacion: e.incline,
          notas: e.note || '',
          descanso: e.rest ?? '',
          descanso_ejercicio: e.restAfter ?? '',
          cu: e.perSide ? 'si' : '',
        }),
      ),
    ),
  );
  return rows;
};

// Interpreta un archivo importado.
// → { kind: 'backup', data }  datos completos YA migrados y validados
// → { kind: 'routines', rows } filas de rutinas para buildRoutinesFromRows
// Lanza Error con mensaje legible si el formato no es válido.
export function parseImport(text, filename = '') {
  const t = text.trim();
  const looksJSON =
    filename.toLowerCase().endsWith('.json') || t.startsWith('{') || t.startsWith('[');
  if (!looksJSON) return { kind: 'routines', rows: parseCSV(text) };

  let p;
  try {
    p = JSON.parse(t);
  } catch {
    throw new Error('El archivo JSON no es válido.');
  }
  let full = null;
  if (p && p._ironlogBackup && p.data) full = p.data;
  else if (isDump(p)) full = dataFromDump(p);
  else if (p && p.logs && p.exercises && p.settings) full = p;
  if (full) return { kind: 'backup', data: migrate(full) }; // migrate valida y lanza
  return { kind: 'routines', rows: rowsFromRoutineJSON(p) };
}
