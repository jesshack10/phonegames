import { db } from './config.js'
import {
  ref,
  set,
  get,
  push,
  update,
  remove,
  onValue,
  runTransaction,
  serverTimestamp,
  off,
} from 'firebase/database'

export const SESSION_TTL = 60 * 60 * 1000 // 1 hour in ms

export async function deleteSession(sessionId) {
  try {
    await remove(ref(db, `sessions/${sessionId}`))
  } catch {
    // Fallback if rules don't allow root deletion: mark as ended so all clients redirect home
    await update(ref(db, `sessions/${sessionId}/meta`), { phase: 'ended' })
  }
}
import { generateSessionId } from '../utils/generateId.js'

export async function createSession(hostId, roleConfig) {
  let sessionId
  let attempts = 0
  while (attempts < 10) {
    sessionId = generateSessionId()
    const metaRef = ref(db, `sessions/${sessionId}/meta`)
    let taken = false
    await runTransaction(metaRef, (existing) => {
      if (existing !== null) {
        taken = true
        return existing
      }
      return {
        createdAt: Date.now(),
        hostId,
        phase: 'lobby',
        nightTurn: null,
        round: 1,
        winner: null,
        roleConfig,
      }
    })
    if (!taken) break
    attempts++
  }
  return sessionId
}

export async function joinSession(sessionId, uid, name, avatar) {
  const playerRef = ref(db, `sessions/${sessionId}/players/${uid}`)
  await set(playerRef, {
    name,
    avatar,
    joinedAt: Date.now(),
    alive: true,
    role: null,
    isHost: false,
  })
  return uid
}

export async function setHostPlayer(sessionId, uid) {
  const playerRef = ref(db, `sessions/${sessionId}/players/${uid}`)
  await set(playerRef, {
    name: 'Moderator',
    avatar: 'GrayOwl',
    joinedAt: Date.now(),
    alive: false,
    role: 'moderator',
    isHost: true,
  })
}

export function subscribeSession(sessionId, callback) {
  const metaRef = ref(db, `sessions/${sessionId}/meta`)
  onValue(metaRef, (snap) => callback(snap.val()))
  return () => off(metaRef)
}

export function subscribePlayers(sessionId, callback) {
  const playersRef = ref(db, `sessions/${sessionId}/players`)
  onValue(playersRef, (snap) => {
    const val = snap.val() || {}
    callback(
      Object.entries(val).map(([id, data]) => ({ id, ...data }))
    )
  })
  return () => off(playersRef)
}

export function subscribeNightActions(sessionId, round, callback) {
  const actionsRef = ref(db, `sessions/${sessionId}/nightActions/${round}`)
  onValue(actionsRef, (snap) => callback(snap.val() || {}))
  return () => off(actionsRef)
}

export function subscribeVotes(sessionId, round, callback) {
  const votesRef = ref(db, `sessions/${sessionId}/votes/${round}`)
  onValue(votesRef, (snap) => callback(snap.val() || {}))
  return () => off(votesRef)
}

export async function assignRolesToPlayers(sessionId, assignments) {
  const updates = {}
  for (const { playerId, role } of assignments) {
    updates[`sessions/${sessionId}/players/${playerId}/role`] = role
  }
  await update(ref(db), updates)
}

export async function submitNightAction(sessionId, round, actionType, targetId) {
  const actionRef = ref(db, `sessions/${sessionId}/nightActions/${round}/${actionType}`)
  await runTransaction(actionRef, (existing) => {
    if (existing !== null) return existing
    return targetId
  })
}

export async function submitVote(sessionId, round, voterId, targetId) {
  const voteRef = ref(db, `sessions/${sessionId}/votes/${round}/${voterId}`)
  await runTransaction(voteRef, (existing) => {
    if (existing !== null) return existing
    return targetId
  })
}

export async function updateMeta(sessionId, updates) {
  const metaRef = ref(db, `sessions/${sessionId}/meta`)
  await update(metaRef, updates)
}

