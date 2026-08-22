// Palettes for the two timer visuals. Every colour the timer paints comes from
// here so a mode can flip the whole screen (Dial runs on paper, Halo on ink)
// without any component holding a hard-coded value.

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
    work: {
      bg: '#f2f0e9',
      digits: '#1b1c19',
      colon: 'rgba(27,28,25,0.3)',
      label: '#8a8779',
      accent: '#c9331c',
      tickOn: '#2b2c29',
      tickOff: '#d6d2c7',
      ghost: 'rgba(27,28,25,0.13)',
      dotPast: '#cec9ba',
      dotNow: '#c9331c',
      dotNext: '#e2ded2',
      ctlBorder: 'rgba(201,51,28,0.55)',
      ctlBg: 'rgba(201,51,28,0.08)',
      ctlText: '#a32a17',
      icon: 'rgba(27,28,25,0.75)',
    },
    break: {
      bg: '#eaf1ef',
      digits: '#12211f',
      colon: 'rgba(18,33,31,0.3)',
      label: '#7c8c88',
      accent: '#0e7c74',
      tickOn: '#24312e',
      tickOff: '#cbd8d4',
      ghost: 'rgba(18,33,31,0.13)',
      dotPast: '#bccfca',
      dotNow: '#0e7c74',
      dotNext: '#d7e3df',
      ctlBorder: 'rgba(14,124,116,0.55)',
      ctlBg: 'rgba(14,124,116,0.08)',
      ctlText: '#0b6259',
      icon: 'rgba(18,33,31,0.75)',
    },
  },
}

export function getTheme(visual, phase) {
  const set = THEMES[visual] || THEMES.halo
  return set[phase] || set.work
}
