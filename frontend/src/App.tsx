import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AdminPage } from './pages/AdminPage'
import { ClassListPage } from './pages/ClassListPage'
import { HoldPage } from './pages/HoldPage'
import { MyApplicationsPage } from './pages/MyApplicationsPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ClassListPage />} />
        <Route path="applications" element={<MyApplicationsPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="holds/:holdId" element={<HoldPage />} />
        <Route
          path="*"
          element={
            <p>
              Page not found. <Link to="/">Go to the class list</Link>.
            </p>
          }
        />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
