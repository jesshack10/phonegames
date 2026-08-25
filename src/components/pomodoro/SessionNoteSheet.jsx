import { useState, useEffect, useRef } from 'react'
import { formatClock } from '../../utils/journalStore'

/**
 * Slides up when a focus block ends (or is cut short). The note is pre-filled
 * with the intention so the common case is a single tap on Save.
 *
 * Colours come from the active visual's theme, so the sheet belongs to
 * whichever instrument is on screen.
 */
export default function SessionNoteSheet({ draft, tags, theme, onSave, onSkip }) {
  const [note, setNote] = useState('')
  const [tag, setTag] = useState('')
  const [addingTag, setAddingTag] = useState(false)
  const [newTag, setNewTag] = useState('')
  const newTagRef = useRef(null)

  useEffect(() => {
    if (!draft) return
    setNote(draft.intention || '')
    setTag('')
    setAddingTag(false)
    setNewTag('')
  }, [draft])

  useEffect(() => {
    if (addingTag) newTagRef.current?.focus()
  }, [addingTag])

  if (!draft) return null

  function confirmNewTag() {
    const clean = newTag.trim()
    if (clean) setTag(clean)
    setAddingTag(false)
    setNewTag('')
  }

  const allTags = tag && !tags.includes(tag) ? [...tags, tag] : tags
  const field = {
    background: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.12)',
    color: theme.digits,
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm">
      <div
        className="w-full max-w-md border-t border-x rounded-t-3xl px-5 pt-6 pb-8 flex flex-col gap-5
          animate-[slideUp_0.25s_ease-out]"
        style={{ background: theme.bg, borderColor: 'rgba(255,255,255,0.12)' }}
      >
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: theme.label }}>
            {draft.completed ? 'Block complete' : 'Ended early'}
          </span>
          <span className="text-sm tabular-nums" style={{ color: theme.accent }}>
            ◷ {draft.actualMinutes} min · {formatClock(draft.startedAt)} – {formatClock(draft.endedAt)}
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          <label className="text-[10px] uppercase tracking-[0.2em]" style={{ color: theme.label }}>
            What were you doing?
          </label>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. Reviewed the migration PR"
            className="border rounded-xl px-4 py-3 placeholder-gray-700 focus:outline-none transition-colors"
            style={field}
          />

          <div className="flex flex-wrap gap-2">
            {allTags.map(t => (
              <button
                key={t}
                onClick={() => setTag(tag === t ? '' : t)}
                className="px-3 py-1.5 rounded-full text-xs border transition-all active:scale-95"
                style={tag === t
                  ? { borderColor: theme.ctlBorder, background: theme.ctlBg, color: theme.ctlText }
                  : { borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)' }}
              >{t}</button>
            ))}
            {addingTag ? (
              <input
                ref={newTagRef}
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onBlur={confirmNewTag}
                onKeyDown={e => { if (e.key === 'Enter') confirmNewTag() }}
                placeholder="new tag"
                className="px-3 py-1.5 rounded-full text-xs border focus:outline-none w-24"
                style={{ ...field, borderColor: theme.ctlBorder }}
              />
            ) : (
              <button
                onClick={() => setAddingTag(true)}
                className="px-3 py-1.5 rounded-full text-xs border border-dashed active:scale-95 transition-transform"
                style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.35)' }}
              >+</button>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onSkip}
            className="px-5 py-4 rounded-2xl border text-sm active:scale-95 transition-transform"
            style={{ borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)' }}
          >Skip</button>
          <button
            onClick={() => onSave(note.trim(), tag)}
            className="flex-1 py-4 rounded-2xl border-2 font-bold active:scale-95 transition-transform"
            style={{ borderColor: theme.ctlBorder, background: theme.ctlBg, color: theme.ctlText }}
          >Save</button>
        </div>
      </div>
    </div>
  )
}
