/**
 * In-browser fake backend so the UI works before the real scanner exists.
 * Enabled by default; set VITE_USE_MOCK=false to talk to the real API.
 */
import type {
  BucketResult,
  CheckDefinition,
  Finding,
  Scan,
  ScanCreated,
  ScanRequest,
  ScanSummary,
  Severity,
  SeverityCounts,
} from './types'
import { SEVERITY_ORDER } from './types'

export const CHECKS: CheckDefinition[] = [
  {
    id: 'public-acl-read',
    title: 'Public read via ACL',
    description: 'An ACL grant gives READ to AllUsers, so anyone on the internet can list or download objects.',
    category: 'access',
    severity: 'critical',
  },
  {
    id: 'public-acl-write',
    title: 'Public write via ACL',
    description: 'An ACL grant gives WRITE or FULL_CONTROL to AllUsers, so anyone can upload or overwrite objects.',
    category: 'access',
    severity: 'critical',
  },
  {
    id: 'public-policy',
    title: 'Bucket policy allows everyone',
    description: 'A bucket policy statement has Effect Allow with Principal "*" and no restricting condition.',
    category: 'access',
    severity: 'critical',
  },
  {
    id: 'authenticated-users-grant',
    title: 'Grant to any AWS account',
    description: 'An ACL grant targets AuthenticatedUsers, which means every AWS customer, not just your account.',
    category: 'access',
    severity: 'high',
  },
  {
    id: 'block-public-access-off',
    title: 'Block Public Access not fully on',
    description: 'One or more of the four Block Public Access settings is disabled on the bucket.',
    category: 'access',
    severity: 'high',
  },
  {
    id: 'cross-account-access',
    title: 'Access from another account',
    description: 'The bucket policy grants access to a principal outside this AWS account.',
    category: 'access',
    severity: 'medium',
  },
  {
    id: 'no-tls-enforcement',
    title: 'HTTP requests allowed',
    description: 'No policy statement denies requests where aws:SecureTransport is false.',
    category: 'encryption',
    severity: 'medium',
  },
  {
    id: 'no-default-encryption',
    title: 'No default encryption',
    description: 'New objects are not encrypted at rest unless the uploader asks for it.',
    category: 'encryption',
    severity: 'medium',
  },
  {
    id: 'access-logging-off',
    title: 'Access logging off',
    description: 'Server access logging is disabled, so reads and writes leave no audit trail.',
    category: 'logging',
    severity: 'low',
  },
  {
    id: 'versioning-off',
    title: 'Versioning off',
    description: 'Deleted or overwritten objects cannot be recovered.',
    category: 'resilience',
    severity: 'low',
  },
]

const REGIONS = ['us-east-1', 'us-east-2', 'us-west-2', 'eu-west-1', 'ap-southeast-1']

const BUCKET_NAMES = [
  'northwind-prod-assets', 'northwind-prod-logs', 'northwind-staging-assets', 'northwind-user-uploads',
  'northwind-data-lake-raw', 'northwind-data-lake-curated', 'northwind-backups-daily', 'northwind-tf-state',
  'northwind-ci-artifacts', 'northwind-marketing-site', 'northwind-press-kit', 'northwind-invoices-2026',
  'northwind-ml-training-data', 'northwind-ml-models', 'northwind-cloudtrail', 'northwind-alb-logs',
  'northwind-dev-scratch', 'northwind-qa-fixtures', 'northwind-mobile-builds', 'northwind-docs-site',
  'northwind-support-attachments', 'northwind-hr-exports', 'northwind-legacy-2019', 'northwind-cdn-origin',
  'northwind-athena-results', 'northwind-glue-scripts', 'northwind-lambda-packages', 'northwind-sftp-drop',
  'northwind-partner-share', 'northwind-analytics-exports', 'northwind-config-snapshots', 'northwind-email-templates',
  'northwind-video-transcodes', 'northwind-thumbnails', 'northwind-db-dumps', 'northwind-security-findings',
  'northwind-eu-customer-data', 'northwind-eu-backups', 'northwind-apac-cdn', 'northwind-apac-logs',
  'interns-hackathon-2025', 'tmp-migration-oct',
]

