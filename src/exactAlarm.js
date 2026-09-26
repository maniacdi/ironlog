import { Linking, Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

// Módulo nativo local (modules/exact-alarm). Ausente en Expo Go o en builds
// anteriores: entonces el estado es 'unknown' y no se muestra ningún aviso.
const Native = Platform.OS === 'android' ? requireOptionalNativeModule('ExactAlarm') : null;

// 'granted' | 'denied' | 'unknown'
export function exactAlarmStatus() {
  if (Platform.OS !== 'android') return 'granted';
  if (!Native) return 'unknown';
  try {
    return Native.canScheduleExactAlarms() ? 'granted' : 'denied';
  } catch {
    return 'unknown';
  }
}

export function openExactAlarmSettings() {
  try {
    if (Native?.openSettings()) return;
  } catch {}
  Linking.openSettings();
}
