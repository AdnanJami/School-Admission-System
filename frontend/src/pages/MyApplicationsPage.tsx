import { Link } from 'react-router-dom'
import { useMyHolds } from '../api/hooks'
import { ErrorBanner, errorMessage } from '../components/ErrorBanner'
import { NeedStudent } from '../components/NeedStudent'
import { StatusBadge } from '../components/StatusBadge'
import { useStudent } from '../state/student'
import { effectiveStatus, formatRemaining, remainingMs, useNow } from '../utils/time'

export function MyApplicationsPage() {
  const { studentId } = useStudent()
  const holds = useMyHolds()
  const now = useNow()

  if (!studentId) return <NeedStudent what="see your applications" />

  return (
    <section>
      <h2>My Applications</h2>
      {holds.isError && !holds.data && <ErrorBanner message={errorMessage(holds.error)} />}
      {holds.isPending && <p>Loading your applications…</p>}
      {holds.data && holds.data.length === 0 && (
        <p>
          You have not applied to any class yet. Go to the <Link to="/">class list</Link> to apply.
        </p>
      )}
      {holds.data && holds.data.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Class</th>
                <th>Status</th>
                <th>Time left</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {holds.data.map((h) => {
                const status = effectiveStatus(h.status, h.expiresAt, now)
                return (
                  <tr key={h.holdId}>
                    <td>{h.className}</td>
                    <td>
                      <StatusBadge status={status} />
                    </td>
                    <td>{status === 'HELD' ? formatRemaining(remainingMs(h.expiresAt, now)) : '—'}</td>
                    <td className="actions">
                      <Link className="btn btn-small" to={`/holds/${h.holdId}`}>
                        {status === 'HELD' ? 'Pay / manage' : 'View'}
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
