/**
 * Theme-aware colour references for brand SVG.
 * Every value is a CSS variable from globals.css with the dark ("Night Expedition")
 * value as fallback, so artwork renders correctly even outside the app shell.
 */
export const C = {
  bg: 'var(--bg, #0B0B10)',
  elev: 'var(--bg-elev, #13131B)',
  sunken: 'var(--bg-sunken, #08080C)',
  surface: 'var(--surface, #191923)',
  line: 'var(--border, rgba(255,255,255,.08))',
  lineStrong: 'var(--border-strong, rgba(255,255,255,.16))',
  fg: 'var(--fg, #F4F1EA)',
  muted: 'var(--fg-muted, #A09DAA)',
  subtle: 'var(--fg-subtle, #6B6878)',
  topo: 'var(--topo, rgba(244,241,234,.09))',
  topoStrong: 'var(--topo-strong, rgba(244,241,234,.18))',
  signal: 'var(--signal, #E8FF59)',
  signalFg: 'var(--signal-fg, #0B0B10)',
  ember: 'var(--ember, #FF6B3D)',
  aurora: 'var(--aurora, #9B7BFF)',
  glacier: 'var(--glacier, #7CE7FF)',
  moss: 'var(--moss, #4ADE80)',
  danger: 'var(--danger, #FF4D6D)',
} as const;

export type Tone = 'signal' | 'ember' | 'aurora' | 'glacier' | 'moss' | 'danger';

export const TONE: Record<Tone, string> = {
  signal: C.signal,
  ember: C.ember,
  aurora: C.aurora,
  glacier: C.glacier,
  moss: C.moss,
  danger: C.danger,
};

/** Motion language from SPEC §1. */
export const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const;

/** Resolved palettes – used to bake static SVG/PNG files. */
export const PALETTE = {
  dark: {
    bg: '#0B0B10',
    'bg-elev': '#13131B',
    'bg-sunken': '#08080C',
    surface: '#191923',
    border: 'rgba(255,255,255,.08)',
    'border-strong': 'rgba(255,255,255,.16)',
    fg: '#F4F1EA',
    'fg-muted': '#A09DAA',
    'fg-subtle': '#6B6878',
    topo: 'rgba(244,241,234,.09)',
    'topo-strong': 'rgba(244,241,234,.18)',
    signal: '#E8FF59',
    'signal-fg': '#0B0B10',
    ember: '#FF6B3D',
    aurora: '#9B7BFF',
    glacier: '#7CE7FF',
    moss: '#4ADE80',
    danger: '#FF4D6D',
  },
  light: {
    bg: '#F3EEE3',
    'bg-elev': '#FBF8F1',
    'bg-sunken': '#EBE5D7',
    surface: '#FFFFFF',
    border: 'rgba(20,19,26,.1)',
    'border-strong': 'rgba(20,19,26,.2)',
    fg: '#14131A',
    'fg-muted': '#5D5A66',
    'fg-subtle': '#8A8694',
    topo: 'rgba(20,19,26,.1)',
    'topo-strong': 'rgba(20,19,26,.2)',
    signal: '#1A1A22',
    'signal-fg': '#E8FF59',
    ember: '#E8542A',
    aurora: '#6B4BFF',
    glacier: '#0A8FB5',
    moss: '#15803D',
    danger: '#D7263D',
  },
} as const;
