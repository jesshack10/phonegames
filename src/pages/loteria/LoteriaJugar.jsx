import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  subscribeLoteriaSession,
  subscribeLoteriaPlayers,
  setLoteriaMark,
  setCoupleMark,
  setLoteriaTurn,
  patchLoteriaTurn,
  finishLoteriaTurn,
  addLoteriaPoint,
  claimLoteriaWin,
  SESSION_TTL,
} from '../../firebase/session.js'
import { useAuth } from '../../hooks/useAuth.js'
import { LoteriaBoard } from '../../components/loteria/LoteriaBoard.jsx'
import {
  checkWin, normalizeDrawn, checkTeamWin, teamInfo, findCard,
  coupleOf, writerFor, boardIndexOf, PATTERNS,
} from '../../utils/loteria.js'
import { resolveDeck, knowsDeck } from '../../data/decks/index.js'

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
  const [draft, setDraft] = useState('')
  const [turnBusy, setTurnBusy] = useState(false)
  const [now, setNow] = useState(Date.now())
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
  const staleClient = !knowsDeck(meta)
  const me = players.find(p => p.id === uid)
  const round = meta?.round ?? 1
  const patterns = meta?.patterns ?? ['full']
  const winners = Object.entries(meta?.winners ?? {}).map(([id, w]) => ({ id, ...w }))
  const winner = winners[0] ?? null
  const myTeam = meta?.mode === 'teams' ? teamInfo(me?.team) : null

  // ── Matrimonios ────────────────────────────────────────────────────────────
  // Aquí el jugador es la pareja: la tabla y las marcas viven en meta, no en
  // players/{uid}, porque los dos celulares leen y escriben la misma.
  const isPairs = meta?.mode === 'parejas'
  const couple = isPairs ? coupleOf(players, uid) : null
  const pairState = isPairs && couple ? meta?.parejas?.[couple.id] : null
  const board = isPairs ? pairState?.board : me?.board
  const shownMarks = isPairs ? (pairState?.marks ?? {}) : marks

  const cardIndex = drawn.length - 1
  const cardId = cardIndex >= 0 ? drawn[cardIndex] : null
  const card = cardId != null ? findCard(deck, cardId) : null
  const rawTurn = isPairs && couple ? meta?.turnos?.[couple.id] : null
  const turn = rawTurn?.index === cardIndex ? rawTurn : null
  const iAmWriter = isPairs && couple ? writerFor(couple, cardIndex) === uid : false
  const partner = couple?.members.find(m => m.id !== uid) ?? null
  const myCell = boardIndexOf(board, cardId)

  const iWon = isPairs
    ? winners.some(w => w.id === couple?.id)
    : winners.some(w => w.id === uid) ||
      (meta?.mode === 'teams' && me?.team != null && winners.some(w => w.team === me.team))

  // El reloj corre desde meta.drawnAt, el mismo número en todos los teléfonos.
  const timer = meta?.timer ?? 0
  const deadline = timer && meta?.drawnAt ? meta.drawnAt + timer * 1000 : 0
  const secondsLeft = deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : null
  const timeUp = secondsLeft === 0
  useEffect(() => {
    if (!deadline) return
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [deadline])

  // Carta nueva, borrador en blanco: lo que se alcanzó a teclear en la anterior
  // no tiene nada que ver con esta pregunta.
  useEffect(() => { setDraft('') }, [cardIndex])

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
  // pierde lo marcado, pero las marcas locales mandan mientras juegas. En
  // matrimonios no aplica: ahí las marcas siempre vienen de meta.
  useEffect(() => {
    if (isPairs || !me || !board) return
    if (seededRoundRef.current === round) return
    seededRoundRef.current = round
    setMarks(me.marks || {})
    setFalseAlarm(false)
  }, [isPairs, me, board, round])

  function handleToggle(i) {
    // La tabla del matrimonio no se marca a mano: la casilla se gana
    // adivinando. Dejarla marcable haría que el juego volviera a ser de suerte.
    if (winner || isPairs) return
    const next = { ...marks }
    if (next[i]) delete next[i]
    else next[i] = true
    setMarks(next)
    buzz(10)
    setLoteriaMark(sessionId, uid, i, !!next[i]).catch(() => {})
  }

  // ── El turno de la pareja ──────────────────────────────────────────────────
  // Uno escribe en secreto, el otro adivina en voz alta, se revela y quien
  // escribió califica. Un acierto marca la casilla (si la carta está en su
  // tabla) y suma un punto al marcador.
  async function closeTurn(ok) {
    const { accepted } = await finishLoteriaTurn(sessionId, couple.id, { index: cardIndex, card: cardId, ok })
    if (!accepted || !ok) return
    if (myCell >= 0) await setCoupleMark(sessionId, couple.id, myCell)
    await addLoteriaPoint(sessionId, couple.id)
  }

  async function runTurn(fn) {
    if (turnBusy) return
    setTurnBusy(true)
    try { await fn() } catch (e) { console.error('turno falló:', e) } finally { setTurnBusy(false) }
  }

  const handleSubmitAnswer = () => runTurn(async () => {
    const text = draft.trim()
    if (!text) return
    buzz(10)
    await setLoteriaTurn(sessionId, couple.id, {
      index: cardIndex, card: cardId, answer: text, phase: 'guessing',
    })
  })

  const handleReveal = () => runTurn(async () => {
    buzz(15)
    await patchLoteriaTurn(sessionId, couple.id, { phase: 'revealed' })
  })

  const handleJudge = (ok) => runTurn(async () => {
    buzz(ok ? [30, 40, 80] : [40, 60, 40])
    await closeTurn(ok)
  })

  const handleReto = () => runTurn(async () => {
    buzz([30, 40, 80])
    await closeTurn(true)
  })

  async function handleClaim() {
    if (claiming || winner || !board) return
    setClaiming(true)
    const pattern = checkWin(board, shownMarks, drawn, patterns)
    // Con equipos "con todos", tener uno mismo el patrón no basta.
    const teamOk = meta?.mode !== 'teams' ||
      checkTeamWin(players, me?.team, drawn, patterns, meta?.teamWin)
    if (!pattern || !teamOk) {
      buzz([40, 60, 40])
      setFalseAlarm(pattern && !teamOk ? 'team' : true)
      clearTimeout(alarmTimerRef.current)
      alarmTimerRef.current = setTimeout(() => setFalseAlarm(false), 3000)
      setClaiming(false)
      return
    }
    buzz([30, 40, 30, 40, 120])
    try {
      await claimLoteriaWin(
        sessionId,
        isPairs
          ? { uid: couple.id, name: couple.names, team: null, pattern }
          : { uid, name: me?.name ?? 'Jugador', team: me?.team ?? null, pattern },
        drawn.length,
      )
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

  // Se quedó sin pareja (entró tarde, o el otro se salió): sin tabla que
  // compartir no hay nada que jugar, y decirlo es mejor que un spinner eterno.
  if (meta && isPairs && !couple) {
    return (
      <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center justify-center px-8 gap-4 text-center">
        <div className="text-6xl">💍</div>
        <p className="text-white font-bold text-lg">No tienes pareja en esta ronda</p>
        <p className="text-white/40 text-sm">
          Esta lotería se juega por matrimonios y la tabla es de los dos.
          Pídele al moderador que te agregue en la siguiente ronda.
        </p>
        <button onClick={handleLeave} className="text-white/30 text-sm py-2 mt-2">Salir del juego</button>
      </div>
    )
  }

  if (!meta || !board) {
    return (
      <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        <p className="text-white/40 text-sm">Repartiendo tu tabla…</p>
      </div>
    )
  }

  const markedCount = Object.keys(shownMarks).length

  // ── Ganador ────────────────────────────────────────────────────────────────
  if (winner) {
    return (
      <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center px-6 py-10 gap-5">
        <div className="text-7xl mt-8">{iWon ? '🏆' : '🃏'}</div>
        <h1 className="text-white text-3xl font-black text-center">
          {iWon
            ? (isPairs ? '¡GANARON!' : '¡GANASTE!')
            : winners.length > 1
              ? `¡Empate: ${winners.map(w => w.name).join(' y ')}!`
              : `¡${winner.name} ganó!`}
        </h1>
        {meta?.mode === 'teams' && (
          <p className="text-white/60 text-sm">
            {[...new Set(winners.map(w => w.team))]
              .map(t => { const i = teamInfo(t); return i ? `${i.emoji} Equipo ${i.name}` : '' })
              .filter(Boolean)
              .join(' y ')}
          </p>
        )}
        <p className="text-amber-300 font-semibold">
          {PATTERNS[winner.pattern]?.label ?? winner.pattern}
        </p>
        <p className="text-white/40 text-sm text-center">
          Espera a que el moderador reparta la siguiente ronda
        </p>

        <div className="w-full max-w-sm mt-2 opacity-60 pointer-events-none">
          <LoteriaBoard board={board} deck={deck} marks={shownMarks} disabled />
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

  // ── El panel del turno (sólo matrimonios) ──────────────────────────────────
  function TurnPanel() {
    if (!card) {
      return (
        <Panel tone="idle">
          <p className="text-white/50 text-sm text-center">
            Esperando a que el moderador cante la primera carta…
          </p>
        </Panel>
      )
    }

    const enTabla = myCell >= 0
    const cerrado = turn?.phase === 'done'

    // En la lotería de siempre se ve de un golpe si la carta te tocó. Aquí la
    // tabla está abajo y la casilla apenas parpadea, así que hay que decirlo:
    // sin esto no saben si se están jugando una casilla o sólo un punto.
    const Apuesta = () => (
      <p className={`text-[11px] text-center mt-2 ${enTabla ? 'text-amber-300' : 'text-white/30'}`}>
        {enTabla ? '⬛ Esta carta sí está en su tabla' : 'Esta carta no está en su tabla · se juegan el punto'}
      </p>
    )

    if (cerrado) {
      return (
        <Panel tone={turn.ok ? 'good' : 'bad'}>
          <p className="text-center text-2xl mb-1">{turn.ok ? '✅' : '❌'}</p>
          <p className="text-white font-bold text-center">
            {turn.ok
              ? (enTabla ? '¡Le atinaron! Casilla marcada' : '¡Le atinaron! +1 punto')
              : 'No le atinaron'}
          </p>
          <p className="text-white/50 text-xs text-center mt-1">
            {turn.ok
              ? (enTabla ? 'Y un punto al marcador' : 'Esta carta no estaba en su tabla')
              : 'Pero ya lo saben. Esperen la siguiente carta.'}
          </p>
          {turn.answer && (
            <p className="text-white/60 text-sm text-center mt-2 italic">«{turn.answer}»</p>
          )}
        </Panel>
      )
    }

    if (timeUp) {
      return (
        <Panel tone="bad">
          <p className="text-red-300 font-bold text-center">Se acabó el tiempo</p>
          <p className="text-white/50 text-xs text-center mt-1">
            Esta carta se va sin marcar. A la siguiente.
          </p>
        </Panel>
      )
    }

    // Reto: no hay nada que adivinar, se hace y se marca.
    if (card.kind === 'reto') {
      return (
        <Panel tone="reto">
          <p className="text-amber-300/70 text-[11px] uppercase tracking-widest text-center mb-1">Reto</p>
          <p className="text-white text-base text-center leading-snug mb-3">{card.prompt}</p>
          <button
            onClick={handleReto}
            disabled={turnBusy}
            className="w-full py-4 rounded-xl bg-amber-500 active:bg-amber-600 text-white font-bold disabled:opacity-40 transition-colors"
          >
            Ya lo hicimos
          </button>
          <Apuesta />
        </Panel>
      )
    }

    // Escribir en secreto
    if (!turn) {
      if (iAmWriter) {
        return (
          <Panel tone="you">
            <p className="text-amber-300/70 text-[11px] uppercase tracking-widest text-center mb-1">
              Te toca escribir · no se lo enseñes
            </p>
            <p className="text-white text-base text-center leading-snug mb-3">{card.prompt}</p>
            <input
              type="text"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmitAnswer()}
              placeholder="Tu respuesta…"
              maxLength={60}
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/25 outline-none focus:border-amber-500 mb-2"
            />
            <button
              onClick={handleSubmitAnswer}
              disabled={!draft.trim() || turnBusy}
              className="w-full py-4 rounded-xl bg-amber-500 active:bg-amber-600 text-white font-bold disabled:opacity-40 transition-colors"
            >
              Listo, ya escribí
            </button>
            <Apuesta />
          </Panel>
        )
      }
      return (
        <Panel tone="wait">
          <p className="text-white/40 text-[11px] uppercase tracking-widest text-center mb-1">
            {partner?.name ?? 'Tu pareja'} está escribiendo
          </p>
          <p className="text-white text-base text-center leading-snug">{card.prompt}</p>
          <p className="text-white/50 text-xs text-center mt-2">
            Ve pensando qué crees que va a poner.
          </p>
          <Apuesta />
        </Panel>
      )
    }

    // Adivinar en voz alta
    if (turn.phase === 'guessing') {
      return (
        <Panel tone="you">
          <p className="text-amber-300/70 text-[11px] uppercase tracking-widest text-center mb-1">
            {iAmWriter ? `Escucha a ${partner?.name ?? 'tu pareja'}` : 'Dilo en voz alta'}
          </p>
          <p className="text-white text-base text-center leading-snug mb-3">{card.prompt}</p>
          <p className="text-white/50 text-xs text-center mb-3">
            {iAmWriter
              ? 'Cuando ya dijo su respuesta, destápala.'
              : 'Di qué crees que escribió. Luego destapen la respuesta.'}
          </p>
          <button
            onClick={handleReveal}
            disabled={turnBusy}
            className="w-full py-4 rounded-xl bg-amber-500 active:bg-amber-600 text-white font-bold disabled:opacity-40 transition-colors"
          >
            Destapar la respuesta
          </button>
          <Apuesta />
        </Panel>
      )
    }

    // Revelado: quien escribió califica
    return (
      <Panel tone="you">
        <p className="text-white/40 text-[11px] uppercase tracking-widest text-center mb-1">
          {iAmWriter ? 'Escribiste' : `${partner?.name ?? 'Tu pareja'} escribió`}
        </p>
        <p className="text-white text-xl font-bold text-center leading-snug mb-3">«{turn.answer}»</p>
        {iAmWriter ? (
          <>
            <p className="text-white/50 text-xs text-center mb-3">¿Le atinó?</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleJudge(true)}
                disabled={turnBusy}
                className="flex-1 py-4 rounded-xl bg-green-500 active:bg-green-600 text-white font-bold disabled:opacity-40 transition-colors"
              >
                ✅ Sí
              </button>
              <button
                onClick={() => handleJudge(false)}
                disabled={turnBusy}
                className="flex-1 py-4 rounded-xl bg-white/10 active:bg-white/20 text-white font-bold disabled:opacity-40 transition-colors"
              >
                ❌ No
              </button>
            </div>
          </>
        ) : (
          <p className="text-white/50 text-xs text-center">
            {partner?.name ?? 'Tu pareja'} está diciendo si le atinaste…
          </p>
        )}
      </Panel>
    )
  }

  // ── Jugando ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center px-4 py-5 gap-3">
      <div className="w-full max-w-sm flex items-center justify-between">
        <span className="text-white/40 text-xs uppercase tracking-widest">Ronda {round}</span>
        {myTeam && (
          <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${myTeam.chip}`}>
            {myTeam.emoji} {myTeam.name}
          </span>
        )}
        {isPairs && partner && (
          <span className="px-2 py-0.5 rounded-full border border-white/15 bg-white/5 text-white/60 text-xs font-semibold truncate max-w-[45%]">
            💍 con {partner.name}
          </span>
        )}
        <span className="text-white/40 text-xs">{markedCount}/16 marcadas</span>
      </div>

      <div className="flex flex-wrap gap-1.5 justify-center">
        {patterns.map(k => (
          <span key={k} className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            {PATTERNS[k]?.label ?? k}
          </span>
        ))}
      </div>

      {staleClient && (
        <div className="w-full max-w-sm rounded-2xl bg-amber-500/15 border border-amber-500/50 px-4 py-3 text-center">
          <p className="text-amber-200 font-bold text-sm">Tienes una versión vieja</p>
          <p className="text-amber-200/70 text-xs mt-0.5">
            Cierra la pestaña y vuelve a abrir el sitio: las cartas que ves no son las de esta sala.
          </p>
        </div>
      )}

      {isPairs && (
        <>
          {secondsLeft != null && card && turn?.phase !== 'done' && (
            <div className={`w-full max-w-sm rounded-xl px-4 py-1.5 text-center border font-mono font-bold ${
              secondsLeft <= 10
                ? 'bg-red-500/10 border-red-500/40 text-red-300'
                : 'bg-white/5 border-white/10 text-white/50'
            }`}>
              {timeUp ? '0s' : `${secondsLeft}s`}
            </div>
          )}
          <TurnPanel />
        </>
      )}

      <div className="w-full max-w-sm">
        <LoteriaBoard
          board={board}
          deck={deck}
          marks={shownMarks}
          onToggle={isPairs ? undefined : handleToggle}
          disabled={isPairs}
          highlight={isPairs ? myCell : -1}
        />
      </div>

      {falseAlarm && (
        <div className="w-full max-w-sm rounded-2xl bg-red-500/15 border border-red-500/40 px-4 py-3 text-center">
          <p className="text-red-300 font-bold">
            {falseAlarm === 'team' ? '¡Aún no!' : '¡Falsa alarma!'}
          </p>
          <p className="text-red-300/70 text-xs mt-0.5">
            {falseAlarm === 'team'
              ? 'Ya completaste tu tabla, pero falta que tu equipo la complete'
              : 'Todavía no completas ningún patrón con cartas cantadas'}
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

const TONES = {
  idle: 'bg-white/5 border-white/10',
  wait: 'bg-white/5 border-white/10',
  you:  'bg-amber-500/10 border-amber-500/40',
  reto: 'bg-purple-500/10 border-purple-500/40',
  good: 'bg-green-500/10 border-green-500/40',
  bad:  'bg-red-500/10 border-red-500/40',
}

function Panel({ tone = 'idle', children }) {
  return (
    <div className={`w-full max-w-sm rounded-2xl border px-4 py-4 ${TONES[tone]}`}>
      {children}
    </div>
  )
}
