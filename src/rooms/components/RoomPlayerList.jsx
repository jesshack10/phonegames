import { Avatar } from './Avatar.jsx'

/**
 * Shows every player in the room with their avatar, name, host badge,
 * and a "(you)" label for the current user.
 *
 * Props:
 *   players  — array from subscribeRoomPlayers / useRoom
 *   uid      — current user's Firebase uid
 *   isHost   — whether the current user is the host (shows kick buttons)
 *   onKick   — optional async fn(playerUid) — only shown to host for non-host players
 */
export function RoomPlayerList({ players = [], uid, isHost = false, onKick }) {
  if (players.length === 0) {
    return <p className="text-white/30 text-sm text-center py-4">No players yet…</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {players.map((player) => (
        <div
          key={player.id}
          className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5"
        >
          <Avatar avatar={player.avatar} size="sm" />

          <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
            <span className="text-white font-semibold truncate">{player.name}</span>
            {player.isHost && (
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded font-mono uppercase tracking-wide shrink-0">
                host
              </span>
            )}
            {player.id === uid && (
              <span className="text-white/30 text-xs shrink-0">(you)</span>
            )}
          </div>

          {isHost && !player.isHost && onKick && (
            <button
              onClick={() => onKick(player.id)}
              className="text-white/20 hover:text-red-400 active:text-red-500 transition-colors text-sm px-1 shrink-0"
              title={`Remove ${player.name}`}
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
