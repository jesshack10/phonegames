import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useBoxSize from '../../components/pomodoro/useBoxSize'
import useWakeLock from '../../components/pomodoro/useWakeLock'
import HaloVisual from '../../components/pomodoro/HaloVisual'
import DialVisual from '../../components/pomodoro/DialVisual'
import { VISUALS, getTheme } from '../../components/pomodoro/visualTheme'
import SessionNoteSheet from '../../components/pomodoro/SessionNoteSheet'
import { add as addEntry, listTags, newId } from '../../utils/journalStore'

const STORE_KEY = 'pomodoro-visual'

// Below this, an abandoned block isn't worth journalling.
const MIN_RECORDED_SECONDS = 60

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

// Halo can push the clock as large as the screen allows, since nothing else
// occupies the middle. Dial instead takes the room left over between the
// intention and the controls, and sizes its digits from what it measures — a
// short landscape screen leaves far less than viewport maths would assume.
const HALO_DIGITS = { normal: 'min(28vw, 34vh)', full: 'min(32vw, 52vh)' }
const DIAL_DIGIT_RATIO = 0.22

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

  const mode        = searchParams.get('mode') === 'block' ? 'block' : 'pomodoro'
  const isBlock     = mode === 'block'
  const intention   = searchParams.get('intention') || 'Focus'
  const description = searchParams.get('description') || ''
  const workMinutes = Number(searchParams.get('workMinutes') || 25)
  const workSecs    = workMinutes * 60
  const breakSecs   = Number(searchParams.get('breakMinutes') || 5)  * 60
  const totalSessions = isBlock ? 1 : Number(searchParams.get('sessions') || 4)

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
  const [draft,    setDraft]    = useState(null)
  const [blockNum, setBlockNum] = useState(1)
  const [tags]                  = useState(() => listTags())

  const intervalRef  = useRef(null)
  const phaseRef     = useRef('work')
  const sessionRef   = useRef(1)
  const deadlineRef  = useRef(0)
  // Wall-clock start of the focus block under way, set the first time it runs;
  // null while the block hasn't been started yet.
  const blockStartRef   = useRef(null)
  // What to do once the note sheet is dismissed.
  const pendingActionRef = useRef(null)

  const isWork = phase === 'work'
  const totalTime = isWork ? workSecs : breakSecs
  const remaining = Math.max(0, Math.min(1, timeLeft / totalTime))
  const t = getTheme(visual, phase)
  useWakeLock(running)
  const [dialRef, dialBox] = useBoxSize()
  // The ring is inscribed in its box, so the smaller side sets the clock size.
  const dialDigits = Math.round(Math.min(dialBox.w, dialBox.h) * DIAL_DIGIT_RATIO)

  function pickVisual(id) {
    setVisual(id)
    storeVisual(id)
  }

  function startNextPhase() {
    const cp = phaseRef.current, cs = sessionRef.current
    blockStartRef.current = null
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

  /**
   * The countdown is derived from a wall-clock deadline rather than a
   * decremented counter: iOS throttles timers in a backgrounded PWA, so a
   * counter would drift and the journal would record the wrong duration.
   */
  useEffect(() => {
    if (!running) return

    deadlineRef.current = Date.now() + timeLeft * 1000
    if (phaseRef.current === 'work' && blockStartRef.current == null) {
      blockStartRef.current = Date.now()
    }

    function tick() {
      const left = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000))
      setTimeLeft(left)
      if (left === 0) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
        setRunning(false)
        handlePhaseEnd()
      }
    }

    intervalRef.current = setInterval(tick, 250)
    // Catch up the moment the app comes back to the foreground.
    document.addEventListener('visibilitychange', tick)

    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      document.removeEventListener('visibilitychange', tick)
    }
    // timeLeft is read once, when the timer starts — re-running every tick
    // would keep pushing the deadline out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  function buildDraft(completed) {
    const startedAt = blockStartRef.current ?? Date.now()
    // On a natural finish the block ended at its deadline, not whenever a
    // suspended tab happened to wake up.
    const endedAt = completed
      ? Math.min(Date.now(), deadlineRef.current || Date.now())
      : Date.now()
    return {
      startedAt,
      endedAt,
      plannedMinutes: workMinutes,
      actualMinutes: Math.max(1, Math.round((endedAt - startedAt) / 60000)),
      mode,
      intention,
      completed,
    }
  }

  /** A focus block just ran out. Breaks are not journalled, so they pass through. */
  function handlePhaseEnd() {
    if (phaseRef.current === 'break') { startNextPhase(); return }
    const lastSession = sessionRef.current >= totalSessions
    pendingActionRef.current = isBlock ? 'continue' : lastSession ? 'done' : 'next'
    // The sheet needs the keyboard and the controls, so drop out of fullscreen.
    setFsMode(false)
    // canContinue drives the sheet's buttons; it never reaches the journal.
    setDraft({ ...buildDraft(true), canContinue: isBlock })
  }

  function commitDraft(note, tag, choice) {
    if (draft) {
      const { canContinue, ...entry } = draft
      addEntry({ id: newId(), ...entry, note: note || '', tag: tag || '' })
    }
    setDraft(null)
    const action = pendingActionRef.current
    pendingActionRef.current = null
    if (action === 'continue') {
      // Chaining is the point of time blocks: unless the user explicitly
      // finishes, the next block starts on its own.
      if (choice === 'finish') navigate('/pomodoro')
      else startNextBlock()
    }
    else if (action === 'next') startNextPhase()
    else if (action === 'done') setDone(true)
    else if (action === 'reset') reset()
    else if (action === 'exit') navigate('/pomodoro')
  }

  /** Another block of the same length, straight after the one just logged. */
  function startNextBlock() {
    blockStartRef.current = null
    setBlockNum(n => n + 1)
    setTimeLeft(workSecs)
    setTimeout(() => setRunning(true), 900)
  }

  /** Elapsed seconds in the focus block currently under way. */
  function elapsedSeconds() {
    if (phaseRef.current !== 'work' || blockStartRef.current == null) return 0
    return (Date.now() - blockStartRef.current) / 1000
  }

  /**
   * Leaving mid-block still counts as time spent — capture it rather than
   * letting it vanish from the journal.
   */
  function leave(action) {
    if (elapsedSeconds() >= MIN_RECORDED_SECONDS) {
      setRunning(false)
      pendingActionRef.current = action
      setFsMode(false)
      setDraft(buildDraft(false))
      return
    }
    if (action === 'reset') reset()
    else navigate('/pomodoro')
  }

  function reset() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    phaseRef.current = 'work'; sessionRef.current = 1
    blockStartRef.current = null
    setBlockNum(1)
    setRunning(false); setPhase('work'); setSession(1); setTimeLeft(workSecs); setDone(false)
  }

  const sheet = (
    <SessionNoteSheet
      draft={draft}
      tags={tags}
      theme={t}
      onSave={commitDraft}
      onSkip={() => commitDraft('', '')}
    />
  )

  const min = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const sec = String(timeLeft % 60).padStart(2, '0')
  const minutesLeft = Math.ceil(timeLeft / 60)

  const phaseLabel = isWork
    ? isBlock
      ? `time block · ${workMinutes} min${blockNum > 1 ? ` · #${blockNum}` : ''}`
      : `focus · ${session} of ${totalSessions}`
    : 'rest · breathe'

  // ── CLOCK ───────────────────────────────────────────────────────────────
  // Dial keeps the digits inside its ring; Halo lets them run as big as the
  // screen allows because nothing else occupies the middle.
  const clock = visual === 'dial' ? (
    <div
      ref={dialRef}
      className="relative w-full flex items-center justify-center min-h-0"
      style={fsMode
        ? { width: 'min(96vw, 84vh)', height: 'min(96vw, 84vh)' }
        // Square, so the ring fills its box and the phase label above it stays
        // attached to the dial instead of drifting up towards the dots.
        : { flex: '1 1 0', aspectRatio: '1', maxWidth: '92vw', maxHeight: '92vw' }}
    >
      <DialVisual
        remaining={remaining}
        totalSeconds={totalTime}
        tickOn={t.tickOn}
        tickOff={t.tickOff}
        accent={t.accent}
      />
      <div className="relative flex flex-col items-center"
        style={{ gap: Math.max(4, dialDigits * 0.11) }}>
        <div className="font-mono font-bold tabular-nums leading-none tracking-tight"
          style={{ fontSize: dialDigits, color: t.digits }}>
          {min}<span style={{ color: t.colon }}>:</span>{sec}
        </div>
        <span className="uppercase tracking-[0.3em]"
          style={{ fontSize: Math.max(9, dialDigits * 0.14), color: t.label }}>
          {minutesLeft} min
        </span>
      </div>
    </div>
  ) : (
    <div className="font-mono font-bold tabular-nums leading-none tracking-tight"
      style={{ fontSize: HALO_DIGITS[fsMode ? 'full' : 'normal'], color: t.digits }}>
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
        {sheet}
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
        <p style={{ color: t.label }}>
          {totalSessions} {totalSessions === 1 ? 'session' : 'sessions'} complete
        </p>
        {intention && (
          <p className="text-sm italic text-center max-w-xs" style={{ color: t.ghost }}>{intention}</p>
        )}
        <button onClick={reset}
          className="px-10 py-4 rounded-2xl border-2 font-bold text-xl active:scale-95 transition-transform mt-3"
          style={{ borderColor: t.ctlBorder, background: t.ctlBg, color: t.ctlText }}>
          Go again
        </button>
        <button onClick={() => navigate('/pomodoro/journal')} className="text-sm mt-1"
          style={{ color: t.label }}>📓 View journal</button>
        <button onClick={() => navigate('/pomodoro')} className="text-sm"
          style={{ color: t.ghost }}>← New session</button>
        {sheet}
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

      {/* Top: whispered intention, then session dots. In flow rather than
          absolute so a two-line intention can never sit on top of the dots. */}
      <div className="flex flex-col items-center gap-3 px-6 mt-2 landscape:mt-0 z-10">
        <div className="text-center pointer-events-none">
          <p className="text-sm tracking-[0.2em] uppercase font-light" style={{ color: t.ghost }}>
            {intention}
          </p>
          {description && (
            <p className="text-xs mt-1 landscape:hidden" style={{ color: t.ghost }}>
              {description}
            </p>
          )}
        </div>
        {!isBlock && dots}
      </div>

      {/* Center: clock */}
      <div className="flex flex-col items-center gap-3 flex-1 min-h-0 w-full justify-center z-10">
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
          <button onClick={() => leave('reset')} aria-label="Reset"
            className={`${iconBtn} text-lg`} style={{ color: t.icon, opacity: 0.2 }}>↺</button>
          <button onClick={() => leave('exit')} aria-label="Exit"
            className={`${iconBtn} text-lg`} style={{ color: t.icon, opacity: 0.2 }}>✕</button>
        </div>
      </div>

      {sheet}
    </div>
  )
}
