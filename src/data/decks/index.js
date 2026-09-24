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
    tagline: 'Cada carta abre una conversación',
    cards: MATRIMONIOS,
    // El moderador lee una pregunta al cantar; la partida es la excusa.
    hasPrompts: true,
  },
}

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
  return getDeck(meta?.deck)
}