export async function advanceNightTurn(sessionId, nextTurn) {
  await updateMeta(sessionId, { nightTurn: nextTurn })
}

export async function startGame(sessionId) {
  await updateMeta(sessionId, { phase: 'role_reveal' })
}

export async function beginNight(sessionId, round) {
  await updateMeta(sessionId, { phase: 'night', nightTurn: 'werewolves', round })
}

export async function startDayPhase(sessionId, killedPlayerId) {
  const updates = { phase: 'day_announce' }
  if (killedPlayerId) {
    await update(ref(db, `sessions/${sessionId}/players/${killedPlayerId}`), { alive: false })
  }
  await updateMeta(sessionId, updates)
}

export async function startDiscussion(sessionId) {
  await updateMeta(sessionId, { phase: 'day_discuss' })
}

export async function startVoting(sessionId) {
  await updateMeta(sessionId, { phase: 'voting' })
}

export async function confirmElimination(sessionId, eliminatedId) {
  if (eliminatedId) {
    await update(ref(db, `sessions/${sessionId}/players/${eliminatedId}`), { alive: false })
  }
  await updateMeta(sessionId, { phase: 'day_elimination' })
}

export async function endGame(sessionId, winner) {
  await updateMeta(sessionId, { phase: 'ended', winner })
}

export async function nextRound(sessionId, round) {
  await updateMeta(sessionId, { phase: 'night', nightTurn: 'werewolves', round })
}

export async function appendActionLog(sessionId, round, entry) {
  const logRef = ref(db, `sessions/${sessionId}/actionLog/${round}`)
  await push(logRef, { ...entry, time: Date.now() })
}

export async function setSeerResult(sessionId, round, isWerewolf) {
  await set(ref(db, `sessions/${sessionId}/nightActions/${round}/seerResult`), isWerewolf)
}

export async function getSessionMeta(sessionId) {
  const snap = await get(ref(db, `sessions/${sessionId}/meta`))
  return snap.val()
}

// Looks up a session by its 6-char code and detects which game it belongs to.
// Newer games tag themselves with meta.game; the older ones are detected by
// sniffing meta-shape fields. Returns { meta, game } where game is one of
// 'werewolf' | 'impostor' | 'peticiones' | 'loteria', or both null if the
// session doesn't exist.
export async function lookupSessionGame(sessionId) {
  const snap = await get(ref(db, `sessions/${sessionId}/meta`))
  const meta = snap.val()
  if (!meta) return { meta: null, game: null }
  let game
  if (meta.game) game = meta.game
  else if (meta.roleConfig) game = 'werewolf'
  else if (meta.numImpostors !== undefined) game = 'impostor'
  else game = 'peticiones'
  return { meta, game }
}

// ─── IMPOSTOR GAME ────────────────────────────────────────────────────────────

export async function createImpostorSession(hostId, config) {
  let sessionId, attempts = 0
  while (attempts < 10) {
    sessionId = generateSessionId()
    const metaRef = ref(db, `sessions/${sessionId}/meta`)
    let taken = false
    await runTransaction(metaRef, (existing) => {
      if (existing !== null) { taken = true; return existing }
      return {
        createdAt: Date.now(),
        hostId,
        phase: 'lobby',
        numImpostors: config.numImpostors,
        category: config.category,
        lang: config.lang,
        word: null,
      }
    })
    if (!taken) break
    attempts++
  }
  return sessionId
}

export async function joinImpostorPlayer(sessionId, uid, name, isHost = false) {
  const playerRef = ref(db, `sessions/${sessionId}/players/${uid}`)
  await set(playerRef, { name, joinedAt: Date.now(), role: null, isHost })
}

export function subscribeImpostorSession(sessionId, cb) {
  const r = ref(db, `sessions/${sessionId}/meta`)
  onValue(r, snap => cb(snap.val()))
  return () => off(r)
}

