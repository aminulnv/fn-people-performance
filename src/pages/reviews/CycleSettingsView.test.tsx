import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { buildDefaultStagesConfig } from '@/lib/reviews/demoData'
import {
  createReviewCycle,
  resetReviewsStoreForTests,
} from '@/lib/reviews/store'
import * as reviewsStore from '@/lib/reviews/store'
import type { ReviewCycle } from '@/lib/reviews/types'
import { CycleSettingsView } from './CycleSettingsView'

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
  resetReviewsStoreForTests()
  vi.restoreAllMocks()
})

function sampleCycle(): ReviewCycle {
  const startDate = '2026-07-01'
  const endDate = '2026-09-30'
  const stagesConfig = buildDefaultStagesConfig(startDate, endDate)
  const settings = {
    reviewTypes: {
      line_manager: true,
      self: false,
      upwards: false,
      peer: false,
      functional_manager: false,
    },
    goalCountPolicy: {
      minimumRequired: 3,
      recommendedMinimum: 4,
      recommendedMaximum: 6,
      maximumAllowed: null,
    },
    postWindowGoalPolicy: 'hard_stop' as const,
    excludedEmployeeIds: [],
    autoScorecardGeneration: true,
  }
  const calibration = {
    calibrationMode: 'department' as const,
    gradeRecommendation: 'manager_average' as const,
    gradeDistribution: {
      exceptional: 5,
      exceeding: 15,
      performing: 60,
      developing: 15,
      unsatisfactory: 5,
    },
  }
  return {
    id: 'cycle-1',
    name: 'Q3 2026',
    type: 'regular',
    startDate,
    endDate,
    stagesConfig,
    settings,
    calibration,
    groups: [
      {
        id: 'group-1',
        cycleId: 'cycle-1',
        name: 'Everyone',
        memberIds: [1],
        settings,
        stagesConfig,
        calibration,
        createdAt: '2026-01-01T00:00:00.000Z',
        version: 1,
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

function renderSettings(cycle = sampleCycle()) {
  return render(
    <MemoryRouter>
      <CycleSettingsView cycle={cycle} />
    </MemoryRouter>,
  )
}

describe('CycleSettingsView', () => {
  it('opens cycle details in a right panel and keeps the overview visible', () => {
    renderSettings()

    fireEvent.click(
      within(screen.getByRole('region', { name: 'About this cycle' })).getByRole(
        'button',
        { name: 'Edit' },
      ),
    )

    expect(screen.getByRole('dialog', { name: 'Cycle details' })).toBeInTheDocument()
    expect(screen.getByLabelText('Cycle name')).toBeInTheDocument()
    expect(screen.queryByText('This cycle includes')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'People in this cycle' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Everyone' })).toBeInTheDocument()
  })

  it('opens group settings on People with a top nav', () => {
    renderSettings()

    fireEvent.click(screen.getByRole('button', { name: 'Everyone' }))

    expect(screen.getByRole('dialog', { name: 'Everyone' })).toBeInTheDocument()
    expect(screen.getByLabelText('Group name')).toHaveValue('Everyone')
    expect(screen.getByRole('navigation', { name: 'Group settings' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'People' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Reviews' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('link', { name: 'Full view' })).toHaveAttribute(
      'href',
      '/cycles/cycle-1/groups/group-1',
    )
    expect(screen.getByRole('heading', { name: 'People in this cycle' })).toBeInTheDocument()
  })

  it('opens the review form on the left of group review settings', () => {
    renderSettings()
    fireEvent.click(screen.getByRole('button', { name: 'Everyone' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reviews' }))

    expect(screen.queryByLabelText('Preset')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Review form' }))

    expect(screen.getByLabelText('Preset')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Review form' })).toBeInTheDocument()
  })

  it('opens the group hub when adding a group', async () => {
    const cycle = sampleCycle()
    const created = {
      ...cycle.groups![0],
      id: 'group-2',
      name: 'New group',
      memberIds: [],
    }
    vi.spyOn(reviewsStore, 'createCycleGroup').mockResolvedValue(created)

    renderSettings(cycle)
    fireEvent.click(screen.getByRole('button', { name: 'Add group' }))

    await waitFor(() => {
      expect(reviewsStore.createCycleGroup).toHaveBeenCalledWith(cycle.id, {
        name: 'New group',
      })
    })
    expect(screen.getByRole('dialog', { name: 'New group' })).toBeInTheDocument()
    expect(screen.getByLabelText('Group name')).toHaveValue('New group')
    expect(screen.getByRole('button', { name: 'People' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(
      screen.getByRole('searchbox', { name: 'Add people to this group' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'People in this cycle' })).toBeInTheDocument()
  })

  it('renders a newly created annual cycle as a short identity, not a calendar', async () => {
    resetReviewsStoreForTests()
    const cycle = await createReviewCycle({
      type: 'regular',
      purpose: 'annual_appraisal',
      periodKey: 'annual-2028',
    })

    renderSettings(cycle)

    expect(screen.getByText('Annual appraisal')).toBeInTheDocument()
    expect(
      screen.getByText('Year-end packet from the cycles you pick.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'January 2029' })).not.toBeInTheDocument()
    expect(screen.getByText('No one is in this cycle yet')).toBeInTheDocument()
  })

  it('puts cycle-wide release on the cycle, not the people list', () => {
    renderSettings()

    expect(
      screen.getByRole('heading', { name: 'Publish results' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Release to managers' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Release to employees' }),
    ).toBeInTheDocument()
  })
})
