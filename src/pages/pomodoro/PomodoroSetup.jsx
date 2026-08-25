import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { VISUALS } from '../../components/pomodoro/visualTheme'

const STORE_KEY = 'pomodoro-visual'

const BLOCK_PRESETS = [15, 25, 30, 45, 60]

function readStoredVisual() {
  try {
    const saved = localStorage.getItem(STORE_KEY)
    if (VISUALS.some(v => v.id === saved)) return saved
  } catch { /* private mode or storage disabled */ }
  return 'halo'
}

// Small still frames of each visual at roughly two thirds through a session,
// so the picker shows what the screen will actually look like.
function VisualPreview({ id }) {
  if (id === 'dial') {
    return (
      <svg viewBox="0 0 60 60" width="56" height="56">
        <rect x="1" y="1" width="58" height="58" rx="9" fill="#0a0a18" />
        {Array.from({ length: 16 }).map((_, i) => {
          const a = (i / 16) * Math.PI * 2 - Math.PI / 2
          return (
            <line key={i}
              x1={30 + Math.cos(a) * 17} y1={30 + Math.sin(a) * 17}
              x2={30 + Math.cos(a) * 22} y2={30 + Math.sin(a) * 22}
              stroke={i < 6 ? 'rgba(246,242,234,0.12)' : 'rgba(246,242,234,0.8)'}
              strokeWidth="2" strokeLinecap="round" />
          )
        })}
        <circle cx="30" cy="30" r="14" fill="none" stroke="#f0563a" strokeWidth="1.6"
          pathLength="100" strokeDasharray="62 100" transform="rotate(-90 30 30)" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 60 60" width="56" height="56">
      <rect x="1" y="1" width="58" height="58" rx="9" fill="#0a0a18" />
      <rect x="6" y="6" width="48" height="48" rx="7" fill="none"
        stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
      <rect x="6" y="6" width="48" height="48" rx="7" fill="none"
        stroke="#ffd9a0" strokeWidth="2.4" strokeLinecap="round"
        pathLength="100" strokeDasharray="62 100" />
      <text x="30" y="34" textAnchor="middle" fill="#f6f2ea"
        fontSize="12" fontFamily="monospace">17</text>
    </svg>
  )
}

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
  const [mode,         setMode]         = useState('pomodoro')
  const [intention,    setIntention]    = useState('')
  const [description,  setDescription]  = useState('')
  const [workMinutes,  setWorkMinutes]  = useState(25)
  const [breakMinutes, setBreakMinutes] = useState(5)
  const [sessions,     setSessions]     = useState(4)
  const [blockMinutes, setBlockMinutes] = useState(30)
  const [visual,       setVisual]       = useState(readStoredVisual)

  const isBlock = mode === 'block'

  function start() {
    const params = new URLSearchParams({
      mode,
      intention:    intention.trim() || 'Focus',
      description,
      workMinutes:  String(isBlock ? blockMinutes : workMinutes),
      breakMinutes: String(breakMinutes),
      sessions:     String(isBlock ? 1 : sessions),
      visual,
    })
    try { localStorage.setItem(STORE_KEY, visual) } catch { /* nothing to do */ }
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
        <button
          onClick={() => navigate('/pomodoro/journal')}
          className="ml-auto text-gray-500 text-sm active:opacity-50 transition-opacity"
        >📓 Journal</button>
      </div>

      {/* Mode switch */}
      <div className="flex bg-[#10102a] border border-gray-800 rounded-xl p-1">
        {[
          { id: 'pomodoro', label: 'Pomodoro' },
          { id: 'block',    label: 'Time block' },
        ].map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            aria-pressed={mode === m.id}
            className={`flex-1 py-2.5 rounded-lg text-sm transition-all ${
              mode === m.id
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                : 'text-gray-600 border border-transparent'
            }`}
          >{m.label}</button>
        ))}
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
        <label className="text-[10px] text-gray-500 uppercase tracking-[0.2em]">
          {isBlock ? 'Block length' : 'Configuration'}
        </label>

        {isBlock ? (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-5 gap-2">
              {BLOCK_PRESETS.map(m => (
                <button
                  key={m}
                  onClick={() => setBlockMinutes(m)}
                  aria-pressed={blockMinutes === m}
                  className={`py-3 rounded-xl text-sm tabular-nums border transition-all active:scale-95 ${
                    blockMinutes === m
                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                      : 'border-gray-800 bg-[#10102a] text-gray-500'
                  }`}
                >{m}</button>
              ))}
            </div>
            <div className="flex gap-3">
              <Counter
                label="Minutes" value={blockMinutes}
                onDec={() => setBlockMinutes(m => Math.max(1, m - 5))}
                onInc={() => setBlockMinutes(m => Math.min(180, m + 5))}
                color="text-amber-400" unit="min"
              />
            </div>
            <p className="text-[11px] text-gray-700 leading-relaxed">
              One continuous block, no breaks. When it ends you'll be asked what you were doing,
              then the next block of the same length starts on its own — the prompt has a
              "finish for now" option whenever you want to stop.
            </p>
          </div>
        ) : (
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
        )}
      </section>

      <section className="flex flex-col gap-2.5">
        <label className="text-[10px] text-gray-500 uppercase tracking-[0.2em]">View</label>
        <div className="grid grid-cols-2 gap-3">
          {VISUALS.map(v => (
            <button
              key={v.id}
              onClick={() => setVisual(v.id)}
              aria-pressed={visual === v.id}
              className={`flex items-center gap-3 py-3 px-4 rounded-xl border transition-all active:scale-95 ${
                visual === v.id
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                  : 'border-gray-800 bg-[#10102a] text-gray-500'
              }`}
            >
              <VisualPreview id={v.id} />
              <span className="flex flex-col items-start leading-tight">
                <span className="text-sm">{v.label}</span>
                <span className="text-[10px] text-gray-600">
                  {v.id === 'halo' ? 'edge light' : 'minute ticks'}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <button
        onClick={start}
        className="w-full py-5 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 border border-amber-400/40 text-white text-xl font-bold tracking-wide shadow-[0_0_24px_rgba(245,158,11,0.25)] active:scale-95 transition-all mt-auto"
      >
        {isBlock ? `Start ${blockMinutes} min block` : 'Start Focus'}
      </button>
    </div>
  )
}
