import { useMemo } from 'react'
import type { BucketResult, Severity } from '../api/types'
import { SEVERITY_ORDER } from '../api/types'
import { SEVERITY_LABEL, isPublic, plural } from '../format'

/**
 * The account at a glance: one tile per bucket, grouped by region and
 * coloured by the bucket's worst finding. Internet-reachable buckets get a
 * hatched tile so they read even without colour.
 */
export function ExposureMap({
  buckets,
  pending = 0,
  selected,
  onSelect,
  filter,
}: {
  buckets: BucketResult[]
  /** Buckets not yet scanned; drawn as empty slots while a scan runs. */
  pending?: number
  selected?: string
  onSelect: (name: string) => void
  filter?: Set<Severity>
}) {
  const regions = useMemo(() => {
    const m = new Map<string, BucketResult[]>()
    for (const b of buckets) {
      if (!m.has(b.region)) m.set(b.region, [])
      m.get(b.region)!.push(b)
    }
    for (const list of m.values()) {
      list.sort((a, b) => SEVERITY_ORDER.indexOf(a.worstSeverity) - SEVERITY_ORDER.indexOf(b.worstSeverity) || a.name.localeCompare(b.name))
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [buckets])

  return (
    <div className="xmap">
      {regions.map(([region, list]) => (
        <section key={region} className="xmap-region" aria-label={`${region}, ${plural(list.length, 'bucket')}`}>
          <h3 className="xmap-region-name">
            <span className="mono">{region}</span>
            <span className="xmap-region-count">{list.length}</span>
          </h3>
          <div className="xmap-grid">
            {list.map((b) => {
              const dim = filter && filter.size > 0 && !filter.has(b.worstSeverity)
              return (
                <button
                  key={b.name}
                  type="button"
                  className={`xmap-tile sev-${b.worstSeverity}`}
                  data-public={isPublic(b) ? '' : undefined}
                  data-dim={dim ? '' : undefined}
                  aria-pressed={selected === b.name}
                  aria-label={`${b.name}: ${SEVERITY_LABEL[b.worstSeverity]}${isPublic(b) ? ', public' : ''}`}
                  title={b.name}
                  onClick={() => onSelect(b.name)}
                />
              )
            })}
          </div>
        </section>
      ))}
      {pending > 0 && (
        <section className="xmap-region" aria-label={`${plural(pending, 'bucket')} waiting to be scanned`}>
          <h3 className="xmap-region-name">
            <span>Waiting</span>
            <span className="xmap-region-count">{pending}</span>
          </h3>
          <div className="xmap-grid">
            {Array.from({ length: pending }, (_, i) => (
              <span key={i} className="xmap-tile xmap-tile-pending" aria-hidden />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
