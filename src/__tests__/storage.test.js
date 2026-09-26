import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadData, saveData, KEYS, dumpRaw, dataFromDump, __resetWriteCache } from '../storage';
import { makeData, log } from './fixtures';

beforeEach(async () => {
  await AsyncStorage.clear();
  __resetWriteCache();
  jest.clearAllMocks();
});

test('vacío → empty (no error)', async () => {
  expect(await loadData()).toEqual({ status: 'empty' });
});

test('guarda por bloques con historial por año y recupera lo mismo', async () => {
  const d = makeData();
  d.logs = [log('a', '2025-12-31', []), log('b', '2026-01-01', [])];
  await saveData(d);
  const raw = await dumpRaw();
  expect(Object.keys(raw)).toEqual(expect.arrayContaining([KEYS.logs('2025'), KEYS.logs('2026')]));
  __resetWriteCache();
  const res = await loadData();
  expect(res.status).toBe('ok');
  expect(res.data).toEqual(d);
});

test('solo reescribe los bloques que cambian', async () => {
  const d = makeData();
  d.logs = [log('a', '2025-05-01', [])];
  await saveData(d);
  AsyncStorage.multiSet.mockClear();
  await saveData({ ...d, logs: [...d.logs, log('b', '2026-02-01', [])] });
  const keys = AsyncStorage.multiSet.mock.calls[0][0].map(([k]) => k);
  expect(keys).toEqual([KEYS.logs('2026'), KEYS.logYears]);
});

test('borra bloques de años que se quedan vacíos', async () => {
  const d = makeData();
  d.logs = [log('a', '2025-05-01', [])];
  await saveData(d);
  await saveData({ ...d, logs: [] });
  expect(await AsyncStorage.getItem(KEYS.logs('2025'))).toBeNull();
});

test('datos corruptos → error, nunca empty', async () => {
  await AsyncStorage.setItem(KEYS.settings, JSON.stringify({ unit: 'kg' }));
  await AsyncStorage.setItem(KEYS.logYears, JSON.stringify(['2025']));
  await AsyncStorage.setItem(KEYS.logs('2025'), '[{"id":');
  const res = await loadData();
  expect(res.status).toBe('error');
});

test('fallo de lectura → error', async () => {
  AsyncStorage.multiGet.mockImplementationOnce(() => Promise.reject(new Error('Row too big')));
  const res = await loadData();
  expect(res).toMatchObject({ status: 'error' });
});

test('lee la clave antigua gym-data si no hay v2', async () => {
  await AsyncStorage.setItem(KEYS.legacy, JSON.stringify({ routines: [], logs: [] }));
  expect(await loadData()).toMatchObject({ status: 'ok', legacy: true });
});

test('copia de rescate reconstruye los datos', async () => {
  const d = makeData();
  d.logs = [log('a', '2025-05-01', [])];
  await saveData(d);
  expect(dataFromDump(await dumpRaw())).toEqual(d);
});
