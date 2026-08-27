import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import {
  createCycleGroup,
  getReviewCycle,
  getReviewsSnapshot,
  resetReviewsStoreForTests,
  updateCycleGroup,
} from '@/lib/reviews/store'
import type { CycleGroup, ReviewCycle } from '@/lib/reviews/types'
import { GoalsSettingsEditPage } from './GoalsSettingsEditPage'

afterEach(() => {
  cleanup()
  resetReviewsStoreForTests()
})

const extension = {
  id: 'product-extension',
  endDate: '2026-08-15',
  scope: {
    type: 'department' as const,
    departmentId: 4,
    departmentName: 'Product',
  },
}

function seededGroup(): { cycle: ReviewCycle; group: CycleGroup } {
  resetReviewsStoreForTests()
  const cycle = getReviewsSnapshot().cycles[0]
  if (!cycle) throw new Error('Expected a seeded cycle')
  void createCycleGroup(cycle.id, { name: 'Everyone', memberIds: [1] })
  const hosted = getReviewCycle(cycle.id)
  const group = hosted?.groups?.[0]
  if (!hosted || !group) throw new Error('Expected a seeded group')
  const stagesConfig = structuredClone(group.stagesConfig)
  stagesConfig.goals.employee = {
    startDate: '2026-06-01',
    endDate: '2026-07-01',
  }
  stagesConfig.performance.employeeStart = {
    date: '2026-09-21',
    time: '09:00',
  }
  stagesConfig.goals.extensions = [extension]
  void updateCycleGroup(cycle.id, group.id, { stagesConfig })
  const updated = getReviewCycle(cycle.id)
  if (!updated) throw new Error('Expected the cycle to stay in memory')
  const nextGroup = updated.groups?.find((item) => item.id === group.id)
  if (!nextGroup) throw new Error('Expected the group to stay on the cycle')
  return { cycle: updated, group: nextGroup }
}

describe('GoalsSettingsEditPage', () => {
  it('shows deadline extensions and keeps them when settings are saved', () => {
    const { cycle, group } = seededGroup()
    const onSuccess = vi.fn()
    render(
      <GoalsSettingsEditPage
        cycle={cycle}
        group={group}
        onClose={() => {}}
        onSuccess={onSuccess}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Custom Deadlines' })).toBeInTheDocument()
    expect(screen.getByText('Product')).toBeInTheDocument()
    expect(screen.getByText(/Until 15-Aug-2026/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    const saved = getReviewCycle(cycle.id)?.groups?.find(
      (item) => item.id === group.id,
    )
    expect(saved?.stagesConfig.goals.extensions).toEqual([extension])
    expect(onSuccess).toHaveBeenCalledWith('Settings saved.')
  })

  it('shows recommended goal count without collapsing it', () => {
    const { cycle, group } = seededGroup()
    render(
      <GoalsSettingsEditPage
        cycle={cycle}
        group={group}
        onClose={() => {}}
        onSuccess={() => {}}
      />,
    )

    expect(
      screen.getByRole('heading', { name: /recommended goal count/i }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Suggested range')).not.toBeInTheDocument()
    expect(screen.getAllByLabelText('Min')).toHaveLength(2)
    expect(screen.getAllByLabelText('Max')).toHaveLength(2)
  })

  it('places the after-deadline toggle immediately after the heading', () => {
    const { cycle, group } = seededGroup()
    render(
      <GoalsSettingsEditPage
        cycle={cycle}
        group={group}
        onClose={() => {}}
        onSuccess={() => {}}
        enabled
        onEnabledChange={() => {}}
      />,
    )

    const heading = screen.getByRole('heading', { name: /allow after deadline/i })
    const toggle = screen.getByRole('switch', {
      name: 'Allow submissions after deadline',
    })
    expect(heading.contains(toggle)).toBe(true)
    expect(
      heading.firstChild?.textContent?.trim().startsWith('Allow After Deadline'),
    ).toBe(true)
  })
})
