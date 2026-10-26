import { useEffect, useRef, useState } from 'react'

// Counts down an idle session; any user activity resets it. Calls onExpire at zero.
export default function useSessionTimeout(totalSeconds, onExpire) {
  const [remaining, setRemaining] = useState(totalSeconds)
  const deadline = useRef(Date.now() + totalSeconds * 1000)
  const expireRef = useRef(onExpire)
  expireRef.current = onExpire

  useEffect(() => {
    let lastReset = 0
    const reset = () => {
      const now = Date.now()
      if (now - lastReset < 1000) return
      lastReset = now
      deadline.current = now + totalSeconds * 1000
    }
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }))

    const timer = setInterval(() => {
      const left = Math.max(0, Math.round((deadline.current - Date.now()) / 1000))
      setRemaining(left)
      if (left === 0) expireRef.current?.()
    }, 1000)

    return () => {
      events.forEach((e) => window.removeEventListener(e, reset))
      clearInterval(timer)
    }
  }, [totalSeconds])

  return remaining
}
