import type { HoldStatus } from '../api/types'

const LABELS: Record<HoldStatus, string> = {
  HELD: 'Held – payment pending',
  CONFIRMED: 'Confirmed',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
}

export function StatusBadge({ status }: { status: HoldStatus }) {
  return <span className={`badge badge-${status.toLowerCase()}`}>{LABELS[status]}</span>
}
