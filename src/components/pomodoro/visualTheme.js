// Palettes for the two timer visuals. Every colour the timer paints comes from
// here, so a view owns its whole screen without any component holding a
// hard-coded value. Both run on ink; Dial takes a hotter accent than Halo so
// the two still feel like different instruments.

export const VISUALS = [
  { id: 'halo', label: 'Halo' },
  { id: 'dial', label: 'Dial' },
]

const THEMES = {
  halo: {
    work: {
      bg: '#0a0a18',
      digits: '#f6f2ea',
      colon: 'rgba(246,242,234,0.28)',
      label: 'rgba(245,158,11,0.45)',
      accent: '#ffd9a0',
      track: 'rgba(255,255,255,0.06)',
      ghost: 'rgba(255,255,255,0.09)',
      dotPast: 'rgba(245,158,11,0.45)',
      dotNow: '#f59e0b',
      dotNext: 'rgba(255,255,255,0.12)',
      ctlBorder: 'rgba(245,158,11,0.5)',
      ctlBg: 'rgba(245,158,11,0.1)',
      ctlText: '#fcd34d',
      icon: 'rgba(255,255,255,0.85)',
    },
    break: {
      bg: '#07141a',
      digits: '#d6f5ee',
      colon: 'rgba(214,245,238,0.28)',
      label: 'rgba(45,212,191,0.45)',
      accent: '#9ee8dc',
      track: 'rgba(255,255,255,0.06)',
      ghost: 'rgba(255,255,255,0.09)',
      dotPast: 'rgba(45,212,191,0.4)',
      dotNow: '#2dd4bf',
      dotNext: 'rgba(255,255,255,0.12)',
      ctlBorder: 'rgba(45,212,191,0.5)',
      ctlBg: 'rgba(45,212,191,0.1)',
      ctlText: '#5eead4',
      icon: 'rgba(255,255,255,0.85)',
    },
  },
  dial: {
    // Ticks read as remaining rather than spent: the ones still to come stay
    // lit, the spent ones drop back to a faint trace of themselves.
    work: {
      bg: '#0a0a18',
      digits: '#f6f2ea',
      colon: 'rgba(246,242,234,0.28)',
      label: 'rgba(240,86,58,0.5)',
      accent: '#f0563a',
      tickOn: 'rgba(246,242,234,0.82)',
      tickOff: 'rgba(246,242,234,0.1)',
      ghost: 'rgba(255,255,255,0.09)',
      dotPast: 'rgba(240,86,58,0.4)',
      dotNow: '#f0563a',
      dotNext: 'rgba(255,255,255,0.12)',
      ctlBorder: 'rgba(240,86,58,0.5)',
      ctlBg: 'rgba(240,86,58,0.1)',
      ctlText: '#ff8b73',
      icon: 'rgba(255,255,255,0.85)',
    },
    break: {
      bg: '#07141a',
      digits: '#d6f5ee',
      colon: 'rgba(214,245,238,0.28)',
      label: 'rgba(45,212,191,0.5)',
      accent: '#2dd4bf',
      tickOn: 'rgba(214,245,238,0.78)',
      tickOff: 'rgba(214,245,238,0.1)',
      ghost: 'rgba(255,255,255,0.09)',
      dotPast: 'rgba(45,212,191,0.4)',
      dotNow: '#2dd4bf',
      dotNext: 'rgba(255,255,255,0.12)',
      ctlBorder: 'rgba(45,212,191,0.5)',
      ctlBg: 'rgba(45,212,191,0.1)',
      ctlText: '#5eead4',
      icon: 'rgba(255,255,255,0.85)',
    },
  },
}

export function getTheme(visual, phase) {
  const set = THEMES[visual] || THEMES.halo
  return set[phase] || set.work
}
