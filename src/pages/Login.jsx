import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthLayout, { PasswordField, Spinner, TextField } from '../components/auth/AuthLayout'
import OtpStep from '../components/auth/OtpStep'
import Icon from '../components/ui/Icon'

export default function Login() {
  const { startLogin, verifyOtp, completeSignIn, resendOtp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [challenge, setChallenge] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      setChallenge(await startLogin(email, password))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const finish = (session) => {
    completeSignIn(session)
    navigate(location.state?.from?.pathname || '/dashboard', { replace: true })
  }

  return (
    <AuthLayout>
      {challenge ? (
        <OtpStep
          challenge={challenge}
          purpose="login"
          onVerify={(code) => verifyOtp(challenge.challengeId, code)}
          onVerified={finish}
          onResend={async () => setChallenge(await resendOtp(challenge.challengeId))}
          onBack={() => {
            setChallenge(null)
            setPassword('')
          }}
        />
      ) : (
        <form className="auth-form" onSubmit={handleSubmit} noValidate={false}>
          <h1>Sign in</h1>
          <p className="auth-sub">Welcome back. Enter your details and we'll email you a verification code.</p>

          {location.state?.timedOut && !error && (
            <div className="auth-alert warn" role="status">
              <Icon name="clock" size={16} /> Your session timed out. Please sign in again.
            </div>
          )}
          {location.state?.signedOut && !error && (
            <div className="auth-alert success" role="status">
              <Icon name="checkCircle" size={16} /> You've been signed out.
            </div>
          )}
          {error && (
            <div className="auth-alert error" role="alert">
              <Icon name="alert" size={16} /> {error}
            </div>
          )}

          <TextField
            label="Work email"
            icon="mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="name@company.com"
            disabled={loading}
            required
            autoFocus
          />
          <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" disabled={loading} />

          <button className="btn primary block auth-submit" disabled={loading}>
            {loading ? (
              <>
                <Spinner /> Sending verification code…
              </>
            ) : (
              'Continue'
            )}
          </button>

          <div className="auth-note">
            <Icon name="shield" size={15} />
            <span>For your security, a 6-digit code will be sent to your email to complete sign-in.</span>
          </div>

          <p className="auth-switch">
            New to eSign Doc Builder? <Link to="/signup">Create an account</Link>
          </p>
        </form>
      )}
    </AuthLayout>
  )
}
