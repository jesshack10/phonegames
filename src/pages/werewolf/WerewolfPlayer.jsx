import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  subscribeSession, subscribePlayers, subscribeNightActions,
  submitNightAction, submitVote, deleteSession, SESSION_TTL,
} from '../../firebase/session.js'
import { ROLE_CONFIG } from '../../utils/werewolf.js'
import { useAuth } from '../../hooks/useAuth.js'
import RoleCard from '../../components/werewolf/RoleCard.jsx'
import NightActionPanel from '../../components/werewolf/NightActionPanel.jsx'
import VotePanel from '../../components/werewolf/VotePanel.jsx'
import Avatar from '../../components/werewolf/Avatar.jsx'
import PlayerList from '../../components/werewolf/PlayerList.jsx'

export default function WerewolfPlayer() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { uid } = useAuth()

  const [meta, setMeta] = useState(null)
  const [players, setPlayers] = useState([])
  const [nightActions, setNightActions] = useState({})
  const [roleRevealed, setRoleRevealed] = useState(false)
  const sessionExistedRef = useRef(false)

  const storageKey = `ww_player_${sessionId}`

  // Reconnect if player refreshes
  useEffect(() => {
    const stored = localStorage.getItem(storageKey)
    if (!stored) {
      navigate(`/werewolf/lobby/${sessionId}`)
    }
  }, [sessionId, navigate, storageKey])

  useEffect(() => {
    const unsubs = [
      subscribeSession(sessionId, setMeta),
      subscribePlayers(sessionId, setPlayers),
    ]
    return () => unsubs.forEach(u => u())
  }, [sessionId])

  useEffect(() => {
    if (!meta?.round) return
    const unsub = subscribeNightActions(sessionId, meta.round, setNightActions)
    return unsub
  }, [sessionId, meta?.round])

  useEffect(() => {
    if (meta) {
      sessionExistedRef.current = true
      if (Date.now() - meta.createdAt > SESSION_TTL) {
        deleteSession(sessionId).then(() => navigate('/', { replace: true }))
      }
    } else if (sessionExistedRef.current) {
      localStorage.removeItem(storageKey)
      navigate('/', { replace: true })
    }
  }, [meta, sessionId, navigate, storageKey])

  const myPlayer = players.find(p => p.id === uid)
  const myRole = myPlayer?.role
  const myAlive = myPlayer?.alive !== false
  const gamePlayers = players.filter(p => p.role !== 'moderator')
  const livingPlayers = gamePlayers.filter(p => p.alive)

  const phase = meta?.phase
  const nightTurn = meta?.nightTurn

  // ── Determine if it's my turn at night ──
  const isMyNightTurn = (() => {
    if (phase !== 'night') return false
    if (nightTurn === 'werewolves' && myRole === 'werewolf') return true
    if (nightTurn === 'doctor' && myRole === 'doctor') return true
    if (nightTurn === 'seer' && myRole === 'seer') return true
    return false
  })()

  const myNightActionKey = myRole === 'werewolf' ? 'werewolfTarget' : myRole === 'doctor' ? 'doctorTarget' : 'seerTarget'
  const myActionSubmitted = !!nightActions[myNightActionKey]

  async function handleNightAction(targetId) {
    const actionKey = myRole === 'werewolf' ? 'werewolfTarget' : myRole === 'doctor' ? 'doctorTarget' : 'seerTarget'
    await submitNightAction(sessionId, meta.round, actionKey, targetId)
  }

  async function handleVote(targetId) {
    await submitVote(sessionId, meta.round, uid, targetId)
  }

  if (!meta || !myPlayer) {
    return (
      <div className="min-h-screen bg-[#0a0a18] flex items-center justify-center">
        <p className="text-white/50">Loading…</p>
      </div>
    )
  }

  const roleConfig = ROLE_CONFIG[myRole] || ROLE_CONFIG.villager

  // ── ENDED ──
  if (phase === 'ended') {
    const isWerewolfWin = meta.winner === 'werewolves'
    const iWon = (isWerewolfWin && myRole === 'werewolf') || (!isWerewolfWin && myRole !== 'werewolf')
    return (
      <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center justify-center px-6 gap-6">
        <div className="text-6xl">{iWon ? '🏆' : '💔'}</div>
        <h1 className="text-white text-3xl font-bold text-center">
          {isWerewolfWin ? 'Werewolves Win!' : 'Villagers Win!'}
        </h1>
        <p className="text-white/50">{iWon ? 'You won!' : 'You lost'}</p>
        <div className={`rounded-2xl border-2 ${roleConfig.bg} ${roleConfig.border} px-8 py-4 text-center`}>
          <p className="text-4xl">{roleConfig.emoji}</p>
          <p className={`font-bold ${roleConfig.text}`}>You were the {roleConfig.label}</p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="text-white/40 text-sm mt-4"
        >
          ← Back to games
        </button>
      </div>
    )
  }

  // ── SPECTATOR (dead player) ──
  if (!myAlive) {
    return (
      <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center px-6 py-10 gap-5">
        <div className="text-5xl">💀</div>
        <h2 className="text-white text-2xl font-bold">You were eliminated</h2>
        <div className={`rounded-xl border-2 ${roleConfig.bg} ${roleConfig.border} px-6 py-3 text-center`}>
          <p className={`font-bold ${roleConfig.text}`}>{roleConfig.emoji} You were the {roleConfig.label}</p>
        </div>
        <p className="text-white/40 text-sm">Spectating…</p>
        <div className="w-full max-w-xs">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Living players</p>
          <PlayerList players={livingPlayers} compact />
        </div>
        <p className="text-white/30 text-xs mt-2 text-center">
          Phase: {phase?.replace('_', ' ')} · Round {meta.round}
        </p>
      </div>
    )
  }

  // ── LOBBY / WAITING ──
  if (phase === 'lobby') {
    return (
      <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center justify-center px-6 gap-6">
        <Avatar avatar={myPlayer.avatar} size="lg" />
        <h2 className="text-white text-2xl font-bold">{myPlayer.name}</h2>
        <p className="text-white/50">Waiting for game to start…</p>
        <p className="text-white/30 text-sm">{gamePlayers.length} players in lobby</p>
        <div className="flex gap-1 mt-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  // ── ROLE REVEAL ──
  if (phase === 'role_reveal') {
    return (
      <div className="min-h-screen bg-[#0a0a18] flex flex-col px-6 py-10 gap-6">
        <p className="text-white/40 text-sm text-center">Your secret role</p>
        <RoleCard role={myRole} revealed={roleRevealed} onReveal={() => setRoleRevealed(true)} />
        {roleRevealed && myRole === 'werewolf' && (
          <div className="rounded-xl bg-red-900/30 border border-red-700 p-4 text-sm text-red-300">
            🐺 Fellow werewolves:{' '}
            {gamePlayers.filter(p => p.role === 'werewolf' && p.id !== uid).map(p => p.name).join(', ') || 'None (you are alone)'}
          </div>
        )}
        <p className="text-white/30 text-xs text-center">Waiting for moderator to begin the night…</p>
      </div>
    )
  }

  // ── NIGHT ──
  if (phase === 'night') {
    if (!isMyNightTurn || myActionSubmitted) {
      return (
        <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center justify-center px-6 gap-6">
          <div className="text-6xl">🌙</div>
          {myActionSubmitted ? (
            <>
              <p className="text-white text-xl font-semibold">Action submitted ✓</p>
              <p className="text-white/40 text-sm">Waiting for the night to end…</p>
            </>
          ) : (
            <>
              <p className="text-white text-xl font-semibold">Close your eyes</p>
              <p className="text-white/40 text-sm">
                {nightTurn === 'werewolves' ? 'Werewolves are acting…' :
                 nightTurn === 'doctor' ? 'Doctor is acting…' :
                 'Seer is acting…'}
              </p>
            </>
          )}
          <Avatar avatar={myPlayer.avatar} size="lg" />
          <p className="text-white/30 text-sm">{myPlayer.name}</p>
        </div>
      )
    }

    // It's my turn
    const nightTargets = livingPlayers.filter(p => {
      if (myRole === 'werewolf') return p.role !== 'werewolf'
      return true
    })

    const actionLabel = myRole === 'werewolf' ? '🐺 Choose your victim' :
                        myRole === 'doctor' ? '💉 Choose who to protect' :
                        '🔮 Choose who to investigate'

    return (
      <div className="min-h-screen bg-[#0a0a18] flex flex-col px-6 py-10 gap-6">
        <div className={`rounded-2xl border-2 ${roleConfig.bg} ${roleConfig.border} p-4 text-center`}>
          <p className="text-2xl">{roleConfig.emoji}</p>
          <p className={`font-bold ${roleConfig.text}`}>Your turn — {roleConfig.label}</p>
        </div>
        <p className="text-white/60 text-sm text-center">{actionLabel}</p>

        {myRole === 'seer' && nightActions.seerTarget && nightActions.seerResult !== undefined && nightActions.seerResult !== null && (
          <div className="rounded-xl bg-indigo-900/40 border border-indigo-600 p-4 text-center">
            <p className="text-indigo-300 font-semibold">
              {livingPlayers.find(p => p.id === nightActions.seerTarget)?.name} is{' '}
              {nightActions.seerResult ? '🐺 a Werewolf!' : '✓ not a werewolf'}
            </p>
          </div>
        )}

        <NightActionPanel
          players={nightTargets}
          onConfirm={handleNightAction}
          confirmLabel={myRole === 'werewolf' ? 'Confirm kill →' : myRole === 'doctor' ? 'Confirm protection →' : 'Investigate →'}
          disabled={myActionSubmitted}
          excludeSelf={myRole === 'seer'}
          myId={uid}
        />
      </div>
    )
  }

  // ── DAY ANNOUNCE ──
  if (phase === 'day_announce') {
    return (
      <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center justify-center px-6 gap-6">
        <div className="text-6xl">🌅</div>
        <p className="text-white text-xl font-semibold text-center">Morning arrives…</p>
        <p className="text-white/40 text-sm text-center">The moderator is revealing last night's events.</p>
      </div>
    )
  }

  // ── DAY DISCUSS ──
  if (phase === 'day_discuss') {
    return (
      <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center px-6 py-10 gap-5">
        <div className="text-5xl">☀️</div>
        <h2 className="text-white text-2xl font-bold text-center">Day Discussion</h2>
        <p className="text-white/50 text-sm text-center">Discuss with the group. Find the werewolves.</p>
        <div className="w-full max-w-xs mt-2">
          <PlayerList players={livingPlayers} compact />
        </div>
        <p className="text-white/30 text-xs mt-auto">Waiting for moderator to open voting…</p>
      </div>
    )
  }

  // ── VOTING ──
  if (phase === 'voting') {
    return (
      <div className="min-h-screen bg-[#0a0a18] flex flex-col px-6 py-10 gap-6">
        <h2 className="text-white text-2xl font-bold text-center">🗳 Vote to Eliminate</h2>
        <VotePanel players={livingPlayers} onVote={handleVote} myId={uid} />
      </div>
    )
  }

  // ── DAY ELIMINATION ──
  if (phase === 'day_elimination') {
    return (
      <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center justify-center px-6 gap-6">
        <div className="text-5xl">💀</div>
        <p className="text-white text-xl font-semibold text-center">The village has spoken</p>
        <p className="text-white/40 text-sm text-center">Waiting for the next night to begin…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a18] flex items-center justify-center">
      <p className="text-white/40">Syncing…</p>
    </div>
  )
}
