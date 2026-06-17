import React, { useState } from "react";
import { View } from "react-native";
import Svg, { Rect, Line, Polyline, Circle, Text as SvgText } from "react-native-svg";
import { C } from "../theme";

export function BarChart({ data, height = 120 }) {
  const [w, setW] = useState(0);
  const pad = { l: 22, r: 8, t: 8, b: 18 };
  const innerW = Math.max(0, w - pad.l - pad.r), innerH = height - pad.t - pad.b;
  const max = Math.max(1, ...data.map((d) => d.value));
  const bw = data.length ? innerW / data.length : 0;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height }}>
      {w > 0 && (
        <Svg width={w} height={height}>
          {[0, 0.5, 1].map((g, i) => {
            const y = pad.t + innerH * (1 - g);
            return <Line key={i} x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke={C.line} strokeDasharray="3 3" />;
          })}
          {data.map((d, i) => {
            const bh = innerH * (d.value / max);
            const x = pad.l + bw * i + bw * 0.2;
            const y = pad.t + innerH - bh;
            return (
              <React.Fragment key={i}>
                <Rect x={x} y={y} width={bw * 0.6} height={Math.max(0, bh)} rx={3} fill={C.accent} />
                <SvgText x={pad.l + bw * i + bw * 0.5} y={height - 5} fill={C.muted} fontSize="10" textAnchor="middle">{d.name}</SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      )}
    </View>
  );
}

export function LineChart({ data, series, height = 190 }) {
  const [w, setW] = useState(0);
  const pad = { l: 30, r: 10, t: 10, b: 18 };
  const innerW = Math.max(0, w - pad.l - pad.r), innerH = height - pad.t - pad.b;
  const vals = [];
  data.forEach((d) => series.forEach((s) => { const v = d[s.key]; if (typeof v === "number") vals.push(v); }));
  let min = Math.min(...vals), max = Math.max(...vals);
  if (!isFinite(min)) { min = 0; max = 1; }
  if (min === max) { min -= 1; max += 1; }
  const n = data.length;
  const X = (i) => (n <= 1 ? pad.l + innerW / 2 : pad.l + innerW * (i / (n - 1)));
  const Y = (v) => pad.t + innerH * (1 - (v - min) / (max - min));
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height }}>
      {w > 0 && (
        <Svg width={w} height={height}>
          {[0, 0.5, 1].map((g, i) => {
            const val = min + (max - min) * g; const y = Y(val);
            return (
              <React.Fragment key={i}>
                <Line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke={C.line} strokeDasharray="3 3" />
                <SvgText x={2} y={y + 3} fill={C.muted} fontSize="9">{Math.round(val)}</SvgText>
              </React.Fragment>
            );
          })}
          {series.map((s, si) => (
            <Polyline key={si} points={data.map((d, i) => `${X(i)},${Y(d[s.key])}`).join(" ")}
              fill="none" stroke={s.color} strokeWidth={s.width || 2.5} strokeDasharray={s.dashed ? "4 3" : undefined} />
          ))}
          {series.filter((s) => s.dots).map((s, si) =>
            data.map((d, i) => <Circle key={`${si}-${i}`} cx={X(i)} cy={Y(d[s.key])} r={3} fill={s.color} />)
          )}
          {data.map((d, i) => (i === 0 || i === n - 1 || n <= 4)
            ? <SvgText key={`x${i}`} x={X(i)} y={height - 4} fill={C.muted} fontSize="9" textAnchor="middle">{d.label}</SvgText>
            : null)}
        </Svg>
      )}
    </View>
  );
}
