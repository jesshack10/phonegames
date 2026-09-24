
export const BOARD_COLS = 4
export const BOARD_ROWS = 4
export const BOARD_SIZE = BOARD_COLS * BOARD_ROWS // 16

// ─── Patrones ganadores ──────────────────────────────────────────────────────
// Cada patrón es una lista de combinaciones; basta completar UNA de ellas.
// Los índices recorren la tabla de izquierda a derecha y de arriba a abajo.

const ROWS = [
  [0, 1, 2, 3],
  [4, 5, 6, 7],
  [8, 9, 10, 11],
  [12, 13, 14, 15],
]
const COLS = [
  [0, 4, 8, 12],
  [1, 5, 9, 13],
  [2, 6, 10, 14],
  [3, 7, 11, 15],
]
const DIAGONALS = [
  [0, 5, 10, 15],
  [3, 6, 9, 12],
]

export const PATTERNS = {
  full:    { label: 'Tabla llena',  short: 'Llena',   emoji: '🟪', combos: [Array.from({ length: BOARD_SIZE }, (_, i) => i)] },
  line:    { label: 'Línea',        short: 'Línea',   emoji: '➖', combos: [...ROWS, ...COLS, ...DIAGONALS] },
  corners: { label: 'Cuatro esquinas', short: 'Esquinas', emoji: '⬜', combos: [[0, 3, 12, 15]] },
  center:  { label: 'Centro',       short: 'Centro',  emoji: '⏹️', combos: [[5, 6, 9, 10]] },
}

export const PATTERN_KEYS = ['full', 'line', 'corners', 'center']

/** Human label for a pattern key, safe for unknown keys. */
export function patternLabel(key) {
  return PATTERNS[key]?.label ?? key
}

// ─── Mazo y tablas ───────────────────────────────────────────────────────────

/** Fisher–Yates — returns a new shuffled copy, leaving the input untouched. */
export function shuffle(arr) {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * The next card to call: uniformly random among those not called yet.
 *
 * There is deliberately no stored deck. Drawing from what's left gives the
 * same distribution as shuffling upfront, and leaves nothing for a player's
 * device to read ahead — the next card doesn't exist until it's called.
 * Returns null once all 54 are out.
 */
export function pickNextCard(deck, drawnIds) {
  const drawn = drawnIds instanceof Set ? drawnIds : new Set(drawnIds || [])
  const remaining = (deck?.cards ?? []).map(c => c.id).filter(id => !drawn.has(id))
  if (!remaining.length) return null
  return remaining[Math.floor(Math.random() * remaining.length)]
}

/**
 * Firebase hands back a list as an array when its keys run 0..n and as an
 * object otherwise. Callers just want the called cards in order.
 */
export function normalizeDrawn(value) {
  if (Array.isArray(value)) return value.filter(v => v != null)
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort((a, b) => Number(a) - Number(b))
      .map(k => value[k])
      .filter(v => v != null)
  }
  return []
}

/** A random 4x4 board: 16 distinct card ids from the room's deck. */
export function generateBoard(deck) {
  return shuffle((deck?.cards ?? []).map(c => c.id)).slice(0, BOARD_SIZE)
}

/** One distinct random board per player id, as a { [playerId]: number[] } map. */
export function dealBoards(deck, playerIds) {
  const boards = {}
  for (const id of playerIds) boards[id] = generateBoard(deck)
  return boards
}

// ─── Validación de "¡Lotería!" ───────────────────────────────────────────────

/**
 * Check a claim. A combo only counts when every one of its cells is marked by
 * the player AND the card sitting in that cell has actually been called — so a
 * player who marks ahead of the moderator gets a false alarm, not a win.
 *
 * board       — array of 16 card ids
 * marks       — { [boardIndex]: true } as stored in Firebase
 * drawnIds    — array (or Set) of card ids already called
 * patternKeys — which patterns are in play this round
 *
 * Returns the winning pattern key, or null if the claim doesn't hold up.
 */
export function checkWin(board, marks, drawnIds, patternKeys) {
  if (!Array.isArray(board) || board.length < BOARD_SIZE) return null
  const drawn = drawnIds instanceof Set ? drawnIds : new Set(drawnIds || [])
  const marked = marks || {}

  for (const key of patternKeys || []) {
    const pattern = PATTERNS[key]
    if (!pattern) continue
    for (const combo of pattern.combos) {
      if (combo.every(i => marked[i] && drawn.has(board[i]))) return key
    }
  }
  return null
}

/** Cuántas cartas trae la baraja de esta sala. */
export function deckSize(deck) {
  return deck?.cards?.length ?? 0
}

