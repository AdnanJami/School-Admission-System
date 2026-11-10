import { Link } from 'react-router-dom'
import { useClasses } from '../api/hooks'
import { ErrorBanner } from '../components/ErrorBanner'
import { errorMessage } from '../utils/errorMessage'
export function AdminClassesPage() {
  const classes = useClasses()
  const list = classes.data ?? []
  const totals = list.reduce(
    (t, c) => ({
      seats: t.seats + c.totalSeats,
      held: t.held + c.heldSeats,
      confirmed: t.confirmed + c.confirmedSeats,
      available: t.available + c.availableSeats,
    }),
    { seats: 0, held: 0, confirmed: 0, available: 0 },
  )

  return (
    <section>
      <h2>Class List</h2>
      <p className="muted">Live seat status of every class. Refreshes automatically.</p>
      {classes.isError && !classes.data && <ErrorBanner message={errorMessage(classes.error)} />}
      {classes.isPending && <p>Loading classes…</p>}
      {classes.data && list.length === 0 && (
        <p>
          No classes yet. <Link to="/admin/create">Create the first class</Link>.
        </p>
      )}
      {list.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Class</th>
                <th className="num">Total</th>
                <th className="num">Held</th>
                <th className="num">Confirmed</th>
                <th className="num">Available</th>
                <th>Filled</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => {
                const pct = c.totalSeats ? Math.round(((c.heldSeats + c.confirmedSeats) / c.totalSeats) * 100) : 0
                return (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td className="num">{c.totalSeats}</td>
                    <td className="num">{c.heldSeats}</td>
                    <td className="num">{c.confirmedSeats}</td>
                    <td className="num">
                      <strong>{c.availableSeats}</strong>
                    </td>
                    <td className="meter-cell">
                      <div className="meter" role="img" aria-label={`${pct}% of seats taken`}>
                        <div className="meter-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="muted">{pct}%</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <th>All classes</th>
                <th className="num">{totals.seats}</th>
                <th className="num">{totals.held}</th>
                <th className="num">{totals.confirmed}</th>
                <th className="num">{totals.available}</th>
                <th />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  )
}
