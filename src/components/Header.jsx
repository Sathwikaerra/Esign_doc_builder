import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import useSessionTimeout from '../hooks/useSessionTimeout'
import { listDownloads } from '../services/downloadService'
import { downloadJson, formatDateTime } from '../utils/format'
import { THEMES, applyTheme, getTheme } from '../utils/theme'
import Icon from './ui/Icon'
import { Drawer } from './ui/Overlay'
import { CopyButton, EmptyState } from './ui/Controls'
import { useToast } from './ui/Toast'

const SESSION_SECONDS = 25 * 60

export default function Header({ onToggleSidebar }) {
  const { user, logout } = useAuth()
  const org = user?.organisation ?? { id: '', name: 'My Organisation' }
  const navigate = useNavigate()
  const toast = useToast()
  const [panel, setPanel] = useState(null) // 'org' | 'downloads' | 'user' | 'theme'
  const [downloads, setDownloads] = useState([])
  const [theme, setTheme] = useState(getTheme)
  const themeRef = useRef(null)
  const userRef = useRef(null)

  // Dropdown menus close on any click outside them
  useEffect(() => {
    if (panel !== 'theme' && panel !== 'user') return
    const ref = panel === 'theme' ? themeRef : userRef
    const close = (e) => !ref.current?.contains(e.target) && setPanel(null)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [panel])

  const chooseTheme = (id) => {
    applyTheme(id)
    setTheme(id)
  }

  const remaining = useSessionTimeout(SESSION_SECONDS, () => {
    logout()
    navigate('/login', { replace: true, state: { timedOut: true } })
  })
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')

  const initials = (user?.name || user?.email || '?')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const openDownloads = () => {
    setDownloads(listDownloads())
    setPanel('downloads')
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="app-header">
      <button className="icon-btn menu-toggle" onClick={onToggleSidebar} aria-label="Toggle menu">
        <Icon name="menu" />
      </button>

      <div className="header-right">
        <button className="org-btn" onClick={() => setPanel('org')}>
          {org.name}
          <Icon name="chevronDown" size={16} />
        </button>

        <div className={`session-timer ${remaining < 120 ? 'warn' : ''}`} title="Session ends after inactivity">
          <Icon name="clock" size={16} />
          <div>
            <strong>
              {mm}:{ss}
            </strong>
            <span>until timeout</span>
          </div>
        </div>

        <div className="theme-wrap" ref={themeRef}>
          <button className="icon-btn" onClick={() => setPanel(panel === 'theme' ? null : 'theme')} aria-label="Change theme" title="Change theme">
            <Icon name="palette" />
          </button>
          {panel === 'theme' && (
            <div className="theme-menu">
              <p>Theme</p>
              {THEMES.map((t) => (
                <button key={t.id} className={`theme-option ${theme === t.id ? 'on' : ''}`} onClick={() => chooseTheme(t.id)}>
                  <span className="swatch" style={{ background: `linear-gradient(135deg, ${t.swatch[0]}, ${t.swatch[1]})` }} />
                  {t.label}
                  {t.dark && <span className="chip">Dark</span>}
                  {theme === t.id && <Icon name="check" size={16} className="check" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="icon-btn" onClick={openDownloads} aria-label="Downloads" title="Downloads">
          <Icon name="download" />
        </button>

        <div className="user-wrap" ref={userRef}>
          <button className="avatar" onClick={() => setPanel(panel === 'user' ? null : 'user')} aria-label="Account">
            {initials}
          </button>
          {panel === 'user' && (
            <div className="user-menu">
              <div className="user-menu-info">
                <strong>{user?.name}</strong>
                <span className="muted small">{user?.email}</span>
              </div>
              <button onClick={handleLogout}>
                <Icon name="logout" size={16} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>

      <Drawer
        open={panel === 'org'}
        onClose={() => setPanel(null)}
        title="Organisations"
        actions={
          <button className="link-btn" onClick={() => toast('Organisation management comes with the backend', 'info')}>
            Manage
          </button>
        }
      >
        <p className="drawer-section">Root Organisation</p>
        <div className="org-item active">
          <Icon name="building" />
          <div>
            <strong>{org.name}</strong>
            <span className="muted small">
              Organisation ID: {org.id.slice(0, 8)}…
              <CopyButton text={org.id} onCopied={() => toast('Organisation ID copied')} />
            </span>
          </div>
          <Icon name="checkCircle" className="org-check" />
        </div>
      </Drawer>

      <Drawer
        open={panel === 'downloads'}
        onClose={() => setPanel(null)}
        title="Downloads"
        subtitle="Export files are available for 24 hours from completion."
        actions={
          <button className="icon-btn" onClick={() => setDownloads(listDownloads())} aria-label="Refresh">
            <Icon name="refresh" size={16} />
          </button>
        }
        width={420}
      >
        {downloads.length === 0 ? (
          <EmptyState title="No downloads yet" message="Workflow exports will show up here." />
        ) : (
          downloads.map((d) => (
            <div key={d.id} className="download-item">
              <Icon name="file" />
              <div>
                <strong>{d.filename}</strong>
                <span className="muted small">{formatDateTime(d.createdAt)}</span>
              </div>
              <button className="icon-btn" onClick={() => downloadJson(d.filename, d.data)} aria-label="Download again">
                <Icon name="download" size={16} />
              </button>
            </div>
          ))
        )}
      </Drawer>
    </header>
  )
}
