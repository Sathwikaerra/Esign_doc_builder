import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'

// Outlined input with a floating label, matching the reference form fields.
export function Field({ label, required, hint, error, as = 'input', children, className = '', ...props }) {
  const Tag = as
  return (
    <label className={`field ${error ? 'has-error' : ''} ${className}`}>
      <span className="field-label">
        {label}
        {required && <span className="req"> *</span>}
      </span>
      {children ?? <Tag {...props} />}
      {hint && !error && (
        <span className="field-hint">
          <Icon name="info" size={13} /> {hint}
        </span>
      )}
      {error && <span className="field-error">{error}</span>}
    </label>
  )
}

export function Pills({ options, value, onChange, multiple = false }) {
  const isOn = (v) => (multiple ? value.includes(v) : value === v)
  const toggle = (v) => {
    if (multiple) onChange(isOn(v) ? value.filter((x) => x !== v) : [...value, v])
    else onChange(isOn(v) ? '' : v)
  }
  return (
    <div className="pills">
      {options.map((o) => (
        <button type="button" key={o.value} className={`pill ${isOn(o.value) ? 'on' : ''}`} onClick={() => toggle(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ checked, onChange, label, hint, disabled }) {
  return (
    <label className={`toggle ${disabled ? 'disabled' : ''}`} title={hint}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" />
      {label}
      {hint && <Icon name="info" size={14} className="muted" />}
    </label>
  )
}

export function Checkbox({ checked, onChange, label }) {
  return (
    <label className="checkbox">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

export function Radio({ name, value, checked, onChange, label }) {
  return (
    <label className="radio">
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} />
      {label}
    </label>
  )
}

export function MultiSelect({ label, options, value, onChange, max }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const toggle = (o) => {
    if (value.includes(o)) onChange(value.filter((x) => x !== o))
    else if (!max || value.length < max) onChange([...value, o])
  }

  return (
    <div className="field multiselect" ref={ref}>
      <span className="field-label">{label}</span>
      <button type="button" className="select-like" onClick={() => setOpen((o) => !o)}>
        <span className={value.length ? '' : 'placeholder'}>{value.length ? value.join(', ') : label}</span>
        <Icon name={open ? 'chevronUp' : 'chevronDown'} size={16} />
      </button>
      {open && (
        <div className="dropdown-list">
          {options.map((o) => (
            <label key={o} className="dropdown-item">
              <input type="checkbox" checked={value.includes(o)} onChange={() => toggle(o)} />
              {o}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export function EmptyState({ title = 'No data found', message }) {
  return (
    <div className="empty-state">
      <svg width="150" height="120" viewBox="0 0 150 120" aria-hidden="true">
        <circle cx="25" cy="70" r="4" fill="none" stroke="currentColor" opacity=".35" />
        <circle cx="118" cy="38" r="4" fill="none" stroke="currentColor" opacity=".35" />
        <circle cx="76" cy="10" r="4" fill="none" stroke="currentColor" opacity=".35" />
        <path d="M128 12l6 6M134 12l-6 6M30 98l5 5M35 98l-5 5" stroke="currentColor" opacity=".3" />
        <rect x="40" y="30" width="72" height="62" rx="8" fill="var(--empty-fill)" stroke="var(--empty-stroke)" />
        <rect x="40" y="30" width="72" height="14" rx="8" fill="var(--empty-stroke)" />
        <circle cx="49" cy="37" r="2.5" fill="#fff" />
        <circle cx="57" cy="37" r="2.5" fill="#fff" />
        <circle cx="65" cy="37" r="2.5" fill="#fff" />
        <rect x="48" y="52" width="26" height="4" rx="2" fill="var(--empty-stroke)" />
        <rect x="48" y="62" width="26" height="4" rx="2" fill="var(--empty-stroke)" />
        <rect x="48" y="72" width="26" height="4" rx="2" fill="var(--empty-stroke)" />
        <rect x="80" y="52" width="24" height="28" rx="3" fill="var(--empty-stroke)" />
      </svg>
      <h4>{title}</h4>
      {message && <p className="muted small">{message}</p>}
    </div>
  )
}

export function PageTitle({ title, crumbs = [], children }) {
  return (
    <div className="page-title">
      <div>
        <h1>{title}</h1>
        <div className="crumbs">
          {crumbs.map((c, i) => (
            <span key={i} className={i === crumbs.length - 1 ? 'current' : ''}>
              {c}
            </span>
          ))}
        </div>
      </div>
      {children && <div className="page-actions">{children}</div>}
    </div>
  )
}

export function SortTh({ label, k, sort, onSort }) {
  return (
    <th>
      <button className="th-sort" onClick={() => onSort(k)}>
        {label}
        <Icon name={sort.key === k ? (sort.dir === 1 ? 'arrowUp' : 'arrowDown') : 'sort'} size={13} />
      </button>
    </th>
  )
}

export function CopyButton({ text, onCopied }) {
  return (
    <button
      type="button"
      className="icon-btn tiny"
      title="Copy"
      onClick={(e) => {
        e.stopPropagation()
        navigator.clipboard?.writeText(text).then(() => onCopied?.(), () => {})
      }}
    >
      <Icon name="copy" size={14} />
    </button>
  )
}
