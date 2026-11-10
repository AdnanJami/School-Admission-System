import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { CreatedHold, Hold, MyHold, SchoolClass } from './types'
import { useStudent } from '../state/student'

export function useClasses() {
  return useQuery({
    queryKey: ['classes'],
    queryFn: () => api<SchoolClass[]>('/classes'),
    refetchInterval: 3000,
    placeholderData: keepPreviousData,
  })
}

export function useMyHolds() {
  const { studentId } = useStudent()
  return useQuery({
    queryKey: ['myHolds', studentId],
    queryFn: () => api<MyHold[]>('/me/holds', { studentId }),
    enabled: !!studentId,
    refetchInterval: 5000,
  })
}

export function useHold(holdId: string | undefined) {
  return useQuery({
    queryKey: ['hold', holdId],
    queryFn: () => api<Hold>(`/holds/${holdId}`),
    enabled: !!holdId,
    // Keep polling while the application is still active; stop once it is final.
    refetchInterval: (q) => (q.state.data && q.state.data.status !== 'HELD' ? false : 2000),
  })
}

function useRefreshAll() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: ['classes'] })
    void qc.invalidateQueries({ queryKey: ['myHolds'] })
    void qc.invalidateQueries({ queryKey: ['hold'] })
  }
}

export function useCreateClass() {
  const refresh = useRefreshAll()
  return useMutation({
    mutationFn: (v: { name: string; totalSeats: number }) =>
      api<{ id: string; name: string; totalSeats: number }>('/classes', { method: 'POST', body: v }),
    onSuccess: refresh,
  })
}

export function useApply() {
  const { studentId } = useStudent()
  const refresh = useRefreshAll()
  return useMutation({
    mutationFn: (classId: string) =>
      api<CreatedHold>(`/classes/${classId}/holds`, { method: 'POST', studentId }),
    onSettled: refresh, // also on failure: the class may be full now
  })
}

export function useConfirm() {
  const { studentId } = useStudent()
  const refresh = useRefreshAll()
  return useMutation({
    mutationFn: (holdId: string) =>
      api<{ holdId: string; status: string }>(`/holds/${holdId}/confirm`, {
        method: 'POST',
        studentId,
      }),
    onSettled: refresh,
  })
}

export function useCancel() {
  const { studentId } = useStudent()
  const refresh = useRefreshAll()
  return useMutation({
    mutationFn: (holdId: string) => api<void>(`/holds/${holdId}`, { method: 'DELETE', studentId }),
    onSettled: refresh,
  })
}
