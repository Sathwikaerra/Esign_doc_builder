import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  GitBranch,
  LayoutTemplate,
  Code2,
  FileSignature,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
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
      <div className="sidebar-logo">
        <span className="logo-mark">
          <FileSignature size={20} strokeWidth={2} />
        </span>
        <span className="nav-label brand">
          eSign <b>Builder</b>
        </span>
      </div>

      <button
        className="sidebar-expand"
        onClick={onToggleExpanded}
        aria-label={expanded ? 'Collapse menu' : 'Expand menu'}
      >
        {expanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
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