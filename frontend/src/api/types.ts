/**
 * API contract between the frontend and the scanner backend.
 *
 * The backend should return JSON shaped exactly like these types.
 * Dates are ISO 8601 strings. See the root README for the endpoint list.
 */

/** Ordered from most to least serious. `pass` means no findings. */
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'pass'

export const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'pass']

export type CheckCategory = 'access' | 'encryption' | 'logging' | 'resilience'

/** A check the backend knows how to run. Returned by GET /api/checks. */
export interface CheckDefinition {
  id: string
  title: string
  description: string
  category: CheckCategory
  /** Severity assigned when this check fails. */
  severity: Exclude<Severity, 'pass'>
}

/** One failed check on one bucket. */
export interface Finding {
  checkId: string
  severity: Exclude<Severity, 'pass'>
  title: string
  /** Plain-language explanation of what is wrong on this bucket. */
  detail: string
  /** Raw evidence, e.g. the offending policy statement or ACL grant. */
  evidence?: string
  /** How to fix it. May include an AWS CLI command. */
  remediation: string
}

export interface PublicAccessBlock {
  blockPublicAcls: boolean
  ignorePublicAcls: boolean
  blockPublicPolicy: boolean
  restrictPublicBuckets: boolean
}

export interface BucketResult {
  name: string
  region: string
  createdAt: string
  /** null when the backend could not read the Public Access Block config. */
  publicAccessBlock: PublicAccessBlock | null
  encryption: 'SSE-S3' | 'SSE-KMS' | 'DSSE-KMS' | 'none'
  versioning: 'Enabled' | 'Suspended' | 'Off'
  findings: Finding[]
  /** Highest severity among findings, or `pass`. */
  worstSeverity: Severity
}

export type ScanStatus = 'queued' | 'running' | 'completed' | 'failed'

export type SeverityCounts = Record<Severity, number>

/** Lightweight scan record. Returned in the list from GET /api/scans. */
export interface ScanSummary {
  id: string
  /** AWS CLI profile (or role name) the scan ran as. */
  profile: string
  accountId: string
  status: ScanStatus
  startedAt: string
  finishedAt?: string
  bucketCount: number
  /** Number of buckets whose worst severity is each level. */
  counts: SeverityCounts
}

/** Full scan. Returned by GET /api/scans/:id; polled while running. */
export interface Scan extends ScanSummary {
  regions: string[]
  checks: string[]
  progress: {
    scanned: number
    total: number
    /** Bucket currently being inspected, if any. */
    current?: string
  }
  buckets: BucketResult[]
  error?: string
}

/** Body of POST /api/scans. */
export interface ScanRequest {
  profile: string
  /** Empty array means all regions. */
  regions: string[]
  /** Check IDs to run. Empty array means all checks. */
  checks: string[]
}

/** Response of POST /api/scans. */
export interface ScanCreated {
  id: string
}
