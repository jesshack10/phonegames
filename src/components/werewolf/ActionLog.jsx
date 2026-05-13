import { useState } from 'react'

const TYPE_ICON = {
  werewolf_kill: '🐺',
  doctor_save: '💉',
  seer_check: '🔮',
  elimination: '💀',
  no_kill: '🌙',
  no_elimination: '🤝',
  game_start: '🎮',
  phase_change: '🔄',
}

export default function ActionLog({ log = {} }) {
  const [open, setOpen] = useState(false)
  const rounds = Object.keys(log).sort((a, b) => Number(a) - Number(b))
  if (rounds.length === 0) return null

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-white/70 text-sm font-semibold"
      >
        <span>📋 Action Log</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 flex flex-col gap-4 max-h-64 overflow-y-auto">
          {rounds.map(round => (
            <div key={round}>
              <p className="text-xs text-white/40 uppercase tracking-widest mb-2">Round {round}</p>
              {Object.values(log[round]).map((entry, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-white/80 mb-1">
                  <span>{TYPE_ICON[entry.type] || '•'}</span>
                  <span>{entry.payload?.description || entry.type}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
