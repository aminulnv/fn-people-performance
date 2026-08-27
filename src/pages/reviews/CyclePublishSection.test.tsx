import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { setTimeZoneForTests, toUtcIso } from '@/lib/dates/timezone'
import { buildDefaultStagesConfig } from '@/lib/reviews/demoData'
import * as packetsApi from '@/lib/reviews/packetsApi'
import type { ReviewCycle } from '@/lib/reviews/types'
import { CyclePublishSection } from './CyclePublishSection'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
  }
})

beforeEach(() => {
  setTimeZoneForTests('UTC')
})

afterEach(() => {
  cleanup()
  setTimeZoneForTests(null)
  vi.restoreAllMocks()
})

function sampleCycle(overrides: Partial<ReviewCycle> = {}): ReviewCycle {
  const startDate = '2026-07-01'
  const endDate = '2026-09-30'
  const stagesConfig = buildDefaultStagesConfig(startDate, endDate)
  return {
    id: 'cycle-1',
    name: 'Q3 2026',
    type: 'regular',
    startDate,
    endDate,
    stagesConfig,
    settings: {
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
      postWindowGoalPolicy: 'hard_stop',
      excludedEmployeeIds: [],
      autoScorecardGeneration: true,
    },
    calibration: {
      calibrationMode: 'department',
      gradeRecommendation: 'manager_average',
      gradeDistribution: {
        exceptional: 5,
        exceeding: 15,
        performing: 60,
        developing: 15,
        unsatisfactory: 5,
      },
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function goalsOnlyCycle(): ReviewCycle {
  const stagesConfig = buildDefaultStagesConfig(
    '2026-10-01',
    '2026-12-31',
    'quarterly_checkin',
    'q4-2026',
  )
  return sampleCycle({
    id: 'q4-2026',
    name: 'Q4 2026',
    startDate: '2026-10-01',
    endDate: '2026-12-31',
    stagesConfig,
  })
}

describe('CyclePublishSection', () => {
  it('asks before releasing the cycle to managers', async () => {
    const release = vi
      .spyOn(packetsApi, 'releaseReviewCycle')
      .mockResolvedValue([])

    const cycle = sampleCycle()
    render(<CyclePublishSection cycle={cycle} />)

    expect(screen.getByRole('heading', { name: 'Managers' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Employees' })).toBeInTheDocument()
    expect(screen.getByLabelText('Managers visible from')).toHaveValue(
      toUtcIso(cycle.stagesConfig.publish.toManager),
    )
    expect(screen.getByLabelText('Employees visible from')).toHaveValue(
      toUtcIso(cycle.stagesConfig.publish.toAll),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Release to managers now' }))
    expect(release).not.toHaveBeenCalled()

    const dialog = screen.getByRole('dialog', { name: 'Release to managers now?' })
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Release now' }),
    )

    await waitFor(() => {
      expect(release).toHaveBeenCalledWith('cycle-1', 'managers')
    })
    const notice = await screen.findByRole('status')
    expect(notice).toHaveTextContent('Success!')
    expect(notice).toHaveTextContent('Released to managers.')
  })

  it('releases the cycle to employees after confirm', async () => {
    const release = vi
      .spyOn(packetsApi, 'releaseReviewCycle')
      .mockResolvedValue([])

    render(<CyclePublishSection cycle={sampleCycle()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Release to employees now' }))
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Release to employees now?' })).getByRole(
        'button',
        { name: 'Release now' },
      ),
    )

    await waitFor(() => {
      expect(release).toHaveBeenCalledWith('cycle-1', 'employees')
    })
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Released to employees.',
    )
  })

  it('shows the API error when release fails', async () => {
    vi.spyOn(packetsApi, 'releaseReviewCycle').mockRejectedValue(
      new Error('Cycle is still in calibration.'),
    )

    render(<CyclePublishSection cycle={sampleCycle()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Release to employees now' }))
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Release to employees now?' })).getByRole(
        'button',
        { name: 'Release now' },
      ),
    )

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('Cycle is still in calibration.')
  })

  it('lets the user change the cycle publish day', () => {
    render(<CyclePublishSection cycle={sampleCycle()} />)

    fireEvent.change(screen.getByLabelText('Managers visible from'), {
      target: { value: '2026-10-15T09:00' },
    })

    expect(screen.getByLabelText('Managers visible from')).toHaveValue(
      '2026-10-15T09:00:00.000Z',
    )
  })

  it('hides on a goals-only cycle', () => {
    render(<CyclePublishSection cycle={goalsOnlyCycle()} />)
    expect(
      screen.queryByRole('heading', { name: 'Publish results' }),
    ).not.toBeInTheDocument()
  })
})
