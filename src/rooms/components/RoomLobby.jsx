import { QRCodeSVG } from 'qrcode.react'
import { RoomPlayerList } from './RoomPlayerList.jsx'
import { RoomShareLink } from './RoomShareLink.jsx'

/**
 * The main lobby screen, used by both host and players after joining.
 * Adapts its layout based on the isHost flag.
 *
 * HOST view:
 *   • QR code + room code
 *   • Share link (copy / native share)
 *   • Live player list with optional kick buttons
 *   • Optional "Start Game" button (pass onStart + startLabel)
 *   • children slot for extra host controls above the Start button
 *   • "End Session" button
 *
 * PLAYER view:
 *   • Room code
 *   • Live player list (read-only)
 *   • "Waiting for host…" animation
 *
 * Props:
 *   gameEmoji     — emoji shown at the top (e.g. '🕵️')
 *   gameTitle     — title text (e.g. 'IMPOSTOR')
 *   roomId        — 6-char room code
 *   joinUrl       — full URL players scan/share (host only, used for QR + share)
 *   players       — array from useRoom
 *   uid           — current user's Firebase uid
 *   isHost        — whether this user is the host
 *   onStart       — optional async fn called when host clicks Start
 *   startLabel    — label for the start button (default 'Start Game')
 *   startDisabled — disable the start button (e.g. not enough players)
 *   onEnd         — async fn called when host ends the session
 *   onKick        — optional async fn(playerUid) for host to kick a player
 *   children      — optional JSX rendered above the Start button (host only)
 */
export function RoomLobby({
  gameEmoji = '🎮',
  gameTitle = 'Game Room',
  roomId,
  joinUrl,
  players = [],
  uid,
  isHost = false,
  onStart,
  startLabel = 'Start Game',
  startDisabled = false,
  onEnd,
  onKick,
  children,
}) {
  const count = players.length

  return (
    <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center px-5 py-10 gap-6 max-w-sm mx-auto">

      {/* Header */}
      <div className="text-center">
        <div className="text-5xl mb-2">{gameEmoji}</div>
        <h1 className="text-white text-2xl font-black tracking-tight">{gameTitle}</h1>
      </div>

      {/* QR code — host only */}
      {isHost && joinUrl && (
        <div className="flex flex-col items-center gap-2">
          <div className="bg-white p-3 rounded-2xl shadow-xl">
            <QRCodeSVG value={joinUrl} size={164} />
          </div>
          <p className="text-white/30 text-xs">Scan to join</p>
        </div>
      )}

      {/* Room code */}
      <div className="text-center">
        <p className="text-white/30 text-[11px] uppercase tracking-widest mb-1">Room code</p>
        <p className="text-white text-4xl font-black tracking-[0.2em] font-mono">{roomId}</p>
      </div>

      {/* Share link — host only */}
      {isHost && joinUrl && (
        <div className="w-full">
          <RoomShareLink
            url={joinUrl}
            shareTitle={`Join ${gameTitle}`}
            shareText={`Join my ${gameTitle} room — code: ${roomId}`}
            primary
          />
        </div>
      )}

      {/* Player list */}
      <div className="w-full">
        <p className="text-white/30 text-[11px] uppercase tracking-widest mb-2">
          {count} {count === 1 ? 'player' : 'players'} in room
        </p>
        <RoomPlayerList
          players={players}
          uid={uid}
          isHost={isHost}
          onKick={isHost ? onKick : undefined}
        />
      </div>

      {/* Waiting animation — player only */}
      {!isHost && (
        <div className="text-center mt-2">
          <p className="text-white/30 text-sm mb-3">Waiting for host to start…</p>
          <div className="flex gap-1.5 justify-center">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-white/30 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Host controls */}
      {isHost && (
        <div className="w-full flex flex-col gap-3 mt-2">
          {children}

          {onStart && (
            <button
              onClick={onStart}
              disabled={startDisabled}
              className="w-full py-4 rounded-2xl bg-indigo-500 active:bg-indigo-600 text-white font-bold text-lg disabled:opacity-40 transition-colors shadow-lg shadow-indigo-500/20"
            >
              {startLabel}
            </button>
          )}

          {onEnd && (
            <button
              onClick={onEnd}
              className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 active:bg-white/10 text-white/40 text-sm font-semibold transition-colors"
            >
              End Session
            </button>
          )}
        </div>
      )}

    </div>
  )
}
