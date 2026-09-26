// Tipos de ejercicio. Cada tipo decide qué campos tiene una serie y cómo
// se mide el progreso.
//
// En los items de rutina, `reps` guarda el OBJETIVO en texto libre y su
// significado depende del tipo: repeticiones ("8-10"), segundos ("30-45")
// o minutos ("20"). Se mantiene el nombre por compatibilidad con
// importaciones/exportaciones anteriores.

export const EXERCISE_TYPES = ['strength', 'bodyweight', 'time', 'cardio'];

export const TYPE_LABELS = {
  strength: 'Fuerza',
  bodyweight: 'Peso corporal',
  time: 'Tiempo',
  cardio: 'Cardio',
};

export const isLoaded = (type) => type === 'strength' || type === 'bodyweight';

const BODYWEIGHT_RE =
  /dominad|fondos|flexi[oó]n|push.?up|pull.?up|chin.?up|crunch|elevaci[oó]n de piernas|rueda abdominal|burpee|abdominales/i;
const TIME_RE = /plancha|plank|isom[eé]tric|hollow|wall.?sit|sentadilla isom|colgado|dead.?hang/i;

export function inferType(name, muscle) {
  if (muscle === 'Cardio') return 'cardio';
  const n = name || '';
  if (TIME_RE.test(n)) return 'time';
  if (BODYWEIGHT_RE.test(n)) return 'bodyweight';
  return 'strength';
}

export const normalizeType = (t) => (EXERCISE_TYPES.includes(t) ? t : 'strength');

export const weightStep = (unit) => (unit === 'lb' ? 5 : 2.5);

// Campos editables de una serie según tipo (orden = columnas en pantalla).
export function setFields(type, unit, perSide = false) {
  const cu = perSide ? ' c/u' : '';
  switch (type) {
    case 'bodyweight':
      return [
        { key: 'reps', label: 'REPS', step: 1 },
        { key: 'weight', label: `LASTRE${cu}`, step: weightStep(unit) },
      ];
    case 'time':
      return [{ key: 'secs', label: 'SEGUNDOS', step: 5 }];
    case 'cardio':
      return [
        { key: 'mins', label: 'MIN', step: 1 },
        { key: 'speed', label: 'KM/H', step: 0.5 },
        { key: 'incline', label: 'INCL %', step: 0.5 },
      ];
    default:
      return [
        { key: 'reps', label: 'REPS', step: 1 },
        { key: 'weight', label: `PESO${cu}`, step: weightStep(unit) },
      ];
  }
}

// Etiqueta del objetivo en el editor de rutinas.
export const targetLabel = (type) =>
  type === 'time' ? 'SEGUNDOS' : type === 'cardio' ? 'MINUTOS' : 'REPS';
export const targetPlaceholder = (type) =>
  type === 'time' ? '30-45' : type === 'cardio' ? '20' : '8-10';
export const defaultTarget = (type) => (type === 'time' ? '30' : type === 'cardio' ? '20' : '8-10');
export const defaultSetCount = (type) => (type === 'cardio' ? 1 : 3);
