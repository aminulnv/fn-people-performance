import type { DemoPhase } from './types'

export const DEMO_PHASES: { id: DemoPhase; label: string; hint: string }[] = [
  {
    id: 'not_open',
    label: 'Not open',
    hint: 'Goal setting has not started',
  },
  {
    id: 'window_open',
    label: 'Window open',
    hint: 'Create, edit, and submit goals',
  },
  {
    id: 'hard_lock',
    label: 'Hard lock',
    hint: 'No new submits · pending can still approve',
  },
  {
    id: 'check_in',
    label: 'Performance review',
    hint: 'Manager rates · person sees score',
  },
  {
    id: 'closed',
    label: 'Closed',
    hint: 'The cycle is complete',
  },
]