/** La carta con ese id dentro de la baraja dada. */
export function findCard(deck, cardId) {
  return deck?.cards?.find(c => c.id === cardId)
}

// ─── Equipos ─────────────────────────────────────────────────────────────────

export const TEAMS = [
  { id: 0, name: 'Rojo',     emoji: '🔴', chip: 'bg-red-500/20 border-red-500/50 text-red-200' },
  { id: 1, name: 'Azul',     emoji: '🔵', chip: 'bg-blue-500/20 border-blue-500/50 text-blue-200' },
  { id: 2, name: 'Verde',    emoji: '🟢', chip: 'bg-green-500/20 border-green-500/50 text-green-200' },
  { id: 3, name: 'Amarillo', emoji: '🟡', chip: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-200' },
]

export const MIN_TEAMS = 2
export const MAX_TEAMS = TEAMS.length

export function teamInfo(teamId) {
  return TEAMS[teamId] ?? null
}

/** Reparte a los jugadores en equipos parejos, barajando primero. */
export function assignTeamsRandomly(playerIds, teamCount) {
  const n = Math.min(Math.max(teamCount || MIN_TEAMS, MIN_TEAMS), MAX_TEAMS)
  const shuffled = shuffle(playerIds)
  const teams = {}
  shuffled.forEach((id, i) => { teams[id] = i % n })
  return teams
}

/**
 * ¿Ganó el equipo? Con 'first' basta quien cantó; con 'all' todos los del
 * equipo tienen que tener el patrón completo y marcado.
 *
 * players — la lista completa de la sala, con board y marks
 */
export function checkTeamWin(players, teamId, drawnIds, patternKeys, rule) {
  const members = (players || []).filter(p => p.team === teamId && Array.isArray(p.board))
  if (!members.length) return false
  if (rule !== 'all') return true
  return members.every(p => checkWin(p.board, p.marks, drawnIds, patternKeys))
}

/** Con quién comparte marcador: su equipo, o él mismo si se juega individual. */
export function scoreKeyFor(mode, uid, teamId) {
  return mode === 'teams' && teamId != null ? `t${teamId}` : uid
}

// ─── Matrimonios ─────────────────────────────────────────────────────────────
// En este modo el jugador no es la persona: es el matrimonio. Los dos celulares
// ven la misma tabla y ganan juntos, así que todo lo de abajo trabaja con la
// pareja como unidad y sólo baja a la persona para decidir a quién le toca
// escribir y a quién adivinar.

/**
 * El identificador de una pareja. Se ordenan los dos uid antes de unirlos para
 * que los dos teléfonos lleguen a la misma clave sin ponerse de acuerdo.
 */
export function coupleId(a, b) {
  return [a, b].sort().join('~')
}

/**
 * Las parejas confirmadas de la sala. Una pareja existe sólo cuando los dos se
 * escogieron: si A escogió a B pero B todavía no, no hay pareja — así nadie
 * queda emparejado por error con quien tocó primero la pantalla.
 */
export function couplesFrom(players) {
  const byId = new Map((players || []).map(p => [p.id, p]))
  const seen = new Set()
  const out = []
  for (const p of players || []) {
    if (p.isHost || !p.pair || seen.has(p.id)) continue
    const other = byId.get(p.pair)
    if (!other || other.isHost || other.pair !== p.id) continue
    seen.add(p.id)
    seen.add(other.id)
    const [a, b] = [p, other].sort((x, y) => (x.id < y.id ? -1 : 1))
    out.push({ id: coupleId(a.id, b.id), a: a.id, b: b.id, names: `${a.name} y ${b.name}`, members: [a, b] })
  }
  return out
}

/** La pareja a la que pertenece este uid, o null si todavía no tiene. */
export function coupleOf(players, uid) {
  return couplesFrom(players).find(c => c.a === uid || c.b === uid) ?? null
}

/**
 * A quién le toca escribir en esta carta. Alterna por número de carta cantada,
 * así que sale de la nada que ya tienen los dos teléfonos: nadie lo escribe en
 * la base y no hay forma de que se desincronicen.
 */
export function writerFor(couple, cardIndex) {
  if (!couple) return null
  return cardIndex % 2 === 0 ? couple.a : couple.b
}

/** Cuánto tiempo hay por carta. 0 es sin límite. */
export const TURN_TIMERS = [0, 30, 60, 90]
export const DEFAULT_TIMER = 0

/** En qué casilla de la tabla cae esta carta, o -1 si no está. */
export function boardIndexOf(board, cardId) {
  return Array.isArray(board) ? board.indexOf(cardId) : -1
}
