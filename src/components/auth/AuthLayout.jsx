import { useState } from 'react'
import Icon from '../ui/Icon'

const FEATURES = [
  { icon: 'template', title: 'Reusable templates', text: 'Write contracts once in a familiar document editor.' },
  { icon: 'workflow', title: 'Signing workflows', text: 'Set signers, order, signature methods and placement.' },
  { icon: 'dashboard', title: 'Live tracking', text: 'See every contract from sent to signed in one place.' },
]

// Split screen: product panel on the left (hidden on small screens), the form on the right.
export default function AuthLayout({ children }) {
  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <div className="auth-logo">
          <span className="logo-mark">
            <Icon name="contract" size={20} />
          </span>
          eSign Doc Builder
        </div>
        <div className="auth-pitch">
          <h2>Prepare, send and track e-signatures.</h2>
          <ul>
            {FEATURES.map((f) => (
              <li key={f.title}>
                <span className="auth-feature-icon">
                  <Icon name={f.icon} size={18} />
                </span>
                <div>
                  <strong>{f.title}</strong>
                  <span>{f.text}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="auth-foot">
          <Icon name="shield" size={14} /> Every sign-in is verified with a one-time code sent to your email.
        </p>
      </aside>
      <main className="auth-main">
        <div className="auth-panel">{children}</div>
      </main>
    </div>
  )
}

export function Spinner({ size = 16 }) {
  return <span className="spinner" style={{ width: size, height: size }} aria-hidden="true" />
}

export function PasswordField({ label = 'Password', value, onChange, autoComplete, hint, disabled }) {
  const [shown, setShown] = useState(false)
  return (
    <label className="auth-field">
      <span>{label}</span>
      <div className="auth-input">
        <Icon name="lock" size={16} />
        <input type={shown ? 'text' : 'password'} value={value} onChange={onChange} autoComplete={autoComplete} disabled={disabled} required />
        <button type="button" className="reveal" onClick={() => setShown((s) => !s)} aria-label={shown ? 'Hide password' : 'Show password'} tabIndex={-1}>
          <Icon name={shown ? 'eyeOff' : 'eye'} size={16} />
        </button>
      </div>
      {hint && <small>{hint}</small>}
    </label>
  )
}

export function TextField({ label, icon, ...props }) {
  return (
    <label className="auth-field">
      <span>{label}</span>
      <div className="auth-input">
        {icon && <Icon name={icon} size={16} />}
        <input {...props} />
      </div>
    </label>
  )
}
