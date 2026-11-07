import { NavLink } from 'react-router-dom'
import { LayoutDashboard, GitBranch, LayoutTemplate, Code2, Menu } from 'lucide-react'
import './Sidebar.css'

// Add more entries here as new screens are built.
const MENU_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/workflows', label: 'Workflows', icon: GitBranch },
  { to: '/templates', label: 'Templates', icon: LayoutTemplate },
  { to: '/developers', label: 'Developers', icon: Code2 },
]

export default function Sidebar({ expanded, onToggleExpanded, mobileOpen, onNavigate }) {
  return (
    <aside className={`sidebar ${expanded ? 'expanded' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      <button
        className="sidebar-expand"
        onClick={onToggleExpanded}
        aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        <Menu size={20} />
      </button>

      <p className="nav-section nav-label">Menu</p>

      <nav>
        {MENU_ITEMS.map(({ to, label, icon: IconCmp }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            data-tip={label}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <IconCmp size={20} strokeWidth={1.8} className="nav-icon" />
            <span className="nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}