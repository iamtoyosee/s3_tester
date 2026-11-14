import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Finding, PublicAccessBlock } from '../api/types'
import { SeverityTag } from '../components/Severity'
import { ErrorState, Loading } from '../components/Status'
import { useScan } from '../hooks'
import { formatDate, isPublic, plural } from '../format'

const PAB_LABELS: [keyof PublicAccessBlock, string][] = [
  ['blockPublicAcls', 'Block new public ACLs'],
  ['ignorePublicAcls', 'Ignore existing public ACLs'],
  ['blockPublicPolicy', 'Block new public policies'],
  ['restrictPublicBuckets', 'Restrict access under public policies'],
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="copy-btn"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1600)
        } catch {
          /* clipboard blocked; leave text selectable */
        }
      }}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function FindingCard({ f }: { f: Finding }) {
  const isCommand = f.remediation.startsWith('aws ')
  return (
    <article className={`finding sev-${f.severity}`}>
      <header className="finding-head">
        <h3 className="finding-title">{f.title}</h3>
        <SeverityTag severity={f.severity} />
      </header>
      <p className="finding-detail">{f.detail}</p>
      {f.evidence && (
        <details className="evidence">
          <summary>Show evidence</summary>
          <pre className="code">{f.evidence}</pre>
        </details>
      )}
      <div className="fix">
        <h4 className="fix-title">How to fix</h4>
        {isCommand ? (
          <div className="code-block">
            <pre className="code">{f.remediation}</pre>
            <CopyButton text={f.remediation} />
          </div>
        ) : (
          <p>{f.remediation}</p>
        )}
      </div>
    </article>
  )
}

export function BucketPage() {
  const { id, bucket: bucketName } = useParams()
  const { scan, error } = useScan(id)

  if (error) return <ErrorState error={error} />
  if (!scan) return <Loading label="Loading bucket" />

  const bucket = scan.buckets.find((b) => b.name === bucketName)
  if (!bucket) {
    return (
      <div className="state">
        <p>
          <span className="mono">{bucketName}</span> isn’t in this scan.
        </p>
        <Link className="btn btn-secondary" to={`/scans/${scan.id}`}>
          Back to scan
        </Link>
      </div>
    )
  }

  const pab = bucket.publicAccessBlock
  return (
    <div className="bucket-page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to={`/scans/${scan.id}`}>Scan from {formatDate(scan.startedAt)}</Link>
        <span aria-hidden>/</span>
        <span aria-current="page" className="mono">{bucket.name}</span>
      </nav>

      <header className="bucket-head">
        <h1 className="bucket-title mono">{bucket.name}</h1>
        <div className="bucket-head-tags">
          <SeverityTag severity={bucket.worstSeverity} />
          {isPublic(bucket) && <span className="public-flag">Public</span>}
        </div>
      </header>

      <div className="bucket-layout">
        <section aria-labelledby="findings-title">
          <h2 id="findings-title" className="section-title">
            {bucket.findings.length ? plural(bucket.findings.length, 'finding') : 'No findings'}
          </h2>
          {bucket.findings.length === 0 ? (
            <p className="muted">Every check in this scan passed for this bucket.</p>
          ) : (
            <div className="finding-list">
              {bucket.findings.map((f) => (
                <FindingCard key={f.checkId} f={f} />
              ))}
            </div>
          )}
        </section>

        <aside className="panel bucket-facts">
          <h2 className="panel-title">Configuration</h2>
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
              <dt>Default encryption</dt>
              <dd>{bucket.encryption === 'none' ? <span className="warn-text">None</span> : bucket.encryption}</dd>
            </div>
            <div>
              <dt>Versioning</dt>
              <dd>{bucket.versioning}</dd>
            </div>
          </dl>
          <h3 className="pab-title">Block Public Access</h3>
          {pab ? (
            <ul className="pab-list">
              {PAB_LABELS.map(([k, label]) => (
                <li key={k} data-on={pab[k] ? '' : undefined}>
                  <span className="pab-state">{pab[k] ? 'On' : 'Off'}</span>
                  {label}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">The scanner couldn’t read this setting. Check that the profile has s3:GetBucketPublicAccessBlock.</p>
          )}
        </aside>
      </div>
    </div>
  )
}
