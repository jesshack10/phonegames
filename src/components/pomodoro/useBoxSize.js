import { useEffect, useRef, useState } from 'react'

// Measures an element so visuals can size themselves from the room they were
// actually given, rather than from viewport maths that has to guess how much
// chrome sits above and below them.
export default function useBoxSize() {
  const ref = useRef(null)
  const [box, setBox] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const measure = () => setBox({ w: node.clientWidth, h: node.clientHeight })
    measure()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }
    const ro = new ResizeObserver(measure)
    ro.observe(node)
    return () => ro.disconnect()
  }, [])

  return [ref, box]
}
