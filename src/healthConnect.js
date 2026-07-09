import { Platform } from 'react-native';

let HC = null;
if (Platform.OS === 'android') {
  HC = require('react-native-health-connect');
}

const PERMISSIONS = [
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'TotalCaloriesBurned' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'ExerciseSession' },
];

// Logger central. Se ve en Metro / `npx expo start` / logcat.
// Además acumula las últimas líneas para poder mostrarlas en pantalla.
const LOG_BUFFER = [];
function log(...args) {
  const line = args
    .map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))
    .join(' ');
  LOG_BUFFER.push(line);
  if (LOG_BUFFER.length > 60) LOG_BUFFER.shift();
  // eslint-disable-next-line no-console
  console.log('[HC]', line);
}

export function getHealthLog() {
  return LOG_BUFFER.join('\n');
}

export async function isHealthConnectAvailable() {
  if (!HC) {
    log('modulo nativo ausente (¿Expo Go? necesitas dev build)');
    return false;
  }
  try {
    const status = await HC.getSdkStatus();
    log('getSdkStatus =', status, 'SDK_AVAILABLE =', HC.SdkAvailabilityStatus?.SDK_AVAILABLE);
    return status === HC.SdkAvailabilityStatus.SDK_AVAILABLE;
  } catch (e) {
    log('getSdkStatus ERROR', String(e?.message || e));
    return false;
  }
}

export async function initHealthConnect() {
  if (!HC) {
    log('init: modulo nativo ausente');
    return false;
  }
  try {
    const ok = await HC.initialize();
    log('initialize =', ok);
    return ok;
  } catch (e) {
    log('initialize ERROR', String(e?.message || e));
    return false;
  }
}

export async function requestHealthPermissions() {
  if (!HC) return [];
  try {
    const granted = await HC.requestPermission(PERMISSIONS);
    log('requestPermission concedidos =', (granted || []).map((g) => g.recordType));
    return granted;
  } catch (e) {
    log('requestPermission ERROR', String(e?.message || e));
    return [];
  }
}

export async function getGrantedHealthPermissions() {
  if (!HC) return [];
  try {
    const granted = await HC.getGrantedPermissions();
    log('getGrantedPermissions =', (granted || []).map((g) => g.recordType));
    return granted || [];
  } catch (e) {
    log('getGrantedPermissions ERROR', String(e?.message || e));
    return [];
  }
}

export async function hasHealthPermissions() {
  const granted = await getGrantedHealthPermissions();
  // Basta con FC O calorías; no exigimos los 4 tipos.
  const has = (rt) =>
    granted.some((g) => g.recordType === rt && g.accessType === 'read');
  const ok = has('HeartRate') || has('TotalCaloriesBurned') || has('ActiveCaloriesBurned');
  log('hasHealthPermissions =', ok);
  return ok;
}

// Lee un tipo de record y loguea cuántos vinieron o el error concreto.
async function readType(recordType, timeRangeFilter) {
  if (!HC) return [];
  try {
    const res = await HC.readRecords(recordType, { timeRangeFilter });
    const records = res?.records || [];
    log(`read ${recordType} =`, records.length, 'registros');
    return records;
  } catch (e) {
    log(`read ${recordType} ERROR`, String(e?.message || e));
    return [];
  }
}

export async function readSessionHealthData(startMs, endMs) {
  if (!HC) return null;
  const timeRangeFilter = {
    operator: 'between',
    startTime: new Date(startMs).toISOString(),
    endTime: new Date(endMs).toISOString(),
  };
  log('leyendo rango', timeRangeFilter.startTime, '→', timeRangeFilter.endTime);

  const [hrRecords, totalCalRecords, activeCalRecords] = await Promise.all([
    readType('HeartRate', timeRangeFilter),
    readType('TotalCaloriesBurned', timeRangeFilter),
    readType('ActiveCaloriesBurned', timeRangeFilter),
  ]);

  // FC — samples dentro de cada HeartRateRecord, con timestamp
  const hrSamples = hrRecords
    .flatMap((r) => r.samples || [])
    .map((s) => ({
      t: s.time ? new Date(s.time).getTime() : null,
      bpm: s.beatsPerMinute,
    }))
    .filter((s) => typeof s.bpm === 'number' && s.bpm > 0)
    .sort((a, b) => (a.t || 0) - (b.t || 0));
  const bpmValues = hrSamples.map((s) => s.bpm);

  const avgHr = bpmValues.length
    ? Math.round(bpmValues.reduce((a, b) => a + b, 0) / bpmValues.length)
    : null;
  const maxHr = bpmValues.length ? Math.max(...bpmValues) : null;
  const minHr = bpmValues.length ? Math.min(...bpmValues) : null;

  // Serie temporal reducida a ~40 puntos para la gráfica de sesión
  const MAX_POINTS = 40;
  const step = Math.max(1, Math.ceil(hrSamples.length / MAX_POINTS));
  const hrSeries = hrSamples
    .filter((_, i) => i % step === 0)
    .map((s) => s.bpm);

  // Kcal — TotalCaloriesBurned, si no hay probamos ActiveCaloriesBurned
  const sumKcal = (records) =>
    records.reduce((acc, r) => {
      const inCal = r.energy?.inCalories;
      const kcal =
        r.energy?.inKilocalories ??
        (typeof inCal === 'number' ? inCal / 1000 : 0);
      return acc + (kcal || 0);
    }, 0);
  const kcalTotal = sumKcal(totalCalRecords);
  const kcalActive = sumKcal(activeCalRecords);
  const kcal = Math.round(kcalTotal || kcalActive) || null;

  log('resumen →', { avgHr, maxHr, minHr, kcal, samples: bpmValues.length });

  if (avgHr == null && !kcal) {
    log('sin datos utilizables en el rango');
    return null;
  }

  return {
    avgHr,
    maxHr,
    minHr,
    kcal,
    samples: bpmValues.length,
    hrSeries: hrSeries.length > 1 ? hrSeries : null,
    source: 'Samsung Health / Health Connect',
  };
}

