import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  subscribeLoteriaSession,
  subscribeLoteriaPlayers,
  setLoteriaMark,
  declareLoteriaWinner,
  SESSION_TTL,
} from '../../firebase/session.js'
import { useAuth } from '../../hooks/useAuth.js'
import { LoteriaBoard } from '../../components/loteria/LoteriaBoard.jsx'
import { checkWin, normalizeDrawn, PATTERNS } from '../../utils/loteria.js'
import { resolveDeck } from '../../data/decks/index.js'

function buzz(ms) {
  try { navigator.vibrate?.(ms) } catch {}
}

export default function LoteriaJugar() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { uid } = useAuth()
  const [meta, setMeta] = useState(null)
  const [players, setPlayers] = useState([])
  const [marks, setMarks] = useState({})
  const [falseAlarm, setFalseAlarm] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const sessionExistedRef = useRef(false)
  const seededRoundRef = useRef(null)
  const alarmTimerRef = useRef(null)

  const storageKey = `lot_${sessionId}`

  useEffect(() => {
    const u1 = subscribeLoteriaSession(sessionId, setMeta)
    const u2 = subscribeLoteriaPlayers(sessionId, setPlayers)
    return () => { u1(); u2() }
  }, [sessionId])

  useEffect(() => () => clearTimeout(alarmTimerRef.current), [])

  // Llega dentro de meta; la pantalla nunca la muestra, sólo valida con ella.
  const drawn = normalizeDrawn(meta?.drawn)
  const deck = resolveDeck(meta)
  const me = players.find(p => p.id === uid)
  const board = me?.board
  const round = meta?.round ?? 1
  const patterns = meta?.patterns ?? ['full']
  const winner = meta?.winner
  const iWon = winner?.uid === uid

  // Sin registro local no debería estar aquí: mándalo a la pantalla de entrada
  useEffect(() => {
    if (!localStorage.getItem(storageKey)) {
      navigate(`/loteria/sala/${sessionId}`, { replace: true })
    }
  }, [storageKey, sessionId, navigate])

  useEffect(() => {
    if (meta) {
      sessionExistedRef.current = true
      if (meta.phase === 'ended' || Date.now() - meta.createdAt > SESSION_TTL) {
        navigate('/', { replace: true })
        return
      }
      if (meta.phase === 'lobby') navigate(`/loteria/sala/${sessionId}`, { replace: true })
    } else if (sessionExistedRef.current) {
      localStorage.removeItem(storageKey)
      navigate('/', { replace: true })
    }
  }, [meta, navigate, sessionId, storageKey])

  // Siembra las marcas desde Firebase una vez por ronda: así un refresco no
  // pierde lo marcado, pero las marcas locales mandan mientras juegas.
  useEffect(() => {
    if (!me || !board) return
    if (seededRoundRef.current === round) return
    seededRoundRef.current = round
    setMarks(me.marks || {})
    setFalseAlarm(false)
  }, [me, board, round])

  function handleToggle(i) {
    if (winner) return
    const next = { ...marks }
    if (next[i]) delete next[i]
    else next[i] = true
    setMarks(next)
    buzz(10)
    setLoteriaMark(sessionId, uid, i, !!next[i]).catch(() => {})
  }

  async function handleClaim() {
    if (claiming || winner || !board) return
    setClaiming(true)
    const pattern = checkWin(board, marks, drawn, patterns)
    if (!pattern) {
      buzz([40, 60, 40])
      setFalseAlarm(true)
      clearTimeout(alarmTimerRef.current)
      alarmTimerRef.current = setTimeout(() => setFalseAlarm(false), 3000)
      setClaiming(false)
      return
    }
    buzz([30, 40, 30, 40, 120])
    try {
      await declareLoteriaWinner(sessionId, uid, me?.name ?? 'Jugador', pattern)
    } catch {
      setFalseAlarm(true)
    } finally {
      setClaiming(false)
    }
  }

  function handleLeave() {
    localStorage.removeItem(storageKey)
    navigate('/loteria', { replace: true })
  }

  if (!meta || !board) {
    return (
      <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        <p className="text-white/40 text-sm">Repartiendo tu tabla…</p>
      </div>
    )
  }

  const markedCount = Object.keys(marks).length

  // ── Ganador ────────────────────────────────────────────────────────────────
  if (winner) {
    return (
      <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center px-6 py-10 gap-5">
        <div className="text-7xl mt-8">{iWon ? '🏆' : '🃏'}</div>
        <h1 className="text-white text-3xl font-black text-center">
          {iWon ? '¡GANASTE!' : `¡${winner.name} ganó!`}
        </h1>
        <p className="text-amber-300 font-semibold">
          {PATTERNS[winner.pattern]?.label ?? winner.pattern}
        </p>
        <p className="text-white/40 text-sm text-center">
          Espera a que el moderador reparta la siguiente ronda
        </p>

        <div className="w-full max-w-sm mt-2 opacity-60 pointer-events-none">
          <LoteriaBoard board={board} deck={deck} marks={marks} disabled />
        </div>

        <div className="flex gap-1 mt-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-white/30 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    )
  }

  // ── Jugando ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center px-4 py-5 gap-3">
      <div className="w-full max-w-sm flex items-center justify-between">
        <span className="text-white/40 text-xs uppercase tracking-widest">Ronda {round}</span>
        <span className="text-white/40 text-xs">{markedCount}/16 marcadas</span>
      </div>

      <div className="flex flex-wrap gap-1.5 justify-center">
        {patterns.map(k => (
          <span key={k} className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            {PATTERNS[k]?.label ?? k}
          </span>
        ))}
      </div>

      <div className="w-full max-w-sm">
        <LoteriaBoard board={board} deck={deck} marks={marks} onToggle={handleToggle} />
      </div>

      {falseAlarm && (
        <div className="w-full max-w-sm rounded-2xl bg-red-500/15 border border-red-500/40 px-4 py-3 text-center">
          <p className="text-red-300 font-bold">¡Falsa alarma!</p>
          <p className="text-red-300/70 text-xs mt-0.5">
            Todavía no completas ningún patrón con cartas cantadas
          </p>
        </div>
      )}

      <button
        onClick={handleClaim}
        disabled={claiming}
        className="w-full max-w-sm py-5 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 active:from-amber-500 active:to-orange-700 text-white font-black text-2xl tracking-widest shadow-lg shadow-amber-500/30 disabled:opacity-50 transition-colors"
      >
        ¡LOTERÍA!
      </button>

      <button
        onClick={handleLeave}
        className="text-white/30 text-sm py-2"
      >
        Salir del juego
      </button>
    </div>
  )
}
