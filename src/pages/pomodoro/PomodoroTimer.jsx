import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import HaloVisual from '../../components/pomodoro/HaloVisual'
import DialVisual from '../../components/pomodoro/DialVisual'
import { VISUALS, getTheme } from '../../components/pomodoro/visualTheme'

const STORE_KEY = 'pomodoro-visual'

function readStoredVisual() {
  try {
    const saved = localStorage.getItem(STORE_KEY)
    if (VISUALS.some(v => v.id === saved)) return saved
  } catch { /* private mode or storage disabled */ }
  return null
}

function storeVisual(id) {
  try { localStorage.setItem(STORE_KEY, id) } catch { /* nothing to do */ }
}

// Digit and dial sizing per visual. Halo can push the clock as large as the
// screen allows; Dial has to leave room for the ring around it.
const SIZES = {
  halo: {
    normal: { digits: 'min(28vw, 38vh)' },
    full:   { digits: 'min(32vw, 52vh)' },
  },
  dial: {
    normal: { dial: 'min(92vw, 62vh)', digits: 'min(20.2vw, 13.6vh)' },
    full:   { dial: 'min(96vw, 84vh)', digits: 'min(21.1vw, 18.5vh)' },
  },
}

function HaloIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round">
      <path d="M12 3 H18 A3 3 0 0 1 21 6 V18 A3 3 0 0 1 18 21 H6 A3 3 0 0 1 3 18 V6 A3 3 0 0 1 6 3 Z"
        opacity="0.3" />
      <path d="M12 3 H18 A3 3 0 0 1 21 6 V15" />
    </svg>
  )
}

function DialIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="7.5" opacity="0.35" />
      <path d="M12 2.2 V4.6 M21.8 12 H19.4 M12 21.8 V19.4 M2.2 12 H4.6" />
      <path d="M12 7.5 V12 L15 14" />
    </svg>
  )
}

