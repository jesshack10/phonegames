export default function NumPad({ value, onChange }) {
  function press(key) {
    if (key === 'del') {
      onChange(value.slice(0, -1))
      return
    }
    if (key === '.' && value.includes('.')) return
    if (key === '.' && value === '') { onChange('0.'); return }
    const next = value + key
    const [, decimal] = next.split('.')
    if (decimal && decimal.length > 2) return
    if (next.length > 1 && next[0] === '0' && next[1] !== '.') return
    onChange(next)
  }

  const rows = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    ['.', '0', 'del'],
  ]

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {rows.flat().map((k) => (
        <button
          key={k}
          onClick={() => press(k)}
          className={`
            h-[68px] rounded-2xl text-2xl font-semibold text-white
            active:scale-90 transition-all duration-75
            ${k === 'del'
              ? 'bg-white/[0.06] text-white/50 text-xl'
              : 'bg-white/[0.06] hover:bg-white/10'}
          `}
        >
          {k === 'del' ? '⌫' : k}
        </button>
      ))}
    </div>
  )
}
