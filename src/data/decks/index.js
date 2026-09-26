import { LOTERIA_CARDS } from '../loteria.js'
import { PROGRAMACION } from './programacion.js'
import { BIBLICA } from './biblica.js'
import { COMIDA } from './comida.js'
import { MATRIMONIOS } from './matrimonios.js'

/**
 * Las barajas disponibles. Una carta es { id, name, emoji } y, cuando la baraja
 * está pensada para conversar, además { prompt } — el texto que el moderador
 * lee en voz alta y que sólo aparece en su pantalla.
 *
 * Los ids son únicos dentro de cada baraja, no entre barajas, así que toda
 * búsqueda de carta necesita saber de qué baraja viene. La sala guarda su
 * baraja en meta.deck.
 */
export const DECKS = {
  mexicana: {
    id: 'mexicana',
    name: 'Mexicana',
    emoji: '🃏',
    tagline: 'La tradicional de siempre',
    cards: LOTERIA_CARDS,
  },
  programacion: {
    id: 'programacion',
    name: 'Programación',
    emoji: '💻',
    tagline: 'El Bug, El Deploy, El Café',
    cards: PROGRAMACION,
  },
  biblica: {
    id: 'biblica',
    name: 'Bíblica',
    emoji: '✝️',
    tagline: 'El Arca, El Cordero, El Maná',
    cards: BIBLICA,
  },
  comida: {
    id: 'comida',
    name: 'Comida mexicana',
    emoji: '🌮',
    tagline: 'El Taco, El Mole, El Elote',
    cards: COMIDA,
  },
  matrimonios: {
    id: 'matrimonios',
    name: 'Matrimonios',
    emoji: '💍',
    tagline: 'Adivina a tu pareja: se marca si le atinas',
    cards: MATRIMONIOS,
    // El moderador lee una pregunta al cantar; la partida es la excusa.
    hasPrompts: true,
    // Se juega en parejas con tabla compartida, no uno contra uno. La casilla
    // no se marca a mano: se gana adivinando lo que escribió el otro.
    pairs: true,
    hasNivel: true,
  },
}

// Qué tan hondo entra el mazo. 'ligero' deja fuera las cartas duras; 'profundo'
// las incluye además de las ligeras, no en lugar de ellas — un mazo puro de
// preguntas difíciles se siente interrogatorio, no juego.
export const NIVELES = {
  ligero:   { id: 'ligero',   label: 'Ligero',   emoji: '🙂', hint: 'Recuerdos, risas y antojos' },
  profundo: { id: 'profundo', label: 'Profundo', emoji: '🫀', hint: 'Todo, incluidas las difíciles' },
}
export const DEFAULT_NIVEL = 'ligero'

export const DECK_IDS = Object.keys(DECKS)
export const DEFAULT_DECK = 'mexicana'

/** La baraja de la sala, cayendo en la tradicional si el id no se reconoce. */
export function getDeck(deckId) {
  return DECKS[deckId] ?? DECKS[DEFAULT_DECK]
}

/** Una carta concreta dentro de su baraja. */
export function getDeckCard(deckId, cardId) {
  return getDeck(deckId).cards.find(c => c.id === cardId)
}

/**
 * La baraja con la que se juega esta sala. Una baraja personalizada no está en
 * el registro: la escribió quien creó la sala y viaja dentro de meta, que es el
 * nodo que la base sí deja leer.
 */
export function resolveDeck(meta) {
  if (meta?.deck === 'custom' && Array.isArray(meta.customCards) && meta.customCards.length) {
    return {
      id: 'custom',
      name: meta.customName || 'Personalizada',
      emoji: '✏️',
      tagline: 'Baraja escrita para esta sala',
      cards: meta.customCards,
    }
  }
  const base = getDeck(meta?.deck)
  // El nivel recorta el mazo antes de repartir, así que las tablas, lo que se
  // canta y la búsqueda de una carta ven exactamente la misma lista.
  if (base.hasNivel && meta?.nivel === 'ligero') {
    return { ...base, cards: base.cards.filter(c => c.nivel === 'ligero') }
  }
  return base
}

/** ¿Esta sala se juega por matrimonios, con tabla compartida? */
export function isPairsDeck(meta) {
  return Boolean(resolveDeck(meta)?.pairs)
}

/**
 * ¿Este bundle conoce la baraja de la sala? Un teléfono con una versión vieja
 * en caché no la reconoce y, sin esto, resolveDeck le devolvía la tradicional
 * en silencio: la partida se veía bien pero con las cartas equivocadas.
 */
export function knowsDeck(meta) {
  const id = meta?.deck
  if (!id) return true                       // salas viejas, sin baraja guardada
  if (id === 'custom') return Array.isArray(meta.customCards) && meta.customCards.length > 0
  return Boolean(DECKS[id])
}
