// Minimal RFC 5545 writer for journal entries. No dependency: one timed VEVENT
// per focus block, with a stable UID so a re-import updates instead of
// duplicating.

function pad(n) {
  return String(n).padStart(2, '0')
}

function toUtcStamp(ms) {
  const d = new Date(ms)
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  )
}

function escapeText(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/** Content lines must not exceed 75 octets; continuations start with a space. */
function fold(line) {
  if (line.length <= 75) return line
  const out = [line.slice(0, 75)]
  let rest = line.slice(75)
  while (rest.length > 74) {
    out.push(' ' + rest.slice(0, 74))
    rest = rest.slice(74)
  }
  if (rest) out.push(' ' + rest)
  return out.join('\r\n')
}

export function buildIcs(entries, { now = Date.now() } = {}) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//phonegames//pomodoro-journal//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  for (const entry of entries) {
    // A zero-length event is invisible in most calendars — floor at one minute.
    const end = Math.max(entry.endedAt, entry.startedAt + 60000)
    const summary = entry.note?.trim() || entry.intention?.trim() || 'Focus block'
    const details = [
      entry.details ? entry.details : null,
      entry.intention ? `Intention: ${entry.intention}` : null,
      entry.tag ? `Tag: ${entry.tag}` : null,
      entry.next ? `Next: ${entry.next}` : null,
      `Mode: ${entry.mode === 'block' ? 'Time block' : 'Pomodoro'}`,
      `Planned: ${entry.plannedMinutes} min`,
      entry.completed ? null : 'Ended early',
    ].filter(Boolean).join('\n')

    lines.push(
      'BEGIN:VEVENT',
      `UID:${entry.id}@pomodoro.phonegames`,
      `DTSTAMP:${toUtcStamp(now)}`,
      `DTSTART:${toUtcStamp(entry.startedAt)}`,
      `DTEND:${toUtcStamp(end)}`,
      fold(`SUMMARY:${escapeText(summary)}`),
      fold(`DESCRIPTION:${escapeText(details)}`),
      ...(entry.tag ? [fold(`CATEGORIES:${escapeText(entry.tag)}`)] : []),
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}

/**
 * Hand the file to the OS. Share is tried first: on iOS the share sheet routes
 * reliably into Calendar, while PWA downloads are hit-or-miss there.
 * Returns 'shared' | 'cancelled' | 'downloaded'.
 */
export async function deliverIcs(filename, content, mime = 'text/calendar') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })

  try {
    const file = new File([blob], filename, { type: mime })
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: filename })
      return 'shared'
    }
  } catch (e) {
    if (e?.name === 'AbortError') return 'cancelled'
    // Anything else: fall through to the download path.
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 10000)
  return 'downloaded'
}