export function subscribeImpostorPlayers(sessionId, cb) {
  const r = ref(db, `sessions/${sessionId}/players`)
  onValue(r, snap => {
    const val = snap.val() || {}
    cb(Object.entries(val).map(([id, data]) => ({ id, ...data })))
  })
  return () => off(r)
}

export async function getImpostorMeta(sessionId) {
  const snap = await get(ref(db, `sessions/${sessionId}/meta`))
  return snap.val()
}

export async function assignImpostorRoles(sessionId, playerIds, numImpostors, word) {
  const shuffled = [...playerIds].sort(() => Math.random() - 0.5)
  const impostorSet = new Set(shuffled.slice(0, numImpostors))
  const updates = {}
  for (const id of playerIds) {
    updates[`sessions/${sessionId}/players/${id}/role`] = impostorSet.has(id) ? 'impostor' : 'crewmate'
  }
  updates[`sessions/${sessionId}/meta/word`] = word
  updates[`sessions/${sessionId}/meta/phase`] = 'role_reveal'
  await update(ref(db), updates)
}

export async function resetImpostorGame(sessionId, playerIds) {
  const updates = {
    [`sessions/${sessionId}/meta/phase`]: 'lobby',
    [`sessions/${sessionId}/meta/word`]: null,
  }
  for (const id of playerIds) {
    updates[`sessions/${sessionId}/players/${id}/role`] = null
  }
  await update(ref(db), updates)
}

export async function updateImpostorMeta(sessionId, updates) {
  await update(ref(db, `sessions/${sessionId}/meta`), updates)
}

// ─── PETICIONES ───────────────────────────────────────────────────────────────

export async function createPeticionesSession(hostId) {
  let sessionId, attempts = 0
  while (attempts < 10) {
    sessionId = generateSessionId()
    const metaRef = ref(db, `sessions/${sessionId}/meta`)
    let taken = false
    await runTransaction(metaRef, (existing) => {
      if (existing !== null) { taken = true; return existing }
      return {
        createdAt: Date.now(),
        hostId,
        phase: 'active',
      }
    })
    if (!taken) break
    attempts++
  }
  return sessionId
}

export async function joinPeticionesPlayer(sessionId, uid, name) {
  const playerRef = ref(db, `sessions/${sessionId}/players/${uid}`)
  await set(playerRef, { name, joinedAt: Date.now(), submitted: false })
}

export function subscribePeticionesSession(sessionId, cb, onError) {
  const r = ref(db, `sessions/${sessionId}/meta`)
  onValue(
    r,
    snap => cb(snap.val()),
    err => { console.error('subscribePeticionesSession error:', err); onError?.(err) }
  )
  return () => off(r)
}

export function subscribePeticionesPlayers(sessionId, cb, onError) {
  const r = ref(db, `sessions/${sessionId}/players`)
  onValue(
    r,
    snap => {
      const val = snap.val() || {}
      cb(Object.entries(val).map(([id, data]) => ({ id, ...data })))
    },
    err => { console.error('subscribePeticionesPlayers error:', err); onError?.(err) }
  )
  return () => off(r)
}

export function subscribePeticiones(sessionId, cb, onError) {
  const r = ref(db, `sessions/${sessionId}/petitions`)
  onValue(
    r,
    snap => {
      const val = snap.val() || {}
      cb(
        Object.entries(val)
          .map(([id, data]) => ({ id, ...data }))
          .sort((a, b) => a.submittedAt - b.submittedAt)
      )
    },
    err => { console.error('subscribePeticiones error:', err); onError?.(err) }
  )
  return () => off(r)
}

export async function submitPeticion(sessionId, uid, name, text, anonymous = false) {
  await set(
    ref(db, `sessions/${sessionId}/petitions/${uid}`),
    { name, text, submittedAt: Date.now(), anonymous: !!anonymous }
  )
  await update(
    ref(db, `sessions/${sessionId}/players/${uid}`),
    { submitted: true }
  )
}

