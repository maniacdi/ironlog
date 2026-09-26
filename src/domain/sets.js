import { isLoaded } from './exerciseTypes';

// Fuente única de verdad: una serie cuenta como hecha si no está saltada y
// no está marcada explícitamente como no hecha. `done` ausente = hecha
// (registros antiguos, anteriores al check por serie).
export const isDoneSet = (s) => !!s && s.done !== false && !s.skipped;

export const doneSets = (entry) =>
  entry && !entry.skipped ? (entry.sets || []).filter(isDoneSet) : [];

// Epley. Solo tiene sentido con carga y repeticiones.
export const e1rm = (w, r) => (w > 0 && r > 0 ? w * (1 + r / 30) : 0);

const loadMult = (entry) => (entry.perSide ? 2 : 1);

// Volumen = peso × reps de las series hechas (×2 si el peso es por lado).
// Tiempo y cardio no suman volumen.
export function entryVolume(entry, type) {
  if (!isLoaded(type)) return 0;
  return doneSets(entry).reduce((a, s) => a + (s.weight || 0) * (s.reps || 0) * loadMult(entry), 0);
}

// `typeOf(exerciseId)` resuelve el tipo del ejercicio (la entrada puede
// traerlo cacheado).
export const logVolume = (log, typeOf) =>
  log.entries.reduce((a, e) => a + entryVolume(e, e.type || typeOf(e.exerciseId)), 0);

export const logDoneSetCount = (log) => log.entries.reduce((a, e) => a + doneSets(e).length, 0);

export const cardioDistance = (s) => (s.speed > 0 && s.mins > 0 ? (s.speed * s.mins) / 60 : 0);

const round1 = (n) => Math.round(n * 10) / 10;

// Métricas por entrada para gráficas y tendencias. `primary` es la que decide
// si el ejercicio progresa.
export function entryMetrics(entry, type) {
  const sets = doneSets(entry);
  if (!sets.length) return null;
  const max = (f) => Math.max(0, ...sets.map(f));
  switch (type) {
    case 'bodyweight':
      return {
        primary: max((s) => s.reps || 0),
        reps: max((s) => s.reps || 0),
        lastre: max((s) => s.weight || 0),
      };
    case 'time':
      return { primary: max((s) => s.secs || 0), secs: max((s) => s.secs || 0) };
    case 'cardio': {
      const mins = sets.reduce((a, s) => a + (s.mins || 0), 0);
      const dist = round1(sets.reduce((a, s) => a + cardioDistance(s), 0));
      return { primary: mins, mins, dist };
    }
    default:
      return {
        primary: max((s) => s.weight || 0),
        peso: max((s) => s.weight || 0),
        e1rm: Math.round(max((s) => e1rm(s.weight, s.reps))),
      };
  }
}

export const PRIMARY_UNIT = { strength: 'unit', bodyweight: 'reps', time: 's', cardio: 'min' };

// Texto de una serie para listados/exportaciones.
export function formatSet(type, s, unit, perSide = false) {
  const cu = perSide ? ' c/u' : '';
  switch (type) {
    case 'bodyweight':
      return s.weight > 0 ? `${s.reps} reps +${s.weight}${unit}${cu}` : `${s.reps} reps`;
    case 'time':
      return `${s.secs || 0} s`;
    case 'cardio': {
      const parts = [`${s.mins || 0} min`];
      if (s.speed > 0) parts.push(`${s.speed} km/h`);
      if (s.incline > 0) parts.push(`${s.incline}% incl.`);
      const d = cardioDistance(s);
      if (d > 0) parts.push(`≈${round1(d)} km`);
      return parts.join(' · ');
    }
    default:
      return `${s.reps} reps × ${s.weight}${unit}${cu}`;
  }
}

// Resumen corto de la mejor serie de referencia ("última" en la sesión).
export function formatRef(type, s, unit) {
  if (!s) return null;
  switch (type) {
    case 'bodyweight':
      return s.weight > 0 ? `${s.reps}r +${s.weight}${unit}` : `${s.reps} reps`;
    case 'time':
      return `${s.secs || 0}s`;
    case 'cardio':
      return s.speed > 0 ? `${s.mins}' @${s.speed}` : `${s.mins}'`;
    default:
      return `${s.weight}${unit}`;
  }
}
