import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { buildDefaultStagesConfig } from '@/lib/reviews/demoData'
import * as reviewsStore from '@/lib/reviews/store'
import { resetReviewsStoreForTests } from '@/lib/reviews/store'
import type { ReviewCycle } from '@/lib/reviews/types'
import { CycleDetailsEditPage } from './CycleDetailsEditPage'

afterEach(() => {
  cleanup()
  resetReviewsStoreForTests()
  vi.restoreAllMocks()
})

function annualCycle(): ReviewCycle {
  return {
    ...sampleCycle(),
    id: 'annual-2026',
    name: 'Annual 2026',
    periodKey: 'annual-2026',
    startDate: '2027-01-01',
    endDate: '2027-02-15',
    yearKey: '2026',
  }
}

function sampleCycle(): ReviewCycle {
  return {
    id: 'cycle-1',
    name: 'Q3 2026',
    type: 'regular',
    startDate: '2026-07-01',
    endDate: '2026-09-30',
    yearKey: '2026',
    stagesConfig: buildDefaultStagesConfig('2026-07-01', '2026-09-30'),
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
  }
}

describe('CycleDetailsEditPage', () => {
  it('does not save when the end is before the start', () => {
    const update = vi
      .spyOn(reviewsStore, 'updateReviewCycle')
      .mockResolvedValue(sampleCycle())

    render(<CycleDetailsEditPage cycle={sampleCycle()} onClose={() => {}} />)

    fireEvent.change(screen.getByLabelText('Starts'), {
      target: { value: '2026-08-01T09:00' },
    })
    fireEvent.change(screen.getByLabelText('Ends'), {
      target: { value: '2026-07-01T09:00' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(update).not.toHaveBeenCalled()
    expect(
      screen.getByText('Cycle must end on or after its start date.'),
    ).toBeInTheDocument()
  })

  it('blocks end dates before the start date in the picker', () => {
    render(<CycleDetailsEditPage cycle={sampleCycle()} onClose={() => {}} />)

    fireEvent.click(screen.getByLabelText('Ends'))
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(screen.getByText('June 2026')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '15' })).toBeDisabled()
  })

  it('hides performance year on a quarterly cycle', () => {
    render(<CycleDetailsEditPage cycle={sampleCycle()} onClose={() => {}} />)

    expect(
      screen.queryByRole('button', { name: 'Performance year' }),
    ).not.toBeInTheDocument()
  })

  it('lets people pick the performance year on an annual cycle', () => {
    render(<CycleDetailsEditPage cycle={annualCycle()} onClose={() => {}} />)

    const yearField = screen.getByRole('button', { name: 'Performance year' })
    expect(yearField).toHaveTextContent('2026')
    fireEvent.click(yearField)
    fireEvent.click(screen.getByRole('option', { name: '2027' }))
    expect(yearField).toHaveTextContent('2027')
  })

  it('notifies the parent after a successful save', () => {
    const onSuccess = vi.fn()
    vi.spyOn(reviewsStore, 'updateReviewCycle').mockResolvedValue(sampleCycle())

    render(
      <CycleDetailsEditPage
        cycle={sampleCycle()}
        onClose={() => {}}
        onSuccess={onSuccess}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSuccess).toHaveBeenCalledWith('Settings saved.')
  })
})
