import AsyncStorage from '@react-native-async-storage/async-storage';

// Esquema de almacenamiento v2: una clave por bloque y el historial partido
// por año. Así ninguna fila crece sin límite (Android/SQLite falla al leer
// filas de ~2MB) y cada guardado solo reescribe lo que cambió.
const P = 'ironlog:v2:';
export const KEYS = {
  legacy: 'gym-data', // v1: todo en una clave. Se conserva como respaldo.
  settings: P + 'settings',
  exercises: P + 'exercises',
  routines: P + 'routines',
  logYears: P + 'logYears',
  logs: (year) => P + 'logs:' + year,
  active: P + 'active', // entrenamiento en curso + temporizador
};

// Último contenido escrito por clave, para no reescribir lo que no cambió.
const written = new Map();

const parse = (raw, key) => {
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`Datos corruptos en ${key}: ${e.message}`);
  }
};

// Devuelve { status: 'ok', data, legacy } | { status: 'empty' } |
// { status: 'error', error }. 'error' NUNCA debe tratarse como vacío: si se
// sembraran datos nuevos se sobrescribiría el historial real.
export async function loadData() {
  try {
    const core = await AsyncStorage.multiGet([
      KEYS.settings,
      KEYS.exercises,
      KEYS.routines,
      KEYS.logYears,
    ]);
    const [settings, exercises, routines, logYears] = core.map(([, v]) => v);
    if (settings != null) {
      const years = logYears ? parse(logYears, KEYS.logYears) : [];
      const logRows = years.length ? await AsyncStorage.multiGet(years.map(KEYS.logs)) : [];
      const logs = [];
      logRows.forEach(([k, v]) => {
        if (v == null) throw new Error(`Falta el bloque de historial ${k}`);
        logs.push(...parse(v, k));
        written.set(k, v);
      });
      written.set(KEYS.settings, settings);
      written.set(KEYS.exercises, exercises);
      written.set(KEYS.routines, routines);
      written.set(KEYS.logYears, logYears);
      const { schemaVersion, ...s } = parse(settings, KEYS.settings);
      return {
        status: 'ok',
        legacy: false,
        data: {
          schemaVersion,
          settings: s,
          exercises: exercises ? parse(exercises, KEYS.exercises) : [],
          routines: routines ? parse(routines, KEYS.routines) : [],
          logs,
        },
      };
    }
    const legacy = await AsyncStorage.getItem(KEYS.legacy);
    if (legacy == null) return { status: 'empty' };
    return { status: 'ok', legacy: true, data: parse(legacy, KEYS.legacy) };
  } catch (error) {
    return { status: 'error', error };
  }
}

// Serializa los datos en bloques { clave: json }.
export function serialize(data) {
  const byYear = {};
  data.logs.forEach((l) => {
    const y = (l.date || '0000').slice(0, 4);
    (byYear[y] = byYear[y] || []).push(l);
  });
  const years = Object.keys(byYear).sort();
  const out = {
    [KEYS.settings]: JSON.stringify({ ...data.settings, schemaVersion: data.schemaVersion }),
    [KEYS.exercises]: JSON.stringify(data.exercises),
    [KEYS.routines]: JSON.stringify(data.routines),
    [KEYS.logYears]: JSON.stringify(years),
  };
  years.forEach((y) => (out[KEYS.logs(y)] = JSON.stringify(byYear[y])));
  return out;
}

// Guarda solo los bloques que cambiaron. Lanza si falla (el llamador avisa).
export async function saveData(data) {
  const blocks = serialize(data);
  const changed = Object.entries(blocks).filter(([k, v]) => written.get(k) !== v);
  // Años que ya no tienen sesiones (p.ej. tras limpiar historial).
  const stale = [...written.keys()].filter((k) => k.startsWith(P + 'logs:') && !(k in blocks));
  if (!changed.length && !stale.length) return;
  // El historial primero y el índice de años al final: si se corta a medias,
  // el índice nunca apunta a un bloque que no existe.
  changed.sort(([a], [b]) => (a === KEYS.logYears) - (b === KEYS.logYears));
  await AsyncStorage.multiSet(changed);
  changed.forEach(([k, v]) => written.set(k, v));
  if (stale.length) {
    await AsyncStorage.multiRemove(stale);
    stale.forEach((k) => written.delete(k));
  }
}

// Volcado en bruto de todo lo guardado, para rescatar datos si la carga falla.
export async function dumpRaw() {
  const keys = await AsyncStorage.getAllKeys();
  const rows = await AsyncStorage.multiGet(keys);
  return Object.fromEntries(rows);
}

export const isDump = (o) =>
  o != null && typeof o === 'object' && (KEYS.settings in o || KEYS.legacy in o);

// Reconstruye los datos desde un volcado de dumpRaw() (copia de rescate).
// Prefiere el esquema v2; si no está, usa la clave v1.
export function dataFromDump(raw) {
  if (raw[KEYS.settings]) {
    const years = raw[KEYS.logYears] ? parse(raw[KEYS.logYears], KEYS.logYears) : [];
    const { schemaVersion, ...settings } = parse(raw[KEYS.settings], KEYS.settings);
    return {
      schemaVersion,
      settings,
      exercises: raw[KEYS.exercises] ? parse(raw[KEYS.exercises], KEYS.exercises) : [],
      routines: raw[KEYS.routines] ? parse(raw[KEYS.routines], KEYS.routines) : [],
      logs: years.flatMap((y) => (raw[KEYS.logs(y)] ? parse(raw[KEYS.logs(y)], KEYS.logs(y)) : [])),
    };
  }
  return parse(raw[KEYS.legacy], KEYS.legacy);
}

// ── Entrenamiento en curso ─────────────────────────────────────────────────
export async function loadActive() {
  try {
    const v = await AsyncStorage.getItem(KEYS.active);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

export async function saveActive(active) {
  if (active && (active.session || active.rest))
    await AsyncStorage.setItem(KEYS.active, JSON.stringify(active));
  else await AsyncStorage.removeItem(KEYS.active);
}

// Solo para tests.
export const __resetWriteCache = () => written.clear();
