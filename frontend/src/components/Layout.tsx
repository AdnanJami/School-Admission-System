import { NavLink, Outlet } from 'react-router-dom'
import { useServerDown } from '../api/connection'
import { ErrorBanner } from './ErrorBanner'
import { StudentBar } from './StudentBar'

export function Layout() {
  const down = useServerDown()
  return (
    <div className="container">
      <header className="header">
        <h1>School Admission System</h1>
        <StudentBar />
        <nav className="nav">
          <NavLink to="/" end>
            Classes
          </NavLink>
          <NavLink to="/applications">My Applications</NavLink>
          <NavLink to="/admin">Admin: Create Class</NavLink>
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
