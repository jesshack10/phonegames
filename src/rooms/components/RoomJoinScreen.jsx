import { useState } from 'react'

/**
 * Full-screen name-entry form shown to a player before they join a room.
 *
 * Props:
 *   gameEmoji — large emoji shown at the top (e.g. '🕵️')
 *   gameTitle — displayed below the emoji (e.g. 'IMPOSTOR')
 *   roomId    — the 6-char room code shown under the title
 *   onJoin    — async fn(name: string) — called when the player submits
 *   error     — validation/network error string from useRoomJoin
 *   loading   — true while the join request is in-flight
 */
export function RoomJoinScreen({
  gameEmoji = '🎮',
  gameTitle = 'Game Room',
  roomId,
  onJoin,
  error = '',
  loading = false,
}) {
  const [name, setName] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    onJoin(name)
  }

  return (
    <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center justify-center px-6 gap-6">
      <div className="text-6xl">{gameEmoji}</div>

      <div className="text-center">
        <h1 className="text-white text-3xl font-black tracking-tight">{gameTitle}</h1>
        <p className="text-white/30 text-sm font-mono tracking-widest mt-1">{roomId}</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-xs flex flex-col gap-3">
        <input
          type="text"
          placeholder="Your name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          autoFocus
          className="w-full px-4 py-4 rounded-xl bg-white/10 border border-white/20 text-white text-lg placeholder-white/30 outline-none focus:border-indigo-400 transition-colors"
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={!name.trim() || loading}
          className="w-full py-4 rounded-2xl bg-indigo-500 active:bg-indigo-600 text-white text-lg font-bold disabled:opacity-40 transition-colors shadow-lg shadow-indigo-500/20"
        >
          {loading ? 'Joining…' : 'Join Room →'}
        </button>
      </form>
    </div>
  )
}
