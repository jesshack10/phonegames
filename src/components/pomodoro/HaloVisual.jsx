import useBoxSize from './useBoxSize'

// A light that traces the edge of the screen and retracts as the phase runs
// down. The path is measured in pixels rather than drawn in a viewBox so the
// stroke keeps an even weight on any screen shape.
export default function HaloVisual({ remaining, color, track, thick = false }) {
  const [ref, box] = useBoxSize()

  const { w, h } = box
  const inset = thick ? 14 : 11
  const weight = thick ? 5 : 3.5
  const radius = Math.min(w, h) * 0.11
  const bw = w - inset * 2
  const bh = h - inset * 2
  const cx = inset + bw / 2

  // Starts at top centre and runs clockwise, so the light drains away from the
  // point the eye lands on first.
  const d =
    w > 0 && h > 0 && bw > radius * 2 && bh > radius * 2
      ? `M ${cx} ${inset} H ${inset + bw - radius}` +
        ` A ${radius} ${radius} 0 0 1 ${inset + bw} ${inset + radius}` +
        ` V ${inset + bh - radius}` +
        ` A ${radius} ${radius} 0 0 1 ${inset + bw - radius} ${inset + bh}` +
        ` H ${inset + radius}` +
        ` A ${radius} ${radius} 0 0 1 ${inset} ${inset + bh - radius}` +
        ` V ${inset + radius}` +
        ` A ${radius} ${radius} 0 0 1 ${inset + radius} ${inset} Z`
      : null

  return (
    <svg
      ref={ref}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    >
      {d && (
        <>
          <path d={d} fill="none" stroke={track} strokeWidth={weight * 0.6} pathLength="1000" />
          <path
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={weight}
            strokeLinecap="round"
            pathLength="1000"
            strokeDasharray={`${(1000 * remaining).toFixed(1)} 1000`}
            style={{
              transition: 'stroke-dasharray 1s linear',
              filter: `drop-shadow(0 0 ${thick ? 12 : 8}px ${color})`,
            }}
          />
        </>
      )}
    </svg>
  )
}