export default function PomodoroTimer() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const intention   = searchParams.get('intention') || 'Focus'
  const description = searchParams.get('description') || ''
  const workSecs    = Number(searchParams.get('workMinutes')  || 25) * 60
  const breakSecs   = Number(searchParams.get('breakMinutes') || 5)  * 60
  const totalSessions = Number(searchParams.get('sessions') || 4)

  const requested = searchParams.get('visual')
  const initialVisual = VISUALS.some(v => v.id === requested)
    ? requested
    : readStoredVisual() || 'halo'

  const [phase,    setPhase]    = useState('work')
  const [session,  setSession]  = useState(1)
  const [timeLeft, setTimeLeft] = useState(workSecs)
  const [running,  setRunning]  = useState(false)
  const [done,     setDone]     = useState(false)
  const [fsMode,   setFsMode]   = useState(false)
  const [visual,   setVisual]   = useState(initialVisual)

  const intervalRef  = useRef(null)
  const phaseRef     = useRef('work')
  const sessionRef   = useRef(1)

  const isWork = phase === 'work'
  const totalTime = isWork ? workSecs : breakSecs
  const remaining = Math.max(0, Math.min(1, timeLeft / totalTime))
  const t = getTheme(visual, phase)
  const size = SIZES[visual][fsMode ? 'full' : 'normal']

  function pickVisual(id) {
    setVisual(id)
    storeVisual(id)
  }

  function startNextPhase() {
    const cp = phaseRef.current, cs = sessionRef.current
    if (cp === 'work') {
      if (cs >= totalSessions) { setDone(true); return }
      phaseRef.current = 'break'; setPhase('break'); setTimeLeft(breakSecs)
    } else {
      const n = cs + 1
      sessionRef.current = n; phaseRef.current = 'work'
      setSession(n); setPhase('work'); setTimeLeft(workSecs)
    }
    setTimeout(() => setRunning(true), 900)
  }

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
            setTimeout(() => { setRunning(false); startNextPhase() }, 0)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  function reset() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    phaseRef.current = 'work'; sessionRef.current = 1
    setRunning(false); setPhase('work'); setSession(1); setTimeLeft(workSecs); setDone(false)
  }

  const min = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const sec = String(timeLeft % 60).padStart(2, '0')
  const minutesLeft = Math.ceil(timeLeft / 60)

  const phaseLabel = isWork ? `focus · ${session} of ${totalSessions}` : 'rest · breathe'

  // ── CLOCK ───────────────────────────────────────────────────────────────
  // Dial keeps the digits inside its ring; Halo lets them run as big as the
  // screen allows because nothing else occupies the middle.
  const clock = visual === 'dial' ? (
    <div className="relative flex items-center justify-center"
      style={{ width: size.dial, height: size.dial }}>
      <DialVisual
        remaining={remaining}
        totalSeconds={totalTime}
        size="100%"
        tickOn={t.tickOn}
        tickOff={t.tickOff}
        accent={t.accent}
      />
      <div className="relative flex flex-col items-center gap-2">
        <div className="font-mono font-bold tabular-nums leading-none tracking-tight"
          style={{ fontSize: size.digits, color: t.digits }}>
          {min}<span style={{ color: t.colon }}>:</span>{sec}
        </div>
        <span className="text-[0.6rem] uppercase tracking-[0.3em]" style={{ color: t.label }}>
          {minutesLeft} min
        </span>
      </div>
    </div>
  ) : (
    <div className="font-mono font-bold tabular-nums leading-none tracking-tight"
      style={{ fontSize: size.digits, color: t.digits }}>
      {min}<span style={{ color: t.colon }}>:</span>{sec}
    </div>
  )

  // ── FULLSCREEN ──────────────────────────────────────────────────────────
  if (fsMode) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center select-none"
        style={{ background: t.bg }}
        onClick={() => setFsMode(false)}
      >
        {visual === 'halo' && (
          <HaloVisual remaining={remaining} color={t.accent} track={t.track} thick />
        )}
        <span className="relative text-[0.55rem] uppercase tracking-[0.4em] mb-5"
          style={{ color: t.label }}>
          {phaseLabel}
        </span>
        <div className="relative">{clock}</div>
        <span className="absolute bottom-6 text-[0.6rem] tracking-widest uppercase"
          style={{ color: t.ghost }}>
          tap anywhere to exit
        </span>
      </div>
    )
  }

  // ── DONE ────────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6"
        style={{ background: t.bg, color: t.digits }}>
        <div className="text-6xl">🌟</div>
        <h2 className="text-3xl font-bold" style={{ color: t.accent }}>All done!</h2>
        <p style={{ color: t.label }}>{totalSessions} sessions complete</p>
        {intention && (
          <p className="text-sm italic text-center max-w-xs" style={{ color: t.ghost }}>{intention}</p>
        )}
        <button onClick={reset}
          className="px-10 py-4 rounded-2xl border-2 font-bold text-xl active:scale-95 transition-transform mt-3"
          style={{ borderColor: t.ctlBorder, background: t.ctlBg, color: t.ctlText }}>
          Go again
        </button>
        <button onClick={() => navigate('/pomodoro')} className="text-sm mt-1"
          style={{ color: t.label }}>← New session</button>
      </div>
    )
  }

  // ── DOTS ────────────────────────────────────────────────────────────────
  const dots = (
    <div className="flex gap-2.5 items-center">
      {Array.from({ length: totalSessions }).map((_, i) => {
        const isPast = i < session - 1
        const isNow  = i === session - 1
        const d = isNow ? 14 : 10
        return (
          <div key={i} className="rounded-full transition-all duration-700"
            style={{
              width: d, height: d,
              background: isPast ? t.dotPast : isNow ? t.dotNow : t.dotNext,
              boxShadow: isNow ? `0 0 12px ${t.dotNow}80` : 'none',
            }} />
        )
      })}
    </div>
  )

  const ExpandIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3"  y1="21" x2="10" y2="14" />
    </svg>
  )

  const iconBtn = 'w-10 h-10 rounded-full flex items-center justify-center transition-opacity'

  // ── NORMAL LAYOUT ───────────────────────────────────────────────────────
  return (
    <div className="relative select-none overflow-hidden
      flex flex-col items-center justify-between
      min-h-screen py-10 landscape:py-3"
      style={{ background: t.bg }}>

      {visual === 'halo' && (
        <HaloVisual remaining={remaining} color={t.accent} track={t.track} />
      )}

      {/* Ghost intention */}
      <div className="absolute top-5 left-0 right-0 text-center pointer-events-none z-10">
        <p className="text-sm tracking-[0.2em] uppercase font-light" style={{ color: t.ghost }}>
          {intention}
        </p>
        {description && (
          <p className="text-xs mt-1" style={{ color: t.ghost }}>{description}</p>
        )}
      </div>

      {/* Top: session dots */}
      <div className="mt-4 landscape:mt-0 z-10">{dots}</div>

      {/* Center: clock */}
      <div className="flex flex-col items-center gap-3 flex-1 justify-center z-10">
        <span className="text-[0.6rem] uppercase tracking-[0.4em]" style={{ color: t.label }}>
          {phaseLabel}
        </span>
        {clock}
      </div>

      {/* Bottom: controls */}
      <div className="flex flex-col items-center gap-3 pb-2 z-10">
        <button
          onClick={() => setRunning(r => !r)}
          aria-label={running ? 'Pause' : 'Start'}
          className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-2xl
            active:scale-90 transition-all border-2"
          style={{ borderColor: t.ctlBorder, background: t.ctlBg, color: t.ctlText }}
        >
          {running ? '⏸' : '▶'}
        </button>

        <div className="flex items-center gap-1">
          {/* Visual mode */}
          <button onClick={() => pickVisual('halo')}
            aria-label="Halo view" aria-pressed={visual === 'halo'}
            className={iconBtn}
            style={{ color: t.icon, opacity: visual === 'halo' ? 0.85 : 0.2 }}>
            <HaloIcon />
          </button>
          <button onClick={() => pickVisual('dial')}
            aria-label="Dial view" aria-pressed={visual === 'dial'}
            className={iconBtn}
            style={{ color: t.icon, opacity: visual === 'dial' ? 0.85 : 0.2 }}>
            <DialIcon />
          </button>

          <div className="w-px h-5 mx-1.5" style={{ background: t.ghost }} />

          <button onClick={() => setFsMode(true)} aria-label="Fullscreen"
            className={iconBtn} style={{ color: t.icon, opacity: 0.2 }}>
            <ExpandIcon />
          </button>
          <button onClick={reset} aria-label="Reset"
            className={`${iconBtn} text-lg`} style={{ color: t.icon, opacity: 0.2 }}>↺</button>
          <button onClick={() => navigate('/pomodoro')} aria-label="Exit"
            className={`${iconBtn} text-lg`} style={{ color: t.icon, opacity: 0.2 }}>✕</button>
        </div>
      </div>
    </div>
  )
}
