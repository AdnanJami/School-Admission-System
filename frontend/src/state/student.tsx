import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'studentId'
const PATTERN = /^\d{17}$/

export function isValidStudentId(value: string): boolean {
  return PATTERN.test(value)
}

function load(): string | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v && isValidStudentId(v) ? v : null
  } catch {
    return null
  }
}

interface StudentContextValue {
  studentId: string | null
  setStudentId: (id: string) => void
  clearStudentId: () => void
}

const StudentContext = createContext<StudentContextValue | null>(null)

export function StudentProvider({ children }: { children: ReactNode }) {
  const [studentId, setId] = useState<string | null>(load)

  const setStudentId = useCallback((id: string) => {
    setId(id)
    try {
      localStorage.setItem(STORAGE_KEY, id)
    } catch {
      /* storage unavailable: keep it in memory only */
    }
  }, [])

  const clearStudentId = useCallback(() => {
    setId(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo(
    () => ({ studentId, setStudentId, clearStudentId }),
    [studentId, setStudentId, clearStudentId],
  )
  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStudent(): StudentContextValue {
  const ctx = useContext(StudentContext)
  if (!ctx) throw new Error('useStudent must be used inside StudentProvider')
  return ctx
}
