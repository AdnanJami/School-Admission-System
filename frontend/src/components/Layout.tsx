import { Link, NavLink, Outlet } from 'react-router-dom'
import { useServerDown } from '../api/connection'
import { ErrorBanner } from './ErrorBanner'
import { StudentBar } from './StudentBar'

/** Guardian view: apply, pay, cancel, see own applications. */
export function Layout() {
  const down = useServerDown()
  return (
    <div className="container">
      <header className="header">
        <div className="title-row">
          <h1>School Admission System</h1>
          <Link to="/admin" className="btn btn-small">
            Admin
          </Link>
        </div>
        <StudentBar />
        <nav className="nav">
          <NavLink to="/" end>
            Classes
          </NavLink>
          <NavLink to="/applications">My Applications</NavLink>
        </nav>
      </header>
      {down && (
        <ErrorBanner message="We cannot reach the server right now. We will keep trying and this message will disappear when the connection is back." />
      )}
      <main>
        <Outlet />
      </main>
    </div>
  )
}
