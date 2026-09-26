import { migrate, seed, SCHEMA_VERSION } from '../dataModel';

describe('migrate', () => {
  test('v1 (nombres embebidos) → biblioteca de ejercicios con tipos', () => {
    const v1 = {
      routines: [
        {
          id: 'r',
          name: 'R',
          days: [
            {
              id: 'd',
              name: 'D',
              exercises: [{ name: 'Plancha', muscle: 'Abdomen', sets: 3, reps: '30' }],
            },
          ],
        },
      ],
      logs: [
        {
          id: 'l',
          date: '2025-01-02',
          entries: [{ name: 'plancha', sets: [{ reps: 1, weight: 0 }] }],
        },
      ],
    };
    const d = migrate(v1);
    expect(d.schemaVersion).toBe(SCHEMA_VERSION);
    expect(d.exercises).toHaveLength(1); // mismo nombre normalizado → un solo ejercicio
    expect(d.exercises[0].type).toBe('time');
    expect(d.routines[0].days[0].exercises[0].exerciseId).toBe(d.exercises[0].id);
    expect(d.logs[0].entries[0].exerciseId).toBe(d.exercises[0].id);
    expect(d.logs[0].entries[0].sets[0].id).toBeTruthy();
  });

  test('formato actual sin tipos ni ids de serie: los añade y conserva todo', () => {
    const cur = {
      exercises: [
        { id: 'a', name: 'Press banca', muscle: 'Pecho' },
        { id: 'b', name: 'Cinta', muscle: 'Cardio' },
        { id: 'c', name: 'Dominadas', muscle: 'Espalda' },
      ],
      routines: [],
      logs: [
        {
          id: 'l',
          date: '2025-03-01',
          entries: [{ exerciseId: 'a', sets: [{ reps: 8, weight: 60, done: true }] }],
        },
      ],
      settings: { unit: 'kg', restSeconds: 120 },
    };
    const d = migrate(cur);
    expect(d.exercises.map((e) => e.type)).toEqual(['strength', 'cardio', 'bodyweight']);
    expect(d.settings.restSeconds).toBe(120);
    expect(d.logs[0].startedAt).toBeNull();
    expect(d.logs[0].entries[0].sets[0]).toMatchObject({ reps: 8, weight: 60, done: true });
  });

  test('es idempotente (ids y tipos elegidos a mano se conservan)', () => {
    const once = migrate({
      ...seed(),
      exercises: [{ id: 'x', name: 'Press banca', muscle: 'Pecho', type: 'cardio' }],
    });
    const twice = migrate(once);
    expect(twice).toEqual(once);
    expect(twice.exercises[0].type).toBe('cardio');
  });

  test('rechaza datos corruptos en vez de devolver datos a medias', () => {
    expect(() => migrate(null)).toThrow();
    expect(() => migrate({ exercises: [], routines: 'x', logs: [], settings: {} })).toThrow(
      /rutinas/,
    );
    expect(() =>
      migrate({
        exercises: [],
        routines: [],
        logs: [{ id: 'l', date: 'ayer', entries: [] }],
        settings: {},
      }),
    ).toThrow(/Sesión/);
  });
});