/** Small seeded PRNG so the fake account looks the same every reload. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

function check(id: string) {
  return CHECKS.find((c) => c.id === id)!
}

function finding(id: string, bucket: string, extra: Partial<Finding> = {}): Finding {
  const c = check(id)
  const base: Record<string, Pick<Finding, 'detail' | 'remediation' | 'evidence'>> = {
    'public-acl-read': {
      detail: `Anyone can list and download objects in ${bucket} without credentials.`,
      evidence: `Grantee: { Type: Group, URI: http://acs.amazonaws.com/groups/global/AllUsers }\nPermission: READ`,
      remediation: `aws s3api put-bucket-acl --bucket ${bucket} --acl private`,
    },
    'public-acl-write': {
      detail: `Anyone can upload, overwrite or delete objects in ${bucket}.`,
      evidence: `Grantee: { Type: Group, URI: http://acs.amazonaws.com/groups/global/AllUsers }\nPermission: WRITE`,
      remediation: `aws s3api put-bucket-acl --bucket ${bucket} --acl private`,
    },
    'public-policy': {
      detail: `The bucket policy lets any principal call s3:GetObject on every key.`,
      evidence: JSON.stringify(
        { Sid: 'PublicRead', Effect: 'Allow', Principal: '*', Action: 's3:GetObject', Resource: `arn:aws:s3:::${bucket}/*` },
        null,
        2,
      ),
      remediation: `Remove the statement with Principal "*", or add a Condition that limits it (for example aws:SourceVpce or aws:PrincipalOrgID).`,
    },
    'authenticated-users-grant': {
      detail: `Any signed-in AWS user, in any account, can read ${bucket}.`,
      evidence: `Grantee: { Type: Group, URI: http://acs.amazonaws.com/groups/global/AuthenticatedUsers }\nPermission: READ`,
      remediation: `aws s3api put-bucket-acl --bucket ${bucket} --acl private`,
    },
    'block-public-access-off': {
      detail: `Public ACLs or policies added later would take effect immediately.`,
      remediation: `aws s3api put-public-access-block --bucket ${bucket} --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true`,
    },
    'cross-account-access': {
      detail: `Account 210987654321 can read and write objects in this bucket.`,
      evidence: JSON.stringify(
        { Effect: 'Allow', Principal: { AWS: 'arn:aws:iam::210987654321:root' }, Action: ['s3:GetObject', 's3:PutObject'] },
        null,
        2,
      ),
      remediation: `Confirm the partner account still needs access. Scope the statement to specific prefixes and actions.`,
    },
    'no-tls-enforcement': {
      detail: `Clients can read and write over plain HTTP.`,
      remediation: `Add a Deny statement for all actions when "aws:SecureTransport": "false".`,
    },
    'no-default-encryption': {
      detail: `Objects uploaded without an encryption header are stored unencrypted.`,
      remediation: `aws s3api put-bucket-encryption --bucket ${bucket} --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"aws:kms"}}]}'`,
    },
    'access-logging-off': {
      detail: `There is no record of who read or changed objects in this bucket.`,
      remediation: `aws s3api put-bucket-logging --bucket ${bucket} --bucket-logging-status '{"LoggingEnabled":{"TargetBucket":"northwind-alb-logs","TargetPrefix":"s3/${bucket}/"}}'`,
    },
    'versioning-off': {
      detail: `An accidental delete or a ransomware overwrite cannot be rolled back.`,
      remediation: `aws s3api put-bucket-versioning --bucket ${bucket} --versioning-configuration Status=Enabled`,
    },
  }
  return { checkId: c.id, severity: c.severity, title: c.title, ...base[id], ...extra }
}

export function worstOf(findings: Finding[]): Severity {
  for (const s of SEVERITY_ORDER) if (findings.some((f) => f.severity === s)) return s
  return 'pass'
}

export function countBySeverity(buckets: BucketResult[]): SeverityCounts {
  const counts: SeverityCounts = { critical: 0, high: 0, medium: 0, low: 0, pass: 0 }
  for (const b of buckets) counts[b.worstSeverity]++
  return counts
}

function makeAccount(seed: number, enabledChecks: string[]): BucketResult[] {
  const r = rng(seed)
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)]
  // Buckets that are deliberately exposed in the demo account.
  const exposed = new Set(['northwind-marketing-site', 'northwind-press-kit', 'interns-hackathon-2025', 'northwind-user-uploads', 'tmp-migration-oct', 'northwind-docs-site'])
  const partner = new Set(['northwind-partner-share', 'northwind-sftp-drop', 'northwind-analytics-exports'])

  return BUCKET_NAMES.map((name) => {
    const region = name.includes('-eu-') ? 'eu-west-1' : name.includes('apac') ? 'ap-southeast-1' : pick(REGIONS.slice(0, 3))
    const ids: string[] = []
    const bpaOff = exposed.has(name) || r() < 0.18
    if (exposed.has(name)) {
      if (name.includes('site') || name.includes('press')) ids.push('public-policy')
      else ids.push('public-acl-read')
      if (name === 'tmp-migration-oct' || name === 'interns-hackathon-2025') ids.push('public-acl-write')
    }
    if (name === 'northwind-legacy-2019' || name === 'northwind-hr-exports') ids.push('authenticated-users-grant')
    if (bpaOff) ids.push('block-public-access-off')
    if (partner.has(name)) ids.push('cross-account-access')
    if (r() < 0.35) ids.push('no-tls-enforcement')
    const encrypted = r() > 0.2
    if (!encrypted) ids.push('no-default-encryption')
    if (r() < 0.5) ids.push('access-logging-off')
    const versioned = r() > 0.4
    if (!versioned) ids.push('versioning-off')

    const findings = ids.filter((id) => enabledChecks.includes(id)).map((id) => finding(id, name))
    const created = new Date(Date.UTC(2019 + Math.floor(r() * 7), Math.floor(r() * 12), 1 + Math.floor(r() * 27)))
    return {
      name,
      region,
      createdAt: created.toISOString(),
      publicAccessBlock: bpaOff
        ? { blockPublicAcls: false, ignorePublicAcls: r() > 0.5, blockPublicPolicy: false, restrictPublicBuckets: r() > 0.5 }
        : { blockPublicAcls: true, ignorePublicAcls: true, blockPublicPolicy: true, restrictPublicBuckets: true },
      encryption: encrypted ? (r() > 0.5 ? 'SSE-KMS' : 'SSE-S3') : 'none',
      versioning: versioned ? 'Enabled' : r() > 0.5 ? 'Suspended' : 'Off',
      findings,
      worstSeverity: worstOf(findings),
    } satisfies BucketResult
  })
}

/* ---------------- fake scan lifecycle ---------------- */

