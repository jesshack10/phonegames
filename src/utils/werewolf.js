const COLORS = ['Red', 'Orange', 'Yellow', 'Green', 'Teal', 'Blue', 'Indigo', 'Purple', 'Pink', 'Gray']
const ANIMALS = ['Fox', 'Wolf', 'Bear', 'Owl', 'Crow', 'Cat', 'Rabbit', 'Deer', 'Tiger', 'Frog']

export const ANIMAL_EMOJI = {
  Fox: '🦊', Wolf: '🐺', Bear: '🐻', Owl: '🦉', Crow: '🐦‍⬛',
  Cat: '🐱', Rabbit: '🐰', Deer: '🦌', Tiger: '🐯', Frog: '🐸',
}

export const COLOR_BG = {
  Red: 'bg-red-600', Orange: 'bg-orange-500', Yellow: 'bg-yellow-500',
  Green: 'bg-green-600', Teal: 'bg-teal-500', Blue: 'bg-blue-600',
  Indigo: 'bg-indigo-600', Purple: 'bg-purple-600', Pink: 'bg-pink-500',
  Gray: 'bg-gray-500',
}

export const ROLE_CONFIG = {
  werewolf: { label: 'Werewolf', emoji: '🐺', bg: 'bg-red-900', border: 'border-red-500', text: 'text-red-400' },
  villager: { label: 'Villager', emoji: '🏡', bg: 'bg-green-900', border: 'border-green-500', text: 'text-green-400' },
  seer: { label: 'Seer', emoji: '🔮', bg: 'bg-indigo-900', border: 'border-indigo-400', text: 'text-indigo-300' },
  doctor: { label: 'Doctor', emoji: '💉', bg: 'bg-teal-900', border: 'border-teal-400', text: 'text-teal-300' },
}

export function generateAvatar() {
  const color = COLORS[Math.floor(Math.random() * COLORS.length)]
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
  return `${color}${animal}`
}

export function parseAvatar(avatar) {
  for (const color of COLORS) {
    if (avatar.startsWith(color)) {
      const animal = avatar.slice(color.length)
      return { color, animal }
    }
  }
  return { color: 'Gray', animal: 'Wolf' }
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function suggestRoles(playerCount) {
  const n = playerCount
  let werewolves, seers, doctors
  if (n <= 4) { werewolves = 1; seers = 0; doctors = 0 }
  else if (n <= 5) { werewolves = 1; seers = 1; doctors = 0 }
  else if (n <= 7) { werewolves = 1; seers = 1; doctors = 1 }
  else if (n <= 10) { werewolves = 2; seers = 1; doctors = 1 }
  else if (n <= 15) { werewolves = 3; seers = 1; doctors = 1 }
  else { werewolves = 4; seers = 1; doctors = 1 }
  return { werewolves, seers, doctors, villagers: n - werewolves - seers - doctors }
}

export function assignRoles(playerIds, roleConfig) {
  const { werewolves, seers, doctors, villagers } = roleConfig
  const roleList = [
    ...Array(werewolves).fill('werewolf'),
    ...Array(seers).fill('seer'),
    ...Array(doctors).fill('doctor'),
    ...Array(villagers).fill('villager'),
  ]
  const shuffled = shuffle(roleList)
  return playerIds.map((playerId, i) => ({ playerId, role: shuffled[i] }))
}

export function checkWinCondition(players) {
  const living = players.filter(p => p.alive && p.role !== 'moderator')
  const livingWerewolves = living.filter(p => p.role === 'werewolf').length
  const livingOthers = living.filter(p => p.role !== 'werewolf').length
  if (livingWerewolves === 0) return 'villagers'
  if (livingWerewolves >= livingOthers) return 'werewolves'
  return null
}

export function resolveNight(nightActions, players) {
  const { werewolfTarget, doctorTarget } = nightActions
  if (!werewolfTarget) return { killed: null, savedByDoctor: false }
  const savedByDoctor = werewolfTarget === doctorTarget
  return { killed: savedByDoctor ? null : werewolfTarget, savedByDoctor }
}

export function getNextNightTurn(players, currentTurn) {
  const living = players.filter(p => p.alive)
  const order = ['werewolves', 'doctor', 'seer']
  const currentIndex = order.indexOf(currentTurn)
  for (let i = currentIndex + 1; i < order.length; i++) {
    const turn = order[i]
    const role = turn === 'werewolves' ? 'werewolf' : turn
    if (living.some(p => p.role === role)) return turn
  }
  return null
}

export function tallyVotes(votes, players) {
  const counts = {}
  for (const targetId of Object.values(votes)) {
    counts[targetId] = (counts[targetId] || 0) + 1
  }
  const living = players.filter(p => p.alive && p.role !== 'moderator')
  return living
    .map(p => ({ ...p, votes: counts[p.id] || 0 }))
    .sort((a, b) => b.votes - a.votes)
}
