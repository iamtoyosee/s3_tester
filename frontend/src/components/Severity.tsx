import type { Severity, SeverityCounts } from '../api/types'
import { SEVERITY_ORDER } from '../api/types'
import { SEVERITY_LABEL } from '../format'

export function SeverityTag({ severity }: { severity: Severity }) {
  return (
    <span className={`sev-tag sev-${severity}`}>
      <span className="sev-dot" aria-hidden />
      {SEVERITY_LABEL[severity]}
    </span>
  )
}

/**
 * Proportional bar of buckets by worst severity. Doubles as a filter:
 * clicking a segment's legend entry toggles it.
 */
export function SeverityBar({
  counts,
  active,
  onToggle,
}: {
  counts: SeverityCounts
  active?: Set<Severity>
  onToggle?: (s: Severity) => void
}) {
  const total = SEVERITY_ORDER.reduce((n, s) => n + counts[s], 0)
  return (
    <div className="sev-bar">
      <div className="sev-bar-track" role="img" aria-label={SEVERITY_ORDER.map((s) => `${counts[s]} ${SEVERITY_LABEL[s]}`).join(', ')}>
        {total === 0 && <span className="sev-bar-empty" />}
        {SEVERITY_ORDER.map((s) =>
          counts[s] ? (
            <span
              key={s}
              className={`sev-bar-seg sev-${s}`}
              data-dim={active && active.size > 0 && !active.has(s) ? '' : undefined}
              style={{ flexGrow: counts[s] }}
            />
          ) : null,
        )}
      </div>
      <ul className="sev-legend">
        {SEVERITY_ORDER.map((s) => {
          const pressed = active?.has(s) ?? false
          const content = (
            <>
              <span className={`sev-swatch sev-${s}`} aria-hidden />
              <span className="sev-legend-n">{counts[s]}</span>
              <span className="sev-legend-l">{SEVERITY_LABEL[s]}</span>
            </>
          )
          return (
            <li key={s}>
              {onToggle ? (
                <button type="button" className="sev-legend-btn" aria-pressed={pressed} onClick={() => onToggle(s)} disabled={!counts[s]}>
                  {content}
                </button>
              ) : (
                <span className="sev-legend-btn">{content}</span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
