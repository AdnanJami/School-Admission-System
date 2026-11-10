import { useEffect, useState } from 'react'
import type { HoldStatus } from '../api/types'

/** The API returns UTC timestamps; be defensive if the "Z" is missing. */
export function parseUtc(value: string): number {
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value)
  return new Date(hasZone ? value : value + 'Z').getTime()
}

export function remainingMs(expiresAt: string, now: number): number {
  return Math.max(0, parseUtc(expiresAt) - now)
}

/** A HELD application whose time ran out is shown as EXPIRED immediately, without waiting for the server. */
export function effectiveStatus(status: HoldStatus, expiresAt: string, now: number): HoldStatus {
  return status === 'HELD' && remainingMs(expiresAt, now) <= 0 ? 'EXPIRED' : status
}

export function formatRemaining(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Re-renders the component every second with the current time. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
