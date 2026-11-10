const BASE = (window as any).__CONFIG__?.API_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** True when the request never reached the server (server down, offline, CORS...). */
export function isNetworkError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 0
}

function friendly(status: number, body: unknown): string {
  const b = body as { error?: unknown; errors?: Record<string, string[]>; title?: unknown } | null
  if (b && typeof b.error === 'string') return b.error
  if (b && b.errors && typeof b.errors === 'object') {
    const msgs = Object.values(b.errors).flat().filter((m) => typeof m === 'string')
    if (msgs.length) return msgs.join(' ')
  }
  switch (status) {
    case 400:
      return 'Some of the information you entered is not valid. Please check it and try again.'
    case 403:
      return 'This application belongs to another student.'
    case 404:
      return 'We could not find what you were looking for.'
    case 409:
      return 'That action is no longer possible. Please refresh and try again.'
    default:
      return 'Something went wrong on the server. Please try again in a moment.'
  }
}

interface Options {
  method?: string
  body?: unknown
  studentId?: string | null
}

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  if (opts.studentId) headers['X-Student-Id'] = opts.studentId

  let res: Response
  try {
    res = await fetch(BASE + path, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Please check your connection and try again.')
  }

  if (res.status === 204) return undefined as T
  const body: unknown = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, friendly(res.status, body))
  return body as T
}
