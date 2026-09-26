import { parseDecimalInput, parseCSV, toCSV } from '../helpers';
import { convertDataUnits } from '../domain/units';
import { pickExerciseSession } from '../healthConnect';
import { makeData, log, set } from './fixtures';

test('parseDecimalInput acepta coma y conserva texto incompleto', () => {
  expect(parseDecimalInput('22,5')).toEqual({ text: '22.5', value: 22.5 });
  expect(parseDecimalInput('22.')).toEqual({ text: '22.', value: null });
  expect(parseDecimalInput('')).toEqual({ text: '', value: null });
  expect(parseDecimalInput('2a')).toBeNull();
});

test('CSV: comillas y comas dentro de celdas', () => {
  expect(parseCSV('a,b\n"1,5",2')).toEqual([{ a: '1,5', b: '2' }]);
  expect(parseCSV(toCSV([{ a: 'x, "y"', b: 'z' }]))).toEqual([{ a: 'x, "y"', b: 'z' }]);
});

test('convertir kg → lb convierte rutinas e historial', () => {
  const d = makeData();
  d.logs = [log('a', '2025-01-01', [{ exerciseId: 'bench', sets: [set(8, 100)] }])];
  const c = convertDataUnits(d, 'lb');
  expect(c.settings.unit).toBe('lb');
  expect(c.logs[0].entries[0].sets[0].weight).toBe(220.5);
  expect(c.routines[0].days[0].exercises[0].weight).toBe(132.3);
  expect(convertDataUnits(c, 'kg').logs[0].entries[0].sets[0].weight).toBe(100);
});

test('Health Connect: elige la sesión del reloj más parecida en duración', () => {
  const at = (h, m) => new Date(Date.UTC(2025, 0, 1, h, m)).toISOString();
  const recs = [
    { startTime: at(7, 0), endTime: at(7, 30) }, // carrera 30'
    { startTime: at(18, 0), endTime: at(19, 5) }, // gym 65'
  ];
  expect(pickExerciseSession(recs, 60).start).toBe(Date.parse(at(18, 0)));
  expect(pickExerciseSession(recs, 25).start).toBe(Date.parse(at(7, 0)));
  expect(pickExerciseSession([], 60)).toBeNull();
});
