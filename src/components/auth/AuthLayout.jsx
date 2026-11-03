import { useState } from 'react'
import {
  FileSignature, LayoutTemplate, GitBranch, Activity, ShieldCheck, CheckCircle2,
  Mail, Lock, User, Building2, Eye, EyeOff,
} from 'lucide-react'
import Icon from '../ui/Icon'
import './Auth.css'

const FEATURES = [
  { icon: LayoutTemplate, title: 'Reusable templates', text: 'Write contracts once in a familiar document editor.' },
  { icon: GitBranch, title: 'Signing workflows', text: 'Set signers, order, signature methods and placement.' },
  { icon: Activity, title: 'Live tracking', text: 'See every contract from sent to signed in one place.' },
]

// Icon names used by TextField (Login/Signup pass strings). Unknown names fall back to your old <Icon />.
const FIELD_ICONS = { mail: Mail, lock: Lock, user: User, building: Building2 }

function FieldIcon({ name }) {
  const Cmp = FIELD_ICONS[name]
  return Cmp ? <Cmp size={18} strokeWidth={1.8} /> : <Icon name={name} size={18} />
}

// Split screen: product panel on the left (hidden on small screens), the form on the right.
export default function AuthLayout({ children }) {
  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <div className="auth-logo">
          <span className="logo-mark">
            <FileSignature size={20} />
          </span>
          eSign <b>Doc Builder</b>
        </div>

        <div className="auth-pitch">
          <span className="auth-badge">
            <i /> Secure e-signatures
          </span>
          <h2>
            Prepare, send and track <em>e-signatures.</em>
          </h2>

          <div className="auth-doc" aria-hidden="true">
            <div className="auth-doc-head">
              <FileSignature size={16} />
              <span>Service Agreement.pdf</span>
              <b><CheckCircle2 size={13} /> Signed</b>
            </div>
            <div className="auth-doc-lines">
              <i style={{ width: '92%' }} />
              <i style={{ width: '78%' }} />
              <i style={{ width: '85%' }} />
            </div>
            <svg className="auth-sign" viewBox="0 0 140 36" fill="none">
              <path d="M4 26c10-22 16-22 14-4-1 10 8 6 14-6s10-6 8 2 8 4 16-6c6-8 10-4 8 4s8 2 14-6 10 0 14-2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </div>

          <ul>
            {FEATURES.map(({ icon: Ico, title, text }) => (
              <li key={title}>
                <span className="auth-feature-icon">
                  <Ico size={18} strokeWidth={1.8} />
                </span>
                <div>
                  <strong>{title}</strong>
                  <span>{text}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="auth-foot">
          <ShieldCheck size={15} /> Every sign-in is verified with a one-time code sent to your email.
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
        <Lock size={18} strokeWidth={1.8} />
        <input type={shown ? 'text' : 'password'} value={value} onChange={onChange} autoComplete={autoComplete} disabled={disabled} placeholder="••••••••" required />
        <button type="button" className="reveal" onClick={() => setShown((s) => !s)} aria-label={shown ? 'Hide password' : 'Show password'} tabIndex={-1}>
          {shown ? <EyeOff size={18} strokeWidth={1.8} /> : <Eye size={18} strokeWidth={1.8} />}
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
        {icon && <FieldIcon name={icon} />}
        <input {...props} />
      </div>
    </label>
  )
}