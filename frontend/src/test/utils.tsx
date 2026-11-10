import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { AppRoutes } from '../App'
import { StudentProvider } from '../state/student'

export const STUDENT = '20152691234567890'

type Handler = (req: { method: string; headers: Record<string, string>; body: unknown }) => {
  status?: number
  body?: unknown
}

/** Replaces fetch with a tiny router: keys look like "GET /classes". */
export function mockApi(routes: Record<string, Handler | { status?: number; body?: unknown }>) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const path = new URL(url).pathname
    const method = init?.method ?? 'GET'
    const key = `${method} ${path}`
    const route = routes[key]
    if (!route) return new Response(JSON.stringify({ error: `unmocked ${key}` }), { status: 500 })
    const result =
      typeof route === 'function'
        ? route({
            method,
            headers: (init?.headers ?? {}) as Record<string, string>,
            body: init?.body ? JSON.parse(init.body as string) : undefined,
          })
        : route
    const status = result.status ?? 200
    if (status === 204) return new Response(null, { status })
    return new Response(JSON.stringify(result.body ?? null), { status })
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

export function renderApp(path = '/', opts: { student?: string | null } = {}) {
  if (opts.student !== null) localStorage.setItem('studentId', opts.student ?? STUDENT)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <StudentProvider>
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      </StudentProvider>
    </QueryClientProvider>,
  )
}

export const cls = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'c_1',
  name: 'Class 6 Morning Shift',
  totalSeats: 10,
  heldSeats: 2,
  confirmedSeats: 3,
  availableSeats: 5,
  ...over,
})
