import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { formatLocalTimestamp } from '@/lib/dates/timezone'
import { buildDefaultStagesConfig } from '@/lib/reviews/demoData'
import {
  createReviewCycle,
  getReviewCycle,
  resetReviewsStoreForTests,
} from '@/lib/reviews/store'
import * as reviewsStore from '@/lib/reviews/store'
import type { ReviewCycle } from '@/lib/reviews/types'
import { CycleSettingsView } from './CycleSettingsView'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
  }
})

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
    yearKey: '2026',
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
      within(screen.getByRole('region', { name: 'Cycle Details' })).getByRole(
        'button',
        { name: 'Edit' },
      ),
    )

    expect(screen.getByRole('dialog', { name: 'Cycle Details' })).toBeInTheDocument()
    expect(screen.getByLabelText('Cycle name')).toBeInTheDocument()
    expect(screen.queryByText('This Cycle Includes')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'People In This Cycle' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Everyone' })).toBeInTheDocument()
  })

  it('does not repeat the cycle name inside Cycle Details', () => {
    renderSettings()

    expect(
      within(screen.getByRole('region', { name: 'Cycle Details' })).queryByText(
        'Q3 2026',
      ),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Cycle Details' })).toBeInTheDocument()
    const details = within(screen.getByRole('region', { name: 'Cycle Details' }))
    expect(details.getByText('Starts')).toBeInTheDocument()
    expect(details.getByText('Ends')).toBeInTheDocument()
    expect(details.getByText(formatLocalTimestamp('2026-07-01'))).toBeInTheDocument()
    expect(details.getByText(formatLocalTimestamp('2026-09-30'))).toBeInTheDocument()
    expect(details.queryByText('Dates')).not.toBeInTheDocument()
    expect(details.queryByText('Year')).not.toBeInTheDocument()
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
    expect(screen.queryByRole('link', { name: 'Full View' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'People In This Cycle' })).toBeInTheDocument()
  })

  it('opens the review form on the left of group review settings', () => {
    renderSettings()
    fireEvent.click(screen.getByRole('button', { name: 'Everyone' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reviews' }))

    expect(screen.queryByLabelText('Preset')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Review Form' }))

    expect(screen.getByLabelText('Preset')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Review Form' })).toBeInTheDocument()
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
    fireEvent.click(screen.getByRole('button', { name: 'Add Group' }))

    await waitFor(() => {
      expect(reviewsStore.createCycleGroup).toHaveBeenCalledWith(cycle.id, {
        name: 'New group',
      })
    })
    expect(screen.getByRole('dialog', { name: 'New group' })).toBeInTheDocument()
    expect(screen.getByLabelText('Group name')).toHaveValue('New group')
    expect(screen.getByText('0 people')).toBeInTheDocument()
    expect(screen.queryByText('Needs people')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'People' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(
      screen.getByRole('searchbox', { name: 'Search people in this group' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'People In This Cycle' })).toBeInTheDocument()
  })

  it('renders a newly created annual cycle as a short identity, not a calendar', async () => {
    resetReviewsStoreForTests()
    const cycle = await createReviewCycle({
      type: 'regular',
      periodKey: 'annual-2028',
    })

    renderSettings(cycle)

    const identity = screen.getByRole('region', { name: 'Cycle Details' })
    expect(identity).toBeInTheDocument()
    expect(within(identity).queryByText('Annual 2028')).not.toBeInTheDocument()
    expect(within(identity).getByText('Year')).toBeInTheDocument()
    expect(within(identity).getByText('2028')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'January 2029' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create New Group' })).toBeInTheDocument()
  })

  it('adds an empty New group so the cycle uses group cards, not an empty-state message', async () => {
    const cycle = await createReviewCycle({
      type: 'custom',
      name: 'Empty cycle',
      startDate: '2026-08-27',
      endDate: '2026-08-27',
    })
    expect(cycle.groups ?? []).toEqual([])

    renderSettings(cycle)

    expect(screen.queryByText('No one is in this cycle yet')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create New Group' })).toBeInTheDocument()
    await waitFor(() => {
      expect(getReviewCycle(cycle.id)?.groups).toHaveLength(1)
    })
    expect(getReviewCycle(cycle.id)?.groups?.[0]?.name).toBe('New group')
    expect(getReviewCycle(cycle.id)?.groups?.[0]?.memberIds).toEqual([])
  })

  it('shows a success toast after deleting a group', async () => {
    vi.spyOn(reviewsStore, 'deleteCycleGroup').mockResolvedValue(undefined)

    renderSettings()
    fireEvent.click(screen.getByRole('button', { name: 'Delete Everyone' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete Group' }))

    const notice = await screen.findByRole('status')
    expect(notice).toHaveTextContent('Success!')
    expect(notice).toHaveTextContent('Group deleted.')
    expect(reviewsStore.deleteCycleGroup).toHaveBeenCalledWith(
      'cycle-1',
      'group-1',
    )
  })

  it('shows a success toast after saving cycle details', async () => {
    vi.spyOn(reviewsStore, 'updateReviewCycle').mockResolvedValue(sampleCycle())

    renderSettings()
    fireEvent.click(
      within(screen.getByRole('region', { name: 'Cycle Details' })).getByRole(
        'button',
        { name: 'Edit' },
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    const notice = await screen.findByRole('status')
    expect(notice).toHaveTextContent('Success!')
    expect(notice).toHaveTextContent('Settings saved.')
    expect(notice).toHaveClass('pd-review-packet__banner--overlay')
    expect(notice.closest('.pd-review-packet__banners')?.parentElement).toBe(
      document.body,
    )
  })

  it('keeps publish results on the group, not the cycle page', () => {
    renderSettings()

    expect(
      screen.queryByRole('heading', { name: 'Publish results' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Publish to Managers First Now' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Publish to Everyone Now' }),
    ).not.toBeInTheDocument()
  })
})
