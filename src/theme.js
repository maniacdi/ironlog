import { Platform, StyleSheet } from 'react-native';

export const C = {
  bg: '#0B0C0E',
  surface: '#131518',
  surface2: '#1B1E23',
  line: '#24282F',
  text: '#F3F4F6',
  muted: '#767C86',
  accent: '#FF5A1F',
  positive: '#34D399',
  blue: '#5B9BD5',
  negative: '#F0413F',
  skipped: '#6B5E3A',
};

// Fuente monoespaciada: los números se leen como un display de gimnasio.
export const MONO = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export const S = StyleSheet.create({
  // Layout
  row: { flexDirection: 'row', alignItems: 'center' },
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Cards — borde hairline para bordes definidos, sin relleno pesado
  card: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    padding: 15,
    marginBottom: 10,
  },
  // Tipografía
  title: {
    color: C.text,
    fontSize: 23,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  disp: {
    color: C.text,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sub: { color: C.muted, fontSize: 13, letterSpacing: 0.2 },
  label: {
    color: C.muted,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '700',
    marginBottom: 8,
  },
  // Botones
  btn: {
    backgroundColor: C.accent,
    borderRadius: 11,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: C.line,
  },
  btnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  btnTextGhost: {
    color: C.text,
    fontWeight: '800',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Inputs
  input: {
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.line,
    color: C.text,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  iconBtn: {
    backgroundColor: C.surface2,
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Chips
  chip: {
    backgroundColor: 'transparent',
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  chipText: { color: C.muted, fontSize: 12 },
  // Stats
  stat: {
    backgroundColor: C.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flex: 1,
    alignItems: 'center',
  },
  // Números tipo instrumento: monoespaciada + dígitos tabulares
  bignum: {
    color: C.text,
    fontSize: 30,
    fontWeight: '800',
    fontFamily: MONO,
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  // Pills
  pillBtn: {
    backgroundColor: C.surface2,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  pillBtnOn: { backgroundColor: C.accent },
  pillText: { color: C.muted, fontSize: 13, fontWeight: '600' },
  pillTextOn: { color: '#fff', fontSize: 13, fontWeight: '700' },
  link: { color: C.accent, fontWeight: '700', fontSize: 13 },
});