export async function getPeticionesMeta(sessionId) {
  const snap = await get(ref(db, `sessions/${sessionId}/meta`))
  return snap.val()
}

// Sattolo's algorithm — produces a single-cycle permutation, which has no
// fixed points for n >= 2 (i.e. a derangement: nobody gets their own petition).
function derangePermutation(n) {
  if (n < 2) return null
  const p = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * i)
    ;[p[i], p[j]] = [p[j], p[i]]
  }
  return p
}

export async function assignPetitions(sessionId, recipientUids) {
  const snap = await get(ref(db, `sessions/${sessionId}/petitions`))
  const petitions = snap.val() || {}
  const valid = recipientUids.filter(uid => petitions[uid])
  if (valid.length < 2) throw new Error('Se necesitan al menos 2 peticiones para asignar')

  const perm = derangePermutation(valid.length)
  const assignments = {}
  for (let i = 0; i < valid.length; i++) {
    const recipient = valid[i]
    const source = petitions[valid[perm[i]]]
    assignments[recipient] = source.anonymous
      ? { text: source.text, anonymous: true }
      : { name: source.name, text: source.text, anonymous: false }
  }

  await set(ref(db, `sessions/${sessionId}/assignments`), assignments)
  await update(ref(db, `sessions/${sessionId}/meta`), { phase: 'assigned' })
}

export function subscribePeticionAssignment(sessionId, uid, cb, onError) {
  const r = ref(db, `sessions/${sessionId}/assignments/${uid}`)
  onValue(
    r,
    snap => cb(snap.val()),
    err => { console.error('subscribePeticionAssignment error:', err); onError?.(err) }
  )
  return () => off(r)
}

// ─── LOTERÍA ──────────────────────────────────────────────────────────────────
// Estructura en Firebase:
//   meta    { game:'loteria', phase, patterns[], round, drawnCount, winner }
//   deck    [54 ids barajados]  — sólo lo lee el moderador
//   drawn   { 0: id, 1: id… }   — cartas ya cantadas, en orden
//   players { uid: { name, isHost, board[16], marks{} } }

export async function createLoteriaSession(hostId, config) {
  let sessionId, attempts = 0
  while (attempts < 10) {
    sessionId = generateSessionId()
    const metaRef = ref(db, `sessions/${sessionId}/meta`)
    let taken = false
    await runTransaction(metaRef, (existing) => {
      if (existing !== null) { taken = true; return existing }
      return {
        createdAt: Date.now(),
        hostId,
        game: 'loteria',
        phase: 'lobby',
        patterns: config.patterns,
        round: 1,
        drawnCount: 0,
        winner: null,
      }
    })
    if (!taken) break
    attempts++
  }
  return sessionId
}

export async function joinLoteriaPlayer(sessionId, uid, name, isHost = false) {
  await set(ref(db, `sessions/${sessionId}/players/${uid}`), {
    name,
    joinedAt: Date.now(),
    isHost,
    board: null,
    marks: null,
  })
}

export function subscribeLoteriaSession(sessionId, cb) {
  const r = ref(db, `sessions/${sessionId}/meta`)
  onValue(r, snap => cb(snap.val()))
  return () => off(r)
}

export function subscribeLoteriaPlayers(sessionId, cb) {
  const r = ref(db, `sessions/${sessionId}/players`)
  onValue(r, snap => {
    const val = snap.val() || {}
    cb(Object.entries(val).map(([id, data]) => ({ id, ...data })))
  })
  return () => off(r)
}

// Cartas ya cantadas, en orden de salida. Los jugadores la usan sólo para
// validar su "¡Lotería!"; su pantalla nunca la muestra.
export function subscribeLoteriaDrawn(sessionId, cb) {
  const r = ref(db, `sessions/${sessionId}/drawn`)
  onValue(r, snap => {
    const val = snap.val()
    cb(Array.isArray(val) ? val.filter(v => v != null) : Object.values(val || {}))
  })
  return () => off(r)
}

