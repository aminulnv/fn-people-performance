import { datePart } from '@/lib/dates/timestamp'
import type { ReviewCycle, ReviewCycleStatus } from './types'

function toDay(iso: string): number {
  const [y, m, d] = datePart(iso).split('-').map(Number)
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1)
}

export function resolveCycleStatus(
  cycle: Pick<ReviewCycle, 'startDate' | 'endDate'>,
  today = new Date(),
): ReviewCycleStatus {
  const now = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  )
  const start = toDay(cycle.startDate)
  const end = toDay(cycle.endDate)

  if (now < start) return 'future'
  if (now > end) return 'previous'
  return 'current'
}

export function cycleStatusLabel(status: ReviewCycleStatus): string {
  switch (status) {
    case 'future':
      return 'Future'
    case 'current':
      return 'Current'
    case 'previous':
      return 'Previous'
  }
}
