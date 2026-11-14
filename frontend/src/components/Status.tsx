import { Link } from 'react-router-dom'

export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="state" role="status">
      <span className="spinner" aria-hidden />
      <span>{label}…</span>
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="state state-error" role="alert">
      <p>
        <strong>Couldn’t load this.</strong> {error.message}
      </p>
      <p className="muted">Check that the scanner backend is running and reachable at /api.</p>
      {onRetry && (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

export function NoScans() {
  return (
    <div className="state state-empty">
      <h1 className="page-title">No scans yet</h1>
      <p>Run a scan to check every bucket in an AWS account for public access and weak settings.</p>
      <Link className="btn btn-primary" to="/scans/new">
        New scan
      </Link>
    </div>
  )
}
