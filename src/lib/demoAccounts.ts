import type { GoalRole } from '@/lib/goals/types'

export type DemoAccount = {
  email: string
  personId: string
  name: string
  title: string
  role: GoalRole
  /** Short label shown on the login picker */
  roleLabel: string
  avatarHue: number
}

/** Selectable login identities for local / demo environments. */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: 'employee@demo.com',
    personId: 'employee',
    name: 'Ethan Walker',
    title: 'Product Designer',
    role: 'employee',
    roleLabel: 'Employee',
    avatarHue: 200,
  },
  {
    email: 'manager@demo.com',
    personId: 'manager',
    name: 'Rachel Brooks',
    title: 'Engineering Manager',
    role: 'manager',
    roleLabel: 'Manager',
    avatarHue: 265,
  },
  {
    email: 'seniormanager@demo.com',
    personId: 'seniormanager',
    name: 'Daniel Croft',
    title: 'Director of Engineering',
    role: 'seniormanager',
    roleLabel: 'Senior manager',
    avatarHue: 220,
  },
  {
    email: 'ptr@demo.com',
    personId: 'ptr',
    name: 'Hannah Price',
    title: 'PTR Lead',
    role: 'ptr',
    roleLabel: 'PTR',
    avatarHue: 280,
  },
  {
    email: 'hrbp@demo.com',
    personId: 'hrbp',
    name: 'Amelia Shaw',
    title: 'HR Business Partner',
    role: 'hrbp',
    roleLabel: 'HRBP',
    avatarHue: 310,
  },
]

export function findDemoAccount(email: string): DemoAccount | null {
  const normalized = email.trim().toLowerCase()
  return DEMO_ACCOUNTS.find((a) => a.email === normalized) ?? null
}

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
