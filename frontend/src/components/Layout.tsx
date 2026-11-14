import { NavLink, Outlet } from 'react-router-dom'
import { USING_MOCK } from '../api/client'

function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden>
      <rect x="3" y="3" width="12" height="12" rx="2" fill="currentColor" />
      <rect x="17" y="3" width="12" height="12" rx="2" fill="currentColor" />
      <rect x="3" y="17" width="12" height="12" rx="2" fill="currentColor" />
      <rect x="17" y="17" width="12" height="12" rx="2" fill="var(--critical)" />
    </svg>
  )
}

export function Layout() {
  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <NavLink to="/" className="brand">
          <Logo />
          <span>s3_tester</span>
        </NavLink>
        <nav className="nav" aria-label="Main">
          <NavLink to="/" end>
            Latest results
          </NavLink>
          <NavLink to="/scans" end>
            History
          </NavLink>
        </nav>
        <NavLink to="/scans/new" className="btn btn-primary btn-sm">
          New scan
        </NavLink>
      </header>
      {USING_MOCK && (
        <p className="mock-banner" role="note">
          Showing sample data from a built-in mock. Set <code>VITE_USE_MOCK=false</code> to use the scanner API.
        </p>
      )}
      <main id="main" className="main">
        <Outlet />
      </main>
    </div>
  )
}
