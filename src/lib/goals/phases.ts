import type { DemoPhase } from './types'

export const DEMO_PHASES: { id: DemoPhase; label: string; hint: string }[] = [
  {
    id: 'window_open',
    label: 'Window open',
    hint: 'Day 1–30 · draft and submit',
  },
  {
    id: 'hard_lock',
    label: 'Hard lock',
    hint: 'No new submits · pending can still approve',
  },
  {
    id: 'check_in',
    label: 'Check-in',
    hint: 'Manager rates · person sees score',
  },
]
