import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'

function useEscape(open, onClose) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
}

export function Modal({ open, onClose, title, subtitle, children, footer, width = 560 }) {
  useEscape(open, onClose)
  if (!open) return null
  return createPortal(
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" style={{ maxWidth: width }} role="dialog" aria-modal="true">
        <div className="modal-head">
          <div>
            <h3>{title}</h3>
            {subtitle && <p className="muted small">{subtitle}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function Drawer({ open, onClose, title, subtitle, actions, children, width = 360 }) {
  useEscape(open, onClose)
  if (!open) return null
  return createPortal(
    <div className="overlay drawer-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <aside className="drawer" style={{ width }} role="dialog" aria-modal="true">
        <div className="drawer-head">
          <div>
            <h3>{title}</h3>
            {subtitle && <p className="muted small">{subtitle}</p>}
          </div>
          <div className="drawer-actions">
            {actions}
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <Icon name="x" />
            </button>
          </div>
        </div>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>,
    document.body,
  )
}
