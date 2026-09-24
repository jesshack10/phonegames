import { LoteriaCard } from './LoteriaCard.jsx'
import { BOARD_SIZE } from '../../utils/loteria.js'

/**
 * La tabla 4x4 del jugador.
 *
 * board    — array de 16 ids de carta
 * deckId   — la baraja de la sala, para resolver cada id
 * marks    — { [índice]: true }
 * onToggle — fn(índice) — ausente cuando la tabla es de sólo lectura
 */
export function LoteriaBoard({ board, deckId, marks = {}, onToggle, disabled = false }) {
  if (!Array.isArray(board) || board.length < BOARD_SIZE) return null

  return (
    <div className="grid grid-cols-4 gap-1.5 w-full">
      {board.slice(0, BOARD_SIZE).map((id, i) => (
        <LoteriaCard
          key={`${i}-${id}`}
          id={id}
          deckId={deckId}
          size="md"
          marked={!!marks[i]}
          onClick={disabled || !onToggle ? undefined : () => onToggle(i)}
        />
      ))}
    </div>
  )
}
