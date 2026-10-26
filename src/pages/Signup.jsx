import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthLayout, { PasswordField, Spinner, TextField } from '../components/auth/AuthLayout'
import OtpStep from '../components/auth/OtpStep'
import Icon from '../components/ui/Icon'
import { useToast } from '../components/ui/Toast'

// Same rules as the server: 8+ characters with letters and numbers
const passwordProblem = (p) =>
  p.length < 8 ? 'Password must be at least 8 characters' : !/[A-Za-z]/.test(p) || !/\d/.test(p) ? 'Password must contain letters and numbers' : ''

export default function Signup() {
  const { startSignup, verifyOtp, completeSignIn, resendOtp } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [form, setForm] = useState({ name: '', organisation: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [challenge, setChallenge] = useState(null)

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })
  const strength = form.password ? passwordProblem(form.password) : ''

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const problem = passwordProblem(form.password)
    if (problem) return setError(problem)
    if (form.password !== form.confirm) return setError('Passwords do not match')
    setLoading(true)
    try {
      setChallenge(await startSignup({ name: form.name, organisationName: form.organisation, email: form.email, password: form.password }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const finish = (session) => {
    completeSignIn(session)
    toast(`Welcome, ${session.user.name}! Your account is ready.`)
    navigate('/dashboard', { replace: true })
  }

  return (
    <AuthLayout>
      {challenge ? (
        <OtpStep
          challenge={challenge}
          purpose="signup"
          onVerify={(code) => verifyOtp(challenge.challengeId, code)}
          onVerified={finish}
          onResend={async () => setChallenge(await resendOtp(challenge.challengeId))}
          onBack={() => setChallenge(null)}
        />
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          <h1>Create your account</h1>
          <p className="auth-sub">Set up your organisation's workspace. We'll verify your email with a one-time code.</p>

          {error && (
            <div className="auth-alert error" role="alert">
              <Icon name="alert" size={16} /> {error}
            </div>
          )}

          <div className="auth-grid">
            <TextField label="Full name" icon="user" value={form.name} onChange={update('name')} autoComplete="name" disabled={loading} required autoFocus />
            <TextField
              label="Organisation"
              icon="building"
              value={form.organisation}
              onChange={update('organisation')}
              autoComplete="organization"
              placeholder="Optional"
              disabled={loading}
            />
          </div>
          <TextField
            label="Work email"
            icon="mail"
            type="email"
            value={form.email}
            onChange={update('email')}
            autoComplete="email"
            placeholder="name@company.com"
            disabled={loading}
            required
          />
          <PasswordField
            value={form.password}
            onChange={update('password')}
            autoComplete="new-password"
            disabled={loading}
            hint={
              <span className={form.password ? (strength ? 'hint-bad' : 'hint-good') : ''}>
                <Icon name={form.password && !strength ? 'checkCircle' : 'info'} size={13} /> At least 8 characters, with letters and numbers
              </span>
            }
          />
          <PasswordField label="Confirm password" value={form.confirm} onChange={update('confirm')} autoComplete="new-password" disabled={loading} />

          <button className="btn primary block auth-submit" disabled={loading}>
            {loading ? (
              <>
                <Spinner /> Sending verification code…
              </>
            ) : (
              'Create account'
            )}
          </button>

          <div className="auth-note">
            <Icon name="mail" size={15} />
            <span>We'll send a 6-digit code to your email. Your account is created once you enter it.</span>
          </div>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
      )}
    </AuthLayout>
  )
}
