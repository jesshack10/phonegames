import { useState } from 'react'
import Avatar from './Avatar.jsx'

export default function VotePanel({ players = [], onVote, disabled = false, myId }) {
  const [selected, setSelected] = useState(null)
  const [confirmed, setConfirmed] = useState(false)

  const targets = players.filter(p => p.id !== myId && p.alive)

  async function handleVote() {
    if (!selected) return
    await onVote(selected)
    setConfirmed(true)
  }

  if (confirmed || disabled) {
    return (
      <div className="rounded-xl bg-green-900/30 border border-green-700 p-6 text-center">
        <p className="text-3xl mb-2">🗳</p>
        <p className="text-white font-semibold">Vote submitted</p>
        <p className="text-white/40 text-sm mt-1">Waiting for others…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-white/60 text-sm text-center">Who do you think is a werewolf?</p>
      <div className="grid grid-cols-2 gap-2">
        {targets.map(player => (
          <button
            key={player.id}
            onClick={() => setSelected(player.id)}
            className={`flex items-center gap-2 rounded-xl px-3 py-3 border transition-colors ${
              selected === player.id
                ? 'bg-red-900/60 border-red-500'
                : 'bg-white/5 border-white/10 active:bg-white/10'
            }`}
          >
            <Avatar avatar={player.avatar} size="sm" />
            <span className="text-white text-sm font-semibold truncate">{player.name}</span>
          </button>
        ))}
      </div>
      <button
        onClick={handleVote}
        disabled={!selected}
        className="w-full py-4 rounded-2xl bg-red-700 border border-red-500 text-white font-bold text-lg disabled:opacity-30 active:scale-95 transition-transform"
      >
        {selected ? `Vote to eliminate →` : 'Select a player'}
      </button>
    </div>
  )
}
