import { buildSession, swapEntry, finishSession, isPR, suggestedDayId } from '../domain/session';
import { makeData, log, set } from './fixtures';

const withHistory = () => {
  const d = makeData();
  d.logs = [
    log('old', '2025-01-01', [{ id: 'e0', exerciseId: 'bench', sets: [set(8, 50)] }]),
    // Última sesión: la serie de 100 kg NO se hizo; no debe usarse como referencia.
    log('last', '2025-01-08', [
      { id: 'e1', exerciseId: 'bench', sets: [set(8, 62.5), set(8, 100, false)] },
    ]),
  ];
  return d;
};

test('buildSession: series por tipo y peso de la última serie HECHA', () => {
  const d = withHistory();
  const s = buildSession(d, d.routines[0], d.routines[0].days[0], 1000);
  const [bench, plank, tread] = s.entries;
  expect(bench.sets).toHaveLength(3);
  expect(bench.sets[0]).toMatchObject({ reps: 8, weight: 62.5, done: false });
  expect(new Set(bench.sets.map((x) => x.id)).size).toBe(3);
  expect(plank.type).toBe('time');
  expect(plank.sets[0].secs).toBe(45);
  expect(tread.sets[0]).toMatchObject({ mins: 20, speed: 6, incline: 2 });
});

test('mismo ejercicio dos veces en un día: entradas con ids distintos', () => {
  const d = makeData();
  d.routines[0].days[0].exercises.push({ id: 'i9', exerciseId: 'bench', sets: 2, reps: '5' });
  const s = buildSession(d, d.routines[0], d.routines[0].days[0]);
  const benches = s.entries.filter((e) => e.exerciseId === 'bench');
  expect(benches).toHaveLength(2);
  expect(benches[0].id).not.toBe(benches[1].id);
});

test('swapEntry: barra → mancuernas, conserva nº de series y marca el origen', () => {
  const d = makeData();
  const s = buildSession(d, d.routines[0], d.routines[0].days[0]);
  const e = s.entries[0];
  const swapped = swapEntry(s, e.id, d, 'dbbench');
  const n = swapped.entries[0];
  expect(n.id).toBe(e.id);
  expect(n.exerciseId).toBe('dbbench');
  expect(n.swappedFrom).toBe('bench');
  expect(n.perSide).toBe(true); // "mancuernas" → peso por mancuerna por defecto
  expect(n.sets).toHaveLength(3);
  // Otra sustitución sigue recordando el ejercicio original.
  expect(swapEntry(swapped, e.id, d, 'pullup').entries[0].swappedFrom).toBe('bench');
});

test('swapEntry: no permite cambiar si ya hay series hechas', () => {
  const d = makeData();
  const s = buildSession(d, d.routines[0], d.routines[0].days[0]);
  s.entries[0].sets[0].done = true;
  expect(() => swapEntry(s, s.entries[0].id, d, 'dbbench')).toThrow();
});

test('isPR: nunca la primera vez; sí al superar el histórico', () => {
  const fresh = makeData();
  const first = buildSession(fresh, fresh.routines[0], fresh.routines[0].days[0]);
  expect(isPR(first.entries[0], set(10, 200))).toBe(false);
  const d = withHistory();
  const s = buildSession(d, d.routines[0], d.routines[0].days[0]);
  expect(isPR(s.entries[0], set(8, 62.5))).toBe(false);
  expect(isPR(s.entries[0], set(8, 70))).toBe(true);
});

test('finishSession: guarda inicio/fin, filtra ejercicios vacíos y resume', () => {
  const d = withHistory();
  const s = buildSession(d, d.routines[0], d.routines[0].days[0], Date.UTC(2025, 0, 10, 10));
  s.entries[0].sets[0] = { ...s.entries[0].sets[0], reps: 8, weight: 70, done: true };
  s.entries[0].perSide = false;
  s.entries[1].skipped = true;
  const end = Date.UTC(2025, 0, 10, 11);
  const { log: l, summary } = finishSession(s, d, end);
  expect(l.startedAt).toBe(s.startedAt);
  expect(l.endedAt).toBe(end);
  expect(l.durationMin).toBe(60);
  expect(l.entries.map((e) => e.exerciseId)).toEqual(['bench', 'plank']); // cinta sin series → fuera
  expect(summary).toMatchObject({
    volume: 560,
    sets: 1,
    skipped: 1,
    prs: ['Press banca'],
    hasLoad: true,
  });
});

test('suggestedDayId: el siguiente al último entrenado', () => {
  const d = makeData();
  expect(suggestedDayId(d)).toBeNull();
  d.logs = [log('a', '2025-01-01', [])];
  expect(suggestedDayId(d)).toBe('d2');
});
