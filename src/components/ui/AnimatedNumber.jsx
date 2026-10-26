import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const SETS = 4 // how many 0–9 runs each reel holds, so it can spin forward a few times
const STRIP = Array.from({ length: SETS * 10 }, (_, i) => i % 10)
const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/*
 * Odometer-style number: every digit is a reel that starts at 0 and rolls forward
 * (one direction only) through a few full turns before stopping on its digit.
 * The rightmost digit spins the most, like a real counter. A value of 0 just
 * drops in with a small bounce. Size and colour come from the surrounding text.
 * Re-runs from 0 whenever `value` changes, e.g. when the dashboard date range changes.
 */
export default function AnimatedNumber({ value, duration = 1600 }) {
  const final = String(Math.max(0, Math.round(value ?? 0)))
  const digits = final.split('').map(Number)
  const reduced = prefersReducedMotion()
  const [run, setRun] = useState(0)
  const [rolling, setRolling] = useState(reduced)
  const ref = useRef(null)

  // Make the browser register the reset (all reels at 0) before the roll starts,
  // otherwise the transition can begin from the previous number instead of 0.
  useLayoutEffect(() => {
    if (!rolling) ref.current?.getBoundingClientRect()
  }, [rolling, run])

  useEffect(() => {
    if (value == null || reduced) return
    // Snap every reel back to 0, then start the roll on the next tick
    setRolling(false)
    setRun((r) => r + 1)
    const timer = setTimeout(() => setRolling(true), 40)
    return () => clearTimeout(timer)
  }, [final, reduced])

  if (final === '0') {
    return (
      <span className="animated-number" aria-label="0" role="img">
        <span className="roll-col" aria-hidden="true">
          <span key={run} className={`roll-zero ${reduced ? '' : 'pop'}`}>
            0
          </span>
        </span>
      </span>
    )
  }

  return (
    <span className="animated-number" aria-label={final} role="img" ref={ref}>
      {digits.map((d, i) => {
        const fromRight = digits.length - 1 - i
        const turns = Math.max(1, SETS - 1 - fromRight)
        const index = rolling ? turns * 10 + d : 0
        return (
          <span key={i} className="roll-col" aria-hidden="true">
            <span
              className="roll-strip"
              style={{
                transform: `translateY(-${(index / STRIP.length) * 100}%)`,
                transitionDuration: rolling && !reduced ? `${duration - fromRight * 250}ms` : '0ms',
              }}
            >
              {STRIP.map((n, k) => (
                <span key={k}>{n}</span>
              ))}
            </span>
          </span>
        )
      })}
    </span>
  )
}
