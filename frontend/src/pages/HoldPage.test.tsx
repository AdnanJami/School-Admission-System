import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { cls, mockApi, renderApp } from '../test/utils'

const hold = (over: Record<string, unknown> = {}) => ({
  holdId: 'h_1',
  classId: 'c_1',
  status: 'HELD',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  ...over,
})

describe('HoldPage', () => {
  it('flips to EXPIRED and disables "Pay Admission Fee" when time runs out, without a reload', async () => {
    // The server keeps saying HELD (its background job has not run yet); the UI must still react.
    mockApi({
      'GET /classes': { body: [cls()] },
      'GET /holds/h_1': () => ({ body: hold({ expiresAt: new Date(Date.now() + 1500).toISOString() }) }),
    })
    renderApp('/holds/h_1')
    const pay = await screen.findByRole('button', { name: /pay admission fee/i })
    expect(pay).toBeEnabled()
    expect(screen.getByTestId('timer')).toBeInTheDocument()

    await waitFor(() => expect(screen.getByText('Expired')).toBeInTheDocument(), { timeout: 4000 })
    expect(screen.getByRole('button', { name: /pay admission fee/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeDisabled()
  })

  it('confirms the admission when paying', async () => {
    let status = 'HELD'
    mockApi({
      'GET /classes': { body: [cls()] },
      'GET /holds/h_1': () => ({ body: hold({ status }) }),
      'POST /holds/h_1/confirm': () => {
        status = 'CONFIRMED'
        return { body: { holdId: 'h_1', status: 'CONFIRMED' } }
      },
    })
    renderApp('/holds/h_1')
    await userEvent.click(await screen.findByRole('button', { name: /pay admission fee/i }))
    expect(await screen.findByText('Confirmed')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pay admission fee/i })).toBeDisabled()
  })

  it('asks before cancelling and then shows the application as cancelled', async () => {
    let status = 'HELD'
    mockApi({
      'GET /classes': { body: [cls()] },
      'GET /holds/h_1': () => ({ body: hold({ status }) }),
      'DELETE /holds/h_1': () => {
        status = 'CANCELLED'
        return { status: 204 }
      },
    })
    renderApp('/holds/h_1')
    await userEvent.click(await screen.findByRole('button', { name: /^cancel$/i }))
    await userEvent.click(screen.getByRole('button', { name: /yes, cancel it/i }))
    expect(await screen.findByText('Cancelled')).toBeInTheDocument()
  })

  it('shows the server message when paying fails because the hold expired', async () => {
    mockApi({
      'GET /classes': { body: [cls()] },
      'GET /holds/h_1': { body: hold() },
      'POST /holds/h_1/confirm': { status: 409, body: { error: 'Hold has expired.' } },
    })
    renderApp('/holds/h_1')
    await userEvent.click(await screen.findByRole('button', { name: /pay admission fee/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Hold has expired.')
  })

  it('shows a not-found message for an unknown application', async () => {
    mockApi({
      'GET /classes': { body: [cls()] },
      'GET /holds/h_1': { status: 404, body: { error: 'Hold not found.' } },
    })
    renderApp('/holds/h_1')
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not find this application/i)
  })
})
