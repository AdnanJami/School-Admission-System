import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApply, useClasses, useMyHolds } from '../api/hooks'
import { ErrorBanner, errorMessage } from '../components/ErrorBanner'
import { useStudent } from '../state/student'
import { effectiveStatus, useNow } from '../utils/time'

export function ClassListPage() {
  const { studentId } = useStudent()
  const classes = useClasses()
  const myHolds = useMyHolds()
  const apply = useApply()
  const navigate = useNavigate()
  const now = useNow()
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const [applyError, setApplyError] = useState<string | null>(null)

  function onApply(classId: string) {
    setApplyError(null)
    setApplyingId(classId)
    apply.mutate(classId, {
      onSuccess: (hold) => navigate(`/holds/${hold.holdId}`),
      onError: (err) => setApplyError(errorMessage(err)),
      onSettled: () => setApplyingId(null),
    })
  }

  // The student's active application (held and not yet expired, or confirmed) per class.
  const activeByClass = new Map<string, { holdId: string; status: 'HELD' | 'CONFIRMED' }>()
  for (const h of myHolds.data ?? []) {
    const s = effectiveStatus(h.status, h.expiresAt, now)
    if (s === 'HELD' || s === 'CONFIRMED') activeByClass.set(h.classId, { holdId: h.holdId, status: s })
  }

  return (
    <section>
      <h2>Classes</h2>
      <p className="muted">
        Seats are first-come, first-served. Applying holds a seat for a limited time; pay the admission fee
        before it runs out to confirm it. Seat counts refresh automatically.
      </p>

      {!studentId && (
        <div className="banner banner-info" role="status">
          Enter the student&apos;s birth registration number at the top of the page to apply.
        </div>
      )}
      <ErrorBanner message={applyError} onDismiss={() => setApplyError(null)} />
      {classes.isError && !classes.data && <ErrorBanner message={errorMessage(classes.error)} />}

      {classes.isPending && <p>Loading classes…</p>}
      {classes.data && classes.data.length === 0 && (
        <p>No classes are open for admission yet. Please check back soon.</p>
      )}

      {classes.data && classes.data.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Class</th>
                <th className="num">Total</th>
                <th className="num">Held</th>
                <th className="num">Confirmed</th>
                <th className="num">Available</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {classes.data.map((c) => {
                const mine = activeByClass.get(c.id)
                const full = c.availableSeats <= 0
                return (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td className="num">{c.totalSeats}</td>
                    <td className="num">{c.heldSeats}</td>
                    <td className="num">{c.confirmedSeats}</td>
                    <td className="num">
                      <strong>{c.availableSeats}</strong>
                    </td>
                    <td className="actions">
                      {mine ? (
                        <Link className="btn btn-small" to={`/holds/${mine.holdId}`}>
                          {mine.status === 'CONFIRMED' ? 'Admitted ✓ View' : 'View application'}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-primary btn-small"
                          disabled={!studentId || full || applyingId !== null}
                          title={!studentId ? 'Enter a student ID first' : full ? 'No seats left' : undefined}
                          onClick={() => onApply(c.id)}
                        >
                          {applyingId === c.id ? 'Applying…' : full ? 'Full' : 'Apply'}
                        </button>
                      )}
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
