import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Vibration } from 'react-native';
import { scheduleRestDone, cancelRest } from '../notifications';

// Temporizador de descanso basado en timestamp de fin (`endsAt`): sobrevive a
// segundo plano y a reinicios de la app (el estado se persiste fuera).
// La notificación local cubre el caso de pantalla bloqueada; con la app en
// primer plano se vibra y se cancela la notificación para evitar un aviso
// duplicado (o tardío si Android la programó como inexacta).
export function useRestTimer() {
  const [rest, setRestState] = useState(null); // { endsAt, label, notifId }
  const [now, setNow] = useState(() => Date.now());
  const ref = useRef(null);

  const set = useCallback((r) => {
    ref.current = r;
    setRestState(r);
  }, []);

  const schedule = useCallback(
    async (r) => {
      const id = await scheduleRestDone((r.endsAt - Date.now()) / 1000, r.label);
      // Si mientras tanto se paró o cambió el descanso, esta notificación sobra.
      if (ref.current && ref.current.endsAt === r.endsAt) set({ ...ref.current, notifId: id });
      else cancelRest(id);
    },
    [set],
  );

  const start = useCallback(
    (secs, label = 'Descanso') => {
      cancelRest(ref.current?.notifId);
      const r = { endsAt: Date.now() + secs * 1000, label, notifId: null };
      set(r);
      setNow(Date.now());
      schedule(r);
    },
    [set, schedule],
  );

  const add = useCallback(
    (secs) => {
      const cur = ref.current;
      if (!cur) return;
      cancelRest(cur.notifId);
      const r = { ...cur, endsAt: cur.endsAt + secs * 1000, notifId: null };
      set(r);
      schedule(r);
    },
    [set, schedule],
  );

  const stop = useCallback(() => {
    cancelRest(ref.current?.notifId);
    set(null);
  }, [set]);

  // Restaura un descanso persistido. Si ya venció, la notificación ya saltó.
  const restore = useCallback((r) => set(r && r.endsAt > Date.now() ? r : null), [set]);

  const tick = useCallback(() => {
    const t = Date.now();
    setNow(t);
    const cur = ref.current;
    if (cur && t >= cur.endsAt) {
      if (AppState.currentState === 'active') {
        Vibration.vibrate([0, 400, 200, 400]);
        cancelRest(cur.notifId);
      }
      set(null);
    }
  }, [set]);

  useEffect(() => {
    if (!rest) return undefined;
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [rest, tick]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && tick());
    return () => sub.remove();
  }, [tick]);

  const remaining = rest ? Math.max(0, Math.ceil((rest.endsAt - now) / 1000)) : 0;
  return { rest, remaining, start, add, stop, restore };
}