const MS_PER_BUCKET = 140

interface StoredScan {
  id: string
  request: ScanRequest
  startedAt: number
  buckets: BucketResult[]
  /** Pre-finished scans in history skip the progress animation. */
  instant: boolean
}

const store = new Map<string, StoredScan>()

function seedHistory() {
  const all = CHECKS.map((c) => c.id)
  const day = 86_400_000
  const now = Date.now()
  const past: [string, number, string][] = [
    ['scn_7f3a91', now - 2 * day, 'security-audit'],
    ['scn_52c0de', now - 9 * day, 'security-audit'],
    ['scn_19bb04', now - 23 * day, 'prod-readonly'],
  ]
  past.forEach(([id, t, profile], i) => {
    const buckets = makeAccount(42 + i, all)
    store.set(id, {
      id,
      request: { profile, regions: [], checks: all },
      startedAt: t,
      buckets: i === 0 ? buckets : buckets.slice(0, buckets.length - i * 3),
      instant: true,
    })
  })
}
seedHistory()

function materialise(s: StoredScan): Scan {
  const total = s.buckets.length
  const elapsed = Date.now() - s.startedAt
  const scanned = s.instant ? total : Math.min(total, Math.max(0, Math.floor((elapsed - 600) / MS_PER_BUCKET)))
  const done = scanned >= total
  const status = elapsed < 600 && !s.instant ? 'queued' : done ? 'completed' : 'running'
  const buckets = s.buckets.slice(0, scanned)
  const regions = s.request.regions.length ? s.request.regions : REGIONS
  return {
    id: s.id,
    profile: s.request.profile,
    accountId: '123456789012',
    status,
    startedAt: new Date(s.startedAt).toISOString(),
    finishedAt: done ? new Date(s.startedAt + (s.instant ? 47_000 : 600 + total * MS_PER_BUCKET)).toISOString() : undefined,
    bucketCount: buckets.length,
    counts: countBySeverity(buckets),
    regions,
    checks: s.request.checks,
    progress: { scanned, total, current: done ? undefined : s.buckets[scanned]?.name },
    buckets,
  }
}

const delay = (ms = 180) => new Promise((r) => setTimeout(r, ms))

export const mockApi = {
  async listChecks(): Promise<CheckDefinition[]> {
    await delay()
    return CHECKS
  },
  async listProfiles(): Promise<string[]> {
    await delay()
    return ['security-audit', 'prod-readonly', 'default']
  },
  async listRegions(): Promise<string[]> {
    await delay()
    return REGIONS
  },
  async listScans(): Promise<ScanSummary[]> {
    await delay()
    return [...store.values()]
      .sort((a, b) => b.startedAt - a.startedAt)
      .map((s) => {
        const { regions: _r, checks: _c, progress: _p, buckets: _b, ...summary } = materialise(s)
        return summary
      })
  },
  async getScan(id: string): Promise<Scan> {
    await delay(120)
    const s = store.get(id)
    if (!s) throw new Error(`No scan with ID ${id}.`)
    return materialise(s)
  },
  async createScan(req: ScanRequest): Promise<ScanCreated> {
    await delay(300)
    const id = 'scn_' + Math.random().toString(16).slice(2, 8)
    const checks = req.checks.length ? req.checks : CHECKS.map((c) => c.id)
    let buckets = makeAccount(Math.floor(Math.random() * 1e6), checks)
    if (req.regions.length) buckets = buckets.filter((b) => req.regions.includes(b.region))
    store.set(id, { id, request: { ...req, checks }, startedAt: Date.now(), buckets, instant: false })
    return { id }
  },
}
