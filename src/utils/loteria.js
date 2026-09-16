import { LOTERIA_CARDS, TOTAL_CARDS } from '../data/loteria.js'

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

/** A freshly shuffled deck of all 54 card ids. */
export function buildDeck() {
  return shuffle(LOTERIA_CARDS.map(c => c.id))
}

/** A random 4x4 board: 16 distinct card ids out of the 54. */
export function generateBoard() {
  return shuffle(LOTERIA_CARDS.map(c => c.id)).slice(0, BOARD_SIZE)
}

/** One distinct random board per player id, as a { [playerId]: number[] } map. */
export function dealBoards(playerIds) {
  const boards = {}
  for (const id of playerIds) boards[id] = generateBoard()
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

export { TOTAL_CARDS }
