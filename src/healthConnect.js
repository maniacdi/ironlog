import { Platform } from 'react-native';

// Health Connect solo existe en Android. En iOS estas funciones son no-ops seguros.
let HC = null;
if (Platform.OS === 'android') {
  // Import perezoso: evita romper Metro/iOS si el módulo nativo no está enlazado.
  HC = require('react-native-health-connect');
}

const PERMISSIONS = [
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'TotalCaloriesBurned' },
  { accessType: 'read', recordType: 'ExerciseSession' },
];

export async function isHealthConnectAvailable() {
  if (!HC) return false;
  try {
    const status = await HC.getSdkStatus();
    return status === HC.SdkAvailabilityStatus.SDK_AVAILABLE;
  } catch {
    return false;
  }
}

export async function initHealthConnect() {
  if (!HC) return false;
  try {
    return await HC.initialize();
  } catch {
    return false;
  }
}

export async function requestHealthPermissions() {
  if (!HC) return [];
  try {
    const granted = await HC.requestPermission(PERMISSIONS);
    return granted;
  } catch {
    return [];
  }
}

export async function hasHealthPermissions() {
  if (!HC) return false;
  try {
    const granted = await HC.getGrantedPermissions();
    return PERMISSIONS.every((p) =>
      granted.some(
        (g) => g.recordType === p.recordType && g.accessType === p.accessType,
      ),
    );
  } catch {
    return false;
  }
}

// Lee FC media/máx y kcal activas quemadas entre dos timestamps (ms).
// Devuelve null si Health Connect no está disponible o no hay datos.
export async function readSessionHealthData(startMs, endMs) {
  if (!HC) return null;
  const timeRangeFilter = {
    operator: 'between',
    startTime: new Date(startMs).toISOString(),
    endTime: new Date(endMs).toISOString(),
  };

  try {
    const [hrRes, calRes] = await Promise.all([
      HC.readRecords('HeartRate', { timeRangeFilter }),
      HC.readRecords('ActiveCaloriesBurned', { timeRangeFilter }),
    ]);

    // Cada registro de FC trae un array de muestras; las aplanamos todas.
    const samples = (hrRes.records || []).flatMap((r) => r.samples || []);
    const bpmValues = samples
      .map((s) => s.beatsPerMinute)
      .filter((v) => typeof v === 'number');

    const avgHr = bpmValues.length
      ? Math.round(bpmValues.reduce((a, b) => a + b, 0) / bpmValues.length)
      : null;
    const maxHr = bpmValues.length ? Math.max(...bpmValues) : null;
    const minHr = bpmValues.length ? Math.min(...bpmValues) : null;

    const kcal = (calRes.records || []).reduce(
      (acc, r) => acc + (r.energy?.inKilocalories || 0),
      0,
    );

    if (avgHr == null && !kcal) return null;

    return {
      avgHr,
      maxHr,
      minHr,
      kcal: kcal ? Math.round(kcal) : null,
      samples: bpmValues.length,
      source: 'Samsung Health / Health Connect',
    };
  } catch {
    return null;
  }
}
