import { useEffect, useRef, useState } from 'react'
import Icon from '../ui/Icon'
import { Spinner } from './AuthLayout'

const LENGTH = 6

const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

const SUCCESS_PAUSE_MS = 1100

/*
 * Second step of login / signup: enter the code that was emailed.
 * challenge  = { challengeId, email (masked), expiresInSeconds, resendInSeconds }
 * onVerify   = (code) => Promise<session>   checks the code with the server
 * onVerified = (session) => void           called after the "Verified" confirmation
 */
export default function OtpStep({ challenge, purpose, onVerify, onVerified, onResend, onBack }) {
  const [digits, setDigits] = useState(Array(LENGTH).fill(''))
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [status, setStatus] = useState('idle') // 'idle' | 'verifying' | 'verified'
  const verifying = status !== 'idle'
  const [resending, setResending] = useState(false)
  const [expiresIn, setExpiresIn] = useState(challenge.expiresInSeconds)
  const [resendIn, setResendIn] = useState(challenge.resendInSeconds)
  const inputs = useRef([])

  // Restart both countdowns whenever a new code is sent
  useEffect(() => {
    setExpiresIn(challenge.expiresInSeconds)
    setResendIn(challenge.resendInSeconds)
    const timer = setInterval(() => {
      setExpiresIn((s) => Math.max(0, s - 1))
      setResendIn((s) => Math.max(0, s - 1))
    }, 1000)
    inputs.current[0]?.focus()
    return () => clearInterval(timer)
  }, [challenge])

  const code = digits.join('')
  const expired = expiresIn === 0

  const submit = async (value = code) => {
    if (value.length !== LENGTH || verifying) return
    setError('')
    setInfo('')
    setStatus('verifying')
    let session
    try {
      session = await onVerify(value)
    } catch (err) {
      setStatus('idle')
      setError(err.message)
      setDigits(Array(LENGTH).fill(''))
      setTimeout(() => inputs.current[0]?.focus(), 0)
      return
    }
    setStatus('verified')
    setTimeout(() => onVerified(session), SUCCESS_PAUSE_MS)
  }

  const setAt = (index, value) => {
    const next = [...digits]
    next[index] = value
    setDigits(next)
    return next
  }

  const onChange = (index, e) => {
    const value = e.target.value.replace(/\D/g, '')
    if (!value) return setAt(index, '')
    if (value.length > 1) return fill(value, index)
    const next = setAt(index, value)
    if (index < LENGTH - 1) inputs.current[index + 1]?.focus()
    else if (next.every(Boolean)) submit(next.join(''))
  }

  // Pasting the whole code (or autofill) fills every box and submits
  const fill = (text, start = 0) => {
    const chars = text.replace(/\D/g, '').slice(0, LENGTH - start).split('')
    if (!chars.length) return
    const next = [...digits]
    chars.forEach((c, i) => (next[start + i] = c))
    setDigits(next)
    const last = Math.min(start + chars.length, LENGTH - 1)
    inputs.current[last]?.focus()
    if (next.every(Boolean)) submit(next.join(''))
  }

  const onKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      setAt(index - 1, '')
      inputs.current[index - 1]?.focus()
      e.preventDefault()
    } else if (e.key === 'ArrowLeft' && index > 0) inputs.current[index - 1]?.focus()
    else if (e.key === 'ArrowRight' && index < LENGTH - 1) inputs.current[index + 1]?.focus()
    else if (e.key === 'Enter') submit()
  }

  const resend = async () => {
    setError('')
    setInfo('')
    setResending(true)
    try {
      await onResend()
      setDigits(Array(LENGTH).fill(''))
      setInfo('A new code is on its way. Codes sent earlier no longer work.')
    } catch (err) {
      setError(err.message)
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="otp-step">
      <span className="otp-badge">
        <Icon name="mail" size={22} />
      </span>
      <h1>Check your email</h1>
      <p className="auth-sub">
        We've sent a {LENGTH}-digit verification code to <strong>{challenge.email}</strong>
        {purpose === 'signup' ? ' to confirm your email address.' : ' to confirm it’s you.'}
      </p>

      {error && (
        <div className="auth-alert error" role="alert">
          <Icon name="alert" size={16} /> {error}
        </div>
      )}
      {info && !error && (
        <div className="auth-alert success" role="status">
          <Icon name="checkCircle" size={16} /> {info}
        </div>
      )}

      <div className={`otp-box ${status}`} aria-busy={status === 'verifying'}>
      <div className="otp-inputs" onPaste={(e) => (e.preventDefault(), fill(e.clipboardData.getData('text')))}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => (inputs.current[i] = el)}
            value={d}
            onChange={(e) => onChange(i, e)}
            onKeyDown={(e) => onKeyDown(i, e)}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={LENGTH}
            disabled={verifying || expired}
            aria-label={`Digit ${i + 1} of ${LENGTH}`}
            className={d ? 'filled' : ''}
          />
        ))}
      </div>
      {status !== 'idle' && (
        <div className="otp-overlay" role="status" aria-live="polite">
          {status === 'verifying' ? (
            <>
              <span className="otp-ring" aria-hidden="true" />
              <strong>Verifying your code…</strong>
            </>
          ) : (
            <>
              <span className="otp-check" aria-hidden="true">
                <Icon name="check" size={22} strokeWidth={3} />
              </span>
              <strong>{purpose === 'signup' ? 'Verified! Setting up your account…' : 'Verified! Signing you in…'}</strong>
            </>
          )}
        </div>
      )}
      </div>

      <p className={`otp-timer ${expired ? 'expired' : expiresIn <= 60 ? 'soon' : ''}`}>
        <Icon name="clock" size={14} />
        {expired ? 'This code has expired. Request a new one below.' : `Code expires in ${formatTime(expiresIn)}`}
      </p>

      <button type="button" className="btn primary block auth-submit" disabled={code.length !== LENGTH || verifying || expired} onClick={() => submit()}>
        {status === 'verified' ? (
          <>
            <Icon name="checkCircle" size={18} /> Verified
          </>
        ) : verifying ? (
          <>
            <Spinner /> Verifying…
          </>
        ) : purpose === 'signup' ? (
          'Verify and create account'
        ) : (
          'Verify and sign in'
        )}
      </button>

      <div className="otp-resend">
        Didn't receive the code?{' '}
        {resendIn > 0 && !expired ? (
          <span className="muted">Resend in {resendIn}s</span>
        ) : (
          <button type="button" className="link-btn" onClick={resend} disabled={resending}>
            {resending ? (
              <>
                <Spinner size={12} /> Sending…
              </>
            ) : (
              'Resend code'
            )}
          </button>
        )}
      </div>

      <div className="auth-note">
        <Icon name="info" size={15} />
        <span>
          The email can take up to a minute to arrive. Check your spam or junk folder if you don't see it. Never share this code with anyone.
        </span>
      </div>

      <button type="button" className="link-btn back-link" onClick={onBack} disabled={verifying}>
        <Icon name="arrowLeft" size={15} /> {purpose === 'signup' ? 'Edit sign-up details' : 'Use a different account'}
      </button>
    </div>
  )
}
