import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { AdminLayout } from './components/AdminLayout'
import { Layout } from './components/Layout'
import { AdminApplicationsPage } from './pages/AdminApplicationsPage'
import { AdminClassesPage } from './pages/AdminClassesPage'
import { AdminPage } from './pages/AdminPage'
import { ClassListPage } from './pages/ClassListPage'
import { HoldPage } from './pages/HoldPage'
import { MyApplicationsPage } from './pages/MyApplicationsPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<AdminClassesPage />} />
        <Route path="create" element={<AdminPage />} />
        <Route path="applications" element={<AdminApplicationsPage />} />
      </Route>
      <Route element={<Layout />}>
        <Route index element={<ClassListPage />} />
        <Route path="applications" element={<MyApplicationsPage />} />
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
