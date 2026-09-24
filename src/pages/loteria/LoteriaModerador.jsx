import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  subscribeLoteriaSession,
  subscribeLoteriaPlayers,
  startLoteriaRound,
  drawLoteriaCard,
  updateLoteriaMeta,
  deleteSession,
  SESSION_TTL,
} from '../../firebase/session.js'
import { useAuth } from '../../hooks/useAuth.js'
import ShareSessionLink from '../../components/ShareSessionLink.jsx'
import { LoteriaCard, LoteriaCardPlaceholder } from '../../components/loteria/LoteriaCard.jsx'
import { pickNextCard, normalizeDrawn, dealBoards, deckSize, findCard, PATTERNS, PATTERN_KEYS } from '../../utils/loteria.js'
import { resolveDeck } from '../../data/decks/index.js'

// Firebase puts the useful part in `code` (PERMISSION_DENIED and friends);
// without it a rejected write reads as nothing happening at all. Dealing a
// round writes in stages and tags its error with the one that failed, which is
// what turns "permission denied" into something actionable.
function describe(e) {
  const reason = e?.code || e?.message || 'error desconocido'
  return e?.stage ? `${reason} al escribir ${e.stage}` : reason
}

export default function LoteriaModerador() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { uid } = useAuth()
  const [meta, setMeta] = useState(null)
  const [players, setPlayers] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [readError, setReadError] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const sessionExistedRef = useRef(false)

  useEffect(() => {
    const onRead = (what) => setReadError(`No se puede leer ${what}`)
    const u1 = subscribeLoteriaSession(sessionId, setMeta, onRead)
    const u2 = subscribeLoteriaPlayers(sessionId, setPlayers, onRead)
    return () => { u1(); u2() }
  }, [sessionId])

  // La sala murió (expiró o alguien la cerró) → de vuelta al inicio
  useEffect(() => {
    if (meta) {
      sessionExistedRef.current = true
      if (meta.phase === 'ended' || Date.now() - meta.createdAt > SESSION_TTL) {
        deleteSession(sessionId).then(() => navigate('/', { replace: true }))
      }
    } else if (sessionExistedRef.current) {
      navigate('/', { replace: true })
    }
  }, [meta, navigate, sessionId])

  // Las cantadas viajan dentro de meta, así que llegan con la misma
  // suscripción que la sala: nada que recuperar aparte al recargar.
  const drawn = normalizeDrawn(meta?.drawn)
  const deck = resolveDeck(meta)
  const totalCards = deckSize(deck)
  const patterns = meta?.patterns ?? ['full']
  const guests = players.filter(p => !p.isHost)
  const canStart = guests.length >= 1
  const drawnCount = drawn.length
  const currentId = drawnCount ? drawn[drawnCount - 1] : null
  const deckEmpty = drawnCount >= totalCards
  const winner = meta?.winner
  const lobbyUrl = `${window.location.origin}${window.location.pathname}#/loteria/sala/${sessionId}`

  async function handleTogglePattern(key) {
    const next = patterns.includes(key)
      ? (patterns.length === 1 ? patterns : patterns.filter(k => k !== key))
      : [...patterns, key]
    await updateLoteriaMeta(sessionId, { patterns: PATTERN_KEYS.filter(k => next.includes(k)) })
  }

  async function handleStart(round) {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const boards = dealBoards(deck, guests.map(p => p.id))
      await startLoteriaRound(sessionId, boards, round)
    } catch (e) {
      // This write is atomic: one rejected path and the round never starts, so
      // swallowing it left the moderator tapping a button that did nothing.
      console.error('repartir falló:', e)
      setError(`No se pudo repartir: ${describe(e)}`)
    } finally {
      setBusy(false)
    }
  }

  async function handleDraw() {
    if (busy || deckEmpty || winner) return
    setBusy(true)
    setError('')
    try {
      const next = pickNextCard(deck, drawn)
      if (next == null) return
      await drawLoteriaCard(sessionId, drawnCount, next)
    } catch (e) {
      console.error('cantar carta falló:', e)
      setError(`No se pudo cantar la carta: ${describe(e)}`)
    } finally {
      setBusy(false)
    }
  }

  async function handleEnd() {
    await deleteSession(sessionId)
    navigate('/loteria', { replace: true })
  }

  if (!meta) {
    return (
      <div className="min-h-screen bg-[#0a0a18] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  // ── Sala de espera ─────────────────────────────────────────────────────────
  if (meta.phase === 'lobby') {
    return (
      <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center px-6 py-10 gap-6">
        <h2 className="text-white text-2xl font-bold">Esperando jugadores…</h2>

        <div className="bg-white p-4 rounded-2xl shadow-2xl shadow-black/50">
          <QRCodeSVG value={lobbyUrl} size={200} level="M" includeMargin={false} />
        </div>

        <div className="text-center">
          <p className="text-white/40 text-xs mb-1">Escanea el QR para entrar</p>
          <p className="text-white/30 text-xs mb-3">Código de la sala</p>
          <p className="text-white text-3xl font-mono font-bold tracking-widest">{sessionId}</p>
        </div>

        <div className="w-full max-w-xs">
          <ShareSessionLink
            url={lobbyUrl}
            shareTitle="Lotería"
            shareText={`Únete a la Lotería (código ${sessionId})`}
            copyLabel="Copiar enlace"
            copiedLabel="¡Copiado! ✓"
            shareLabel="Compartir"
            primaryShare
          />
        </div>

        <div className="w-full max-w-xs">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-3 text-center">
            {guests.length} jugador{guests.length !== 1 ? 'es' : ''} en la sala
          </p>
          <div className="flex flex-col gap-2">
            {players.map(p => (
              <div key={p.id} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
                <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                <span className="text-white font-semibold">{p.name}</span>
                {p.id === uid && <span className="text-white/30 text-xs ml-auto">(moderador)</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="w-full max-w-xs bg-white/5 rounded-2xl px-5 py-4 border border-white/10">
          <p className="text-white font-semibold mb-1">Baraja</p>
          <p className="text-white/60 text-sm">{deck.emoji} {deck.name} · {totalCards} cartas</p>
          {deck.hasPrompts && (
            <p className="text-white/40 text-xs mt-1">Al cantar cada carta te aparecerá una pregunta para leer en voz alta.</p>
          )}
        </div>

        <div className="w-full max-w-xs bg-white/5 rounded-2xl px-5 py-4 border border-white/10">
          <p className="text-white font-semibold mb-1">¿Cómo se gana?</p>
          <p className="text-white/40 text-xs mb-3">Gana quien complete cualquiera de los elegidos</p>
          <div className="flex flex-wrap gap-2">
            {PATTERN_KEYS.map(key => (
              <button
                key={key}
                onClick={() => handleTogglePattern(key)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  patterns.includes(key)
                    ? 'bg-amber-500 text-white'
                    : 'bg-white/10 text-white/60 active:bg-white/20'
                }`}
              >
                {PATTERNS[key].label}
              </button>
            ))}
          </div>
        </div>

        {!canStart && (
          <p className="text-white/40 text-sm text-center">Se necesita al menos 1 jugador para empezar</p>
        )}

        {(error || readError) && (
          <p className="w-full max-w-sm text-red-300 bg-red-500/10 border border-red-500/40 rounded-2xl px-4 py-3 text-sm text-center break-words">
            {error || readError}
          </p>
        )}

        <button
          onClick={() => handleStart(meta.round ?? 1)}
          disabled={!canStart || busy}
          className="w-full max-w-xs py-5 rounded-2xl bg-amber-500 active:bg-amber-600 text-white font-black text-xl tracking-wide shadow-lg shadow-amber-500/20 disabled:opacity-40 transition-colors"
        >
          {busy ? 'Repartiendo…' : 'Repartir y empezar →'}
        </button>

        <button
          onClick={handleEnd}
          className="w-full max-w-xs py-4 rounded-2xl bg-white/10 active:bg-white/20 text-white font-bold text-base transition-colors"
        >
          Cerrar sala
        </button>
      </div>
    )
  }

  // ── Partida en curso / ganador ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center px-5 py-6 gap-4">
      <div className="w-full max-w-sm flex items-center justify-between">
        <span className="text-white/40 text-xs uppercase tracking-widest">Ronda {meta.round}</span>
        <span className="text-white/40 text-xs font-mono tracking-widest">{sessionId}</span>
      </div>

      <div className="flex flex-wrap gap-1.5 justify-center">
        {patterns.map(k => (
          <span key={k} className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            {PATTERNS[k].label}
          </span>
        ))}
      </div>

      {winner ? (
        <div className="w-full max-w-sm flex flex-col items-center gap-4 mt-6">
          <div className="text-7xl">🏆</div>
          <h2 className="text-white text-3xl font-black text-center">¡{winner.name} ganó!</h2>
          <p className="text-amber-300 font-semibold">{PATTERNS[winner.pattern]?.label ?? winner.pattern}</p>
          <p className="text-white/40 text-sm">{drawnCount} cartas cantadas</p>

          {error && (
            <p className="w-full text-red-300 bg-red-500/10 border border-red-500/40 rounded-2xl px-4 py-3 text-sm text-center break-words">
              {error}
            </p>
          )}

          <button
            onClick={() => handleStart((meta.round ?? 1) + 1)}
            disabled={busy}
            className="w-full py-5 rounded-2xl bg-amber-500 active:bg-amber-600 text-white font-black text-xl tracking-wide shadow-lg shadow-amber-500/20 disabled:opacity-40 transition-colors"
          >
            {busy ? 'Repartiendo…' : 'Nueva ronda →'}
          </button>
          <button
            onClick={handleEnd}
            className="w-full py-4 rounded-2xl bg-white/10 active:bg-white/20 text-white font-bold text-base transition-colors"
          >
            Cerrar sala
          </button>
        </div>
      ) : (
        <>
          <div className="w-full max-w-[240px] mt-2">
            {currentId
              ? <LoteriaCard id={currentId} deck={deck} size="xl" />
              : <LoteriaCardPlaceholder />}
          </div>

          {deck.hasPrompts && currentId && (
            <div className="w-full max-w-sm rounded-2xl bg-amber-500/10 border border-amber-500/40 px-4 py-3">
              <p className="text-amber-300/60 text-[11px] uppercase tracking-widest mb-1 text-center">Lee esto en voz alta</p>
              <p className="text-white text-base text-center leading-snug">
                {findCard(deck, currentId)?.prompt}
              </p>
            </div>
          )}

          <p className="text-white/40 text-sm">
            {currentId
              ? `${drawnCount} de ${totalCards} cantadas`
              : 'Toca para cantar la primera carta'}
          </p>

          {(error || readError) && (
            <p className="w-full max-w-sm text-red-300 bg-red-500/10 border border-red-500/40 rounded-2xl px-4 py-3 text-sm text-center break-words">
              {error || readError}
            </p>
          )}

          <button
            onClick={handleDraw}
            disabled={busy || deckEmpty}
            className="w-full max-w-sm py-5 rounded-2xl bg-amber-500 active:bg-amber-600 text-white font-black text-xl tracking-wide shadow-lg shadow-amber-500/20 disabled:opacity-40 transition-colors"
          >
            {deckEmpty ? 'Se acabó el mazo' : 'Siguiente carta →'}
          </button>

          {deckEmpty && (
            <button
              onClick={() => handleStart((meta.round ?? 1) + 1)}
              disabled={busy}
              className="w-full max-w-sm py-4 rounded-2xl bg-white/10 active:bg-white/20 text-white font-bold text-base transition-colors disabled:opacity-40"
            >
              Nueva ronda
            </button>
          )}
        </>
      )}

      {/* Historial de cantadas */}
      {drawnCount > 0 && (
        <div className="w-full max-w-sm">
          <button
            onClick={() => setShowHistory(v => !v)}
            className="w-full text-white/40 text-xs uppercase tracking-widest py-2"
          >
            {showHistory ? '▾ Ocultar cantadas' : `▸ Ver las ${drawnCount} cantadas`}
          </button>
          {showHistory && (
            <div className="grid grid-cols-6 gap-1.5 mt-1">
              {[...drawn].reverse().map((id, i) => (
                <LoteriaCard key={`${id}-${i}`} id={id} deck={deck} size="sm" dimmed={i > 0} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Jugadores */}
      <div className="w-full max-w-sm">
        <p className="text-white/40 text-xs uppercase tracking-widest mb-2 text-center">
          {guests.length} jugando
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {guests.map(p => (
            <span key={p.id} className="px-3 py-1.5 rounded-full bg-white/5 text-white/70 text-sm">
              {p.name}
              <span className="text-white/30 ml-1.5">
                {Object.keys(p.marks || {}).length}
              </span>
            </span>
          ))}
        </div>
      </div>

      {!winner && (
        <button
          onClick={handleEnd}
          className="w-full max-w-sm py-3 rounded-2xl bg-white/5 active:bg-white/10 text-white/50 font-bold text-sm transition-colors mt-2"
        >
          Cerrar sala
        </button>
      )}
    </div>
  )
}
