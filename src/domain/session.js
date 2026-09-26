import { uid, firstInt } from '../helpers';
import { normalizeType, isLoaded } from './exerciseTypes';
import { doneSets, e1rm, entryVolume, logDoneSetCount } from './sets';

export const exerciseOf = (data, id) => data.exercises.find((e) => e.id === id);
export const typeOf = (data, id) => normalizeType(exerciseOf(data, id)?.type);

// Más reciente primero; a igualdad de fecha decide la hora de fin.
export const byRecent = (a, b) =>
  b.date.localeCompare(a.date) || (b.endedAt || 0) - (a.endedAt || 0);

// Última entrada con series hechas de ese ejercicio.
export function lastEntryFor(data, exId) {
  const logs = [...data.logs].sort(byRecent);
  for (const l of logs) {
    const e = l.entries.find((x) => x.exerciseId === exId && doneSets(x).length);
    if (e) return e;
  }
  return null;
}

// Serie de referencia de una entrada: la mejor para ese tipo.
export function refSet(type, entry) {
  const sets = doneSets(entry);
  if (!sets.length) return null;
  const score =
    type === 'time'
      ? (s) => s.secs || 0
      : type === 'cardio'
        ? () => 0
        : (s) => (s.weight || 0) * 1000 + (s.reps || 0);
  return sets.reduce((best, s) => (score(s) > score(best) ? s : best), sets[0]);
}

export function bestE1rm(data, exId) {
  let best = 0;
  data.logs.forEach((l) =>
    l.entries
      .filter((e) => e.exerciseId === exId)
      .forEach((e) => doneSets(e).forEach((s) => (best = Math.max(best, e1rm(s.weight, s.reps))))),
  );
  return best;
}

export function makeSet(type, item = {}, ref = null) {
  const base = { id: uid(), done: false, skipped: false };
  switch (type) {
    case 'time':
      return { ...base, secs: ref?.secs ?? firstInt(item.reps, 30) };
    case 'cardio':
      return {
        ...base,
        mins: firstInt(item.reps, 20),
        speed: ref?.speed ?? item.speed ?? 0,
        incline: ref?.incline ?? item.incline ?? 0,
      };
    default:
      return {
        ...base,
        reps: firstInt(item.reps, 10),
        weight: ref?.weight ?? item.weight ?? 0,
      };
  }
}

const DUMBBELL_RE = /mancuerna/i;

// Entrada de sesión para un ejercicio. `item` es el item de la rutina (o
// un objeto parcial cuando se sustituye el ejercicio).
export function buildEntry(data, exId, item = {}, count) {
  const ex = exerciseOf(data, exId);
  const type = normalizeType(ex?.type);
  const last = lastEntryFor(data, exId);
  const ref = refSet(type, last);
  const prevBest = type === 'strength' ? bestE1rm(data, exId) : 0;
  const n = count ?? (item.sets || 1);
  return {
    id: uid(),
    exerciseId: exId,
    type,
    note: '',
    skipped: false,
    prescription: item.reps ?? '',
    cue: item.note || '',
    rest: item.rest ?? null,
    restAfter: item.restAfter ?? null,
    perSide: item.perSide ?? last?.perSide ?? DUMBBELL_RE.test(ex?.name || ''),
    ref,
    prevBest,
    prFlashed: false,
    swappedFrom: null,
    sets: Array.from({ length: n }, () => makeSet(type, item, ref)),
  };
}

export function buildSession(data, routine, day, now = Date.now()) {
  return {
    id: uid(),
    routineId: routine.id,
    dayId: day.id,
    dayName: day.name,
    feeling: null,
    note: '',
    startedAt: now,
    entries: day.exercises
      .filter((it) => it.exerciseId)
      .map((it) => buildEntry(data, it.exerciseId, it)),
  };
}

// Sustituye el ejercicio de una entrada (p.ej. barra ocupada → mancuernas).
// Solo si aún no hay series hechas: mezclar series de dos ejercicios en una
// entrada falsearía el historial.
export function swapEntry(session, entryId, data, newExId) {
  const idx = session.entries.findIndex((e) => e.id === entryId);
  if (idx < 0) return session;
  const old = session.entries[idx];
  if (old.sets.some((s) => s.done)) throw new Error('entry-has-done-sets');
  const fresh = buildEntry(
    data,
    newExId,
    { reps: old.prescription, note: old.cue, rest: old.rest, restAfter: old.restAfter },
    Math.max(1, old.sets.length),
  );
  const entries = [...session.entries];
  entries[idx] = {
    ...fresh,
    id: old.id,
    note: old.note,
    swappedFrom: old.swappedFrom ?? old.exerciseId,
  };
  return { ...session, entries };
}

// Récord: solo fuerza y solo si hay historial previo con el que comparar
// (la primera vez que haces un ejercicio no es un récord).
export const isPR = (entry, set) =>
  entry.type === 'strength' &&
  entry.prevBest > 0 &&
  e1rm(set.weight, set.reps) > entry.prevBest + 0.01;

export function finishSession(session, data, now = Date.now()) {
  const entries = session.entries
    .map((e) => ({
      id: e.id,
      exerciseId: e.exerciseId,
      type: e.type,
      note: e.note,
      skipped: e.skipped || false,
      perSide: e.perSide || false,
      swappedFrom: e.swappedFrom || null,
      sets: e.sets,
    }))
    .filter((e) => e.skipped || e.sets.some((s) => s.done));

  const prs = [];
  session.entries.forEach((e) => {
    if (doneSets(e).some((s) => isPR(e, s))) {
      const name = exerciseOf(data, e.exerciseId)?.name || 'Ejercicio';
      if (!prs.includes(name)) prs.push(name);
    }
  });

  const startedAt = session.startedAt || null;
  const durationMin = startedAt ? Math.max(1, Math.round((now - startedAt) / 60000)) : null;
  const d = new Date(startedAt || now);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const log = {
    id: uid(),
    date,
    routineId: session.routineId,
    dayId: session.dayId,
    dayName: session.dayName,
    feeling: session.feeling,
    note: session.note,
    startedAt,
    endedAt: now,
    durationMin,
    entries,
    health: null,
  };
  const volume = entries.reduce((a, e) => a + entryVolume(e, e.type), 0);
  const summary = {
    volume: Math.round(volume),
    sets: logDoneSetCount(log),
    skipped: entries.filter((e) => e.skipped).length,
    hasLoad: entries.some((e) => isLoaded(e.type)),
    prs,
    durationMin,
  };
  return { log, summary };
}

// Sugerencia: el día siguiente al último entrenado de esa rutina.
export function suggestedDayId(data) {
  if (!data.logs.length) return null;
  const last = [...data.logs].sort(byRecent)[0];
  const r = data.routines.find((x) => x.id === last.routineId);
  if (!r || !r.days.length) return null;
  const idx = r.days.findIndex((d) => d.id === last.dayId);
  return r.days[(idx + 1) % r.days.length]?.id || null;
}