export async function getLoteriaMeta(sessionId) {
  const snap = await get(ref(db, `sessions/${sessionId}/meta`))
  return snap.val()
}

/** El mazo barajado de la ronda en curso (lo recupera el moderador al recargar). */
export async function getLoteriaDeck(sessionId) {
  const snap = await get(ref(db, `sessions/${sessionId}/deck`))
  return snap.val() || []
}

/**
 * Arranca una ronda: baraja el mazo, reparte una tabla distinta a cada jugador
 * y limpia marcas, cantadas y ganador. Sirve tanto para la primera partida como
 * para "Nueva ronda" — en ese caso se pasa el número de ronda siguiente.
 */
// Runs a write and, if the database refuses it, re-throws tagged with what was
// being written. A bare "permission denied" doesn't say which node was
// rejected, which is the difference between a fixable report and a dead end.
async function stage(label, run) {
  try {
    await run()
  } catch (e) {
    const err = new Error(`${label} · ${e?.code || e?.message || e}`)
    err.code = e?.code
    err.stage = label
    throw err
  }
}

export async function startLoteriaRound(sessionId, deck, boards, round) {
  // This used to be one atomic multi-path update. When the database refused a
  // single path the whole round silently failed to start, and nothing said
  // which path it was. Writing in stages names the one that fails.
  //
  // The phase flip goes last on purpose: if any earlier write is refused the
  // room stays in the lobby rather than landing in a half-started round.
  await stage('mazo', () => set(ref(db, `sessions/${sessionId}/deck`), deck))
  await stage('cantadas', () => remove(ref(db, `sessions/${sessionId}/drawn`)))
  await stage('reclamos', () => remove(ref(db, `sessions/${sessionId}/claims`)))

  for (const [playerId, board] of Object.entries(boards)) {
    await stage('tablas', () =>
      update(ref(db, `sessions/${sessionId}/players/${playerId}`), { board, marks: null })
    )
  }

  await stage('estado de la ronda', () =>
    update(ref(db, `sessions/${sessionId}/meta`), {
      phase: 'active',
      round,
      drawnCount: 0,
      winner: null,
    })
  )
}

/** Canta la siguiente carta del mazo. index es cuántas se habían cantado ya. */
export async function drawLoteriaCard(sessionId, index, cardId) {
  // Writing from the root ref was refused where the same data written under
  // its own path is accepted, so each write is scoped to the node it touches.
  // The card lands before the counter: moderators and players both read the
  // drawn list itself, so a refused counter can't lose a called card.
  await stage('la carta cantada', () =>
    set(ref(db, `sessions/${sessionId}/drawn/${index}`), cardId)
  )
  await stage('el contador de cantadas', () =>
    update(ref(db, `sessions/${sessionId}/meta`), { drawnCount: index + 1 })
  )
}

/** Marca o desmarca una casilla de la tabla del jugador. */
export async function setLoteriaMark(sessionId, uid, index, marked) {
  await set(ref(db, `sessions/${sessionId}/players/${uid}/marks/${index}`), marked ? true : null)
}

/**
 * Declara ganador. Usa una transacción para que si dos jugadores cantan
 * "¡Lotería!" casi al mismo tiempo, sólo el primero se quede con la victoria.
 */
export async function declareLoteriaWinner(sessionId, uid, name, pattern) {
  const winnerRef = ref(db, `sessions/${sessionId}/meta/winner`)
  const result = await runTransaction(winnerRef, (existing) => {
    if (existing) return existing
    return { uid, name, pattern, at: Date.now() }
  })
  const winner = result.snapshot.val()
  if (winner?.uid === uid) {
    await update(ref(db, `sessions/${sessionId}/meta`), { phase: 'won' })
  }
  return winner
}

export async function updateLoteriaMeta(sessionId, updates) {
  await update(ref(db, `sessions/${sessionId}/meta`), updates)
}
