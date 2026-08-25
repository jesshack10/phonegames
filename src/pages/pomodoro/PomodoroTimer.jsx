import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useBoxSize from '../../components/pomodoro/useBoxSize'
import useWakeLock from '../../components/pomodoro/useWakeLock'
import HaloVisual from '../../components/pomodoro/HaloVisual'
import DialVisual from '../../components/pomodoro/DialVisual'
import { VISUALS, getTheme } from '../../components/pomodoro/visualTheme'
import SessionNoteSheet from '../../components/pomodoro/SessionNoteSheet'
import useChime, { readSoundOn, storeSoundOn } from '../../components/pomodoro/useChime'
import { add as addEntry, listTags, newId, lastEntry } from '../../utils/journalStore'

const STORE_KEY = 'pomodoro-visual'

// Restarting a barely-begun block shouldn't nag, so ↺ only asks past this.
// Leaving with ✕ always asks: time already spent must never vanish silently.
const MIN_RESET_PROMPT_SECONDS = 60

// One chime is easy to miss, so it repeats while the prompt sits unanswered.
const NUDGE_EVERY_MS = 20000
const NUDGE_LIMIT = 3

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

function SoundOnIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H3v6h3l5 4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" opacity="0.5" />
    </svg>
  )
}

function SoundOffIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H3v6h3l5 4z" />
      <path d="M16 9.5 21 14.5 M21 9.5 16 14.5" />
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
  const [liveIntention, setLiveIntention] = useState(intention)
  const [last,     setLast]     = useState(() => lastEntry())
  const [soundOn,  setSoundOn]  = useState(readSoundOn)
  const [flash,    setFlash]    = useState(false)
  const [tags]                  = useState(() => listTags())

  const intervalRef  = useRef(null)
  const phaseRef     = useRef('work')
  const sessionRef   = useRef(1)
  const deadlineRef  = useRef(0)
  // Wall-clock start of the current unlogged segment, set the first time it
  // runs; null before the block has been started. A block split mid-way holds
  // several segments, each logged as its own entry.
  const blockStartRef   = useRef(null)
  // What to do once the note sheet is dismissed.
  const pendingActionRef = useRef(null)
  // The tick closure is built when the timer starts, so it would otherwise
  // keep whatever sound setting was in force back then — muting mid-block
  // has to reach it through a ref.
  const soundOnRef = useRef(soundOn)

  const isWork = phase === 'work'
  const totalTime = isWork ? workSecs : breakSecs
  const remaining = Math.max(0, Math.min(1, timeLeft / totalTime))
  const t = getTheme(visual, phase)
  const { unlock, play } = useChime()
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

  useEffect(() => { soundOnRef.current = soundOn }, [soundOn])

  useEffect(() => {
    if (!draft || !draft.completed || !soundOn) return
    let count = 0
    const id = setInterval(() => {
      if (++count > NUDGE_LIMIT) { clearInterval(id); return }
      play('end')
    }, NUDGE_EVERY_MS)
    return () => clearInterval(id)
  }, [draft, soundOn, play])

  // A finished period should be visible from another tab too.
  useEffect(() => {
    if (!draft) return
    const previous = document.title
    document.title = '⏰ Period finished — what were you doing?'
    return () => { document.title = previous }
  }, [draft])

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
      actualSeconds: Math.round((endedAt - startedAt) / 1000),
      mode,
      intention: liveIntention,
      completed,
    }
  }

  /** Chime plus a flash of colour, so a finished period is hard to miss. */
  function announce(pattern) {
    if (soundOnRef.current) play(pattern)
    setFlash(true)
    setTimeout(() => setFlash(false), 1200)
  }

  /** A focus block just ran out. Breaks are not journalled, so they pass through. */
  function handlePhaseEnd() {
    if (phaseRef.current === 'break') { announce('resume'); startNextPhase(); return }
    announce('end')
    const lastSession = sessionRef.current >= totalSessions
    pendingActionRef.current = isBlock ? 'continue' : lastSession ? 'done' : 'next'
    // The sheet needs the keyboard and the controls, so drop out of fullscreen.
    setFsMode(false)
    // canContinue drives the sheet's buttons; it never reaches the journal.
    setDraft({ ...buildDraft(true), canContinue: isBlock })
  }

  function commitDraft({ note = '', tag = '', details = '', next = '', choice } = {}) {
    const action = pendingActionRef.current
    const keepGoing = action === 'midblock' && choice !== 'finish'

    if (draft) {
      const { canContinue, midBlock, actualSeconds, ...entry } = draft
      const saved = {
        ...entry,
        id: newId(),
        note, tag, details, next,
        // A piece of work you closed on purpose to switch tasks is finished,
        // not abandoned — only actually walking away leaves the block short.
        completed: keepGoing ? true : entry.completed,
        segment: action === 'midblock',
      }
      addEntry(saved)
      setLast(saved)
    }
    setDraft(null)
    pendingActionRef.current = null

    // Whatever you said you'd do next becomes the intention going forward.
    if (next) setLiveIntention(next)

    if (action === 'midblock') {
      if (choice === 'finish') { navigate('/pomodoro'); return }
      // Same block, same countdown — just a fresh segment from now.
      blockStartRef.current = Date.now()
      setRunning(true)
    }
    else if (action === 'continue') {
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
    const started = phaseRef.current === 'work' && blockStartRef.current != null
    // ✕ always asks once the block is under way, however little time has
    // passed — you decide whether it was worth logging, not a threshold.
    const shouldAsk = started &&
      (action === 'exit' || elapsedSeconds() >= MIN_RESET_PROMPT_SECONDS)

    if (shouldAsk) {
      setRunning(false)
      // Exiting offers to log this piece and carry on in the same block;
      // resetting is a restart, so it just captures what was done.
      pendingActionRef.current = action === 'exit' ? 'midblock' : action
      setFsMode(false)
      setDraft({ ...buildDraft(false), midBlock: action === 'exit' })
      return
    }
    if (action === 'reset') reset()
    else navigate('/pomodoro')
  }

  /** Backing out of stepping out: nothing logged, the countdown resumes. */
  function cancelDraft() {
    setDraft(null)
    pendingActionRef.current = null
    setRunning(true)
  }

  /** Leaving without logging — for the ✕ that was a misclick. */
  function discardDraft() {
    setDraft(null)
    const action = pendingActionRef.current
    pendingActionRef.current = null
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
      last={last}
      onSave={commitDraft}
      onSkip={() => commitDraft({})}
      onCancel={cancelDraft}
      onDiscard={discardDraft}
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
        {flash && (
          <div
            className="fixed inset-0 z-[55] pointer-events-none animate-[periodFlash_1.2s_ease-out]"
            style={{ background: t.accent }}
          />
        )}
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
        {liveIntention && (
          <p className="text-sm italic text-center max-w-xs" style={{ color: t.ghost }}>{liveIntention}</p>
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
            {liveIntention}
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
          onClick={() => { unlock(); setRunning(r => !r) }}
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

          <button
            onClick={() => { const next = !soundOn; setSoundOn(next); storeSoundOn(next); if (next) { unlock(); play('end') } }}
            aria-label={soundOn ? 'Sound on' : 'Sound off'}
            aria-pressed={soundOn}
            className={iconBtn}
            style={{ color: t.icon, opacity: soundOn ? 0.85 : 0.2 }}>
            {soundOn ? <SoundOnIcon /> : <SoundOffIcon />}
          </button>

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

      {flash && (
        <div
          className="fixed inset-0 z-[55] pointer-events-none animate-[periodFlash_1.2s_ease-out]"
          style={{ background: t.accent }}
        />
      )}
      {sheet}
    </div>
  )
}
