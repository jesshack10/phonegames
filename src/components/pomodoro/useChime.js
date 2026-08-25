import { useRef, useCallback } from 'react'

const SOUND_KEY = 'pomodoro-sound'

export function readSoundOn() {
  try { return localStorage.getItem(SOUND_KEY) !== 'off' } catch { return true }
}

export function storeSoundOn(on) {
  try { localStorage.setItem(SOUND_KEY, on ? 'on' : 'off') } catch { /* nothing to do */ }
}

// Bell-ish tone: a sine fundamental with quieter partials above it, and a
// quick attack into a long exponential decay. Returns its oscillators so a
// chime scheduled for later can still be called off.
function ring(ctx, freq, at, duration) {
  const gain = ctx.createGain()
  gain.connect(ctx.destination)
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(0.28, at + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration)

  const oscs = []
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
    oscs.push(osc)
  }
  return oscs
}

// Descending to mark a block closing, ascending to call you back from a break.
const PATTERNS = {
  end:    [880.0, 698.46, 587.33],
  resume: [587.33, 698.46, 880.0],
}
const NOTE_GAP = 0.17
const NOTE_LENGTH = 1.1

/**
 * A second of ±1-LSB dither as a WAV data URI: inaudible, but not digital
 * silence, which some iOS builds drop rather than treat as playback.
 */
function keepAliveSource(rate = 8000) {
  const frames = rate
  const size = 44 + frames * 2
  const view = new DataView(new ArrayBuffer(size))
  const ascii = (off, text) => {
    for (let i = 0; i < text.length; i++) view.setUint8(off + i, text.charCodeAt(i))
  }
  ascii(0, 'RIFF');  view.setUint32(4, size - 8, true)
  ascii(8, 'WAVE');  ascii(12, 'fmt ')
  view.setUint32(16, 16, true)      // PCM header length
  view.setUint16(20, 1, true)       // format: PCM
  view.setUint16(22, 1, true)       // mono
  view.setUint32(24, rate, true)
  view.setUint32(28, rate * 2, true)
  view.setUint16(32, 2, true)       // block align
  view.setUint16(34, 16, true)      // bits per sample
  ascii(36, 'data'); view.setUint32(40, frames * 2, true)
  for (let i = 0; i < frames; i++) view.setInt16(44 + i * 2, i % 2 ? 1 : -1, true)

  let binary = ''
  const bytes = new Uint8Array(view.buffer)
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return `data:audio/wav;base64,${btoa(binary)}`
}

/**
 * A chime synthesised on the fly — no audio file to ship or cache.
 *
 * iOS will not let a page make sound until a user gesture has started an
 * AudioContext, so `unlock` is called from the play button. Once unlocked the
 * context stays alive, which is what lets an auto-started next block chime
 * without another tap.
 *
 * Backgrounded, iOS suspends the page and a JS timer with it — so the chime
 * for a running period is *scheduled ahead* on the AudioContext's own clock,
 * and a looping inaudible track holds the media session open so the OS keeps
 * the audio running while you're in another app. Both are torn down the moment
 * the timer stops, so nothing is playing and no battery is spent when idle.
 */
export default function useChime() {
  const ctxRef = useRef(null)
  const scheduledRef = useRef([])
  const keepAliveRef = useRef(null)

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
      notes.forEach((freq, i) => ring(ctx, freq, t0 + i * NOTE_GAP, NOTE_LENGTH))
    } catch { /* never let a missing chime break the timer */ }
  }, [])

  /** Call off a chime queued for later — a pause, a split, or walking away. */
  const cancelScheduled = useCallback(() => {
    for (const osc of scheduledRef.current) {
      try { osc.stop() } catch { /* already finished */ }
    }
    scheduledRef.current = []
  }, [])

  /** True if a chime is queued, so the foreground tick doesn't double it up. */
  const hasScheduled = useCallback(() => scheduledRef.current.length > 0, [])

  /** Queue the chime for `seconds` from now, on the audio clock. */
  const schedule = useCallback((pattern, seconds) => {
    cancelScheduled()
    const ctx = ctxRef.current
    if (!ctx || !(seconds >= 0)) return
    try {
      if (ctx.state === 'suspended') ctx.resume()
      const notes = PATTERNS[pattern] || PATTERNS.end
      const at = ctx.currentTime + seconds
      const oscs = []
      notes.forEach((freq, i) => oscs.push(...ring(ctx, freq, at + i * NOTE_GAP, NOTE_LENGTH)))
      scheduledRef.current = oscs
    } catch { /* scheduling is a bonus; the foreground chime still fires */ }
  }, [cancelScheduled])

  /**
   * Hold the media session open so iOS keeps our audio running in the
   * background. Only while a period is actually counting down.
   */
  const setKeepAlive = useCallback(on => {
    try {
      if (on) {
        if (!keepAliveRef.current) {
          const el = new Audio(keepAliveSource())
          el.loop = true
          el.setAttribute('playsinline', '')
          keepAliveRef.current = el
        }
        const playing = keepAliveRef.current.play()
        if (playing?.catch) playing.catch(() => { /* blocked until a gesture */ })
      } else if (keepAliveRef.current) {
        keepAliveRef.current.pause()
      }
    } catch { /* keep-alive is best-effort */ }
  }, [])

  return { unlock, play, schedule, cancelScheduled, hasScheduled, setKeepAlive }
}
