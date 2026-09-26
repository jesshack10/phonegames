import { cardGradient } from '../../data/loteria.js'
import { findCard } from '../../utils/loteria.js'

/**
 * Una carta de la baraja. size:
 *   'xl' — la carta que canta el moderador
 *   'md' — casilla de la tabla del jugador
 *   'sm' — miniatura del historial de cantadas
 */
export function LoteriaCard({ id, deck, size = 'md', marked = false, dimmed = false, highlight = false, onClick }) {
  const card = findCard(deck, id)
  if (!card) return null

  // Las barajas temáticas traen nombres mucho más largos que la tradicional
  // ("La Inteligencia Artificial" contra "El Gallo"), así que en la tabla el
  // texto se encoge según lo que mida en vez de recortarse a media palabra.
  const len = card.name.length
  const mdName = len > 18 ? 'text-[8px]' : len > 12 ? 'text-[9px]' : 'text-[10px]'

  const S = {
    xl: { box: 'rounded-3xl p-6 gap-2', emoji: 'text-8xl', name: 'text-2xl', num: 'text-sm', bean: 'w-1/4' },
    md: { box: 'rounded-xl p-1 gap-0.5', emoji: len > 12 ? 'text-2xl' : 'text-3xl', name: `${mdName} leading-[1.1] break-words line-clamp-3`, num: 'text-[10px]', bean: 'w-[34%]' },
    sm: { box: 'rounded-lg p-1 gap-0', emoji: 'text-xl', name: 'hidden', num: 'text-[8px]', bean: 'w-[38%]' },
  }[size]

  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag
      onClick={onClick}
      className={`relative w-full aspect-[3/4] flex flex-col items-center justify-center text-center overflow-hidden
        bg-gradient-to-br ${cardGradient(card.id)} ${S.box}
        ${marked ? 'ring-[3px] ring-inset ring-red-400' : ''}
        ${highlight && !marked ? 'ring-[3px] ring-amber-300 animate-pulse' : ''}
        ${dimmed ? 'opacity-40' : ''}
        ${onClick ? 'active:scale-95 transition-transform' : ''}`}
    >
      {/* El frijolito tiñe la carta pero no la esconde: el jugador tiene que
          poder repasar su tabla y ver qué fue lo que marcó. */}
      {marked && <span className="absolute inset-0 bg-red-700/45" />}

      <span className={`absolute top-0.5 left-1 z-10 font-bold ${marked ? 'text-white/80' : 'text-white/50'} ${S.num}`}>{card.id}</span>
      <span className={`z-10 ${S.emoji}`}>{card.emoji}</span>
      <span className={`z-10 font-bold text-white drop-shadow ${S.name}`}>{card.name}</span>

      {marked && (
        <span
          className={`absolute bottom-1 right-1 z-10 ${S.bean} aspect-square rounded-full bg-red-600 border-2 border-red-200 shadow-lg`}
        />
      )}
    </Tag>
  )
}

/** Hueco vacío del mismo tamaño que una carta (mazo aún sin cantar). */
export function LoteriaCardPlaceholder({ label = '🃏' }) {
  return (
    <div className="w-full aspect-[3/4] rounded-3xl border-2 border-dashed border-white/15 flex items-center justify-center text-5xl opacity-40">
      {label}
    </div>
  )
}
