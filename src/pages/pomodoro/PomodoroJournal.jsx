import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  list as listEntries, update as updateEntry, remove as removeEntry, listTags,
  dayKey, startOfToday, startOfWeek, formatClock, formatDuration,
} from '../../utils/journalStore'
import { buildIcs, deliverIcs } from '../../utils/ics'

function dayLabel(key) {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const today = dayKey(Date.now())
  const yesterday = dayKey(Date.now() - 86400000)
  if (key === today) return 'Today'
  if (key === yesterday) return 'Yesterday'
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

function EditSheet({ entry, tags, onClose, onSave, onDelete }) {
  const [note, setNote] = useState(entry.note || '')
  const [tag, setTag] = useState(entry.tag || '')
  const allTags = tag && !tags.includes(tag) ? [...tags, tag] : tags

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-[#10102a] border-t border-x border-gray-800 rounded-t-3xl px-5 pt-6 pb-8 flex flex-col gap-5 animate-[slideUp_0.25s_ease-out]"
      >
        <span className="text-amber-400/80 text-sm tabular-nums">
          ◷ {formatClock(entry.startedAt)} – {formatClock(entry.endedAt)} · {formatDuration(entry.actualMinutes)}
        </span>

        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="What were you doing?"
          className="bg-[#0a0a18] border border-gray-800 focus:border-amber-600 rounded-xl px-4 py-3 text-white placeholder-gray-700 focus:outline-none transition-colors"
        />

        <div className="flex flex-wrap gap-2">
          {allTags.map(t => (
            <button
              key={t}
              onClick={() => setTag(tag === t ? '' : t)}
              className={`px-3 py-1.5 rounded-full text-xs border transition-all active:scale-95 ${
                tag === t
                  ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
                  : 'border-gray-800 bg-[#0a0a18] text-gray-500'
              }`}
            >{t}</button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onDelete}
            className="px-5 py-4 rounded-2xl border border-red-900/60 text-red-400/80 text-sm active:scale-95 transition-transform"
          >Delete</button>
          <button
            onClick={() => onSave(note.trim(), tag)}
            className="flex-1 py-4 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 border border-amber-400/40 text-white font-bold active:scale-95 transition-transform"
          >Save</button>
        </div>
      </div>
    </div>
  )
}

export default function PomodoroJournal() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState(() => listEntries())
  const [tags] = useState(() => listTags())
  const [filterTag, setFilterTag] = useState('')
  const [editing, setEditing] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [status, setStatus] = useState('')

  const visible = useMemo(
    () => (filterTag ? entries.filter(e => e.tag === filterTag) : entries),
    [entries, filterTag],
  )

  const days = useMemo(() => {
    const groups = new Map()
    for (const entry of visible) {
      const key = dayKey(entry.startedAt)
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(entry)
    }
    return [...groups.entries()]
  }, [visible])

  const weekTotal = useMemo(() => {
    const from = startOfWeek()
    return visible
      .filter(e => e.startedAt >= from)
      .reduce((sum, e) => sum + e.actualMinutes, 0)
  }, [visible])

  const usedTags = useMemo(
    () => tags.filter(t => entries.some(e => e.tag === t)),
    [tags, entries],
  )

  function refresh() {
    setEntries(listEntries())
  }

  async function exportScope(scope) {
    let selected = entries
    if (scope === 'today') selected = entries.filter(e => e.startedAt >= startOfToday())
    else if (scope === 'week') selected = entries.filter(e => e.startedAt >= startOfWeek())
    else if (scope === 'filter') selected = visible

    setExporting(false)

    if (!selected.length) {
      setStatus('Nothing to export in that range')
      return
    }

    // Calendars read events forwards; hand them over oldest-first.
    const ordered = [...selected].sort((a, b) => a.startedAt - b.startedAt)
    const filename = `time-journal-${scope}-${dayKey(Date.now())}.ics`
    try {
      const result = await deliverIcs(filename, buildIcs(ordered))
      if (result === 'cancelled') setStatus('')
      else setStatus(`${selected.length} ${selected.length === 1 ? 'entry' : 'entries'} exported`)
    } catch (e) {
      console.warn('export failed', e)
      setStatus('Export failed — try again')
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a18] text-white flex flex-col px-5 pt-6 pb-10 gap-5">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/pomodoro')}
          className="text-gray-600 text-sm active:opacity-50 transition-opacity"
        >← back</button>
        <h1 className="text-xl font-bold tracking-widest text-amber-400">JOURNAL</h1>
        <button
          onClick={() => setExporting(true)}
          className="ml-auto text-gray-500 text-sm active:opacity-50 transition-opacity"
        >↗ Export</button>
      </div>

      {status && <p className="text-xs text-amber-400/70">{status}</p>}

      {entries.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
          <span className="text-4xl opacity-40">📓</span>
          <p className="text-gray-600 text-sm">No entries yet.</p>
          <p className="text-gray-700 text-xs max-w-xs leading-relaxed">
            Finish a focus block and you'll be asked what you were doing. Those answers land here.
          </p>
          <button
            onClick={() => navigate('/pomodoro')}
            className="mt-3 px-6 py-3 rounded-xl border border-amber-600/40 text-amber-300 text-sm active:scale-95 transition-transform"
          >Start a block</button>
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-400 tabular-nums">
              {formatDuration(weekTotal)}
            </span>
            <span className="text-[10px] text-gray-600 uppercase tracking-[0.2em]">this week</span>
          </div>

          {usedTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterTag('')}
                className={`px-3 py-1.5 rounded-full text-xs border transition-all active:scale-95 ${
                  filterTag === ''
                    ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
                    : 'border-gray-800 bg-[#10102a] text-gray-600'
                }`}
              >all</button>
              {usedTags.map(t => (
                <button
                  key={t}
                  onClick={() => setFilterTag(filterTag === t ? '' : t)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-all active:scale-95 ${
                    filterTag === t
                      ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
                      : 'border-gray-800 bg-[#10102a] text-gray-600'
                  }`}
                >{t}</button>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-6">
            {days.map(([key, dayEntries]) => {
              const total = dayEntries.reduce((sum, e) => sum + e.actualMinutes, 0)
              return (
                <section key={key} className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between border-b border-gray-900 pb-1.5">
                    <span className="text-xs text-gray-400 uppercase tracking-[0.15em]">
                      {dayLabel(key)}
                    </span>
                    <span className="text-xs text-amber-500/60 tabular-nums">
                      {formatDuration(total)}
                    </span>
                  </div>

                  {[...dayEntries].sort((a, b) => a.startedAt - b.startedAt).map(entry => (
                    <button
                      key={entry.id}
                      onClick={() => setEditing(entry)}
                      className="flex items-start gap-3 text-left bg-[#10102a] border border-gray-800 rounded-xl px-3.5 py-3 active:scale-[0.98] transition-transform"
                    >
                      <div className="flex flex-col items-start min-w-[52px]">
                        <span className="text-xs text-gray-400 tabular-nums">
                          {formatClock(entry.startedAt)}
                        </span>
                        <span className="text-[10px] text-gray-700 tabular-nums">
                          {formatDuration(entry.actualMinutes)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <span className={`text-sm truncate ${entry.note ? 'text-white' : 'text-gray-700 italic'}`}>
                          {entry.note || 'Untitled block'}
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          {entry.tag && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400/70 border border-amber-900/40">
                              {entry.tag}
                            </span>
                          )}
                          {!entry.completed && (
                            <span className="text-[10px] text-gray-700">ended early</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </section>
              )
            })}
          </div>
        </>
      )}

      {exporting && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setExporting(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md bg-[#10102a] border-t border-x border-gray-800 rounded-t-3xl px-5 pt-6 pb-8 flex flex-col gap-3 animate-[slideUp_0.25s_ease-out]"
          >
            <span className="text-[10px] text-gray-500 uppercase tracking-[0.2em]">
              Export to calendar
            </span>
            <p className="text-[11px] text-gray-700 leading-relaxed -mt-1">
              Creates a calendar file — open it to add each block to Apple Calendar, Google
              Calendar, or Outlook.
            </p>
            {[
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'This week' },
              { id: 'all', label: 'Everything' },
              ...(filterTag ? [{ id: 'filter', label: `Current filter · ${filterTag}` }] : []),
            ].map(s => (
              <button
                key={s.id}
                onClick={() => exportScope(s.id)}
                className="py-4 rounded-xl border border-gray-800 bg-[#0a0a18] text-white text-sm active:scale-95 transition-transform"
              >{s.label}</button>
            ))}
            <button
              onClick={() => setExporting(false)}
              className="py-3 text-gray-600 text-sm"
            >Cancel</button>
          </div>
        </div>
      )}

      {editing && (
        <EditSheet
          entry={editing}
          tags={tags}
          onClose={() => setEditing(null)}
          onSave={(note, tag) => {
            updateEntry(editing.id, { note, tag })
            setEditing(null)
            refresh()
          }}
          onDelete={() => {
            removeEntry(editing.id)
            setEditing(null)
            refresh()
          }}
        />
      )}
    </div>
  )
}
