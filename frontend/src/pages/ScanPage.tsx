import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import type { Scan, Severity } from '../api/types'
import { BucketSummary } from '../components/BucketSummary'
import { BucketTable } from '../components/BucketTable'
import { ExposureMap } from '../components/ExposureMap'
import { SeverityBar } from '../components/Severity'
import { ErrorState, Loading, NoScans } from '../components/Status'
import { useAsync, useScan } from '../hooks'
import { duration, formatDateTime, isPublic, plural, relativeTime } from '../format'

/** "/" shows the most recent scan; "/scans/:id" shows a specific one. */
export function LatestScanPage() {
  const scans = useAsync(() => api.listScans(), [])
  if (scans.error) return <ErrorState error={scans.error} onRetry={scans.reload} />
  if (!scans.data) return <Loading label="Finding your latest scan" />
  if (scans.data.length === 0) return <NoScans />
  return <ScanView id={scans.data[0].id} />
}

export function ScanPage() {
  const { id } = useParams()
  return <ScanView id={id!} key={id} />
}

function Headline({ scan }: { scan: Scan }) {
  const total = scan.buckets.length
  const publicCount = scan.buckets.filter(isPublic).length
  const serious = scan.counts.critical + scan.counts.high

  if (scan.status === 'failed') {
    return <h1 className="headline">This scan stopped before it finished.</h1>
  }
  if (scan.status !== 'completed') {
    return (
      <h1 className="headline" aria-live="polite">
        Scanned {scan.progress.scanned} of {scan.progress.total} buckets
      </h1>
    )
  }
  if (publicCount > 0) {
    return (
      <h1 className="headline">
        {publicCount} of {total} buckets can be read by anyone on the internet.
      </h1>
    )
  }
  if (serious > 0) {
    return <h1 className="headline">No public buckets, but {plural(serious, 'bucket')} could become public with one bad change.</h1>
  }
  return <h1 className="headline">No public buckets. Nothing serious found in {plural(total, 'bucket')}.</h1>
}

function ScanView({ id }: { id: string }) {
  const { scan, error } = useScan(id)
  const [selected, setSelected] = useState<string>()
  const [filter, setFilter] = useState<Set<Severity>>(new Set())
  const [query, setQuery] = useState('')

  const selectedBucket = useMemo(() => scan?.buckets.find((b) => b.name === selected), [scan, selected])

  if (error) return <ErrorState error={error} />
  if (!scan) return <Loading label="Loading scan" />

  const running = scan.status === 'queued' || scan.status === 'running'
  const pct = scan.progress.total ? (scan.progress.scanned / scan.progress.total) * 100 : 0
  const toggle = (s: Severity) =>
    setFilter((prev) => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      return next
    })

  return (
    <div className="scan">
      <header className="scan-head">
        <Headline scan={scan} />
        <p className="scan-meta">
          Account <span className="mono">{scan.accountId}</span> as <span className="mono">{scan.profile}</span>
          <span className="sep" aria-hidden />
          {running ? `Started ${relativeTime(scan.startedAt)}` : `Finished ${formatDateTime(scan.finishedAt ?? scan.startedAt)}`}
          {!running && duration(scan.startedAt, scan.finishedAt) && (
            <>
              {' '}in {duration(scan.startedAt, scan.finishedAt)}
            </>
          )}
          <span className="sep" aria-hidden />
          {scan.regions.length} regions, {scan.checks.length} checks
        </p>

        {running && (
          <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={scan.progress.total} aria-valuenow={scan.progress.scanned} aria-label="Scan progress">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
            <p className="progress-label">
              {scan.status === 'queued' ? 'Listing buckets…' : (
                <>
                  Inspecting <span className="mono">{scan.progress.current}</span>
                </>
              )}
            </p>
          </div>
        )}
        {scan.status === 'failed' && scan.error && <p className="state-error-inline">{scan.error}</p>}
      </header>

      <SeverityBar counts={scan.counts} active={filter} onToggle={toggle} />

      <div className="scan-body">
        <section className="panel map-panel" aria-labelledby="map-title">
          <div className="panel-head">
            <h2 id="map-title" className="panel-title">Buckets by region</h2>
            <p className="panel-note">One tile per bucket. Hatched means public.</p>
          </div>
          {scan.buckets.length === 0 && !running ? (
            <p className="muted">This account has no buckets in the scanned regions.</p>
          ) : (
            <ExposureMap
              buckets={scan.buckets}
              pending={scan.progress.total - scan.progress.scanned}
              selected={selected}
              onSelect={setSelected}
              filter={filter}
            />
          )}
        </section>
        <BucketSummary bucket={selectedBucket} scanId={scan.id} />
      </div>

      <section className="all-buckets" aria-labelledby="table-title">
        <div className="table-toolbar">
          <h2 id="table-title" className="section-title">All buckets</h2>
          <label className="search">
            <span className="visually-hidden">Search buckets</span>
            <input type="search" placeholder="Search by name or region" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        </div>
        {filter.size > 0 && (
          <p className="filter-note">
            Filtered to {[...filter].join(', ')}.{' '}
            <button type="button" className="link-btn" onClick={() => setFilter(new Set())}>
              Show all
            </button>
          </p>
        )}
        <BucketTable buckets={scan.buckets} scanId={scan.id} filter={filter} query={query} />
      </section>

      {!running && (
        <p className="footnote">
          <Link to="/scans">See earlier scans</Link>
        </p>
      )}
    </div>
  )
}
