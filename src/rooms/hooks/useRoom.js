import { useState, useEffect } from 'react'
import { subscribeRoom, subscribeRoomPlayers, ROOM_TTL } from '../firebase/roomDb.js'

/**
 * Subscribe to a room's meta and player list in real time.
 *
 * Returns:
 *   meta      — raw meta object from Firebase (null while loading)
 *   players   — array of { id, name, avatar, isHost, joinedAt }
 *   loading   — true until the first meta snapshot arrives
 *   isLobby   — meta.phase === 'lobby'
 *   isActive  — meta.phase === 'active'
 *   isEnded   — meta.phase === 'ended'
 *   isExpired — createdAt is older than ROOM_TTL
 *
 * Navigation on expiry/end is intentionally left to the caller so each
 * game can decide where to redirect.
 */
export function useRoom(roomId) {
  const [meta, setMeta] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!roomId) return
    const u1 = subscribeRoom(roomId, (m) => {
      setMeta(m)
      setLoading(false)
    })
    const u2 = subscribeRoomPlayers(roomId, setPlayers)
    return () => {
      u1()
      u2()
    }
  }, [roomId])

  const isExpired = meta ? Date.now() - meta.createdAt > ROOM_TTL : false
  const isEnded = meta?.phase === 'ended'
  const isActive = meta?.phase === 'active'
  const isLobby = meta?.phase === 'lobby'

  return { meta, players, loading, isLobby, isActive, isEnded, isExpired }
}
