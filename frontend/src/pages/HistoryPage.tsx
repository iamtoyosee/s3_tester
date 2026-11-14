import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { SeverityBar } from '../components/Severity'
import { ErrorState, Loading, NoScans } from '../components/Status'
import { useAsync } from '../hooks'
import { formatDateTime, plural } from '../format'

const STATUS_LABEL = { queued: 'Queued', running: 'Running', completed: 'Completed', failed: 'Failed' } as const

export function HistoryPage() {
  const scans = useAsync(() => api.listScans(), [])
  if (scans.error) return <ErrorState error={scans.error} onRetry={scans.reload} />
  if (!scans.data) return <Loading label="Loading scans" />
  if (scans.data.length === 0) return <NoScans />

  return (
    <div className="history">
      <header className="page-head">
        <h1 className="page-title">Scan history</h1>
        <p className="muted">{plural(scans.data.length, 'scan')}, newest first.</p>
      </header>
      <ol className="history-list">
        {scans.data.map((s) => (
          <li key={s.id}>
            <Link to={`/scans/${s.id}`} className="history-item">
              <div className="history-when">
                <span className="history-date">{formatDateTime(s.startedAt)}</span>
                <span className="muted">
                  <span className="mono">{s.profile}</span>, {plural(s.bucketCount, 'bucket')}
                </span>
              </div>
              <div className="history-bar">
                <SeverityBar counts={s.counts} />
              </div>
              <span className={`status status-${s.status}`}>{STATUS_LABEL[s.status]}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  )
}
