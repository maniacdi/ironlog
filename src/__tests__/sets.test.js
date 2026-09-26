import { isDoneSet, entryVolume, entryMetrics, formatSet, e1rm } from '../domain/sets';
import { set } from './fixtures';

test('isDoneSet: solo hechas y no saltadas; done ausente = hecha (legado)', () => {
  expect(isDoneSet({ done: true })).toBe(true);
  expect(isDoneSet({ done: false })).toBe(false);
  expect(isDoneSet({})).toBe(true);
  expect(isDoneSet({ done: true, skipped: true })).toBe(false);
});

test('volumen: ignora series no hechas y duplica si es por lado', () => {
  const entry = { sets: [set(10, 20), set(10, 20, false)], perSide: false };
  expect(entryVolume(entry, 'strength')).toBe(200);
  expect(entryVolume({ ...entry, perSide: true }, 'strength')).toBe(400);
  expect(entryVolume({ ...entry, skipped: true }, 'strength')).toBe(0);
  expect(entryVolume(entry, 'time')).toBe(0);
});

test('métricas por tipo', () => {
  expect(entryMetrics({ sets: [set(5, 100), set(8, 90), set(1, 200, false)] }, 'strength')).toEqual(
    {
      primary: 100,
      peso: 100,
      e1rm: Math.round(e1rm(100, 5)),
    },
  );
  expect(
    entryMetrics(
      {
        sets: [
          { secs: 30, done: true },
          { secs: 45, done: true },
        ],
      },
      'time',
    ).primary,
  ).toBe(45);
  expect(entryMetrics({ sets: [{ mins: 30, speed: 10, done: true }] }, 'cardio')).toEqual({
    primary: 30,
    mins: 30,
    dist: 5,
  });
  expect(entryMetrics({ sets: [set(8, 0, false)] }, 'strength')).toBeNull();
});

test('formatSet', () => {
  expect(formatSet('strength', { reps: 8, weight: 60 }, 'kg')).toBe('8 reps × 60kg');
  expect(formatSet('strength', { reps: 8, weight: 20 }, 'kg', true)).toBe('8 reps × 20kg c/u');
  expect(formatSet('bodyweight', { reps: 10, weight: 0 }, 'kg')).toBe('10 reps');
  expect(formatSet('time', { secs: 40 }, 'kg')).toBe('40 s');
  expect(formatSet('cardio', { mins: 20, speed: 6, incline: 0 }, 'kg')).toBe(
    '20 min · 6 km/h · ≈2 km',
  );
});
