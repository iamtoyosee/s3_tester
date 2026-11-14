import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { CheckCategory, CheckDefinition } from '../api/types'
import { SeverityTag } from '../components/Severity'
import { ErrorState, Loading } from '../components/Status'
import { useAsync } from '../hooks'
import { plural } from '../format'

const CATEGORY_LABEL: Record<CheckCategory, string> = {
  access: 'Who can get in',
  encryption: 'Encryption in transit and at rest',
  logging: 'Audit trail',
  resilience: 'Recovery',
}

export function NewScanPage() {
  const navigate = useNavigate()
  const setup = useAsync(() => Promise.all([api.listProfiles(), api.listRegions(), api.listChecks()]), [])

  const [chosenProfile, setProfile] = useState('')
  const [allRegions, setAllRegions] = useState(true)
  const [regions, setRegions] = useState<Set<string>>(new Set())
  // null until the user touches the checks; then defaults to every check.
  const [chosenChecks, setChecks] = useState<Set<string> | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string>()

  const grouped = useMemo(() => {
    const defs = setup.data?.[2] ?? []
    const m = new Map<CheckCategory, CheckDefinition[]>()
    for (const d of defs) {
      if (!m.has(d.category)) m.set(d.category, [])
      m.get(d.category)!.push(d)
    }
    return [...m.entries()]
  }, [setup.data])

  if (setup.error) return <ErrorState error={setup.error} onRetry={setup.reload} />
  if (!setup.data) return <Loading label="Loading scan options" />
  const [profiles, regionList, defs] = setup.data
  const profile = chosenProfile || profiles[0] || ''
  const checks = chosenChecks ?? new Set(defs.map((d) => d.id))

  const toggleIn = (set: Set<string>, v: string) => {
    const next = new Set(set)
    if (next.has(v)) next.delete(v)
    else next.add(v)
    return next
  }

  const regionsInvalid = !allRegions && regions.size === 0
  const checksInvalid = checks.size === 0
  const canSubmit = profile && !regionsInvalid && !checksInvalid && !submitting

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setSubmitError(undefined)
    try {
      const { id } = await api.createScan({
        profile,
        regions: allRegions ? [] : [...regions],
        checks: checks.size === defs.length ? [] : [...checks],
      })
      navigate(`/scans/${id}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err))
      setSubmitting(false)
    }
  }

  return (
    <form className="new-scan" onSubmit={submit}>
      <header className="page-head">
        <h1 className="page-title">New scan</h1>
        <p className="muted">The scan only reads bucket settings. It never changes them or downloads objects.</p>
      </header>

      <fieldset className="field-group">
        <legend>AWS profile</legend>
        <p className="hint">Credentials come from the backend’s AWS config. The profile needs read access to S3 bucket settings.</p>
        <div className="radio-row">
          {profiles.map((p) => (
            <label key={p} className="choice">
              <input type="radio" name="profile" value={p} checked={profile === p} onChange={() => setProfile(p)} />
              <span className="mono">{p}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="field-group">
        <legend>Regions</legend>
        <label className="choice">
          <input type="checkbox" checked={allRegions} onChange={(e) => setAllRegions(e.target.checked)} />
          <span>All regions</span>
        </label>
        {!allRegions && (
          <div className="chip-row">
            {regionList.map((r) => (
              <label key={r} className="chip">
                <input type="checkbox" checked={regions.has(r)} onChange={() => setRegions((s) => toggleIn(s, r))} />
                <span className="mono">{r}</span>
              </label>
            ))}
          </div>
        )}
        {regionsInvalid && <p className="field-error">Pick at least one region, or scan all of them.</p>}
      </fieldset>

      <fieldset className="field-group">
        <legend>Checks</legend>
        <div className="checks-toolbar">
          <span className="muted">{checks.size} of {defs.length} selected</span>
          <button type="button" className="link-btn" onClick={() => setChecks(new Set(defs.map((d) => d.id)))}>
            Select all
          </button>
          <button type="button" className="link-btn" onClick={() => setChecks(new Set())}>
            Clear
          </button>
        </div>
        {grouped.map(([cat, list]) => (
          <div key={cat} className="check-group">
            <h3 className="check-group-title">{CATEGORY_LABEL[cat]}</h3>
            <ul className="check-list">
              {list.map((d) => (
                <li key={d.id}>
                  <label className="check-item">
                    <input type="checkbox" checked={checks.has(d.id)} onChange={() => setChecks(toggleIn(checks, d.id))} />
                    <span className="check-text">
                      <span className="check-title">{d.title}</span>
                      <span className="check-desc">{d.description}</span>
                    </span>
                    <SeverityTag severity={d.severity} />
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {checksInvalid && <p className="field-error">Pick at least one check to run.</p>}
      </fieldset>

      {submitError && (
        <p className="field-error" role="alert">
          The scan didn’t start: {submitError}
        </p>
      )}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
          {submitting ? 'Starting scan…' : `Start scan with ${plural(checks.size, 'check')}`}
        </button>
      </div>
    </form>
  )
}
