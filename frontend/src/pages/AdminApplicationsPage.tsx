import { useState } from 'react'
import { ADMIN_HOLDS_LIMIT, useAllHolds } from '../api/hooks'
import type { HoldStatus } from '../api/types'
import { ErrorBanner, errorMessage } from '../components/ErrorBanner'
import { StatusBadge } from '../components/StatusBadge'
import { effectiveStatus, formatRemaining, parseUtc, remainingMs, useNow } from '../utils/time'

const STATUSES: Array<HoldStatus | 'ALL'> = ['ALL', 'HELD', 'CONFIRMED', 'EXPIRED', 'CANCELLED']

export function AdminApplicationsPage() {
  const holds = useAllHolds()
  const now = useNow()
  const [status, setStatus] = useState<HoldStatus | 'ALL'>('ALL')
  const [classId, setClassId] = useState('ALL')
  const [search, setSearch] = useState('')

  const all = (holds.data ?? []).map((h) => ({ ...h, shown: effectiveStatus(h.status, h.expiresAt, now) }))
  const classOptions = Array.from(new Map(all.map((h) => [h.classId, h.className])).entries())
  const rows = all.filter(
    (h) =>
      (status === 'ALL' || h.shown === status) &&
      (classId === 'ALL' || h.classId === classId) &&
      (!search.trim() || h.studentId.includes(search.trim())),
  )
  const count = (s: HoldStatus) => all.filter((h) => h.shown === s).length

  return (
    <section>
      <h2>All Applications</h2>
      <p className="muted">Every application from every student. Refreshes automatically.</p>
      {holds.isError && !holds.data && <ErrorBanner message={errorMessage(holds.error)} />}
      {holds.isPending && <p>Loading applications…</p>}

      {holds.data && (
        <>
          <div className="summary">
            <span>Total: <strong>{all.length}</strong></span>
            <span>Held: <strong>{count('HELD')}</strong></span>
            <span>Confirmed: <strong>{count('CONFIRMED')}</strong></span>
            <span>Expired: <strong>{count('EXPIRED')}</strong></span>
            <span>Cancelled: <strong>{count('CANCELLED')}</strong></span>
          </div>

          <div className="filters">
            <label>
              Status{' '}
              <select value={status} onChange={(e) => setStatus(e.target.value as HoldStatus | 'ALL')}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s === 'ALL' ? 'All statuses' : s}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Class{' '}
              <select value={classId} onChange={(e) => setClassId(e.target.value)}>
                <option value="ALL">All classes</option>
                {classOptions.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Student{' '}
              <input
                value={search}
                inputMode="numeric"
                placeholder="Search birth reg. no."
                onChange={(e) => setSearch(e.target.value.replace(/\D/g, ''))}
              />
            </label>
          </div>

          {all.length === 0 && <p>No applications yet.</p>}
          {all.length > 0 && rows.length === 0 && <p>No applications match these filters.</p>}
          {rows.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Student (birth reg. no.)</th>
                    <th>Class</th>
                    <th>Status</th>
                    <th>Time left</th>
                    <th>Applied at</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((h) => (
                    <tr key={h.holdId}>
                      <td>{h.studentId}</td>
                      <td>{h.className}</td>
                      <td>
                        <StatusBadge status={h.shown} />
                      </td>
                      <td>{h.shown === 'HELD' ? formatRemaining(remainingMs(h.expiresAt, now)) : '—'}</td>
                      <td>{new Date(parseUtc(h.createdAt)).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {all.length >= ADMIN_HOLDS_LIMIT && (
            <p className="muted">Showing the latest {ADMIN_HOLDS_LIMIT} applications.</p>
          )}
        </>
      )}
    </section>
  )
}
