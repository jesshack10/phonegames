import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function PomodoroTimer() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const intention   = searchParams.get('intention') || 'Focus'
  const description = searchParams.get('description') || ''
  const workSecs    = Number(searchParams.get('workMinutes')  || 25) * 60
  const breakSecs   = Number(searchParams.get('breakMinutes') || 5)  * 60
  const totalSessions = Number(searchParams.get('sessions') || 4)

  const [phase,    setPhase]    = useState('work')
  const [session,  setSession]  = useState(1)
  const [timeLeft, setTimeLeft] = useState(workSecs)
  const [running,  setRunning]  = useState(false)
  const [done,     setDone]     = useState(false)
  const [fsMode,   setFsMode]   = useState(false)

  const intervalRef  = useRef(null)
  const phaseRef     = useRef('work')
  const sessionRef   = useRef(1)

  const isWork = phase === 'work'

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

  const clockColor  = isWork ? 'text-white'      : 'text-teal-200'
  const labelColor  = isWork ? 'text-amber-400/40' : 'text-teal-400/40'
  const btnBorder   = isWork ? 'border-amber-500/50' : 'border-teal-500/50'
  const btnBg       = isWork ? 'bg-amber-500/10'    : 'bg-teal-500/10'
  const btnText     = isWork ? 'text-amber-300'     : 'text-teal-300'

  // ── FULLSCREEN ──────────────────────────────────────────────────────────
  if (fsMode) {
    return (
      <div
        className={`fixed inset-0 z-50 bg-[#0a0a18] flex flex-col items-center justify-center select-none`}
        onClick={() => setFsMode(false)}
      >
        <span className={`text-[0.55rem] uppercase tracking-[0.4em] mb-5 ${labelColor}`}>
          {isWork ? `focus · ${session} of ${totalSessions}` : 'rest · breathe'}
        </span>
        <div
          className={`font-mono font-bold tabular-nums leading-none tracking-tight ${clockColor}`}
          style={{ fontSize: 'min(32vw, 52vh)' }}
        >
          {min}<span className="opacity-25">:</span>{sec}
        </div>
        <span className="absolute bottom-6 text-white/15 text-[0.6rem] tracking-widest uppercase">
          tap anywhere to exit
        </span>
      </div>
    )
  }

  // ── DONE ────────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center justify-center gap-5 text-white px-6">
        <div className="text-6xl">🌟</div>
        <h2 className="text-3xl font-bold text-amber-400">All done!</h2>
        <p className="text-gray-500 text-center">{totalSessions} sessions complete</p>
        {intention && <p className="text-gray-700 text-sm italic text-center max-w-xs">{intention}</p>}
        <button onClick={reset}
          className="px-10 py-4 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 border border-amber-400/40 font-bold text-xl active:scale-95 transition-transform mt-3">
          Go again
        </button>
        <button onClick={() => navigate('/pomodoro')} className="text-gray-700 text-sm mt-1">← New session</button>
      </div>
    )
  }

  // ── DOTS ────────────────────────────────────────────────────────────────
  const dots = (
    <div className="flex gap-2.5">
      {Array.from({ length: totalSessions }).map((_, i) => (
        <div key={i} className={`rounded-full transition-all duration-700 ${
          i < session - 1
            ? 'w-2.5 h-2.5 bg-amber-500/50'
            : i === session - 1
              ? isWork ? 'w-3.5 h-3.5 bg-amber-400 shadow-[0_0_12px_#f59e0b80]'
                       : 'w-3.5 h-3.5 bg-teal-400 shadow-[0_0_12px_#2dd4bf80]'
              : 'w-2.5 h-2.5 bg-gray-800'
        }`} />
      ))}
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

  // ── NORMAL LAYOUT ───────────────────────────────────────────────────────
  return (
    <div className="relative bg-[#0a0a18] select-none overflow-hidden
      flex flex-col items-center justify-between
      min-h-screen py-10 landscape:py-3">

      {/* Ghost intention */}
      <div className="absolute top-2 left-0 right-0 text-center opacity-[0.07] pointer-events-none z-10">
        <p className="text-sm text-white tracking-[0.2em] uppercase font-light">{intention}</p>
        {description && <p className="text-xs text-gray-300 mt-1">{description}</p>}
      </div>

      {/* Top: session dots */}
      <div className="mt-4 landscape:mt-0 z-10">{dots}</div>

      {/* Center: clock */}
      <div className="flex flex-col items-center gap-3 flex-1 justify-center z-10">
        <span className={`text-[0.6rem] uppercase tracking-[0.4em] ${labelColor}`}>
          {isWork ? `focus · ${session} of ${totalSessions}` : 'rest · breathe'}
        </span>
        <div
          className={`font-mono font-bold tabular-nums leading-none tracking-tight ${clockColor}`}
          style={{ fontSize: 'min(28vw, 38vh)' }}
        >
          {min}<span className="opacity-30">:</span>{sec}
        </div>
      </div>

      {/* Bottom: controls */}
      <div className="flex flex-col items-center gap-3 pb-2 z-10">
        <button
          onClick={() => setRunning(r => !r)}
          className={`w-[72px] h-[72px] rounded-full flex items-center justify-center text-2xl
            active:scale-90 transition-all border-2 ${btnBorder} ${btnBg} ${btnText}`}
        >
          {running ? '⏸' : '▶'}
        </button>
        <div className="flex items-center gap-1">
          <button onClick={() => setFsMode(true)}
            aria-label="Fullscreen"
            className="w-10 h-10 rounded-full text-white flex items-center justify-center opacity-20 hover:opacity-60 active:opacity-80 transition-opacity">
            <ExpandIcon />
          </button>
          <button onClick={reset}
            aria-label="Reset"
            className="w-10 h-10 rounded-full text-white text-lg flex items-center justify-center opacity-20 hover:opacity-60 active:opacity-80 transition-opacity">↺</button>
          <button onClick={() => navigate('/pomodoro')}
            aria-label="Exit"
            className="w-10 h-10 rounded-full text-white text-lg flex items-center justify-center opacity-20 hover:opacity-60 active:opacity-80 transition-opacity">✕</button>
        </div>
      </div>
    </div>
  )
}
