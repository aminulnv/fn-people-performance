import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { defaultReviewPolicy } from '@/lib/reviews/reviewPolicy'
import { ReviewFormSheet, reviewFormSummary } from './ReviewFormSheet'

if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}

afterEach(() => {
  cleanup()
})

describe('ReviewFormSheet', () => {
  it('summarizes the form in the side sheet without the editor', () => {
    render(
      <ReviewFormSheet
        policy={defaultReviewPolicy('annual_appraisal')}
        onChange={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'Review Form' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/questions · .+ areas ·/)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Grade areas' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Questions' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Preset')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Edit form' }),
    ).toBeInTheDocument()
  })

  it('opens the form editor in a modal', () => {
    const onChange = vi.fn()
    render(
      <ReviewFormSheet
        policy={defaultReviewPolicy('quarterly_checkin')}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Edit form' }))

    const dialog = screen.getByRole('dialog', { name: 'Review Form' })
    expect(dialog).toHaveAttribute('open')
    expect(within(dialog).getByLabelText('Preset')).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Preset' }))
    fireEvent.click(screen.getByRole('option', { name: /Annual appraisal/ }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Use' }))
    expect(onChange).toHaveBeenCalled()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Done' }))
    expect(dialog).not.toHaveAttribute('open')
  })

  it('summarizes the form without listing every question', () => {
    expect(reviewFormSummary(defaultReviewPolicy('annual_appraisal'))).toMatch(
      /questions · .+ areas · goals grading \+ overall grading/,
    )
    expect(reviewFormSummary(defaultReviewPolicy('quarterly_checkin', 'q1-2026'))).toMatch(
      /goals grading/,
    )
    expect(reviewFormSummary(defaultReviewPolicy('quarterly_checkin', 'q1-2026'))).not.toMatch(
      /overall grading/,
    )
    expect(reviewFormSummary(defaultReviewPolicy('quarterly_checkin', 'q4-2026'))).not.toMatch(
      /goals grading|overall grading/,
    )
  })
})
