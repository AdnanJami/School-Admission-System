import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { mockApi, renderApp } from '../test/utils'

describe('AdminPage', () => {
  it('validates input before calling the API', async () => {
    const fetchMock = mockApi({})
    renderApp('/admin')
    await userEvent.type(screen.getByLabelText('Class name'), 'Class 6')
    await userEvent.type(screen.getByLabelText('Total seats'), '0')
    await userEvent.click(screen.getByRole('button', { name: /create class/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/whole number of at least 1/i)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('creates a class and reports a duplicate name clearly', async () => {
    let calls = 0
    mockApi({
      'POST /classes': () => {
        calls++
        return calls === 1
          ? { status: 201, body: { id: 'c_1', name: 'Class 6', totalSeats: 5 } }
          : { status: 409, body: { error: 'A class with this name already exists.' } }
      },
      'GET /classes': { body: [] },
    })
    renderApp('/admin')
    const submit = async () => {
      await userEvent.clear(screen.getByLabelText('Class name'))
      await userEvent.type(screen.getByLabelText('Class name'), 'Class 6')
      await userEvent.type(screen.getByLabelText('Total seats'), '5')
      await userEvent.click(screen.getByRole('button', { name: /create class/i }))
    }
    await submit()
    expect(await screen.findByRole('status')).toHaveTextContent('Created "Class 6" with 5 seats.')
    await submit()
    expect(await screen.findByRole('alert')).toHaveTextContent('already exists')
  })
})
