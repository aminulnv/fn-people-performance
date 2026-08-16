import { apiFetch } from '@/lib/apiClient'
import {
  ACCESS_PROFILES,
  type AccessControlSnapshot,
  type AccessProfileKey,
  type EmployeeAccessAssignment,
} from './types'

const LOCAL_ASSIGNMENTS_KEY = 'pd-access-assignments'

function useLocalAccess(): boolean {
  return (
    import.meta.env.MODE === 'test' ||
    import.meta.env.VITE_AUTH_MODE === 'local' ||
    import.meta.env.VITE_EMPLOYEES_BACKEND === 'local'
  )
}

function readLocalAssignments(): EmployeeAccessAssignment[] {
  try {
    const raw = localStorage.getItem(LOCAL_ASSIGNMENTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as EmployeeAccessAssignment[]) : []
  } catch {
    return []
  }
}

function writeLocalAssignments(assignments: EmployeeAccessAssignment[]): void {
  localStorage.setItem(LOCAL_ASSIGNMENTS_KEY, JSON.stringify(assignments))
}

export async function fetchAccessControl(): Promise<AccessControlSnapshot> {
  if (useLocalAccess()) {
    return {
      profiles: ACCESS_PROFILES,
      assignments: readLocalAssignments(),
    }
  }
  return apiFetch<AccessControlSnapshot>('/api/platform/access-control')
}

export async function assignEmployeeAccess(
  employeeId: number,
  profileKey: AccessProfileKey | null,
): Promise<EmployeeAccessAssignment | null> {
  if (useLocalAccess()) {
    const remaining = readLocalAssignments().filter(
      (assignment) => assignment.employeeId !== employeeId,
    )
    if (!profileKey) {
      writeLocalAssignments(remaining)
      return null
    }
    const assignment: EmployeeAccessAssignment = {
      employeeId,
      profileKey,
      assignedAt: new Date().toISOString(),
    }
    writeLocalAssignments([...remaining, assignment])
    return assignment
  }

  const result = await apiFetch<{
    assignment: EmployeeAccessAssignment | null
  }>(`/api/platform/access-control/employees/${employeeId}`, {
    method: 'PUT',
    body: { profileKey },
  })
  return result.assignment
}
