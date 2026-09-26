export const LB_PER_KG = 2.20462;

const round1 = (n) => Math.round(n * 10) / 10;

export function conversionFactor(from, to) {
  if (from === to) return 1;
  return from === 'kg' ? LB_PER_KG : 1 / LB_PER_KG;
}

const convSets = (sets, f) =>
  (sets || []).map((s) =>
    typeof s.weight === 'number' ? { ...s, weight: round1(s.weight * f) } : s,
  );

// Convierte TODOS los pesos guardados (rutinas, historial) a la nueva unidad.
export function convertDataUnits(data, to) {
  const f = conversionFactor(data.settings.unit, to);
  if (f === 1) return data;
  return {
    ...data,
    settings: { ...data.settings, unit: to },
    routines: data.routines.map((r) => ({
      ...r,
      days: r.days.map((d) => ({
        ...d,
        exercises: d.exercises.map((e) =>
          typeof e.weight === 'number' ? { ...e, weight: round1(e.weight * f) } : e,
        ),
      })),
    })),
    logs: data.logs.map((l) => ({
      ...l,
      entries: l.entries.map((e) => ({ ...e, sets: convSets(e.sets, f) })),
    })),
  };
}

export function convertSessionUnits(session, from, to) {
  const f = conversionFactor(from, to);
  if (!session || f === 1) return session;
  return {
    ...session,
    entries: session.entries.map((e) => ({
      ...e,
      prevBest: e.prevBest * f,
      ref:
        e.ref && typeof e.ref.weight === 'number'
          ? { ...e.ref, weight: round1(e.ref.weight * f) }
          : e.ref,
      sets: convSets(e.sets, f),
    })),
  };
}
