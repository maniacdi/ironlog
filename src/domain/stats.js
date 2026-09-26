import { daysAgo, fmtDate } from '../helpers';
import { isLoaded } from './exerciseTypes';
import { doneSets, entryVolume, entryMetrics } from './sets';
import { typeOf } from './session';

const DAY = 86400000;
const utc = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

// Semana ISO 8601 (lunes a domingo; la semana 1 contiene el primer jueves).
export function isoWeek(iso) {
  const t = new Date(utc(iso));
  const dow = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dow);
  const year = t.getUTCFullYear();
  const week = Math.ceil(((t - Date.UTC(year, 0, 1)) / DAY + 1) / 7);
  return { year, week };
}

// Lunes (en ms UTC) de la semana del día dado.
const mondayOf = (iso) => {
  const t = utc(iso);
  const dow = new Date(t).getUTCDay() || 7;
  return t - (dow - 1) * DAY;
};

// Sesiones por semana en las últimas `n` semanas, incluidas las vacías.
export function weeklyFrequency(logs, todayIso, n = 8) {
  const thisMonday = mondayOf(todayIso);
  const counts = {};
  logs.forEach((l) => {
    const k = mondayOf(l.date);
    counts[k] = (counts[k] || 0) + 1;
  });
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const m = thisMonday - i * 7 * DAY;
    const iso = new Date(m).toISOString().slice(0, 10);
    out.push({ name: 'S' + isoWeek(iso).week, value: counts[m] || 0 });
  }
  return out;
}

// Media semanal sobre todo el periodo (desde la semana del primer entreno
// hasta la actual), contando las semanas sin entrenar.
export function avgPerWeek(logs, todayIso) {
  if (!logs.length) return 0;
  const first = logs.reduce((m, l) => (l.date < m ? l.date : m), logs[0].date);
  const weeks = Math.round((mondayOf(todayIso) - mondayOf(first)) / (7 * DAY)) + 1;
  return logs.length / Math.max(1, weeks);
}

export const sessionsInRange = (logs, from, to) =>
  logs.filter((l) => {
    const d = daysAgo(l.date);
    return d >= from && d < to;
  }).length;

// Evolución de un ejercicio: un punto por sesión con series hechas.
export function exerciseHistory(data, exId) {
  const type = typeOf(data, exId);
  const points = [];
  [...data.logs]
    .sort((a, b) => a.date.localeCompare(b.date) || (a.endedAt || 0) - (b.endedAt || 0))
    .forEach((l) =>
      l.entries
        .filter((e) => e.exerciseId === exId)
        .forEach((e) => {
          const m = entryMetrics(e, type);
          if (m) points.push({ label: fmtDate(l.date), date: l.date, ...m });
        }),
    );
  return points;
}

export function exerciseSummaries(data) {
  const ids = [];
  const seen = new Set();
  data.logs.forEach((l) =>
    l.entries.forEach((e) => {
      if (!seen.has(e.exerciseId) && doneSets(e).length) {
        seen.add(e.exerciseId);
        ids.push(e.exerciseId);
      }
    }),
  );
  return ids.map((id) => {
    const pts = exerciseHistory(data, id);
    const tops = pts.map((p) => p.primary);
    const n = tops.length;
    const now = tops[n - 1];
    const first = tops[0];
    const prevBest = n > 1 ? Math.max(...tops.slice(0, -1)) : null;
    let trend = 'nuevo';
    if (n > 1) trend = now > prevBest + 0.01 ? 'sube' : now < prevBest - 0.01 ? 'baja' : 'estable';
    return { id, type: typeOf(data, id), now, delta: +(now - first).toFixed(1), trend, n };
  });
}

// Volumen por músculo en los últimos `days` días (solo ejercicios con carga).
export function muscleVolume(data, days) {
  const out = {};
  data.logs
    .filter((l) => daysAgo(l.date) < days)
    .forEach((l) =>
      l.entries.forEach((e) => {
        const type = e.type || typeOf(data, e.exerciseId);
        if (!isLoaded(type)) return;
        const m = data.exercises.find((x) => x.id === e.exerciseId)?.muscle || 'Otro';
        out[m] = (out[m] || 0) + entryVolume(e, type);
      }),
    );
  return Object.entries(out)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
}

// Series hechas por músculo en los últimos `days` días (sin cardio).
export function muscleSets(data, days) {
  const out = {};
  data.logs
    .filter((l) => daysAgo(l.date) < days)
    .forEach((l) =>
      l.entries.forEach((e) => {
        const type = e.type || typeOf(data, e.exerciseId);
        if (type === 'cardio') return;
        const n = doneSets(e).length;
        if (!n) return;
        const m = data.exercises.find((x) => x.id === e.exerciseId)?.muscle || 'Otro';
        out[m] = (out[m] || 0) + n;
      }),
    );
  return Object.entries(out).sort((a, b) => b[1] - a[1]);
}
