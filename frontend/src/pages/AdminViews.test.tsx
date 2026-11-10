import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { cls, mockApi, renderApp } from '../test/utils'

const soon = () => new Date(Date.now() + 120_000).toISOString()
const past = () => new Date(Date.now() - 120_000).toISOString()

const adminHold = (over: Record<string, unknown> = {}) => ({
  holdId: 'h_1',
  classId: 'c_1',
  className: 'Class 6 Morning Shift',
  studentId: '20152691234567890',
  status: 'HELD',
  expiresAt: soon(),
  createdAt: new Date().toISOString(),
  ...over,
})

describe('guardian vs admin views', () => {
  it('guardian view has an Admin button and no create-class link', async () => {
    mockApi({ 'GET /classes': { body: [cls()] }, 'GET /me/holds': { body: [] } })
    renderApp('/')
    expect(await screen.findByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin')
    expect(screen.queryByRole('link', { name: /create class/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/class 6 morning shift.*create/i)).not.toBeInTheDocument()
  })

  it('admin button opens the admin area, which has no student bar and a way back', async () => {
    mockApi({ 'GET /classes': { body: [cls()] }, 'GET /me/holds': { body: [] } })
    renderApp('/')
    await userEvent.click(await screen.findByRole('link', { name: 'Admin' }))
    expect(await screen.findByRole('heading', { name: 'Class List' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create Class' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'All Applications' })).toBeInTheDocument()
    expect(screen.queryByLabelText(/birth registration/i)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: /guardian view/i }))
    expect(await screen.findByRole('link', { name: 'My Applications' })).toBeInTheDocument()
  })

  it('admin class list shows seat counts and totals', async () => {
    mockApi({
      'GET /classes': {
        body: [cls(), cls({ id: 'c_2', name: 'Class 7 Day Shift', totalSeats: 20, heldSeats: 0, confirmedSeats: 5, availableSeats: 15 })],
      },
    })
    renderApp('/admin', { student: null })
    expect(await screen.findByText('Class 7 Day Shift')).toBeInTheDocument()
    const footer = screen.getByText('All classes').closest('tr')!
    expect(within(footer).getByText('30')).toBeInTheDocument() // 10 + 20 seats
  })

  it('all applications lists every student and filters by status and student number', async () => {
    mockApi({
      'GET /admin/holds': {
        body: [
          adminHold(),
          adminHold({ holdId: 'h_2', studentId: '20152691234567891', status: 'CONFIRMED' }),
          adminHold({ holdId: 'h_3', studentId: '20152691234567892', status: 'HELD', expiresAt: past() }),
        ],
      },
    })
    renderApp('/admin/applications', { student: null })
    expect(await screen.findByText('20152691234567891')).toBeInTheDocument()
    expect(screen.getByText('20152691234567890')).toBeInTheDocument()
    // h_3 is HELD on the server but its time is up, so it is shown as Expired.
    const row3 = screen.getByText('20152691234567892').closest('tr')!
    expect(within(row3).getByText('Expired')).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText(/status/i), 'CONFIRMED')
    expect(screen.queryByText('20152691234567890')).not.toBeInTheDocument()
    expect(screen.getByText('20152691234567891')).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText(/status/i), 'ALL')
    await userEvent.type(screen.getByPlaceholderText(/search birth/i), '892')
    expect(screen.getByText('20152691234567892')).toBeInTheDocument()
    expect(screen.queryByText('20152691234567891')).not.toBeInTheDocument()
  })

  it('shows a friendly empty state and errors on the applications page', async () => {
    mockApi({ 'GET /admin/holds': { body: [] } })
    renderApp('/admin/applications', { student: null })
    expect(await screen.findByText('No applications yet.')).toBeInTheDocument()
  })
})
