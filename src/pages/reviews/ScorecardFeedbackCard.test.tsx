import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { ScorecardFeedback } from '@/lib/reviews/scorecards'
import { ScorecardFeedbackCard } from './ScorecardFeedbackCard'

afterEach(() => {
  cleanup()
})

function feedback(
  partial: Partial<ScorecardFeedback> = {},
): ScorecardFeedback {
  return {
    authorName: 'Api Singha',
    authorRole: 'LM',
    dateLabel: '22 Aug 2026',
    strengths:
      'You owned the OKR platform end to end.\n\nYou ship reliably and at pace.',
    developments:
      'The way you communicate ideas could be simpler and clearer.',
    ...partial,
  }
}

describe('ScorecardFeedbackCard', () => {
  it('shows both columns when the packet has no written feedback', () => {
    render(
      <ScorecardFeedbackCard
        feedback={feedback({ strengths: '', developments: '' })}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Feedback' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Strengths' })).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: 'Areas Of Improvement' }),
    ).toBeTruthy()
  })

  it('renders strengths and areas of improvement from the packet', () => {
    render(
      <ScorecardFeedbackCard
        feedback={feedback()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Feedback' })).toBeTruthy()
    expect(screen.queryByText('Api Singha')).toBeNull()
    expect(screen.queryByText(/LM · 22 Aug 2026/)).toBeNull()
    expect(screen.getByRole('heading', { name: 'Strengths' })).toBeTruthy()
    expect(
      screen.getByText(/You owned the OKR platform end to end/),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: 'Areas Of Improvement' }),
    ).toBeTruthy()
    expect(
      screen.getByText(
        'The way you communicate ideas could be simpler and clearer.',
      ),
    ).toBeTruthy()
  })

  it('shows strengths and areas of improvement side by side in edit mode', () => {
    const { container } = render(
      <ScorecardFeedbackCard
        feedback={feedback({ strengths: '', developments: '' })}
        editing
        strengths=""
        developments=""
        onStrengthsChange={() => undefined}
        onDevelopmentsChange={() => undefined}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Feedback' })).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'Strengths' })).toBeTruthy()
    expect(
      screen.getByRole('textbox', { name: 'Areas Of Improvement' }),
    ).toBeTruthy()
    expect(
      container.querySelector('.pd-reviews-scorecard__feedback-grid--edit'),
    ).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Add a strength/ })).toBeNull()
    expect(
      screen.queryByRole('button', { name: /Add an area/ }),
    ).toBeNull()
  })

  it('keeps both columns when only one side is written', () => {
    render(
      <ScorecardFeedbackCard
        feedback={feedback({ developments: '' })}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Strengths' })).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: 'Areas Of Improvement' }),
    ).toBeTruthy()
    expect(screen.queryByText('Not graded')).toBeNull()
  })
})
