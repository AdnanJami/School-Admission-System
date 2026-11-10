import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { StudentProvider } from '../state/student'
import { StudentBar } from './StudentBar'

function setup() {
  render(
    <StudentProvider>
      <StudentBar />
    </StudentProvider>,
  )
}

describe('StudentBar', () => {
  it('rejects an id that is not 17 digits', async () => {
    setup()
    await userEvent.type(screen.getByLabelText(/birth registration/i), '12345')
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/exactly 17 digits/i)
    expect(localStorage.getItem('studentId')).toBeNull()
  })

  it('saves a valid id and keeps it after a "reload"', async () => {
    setup()
    await userEvent.type(screen.getByLabelText(/birth registration/i), '20152691234567890')
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(screen.getByTestId('student-id')).toHaveTextContent('20152691234567890')
    expect(localStorage.getItem('studentId')).toBe('20152691234567890')

    // Simulate a page reload: a fresh provider reads from localStorage.
    document.body.innerHTML = ''
    setup()
    expect(screen.getByTestId('student-id')).toHaveTextContent('20152691234567890')
  })
})
