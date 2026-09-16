import { getCard, cardGradient } from '../../data/loteria.js'

/**
 * Una carta de la baraja. size:
 *   'xl' — la carta que canta el moderador
 *   'md' — casilla de la tabla del jugador
 *   'sm' — miniatura del historial de cantadas
 */
export function LoteriaCard({ id, size = 'md', marked = false, dimmed = false, onClick }) {
  const card = getCard(id)
  if (!card) return null

  const S = {
    xl: { box: 'rounded-3xl p-6 gap-2', emoji: 'text-8xl', name: 'text-2xl', num: 'text-sm' },
    md: { box: 'rounded-xl p-1.5 gap-0.5', emoji: 'text-3xl', name: 'text-[10px] leading-tight', num: 'text-[9px]' },
    sm: { box: 'rounded-lg p-1 gap-0', emoji: 'text-xl', name: 'hidden', num: 'text-[8px]' },
  }[size]

  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag
      onClick={onClick}
      className={`relative w-full aspect-[3/4] flex flex-col items-center justify-center text-center overflow-hidden
        bg-gradient-to-br ${cardGradient(card.id)} ${S.box}
        ${dimmed ? 'opacity-40' : ''}
        ${onClick ? 'active:scale-95 transition-transform' : ''}`}
    >
      <span className={`absolute top-0.5 left-1 font-bold text-white/50 ${S.num}`}>{card.id}</span>
      <span className={S.emoji}>{card.emoji}</span>
      <span className={`font-bold text-white drop-shadow ${S.name}`}>{card.name}</span>

      {marked && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/45">
          <span className="w-[62%] aspect-square rounded-full bg-red-600 border-[3px] border-red-300 shadow-lg" />
        </span>
      )}
    </Tag>
  )
}

/** Hueco vacío del mismo tamaño que una carta (mazo aún sin cantar). */
export function LoteriaCardPlaceholder({ label = '🎴' }) {
  return (
    <div className="w-full aspect-[3/4] rounded-3xl border-2 border-dashed border-white/15 flex items-center justify-center text-5xl opacity-40">
      {label}
    </div>
  )
}
