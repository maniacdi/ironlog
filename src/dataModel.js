import { uid, norm } from './helpers';
import { inferType, normalizeType } from './domain/exerciseTypes';
import { validateData, validateLegacy } from './domain/validate';

export const SCHEMA_VERSION = 2;

const DEFAULT_SETTINGS = { unit: 'kg', restSeconds: 90 };

// v1: rutinas y logs con el nombre del ejercicio embebido, sin biblioteca.
function fromLegacy(d) {
  const lib = [];
  const byName = {};
  const ensure = (name, muscle) => {
    const k = norm(name);
    if (!k) return null;
    if (byName[k]) {
      if (muscle && byName[k].muscle === 'Otro') byName[k].muscle = muscle;
      return byName[k].id;
    }
    const ex = { id: uid(), name: name.trim(), muscle: muscle || 'Otro' };
    lib.push(ex);
    byName[k] = ex;
    return ex.id;
  };
  const routines = (d.routines || []).map((r) => ({
    id: r.id || uid(),
    name: r.name,
    days: r.days.map((day) => ({
      id: day.id || uid(),
      name: day.name,
      exercises: (day.exercises || []).map((e) => ({
        id: e.id || uid(),
        exerciseId: ensure(e.name, e.muscle),
        sets: e.sets,
        reps: e.reps,
        weight: e.weight,
        note: e.note || '',
        rest: e.rest ?? null,
        restAfter: e.restAfter ?? null,
        perSide: e.perSide || false,
      })),
    })),
  }));
  const logs = (d.logs || []).map((l) => ({
    ...l,
    id: l.id || uid(),
    entries: l.entries.map((en) => ({ ...en, exerciseId: ensure(en.name, en.muscle) })),
  }));
  return { exercises: lib, routines, logs, settings: d.settings || {} };
}

// Lleva cualquier versión anterior al esquema actual. Idempotente: los ids
// existentes se conservan. Lanza Error con mensaje legible si los datos no
// tienen una forma utilizable (nunca devuelve datos a medias).
export function migrate(input) {
  let d = input;
  if (d && typeof d === 'object' && !Array.isArray(d.exercises)) {
    const legacyErr = validateLegacy(d);
    if (legacyErr) throw new Error(legacyErr);
    d = fromLegacy(d);
  }
  d = { ...d, settings: { ...DEFAULT_SETTINGS, ...((d && d.settings) || {}) } };
  const err = validateData(d);
  if (err) throw new Error(err);

  return {
    schemaVersion: SCHEMA_VERSION,
    settings: d.settings,
    exercises: d.exercises.map((e) => ({
      ...e,
      muscle: e.muscle || 'Otro',
      type: e.type ? normalizeType(e.type) : inferType(e.name, e.muscle),
    })),
    routines: d.routines.map((r) => ({
      ...r,
      days: r.days.map((day) => ({
        ...day,
        exercises: day.exercises.map((it) => ({ ...it, id: it.id || uid() })),
      })),
    })),
    logs: d.logs.map((l) => ({
      ...l,
      startedAt: l.startedAt ?? null,
      endedAt: l.endedAt ?? null,
      entries: l.entries.map((e) => ({
        ...e,
        id: e.id || uid(),
        sets: e.sets.map((s) => ({ ...s, id: s.id || uid() })),
      })),
    })),
  };
}

export const makeExercise = (name, muscle, type) => ({
  id: uid(),
  name: String(name).trim(),
  muscle: muscle || 'Otro',
  type: type ? normalizeType(type) : inferType(name, muscle),
});

export function seed() {
  const exercises = [
    ['Press banca', 'Pecho'],
    ['Press inclinado mancuernas', 'Pecho'],
    ['Aperturas', 'Pecho'],
    ['Fondos', 'Pecho'],
    ['Press banca mancuernas', 'Pecho'],
    ['Dominadas', 'Espalda'],
    ['Remo con barra', 'Espalda'],
    ['Jalón al pecho', 'Espalda'],
    ['Remo en polea', 'Espalda'],
    ['Peso muerto', 'Espalda'],
    ['Pull-over', 'Espalda'],
    ['Press militar', 'Hombro'],
    ['Elevaciones laterales', 'Hombro'],
    ['Elevaciones frontales', 'Hombro'],
    ['Face pull', 'Hombro'],
    ['Pájaros', 'Hombro'],
    ['Curl con barra', 'Bíceps'],
    ['Curl mancuernas', 'Bíceps'],
    ['Curl martillo', 'Bíceps'],
    ['Curl predicador', 'Bíceps'],
    ['Extensión en polea', 'Tríceps'],
    ['Press francés', 'Tríceps'],
    ['Fondos en banco', 'Tríceps'],
    ['Patada de tríceps', 'Tríceps'],
    ['Sentadilla', 'Cuádriceps'],
    ['Prensa', 'Cuádriceps'],
    ['Extensión de cuádriceps', 'Cuádriceps'],
    ['Zancadas', 'Cuádriceps'],
    ['Sentadilla búlgara', 'Cuádriceps'],
    ['Peso muerto rumano', 'Femoral'],
    ['Curl femoral', 'Femoral'],
    ['Buenos días', 'Femoral'],
    ['Hip thrust', 'Glúteo'],
    ['Patada de glúteo', 'Glúteo'],
    ['Gemelos de pie', 'Gemelo'],
    ['Gemelos sentado', 'Gemelo'],
    ['Plancha', 'Abdomen'],
    ['Crunch', 'Abdomen'],
    ['Elevación de piernas', 'Abdomen'],
    ['Rueda abdominal', 'Abdomen'],
    ['Encogimientos', 'Trapecio'],
    ['Cinta', 'Cardio'],
    ['Bicicleta estática', 'Cardio'],
    ['Elíptica', 'Cardio'],
    ['Remo ergómetro', 'Cardio'],
  ].map(([name, muscle]) => ({ id: uid(), name, muscle, type: inferType(name, muscle) }));

  return {
    schemaVersion: SCHEMA_VERSION,
    exercises,
    routines: [],
    logs: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}
