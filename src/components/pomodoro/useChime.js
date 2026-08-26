import { useRef, useCallback } from 'react'

const SOUND_KEY = 'pomodoro-sound'

export function readSoundOn() {
  try { return localStorage.getItem(SOUND_KEY) !== 'off' } catch { return true }
}

export function storeSoundOn(on) {
  try { localStorage.setItem(SOUND_KEY, on ? 'on' : 'off') } catch { /* nothing to do */ }
}

// Bell-ish tone: a sine fundamental with a quieter octave above it, and a
// quick attack into a long exponential decay.
function ring(ctx, freq, at, duration) {
  const gain = ctx.createGain()
  gain.connect(ctx.destination)
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(0.28, at + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration)

  for (const [ratio, level] of [[1, 1], [2, 0.32], [3, 0.12]]) {
    const osc = ctx.createOscillator()
    const partial = ctx.createGain()
    partial.gain.value = level
    osc.type = 'sine'
    osc.frequency.value = freq * ratio
    osc.connect(partial)
    partial.connect(gain)
    osc.start(at)
    osc.stop(at + duration + 0.05)
  }
}

// Descending to mark a block closing, ascending to call you back from a break.
const PATTERNS = {
  end:    [880.0, 698.46, 587.33],
  resume: [587.33, 698.46, 880.0],
}

/**
 * A chime synthesised on the fly — no audio file to ship or cache.
 *
 * iOS will not let a page make sound until a user gesture has started an
 * AudioContext, so `unlock` is called from the play button. Once unlocked the
 * context stays alive, which is what lets an auto-started next block still
 * chime without another tap.
 */
export default function useChime() {
  const ctxRef = useRef(null)

  const unlock = useCallback(() => {
    try {
      if (!ctxRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext
        if (!Ctx) return
        ctxRef.current = new Ctx()
      }
      if (ctxRef.current.state === 'suspended') ctxRef.current.resume()
    } catch { /* audio unavailable; the timer still works */ }
  }, [])

  const play = useCallback((pattern = 'end') => {
    const ctx = ctxRef.current
    if (!ctx) return
    try {
      if (ctx.state === 'suspended') ctx.resume()
      const notes = PATTERNS[pattern] || PATTERNS.end
      const t0 = ctx.currentTime + 0.02
      notes.forEach((freq, i) => ring(ctx, freq, t0 + i * 0.17, 1.1))
    } catch { /* never let a missing chime break the timer */ }
  }, [])

  return { unlock, play }
}
