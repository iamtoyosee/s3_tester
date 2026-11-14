# s3_tester

s3_tester audits the S3 buckets in an AWS account. It finds buckets that anyone on the internet can read or write, and settings that would let a bucket become public by mistake. For each problem it shows the evidence and the fix.

It is a read-only auditing tool. A scan reads bucket configuration through the AWS API. It never changes a setting and never downloads objects.

> Only scan AWS accounts you own or have written permission to test.

## What it checks

| Check | ID | Severity | What it means |
|---|---|---|---|
| Public read via ACL | `public-acl-read` | Critical | An ACL grants `READ` to the `AllUsers` group, so anyone can list or download objects. |
| Public write via ACL | `public-acl-write` | Critical | An ACL grants `WRITE` or `FULL_CONTROL` to `AllUsers`, so anyone can upload or overwrite objects. |
| Bucket policy allows everyone | `public-policy` | Critical | A policy statement has `Effect: Allow` and `Principal: "*"` with no restricting `Condition`. |
| Grant to any AWS account | `authenticated-users-grant` | High | An ACL grants access to `AuthenticatedUsers`, which means every AWS customer, not just your account. |
| Block Public Access not fully on | `block-public-access-off` | High | One or more of the four Block Public Access settings is off, so a bad ACL or policy would take effect. |
| Access from another account | `cross-account-access` | Medium | The bucket policy grants access to a principal outside this account. |
| HTTP requests allowed | `no-tls-enforcement` | Medium | No policy statement denies requests where `aws:SecureTransport` is `false`. |
| No default encryption | `no-default-encryption` | Medium | Objects uploaded without an encryption header are stored unencrypted. |
| Access logging off | `access-logging-off` | Low | Server access logging is disabled, so there's no audit trail. |
| Versioning off | `versioning-off` | Low | Deleted or overwritten objects can't be recovered. |

A bucket counts as **public** in the UI if it fails any of the first three checks. Each bucket's overall severity is the worst severity among its findings, or `pass` if it has none.

## How it's built

```
┌──────────────────────────┐      HTTP/JSON       ┌───────────────────────────┐      boto3       ┌─────────┐
│  frontend/  (React, TS)  │  ─────────────────▶  │  backend/  (scanner API)  │  ─────────────▶  │ AWS S3  │
│  start scans, view       │   /api/scans  etc.   │  runs checks per bucket,  │  read-only calls │   API   │
│  results, fix guidance   │  ◀─────────────────  │  stores scan results      │                  │         │
└──────────────────────────┘                      └───────────────────────────┘                  └─────────┘
```

- **`frontend/`** is done. It's a React + TypeScript app (Vite) with a built-in mock backend, so it runs on its own today.
- **`backend/`** is the next piece to build: an HTTP API that runs the checks with the AWS SDK and returns results in the shape described below. A Python service (FastAPI + boto3) on port 8000 is the expected default, but anything that serves the same JSON works.

### Frontend screens

- **Latest results** (`/`): a one-line verdict ("6 of 42 buckets can be read by anyone on the internet"), a severity breakdown that doubles as a filter, a map with one tile per bucket grouped by region, and a sortable, searchable table of every bucket.
- **New scan** (`/scans/new`): pick an AWS profile, regions and checks, then start the scan. While it runs, the results page polls for progress and the bucket map fills in as each bucket is inspected.
- **Bucket detail** (`/scans/:id/buckets/:name`): every finding with its evidence (the offending ACL grant or policy statement) and a copyable fix, plus the bucket's Block Public Access, encryption and versioning settings.
- **History** (`/scans`): past scans with their severity breakdown.

## Running the frontend

