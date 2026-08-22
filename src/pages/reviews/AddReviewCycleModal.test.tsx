import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { annualPeriodKey, periodKey } from '@/lib/reviews/periods'
import * as reviewsStore from '@/lib/reviews/store'
import { AddReviewCycleModal } from './AddReviewCycleModal'

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
  vi.restoreAllMocks()
})

describe('AddReviewCycleModal', () => {
  it('keeps Annual selected after many renders instead of resetting', () => {
    const { rerender } = render(
      <AddReviewCycleModal
        open
        onClose={() => {}}
        onCreated={() => {}}
        existingPeriodKeys={new Set()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Annual' }))
    expect(screen.getByRole('button', { name: 'Annual' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('dialog', { name: 'Add cycle' })).toBeInTheDocument()
    expect(screen.getByLabelText('Year')).toHaveValue(
      annualPeriodKey(new Date().getFullYear()),
    )

    rerender(
      <AddReviewCycleModal
        open
        onClose={() => {}}
        onCreated={() => {}}
        existingPeriodKeys={new Set()}
      />,
    )
    rerender(
      <AddReviewCycleModal
        open
        onClose={() => {}}
        onCreated={() => {}}
        existingPeriodKeys={new Set(['q3-2026'])}
      />,
    )

    expect(screen.getByRole('button', { name: 'Annual' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByLabelText('Year')).toBeInTheDocument()
    expect(screen.queryByLabelText('Quarter')).not.toBeInTheDocument()
  })

  it('creates an annual cycle for the selected year', async () => {
    const created = {
      id: annualPeriodKey(2026),
      name: 'Annual 2026',
      purpose: 'annual_appraisal' as const,
    }
    const create = vi
      .spyOn(reviewsStore, 'createReviewCycle')
      .mockResolvedValue(created as never)
    const onCreated = vi.fn()

    render(
      <AddReviewCycleModal
        open
        onClose={() => {}}
        onCreated={onCreated}
        existingPeriodKeys={new Set()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Annual' }))
    fireEvent.change(screen.getByLabelText('Year'), {
      target: { value: annualPeriodKey(2026) },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create cycle' }))

    await vi.waitFor(() => {
      expect(create).toHaveBeenCalledWith({
        type: 'regular',
        purpose: 'annual_appraisal',
        periodKey: annualPeriodKey(2026),
        modules: { goals: false, reviews: true },
        sourceLinks: [],
      })
    })
    expect(onCreated).toHaveBeenCalledWith(created)
  })

  it('presets Q4 as goals only and lets the user turn Reviews on', async () => {
    const create = vi.spyOn(reviewsStore, 'createReviewCycle').mockResolvedValue({
      id: periodKey(2026, 4),
      name: 'Q4 2026',
      purpose: 'quarterly_checkin',
    } as never)

    render(
      <AddReviewCycleModal
        open
        onClose={() => {}}
        onCreated={() => {}}
        existingPeriodKeys={new Set()}
      />,
    )

    fireEvent.change(screen.getByLabelText('Quarter'), {
      target: { value: periodKey(2026, 4) },
    })
    expect(screen.getByRole('switch', { name: 'Enable Goals' })).toBeChecked()
    expect(screen.getByRole('switch', { name: 'Enable Reviews' })).not.toBeChecked()

    fireEvent.click(screen.getByRole('switch', { name: 'Enable Reviews' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create cycle' }))

    await vi.waitFor(() => {
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          purpose: 'quarterly_checkin',
          periodKey: periodKey(2026, 4),
          modules: { goals: true, reviews: true },
        }),
      )
    })
  })

  it('lets the user include a custom cycle in the annual', async () => {
    const create = vi.spyOn(reviewsStore, 'createReviewCycle').mockResolvedValue({
      id: annualPeriodKey(2026),
      name: 'Annual 2026',
      purpose: 'annual_appraisal',
    } as never)

    render(
      <AddReviewCycleModal
        open
        onClose={() => {}}
        onCreated={() => {}}
        existingPeriodKeys={new Set()}
        cycles={[
          {
            id: 'q3-2026',
            name: 'Q3 2026',
            type: 'regular',
            purpose: 'quarterly_checkin',
            periodKey: 'q3-2026',
            yearKey: '2026',
            startDate: '2026-07-01',
            endDate: '2026-09-30',
          } as never,
          {
            id: 'adhoc-1',
            name: 'Leadership mid-year',
            type: 'ad-hoc',
            purpose: 'custom',
            yearKey: '2026',
            startDate: '2026-06-01',
            endDate: '2026-06-30',
          } as never,
        ]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Annual' }))
    fireEvent.change(screen.getByLabelText('Year'), {
      target: { value: annualPeriodKey(2026) },
    })
    expect(screen.getByRole('checkbox', { name: /Q3 2026/i })).toBeChecked()
    expect(screen.getByText('Q3 2026')).toBeVisible()
    fireEvent.click(screen.getByRole('checkbox', { name: /Leadership mid-year/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Create cycle' }))

    await vi.waitFor(() => {
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          purpose: 'annual_appraisal',
          periodKey: annualPeriodKey(2026),
          sourceLinks: expect.arrayContaining([
            expect.objectContaining({ sourceCycleId: 'q3-2026' }),
            expect.objectContaining({ sourceCycleId: 'adhoc-1' }),
          ]),
        }),
      )
    })
  })
})
