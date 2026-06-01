import { RoomPlayerList } from './RoomPlayerList.jsx'

/**
 * A host-only panel that can be embedded inside any active game screen.
 * Shows the live player list with kick buttons and an "End Session" button.
 *
 * Use this when the game is already running and you need host controls
 * visible alongside game-specific UI (as opposed to the full RoomLobby screen).
 *
 * Props:
 *   players — array from useRoom
 *   uid     — current user's Firebase uid
 *   onKick  — optional async fn(playerUid)
 *   onEnd   — async fn called when host ends the session
 *   title   — section label (default 'Players in Room')
 */
export function RoomModeratorPanel({
  players = [],
  uid,
  onKick,
  onEnd,
  title = 'Players in Room',
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-white/30 text-[11px] uppercase tracking-widest mb-2">{title}</p>
        <RoomPlayerList players={players} uid={uid} isHost onKick={onKick} />
      </div>

      {onEnd && (
        <button
          onClick={onEnd}
          className="w-full py-3 rounded-2xl bg-red-900/30 border border-red-800/40 active:bg-red-900/50 text-red-400 text-sm font-semibold transition-colors"
        >
          End Session
        </button>
      )}
    </div>
  )
}
