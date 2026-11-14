/**
 * The only module the UI talks to. Swap between the in-browser mock and the
 * real backend with VITE_USE_MOCK (defaults to the mock).
 */
import { mockApi } from './mock'
import type { CheckDefinition, Scan, ScanCreated, ScanRequest, ScanSummary } from './types'

const BASE = import.meta.env.VITE_API_URL ?? '/api'
export const USING_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`
    try {
      const body = await res.json()
      if (body?.detail) message = String(body.detail)
      else if (body?.error) message = String(body.error)
    } catch {
      /* body was not JSON */
    }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

const httpApi = {
  listChecks: () => request<CheckDefinition[]>('/checks'),
  listProfiles: () => request<string[]>('/profiles'),
  listRegions: () => request<string[]>('/regions'),
  listScans: () => request<ScanSummary[]>('/scans'),
  getScan: (id: string) => request<Scan>(`/scans/${encodeURIComponent(id)}`),
  createScan: (body: ScanRequest) =>
    request<ScanCreated>('/scans', { method: 'POST', body: JSON.stringify(body) }),
}

export const api: typeof httpApi = USING_MOCK ? mockApi : httpApi
