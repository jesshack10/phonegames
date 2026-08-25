import { formatClock, dayKey } from './journalStore'

const COLUMNS = [
  'date', 'start', 'end', 'minutes', 'planned', 'mode',
  'note', 'tag', 'details', 'next', 'intention', 'completed', 'manual',
]

function cell(value) {
  const text = value == null ? '' : String(value)
  // Quote whenever the text could otherwise break the row.
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** One row per entry, for pivoting in a spreadsheet. */
export function buildCsv(entries) {
  const rows = [COLUMNS.join(',')]
  for (const e of entries) {
    rows.push([
      dayKey(e.startedAt),
      formatClock(e.startedAt),
      formatClock(e.endedAt),
      e.actualMinutes,
      e.plannedMinutes ?? '',
      e.mode === 'block' ? 'time block' : 'pomodoro',
      e.note || '',
      e.tag || '',
      e.details || '',
      e.next || '',
      e.intention || '',
      e.completed ? 'yes' : 'no',
      e.manual ? 'yes' : 'no',
    ].map(cell).join(','))
  }
  // Excel needs the BOM to read UTF-8 accents correctly.
  return '﻿' + rows.join('\r\n') + '\r\n'
}
