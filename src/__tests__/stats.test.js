import {
  isoWeek,
  weeklyFrequency,
  avgPerWeek,
  exerciseHistory,
  exerciseSummaries,
  muscleVolume,
} from '../domain/stats';
import { makeData, log, set, iso } from './fixtures';

test('isoWeek', () => {
  expect(isoWeek('2026-01-01')).toEqual({ year: 2026, week: 1 }); // jueves
  expect(isoWeek('2024-12-30')).toEqual({ year: 2025, week: 1 }); // lunes de la S1 de 2025
  expect(isoWeek('2027-01-01')).toEqual({ year: 2026, week: 53 });
});

test('weeklyFrequency incluye semanas vacías', () => {
  const logs = [{ date: '2026-09-21' }, { date: '2026-09-23' }, { date: '2026-09-07' }];
  const f = weeklyFrequency(logs, '2026-09-26', 4);
  expect(f.map((x) => x.value)).toEqual([0, 1, 0, 2]);
  expect(f[3].name).toBe('S39');
});

test('avgPerWeek cuenta las semanas sin entrenar', () => {
  const logs = [{ date: '2026-09-07' }, { date: '2026-09-21' }];
  expect(avgPerWeek(logs, '2026-09-26')).toBeCloseTo(2 / 3);
});

test('historial y tendencia solo con series hechas', () => {
  const d = makeData();
  d.logs = [
    log('a', '2025-01-01', [{ exerciseId: 'bench', sets: [set(8, 60)] }]),
    log('b', '2025-01-08', [{ exerciseId: 'bench', sets: [set(8, 62.5), set(8, 200, false)] }]),
  ];
  expect(exerciseHistory(d, 'bench').map((p) => p.peso)).toEqual([60, 62.5]);
  const [s] = exerciseSummaries(d);
  expect(s).toMatchObject({ id: 'bench', now: 62.5, delta: 2.5, trend: 'sube' });
});

test('volumen por músculo: sin cardio/tiempo, ×2 por lado', () => {
  const d = makeData();
  d.logs = [
    log('a', iso(1), [
      { exerciseId: 'dbbench', perSide: true, sets: [set(10, 20)] },
      { exerciseId: 'plank', sets: [{ secs: 60, done: true }] },
    ]),
  ];
  expect(muscleVolume(d, 14)).toEqual([['Pecho', 400]]);
});
