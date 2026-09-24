import { BOARD_SIZE } from '../../utils/loteria.js'

export const CUSTOM_DECK_ID = 'custom'
export const MIN_CUSTOM_CARDS = BOARD_SIZE   // una tabla son 16 casillas distintas
export const MAX_CUSTOM_CARDS = 80           // el mazo viaja dentro de meta

// Cuando el nombre no trae emoji se le asigna uno de estos, por posición, para
// que la tabla no quede como una lista de texto. Son deliberadamente neutros:
// la baraja la escribe quien juega y no sabemos de qué va.
const GENERIC = [
  '⭐', '🌟', '💫', '🔥', '💧', '🍀', '🌈', '🎈', '🎲', '🎯',
  '🎵', '🔔', '🕯️', '🧩', '🪁', '🎨', '🌻', '🌵', '🍁', '🐚',
  '🦋', '🐝', '🐞', '🌙', '☀️', '⛅', '❄️', '⚡', '🌊', '🏔️',
  '🚲', '⛵', '🎁', '🔑', '📷', '📚', '✏️', '🧭', '⏰', '💡',
  '🪙', '🔮', '🏆', '🎪', '🍎', '🍋', '🍇', '🥕', '🍿', '☕',
  '🧶', '🪕', '🛎️', '🪞', '🧸', '🪴', '🕊️', '🐳', '🦊', '🦉',
  '🐢', '🦜', '🌺', '🍄', '🪺', '🧊', '🪐', '🛼', '🪄', '🎺',
  '🥁', '🪀', '🧵', '🔭', '🪶', '🍒', '🌶️', '🥨', '🧁', '🍯',
]

// Emoji al inicio o al final del renglón: "🌮 El Taco" o "El Taco 🌮".
const EDGE_EMOJI = /^(\p{Extended_Pictographic}[\p{Emoji_Modifier}‍️\p{Extended_Pictographic}]*)\s*|\s*(\p{Extended_Pictographic}[\p{Emoji_Modifier}‍️\p{Extended_Pictographic}]*)$/gu

function splitEmoji(raw) {
  let emoji = null
  const name = raw.replace(EDGE_EMOJI, (_, lead, trail) => {
    emoji = emoji ?? lead ?? trail
    return ''
  }).trim()
  return { name, emoji }
}

/**
 * Convierte lo que se pegó en una baraja. Acepta comas o saltos de línea, y
 * respeta el emoji que venga escrito; al resto le pone uno.
 *
 * Devuelve { cards, error } — error en español, listo para mostrar.
 */
export function parseCustomDeck(text) {
  const raw = String(text || '')
    .split(/[,\n]/)
    .map(s => s.trim())
    .filter(Boolean)

  const seen = new Set()
  const cards = []
  for (const item of raw) {
    const { name, emoji } = splitEmoji(item)
    if (!name) continue
    const key = name.toLocaleLowerCase('es')
    if (seen.has(key)) continue   // repetidas se ignoran: una tabla necesita cartas distintas
    seen.add(key)
    cards.push({
      id: cards.length + 1,
      name: name.slice(0, 28),
      emoji: emoji || GENERIC[cards.length % GENERIC.length],
    })
    if (cards.length >= MAX_CUSTOM_CARDS) break
  }

  if (cards.length < MIN_CUSTOM_CARDS) {
    return { cards, error: `Faltan cartas: llevas ${cards.length} y se necesitan al menos ${MIN_CUSTOM_CARDS}.` }
  }
  return { cards, error: null }
}
