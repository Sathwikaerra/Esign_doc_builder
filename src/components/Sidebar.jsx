import { NavLink } from 'react-router-dom'
import Icon from './ui/Icon'

// Add more entries here as new screens are built.
const MENU_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/workflows', label: 'Workflows', icon: 'workflow' },
  { to: '/templates', label: 'Templates', icon: 'template' },
]

export default function Sidebar({ expanded, onToggleExpanded, mobileOpen, onNavigate }) {
  return (
    <aside className={`sidebar ${expanded ? 'expanded' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-logo">
        <span className="logo-mark">
          <Icon name="contract" size={18} />
        </span>
        <span className="nav-label brand">eSign Builder</span>
      </div>
      <button className="sidebar-expand" onClick={onToggleExpanded} aria-label={expanded ? 'Collapse menu' : 'Expand menu'}>
        <Icon name={expanded ? 'chevronLeft' : 'chevronRight'} size={14} />
      </button>

      <nav>
        {MENU_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            data-tip={item.label}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon name={item.icon} />
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
