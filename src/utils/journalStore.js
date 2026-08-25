// Time-journal persistence. Device-local (localStorage) by design: work notes
// never leave the phone. Every read/write goes through this module so a synced
// backend can replace it without touching the UI.

const ENTRIES_KEY = 'pomodoro.journal.v1'
const TAGS_KEY = 'pomodoro.tags.v1'

export const DEFAULT_TAGS = ['deep work', 'meetings', 'email', 'admin', 'learning']

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (e) {
    console.warn('journalStore: could not save', e)
    return false
  }
}

/**
 * An entry:
 * { id, startedAt, endedAt, plannedMinutes, actualMinutes,
 *   mode: 'pomodoro' | 'block', intention, note, tag, details, next,
 *   completed, manual }
 * Timestamps are epoch ms. Breaks are never recorded. `details` is the long
 * note, `next` what you said you'd do afterwards, `manual` marks a block typed
 * in after the fact rather than timed.
 */
export function list() {
  return read(ENTRIES_KEY, []).sort((a, b) => b.startedAt - a.startedAt)
}

export function add(entry) {
  const entries = read(ENTRIES_KEY, [])
  entries.push(entry)
  write(ENTRIES_KEY, entries)
  if (entry.tag) addTag(entry.tag)
  return entry
}

export function update(id, patch) {
  const entries = read(ENTRIES_KEY, [])
  const i = entries.findIndex(e => e.id === id)
  if (i === -1) return null
  entries[i] = { ...entries[i], ...patch }
  write(ENTRIES_KEY, entries)
  if (patch.tag) addTag(patch.tag)
  return entries[i]
}

export function remove(id) {
  write(ENTRIES_KEY, read(ENTRIES_KEY, []).filter(e => e.id !== id))
}

export function listTags() {
  const custom = read(TAGS_KEY, [])
  return [...DEFAULT_TAGS, ...custom.filter(t => !DEFAULT_TAGS.includes(t))]
}

export function addTag(tag) {
  const clean = String(tag).trim()
  if (!clean || DEFAULT_TAGS.includes(clean)) return
  const custom = read(TAGS_KEY, [])
  if (custom.includes(clean)) return
  custom.push(clean)
  write(TAGS_KEY, custom)
}

export function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// --- date helpers shared by the journal + export -------------------------

export function dayKey(ms) {
  const d = new Date(ms)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Monday-based start of the current week. */
export function startOfWeek() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  const shift = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - shift)
  return d.getTime()
}

export function formatClock(ms) {
  const d = new Date(ms)
  const pad = n => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatDuration(minutes) {
  const m = Math.max(0, Math.round(minutes))
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return rest ? `${h}h ${rest}m` : `${h}h`
}

// --- reading the journal back -------------------------------------------

/** The most recent entry, for "same as last block". */
export function lastEntry() {
  const all = list()
  return all.length ? all[0] : null
}

/** Minutes per tag over the given entries, largest first. Untagged is kept. */
export function totalsByTag(entries) {
  const byTag = new Map()
  for (const e of entries) {
    const key = e.tag || ''
    byTag.set(key, (byTag.get(key) || 0) + e.actualMinutes)
  }
  return [...byTag.entries()]
    .map(([tag, minutes]) => ({ tag, minutes }))
    .sort((a, b) => b.minutes - a.minutes)
}

/**
 * Untracked stretches between consecutive blocks on one day. The day is only
 * as honest as its holes, so anything past the threshold is worth showing.
 */
export function findGaps(dayEntries, minMinutes = 15) {
  const sorted = [...dayEntries].sort((a, b) => a.startedAt - b.startedAt)
  const gaps = []
  for (let i = 1; i < sorted.length; i++) {
    const from = sorted[i - 1].endedAt
    const to = sorted[i].startedAt
    const minutes = Math.round((to - from) / 60000)
    if (minutes >= minMinutes) gaps.push({ from, to, minutes, afterId: sorted[i - 1].id })
  }
  return gaps
}

/** Free-text search across everything the entry carries. */
export function matchesQuery(entry, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [entry.note, entry.details, entry.tag, entry.intention, entry.next]
    .filter(Boolean)
    .some(field => String(field).toLowerCase().includes(q))
}

export function startOfDay(ms) {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Local "YYYY-MM-DDTHH:MM" for datetime-local inputs. */
export function toLocalInput(ms) {
  const d = new Date(ms)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromLocalInput(value) {
  const ms = new Date(value).getTime()
  return Number.isNaN(ms) ? null : ms
}
