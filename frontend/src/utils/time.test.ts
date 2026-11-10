import { describe, expect, it } from 'vitest'
import { effectiveStatus, formatRemaining, parseUtc, remainingMs } from './time'

describe('time utils', () => {
  it('treats timestamps without a zone as UTC', () => {
    expect(parseUtc('2026-11-01T04:10:00')).toBe(parseUtc('2026-11-01T04:10:00Z'))
  })

  it('formats remaining time as mm:ss, rounding up', () => {
    expect(formatRemaining(600_000)).toBe('10:00')
    expect(formatRemaining(61_000)).toBe('01:01')
    expect(formatRemaining(500)).toBe('00:01')
    expect(formatRemaining(0)).toBe('00:00')
  })

  it('never returns negative remaining time', () => {
    expect(remainingMs('2026-01-01T00:00:00Z', Date.parse('2026-02-01T00:00:00Z'))).toBe(0)
  })

  it('shows a HELD application as EXPIRED once time has run out', () => {
    const exp = '2026-11-01T04:10:00Z'
    const t = Date.parse(exp)
    expect(effectiveStatus('HELD', exp, t - 1000)).toBe('HELD')
    expect(effectiveStatus('HELD', exp, t)).toBe('EXPIRED')
    expect(effectiveStatus('CONFIRMED', exp, t + 1000)).toBe('CONFIRMED')
    expect(effectiveStatus('CANCELLED', exp, t + 1000)).toBe('CANCELLED')
  })
})
