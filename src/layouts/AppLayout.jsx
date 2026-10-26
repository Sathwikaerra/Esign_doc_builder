import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'

export default function AppLayout() {
  const [expanded, setExpanded] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className={`app-shell ${expanded ? 'sidebar-expanded' : ''}`}>
      <Sidebar
        expanded={expanded}
        onToggleExpanded={() => setExpanded((e) => !e)}
        mobileOpen={mobileOpen}
        onNavigate={() => setMobileOpen(false)}
      />
      {mobileOpen && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />}
      <div className="app-main">
        <Header onToggleSidebar={() => setMobileOpen((o) => !o)} />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
