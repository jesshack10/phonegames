import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth.js'
import { getRoomMeta, joinRoom, ROOM_TTL } from '../firebase/roomDb.js'
import { generateAvatar } from '../utils/avatar.js'

/**
 * Manages a player joining a room. Persists join state in localStorage so
 * a page refresh doesn't eject the player.
 *
 * storageKey — unique per game+room, e.g. `imp_${roomId}`
 *
 * Returns:
 *   uid        — Firebase anonymous uid (null until auth ready)
 *   ready      — true when auth has resolved
 *   joined     — true once the player is in the room
 *   playerInfo — { uid, name, avatar } after joining, else null
 *   error      — last validation/network error string
 *   joining    — true while the join request is in flight
 *   join(name) — call this with the player's chosen name
 *   clearError — reset the error message
 */
export function useRoomJoin(roomId, storageKey) {
  const { uid, ready } = useAuth()
  const [joined, setJoined] = useState(false)
  const [playerInfo, setPlayerInfo] = useState(null)
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)

  // Restore join state from a previous visit
  useEffect(() => {
    if (!uid) return
    const raw = localStorage.getItem(storageKey)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      if (parsed.uid === uid) {
        setPlayerInfo(parsed)
        setJoined(true)
      }
    } catch {
      localStorage.removeItem(storageKey)
    }
  }, [uid, storageKey])

  async function join(name) {
    const trimmed = name.trim()
    if (!trimmed) { setError('Enter your name'); return }
    if (trimmed.length > 20) { setError('Name too long (max 20)'); return }
    if (!uid) return

    setJoining(true)
    setError('')
    try {
      const meta = await getRoomMeta(roomId)
      if (!meta) { setError('Room not found'); return }
      if (Date.now() - meta.createdAt > ROOM_TTL) { setError('Room has expired'); return }
      if (meta.phase !== 'lobby') { setError('Game already started'); return }

      const avatar = generateAvatar()
      await joinRoom(roomId, uid, trimmed, avatar, false)
      const info = { uid, name: trimmed, avatar }
      localStorage.setItem(storageKey, JSON.stringify(info))
      setPlayerInfo(info)
      setJoined(true)
    } catch {
      setError('Failed to join. Try again.')
    } finally {
      setJoining(false)
    }
  }

  return { uid, ready, joined, playerInfo, error, joining, join, clearError: () => setError('') }
}
