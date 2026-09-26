import { useCallback } from 'react';
import {
  initHealthConnect,
  hasHealthPermissions,
  requestHealthPermissions,
  readSessionHealthData,
} from '../../healthConnect';

const PAD_MS = 2 * 60000;

// Ventana de lectura de un log: exacta si guardó inicio/fin; si no (sesiones
// anteriores a guardar la hora), el día completo acotado por la sesión del reloj.
export function logWindow(log) {
  if (log.startedAt && log.endedAt)
    return { start: log.startedAt - PAD_MS, end: log.endedAt + PAD_MS, opts: { exact: true } };
  return {
    start: new Date(log.date + 'T00:00:00').getTime(),
    end: new Date(log.date + 'T23:59:59').getTime(),
    opts: { exact: false, durationMin: log.durationMin },
  };
}

// Pide permisos de Health Connect si faltan. Solo debe llamarse ante una
// acción del usuario (empezar entreno, pulsar sincronizar), nunca desde un
// reintento en segundo plano: el diálogo aparecería en cualquier pantalla.
export async function ensureHealthPermissions() {
  try {
    if (!(await initHealthConnect())) return false;
    if (await hasHealthPermissions()) return true;
    await requestHealthPermissions();
    return await hasHealthPermissions();
  } catch {
    return false;
  }
}

export function useHealthSync(setData) {
  // Lee Health Connect para el log y lo guarda si aporta algo (más muestras
  // que lo que ya había). Devuelve los datos leídos o null.
  const enrich = useCallback(
    async (log, { requestPerms = false } = {}) => {
      try {
        const ok = requestPerms
          ? await ensureHealthPermissions()
          : (await initHealthConnect()) && (await hasHealthPermissions());
        if (!ok) return null;
        const { start, end, opts } = logWindow(log);
        const health = await readSessionHealthData(start, end, opts);
        if (!health) return null;
        setData((d) => ({
          ...d,
          logs: d.logs.map((l) =>
            l.id === log.id && (!l.health || (health.samples || 0) >= (l.health.samples || 0))
              ? { ...l, health }
              : l,
          ),
        }));
        return health;
      } catch {
        return null;
      }
    },
    [setData],
  );

  // Tras terminar: Samsung Health sube a Health Connect con retraso, así que
  // se reintenta aunque el primer intento traiga datos parciales.
  const syncAfterFinish = useCallback(
    (log) => {
      enrich(log);
      setTimeout(() => enrich(log), 45000);
      setTimeout(() => enrich(log), 180000);
    },
    [enrich],
  );

  return { enrich, syncAfterFinish };
}
