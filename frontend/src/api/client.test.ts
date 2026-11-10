import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from './client'

afterEach(() => vi.unstubAllGlobals())

function respond(status: number, body: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status })))
}

describe('api client', () => {
  it('turns a network failure into a friendly message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))
    await expect(api('/classes')).rejects.toMatchObject({
      status: 0,
      message: expect.stringContaining('Cannot reach the server'),
    })
  })

  it('uses the {error} message from the backend', async () => {
    respond(409, { error: 'Class is full.' })
    await expect(api('/x')).rejects.toThrow('Class is full.')
  })

  it('joins ASP.NET validation errors', async () => {
    respond(400, { title: 'One or more validation errors occurred.', errors: { TotalSeats: ['Must be at least 1.'] } })
    const err = await api('/x').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).message).toBe('Must be at least 1.')
  })

  it('sends the student header and returns undefined for 204', async () => {
    const fn = vi.fn(async () => new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fn)
    await expect(api('/holds/h_1', { method: 'DELETE', studentId: '20152691234567890' })).resolves.toBeUndefined()
    const init = (fn.mock.calls[0] as unknown as [string, RequestInit])[1]
    expect((init.headers as Record<string, string>)['X-Student-Id']).toBe('20152691234567890')
  })
})
