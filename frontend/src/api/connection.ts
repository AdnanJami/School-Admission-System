import { useSyncExternalStore } from 'react'

// Tiny store that tracks whether the last request failed because the server is unreachable.
let down = false
const listeners = new Set<() => void>()

export function setServerDown(value: boolean) {
  if (down === value) return
  down = value
  listeners.forEach((l) => l())
}

export function useServerDown(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
      }
    },
    () => down,
  )
}
