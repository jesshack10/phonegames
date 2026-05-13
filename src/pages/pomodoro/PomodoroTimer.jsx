import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import HourglassAnim from '../../components/pomodoro/HourglassAnim'
import PaintingAnim from '../../components/pomodoro/PaintingAnim'
import PlantAnim from '../../components/pomodoro/PlantAnim'

const ANIMS = { hourglass: HourglassAnim, painting: PaintingAnim, plant: PlantAnim }

export default function PomodoroTimer() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const intention = searchParams.get('intention') || 'Focus'
  const description = searchParams.get('description') || ''
  const workSecs = Number(searchParams.get('workMinutes') || 25) * 60
  const breakSecs = Number(searchParams.get('breakMinutes') || 5) * 60
  const totalSessions = Number(searchParams.get('sessions') || 4)
  const [animType, setAnimType] = useState(searchParams.get('animation') || 'hourglass')

  const [phase, setPhase] = useState('work')
  const [session, setSession] = useState(1)
  const [timeLeft, setTimeLeft] = useState(workSecs)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)

  const intervalRef = useRef(null)
  // Refs so startNextPhase always reads the latest values without stale closures
  const phaseRef = useRef('work')
  const sessionRef = useRef(1)

  const totalTime = phase === 'work' ? workSecs : breakSecs
  const progress = Math.max(0, Math.min(1, 1 - timeLeft / totalTime))
  const isWork = phase === 'work'

  function startNextPhase() {
    const currentPhase = phaseRef.current
    const currentSession = sessionRef.current

    if (currentPhase === 'work') {
      if (currentSession >= totalSessions) {
        setDone(true)
        return
      }
      phaseRef.current = 'break'
      setPhase('break')
      setTimeLeft(breakSecs)
    } else {
      const next = currentSession + 1
      sessionRef.current = next
      phaseRef.current = 'work'
      setSession(next)
      setPhase('work')
      setTimeLeft(workSecs)
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
            setTimeout(() => {
              setRunning(false)
              startNextPhase()
            }, 0)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running])

  function reset() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    phaseRef.current = 'work'
    sessionRef.current = 1
    setRunning(false)
    setPhase('work')
    setSession(1)
    setTimeLeft(workSecs)
    setDone(false)
  }

  const min = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const sec = String(timeLeft % 60).padStart(2, '0')
  const Anim = ANIMS[animType]

  if (done) {
    return (
      <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center justify-center gap-5 text-white px-6">
        <div className="text-6xl">🌟</div>
        <h2 className="text-3xl font-bold text-amber-400">All done!</h2>
        <p className="text-gray-500 text-center">{totalSessions} sessions complete</p>
        {intention && (
          <p className="text-gray-700 text-sm italic text-center max-w-xs">{intention}</p>
        )}
        <button
          onClick={reset}
          className="px-10 py-4 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 border border-amber-400/40 font-bold text-xl active:scale-95 transition-transform mt-3"
        >
          Go again
        </button>
        <button onClick={() => navigate('/pomodoro')} className="text-gray-700 text-sm mt-1">
          ← New session
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center justify-between py-8 px-4 select-none overflow-hidden">

      {/* Ghost intention — barely visible */}
      <div className="w-full text-center opacity-[0.07] pt-1">
        <p className="text-sm text-white tracking-[0.2em] uppercase font-light leading-relaxed">
          {intention}
        </p>
        {description && (
          <p className="text-xs text-gray-300 mt-1 max-w-xs mx-auto">{description}</p>
        )}
      </div>

      {/* Session progress dots */}
      <div className="flex gap-2.5 mt-4">
        {Array.from({ length: totalSessions }).map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-700 ${
              i < session - 1
                ? 'w-2.5 h-2.5 bg-amber-500/50'
                : i === session - 1
                  ? isWork
                    ? 'w-3.5 h-3.5 bg-amber-400 shadow-[0_0_12px_#f59e0b80]'
                    : 'w-3.5 h-3.5 bg-teal-400 shadow-[0_0_12px_#2dd4bf80]'
                  : 'w-2.5 h-2.5 bg-gray-800'
            }`}
          />
        ))}
      </div>

      {/* Main timer + animation */}
      <div className="flex flex-col items-center gap-4 flex-1 justify-center w-full">
        <span className={`text-[0.6rem] uppercase tracking-[0.4em] ${
          isWork ? 'text-amber-400/40' : 'text-teal-400/40'
        }`}>
          {isWork ? `focus · ${session} of ${totalSessions}` : 'rest · breathe'}
        </span>

        <div className={`text-[5.5rem] font-mono font-bold tabular-nums leading-none tracking-tight ${
          isWork ? 'text-white' : 'text-teal-200'
        }`}>
          {min}<span className="opacity-30">:</span>{sec}
        </div>

        <div className="mt-2">
          <Anim progress={progress} phase={phase} />
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-5 w-full pb-2">
        <button
          onClick={() => setRunning(r => !r)}
          className={`w-[72px] h-[72px] rounded-full flex items-center justify-center text-2xl active:scale-90 transition-all border-2 ${
            isWork
              ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
              : 'border-teal-500/50 bg-teal-500/10 text-teal-300'
          }`}
        >
          {running ? '⏸' : '▶'}
        </button>

        <div className="flex items-center gap-2">
          {[
            { id: 'hourglass', emoji: '⏳' },
            { id: 'painting', emoji: '🎨' },
            { id: 'plant', emoji: '🌱' },
          ].map(a => (
            <button
              key={a.id}
              onClick={() => setAnimType(a.id)}
              className={`w-10 h-10 rounded-full text-xl flex items-center justify-center transition-all ${
                animType === a.id ? 'bg-white/10 scale-110' : 'opacity-20 hover:opacity-50'
              }`}
            >
              {a.emoji}
            </button>
          ))}
          <div className="w-px h-5 bg-gray-800 mx-1" />
          <button
            onClick={reset}
            className="w-10 h-10 rounded-full text-white text-base flex items-center justify-center opacity-20 hover:opacity-60 transition-opacity"
          >↺</button>
          <button
            onClick={() => navigate('/pomodoro')}
            className="w-10 h-10 rounded-full text-white text-base flex items-center justify-center opacity-20 hover:opacity-60 transition-opacity"
          >✕</button>
        </div>
      </div>
    </div>
  )
}
