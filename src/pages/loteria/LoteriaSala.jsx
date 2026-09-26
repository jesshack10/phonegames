import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  joinLoteriaPlayer,
  subscribeLoteriaSession,
  subscribeLoteriaPlayers,
  getLoteriaMeta,
  setLoteriaPair,
  deleteSession,
  SESSION_TTL,
} from '../../firebase/session.js'
import { useAuth } from '../../hooks/useAuth.js'
import { PATTERNS, couplesFrom } from '../../utils/loteria.js'

export default function LoteriaSala() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { uid } = useAuth()
  const [name, setName] = useState('')
  const [joined, setJoined] = useState(false)
  const [players, setPlayers] = useState([])
  const [meta, setMeta] = useState(null)
  const [error, setError] = useState('')
  const sessionExistedRef = useRef(false)

  const storageKey = `lot_${sessionId}`

  // ¿Ya se había unido en una visita anterior?
  useEffect(() => {
    if (!uid) return
    const stored = localStorage.getItem(storageKey)
    if (!stored) return
    try {
      const { uid: storedUid } = JSON.parse(stored)
      if (uid === storedUid) setJoined(true)
    } catch {
      localStorage.removeItem(storageKey)
    }
  }, [uid, storageKey])

  useEffect(() => {
    if (!joined) return
    const u1 = subscribeLoteriaSession(sessionId, setMeta)
    const u2 = subscribeLoteriaPlayers(sessionId, setPlayers)
    return () => { u1(); u2() }
  }, [joined, sessionId])

  useEffect(() => {
    if (meta) {
      sessionExistedRef.current = true
      if (meta.phase === 'ended' || Date.now() - meta.createdAt > SESSION_TTL) {
        deleteSession(sessionId).then(() => navigate('/', { replace: true }))
        return
      }
      if (meta.phase !== 'lobby') navigate(`/loteria/jugar/${sessionId}`, { replace: true })
    } else if (joined && sessionExistedRef.current) {
      localStorage.removeItem(storageKey)
      navigate('/', { replace: true })
    }
  }, [meta, navigate, sessionId, joined, storageKey])

  async function handleJoin() {
    const trimmed = name.trim()
    if (!trimmed) return setError('Escribe tu nombre')
    if (trimmed.length > 16) return setError('Nombre muy largo (máx 16)')
    if (!uid) return setError('Aún conectando con el servidor. Espera un momento y vuelve a intentar.')
    try {
      const m = await getLoteriaMeta(sessionId)
      if (!m) return setError('Sala no encontrada')
      if (Date.now() - m.createdAt > SESSION_TTL) {
        await deleteSession(sessionId)
        return setError('La sala expiró')
      }
      if (m.phase !== 'lobby') return setError('La partida ya comenzó')
      await joinLoteriaPlayer(sessionId, uid, trimmed, false)
      localStorage.setItem(storageKey, JSON.stringify({ uid, name: trimmed }))
      setJoined(true)
    } catch (e) {
      console.error('unirse falló:', e)
      setError(`Error al unirte: ${e?.code || e?.message || 'error desconocido'}`)
    }
  }

  if (!joined) {
    return (
      <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center justify-center px-6 gap-6">
        <div className="text-6xl">🃏</div>
        <h1 className="text-white text-3xl font-black">
          LOTE<span className="text-amber-500">RÍA</span>
        </h1>
        <p className="text-white/30 text-sm font-mono tracking-widest">{sessionId}</p>

        <div className="w-full max-w-xs flex flex-col gap-3">
          <input
            type="text"
            placeholder="Escribe tu nombre…"
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            maxLength={16}
            className="w-full px-4 py-4 rounded-xl bg-white/10 border border-white/20 text-white text-lg placeholder-white/30 outline-none focus:border-amber-500"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            onClick={handleJoin}
            disabled={!name.trim() || !uid}
            className="w-full py-4 rounded-2xl bg-amber-500 text-white text-lg font-bold disabled:opacity-40 active:scale-95 transition-transform"
          >
            {uid ? 'Unirme →' : 'Conectando…'}
          </button>
        </div>
      </div>
    )
  }

  const guests = players.filter(p => !p.isHost)
  const patterns = meta?.patterns ?? []

  // Modo matrimonios: cada quien escoge a su pareja y queda confirmado cuando
  // el otro también lo escoge. Va aquí, en la sala de espera, porque es el
  // único momento en que la gente está viendo el teléfono sin prisa.
  const isPairs = meta?.mode === 'parejas'
  const me = players.find(p => p.id === uid)
  const myCouple = isPairs ? couplesFrom(players).find(c => c.a === uid || c.b === uid) : null
  const myPick = guests.find(p => p.id === me?.pair)
  const pickedMe = guests.filter(p => p.pair === uid && p.id !== me?.pair)
  const takenIds = new Set(couplesFrom(players).flatMap(c => [c.a, c.b]))

  function PairPicker() {
    const otros = guests.filter(p => p.id !== uid)
    if (myCouple) {
      const partner = myCouple.members.find(m => m.id !== uid)
      return (
        <div className="w-full max-w-xs bg-green-500/10 border border-green-500/40 rounded-2xl px-5 py-4 text-center">
          <p className="text-green-300 font-bold">💍 Hacen pareja con {partner?.name}</p>
          <p className="text-green-300/60 text-xs mt-1">Van a compartir la misma tabla</p>
          <button
            onClick={() => setLoteriaPair(sessionId, uid, null).catch(() => {})}
            className="text-white/30 text-xs mt-3 underline"
          >
            Cambiar
          </button>
        </div>
      )
    }
    return (
      <div className="w-full max-w-xs bg-white/5 rounded-2xl px-5 py-4 border border-white/10">
        <p className="text-white font-semibold mb-1">¿Quién es tu pareja?</p>
        <p className="text-white/40 text-xs mb-3">
          Queda hecho cuando los dos se escogen.
          {myPick && ` Esperando a que ${myPick.name} te escoja…`}
        </p>
        {pickedMe.length > 0 && (
          <p className="text-amber-300 text-xs mb-3">
            {pickedMe.map(p => p.name).join(', ')} te escogió. Escógelo de vuelta para confirmar.
          </p>
        )}
        {otros.length === 0 ? (
          <p className="text-white/30 text-sm">Esperando a que llegue alguien más…</p>
        ) : (
          <div className="flex flex-col gap-2">
            {otros.map(p => {
              const ocupado = takenIds.has(p.id)
              const esMiPick = me?.pair === p.id
              const meEscogio = p.pair === uid
              return (
                <button
                  key={p.id}
                  disabled={ocupado}
                  onClick={() => setLoteriaPair(sessionId, uid, esMiPick ? null : p.id).catch(() => {})}
                  className={`flex items-center gap-2 rounded-xl px-4 py-3 text-left transition-colors ${
                    esMiPick
                      ? 'bg-amber-500 text-white'
                      : ocupado
                        ? 'bg-white/5 text-white/25'
                        : 'bg-white/10 text-white active:bg-white/20'
                  }`}
                >
                  <span className="font-semibold flex-1 truncate">{p.name}</span>
                  {ocupado && <span className="text-xs">ya tiene pareja</span>}
                  {!ocupado && meEscogio && !esMiPick && <span className="text-xs text-amber-300">te escogió</span>}
                  {esMiPick && <span className="text-xs">esperando…</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center px-6 py-10 gap-5">
      <div className="text-5xl mt-10">🃏</div>
      <h2 className="text-white text-2xl font-bold text-center">Esperando que reparta el moderador…</h2>

      {patterns.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center">
          {patterns.map(k => (
            <span key={k} className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              {PATTERNS[k]?.label ?? k}
            </span>
          ))}
        </div>
      )}

      <p className="text-white/40 text-sm">
        {guests.length} jugador{guests.length !== 1 ? 'es' : ''} en la sala
      </p>

      {isPairs && <PairPicker />}

      <div className="w-full max-w-xs flex flex-col gap-2">
        {guests.map(p => (
          <div key={p.id} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
            <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
            <span className="text-white font-semibold">{p.name}</span>
            {p.id === uid && <span className="text-white/30 text-xs ml-auto">(tú)</span>}
          </div>
        ))}
      </div>

      <div className="flex gap-1 mt-4">
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
