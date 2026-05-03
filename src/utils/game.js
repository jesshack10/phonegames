import { getRandomWord } from '../data/words.js'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function generateGame(numPlayers, numImpostors, category) {
  const word = getRandomWord(category)
  const roles = shuffle([
    ...Array(numImpostors).fill('impostor'),
    ...Array(numPlayers - numImpostors).fill('crewmate'),
  ])
  return { word, roles }
}

export function buildRevealURL(playerIndex, role, word, numPlayers, numImpostors) {
  const data = {
    p: playerIndex + 1,
    t: numPlayers,
    n: numImpostors,
    r: role === 'crewmate' ? 'c' : 'i',
    ...(role === 'crewmate' && { w: word }),
  }
  const encoded = btoa(JSON.stringify(data))
  const base = `${window.location.origin}${window.location.pathname}`
  return `${base}#/reveal?d=${encodeURIComponent(encoded)}`
}

export function decodeRevealData(encoded) {
  try {
    const { p, t, n, r, w } = JSON.parse(atob(decodeURIComponent(encoded)))
    return {
      playerNum: p,
      totalPlayers: t,
      numImpostors: n,
      role: r === 'c' ? 'crewmate' : 'impostor',
      word: w ?? null,
    }
  } catch {
    return null
  }
}
