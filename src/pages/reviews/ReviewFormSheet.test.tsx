import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { defaultReviewPolicy } from '@/lib/reviews/reviewPolicy'
import { ReviewFormSheet, reviewFormSummary } from './ReviewFormSheet'

afterEach(() => {
  cleanup()
})

describe('ReviewFormSheet', () => {
  it('names the form as a separate editing surface', () => {
    render(
      <ReviewFormSheet
        policy={defaultReviewPolicy('quarterly_checkin')}
        onChange={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'Review Form' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Templates and questions')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Preset')).toBeInTheDocument()
  })

  it('applies a library preset from the sheet', () => {
    const onChange = vi.fn()
    render(
      <ReviewFormSheet
        policy={defaultReviewPolicy('quarterly_checkin')}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Preset' }))
    fireEvent.click(screen.getByRole('option', { name: /Annual appraisal/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Use' }))

    expect(onChange).toHaveBeenCalled()
  })

  it('summarizes the form without listing every question', () => {
    expect(reviewFormSummary(defaultReviewPolicy('annual_appraisal'))).toMatch(
      /questions · .+ areas · goals grade \+ overall grade/,
    )
    expect(reviewFormSummary(defaultReviewPolicy('quarterly_checkin'))).toMatch(
      /overall grade/,
    )
    expect(reviewFormSummary(defaultReviewPolicy('quarterly_checkin'))).not.toMatch(
      /goals grade/,
    )
  })
})
