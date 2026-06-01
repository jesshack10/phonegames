import { db } from '../../firebase/config.js'
import {
  ref,
  set,
  get,
  update,
  remove,
  onValue,
  runTransaction,
  off,
} from 'firebase/database'
import { generateSessionId } from '../../utils/generateId.js'

export const ROOM_TTL = 60 * 60 * 1000 // 1 hour

/**
 * Create a new room. Returns the generated 6-char room code.
 * extraMeta is merged into the meta node and lets each game store
 * its own config (e.g. { numImpostors: 2 }) alongside the standard fields.
 */
export async function createRoom(hostId, gameType, extraMeta = {}) {
  let roomId
  let attempts = 0
  while (attempts < 10) {
    roomId = generateSessionId()
    const metaRef = ref(db, `rooms/${roomId}/meta`)
    let taken = false
    await runTransaction(metaRef, (existing) => {
      if (existing !== null) {
        taken = true
        return existing
      }
      return {
        createdAt: Date.now(),
        hostId,
        game: gameType,
        phase: 'lobby',
        ...extraMeta,
      }
    })
    if (!taken) break
    attempts++
  }
  return roomId
}

/** Write a player record under rooms/{roomId}/players/{uid}. */
export async function joinRoom(roomId, uid, name, avatar, isHost = false) {
  await set(ref(db, `rooms/${roomId}/players/${uid}`), {
    name,
    avatar,
    joinedAt: Date.now(),
    isHost,
  })
}

/** Remove a player from the room (kick). */
export async function kickPlayer(roomId, uid) {
  await remove(ref(db, `rooms/${roomId}/players/${uid}`))
}

/** One-shot fetch of the room meta. */
export async function getRoomMeta(roomId) {
  const snap = await get(ref(db, `rooms/${roomId}/meta`))
  return snap.val()
}

/** Merge updates into the room meta node. */
export async function updateRoomMeta(roomId, updates) {
  await update(ref(db, `rooms/${roomId}/meta`), updates)
}

/**
 * End the room: tries a clean delete first; falls back to marking
 * phase='ended' so all subscribed clients redirect home.
 */
export async function endRoom(roomId) {
  try {
    await remove(ref(db, `rooms/${roomId}`))
  } catch {
    await updateRoomMeta(roomId, { phase: 'ended' })
  }
}

/** Subscribe to room meta. Returns an unsubscribe function. */
export function subscribeRoom(roomId, callback) {
  const r = ref(db, `rooms/${roomId}/meta`)
  onValue(r, (snap) => callback(snap.val()))
  return () => off(r)
}

/** Subscribe to the full player list. Returns an unsubscribe function. */
export function subscribeRoomPlayers(roomId, callback) {
  const r = ref(db, `rooms/${roomId}/players`)
  onValue(r, (snap) => {
    const val = snap.val() || {}
    callback(Object.entries(val).map(([id, data]) => ({ id, ...data })))
  })
  return () => off(r)
}
