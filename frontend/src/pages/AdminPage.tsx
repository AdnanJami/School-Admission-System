import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useCreateClass } from '../api/hooks'
import { ErrorBanner, SuccessBanner, errorMessage } from '../components/ErrorBanner'

export function AdminPage() {
  const create = useCreateClass()
  const [name, setName] = useState('')
  const [seats, setSeats] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    setSuccess(null)
    const trimmed = name.trim()
    const n = Number(seats)
    if (!trimmed) return setFormError('Please enter a class name.')
    if (trimmed.length > 200) return setFormError('The class name can be at most 200 characters.')
    if (!/^\d+$/.test(seats) || !Number.isSafeInteger(n) || n < 1 || n > 2_000_000_000)
      return setFormError('Total seats must be a whole number of at least 1.')
    setFormError(null)
    create.mutate(
      { name: trimmed, totalSeats: n },
      {
        onSuccess: (c) => {
          setSuccess(`Created "${c.name}" with ${c.totalSeats} seats.`)
          setName('')
          setSeats('')
        },
      },
    )
  }

  return (
    <section>
      <h2>Create Class (School Admin)</h2>
      <p className="muted">
        Each shift is its own class, for example &ldquo;Class 6 - Morning Shift&rdquo; and &ldquo;Class 6 - Day
        Shift&rdquo;.
      </p>
      <form className="card form" onSubmit={submit} noValidate>
        <label htmlFor="class-name">Class name</label>
        <input
          id="class-name"
          value={name}
          maxLength={200}
          placeholder="Class 6 - Morning Shift"
          onChange={(e) => setName(e.target.value)}
        />
        <label htmlFor="class-seats">Total seats</label>
        <input
          id="class-seats"
          inputMode="numeric"
          value={seats}
          placeholder="120"
          onChange={(e) => setSeats(e.target.value)}
        />
        <ErrorBanner message={formError ?? (create.isError ? errorMessage(create.error) : null)} />
        <SuccessBanner message={success} />
        <div>
          <button type="submit" className="btn btn-primary" disabled={create.isPending}>
            {create.isPending ? 'Creating…' : 'Create class'}
          </button>{' '}
          <Link to="/" className="btn">
            Go to class list
          </Link>
        </div>
      </form>
    </section>
  )
}
