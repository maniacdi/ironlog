import { Platform } from 'react-native';

let HC = null;
if (Platform.OS === 'android') {
  HC = require('react-native-health-connect');
}

const PERMISSIONS = [
  { accessType: 'read', recordType: 'HeartRate' },
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
    return await HC.requestPermission(PERMISSIONS);
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

export async function readSessionHealthData(startMs, endMs) {
  if (!HC) return null;
  const timeRangeFilter = {
    operator: 'between',
    startTime: new Date(startMs).toISOString(),
    endTime: new Date(endMs).toISOString(),
  };

  try {
    const [hrRes, calRes, exRes] = await Promise.all([
      HC.readRecords('HeartRate', { timeRangeFilter }).catch(() => ({
        records: [],
      })),
      HC.readRecords('TotalCaloriesBurned', { timeRangeFilter }).catch(() => ({
        records: [],
      })),
      HC.readRecords('ExerciseSession', { timeRangeFilter }).catch(() => ({
        records: [],
      })),
    ]);

    // FC — desde registros independientes de HeartRate
    const hrSamples = (hrRes.records || []).flatMap((r) => r.samples || []);
    const bpmValues = hrSamples
      .map((s) => s.beatsPerMinute)
      .filter((v) => typeof v === 'number' && v > 0);

    // FC — también desde ExerciseSession si tiene samples (Samsung a veces los mete aquí)
    const exSamples = (exRes.records || []).flatMap((r) => r.samples || []);
    const exBpm = exSamples
      .map((s) => s.beatsPerMinute)
      .filter((v) => typeof v === 'number' && v > 0);
    const allBpm = [...bpmValues, ...exBpm];

    const avgHr = allBpm.length
      ? Math.round(allBpm.reduce((a, b) => a + b, 0) / allBpm.length)
      : null;
    const maxHr = allBpm.length ? Math.max(...allBpm) : null;
    const minHr = allBpm.length ? Math.min(...allBpm) : null;

    // Kcal — TotalCaloriesBurned
    const kcalTotal = (calRes.records || []).reduce((acc, r) => {
      const v = r.energy?.inKilocalories ?? r.energy?.inCalories / 1000 ?? 0;
      return acc + v;
    }, 0);

    // Si no hay kcal en Total, intenta desde ExerciseSession
    const kcalEx = (exRes.records || []).reduce((acc, r) => {
      const v = r.energy?.inKilocalories ?? r.energy?.inCalories / 1000 ?? 0;
      return acc + v;
    }, 0);

    const kcal = Math.round(kcalTotal || kcalEx) || null;

    // Duración real desde ExerciseSession si la hay
    let durationMin = null;
    if (exRes.records?.length) {
      const ex = exRes.records[0];
      if (ex.startTime && ex.endTime) {
        durationMin = Math.round(
          (new Date(ex.endTime) - new Date(ex.startTime)) / 60000,
        );
      }
    }

    if (avgHr == null && !kcal) return null;

    return {
      avgHr,
      maxHr,
      minHr,
      kcal,
      durationMin,
      samples: allBpm.length,
      source: 'Samsung Health / Health Connect',
    };
  } catch {
    return null;
  }
}
