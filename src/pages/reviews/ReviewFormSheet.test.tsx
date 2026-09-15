import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { defaultReviewPolicy } from '@/lib/reviews/reviewPolicy'
import { seedScorecardForms } from '@/lib/reviews/scorecardForms'
import { ReviewFormSheet, reviewFormSummary } from './ReviewFormSheet'

afterEach(() => {
  cleanup()
})

describe('ReviewFormSheet', () => {
  it('summarizes the allocated form and links to the builder', () => {
    const forms = seedScorecardForms()
    const onAllocate = vi.fn()
    render(
      <MemoryRouter>
        <ReviewFormSheet
          policy={defaultReviewPolicy('annual_appraisal')}
          forms={forms}
          scorecardFormId={forms[0]!.id}
          onAllocate={onAllocate}
        />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: 'Review Form' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Allocated form')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Grade Areas' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Grade areas' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Questions' })).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Edit in Builder' }),
    ).toHaveAttribute('href', `/scorecards-builder/${forms[0]!.id}`)
  })

  it('prompts to open the builder when no form is allocated', () => {
    render(
      <MemoryRouter>
        <ReviewFormSheet
          policy={defaultReviewPolicy('quarterly_checkin')}
          forms={seedScorecardForms()}
          scorecardFormId={null}
          onAllocate={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('link', { name: 'Open Scorecards Builder' }),
    ).toHaveAttribute('href', '/scorecards-builder')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
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
