import { useState } from 'react'
import Avatar from './Avatar.jsx'

export default function NightActionPanel({ players = [], onConfirm, confirmLabel = 'Confirm', disabled = false, excludeSelf = false, myId }) {
  const [selected, setSelected] = useState(null)
  const targets = excludeSelf ? players.filter(p => p.id !== myId) : players

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        {targets.map(player => (
          <button
            key={player.id}
            onClick={() => !disabled && setSelected(player.id)}
            disabled={disabled}
            className={`flex items-center gap-2 rounded-xl px-3 py-3 border transition-colors ${
              selected === player.id
                ? 'bg-white/20 border-white/60'
                : 'bg-white/5 border-white/10 active:bg-white/10'
            } ${disabled ? 'opacity-50' : ''}`}
          >
            <Avatar avatar={player.avatar} size="sm" />
            <span className="text-white text-sm font-semibold truncate">{player.name}</span>
          </button>
        ))}
      </div>

      <button
        onClick={() => selected && onConfirm(selected)}
        disabled={!selected || disabled}
        className="w-full py-4 rounded-2xl bg-white/10 border border-white/20 text-white font-bold text-lg disabled:opacity-30 active:scale-95 transition-transform"
      >
        {disabled ? 'Action submitted ✓' : (selected ? confirmLabel : 'Select a player')}
      </button>
    </div>
  )
}
