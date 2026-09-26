// Datos de prueba reutilizables.
export const iso = (daysBack) => {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function makeData() {
  return {
    schemaVersion: 2,
    settings: { unit: 'kg', restSeconds: 90 },
    exercises: [
      { id: 'bench', name: 'Press banca', muscle: 'Pecho', type: 'strength' },
      { id: 'dbbench', name: 'Press banca mancuernas', muscle: 'Pecho', type: 'strength' },
      { id: 'pullup', name: 'Dominadas', muscle: 'Espalda', type: 'bodyweight' },
      { id: 'plank', name: 'Plancha', muscle: 'Abdomen', type: 'time' },
      { id: 'tread', name: 'Cinta', muscle: 'Cardio', type: 'cardio' },
    ],
    routines: [
      {
        id: 'r1',
        name: 'Full',
        days: [
          {
            id: 'd1',
            name: 'A',
            exercises: [
              { id: 'i1', exerciseId: 'bench', sets: 3, reps: '8-10', weight: 60 },
              { id: 'i2', exerciseId: 'plank', sets: 2, reps: '45' },
              { id: 'i3', exerciseId: 'tread', sets: 1, reps: '20', speed: 6, incline: 2 },
            ],
          },
          {
            id: 'd2',
            name: 'B',
            exercises: [{ id: 'i4', exerciseId: 'pullup', sets: 3, reps: '8' }],
          },
        ],
      },
    ],
    logs: [],
  };
}

export const log = (id, date, entries, extra = {}) => ({
  id,
  date,
  routineId: 'r1',
  dayId: 'd1',
  dayName: 'A',
  startedAt: null,
  endedAt: null,
  entries,
  ...extra,
});

export const set = (reps, weight, done = true, extra = {}) => ({
  id: Math.random().toString(36).slice(2),
  reps,
  weight,
  done,
  skipped: false,
  ...extra,
});
