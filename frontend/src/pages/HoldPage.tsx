import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCancel, useClasses, useConfirm, useHold } from '../api/hooks'
import { ApiError } from '../api/client'
import { ErrorBanner, SuccessBanner, errorMessage } from '../components/ErrorBanner'
import { StatusBadge } from '../components/StatusBadge'
import { useStudent } from '../state/student'
import { effectiveStatus, formatRemaining, parseUtc, remainingMs, useNow } from '../utils/time'

export function HoldPage() {
  const { holdId } = useParams()
  const { studentId } = useStudent()
  const hold = useHold(holdId)
  const classes = useClasses()
  const confirm = useConfirm()
  const cancel = useCancel()
  const now = useNow()
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const data = hold.data
  const status = data ? effectiveStatus(data.status, data.expiresAt, now) : null
  const expiredLocally = !!data && data.status === 'HELD' && status === 'EXPIRED'
  const { refetch } = hold

  // As soon as the timer runs out, ask the server once so the page and seat counts catch up.
  useEffect(() => {
    if (expiredLocally) void refetch()
  }, [expiredLocally, refetch])

  if (hold.isPending) return <p>Loading application…</p>

  if (hold.isError || !data || !status) {
    const notFound = hold.error instanceof ApiError && hold.error.status === 404
    return (
      <section>
        <ErrorBanner message={notFound ? 'We could not find this application.' : errorMessage(hold.error)} />
        <Link to="/applications">Back to my applications</Link>
      </section>
    )
  }

  const className = classes.data?.find((c) => c.id === data.classId)?.name ?? data.classId
  const left = remainingMs(data.expiresAt, now)
  const canAct = status === 'HELD' && !!studentId
  const busy = confirm.isPending || cancel.isPending

  function onConfirm() {
    setActionError(null)
    setMessage(null)
    confirm.mutate(data!.holdId, {
      onSuccess: () => setMessage('Admission fee paid. The admission is confirmed.'),
      onError: (err) => setActionError(errorMessage(err)),
    })
  }

  function onCancel() {
    setActionError(null)
    setMessage(null)
    setConfirmingCancel(false)
    cancel.mutate(data!.holdId, {
      onSuccess: () => setMessage('The application was cancelled and the seat was released.'),
      onError: (err) => setActionError(errorMessage(err)),
    })
  }

  return (
    <section>
      <h2>Application Status</h2>
      <div className="card">
        <dl className="details">
          <dt>Class</dt>
          <dd>{className}</dd>
          <dt>Status</dt>
          <dd>
            <StatusBadge status={status} />
          </dd>
          {status === 'HELD' && (
            <>
              <dt>Time remaining</dt>
              <dd>
                <span className="timer" aria-live="off" data-testid="timer">
                  {formatRemaining(left)}
                </span>{' '}
                <span className="muted">(seat released automatically if unpaid)</span>
              </dd>
            </>
          )}
          <dt>{status === 'HELD' ? 'Expires at' : 'Hold expiry'}</dt>
          <dd>{new Date(parseUtc(data.expiresAt)).toLocaleString()}</dd>
        </dl>

        {status === 'EXPIRED' && (
          <div className="banner banner-error" role="alert">
            This application has expired and the seat was released. You can apply again from the{' '}
            <Link to="/">class list</Link> if seats are still available.
          </div>
        )}
        {status === 'CONFIRMED' && (
          <SuccessBanner message="Admission confirmed. The admission fee has been paid." />
        )}
        {status === 'CANCELLED' && (
          <div className="banner banner-info" role="status">
            This application was cancelled.
          </div>
        )}
        {status === 'HELD' && !studentId && (
          <div className="banner banner-info" role="status">
            Enter the student&apos;s birth registration number at the top of the page to pay or cancel.
          </div>
        )}

        <SuccessBanner message={message} />
        <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />

        <div className="button-row">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canAct || busy}
            onClick={onConfirm}
          >
            {confirm.isPending ? 'Processing payment…' : 'Pay Admission Fee'}
          </button>
          {!confirmingCancel ? (
            <button
              type="button"
              className="btn btn-danger"
              disabled={!canAct || busy}
              onClick={() => setConfirmingCancel(true)}
            >
              Cancel
            </button>
          ) : (
            <span className="inline-confirm">
              Cancel this application?{' '}
              <button type="button" className="btn btn-danger btn-small" onClick={onCancel} disabled={busy}>
                Yes, cancel it
              </button>{' '}
              <button type="button" className="btn btn-small" onClick={() => setConfirmingCancel(false)}>
                Keep it
              </button>
            </span>
          )}
        </div>
      </div>
      <p>
        <Link to="/applications">← My applications</Link> · <Link to="/">Class list</Link>
      </p>
    </section>
  )
}
