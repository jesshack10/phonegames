import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  list as listEntries, add as addEntry, update as updateEntry, remove as removeEntry,
  listTags, newId, dayKey, startOfToday, startOfWeek, formatClock, formatDuration,
  totalsByTag, findGaps, matchesQuery, toLocalInput, fromLocalInput,
} from '../../utils/journalStore'
import { buildIcs, deliverIcs } from '../../utils/ics'
import { buildCsv } from '../../utils/csv'

function dayLabel(key) {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  if (key === dayKey(Date.now())) return 'Today'
  if (key === dayKey(Date.now() - 86400000)) return 'Yesterday'
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

const FIELD = 'bg-[#0a0a18] border border-gray-800 focus:border-amber-600 rounded-xl px-4 py-3 text-white placeholder-gray-700 focus:outline-none transition-colors'
const CHIP = 'px-3 py-1.5 rounded-full text-xs border transition-all active:scale-95'
const CHIP_ON = 'border-amber-500/60 bg-amber-500/15 text-amber-300'
const CHIP_OFF = 'border-gray-800 bg-[#10102a] text-gray-600'

function Sheet({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-[#10102a] border-t border-x border-gray-800 rounded-t-3xl
          px-5 pt-6 pb-8 flex flex-col gap-4 max-h-[92vh] overflow-y-auto animate-[slideUp_0.25s_ease-out]"
      >{children}</div>
    </div>
  )
}

function TagPicker({ tags, tag, setTag }) {
  const all = tag && !tags.includes(tag) ? [...tags, tag] : tags
  return (
    <div className="flex flex-wrap gap-2">
      {all.map(t => (
        <button key={t} onClick={() => setTag(tag === t ? '' : t)}
          className={`${CHIP} ${tag === t ? CHIP_ON : 'border-gray-800 bg-[#0a0a18] text-gray-500'}`}
        >{t}</button>
      ))}
    </div>
  )
}

/** Add a block that happened away from the timer, or fix one that was timed. */
function EntryForm({ entry, tags, title, onClose, onSave, onDelete }) {
  const [note, setNote] = useState(entry.note || '')
  const [tag, setTag] = useState(entry.tag || '')
  const [details, setDetails] = useState(entry.details || '')
  const [start, setStart] = useState(toLocalInput(entry.startedAt))
  const [end, setEnd] = useState(toLocalInput(entry.endedAt))
  const [error, setError] = useState('')

  function save() {
    const startedAt = fromLocalInput(start)
    const endedAt = fromLocalInput(end)
    if (startedAt == null || endedAt == null) return setError('Those times don’t look right')
    if (endedAt <= startedAt) return setError('The end has to come after the start')
    onSave({
      note: note.trim(), tag, details: details.trim(),
      startedAt, endedAt,
      actualMinutes: Math.max(1, Math.round((endedAt - startedAt) / 60000)),
    })
  }

  return (
    <Sheet onClose={onClose}>
      <span className="text-[10px] text-gray-500 uppercase tracking-[0.2em]">{title}</span>

      <input value={note} onChange={e => setNote(e.target.value)}
        placeholder="What were you doing?" className={FIELD} />

      <TagPicker tags={tags} tag={tag} setTag={setTag} />

      <div className="flex gap-3">
        {[['Start', start, setStart], ['End', end, setEnd]].map(([label, value, set]) => (
          <label key={label} className="flex-1 flex flex-col gap-1">
            <span className="text-[9px] text-gray-600 uppercase tracking-widest">{label}</span>
            <input type="datetime-local" value={value} onChange={e => { set(e.target.value); setError('') }}
              className={`${FIELD} text-sm`} />
          </label>
        ))}
      </div>

      <textarea value={details} onChange={e => setDetails(e.target.value)}
        placeholder="Details... (optional)" rows={3} className={`${FIELD} text-sm resize-none`} />

      {error && <p className="text-xs text-red-400/80">{error}</p>}

      <div className="flex gap-3">
        {onDelete && (
          <button onClick={onDelete}
            className="px-5 py-4 rounded-2xl border border-red-900/60 text-red-400/80 text-sm active:scale-95 transition-transform"
          >Delete</button>
        )}
        <button onClick={save}
          className="flex-1 py-4 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 border border-amber-400/40 text-white font-bold active:scale-95 transition-transform"
        >Save</button>
      </div>
    </Sheet>
  )
}

/** Where the time actually went, which is the whole point of the tags. */
function Review({ entries, range, setRange }) {
  const totals = useMemo(() => totalsByTag(entries), [entries])
  const grand = totals.reduce((sum, t) => sum + t.minutes, 0)
  const days = new Set(entries.map(e => dayKey(e.startedAt))).size

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-2">
        {[['today', 'Today'], ['week', 'This week'], ['all', 'All time']].map(([id, label]) => (
          <button key={id} onClick={() => setRange(id)}
            className={`${CHIP} ${range === id ? CHIP_ON : CHIP_OFF}`}>{label}</button>
        ))}
      </div>

      {grand === 0 ? (
        <p className="text-gray-700 text-sm">Nothing logged in this range yet.</p>
      ) : (
        <>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-amber-400 tabular-nums">{formatDuration(grand)}</span>
            <span className="text-[10px] text-gray-600 uppercase tracking-[0.2em]">
              focused · {entries.length} {entries.length === 1 ? 'block' : 'blocks'}
              {days > 1 && ` · ${days} days`}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {totals.map(({ tag, minutes }) => (
              <div key={tag || 'untagged'} className="flex flex-col gap-1.5">
                <div className="flex justify-between items-baseline">
                  <span className={`text-sm ${tag ? 'text-white' : 'text-gray-600 italic'}`}>
                    {tag || 'untagged'}
                  </span>
                  <span className="text-xs text-gray-500 tabular-nums">
                    {formatDuration(minutes)} · {Math.round((minutes / grand) * 100)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#10102a] overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-700"
                    style={{ width: `${Math.max(2, (minutes / grand) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>

          {days > 1 && (
            <p className="text-[11px] text-gray-700">
              That averages {formatDuration(grand / days)} of focused work per logged day.
            </p>
          )}
        </>
      )}
    </div>
  )
}

export default function PomodoroJournal() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState(() => listEntries())
  const [tags, setTags] = useState(() => listTags())
  const [view, setView] = useState('log')
  const [range, setRange] = useState('week')
  const [query, setQuery] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [status, setStatus] = useState('')

  function refresh() {
    setEntries(listEntries())
    setTags(listTags())
  }

  const visible = useMemo(() => entries.filter(e =>
    (!filterTag || e.tag === filterTag) && matchesQuery(e, query)
  ), [entries, filterTag, query])

  const inRange = useMemo(() => {
    if (range === 'today') return visible.filter(e => e.startedAt >= startOfToday())
    if (range === 'week') return visible.filter(e => e.startedAt >= startOfWeek())
    return visible
  }, [visible, range])

  const days = useMemo(() => {
    const groups = new Map()
    for (const entry of visible) {
      const key = dayKey(entry.startedAt)
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(entry)
    }
    return [...groups.entries()]
  }, [visible])

  const weekTotal = useMemo(
    () => visible.filter(e => e.startedAt >= startOfWeek()).reduce((s, e) => s + e.actualMinutes, 0),
    [visible],
  )

  const usedTags = useMemo(() => tags.filter(t => entries.some(e => e.tag === t)), [tags, entries])

  async function runExport(format, scope) {
    let selected = entries
    if (scope === 'today') selected = entries.filter(e => e.startedAt >= startOfToday())
    else if (scope === 'week') selected = entries.filter(e => e.startedAt >= startOfWeek())
    else if (scope === 'filter') selected = visible

    setExporting(false)
    if (!selected.length) return setStatus('Nothing to export in that range')

    // Calendars and spreadsheets both read best oldest-first.
    const ordered = [...selected].sort((a, b) => a.startedAt - b.startedAt)
    const isCsv = format === 'csv'
    const filename = `time-journal-${scope}-${dayKey(Date.now())}.${isCsv ? 'csv' : 'ics'}`
    try {
      const result = await deliverIcs(
        filename,
        isCsv ? buildCsv(ordered) : buildIcs(ordered),
        isCsv ? 'text/csv' : 'text/calendar',
      )
      if (result === 'cancelled') setStatus('')
      else setStatus(`${selected.length} ${selected.length === 1 ? 'entry' : 'entries'} exported`)
    } catch (e) {
      console.warn('export failed', e)
      setStatus('Export failed — try again')
    }
  }

  function blankEntry(from, to) {
    const start = from ?? Date.now() - 30 * 60000
    return {
      startedAt: start, endedAt: to ?? Date.now(),
      note: '', tag: '', details: '',
      mode: 'block', intention: '', completed: true, manual: true,
      plannedMinutes: Math.max(1, Math.round(((to ?? Date.now()) - start) / 60000)),
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a18] text-white flex flex-col px-5 pt-6 pb-10 gap-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/pomodoro')}
          className="text-gray-600 text-sm active:opacity-50 transition-opacity">← back</button>
        <h1 className="text-xl font-bold tracking-widest text-amber-400">JOURNAL</h1>
        <button onClick={() => setAdding(blankEntry())}
          className="ml-auto text-gray-500 text-sm active:opacity-50 transition-opacity">+ Add</button>
        <button onClick={() => setExporting(true)}
          className="text-gray-500 text-sm active:opacity-50 transition-opacity">↗ Export</button>
      </div>

      <div className="flex bg-[#10102a] border border-gray-800 rounded-xl p-1">
        {[['log', 'Log'], ['review', 'Review']].map(([id, label]) => (
          <button key={id} onClick={() => setView(id)} aria-pressed={view === id}
            className={`flex-1 py-2.5 rounded-lg text-sm transition-all ${
              view === id ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                          : 'text-gray-600 border border-transparent'}`}
          >{label}</button>
        ))}
      </div>

      {status && <p className="text-xs text-amber-400/70">{status}</p>}

      {entries.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
          <span className="text-4xl opacity-40">📓</span>
          <p className="text-gray-600 text-sm">No entries yet.</p>
          <p className="text-gray-700 text-xs max-w-xs leading-relaxed">
            Finish a focus block and you'll be asked what you were doing. Those answers land here.
          </p>
          <div className="flex gap-3 mt-3">
            <button onClick={() => navigate('/pomodoro')}
              className="px-6 py-3 rounded-xl border border-amber-600/40 text-amber-300 text-sm active:scale-95 transition-transform"
            >Start a block</button>
            <button onClick={() => setAdding(blankEntry())}
              className="px-6 py-3 rounded-xl border border-gray-800 text-gray-500 text-sm active:scale-95 transition-transform"
            >Add one by hand</button>
          </div>
        </div>
      ) : view === 'review' ? (
        <Review entries={inRange} range={range} setRange={setRange} />
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-400 tabular-nums">{formatDuration(weekTotal)}</span>
            <span className="text-[10px] text-gray-600 uppercase tracking-[0.2em]">this week</span>
          </div>

          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search notes, tags, details..." className={`${FIELD} text-sm`} />

          {usedTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setFilterTag('')}
                className={`${CHIP} ${filterTag === '' ? CHIP_ON : CHIP_OFF}`}>all</button>
              {usedTags.map(t => (
                <button key={t} onClick={() => setFilterTag(filterTag === t ? '' : t)}
                  className={`${CHIP} ${filterTag === t ? CHIP_ON : CHIP_OFF}`}>{t}</button>
              ))}
            </div>
          )}

          {days.length === 0 && (
            <p className="text-gray-700 text-sm">Nothing matches that search.</p>
          )}

          <div className="flex flex-col gap-6">
            {days.map(([key, dayEntries]) => {
              const total = dayEntries.reduce((sum, e) => sum + e.actualMinutes, 0)
              const ordered = [...dayEntries].sort((a, b) => a.startedAt - b.startedAt)
              // Only meaningful on the unfiltered log; a filter invents holes.
              const gaps = (filterTag || query) ? [] : findGaps(ordered)
              const gapAfter = new Map(gaps.map(g => [g.afterId, g]))
              return (
                <section key={key} className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between border-b border-gray-900 pb-1.5">
                    <span className="text-xs text-gray-400 uppercase tracking-[0.15em]">{dayLabel(key)}</span>
                    <span className="text-xs text-amber-500/60 tabular-nums">{formatDuration(total)}</span>
                  </div>

                  {ordered.map(entry => (
                    <div key={entry.id} className="flex flex-col gap-2">
                      <button onClick={() => setEditing(entry)}
                        className="flex items-start gap-3 text-left bg-[#10102a] border border-gray-800 rounded-xl px-3.5 py-3 active:scale-[0.98] transition-transform">
                        <div className="flex flex-col items-start min-w-[52px]">
                          <span className="text-xs text-gray-400 tabular-nums">{formatClock(entry.startedAt)}</span>
                          <span className="text-[10px] text-gray-700 tabular-nums">{formatDuration(entry.actualMinutes)}</span>
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                          <span className={`text-sm truncate ${entry.note ? 'text-white' : 'text-gray-700 italic'}`}>
                            {entry.note || 'Untitled block'}
                          </span>
                          {entry.details && (
                            <span className="text-[11px] text-gray-600 line-clamp-2">{entry.details}</span>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            {entry.tag && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400/70 border border-amber-900/40">
                                {entry.tag}
                              </span>
                            )}
                            {entry.manual && <span className="text-[10px] text-gray-700">added by hand</span>}
                            {!entry.completed && <span className="text-[10px] text-gray-700">ended early</span>}
                          </div>
                        </div>
                      </button>

                      {gapAfter.has(entry.id) && (() => {
                        const gap = gapAfter.get(entry.id)
                        return (
                          <button onClick={() => setAdding(blankEntry(gap.from, gap.to))}
                            className="self-stretch text-left text-[11px] text-gray-700 border border-dashed border-gray-900 rounded-xl px-3.5 py-2 active:scale-[0.98] transition-transform">
                            {formatDuration(gap.minutes)} untracked · <span className="text-gray-600">fill it in</span>
                          </button>
                        )
                      })()}
                    </div>
                  ))}
                </section>
              )
            })}
          </div>
        </>
      )}

      {exporting && (
        <Sheet onClose={() => setExporting(false)}>
          <span className="text-[10px] text-gray-500 uppercase tracking-[0.2em]">Export</span>
          <p className="text-[11px] text-gray-700 leading-relaxed -mt-1">
            Calendar files open straight into Apple Calendar, Google Calendar or Outlook.
            The spreadsheet is one row per block, for slicing the numbers yourself.
          </p>
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This week' },
            { id: 'all', label: 'Everything' },
            ...((filterTag || query) ? [{ id: 'filter', label: 'Current search / filter' }] : []),
          ].map(s => (
            <div key={s.id} className="flex gap-2 items-center">
              <span className="flex-1 text-sm text-gray-400">{s.label}</span>
              <button onClick={() => runExport('ics', s.id)}
                className="px-4 py-2.5 rounded-xl border border-gray-800 bg-[#0a0a18] text-white text-xs active:scale-95 transition-transform"
              >Calendar</button>
              <button onClick={() => runExport('csv', s.id)}
                className="px-4 py-2.5 rounded-xl border border-gray-800 bg-[#0a0a18] text-white text-xs active:scale-95 transition-transform"
              >Spreadsheet</button>
            </div>
          ))}
          <button onClick={() => setExporting(false)} className="py-3 text-gray-600 text-sm">Cancel</button>
        </Sheet>
      )}

      {adding && (
        <EntryForm
          entry={adding} tags={tags} title="Add a block"
          onClose={() => setAdding(null)}
          onSave={patch => {
            addEntry({ ...adding, ...patch, id: newId() })
            setAdding(null)
            refresh()
          }}
        />
      )}

      {editing && (
        <EntryForm
          entry={editing} tags={tags} title="Edit block"
          onClose={() => setEditing(null)}
          onSave={patch => { updateEntry(editing.id, patch); setEditing(null); refresh() }}
          onDelete={() => { removeEntry(editing.id); setEditing(null); refresh() }}
        />
      )}
    </div>
  )
}
