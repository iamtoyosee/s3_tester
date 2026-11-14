import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { BucketResult, Severity } from '../api/types'
import { SEVERITY_ORDER } from '../api/types'
import { isPublic } from '../format'
import { SeverityTag } from './Severity'

type SortKey = 'severity' | 'name' | 'region' | 'findings'

export function BucketTable({
  buckets,
  scanId,
  filter,
  query,
}: {
  buckets: BucketResult[]
  scanId: string
  filter: Set<Severity>
  query: string
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'severity', dir: 1 })

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = buckets.filter(
      (b) => (filter.size === 0 || filter.has(b.worstSeverity)) && (!q || b.name.toLowerCase().includes(q) || b.region.includes(q)),
    )
    const cmp: Record<SortKey, (a: BucketResult, b: BucketResult) => number> = {
      severity: (a, b) => SEVERITY_ORDER.indexOf(a.worstSeverity) - SEVERITY_ORDER.indexOf(b.worstSeverity) || b.findings.length - a.findings.length,
      name: (a, b) => a.name.localeCompare(b.name),
      region: (a, b) => a.region.localeCompare(b.region) || a.name.localeCompare(b.name),
      findings: (a, b) => b.findings.length - a.findings.length,
    }
    return list.sort((a, b) => cmp[sort.key](a, b) * sort.dir)
  }, [buckets, filter, query, sort])

  const header = (key: SortKey, label: string, className?: string) => (
    <th
      scope="col"
      className={className}
      aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}
    >
      <button type="button" className="th-btn" onClick={() => setSort((s) => ({ key, dir: s.key === key ? ((-s.dir) as 1 | -1) : 1 }))}>
        {label}
        <span className="th-arrow" aria-hidden>
          {sort.key === key ? (sort.dir === 1 ? '▾' : '▴') : ''}
        </span>
      </button>
    </th>
  )

  if (rows.length === 0) {
    return <p className="table-empty">No buckets match. Clear the search or the severity filter to see them all.</p>
  }

  return (
    <div className="table-wrap">
      <table className="bucket-table">
        <thead>
          <tr>
            {header('name', 'Bucket')}
            {header('region', 'Region', 'hide-sm')}
            {header('severity', 'Worst finding')}
            {header('findings', 'Findings', 'num')}
            <th scope="col" className="hide-sm">Encryption</th>
            <th scope="col" className="hide-md">Versioning</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.name}>
              <td>
                <Link className="row-link mono" to={`/scans/${scanId}/buckets/${encodeURIComponent(b.name)}`}>
                  {b.name}
                </Link>
                {isPublic(b) && <span className="public-flag">Public</span>}
              </td>
              <td className="mono hide-sm">{b.region}</td>
              <td>
                <SeverityTag severity={b.worstSeverity} />
              </td>
              <td className="num">{b.findings.length}</td>
              <td className="hide-sm">{b.encryption === 'none' ? <span className="warn-text">None</span> : b.encryption}</td>
              <td className="hide-md">{b.versioning === 'Enabled' ? 'Enabled' : <span className="muted">{b.versioning}</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
