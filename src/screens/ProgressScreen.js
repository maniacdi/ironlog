import React, { useState } from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { Icon } from "../components/Icon";
import { BarChart, LineChart } from "../components/Charts";
import { C, S } from "../theme";
import { e1rm, fmtDate, daysAgo, todayISO, exName, exMuscle, groupNum } from "../helpers";

export default function ProgressScreen({ data, unit }) {
  const exIds = [];
  const seen = new Set();
  data.logs.forEach((l) => l.entries.forEach((e) => { if (!seen.has(e.exerciseId)) { seen.add(e.exerciseId); exIds.push(e.exerciseId); } }));
  const [sel, setSel] = useState(exIds[0] || "");

  if (!data.logs.length)
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 30 }}>
        <Icon name="trending-up" size={48} color={C.muted} />
        <Text style={[S.sub, { textAlign: "center", marginTop: 12 }]}>Registra algún entrenamiento y verás aquí tu progreso.</Text>
      </View>
    );

  const totalSessions = data.logs.length;
  const totalVolume = Math.round(data.logs.reduce((a, l) => a + l.entries.reduce((x, e) => x + e.sets.reduce((y, s) => y + (s.weight || 0) * (s.reps || 0), 0), 0), 0));

  const weekMap = {};
  data.logs.forEach((l) => {
    const d = new Date(l.date + "T00:00:00");
    const onejan = new Date(d.getFullYear(), 0, 1);
    const wk = Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7);
    const key = `${d.getFullYear()}-${String(wk).padStart(2, "0")}`;
    weekMap[key] = (weekMap[key] || 0) + 1;
  });
  const freq = Object.keys(weekMap).sort().slice(-8).map((k) => ({ name: "S" + k.split("-")[1], value: weekMap[k] }));
  const avgPerWeek = (totalSessions / Math.max(1, Object.keys(weekMap).length)).toFixed(1);
  const last7 = data.logs.filter((l) => daysAgo(l.date) >= 0 && daysAgo(l.date) < 7).length;
  const prev7 = data.logs.filter((l) => daysAgo(l.date) >= 7 && daysAgo(l.date) < 14).length;

  const durLogs = [...data.logs].filter((l) => l.durationMin).sort((a, b) => a.date.localeCompare(b.date));
  const durData = durLogs.slice(-10).map((l) => ({ label: fmtDate(l.date), min: l.durationMin }));
  const avgDur = durLogs.length ? Math.round(durLogs.reduce((a, l) => a + l.durationMin, 0) / durLogs.length) : null;

  const exSummary = exIds.map((idx) => {
    const tops = data.logs.filter((l) => l.entries.some((e) => e.exerciseId === idx)).sort((a, b) => a.date.localeCompare(b.date))
      .map((l) => Math.max(0, ...l.entries.find((e) => e.exerciseId === idx).sets.map((s) => s.weight || 0)));
    const n = tops.length, now = tops[n - 1], first = tops[0];
    const prevBest = n > 1 ? Math.max(...tops.slice(0, -1)) : null;
    let trend = "nuevo";
    if (n > 1) trend = now > prevBest + 0.01 ? "sube" : now < prevBest - 0.01 ? "baja" : "estable";
    return { id: idx, now, delta: +(now - first).toFixed(1), trend, n };
  });
  const tracked = exSummary.filter((e) => e.n > 1);
  const up = tracked.filter((e) => e.trend === "sube").length;
  const down = tracked.filter((e) => e.trend === "baja").length;

  let status, statusColor, reasons = [];
  if (!tracked.length) {
    status = "Empezando"; statusColor = C.muted;
    reasons = ["Necesitas un par de sesiones por ejercicio para valorar la tendencia."];
  } else {
    reasons.push(`${up}/${tracked.length} ejercicios progresando${down ? `, ${down} a la baja` : ""}.`);
    reasons.push(last7 >= prev7 ? `Frecuencia ${prev7 ? "estable o al alza" : "arrancando"}: ${last7} entreno(s) esta semana.` : `Frecuencia a la baja: ${last7} esta semana frente a ${prev7} la anterior.`);
    if (up - down > 0 && last7 >= prev7) { status = "Progresando"; statusColor = C.positive; }
    else if (down > up || (prev7 >= 2 && last7 < prev7 * 0.6)) { status = "Atención"; statusColor = C.accent; }
    else { status = "Estable"; statusColor = C.blue; }
  }

  const exData = data.logs.filter((l) => l.entries.some((e) => e.exerciseId === sel)).sort((a, b) => a.date.localeCompare(b.date)).map((l) => {
    const e = l.entries.find((x) => x.exerciseId === sel);
    return { label: fmtDate(l.date), peso: Math.max(0, ...e.sets.map((s) => s.weight || 0)), e1rm: Math.round(Math.max(0, ...e.sets.map((s) => e1rm(s.weight, s.reps)))) };
  });

  const musVol = {};
  data.logs.filter((l) => daysAgo(l.date) < 14).forEach((l) => l.entries.forEach((e) => {
    const m = exMuscle(data, e.exerciseId) || "Otro";
    musVol[m] = (musVol[m] || 0) + e.sets.reduce((x, s) => x + (s.weight || 0) * (s.reps || 0), 0);
  }));
  const musArr = Object.entries(musVol).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const maxMus = Math.max(1, ...musArr.map(([, v]) => v));

  // Series efectivas por músculo esta semana (métrica clásica de hipertrofia)
  const setsMus = {};
  data.logs.filter((l) => daysAgo(l.date) < 7).forEach((l) => l.entries.forEach((e) => {
    if (e.skipped) return;
    const m = exMuscle(data, e.exerciseId) || "Otro";
    const done = e.sets.filter((s) => s.done && !s.skipped).length;
    if (done) setsMus[m] = (setsMus[m] || 0) + done;
  }));
  const setsArr = Object.entries(setsMus).sort((a, b) => b[1] - a[1]);
  const setsColor = (v) => (v < 10 ? C.blue : v <= 20 ? C.positive : C.accent);
  const setsTag = (v) => (v < 10 ? "bajo" : v <= 20 ? "óptimo" : "alto");

  const trendColor = (t) => (t === "sube" ? C.positive : t === "baja" ? C.negative : t === "estable" ? C.blue : C.muted);
  const trendIcon = (t) => (t === "sube" ? "chevron-up" : t === "baja" ? "chevron-down" : "minus");

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <View style={[S.card, { borderLeftWidth: 3, borderLeftColor: statusColor }]}>
        <View style={S.between}>
          <Text style={S.label}>Valoración (últimas 2 semanas)</Text>
          <Text style={[S.disp, { color: statusColor }]}>{status}</Text>
        </View>
        {reasons.map((rr, i) => (
          <View key={i} style={[S.row, { gap: 6, marginTop: 6, alignItems: "flex-start" }]}>
            <Text style={{ color: C.muted }}>•</Text><Text style={{ color: C.muted, fontSize: 13, flex: 1 }}>{rr}</Text>
          </View>
        ))}
      </View>

      <View style={[S.row, { gap: 8, marginBottom: 12 }]}>
        <View style={S.stat}><Text style={S.bignum}>{totalSessions}</Text><Text style={S.sub}>sesiones</Text></View>
        <View style={S.stat}><Text style={S.bignum}>{avgPerWeek}</Text><Text style={S.sub}>/semana</Text></View>
        {avgDur != null && <View style={S.stat}><Text style={S.bignum}>{avgDur}'</Text><Text style={S.sub}>media</Text></View>}
        <View style={S.stat}><Text style={S.bignum}>{(totalVolume / 1000).toFixed(1)}k</Text><Text style={S.sub}>vol</Text></View>
      </View>

      <View style={S.card}>
        <Text style={S.label}>Frecuencia semanal</Text>
        <BarChart data={freq} height={120} />
      </View>

      {durData.length > 1 && (
        <View style={S.card}>
          <View style={[S.between, { marginBottom: 4 }]}><Text style={S.label}>Duración por entreno</Text><Text style={S.sub}>media {avgDur}'</Text></View>
          <LineChart data={durData} height={120} series={[{ key: "min", color: C.blue, dots: true }]} />
        </View>
      )}

      <View style={S.card}>
        <Text style={S.label}>Progreso de pesos</Text>
        {exSummary.map((e) => (
          <Pressable key={e.id} onPress={() => setSel(e.id)} style={[S.between, { paddingVertical: 9, paddingHorizontal: 8, borderRadius: 8, marginBottom: 2, backgroundColor: sel === e.id ? C.surface2 : "transparent" }]}>
            <Text style={{ color: C.text, fontWeight: sel === e.id ? "700" : "500", fontSize: 14, flex: 1 }}>{exName(data, e.id)}</Text>
            <View style={[S.row, { gap: 10 }]}>
              {e.delta !== 0 && <Text style={{ color: e.delta > 0 ? C.positive : C.negative, fontWeight: "700", fontSize: 12 }}>{e.delta > 0 ? "+" : ""}{e.delta}</Text>}
              <Text style={{ color: C.text, fontWeight: "800" }}>{e.now}{unit}</Text>
              <View style={[S.row, { gap: 2 }]}><Icon name={trendIcon(e.trend)} size={14} color={trendColor(e.trend)} /><Text style={{ color: trendColor(e.trend), fontSize: 12 }}>{e.trend}</Text></View>
            </View>
          </Pressable>
        ))}
        <View style={{ height: 1, backgroundColor: C.line, marginVertical: 14 }} />
        <Text style={[S.sub, { marginBottom: 8 }]}>{exName(data, sel)} · evolución</Text>
        <LineChart data={exData} height={190} series={[{ key: "peso", color: C.accent, width: 2.5, dots: true }, { key: "e1rm", color: C.blue, width: 2, dashed: true }]} />
        <Text style={[S.sub, { marginTop: 8, textAlign: "center" }]}>Naranja: peso máx. por sesión · azul: 1RM estimado (Epley)</Text>
      </View>

      {musArr.length > 0 && (
        <View style={S.card}>
          <Text style={S.label}>Volumen por músculo (últimos 14 días)</Text>
          {musArr.map(([m, v]) => (
            <View key={m} style={{ marginTop: 10 }}>
              <View style={[S.between, { marginBottom: 4 }]}><Text style={{ color: C.text, fontSize: 13 }}>{m}</Text><Text style={S.sub}>{groupNum(v)} {unit}</Text></View>
              <View style={{ height: 8, backgroundColor: C.surface2, borderRadius: 4, overflow: "hidden" }}>
                <View style={{ height: "100%", width: `${(v / maxMus) * 100}%`, backgroundColor: C.accent, borderRadius: 4 }} />
              </View>
            </View>
          ))}
          <Text style={[S.sub, { marginTop: 10 }]}>Solo cuenta ejercicios con carga; el trabajo a peso corporal no suma volumen.</Text>
        </View>
      )}

      {setsArr.length > 0 && (
        <View style={S.card}>
          <Text style={S.label}>Series por músculo (esta semana)</Text>
          {setsArr.map(([m, v]) => (
            <View key={m} style={{ marginTop: 10 }}>
              <View style={[S.between, { marginBottom: 4 }]}>
                <Text style={{ color: C.text, fontSize: 13 }}>{m}</Text>
                <View style={[S.row, { gap: 6 }]}>
                  <Text style={{ color: setsColor(v), fontWeight: "700", fontSize: 13 }}>{v} series</Text>
                  <Text style={[S.sub, { fontSize: 11, color: setsColor(v) }]}>{setsTag(v)}</Text>
                </View>
              </View>
              <View style={{ height: 8, backgroundColor: C.surface2, borderRadius: 4, overflow: "hidden" }}>
                <View style={{ height: "100%", width: `${Math.min(100, (v / 20) * 100)}%`, backgroundColor: setsColor(v), borderRadius: 4 }} />
              </View>
            </View>
          ))}
          <Text style={[S.sub, { marginTop: 10 }]}>Referencia habitual para hipertrofia: 10-20 series semanales por grupo. Cuenta solo series completadas.</Text>
        </View>
      )}
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}
