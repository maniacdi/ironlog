import {
  parseImport,
  buildRoutinesFromRows,
  routinesToCSVRows,
  logsToCSVRows,
} from '../domain/transfer';
import { toCSV } from '../helpers';
import { makeData, log, set } from './fixtures';

test('copia completa válida → backup migrado', () => {
  const d = makeData();
  const r = parseImport(JSON.stringify({ _ironlogBackup: true, data: d }), 'x.json');
  expect(r.kind).toBe('backup');
  expect(r.data.exercises).toHaveLength(d.exercises.length);
});

test('copia completa corrupta → error legible, no datos a medias', () => {
  const bad = {
    _ironlogBackup: true,
    data: { exercises: [], routines: [], logs: 'x', settings: {} },
  };
  expect(() => parseImport(JSON.stringify(bad), 'x.json')).toThrow(/historial/i);
  expect(() => parseImport('{ no json', 'x.json')).toThrow(/JSON/);
});

test('CSV de rutinas: ida y vuelta conserva tipo, cardio y c/u', () => {
  const d = makeData();
  d.routines[0].days[0].exercises[0].perSide = true;
  const csv = toCSV(routinesToCSVRows(d));
  const parsed = parseImport(csv, 'r.csv');
  const empty = { ...d, exercises: [], routines: [] };
  const { exercises, routines } = buildRoutinesFromRows(empty, parsed.rows);
  expect(exercises.find((e) => e.name === 'Cinta').type).toBe('cardio');
  expect(exercises.find((e) => e.name === 'Plancha').type).toBe('time');
  const day = routines[0].days[0];
  expect(day.exercises[0].perSide).toBe(true);
  expect(day.exercises[2]).toMatchObject({ speed: 6, incline: 2, reps: '20' });
});

test('importar rutinas reutiliza ejercicios existentes por nombre', () => {
  const d = makeData();
  const { exercises } = buildRoutinesFromRows(d, [
    { rutina: 'X', dia: 'A', ejercicio: 'press BANCA ' },
  ]);
  expect(exercises).toHaveLength(d.exercises.length);
});

test('historial CSV marca completada solo si se hizo', () => {
  const d = makeData();
  d.logs = [
    log('a', '2025-01-01', [{ exerciseId: 'bench', sets: [set(8, 60), set(8, 60, false)] }]),
  ];
  expect(logsToCSVRows(d).map((r) => r.completada)).toEqual(['si', '']);
});
