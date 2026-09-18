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
  it('summarizes the allocated form and links to the library', () => {
    const forms = seedScorecardForms()
    const onAllocate = vi.fn()
    render(
      <MemoryRouter>
        <ReviewFormSheet
          policy={defaultReviewPolicy('annual_appraisal')}
          forms={forms}
          scorecardFormId={forms.find((form) => form.id === 'form-annual-appraisal')!.id}
          cycleType="annual_appraisal"
          onAllocate={onAllocate}
        />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: 'Review Form' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Showing Annual forms')).toBeInTheDocument()
    expect(screen.getByLabelText('Allocated form')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Grade Areas' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Grade areas' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Questions' })).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Edit in Library' }),
    ).toHaveAttribute('href', `/reviews/scorecards-library/form-annual-appraisal`)
  })

  it('only offers forms that match the cycle type', () => {
    render(
      <MemoryRouter>
        <ReviewFormSheet
          policy={defaultReviewPolicy('quarterly_checkin')}
          forms={seedScorecardForms()}
          scorecardFormId={null}
          cycleType="quarterly_checkin"
          onAllocate={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Showing Quarterly forms')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Open Scorecards Library' }),
    ).toHaveAttribute('href', '/reviews/scorecards-library')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('summarizes the form without listing every question', () => {
    expect(reviewFormSummary(defaultReviewPolicy('annual_appraisal'))).toMatch(
      /questions · .+ areas · goals grading \+ overall grading/,
    )
  })
})
