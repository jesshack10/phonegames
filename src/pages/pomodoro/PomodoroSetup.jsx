import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const ANIMATIONS = [
  { id: 'hourglass', emoji: '⏳', label: 'Hourglass' },
  { id: 'painting',  emoji: '🎨', label: 'Painting' },
  { id: 'plant',     emoji: '🌱', label: 'Plant' },
  { id: 'brain',     emoji: '🧠', label: 'Brain' },
]

function Counter({ label, value, onDec, onInc, color, unit }) {
  return (
    <div className="flex flex-col items-center gap-1 flex-1 bg-[#10102a] rounded-xl py-4 px-2 border border-gray-800">
      <span className="text-[9px] text-gray-600 uppercase tracking-widest">{label}</span>
      <button
        onClick={onDec}
        className="text-gray-500 text-2xl leading-none w-8 h-8 flex items-center justify-center active:scale-90 transition-transform"
      >−</button>
      <span className={`text-2xl font-bold tabular-nums ${color}`}>{value}</span>
      <span className="text-[9px] text-gray-700">{unit}</span>
      <button
        onClick={onInc}
        className="text-gray-500 text-2xl leading-none w-8 h-8 flex items-center justify-center active:scale-90 transition-transform"
      >+</button>
    </div>
  )
}

export default function PomodoroSetup() {
  const navigate = useNavigate()
  const [intention, setIntention] = useState('')
  const [description, setDescription] = useState('')
  const [workMinutes, setWorkMinutes] = useState(25)
  const [breakMinutes, setBreakMinutes] = useState(5)
  const [sessions, setSessions] = useState(4)
  const [animation, setAnimation] = useState('hourglass')

  function start() {
    const params = new URLSearchParams({
      intention: intention.trim() || 'Focus',
      description,
      workMinutes: String(workMinutes),
      breakMinutes: String(breakMinutes),
      sessions: String(sessions),
      animation,
    })
    navigate(`/pomodoro/timer?${params.toString()}`)
  }

  return (
    <div className="min-h-screen bg-[#0a0a18] text-white flex flex-col px-5 pt-6 pb-10 gap-7">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="text-gray-600 text-sm active:opacity-50 transition-opacity"
        >← back</button>
        <h1 className="text-2xl font-bold tracking-widest text-amber-400">POMODORO</h1>
      </div>

      <section className="flex flex-col gap-2.5">
        <label className="text-[10px] text-gray-500 uppercase tracking-[0.2em]">Intention</label>
        <input
          value={intention}
          onChange={e => setIntention(e.target.value)}
          placeholder="What will you focus on?"
          className="bg-[#10102a] border border-gray-800 focus:border-amber-600 rounded-xl px-4 py-3 text-white placeholder-gray-700 focus:outline-none transition-colors"
        />
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Add a description... (optional)"
          rows={2}
          className="bg-[#10102a] border border-gray-800 focus:border-amber-700/60 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-700 focus:outline-none transition-colors resize-none"
        />
      </section>

      <section className="flex flex-col gap-2.5">
        <label className="text-[10px] text-gray-500 uppercase tracking-[0.2em]">Configuration</label>
        <div className="flex gap-3">
          <Counter
            label="Work" value={workMinutes}
            onDec={() => setWorkMinutes(m => Math.max(1, m - 5))}
            onInc={() => setWorkMinutes(m => Math.min(90, m + 5))}
            color="text-amber-400" unit="min"
          />
          <Counter
            label="Break" value={breakMinutes}
            onDec={() => setBreakMinutes(m => Math.max(1, m - 1))}
            onInc={() => setBreakMinutes(m => Math.min(30, m + 1))}
            color="text-teal-400" unit="min"
          />
          <Counter
            label="Sessions" value={sessions}
            onDec={() => setSessions(s => Math.max(1, s - 1))}
            onInc={() => setSessions(s => Math.min(12, s + 1))}
            color="text-violet-400" unit="×"
          />
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <label className="text-[10px] text-gray-500 uppercase tracking-[0.2em]">Visual Feedback</label>
        <div className="grid grid-cols-4 gap-2">
          {ANIMATIONS.map(a => (
            <button
              key={a.id}
              onClick={() => setAnimation(a.id)}
              className={`flex flex-col items-center gap-2 py-4 rounded-xl border transition-all active:scale-95 ${
                animation === a.id
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                  : 'border-gray-800 bg-[#10102a] text-gray-500'
              }`}
            >
              <span className="text-3xl">{a.emoji}</span>
              <span className="text-xs">{a.label}</span>
            </button>
          ))}
        </div>
      </section>

      <button
        onClick={start}
        className="w-full py-5 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 border border-amber-400/40 text-white text-xl font-bold tracking-wide shadow-[0_0_24px_rgba(245,158,11,0.25)] active:scale-95 transition-all mt-auto"
      >
        Start Focus
      </button>
    </div>
  )
}
