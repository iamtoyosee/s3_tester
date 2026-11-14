import { Link } from 'react-router-dom'
import type { BucketResult } from '../api/types'
import { formatDate, isPublic, plural } from '../format'
import { SeverityTag } from './Severity'

/** Side panel shown when a tile on the exposure map is selected. */
export function BucketSummary({ bucket, scanId }: { bucket?: BucketResult; scanId: string }) {
  if (!bucket) {
    return (
      <aside className="panel bucket-summary bucket-summary-empty">
        <p>Select a tile to see what is wrong with that bucket.</p>
        <p className="muted">Hatched tiles are buckets anyone on the internet can reach.</p>
      </aside>
    )
  }

  return (
    <aside className="panel bucket-summary" aria-live="polite">
      <div className="bucket-summary-head">
        <SeverityTag severity={bucket.worstSeverity} />
        {isPublic(bucket) && <span className="public-flag">Public</span>}
      </div>
      <h2 className="bucket-summary-name mono">{bucket.name}</h2>
      <dl className="facts">
        <div>
          <dt>Region</dt>
          <dd className="mono">{bucket.region}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{formatDate(bucket.createdAt)}</dd>
        </div>
        <div>
          <dt>Encryption</dt>
          <dd>{bucket.encryption === 'none' ? 'None' : bucket.encryption}</dd>
        </div>
        <div>
          <dt>Versioning</dt>
          <dd>{bucket.versioning}</dd>
        </div>
      </dl>

      {bucket.findings.length === 0 ? (
        <p className="muted">Every selected check passed.</p>
      ) : (
        <ul className="finding-mini-list">
          {bucket.findings.map((f) => (
            <li key={f.checkId} className={`sev-${f.severity}`}>
              <span className="sev-dot" aria-hidden />
              {f.title}
            </li>
          ))}
        </ul>
      )}

      <Link className="btn btn-secondary" to={`/scans/${scanId}/buckets/${encodeURIComponent(bucket.name)}`}>
        {bucket.findings.length ? `Review ${plural(bucket.findings.length, 'finding')}` : 'Open bucket'}
      </Link>
    </aside>
  )
}