Requires Node 20 or later.

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173, uses sample data
```

To point it at the real backend:

```bash
VITE_USE_MOCK=false npm run dev
```

In development, Vite forwards every `/api/*` request to `http://localhost:8000`. Use a different address with `BACKEND_URL=http://host:port npm run dev`. For a production build served from another origin, set `VITE_API_URL` (for example `https://scanner.internal/api`) and run `npm run build`.

## Backend API contract

The frontend calls these endpoints. The TypeScript types in [`frontend/src/api/types.ts`](frontend/src/api/types.ts) are the source of truth for every field. Dates are ISO 8601 strings. On error, return a non-2xx status with `{"detail": "message"}`; the UI shows the message to the user.

| Method | Path | Returns | Notes |
|---|---|---|---|
| `GET` | `/api/profiles` | `string[]` | AWS profiles the backend can use (from `~/.aws/config`). |
| `GET` | `/api/regions` | `string[]` | Regions offered in the scan form. |
| `GET` | `/api/checks` | `CheckDefinition[]` | The checks above, with `id`, `title`, `description`, `category`, `severity`. |
| `POST` | `/api/scans` | `{ "id": string }` | Starts a scan in the background and returns immediately. |
| `GET` | `/api/scans` | `ScanSummary[]` | All scans, newest first. |
| `GET` | `/api/scans/{id}` | `Scan` | Full results. Polled every ~0.7s while `status` is `queued` or `running`. |

### Starting a scan

```http
POST /api/scans
Content-Type: application/json

{ "profile": "security-audit", "regions": [], "checks": [] }
```

An empty `regions` or `checks` array means "all".

### A scan in progress

Return the buckets finished so far in `buckets`, and update `progress` as you go. The UI fills in the bucket map from this.

```json
{
  "id": "scn_7f3a91",
  "profile": "security-audit",
  "accountId": "123456789012",
  "status": "running",
  "startedAt": "2026-11-14T11:02:00Z",
  "bucketCount": 14,
  "counts": { "critical": 3, "high": 3, "medium": 2, "low": 5, "pass": 1 },
  "regions": ["us-east-1", "us-west-2"],
  "checks": ["public-acl-read", "public-policy", "versioning-off"],
  "progress": { "scanned": 14, "total": 42, "current": "northwind-cloudtrail" },
  "buckets": [ ... ]
}
```

`counts` is the number of buckets whose worst severity is each level. When the scan ends, set `status` to `completed` (or `failed` with an `error` message) and set `finishedAt`.

### One bucket result

```json
{
  "name": "tmp-migration-oct",
  "region": "us-east-2",
  "createdAt": "2024-10-03T00:00:00Z",
  "publicAccessBlock": {
    "blockPublicAcls": false,
    "ignorePublicAcls": false,
    "blockPublicPolicy": false,
    "restrictPublicBuckets": true
  },
  "encryption": "SSE-S3",
  "versioning": "Enabled",
  "worstSeverity": "critical",
  "findings": [
    {
      "checkId": "public-acl-read",
      "severity": "critical",
      "title": "Public read via ACL",
      "detail": "Anyone can list and download objects in tmp-migration-oct without credentials.",
      "evidence": "Grantee: { Type: Group, URI: http://acs.amazonaws.com/groups/global/AllUsers }\nPermission: READ",
      "remediation": "aws s3api put-bucket-acl --bucket tmp-migration-oct --acl private"
    }
  ]
}
```

- `publicAccessBlock` is `null` if the backend couldn't read it (for example, missing permission). A bucket with no configuration at all should report all four values as `false`.
- `encryption` is one of `SSE-S3`, `SSE-KMS`, `DSSE-KMS`, `none`. `versioning` is one of `Enabled`, `Suspended`, `Off`.
- If `remediation` starts with `aws `, the UI shows it as a command with a Copy button. Otherwise it's shown as prose.

## Building the backend: where each check comes from

| Check | boto3 call(s) |
|---|---|
| `public-acl-read`, `public-acl-write`, `authenticated-users-grant` | `get_bucket_acl` and look for grantee URIs ending in `/global/AllUsers` or `/global/AuthenticatedUsers` |
| `public-policy`, `cross-account-access`, `no-tls-enforcement` | `get_bucket_policy` (parse the JSON); `get_bucket_policy_status` gives AWS's own `IsPublic` verdict as a cross-check |
| `block-public-access-off` | `get_public_access_block` (a `NoSuchPublicAccessBlockConfiguration` error means all four are off); also consider the account-level setting via `s3control.get_public_access_block` |
| `no-default-encryption` | `get_bucket_encryption` |
| `access-logging-off` | `get_bucket_logging` |
| `versioning-off` | `get_bucket_versioning` |
| bucket list and region | `list_buckets`, then `get_bucket_location` (a `None` location means `us-east-1`) |

### IAM permissions the scanning profile needs

Read-only, nothing else:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "s3:ListAllMyBuckets",
      "s3:GetBucketLocation",
      "s3:GetBucketAcl",
      "s3:GetBucketPolicy",
      "s3:GetBucketPolicyStatus",
      "s3:GetBucketPublicAccessBlock",
      "s3:GetAccountPublicAccessBlock",
      "s3:GetEncryptionConfiguration",
      "s3:GetBucketLogging",
      "s3:GetBucketVersioning",
      "sts:GetCallerIdentity"
    ],
    "Resource": "*"
  }]
}
```

`sts:GetCallerIdentity` supplies the `accountId` shown in the UI.

## Repository layout

```
s3_tester/
├── README.md
└── frontend/
    ├── src/
    │   ├── api/
    │   │   ├── types.ts      # API contract (shared shapes)
    │   │   ├── client.ts     # fetch wrapper; switches mock/real with VITE_USE_MOCK
    │   │   └── mock.ts       # in-browser fake backend with sample data
    │   ├── components/       # bucket map, severity bar, table, layout
    │   ├── pages/            # latest results, new scan, bucket detail, history
    │   ├── hooks.ts          # data loading and scan polling
    │   └── index.css         # design tokens and all styles
    └── vite.config.ts        # /api proxy to the backend
```

## Roadmap

- [x] Frontend: scan setup, live progress, results, bucket detail, history
- [ ] Backend API serving the contract above
- [ ] Run checks across buckets concurrently, with retries on throttling
- [ ] Persist scan history (SQLite is plenty)
- [ ] Export a scan as JSON or CSV
- [ ] Account-level Block Public Access in the results header
