export const uid = () => Math.random().toString(36).slice(2, 10);
export const clone = (x) => JSON.parse(JSON.stringify(x));
export const e1rm = (w, r) => (w > 0 ? w * (1 + r / 30) : 0);
export const norm = (s) => (s || '').trim().toLowerCase();
export const firstInt = (s, def = 10) => {
  const m = String(s ?? '').match(/\d+/);
  return m ? +m[0] : def;
};

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const MONTHS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];
const MONTHS_LONG = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];
const WEEKDAYS = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];

export const fmtDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]}`;
};
export const fmtDateLong = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${WEEKDAYS[dt.getDay()]}, ${d} de ${MONTHS_LONG[m - 1]}`;
};
export const mmss = (s) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
export const groupNum = (n) =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
export const daysAgo = (iso) => {
  const t = todayISO().split('-').map(Number);
  const a = iso.split('-').map(Number);
  return Math.round(
    (Date.UTC(t[0], t[1] - 1, t[2]) - Date.UTC(a[0], a[1] - 1, a[2])) /
      86400000,
  );
};

export const exName = (data, id) =>
  data.exercises.find((e) => e.id === id)?.name || 'Ejercicio';
export const exMuscle = (data, id) =>
  data.exercises.find((e) => e.id === id)?.muscle || '';

export const MUSCLES = [
  'Pecho',
  'Espalda',
  'Hombro',
  'Bíceps',
  'Tríceps',
  'Cuádriceps',
  'Femoral',
  'Glúteo',
  'Gemelo',
  'Abdomen',
  'Trapecio',
  'Antebrazo',
  'Cardio',
  'Otro',
];
export const FEELINGS = ['Suave', 'Bien', 'Duro', 'Al fallo'];

export function parseCSV(text) {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length);
  if (!lines.length) return [];
  const parseLine = (line) => {
    const out = [];
    let cur = '';
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            cur += '"';
            i++;
          } else q = false;
        } else cur += ch;
      } else {
        if (ch === '"') q = true;
        else if (ch === ',') {
          out.push(cur);
          cur = '';
        } else cur += ch;
      }
    }
    out.push(cur);
    return out;
  };
  const headers = parseLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((l) => {
    const cells = parseLine(l);
    const o = {};
    headers.forEach((h, i) => (o[h] = (cells[i] ?? '').trim()));
    return o;
  });
}
export function toCSV(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = (v) => {
    v = v == null ? '' : String(v);
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  };
  return [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => esc(r[h])).join(',')),
  ].join('\n');
}

// ── Exportar sesiones para IA ──────────────────────────────────────────────
export function sessionToMarkdown(log, data) {
  const lines = [];
  lines.push(`# Sesión: ${log.dayName}`);
  lines.push(`**Fecha:** ${fmtDateLong(log.date)}`);
  if (log.durationMin) lines.push(`**Duración:** ${log.durationMin} min`);
  if (log.feeling) lines.push(`**Sensación:** ${log.feeling}`);
  if (log.note) lines.push(`**Nota:** ${log.note}`);
  lines.push('');

  log.entries.forEach((e) => {
    const name = exName(data, e.exerciseId);
    const muscle = exMuscle(data, e.exerciseId);
    const doneSets = e.sets.filter((s) => s.done !== false && !s.skipped);
    const skippedSets = e.sets.filter((s) => s.skipped);

    if (e.skipped) {
      lines.push(`## ~~${name}~~ *(saltado)*`);
    } else {
      lines.push(`## ${name} — ${muscle}`);
      if (e.note) lines.push(`*${e.note}*`);
      if (doneSets.length) {
        lines.push('| Serie | Reps | Peso |');
        lines.push('|-------|------|------|');
        doneSets.forEach((s, i) =>
          lines.push(`| ${i + 1} | ${s.reps} | ${s.weight} |`),
        );
      }
      if (skippedSets.length)
        lines.push(`*(${skippedSets.length} serie(s) saltada(s))*`);
    }
    lines.push('');
  });
  return lines.join('\n');
}

export function sessionsToJSON(logs, data) {
  return logs.map((log) => ({
    fecha: log.date,
    dia: log.dayName,
    sensacion: log.feeling || null,
    nota: log.note || null,
    duracion_min: log.durationMin || null,
    ejercicios: log.entries.map((e) => ({
      nombre: exName(data, e.exerciseId),
      musculo: exMuscle(data, e.exerciseId),
      saltado: e.skipped || false,
      nota: e.note || null,
      series: e.sets.map((s) => ({
        reps: s.reps,
        peso: s.weight,
        completada: s.done !== false && !s.skipped,
        saltada: s.skipped || false,
      })),
    })),
  }));
}
