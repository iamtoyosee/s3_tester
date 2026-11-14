import type { BucketResult, Severity } from './api/types'

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  pass: 'No issues',
}

/** Checks that mean the bucket is reachable by anyone on the internet. */
export const PUBLIC_CHECKS = new Set(['public-acl-read', 'public-acl-write', 'public-policy'])

export function isPublic(b: BucketResult) {
  return b.findings.some((f) => PUBLIC_CHECKS.has(f.checkId))
}

const dateFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })

export function formatDate(iso: string) {
  return dateFmt.format(new Date(iso))
}

export function formatDateTime(iso: string) {
  const d = new Date(iso)
  return `${dateFmt.format(d)}, ${timeFmt.format(d)}`
}

export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.round(diff / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const h = Math.round(min / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  return d === 1 ? 'yesterday' : `${d} days ago`
}

export function duration(startIso: string, endIso?: string) {
  if (!endIso) return undefined
  const s = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

export function plural(n: number, one: string, many = one + 's') {
  return `${n} ${n === 1 ? one : many}`
}
