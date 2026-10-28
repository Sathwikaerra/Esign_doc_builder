// 3D tilt for glass cards: one delegated pointer listener sets --rx/--ry (rotation) and --mx/--my (glare spot)
// on whichever tiltable card the pointer is over. The CSS in index.css turns those into the transform.
const TILT = '.dx-stat, .dx-panel, .stat-card, .template-card, .method-tile, .participant-card'
const MAX = 6 // degrees

export function initTilt() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  if (!window.matchMedia('(hover: hover)').matches) return
  let current = null

  const reset = (el) => {
    el.classList.remove('tilting')
    el.style.removeProperty('--rx')
    el.style.removeProperty('--ry')
  }

  document.addEventListener('pointermove', (e) => {
    const el = e.target.closest?.(TILT)
    if (current && current !== el) reset(current)
    current = el
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    // big panels tilt less so charts stay readable
    const k = Math.min(1, 320 / Math.max(r.width, r.height))
    el.classList.add('tilting')
    el.style.setProperty('--rx', `${((0.5 - y) * MAX * 2 * k).toFixed(2)}deg`)
    el.style.setProperty('--ry', `${((x - 0.5) * MAX * 2 * k).toFixed(2)}deg`)
    el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`)
    el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`)
  }, { passive: true })

  const release = () => {
    if (current) reset(current)
    current = null
  }
  document.addEventListener('pointerleave', release)
  // scrolling moves cards out from under a still pointer
  window.addEventListener('scroll', release, { passive: true, capture: true })
}
