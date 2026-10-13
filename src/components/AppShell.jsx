import { NavLink, Outlet } from 'react-router-dom'
import { useStore } from '../data/store'
import Toast from './Toast'

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/subjects', label: 'Subjects' },
  { to: '/tasks', label: 'Study Tasks' },
  { to: '/revisions', label: 'Revisions' },
  { to: '/mistakes', label: 'Mistake Log' },
  { to: '/mock-tests', label: 'Mock Tests' },
  { to: '/weekly-review', label: 'Weekly Review' },
  { to: '/settings', label: 'Settings' },
]

export default function AppShell() {
  const { loadWarning, dismissLoadWarning, saveError } = useStore()
  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <div className="brand">CA Companion</div>
        <nav aria-label="Main">
          <ul>
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <main id="main" className="content">
        {loadWarning && (
          <div className="banner banner-warn" role="alert">
            <span>{loadWarning}</span>
            <button type="button" className="btn btn-sm" onClick={dismissLoadWarning}>
              Dismiss
            </button>
          </div>
        )}
        {saveError && (
          <div className="banner banner-error" role="alert">
            {saveError}
          </div>
        )}
        <Outlet />
      </main>
      <Toast />
    </div>
  )
}
