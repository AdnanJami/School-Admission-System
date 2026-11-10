import { useState, type FormEvent } from 'react'
import { isValidStudentId, useStudent } from '../state/student'

export function StudentBar() {
  const { studentId, setStudentId, clearStudentId } = useStudent()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    const v = value.trim()
    if (!isValidStudentId(v)) {
      setError('The birth registration number must be exactly 17 digits (numbers only).')
      return
    }
    setError(null)
    setStudentId(v)
    setValue('')
  }

  if (studentId) {
    return (
      <div className="student-bar">
        <span>
          Student birth registration no.: <strong data-testid="student-id">{studentId}</strong>
        </span>
        <button type="button" className="btn btn-small" onClick={clearStudentId}>
          Change
        </button>
      </div>
    )
  }

  return (
    <form className="student-bar" onSubmit={submit} noValidate>
      <label htmlFor="student-id-input">Student birth registration no.</label>
      <input
        id="student-id-input"
        inputMode="numeric"
        autoComplete="off"
        placeholder="17-digit number"
        maxLength={17}
        value={value}
        onChange={(e) => {
          setValue(e.target.value.replace(/\D/g, ''))
          setError(null)
        }}
        aria-invalid={!!error}
      />
      <button type="submit" className="btn btn-primary btn-small">
        Continue
      </button>
      {error && (
        <div className="field-error" role="alert">
          {error}
        </div>
      )}
    </form>
  )
}
