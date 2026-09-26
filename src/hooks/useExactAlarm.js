import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { exactAlarmStatus } from '../exactAlarm';

// Estado del permiso de alarmas exactas; se refresca al volver a la app
// (p.ej. después de activarlo en Ajustes).
export function useExactAlarmStatus() {
  const [status, setStatus] = useState(exactAlarmStatus);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setStatus(exactAlarmStatus());
    });
    return () => sub.remove();
  }, []);
  return status;
}
