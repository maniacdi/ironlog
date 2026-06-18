import { StyleSheet } from 'react-native';

export const C = {
  bg: '#0E0F12',
  surface: '#16181D',
  surface2: '#1E2128',
  line: '#2A2E37',
  text: '#ECEDEF',
  muted: '#8A8F9A',
  accent: '#FF5A1F',
  positive: '#3DD68C',
  blue: '#5B9BD5',
  negative: '#E5484D',
  skipped: '#6B5E3A',
};

export const S = StyleSheet.create({
  // Layout
  row: { flexDirection: 'row', alignItems: 'center' },
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Cards — más sutiles, sin borde tan marcado
  card: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  // Tipografía
  title: {
    color: C.text,
    fontSize: 24,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  disp: {
    color: C.text,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sub: { color: C.muted, fontSize: 13 },
  label: {
    color: C.muted,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '700',
    marginBottom: 6,
  },
  // Botones
  btn: {
    backgroundColor: C.accent,
    borderRadius: 11,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnGhost: { backgroundColor: C.surface2 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnTextGhost: { color: C.text, fontWeight: '700', fontSize: 14 },
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
    padding: 14,
    flex: 1,
    alignItems: 'center',
  },
  bignum: { color: C.text, fontSize: 30, fontWeight: '800' },
  // Pills
  pillBtn: {
    backgroundColor: C.surface2,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  pillBtnOn: { backgroundColor: C.accent },
  pillText: { color: C.muted, fontSize: 13, fontWeight: '600' },
  pillTextOn: { color: '#fff', fontSize: 13, fontWeight: '600' },
  link: { color: C.accent, fontWeight: '700', fontSize: 13 },
});
