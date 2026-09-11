import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

function openAdvanced() {
  const toggle = screen.getByRole('button', { name: /advanced/i })
  if (toggle.getAttribute('aria-expanded') !== 'true') {
    fireEvent.click(toggle)
  }
}

describe('GoalsSettingsEditPage', () => {
  it('keeps primary settings visible and hides advanced by default when clean', () => {
    const { cycle, group } = seededGroup()
    group.stagesConfig.goals.extensions = []
    render(
      <GoalsSettingsEditPage
        cycle={cycle}
        group={group}
        onClose={() => {}}
        onSuccess={() => {}}
      />,
    )

    expect(screen.getByText('Window')).toBeInTheDocument()
    expect(screen.getByText('Required Count')).toBeInTheDocument()
    expect(screen.getByLabelText('Opens')).toBeInTheDocument()
    expect(screen.getAllByLabelText('Min')).toHaveLength(1)
    expect(screen.queryByText('Custom Deadlines')).not.toBeInTheDocument()

    const toggle = screen.getByRole('button', { name: /advanced/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveTextContent(/Late OK/)
  })

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

    expect(screen.getByRole('button', { name: /advanced/i })).toHaveAttribute(
      'aria-expanded',
      'true',
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

  it('shows recommended goal count in advanced without collapsing it', () => {
    const { cycle, group } = seededGroup()
    render(
      <GoalsSettingsEditPage
        cycle={cycle}
        group={group}
        onClose={() => {}}
        onSuccess={() => {}}
      />,
    )

    openAdvanced()
    expect(screen.getByRole('heading', { name: 'Recommended' })).toBeInTheDocument()
    expect(screen.getByText('Required Count')).toBeInTheDocument()
    expect(screen.queryByText('Suggested range')).not.toBeInTheDocument()
    expect(screen.getAllByLabelText('Min')).toHaveLength(2)
    expect(screen.getAllByLabelText('Max')).toHaveLength(2)
  })

  it('keeps the after-deadline toggle next to its label', () => {
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

    openAdvanced()
    expect(screen.getByText('Allow After Deadline')).toBeInTheDocument()
    const toggle = screen.getByRole('switch', {
      name: 'Allow submissions after deadline',
    })
    expect(toggle).toBeChecked()
    expect(
      screen.getByText('Late edits need manager and skip-level approval.'),
    ).toBeInTheDocument()
  })

  it('saves the progress update window for the group', async () => {
    const { cycle, group } = seededGroup()
    render(
      <GoalsSettingsEditPage
        cycle={cycle}
        group={group}
        onClose={() => {}}
        onSuccess={() => {}}
      />,
    )

    openAdvanced()
    expect(
      screen.getByRole('heading', { name: 'Progress Updates' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Days after deadline')).toHaveValue('30')
    expect(
      screen.getByRole('button', { name: 'Increase Days after deadline' }),
    ).toBeDisabled()

    fireEvent.click(
      screen.getByRole('button', { name: 'Decrease Days after deadline' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      const saved = getReviewCycle(cycle.id)?.groups?.find(
        (item) => item.id === group.id,
      )
      expect(saved?.settings.goalCountPolicy.lateProgressUpdateDays).toBe(29)
    })
  })
})
