import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

// Guarda `value` con debounce y fuerza el guardado pendiente en cuanto la app
// pasa a segundo plano (Android puede matar el proceso sin más aviso).
export function usePersist(value, save, { delay = 300, enabled = true, onError } = {}) {
  const pending = useRef(null);
  const timer = useRef(null);
  const saveRef = useRef(save);
  const errRef = useRef(onError);
  saveRef.current = save;
  errRef.current = onError;

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    timer.current = null;
    if (!pending.current) return;
    const { v } = pending.current;
    pending.current = null;
    try {
      await saveRef.current(v);
    } catch (e) {
      errRef.current?.(e);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    pending.current = { v: value };
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, delay);
  }, [value, enabled, delay, flush]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s !== 'active' && flush());
    return () => {
      sub.remove();
      flush();
    };
  }, [flush]);
}