// Abre los ajustes de Health Connect para que el usuario revise permisos.
export async function openHealthConnectSettings() {
  if (!HC) return false;
  try {
    if (typeof HC.openHealthConnectSettings === 'function') {
      await HC.openHealthConnectSettings();
      return true;
    }
    log('openHealthConnectSettings no disponible en esta versión');
    return false;
  } catch (e) {
    log('openHealthConnectSettings ERROR', String(e?.message || e));
    return false;
  }
}

// Diagnóstico completo: comprueba cada capa y devuelve un informe legible.
// Úsalo desde la UI para ver EXACTAMENTE dónde falla la cadena.
export async function runHealthDiagnostic(startMs, endMs) {
  const report = { steps: [], ok: false };
  const add = (label, value) => report.steps.push({ label, value });

  if (!HC) {
    add('Módulo nativo', 'AUSENTE — estás en Expo Go. Necesitas dev build / EAS build.');
    return report;
  }

  let status;
  try {
    status = await HC.getSdkStatus();
  } catch (e) {
    status = 'ERROR: ' + String(e?.message || e);
  }
  const available = status === HC.SdkAvailabilityStatus?.SDK_AVAILABLE;
  add('SDK status', String(status) + (available ? ' (disponible)' : ' (NO disponible)'));
  if (!available) {
    add('Acción', 'Instala/actualiza Health Connect desde Play Store.');
    return report;
  }

  const initialized = await initHealthConnect();
  add('Inicializado', initialized ? 'sí' : 'NO');
  if (!initialized) return report;

  let granted = await getGrantedHealthPermissions();
  add('Permisos concedidos', granted.length ? granted.map((g) => g.recordType).join(', ') : 'NINGUNO');

  if (!granted.length) {
    add('Acción', 'Pidiendo permisos…');
    await requestHealthPermissions();
    granted = await getGrantedHealthPermissions();
    add('Permisos tras pedir', granted.length ? granted.map((g) => g.recordType).join(', ') : 'NINGUNO (rechazados)');
    if (!granted.length) {
      add('Acción', 'Concede permisos en Health Connect > Permisos de apps > IronLog.');
      return report;
    }
  }

  const timeRangeFilter = {
    operator: 'between',
    startTime: new Date(startMs).toISOString(),
    endTime: new Date(endMs).toISOString(),
  };
  add('Rango consultado', timeRangeFilter.startTime + ' → ' + timeRangeFilter.endTime);

  const hr = await readType('HeartRate', timeRangeFilter);
  const totalCal = await readType('TotalCaloriesBurned', timeRangeFilter);
  const activeCal = await readType('ActiveCaloriesBurned', timeRangeFilter);
  const ex = await readType('ExerciseSession', timeRangeFilter);
  add('HeartRate', hr.length + ' registros');
  add('TotalCaloriesBurned', totalCal.length + ' registros');
  add('ActiveCaloriesBurned', activeCal.length + ' registros');
  add('ExerciseSession', ex.length + ' registros');

  const totalRecords = hr.length + totalCal.length + activeCal.length + ex.length;
  if (totalRecords === 0) {
    add(
      'Diagnóstico',
      'Permisos OK pero Health Connect no tiene datos en ese rango. Causa habitual: Samsung Health no está sincronizando con Health Connect. Abre Samsung Health > Ajustes > Health Connect y activa Frecuencia cardíaca, Calorías y Ejercicio.',
    );
  } else {
    report.ok = true;
    add('Diagnóstico', 'Hay datos. La sincronización debería funcionar.');
  }
  return report;
}
