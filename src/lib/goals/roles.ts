import type { GoalRole } from './types'

export function formatGoalRole(role: GoalRole): string {
  switch (role) {
    case 'seniormanager':
      return 'Senior manager'
    case 'hrbp':
      return 'HRBP'
    case 'ptr':
      return 'PTR'
    case 'manager':
      return 'Manager'
    case 'employee':
      return 'Employee'
  }
}
