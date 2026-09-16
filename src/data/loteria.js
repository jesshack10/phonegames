// ─── Baraja tradicional de Lotería Mexicana (54 cartas) ──────────────────────
// Cada carta conserva su número y nombre canónicos del mazo clásico; el emoji
// es la representación visual que se pinta en el tablero y en el mazo.

export const LOTERIA_CARDS = [
  { id: 1,  name: 'El Gallo',        emoji: '🐓' },
  { id: 2,  name: 'El Diablito',     emoji: '😈' },
  { id: 3,  name: 'La Dama',         emoji: '👩' },
  { id: 4,  name: 'El Catrín',       emoji: '🎩' },
  { id: 5,  name: 'El Paraguas',     emoji: '☂️' },
  { id: 6,  name: 'La Sirena',       emoji: '🧜‍♀️' },
  { id: 7,  name: 'La Escalera',     emoji: '🪜' },
  { id: 8,  name: 'La Botella',      emoji: '🍾' },
  { id: 9,  name: 'El Barril',       emoji: '🛢️' },
  { id: 10, name: 'El Árbol',        emoji: '🌳' },
  { id: 11, name: 'El Melón',        emoji: '🍈' },
  { id: 12, name: 'El Valiente',     emoji: '🗡️' },
  { id: 13, name: 'El Gorrito',      emoji: '👒' },
  { id: 14, name: 'La Muerte',       emoji: '💀' },
  { id: 15, name: 'La Pera',         emoji: '🍐' },
  { id: 16, name: 'La Bandera',      emoji: '🇲🇽' },
  { id: 17, name: 'El Bandolón',     emoji: '🪕' },
  { id: 18, name: 'El Violoncello',  emoji: '🎻' },
  { id: 19, name: 'La Garza',        emoji: '🦩' },
  { id: 20, name: 'El Pájaro',       emoji: '🐦' },
  { id: 21, name: 'La Mano',         emoji: '✋' },
  { id: 22, name: 'La Bota',         emoji: '👢' },
  { id: 23, name: 'La Luna',         emoji: '🌙' },
  { id: 24, name: 'El Cotorro',      emoji: '🦜' },
  { id: 25, name: 'El Borracho',     emoji: '🍺' },
  { id: 26, name: 'El Negrito',      emoji: '🎭' },
  { id: 27, name: 'El Corazón',      emoji: '❤️' },
  { id: 28, name: 'La Sandía',       emoji: '🍉' },
  { id: 29, name: 'El Tambor',       emoji: '🥁' },
  { id: 30, name: 'El Camarón',      emoji: '🦐' },
  { id: 31, name: 'Las Jaras',       emoji: '🏹' },
  { id: 32, name: 'El Músico',       emoji: '🎺' },
  { id: 33, name: 'La Araña',        emoji: '🕷️' },
  { id: 34, name: 'El Soldado',      emoji: '💂' },
  { id: 35, name: 'La Estrella',     emoji: '⭐' },
  { id: 36, name: 'El Cazo',         emoji: '🍲' },
  { id: 37, name: 'El Mundo',        emoji: '🌎' },
  { id: 38, name: 'El Apache',       emoji: '🪶' },
  { id: 39, name: 'El Nopal',        emoji: '🌵' },
  { id: 40, name: 'El Alacrán',      emoji: '🦂' },
  { id: 41, name: 'La Rosa',         emoji: '🌹' },
  { id: 42, name: 'La Calavera',     emoji: '☠️' },
  { id: 43, name: 'La Campana',      emoji: '🔔' },
  { id: 44, name: 'El Cantarito',    emoji: '🏺' },
  { id: 45, name: 'El Venado',       emoji: '🦌' },
  { id: 46, name: 'El Sol',          emoji: '☀️' },
  { id: 47, name: 'La Corona',       emoji: '👑' },
  { id: 48, name: 'La Chalupa',      emoji: '🛶' },
  { id: 49, name: 'El Pino',         emoji: '🌲' },
  { id: 50, name: 'El Pescado',      emoji: '🐟' },
  { id: 51, name: 'La Palma',        emoji: '🌴' },
  { id: 52, name: 'La Maceta',       emoji: '🪴' },
  { id: 53, name: 'El Arpa',         emoji: '🎼' },
  { id: 54, name: 'La Rana',         emoji: '🐸' },
]

export const TOTAL_CARDS = LOTERIA_CARDS.length

const BY_ID = new Map(LOTERIA_CARDS.map(c => [c.id, c]))

/** Look up a card by its number. Returns undefined for unknown ids. */
export function getCard(id) {
  return BY_ID.get(id)
}

// Tailwind gradient pairs cycled by card id so the deck looks colorful and
// each card keeps the same color across every screen and every round.
const PALETTE = [
  'from-rose-500 to-rose-700',
  'from-amber-500 to-orange-700',
  'from-emerald-500 to-emerald-700',
  'from-sky-500 to-blue-700',
  'from-violet-500 to-purple-700',
  'from-pink-500 to-fuchsia-700',
  'from-teal-500 to-cyan-700',
  'from-lime-500 to-green-700',
  'from-indigo-500 to-indigo-700',
]

/** Stable gradient classes for a card number. */
export function cardGradient(id) {
  return PALETTE[(id - 1) % PALETTE.length]
}
