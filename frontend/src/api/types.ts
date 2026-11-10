export type HoldStatus = 'HELD' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED'

export interface SchoolClass {
  id: string
  name: string
  totalSeats: number
  heldSeats: number
  confirmedSeats: number
  availableSeats: number
}

export interface Hold {
  holdId: string
  classId: string
  status: HoldStatus
  expiresAt: string
}

export interface MyHold extends Hold {
  className: string
}

export interface CreatedHold extends Hold {
  studentId: string
}
