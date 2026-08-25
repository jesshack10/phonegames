import { useState, useEffect, useRef } from 'react'
import { formatClock } from '../../utils/journalStore'

/**
 * Slides up when a period ends, or when you step out of one mid-way. The note
 * is pre-filled with the intention so the common case is a single tap.
 *
 * `draft.canContinue` marks a block that finished on its own and will roll into
 * the next one; `draft.midBlock` marks stepping out of a block that still has
 * time left, where continuing means resuming the same countdown with a fresh
 * segment — that is what lets one deep-focus block hold several logged pieces
 * of work.
 *
 * Colours come from the active visual's theme, so the sheet belongs to
 * whichever instrument is on screen.
 */
export default function SessionNoteSheet({ draft, tags, theme, last, onSave, onSkip, onCancel }) {
  const [note, setNote] = useState('')
  const [tag, setTag] = useState('')
  const [details, setDetails] = useState('')
  const [next, setNext] = useState('')
  const [showMore, setShowMore] = useState(false)
  const [addingTag, setAddingTag] = useState(false)
  const [newTag, setNewTag] = useState('')
  const newTagRef = useRef(null)

  useEffect(() => {
    if (!draft) return
    setNote(draft.intention || '')
    setTag('')
    setDetails('')
    setNext('')
    setShowMore(false)
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

  function reuseLast() {
    if (!last) return
    setNote(last.note || '')
    setTag(last.tag || '')
    if (last.details) { setDetails(last.details); setShowMore(true) }
  }

  const payload = choice => ({ note: note.trim(), tag, details: details.trim(), next: next.trim(), choice })
  const allTags = tag && !tags.includes(tag) ? [...tags, tag] : tags
  const field = {
    background: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.12)',
    color: theme.digits,
  }
  const muted = 'rgba(255,255,255,0.35)'
  const continues = draft.canContinue || draft.midBlock

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm">
      <div
        className="w-full max-w-md border-t border-x rounded-t-3xl px-5 pt-6 pb-8 flex flex-col gap-4
          max-h-[92vh] overflow-y-auto animate-[slideUp_0.25s_ease-out]"
        style={{ background: theme.bg, borderColor: 'rgba(255,255,255,0.12)' }}
      >
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: theme.label }}>
            {draft.midBlock
              ? 'Stepping out'
              : draft.completed ? 'Block complete' : 'Ended early'}
            {draft.canContinue && ' · next one starts after this'}
          </span>
          <span className="text-sm tabular-nums" style={{ color: theme.accent }}>
            ◷ {draft.actualMinutes} min · {formatClock(draft.startedAt)} – {formatClock(draft.endedAt)}
          </span>
        </div>

        {last && (
          <button
            onClick={reuseLast}
            className="text-left text-xs px-3 py-2 rounded-xl border border-dashed active:scale-[0.98] transition-transform"
            style={{ borderColor: 'rgba(255,255,255,0.15)', color: muted }}
          >
            ↺ Same as last: <span style={{ color: theme.digits }}>{last.note || 'Untitled'}</span>
            {last.tag && ` · ${last.tag}`}
          </button>
        )}

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
                style={{ borderColor: 'rgba(255,255,255,0.15)', color: muted }}
              >+</button>
            )}
          </div>
        </div>

        {/* Detail and hand-off stay folded away so the fast path is one tap. */}
        {showMore ? (
          <div className="flex flex-col gap-2.5">
            <textarea
              value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder="Details, links, decisions... (optional)"
              rows={3}
              className="border rounded-xl px-4 py-3 text-sm placeholder-gray-700 focus:outline-none resize-none"
              style={field}
            />
            <input
              value={next}
              onChange={e => setNext(e.target.value)}
              placeholder="What's next? (becomes the next block's intention)"
              className="border rounded-xl px-4 py-3 text-sm placeholder-gray-700 focus:outline-none"
              style={field}
            />
          </div>
        ) : (
          <button
            onClick={() => setShowMore(true)}
            className="self-start text-xs active:opacity-50 transition-opacity"
            style={{ color: muted }}
          >+ details &amp; what's next</button>
        )}

        <div className="flex gap-3">
          {!draft.midBlock && (
            <button
              onClick={onSkip}
              className="px-5 py-4 rounded-2xl border text-sm active:scale-95 transition-transform"
              style={{ borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)' }}
            >Skip</button>
          )}
          <button
            onClick={() => onSave(payload('continue'))}
            className="flex-1 py-4 rounded-2xl border-2 font-bold active:scale-95 transition-transform"
            style={{ borderColor: theme.ctlBorder, background: theme.ctlBg, color: theme.ctlText }}
          >
            {draft.midBlock ? 'Save & keep going' : continues ? 'Save & continue' : 'Save'}
          </button>
        </div>

        {continues && (
          <button
            onClick={() => onSave(payload('finish'))}
            className="-mt-1 py-1 text-xs active:opacity-50 transition-opacity"
            style={{ color: muted }}
          >
            {draft.midBlock ? 'save & close the timer' : 'save & finish for now'}
          </button>
        )}

        {/* Stepping out was a choice, so backing out of it must be one too. */}
        {draft.midBlock && onCancel && (
          <button
            onClick={onCancel}
            className="py-1 text-xs active:opacity-50 transition-opacity"
            style={{ color: 'rgba(255,255,255,0.22)' }}
          >never mind — back to the timer</button>
        )}
      </div>
    </div>
  )
}
