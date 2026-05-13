import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { auth } from '../../firebase/config.js'
import {
  subscribeSession, subscribePlayers, subscribeNightActions, subscribeVotes,
  assignRolesToPlayers, startGame, beginNight, advanceNightTurn,
  startDayPhase, startDiscussion, startVoting, confirmElimination,
  endGame, nextRound, appendActionLog, setSeerResult, deleteSession,
  SESSION_TTL,
} from '../../firebase/session.js'
import {
  assignRoles, checkWinCondition, resolveNight, getNextNightTurn,
  tallyVotes, ROLE_CONFIG,
} from '../../utils/werewolf.js'
import PlayerList from '../../components/werewolf/PlayerList.jsx'
import Avatar from '../../components/werewolf/Avatar.jsx'
import ActionLog from '../../components/werewolf/ActionLog.jsx'

export default function WerewolfModerator() {
  const { sessionId } = useParams()
  const navigate = useNavigate()

  const [meta, setMeta] = useState(null)
  const [players, setPlayers] = useState([])
  const [nightActions, setNightActions] = useState({})
  const [votes, setVotes] = useState({})
  const [actionLog, setActionLog] = useState({})
  const [selectedElimination, setSelectedElimination] = useState(null)
  const [nightResult, setNightResult] = useState(null)

  useEffect(() => {
    const unsubs = [
      subscribeSession(sessionId, setMeta),
      subscribePlayers(sessionId, setPlayers),
    ]
    return () => unsubs.forEach(u => u())
  }, [sessionId])

  useEffect(() => {
    if (!meta?.createdAt) return
    if (Date.now() - meta.createdAt > SESSION_TTL) {
      deleteSession(sessionId).then(() => navigate('/', { replace: true }))
    }
  }, [meta, sessionId, navigate])

  useEffect(() => {
    if (!meta?.round) return
    const unsubs = [
      subscribeNightActions(sessionId, meta.round, setNightActions),
      subscribeVotes(sessionId, meta.round, setVotes),
    ]
    return () => unsubs.forEach(u => u())
  }, [sessionId, meta?.round])

  const gamePlayers = players.filter(p => p.role !== 'moderator')
  const livingPlayers = gamePlayers.filter(p => p.alive)
  const uid = auth.currentUser?.uid
  const isHost = meta?.hostId === uid

  async function handleStartGame() {
    const ids = gamePlayers.map(p => p.id)
    const assignments = assignRoles(ids, meta.roleConfig)
    await assignRolesToPlayers(sessionId, assignments)
    await startGame(sessionId)
    await appendActionLog(sessionId, meta.round, { type: 'game_start', payload: { description: 'Game started' } })
  }

  async function handleBeginNight() {
    await beginNight(sessionId, meta.round)
  }

  const currentTurn = meta?.nightTurn
  const turnLabel = { werewolves: '🐺 Werewolves', doctor: '💉 Doctor', seer: '🔮 Seer' }
  const gamePlayers2 = players.filter(p => p.role !== 'moderator')

  function getPlayerName(id) {
    return gamePlayers.find(p => p.id === id)?.name || 'Unknown'
  }

  async function handleAdvanceTurn() {
    const next = getNextNightTurn(gamePlayers, currentTurn)
    if (next) {
      await advanceNightTurn(sessionId, next)
    } else {
      const result = resolveNight(nightActions, gamePlayers)
      setNightResult(result)
      if (nightActions.seerTarget) {
        const target = gamePlayers.find(p => p.id === nightActions.seerTarget)
        if (target) await setSeerResult(sessionId, meta.round, target.role === 'werewolf')
      }
      await appendActionLog(sessionId, meta.round, {
        type: result.killed ? 'werewolf_kill' : 'no_kill',
        payload: { description: result.killed ? `Werewolves killed ${getPlayerName(result.killed)}${result.savedByDoctor ? ' (saved by doctor)' : ''}` : 'Nobody was killed tonight' },
      })
      if (nightActions.doctorTarget) {
        await appendActionLog(sessionId, meta.round, { type: 'doctor_save', payload: { description: `Doctor protected ${getPlayerName(nightActions.doctorTarget)}` } })
      }
      if (nightActions.seerTarget) {
        const target = gamePlayers.find(p => p.id === nightActions.seerTarget)
        await appendActionLog(sessionId, meta.round, { type: 'seer_check', payload: { description: `Seer checked ${getPlayerName(nightActions.seerTarget)}: ${target?.role === 'werewolf' ? 'WEREWOLF' : 'not a werewolf'}` } })
      }
      await startDayPhase(sessionId, result.killed)
      const updatedPlayers = gamePlayers.map(p => p.id === result.killed ? { ...p, alive: false } : p)
      const winner = checkWinCondition(updatedPlayers)
      if (winner) await endGame(sessionId, winner)
    }
  }

  const tally = tallyVotes(votes, livingPlayers.map(p => ({ ...p })))
  const maxVotes = tally[0]?.votes || 0
  const tied = tally.filter(p => p.votes === maxVotes && maxVotes > 0)

  async function handleConfirmElimination() {
    const eliminatedId = selectedElimination
    if (eliminatedId) {
      await appendActionLog(sessionId, meta.round, { type: 'elimination', payload: { description: `${getPlayerName(eliminatedId)} was eliminated by vote` } })
    } else {
      await appendActionLog(sessionId, meta.round, { type: 'no_elimination', payload: { description: 'No elimination this round' } })
    }
    await confirmElimination(sessionId, eliminatedId)
    const updatedPlayers = gamePlayers.map(p => p.id === eliminatedId ? { ...p, alive: false } : p)
    const winner = checkWinCondition(updatedPlayers)
    if (winner) await endGame(sessionId, winner)
    else setSelectedElimination(null)
  }

  async function handleNextRound() {
    await nextRound(sessionId, meta.round + 1)
  }

  if (!meta) {
    return <div className="min-h-screen bg-[#0a0a18] flex items-center justify-center"><p className="text-white/50">Loading…</p></div>
  }

  if (meta.phase === 'ended') {
    const isWerewolfWin = meta.winner === 'werewolves'
    return (
      <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center px-6 py-10 gap-6">
        <div className="text-6xl">{isWerewolfWin ? '🐺' : '🏡'}</div>
        <h1 className="text-white text-3xl font-bold text-center">{isWerewolfWin ? 'Werewolves Win!' : 'Villagers Win!'}</h1>
        <div className="w-full max-w-xs"><p className="text-white/50 text-xs uppercase tracking-widest mb-3">All roles</p><PlayerList players={gamePlayers} showRoles /></div>
        <ActionLog log={actionLog} />
        <button onClick={async () => { await deleteSession(sessionId); navigate('/werewolf/setup', { replace: true }) }} className="w-full max-w-xs py-4 rounded-2xl bg-red-700 border border-red-500 text-white text-lg font-bold active:scale-95 transition-transform">New Game</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a18] flex flex-col px-4 py-6 gap-5 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/40 text-xs uppercase tracking-widest">Moderator · Round {meta.round}</p>
          <h1 className="text-white text-xl font-bold capitalize">{meta.phase?.replace('_', ' ')}</h1>
        </div>
        <span className="text-white/30 font-mono text-sm">{sessionId}</span>
      </div>

      {meta.phase === 'lobby' && (
        <>
          <p className="text-white/50 text-sm">{gamePlayers.length} player{gamePlayers.length !== 1 ? 's' : ''} joined</p>
          <PlayerList players={gamePlayers} />
          <button onClick={handleStartGame} disabled={gamePlayers.length < 4} className="w-full py-4 rounded-2xl bg-red-700 border border-red-500 text-white text-lg font-bold disabled:opacity-40 active:scale-95 transition-transform">
            {gamePlayers.length < 4 ? `Need ${4 - gamePlayers.length} more player${4 - gamePlayers.length !== 1 ? 's' : ''}` : 'Start Game →'}
          </button>
        </>
      )}

      {meta.phase === 'role_reveal' && (
        <>
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
            <p className="text-white text-lg font-semibold">Roles have been assigned!</p>
            <p className="text-white/50 text-sm mt-1">Each player sees their role on their own device.</p>
          </div>
          <PlayerList players={gamePlayers} showRoles />
          <button onClick={handleBeginNight} className="w-full py-4 rounded-2xl bg-indigo-700 border border-indigo-500 text-white text-lg font-bold active:scale-95 transition-transform">🌙 Begin Night →</button>
        </>
      )}

      {meta.phase === 'night' && (
        <>
          <div className="rounded-xl bg-indigo-950 border border-indigo-700 p-4 text-center">
            <p className="text-white/50 text-xs mb-1">Current turn</p>
            <p className="text-white text-2xl font-bold">{turnLabel[currentTurn]}</p>
            <p className="text-white/50 text-sm mt-2">
              {currentTurn === 'werewolves' && 'Werewolves are choosing their target'}
              {currentTurn === 'doctor' && 'Doctor is choosing who to protect'}
              {currentTurn === 'seer' && 'Seer is investigating a player'}
            </p>
          </div>
          <div className="flex gap-2">
            {['werewolves', 'doctor', 'seer'].map(turn => {
              const role = turn === 'werewolves' ? 'werewolf' : turn
              const hasRole = gamePlayers.some(p => p.role === role && p.alive)
              if (!hasRole) return null
              const done = nightActions[turn === 'werewolves' ? 'werewolfTarget' : `${turn}Target`]
              const active = currentTurn === turn
              return (
                <div key={turn} className={`flex-1 rounded-lg py-2 text-center text-xs font-semibold border ${
                  active ? 'bg-white/10 border-white/40 text-white' :
                  done ? 'bg-green-900/40 border-green-700 text-green-400' :
                  'border-white/10 text-white/30'
                }`}>
                  {turnLabel[turn].split(' ')[0]}{done ? ' ✓' : ''}
                </div>
              )
            })}
          </div>
          <div className="flex flex-col gap-2 text-sm">
            {nightActions.werewolfTarget && <div className="rounded-lg bg-red-900/30 border border-red-800 px-3 py-2 text-red-300">🐺 Werewolves chose: <strong>{getPlayerName(nightActions.werewolfTarget)}</strong></div>}
            {nightActions.doctorTarget && <div className="rounded-lg bg-teal-900/30 border border-teal-800 px-3 py-2 text-teal-300">💉 Doctor protected: <strong>{getPlayerName(nightActions.doctorTarget)}</strong></div>}
            {nightActions.seerTarget && <div className="rounded-lg bg-indigo-900/30 border border-indigo-800 px-3 py-2 text-indigo-300">🔮 Seer checked: <strong>{getPlayerName(nightActions.seerTarget)}</strong>{nightActions.seerResult !== null && nightActions.seerResult !== undefined && <span className="ml-2">→ {nightActions.seerResult ? '🐺 Werewolf' : '✓ Not a werewolf'}</span>}</div>}
          </div>
          <PlayerList players={gamePlayers} showRoles compact />
          <button onClick={handleAdvanceTurn} className="w-full py-4 rounded-2xl bg-indigo-700 border border-indigo-500 text-white text-lg font-bold active:scale-95 transition-transform">
            {getNextNightTurn(gamePlayers, currentTurn) ? 'Next Turn →' : 'End Night →'}
          </button>
        </>
      )}

      {meta.phase === 'day_announce' && (() => {
        const killed = nightActions.werewolfTarget
        const saved = nightActions.doctorTarget === killed
        const actualKilled = saved ? null : killed
        return (
          <>
            <div className={`rounded-xl border p-5 text-center ${actualKilled ? 'bg-red-900/30 border-red-700' : 'bg-green-900/30 border-green-700'}`}>
              <p className="text-4xl mb-2">{actualKilled ? '💣' : '🌅'}</p>
              <p className="text-white text-xl font-bold">{actualKilled ? `${getPlayerName(actualKilled)} was killed` : 'Nobody died tonight'}</p>
              {saved && <p className="text-teal-400 text-sm mt-1">The doctor saved someone!</p>}
            </div>
            <PlayerList players={gamePlayers} showRoles compact />
            <button onClick={() => startDiscussion(sessionId)} className="w-full py-4 rounded-2xl bg-amber-700 border border-amber-500 text-white text-lg font-bold active:scale-95 transition-transform">☀️ Start Discussion →</button>
          </>
        )
      })()}

      {meta.phase === 'day_discuss' && (
        <>
          <div className="rounded-xl bg-amber-900/20 border border-amber-700 p-4 text-center">
            <p className="text-white text-lg font-semibold">☀️ Day Discussion</p>
            <p className="text-white/50 text-sm mt-1">Players discuss and debate. Open voting when ready.</p>
          </div>
          <PlayerList players={livingPlayers} compact />
          <button onClick={() => startVoting(sessionId)} className="w-full py-4 rounded-2xl bg-amber-700 border border-amber-500 text-white text-lg font-bold active:scale-95 transition-transform">🗺 Open Voting →</button>
        </>
      )}

      {meta.phase === 'voting' && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-white font-semibold">🗺 Live Vote Tally</p>
            <p className="text-white/40 text-sm">{Object.keys(votes).length}/{livingPlayers.length} voted</p>
          </div>
          <div className="flex flex-col gap-2">
            {tally.map(player => (
              <button key={player.id} onClick={() => setSelectedElimination(prev => prev === player.id ? null : player.id)} className={`flex items-center gap-3 rounded-xl px-3 py-2 border transition-colors ${
                selectedElimination === player.id ? 'bg-red-900/50 border-red-500' :
                tied.find(t => t.id === player.id) && maxVotes > 0 ? 'bg-amber-900/30 border-amber-600' : 'bg-white/5 border-transparent'
              }`}>
                <Avatar avatar={player.avatar} size="sm" />
                <span className="flex-1 text-white text-left font-semibold">{player.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-red-500 rounded-full transition-all" style={{ width: livingPlayers.length > 0 ? `${(player.votes / livingPlayers.length) * 100}%` : '0%' }} /></div>
                  <span className="text-white font-bold w-4 text-right">{player.votes}</span>
                </div>
              </button>
            ))}
          </div>
          <button onClick={() => setSelectedElimination(null)} className={`text-sm text-white/40 text-center ${selectedElimination === null ? 'underline text-white/60' : ''}`}>No elimination</button>
          <button onClick={handleConfirmElimination} className="w-full py-4 rounded-2xl bg-red-700 border border-red-500 text-white text-lg font-bold active:scale-95 transition-transform">
            {selectedElimination ? `Eliminate ${getPlayerName(selectedElimination)} →` : 'Confirm: No Elimination →'}
          </button>
        </>
      )}

      {meta.phase === 'day_elimination' && (
        <>
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
            <p className="text-white text-lg font-semibold">Elimination revealed</p>
            <p className="text-white/50 text-sm mt-1">Check for a winner, then start next night.</p>
          </div>
          <PlayerList players={gamePlayers} showRoles compact />
          <button onClick={handleNextRound} className="w-full py-4 rounded-2xl bg-indigo-700 border border-indigo-500 text-white text-lg font-bold active:scale-95 transition-transform">🌙 Next Night →</button>
        </>
      )}

      <ActionLog log={actionLog} />
    </div>
  )
}
