import { uid, norm } from "./helpers";

export function migrate(d) {
  const settings = { unit: "kg", restSeconds: 90, ...(d.settings || {}) };
  if (d.exercises) return { ...d, settings };
  const lib = [], byName = {};
  const ensure = (name, muscle) => {
    const k = norm(name);
    if (!k) return null;
    if (byName[k]) { if (muscle && byName[k].muscle === "Otro") byName[k].muscle = muscle; return byName[k].id; }
    const ex = { id: uid(), name: name.trim(), muscle: muscle || "Otro" };
    lib.push(ex); byName[k] = ex; return ex.id;
  };
  const routines = (d.routines || []).map((r) => ({
    id: r.id, name: r.name,
    days: r.days.map((day) => ({
      id: day.id, name: day.name,
      exercises: (day.exercises || []).map((e) => ({
        id: e.id || uid(), exerciseId: ensure(e.name, e.muscle),
        sets: e.sets, reps: e.reps, weight: e.weight, note: e.note || "",
        rest: e.rest ?? null, restAfter: e.restAfter ?? null, perSide: e.perSide || false,
      })),
    })),
  }));
  const logs = (d.logs || []).map((l) => ({ ...l, entries: l.entries.map((en) => ({ ...en, exerciseId: ensure(en.name, en.muscle) })) }));
  return { exercises: lib, routines, logs, settings };
}

export function seed() {
  const L = [
    ["Press banca", "Pecho"], ["Press inclinado mancuernas", "Pecho"], ["Aperturas", "Pecho"],
    ["Fondos", "Pecho"], ["Press banca mancuernas", "Pecho"],
    ["Dominadas", "Espalda"], ["Remo con barra", "Espalda"], ["Jalón al pecho", "Espalda"],
    ["Remo en polea", "Espalda"], ["Peso muerto", "Espalda"], ["Pull-over", "Espalda"],
    ["Press militar", "Hombro"], ["Elevaciones laterales", "Hombro"], ["Elevaciones frontales", "Hombro"],
    ["Face pull", "Hombro"], ["Pájaros", "Hombro"],
    ["Curl con barra", "Bíceps"], ["Curl mancuernas", "Bíceps"], ["Curl martillo", "Bíceps"], ["Curl predicador", "Bíceps"],
    ["Extensión en polea", "Tríceps"], ["Press francés", "Tríceps"], ["Fondos en banco", "Tríceps"], ["Patada de tríceps", "Tríceps"],
    ["Sentadilla", "Cuádriceps"], ["Prensa", "Cuádriceps"], ["Extensión de cuádriceps", "Cuádriceps"],
    ["Zancadas", "Cuádriceps"], ["Sentadilla búlgara", "Cuádriceps"],
    ["Peso muerto rumano", "Femoral"], ["Curl femoral", "Femoral"], ["Buenos días", "Femoral"],
    ["Hip thrust", "Glúteo"], ["Patada de glúteo", "Glúteo"],
    ["Gemelos de pie", "Gemelo"], ["Gemelos sentado", "Gemelo"],
    ["Plancha", "Abdomen"], ["Crunch", "Abdomen"], ["Elevación de piernas", "Abdomen"], ["Rueda abdominal", "Abdomen"],
    ["Encogimientos", "Trapecio"],
  ].map(([name, muscle]) => ({ id: uid(), name, muscle }));
  const id = (n) => L.find((e) => e.name === n).id;
  const it = (name, sets, reps, weight) => ({ id: uid(), exerciseId: id(name), sets, reps, weight, note: "", rest: null, restAfter: null, perSide: false });
  const ppl = {
    id: uid(), name: "Push Pull Legs",
    days: [
      { id: uid(), name: "Push", exercises: [it("Press banca", 4, 8, 60), it("Press militar", 4, 10, 30), it("Fondos", 3, 12, 0), it("Elevaciones laterales", 3, 15, 8)] },
      { id: uid(), name: "Pull", exercises: [it("Dominadas", 4, 8, 0), it("Remo con barra", 4, 10, 50), it("Curl con barra", 3, 12, 20), it("Face pull", 3, 15, 20)] },
      { id: uid(), name: "Legs", exercises: [it("Sentadilla", 4, 8, 80), it("Peso muerto rumano", 3, 10, 70), it("Prensa", 3, 12, 120), it("Gemelos de pie", 4, 15, 40)] },
    ],
  };
  const push = ppl.days[0];
  const bench = [55, 57.5, 57.5, 60, 60, 62.5];
  const logs = bench.map((bw, i) => {
    const dt = new Date(); dt.setDate(dt.getDate() - (bench.length - i) * 4);
    return {
      id: uid(), date: dt.toISOString().slice(0, 10), routineId: ppl.id, dayId: push.id, dayName: "Push",
      feeling: i < 2 ? "Bien" : "Duro", note: "", durationMin: 52 + (i % 3) * 6,
      entries: push.exercises.map((item) => ({
        exerciseId: item.exerciseId, note: "",
        sets: Array.from({ length: item.sets }, () => ({
          reps: item.reps,
          weight: item.exerciseId === id("Press banca") ? bw : item.exerciseId === id("Press militar") ? 25 + i * 1.25 : item.weight,
          done: true,
        })),
      })),
    };
  });
  return { exercises: L, routines: [ppl], logs, settings: { unit: "kg", restSeconds: 90 } };
}
