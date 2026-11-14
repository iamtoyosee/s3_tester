import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api/client'
import type { Scan } from './api/types'

export interface AsyncState<T> {
  data: T | undefined
  error: Error | undefined
  loading: boolean
  reload: () => void
}

/** Runs an async loader on mount and whenever `deps` change. */
export function useAsync<T>(load: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T>()
  const [error, setError] = useState<Error>()
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(undefined)
    load()
      .then((d) => !cancelled && setData(d))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e : new Error(String(e))))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { data, error, loading, reload }
}

/** Fetches a scan and keeps polling it while it is queued or running. */
export function useScan(id: string | undefined, intervalMs = 700) {
  const [scan, setScan] = useState<Scan>()
  const [error, setError] = useState<Error>()
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!id) return
    let cancelled = false

    const tick = async () => {
      try {
        const s = await api.getScan(id)
        if (cancelled) return
        setScan(s)
        if (s.status === 'queued' || s.status === 'running') {
          timer.current = window.setTimeout(tick, intervalMs)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)))
      }
    }
    tick()
    return () => {
      cancelled = true
      window.clearTimeout(timer.current)
    }
  }, [id, intervalMs])

  return { scan, error }
}
