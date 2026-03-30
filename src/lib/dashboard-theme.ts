// ── Shared light-theme design tokens for student dashboard ────────────────────
// Import this in any dashboard page/component that needs theming.

export const T = {
  // Backgrounds
  bg:          '#eef3fb',   // page background
  surface:     '#ffffff',   // cards
  surfaceAlt:  '#f8faff',   // subtle card variant
  surfaceHov:  '#f0f6ff',   // hover state on rows

  // Borders
  border:      '#dce6f5',
  borderLight: '#e8f0fc',

  // Brand colors
  navy:        '#0f1f3d',   // darkest — page headings
  navyMid:     '#1a3a6b',   // mid navy
  blue:        '#2563eb',   // primary blue — links, active
  blueMid:     '#1d4ed8',
  blueLight:   '#eff6ff',   // very light blue bg
  bluePale:    '#dbeafe',   // light blue border/badge

  // Text
  textPrimary: '#0f1f3d',   // main body text
  textSec:     '#475569',   // secondary labels
  textMuted:   '#94a3b8',   // placeholders, hints

  // Semantic
  green:        '#16a34a',
  greenBg:      '#f0fdf4',
  greenBorder:  '#bbf7d0',
  amber:        '#d97706',
  amberDark:    '#b45309',
  amberBg:      '#fffbeb',
  amberBorder:  '#fde68a',
  red:          '#dc2626',
  redBg:        '#fef2f2',
  redBorder:    '#fecaca',
  purple:       '#7c3aed',
  purpleBg:     '#f5f3ff',
  purpleBorder: '#ddd6fe',
  indigo:       '#4f46e5',
  indigoBg:     '#eef2ff',
  indigoBorder: '#c7d2fe',
}

// Input class for forms (light theme)
export const lightInp = [
  'w-full',
  'bg-white border border-[#dce6f5] rounded-xl',
  'px-3 py-2.5 text-sm',
  'text-[#0f1f3d] placeholder-[#94a3b8]',
  'focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-100',
  'transition-colors',
].join(' ')

// Label class for forms (light theme)
export const lightLabel = 'text-xs font-semibold text-[#475569] uppercase tracking-wide block mb-1.5'

// Section card wrapper props
export const sectionCard = {
  className: 'rounded-2xl bg-white overflow-hidden',
  style:     { border: '1px solid #dce6f5' },
}
