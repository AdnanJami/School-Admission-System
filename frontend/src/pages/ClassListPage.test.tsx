import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { cls, mockApi, renderApp } from '../test/utils'

describe('ClassListPage', () => {
  it('shows seat counts and disables Apply when a class is full', async () => {
    mockApi({
      'GET /classes': {
        body: [cls(), cls({ id: 'c_2', name: 'Class 7 Day Shift', availableSeats: 0, heldSeats: 4, confirmedSeats: 6 })],
      },
      'GET /me/holds': { body: [] },
    })
    renderApp('/')
    expect(await screen.findByText('Class 6 Morning Shift')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Full' })).toBeDisabled()
  })

  it('shows a friendly message when applying fails because the class just filled up', async () => {
    mockApi({
      'GET /classes': { body: [cls()] },
      'GET /me/holds': { body: [] },
      'POST /classes/c_1/holds': { status: 409, body: { error: 'Class is full.' } },
    })
    renderApp('/')
    await userEvent.click(await screen.findByRole('button', { name: 'Apply' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Class is full.')
  })

  it('offers "View application" instead of Apply when the student already has an active hold', async () => {
    mockApi({
      'GET /classes': { body: [cls()] },
      'GET /me/holds': {
        body: [
          {
            holdId: 'h_1',
            classId: 'c_1',
            className: 'Class 6 Morning Shift',
            status: 'HELD',
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
          },
        ],
      },
    })
    renderApp('/')
    expect(await screen.findByRole('link', { name: /view application/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument()
  })

  it('disables Apply until a student id is entered', async () => {
    mockApi({ 'GET /classes': { body: [cls()] } })
    renderApp('/', { student: null })
    expect(await screen.findByRole('button', { name: 'Apply' })).toBeDisabled()
  })

  it('shows a clear message when the server is down', async () => {
    const { vi } = await import('vitest')
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))
    renderApp('/')
    expect(await screen.findByRole('alert')).toHaveTextContent(/cannot reach the server/i)
  })
})
