// Validación estructural mínima: lo justo para que la app pueda pintar sin
// romperse. Devuelve null si es válido o un mensaje con el primer problema.
const isObj = (x) => x != null && typeof x === 'object' && !Array.isArray(x);
const isStr = (x) => typeof x === 'string' && x.length > 0;

export function validateData(d) {
  if (!isObj(d)) return 'El archivo no contiene un objeto de datos.';
  if (!Array.isArray(d.exercises)) return 'Falta la lista de ejercicios.';
  if (!Array.isArray(d.routines)) return 'Falta la lista de rutinas.';
  if (!Array.isArray(d.logs)) return 'Falta el historial.';
  if (!isObj(d.settings)) return 'Faltan los ajustes.';

  for (const [i, e] of d.exercises.entries())
    if (!isObj(e) || !isStr(e.id) || typeof e.name !== 'string')
      return `Ejercicio ${i + 1} inválido.`;

  for (const [i, r] of d.routines.entries()) {
    if (!isObj(r) || !isStr(r.id) || !Array.isArray(r.days)) return `Rutina ${i + 1} inválida.`;
    for (const day of r.days)
      if (!isObj(day) || !isStr(day.id) || !Array.isArray(day.exercises))
        return `Día inválido en la rutina «${r.name}».`;
  }

  for (const [i, l] of d.logs.entries()) {
    if (!isObj(l) || !isStr(l.id) || !/^\d{4}-\d{2}-\d{2}$/.test(l.date || ''))
      return `Sesión ${i + 1} inválida.`;
    if (!Array.isArray(l.entries)) return `Sesión del ${l.date} sin ejercicios.`;
    for (const e of l.entries)
      if (!isObj(e) || !Array.isArray(e.sets))
        return `Ejercicio inválido en la sesión del ${l.date}.`;
  }
  return null;
}

// Validación de la forma v1 (sin biblioteca de ejercicios) antes de migrar.
export function validateLegacy(d) {
  if (!isObj(d)) return 'Formato no reconocido.';
  if (d.routines != null && !Array.isArray(d.routines)) return 'Rutinas con formato inválido.';
  if (d.logs != null && !Array.isArray(d.logs)) return 'Historial con formato inválido.';
  for (const r of d.routines || [])
    if (!isObj(r) || !Array.isArray(r.days)) return 'Rutina con formato inválido.';
  for (const l of d.logs || [])
    if (!isObj(l) || !Array.isArray(l.entries)) return 'Sesión con formato inválido.';
  return null;
}
