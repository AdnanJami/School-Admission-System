const PATTERN = /^\d{17}$/

export function isValidStudentId(value: string): boolean {
  return PATTERN.test(value)
}
