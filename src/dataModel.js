import { uid, norm } from './helpers';

export function migrate(d) {
  const settings = { unit: 'kg', restSeconds: 90, ...(d.settings || {}) };
  if (d.exercises) return { ...d, settings };
  const lib = [],
    byName = {};
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
    id: r.id,
    name: r.name,
    days: r.days.map((day) => ({
      id: day.id,
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
    entries: l.entries.map((en) => ({
      ...en,
      exerciseId: ensure(en.name, en.muscle),
    })),
  }));
  return { exercises: lib, routines, logs, settings };
}

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
  ].map(([name, muscle]) => ({ id: uid(), name, muscle }));

  return {
    exercises,
    routines: [],
    logs: [],
    settings: { unit: 'kg', restSeconds: 90 },
  };
}
