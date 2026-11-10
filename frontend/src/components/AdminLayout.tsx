import { Link, NavLink, Outlet } from 'react-router-dom'
import { useServerDown } from '../api/connection'
import { ErrorBanner } from './ErrorBanner'

/** School admin view (no login): class list, create class, all applications. */
export function AdminLayout() {
  const down = useServerDown()
  return (
    <div className="container">
      <header className="header">
        <div className="title-row">
          <h1>
            School Admission System <span className="tag">Admin</span>
          </h1>
          <Link to="/" className="btn btn-small">
            ← Guardian view
          </Link>
        </div>
        <nav className="nav">
          <NavLink to="/admin" end>
            Class List
          </NavLink>
          <NavLink to="/admin/create">Create Class</NavLink>
          <NavLink to="/admin/applications">All Applications</NavLink>
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
