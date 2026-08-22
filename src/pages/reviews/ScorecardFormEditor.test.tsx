import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { defaultReviewPolicy } from '@/lib/reviews/reviewPolicy'
import { ScorecardFormEditor } from './ScorecardFormEditor'

afterEach(() => {
  cleanup()
})

describe('ScorecardFormEditor', () => {
  it('applies a library preset to the group form', () => {
    const onChange = vi.fn()
    render(
      <ScorecardFormEditor
        policy={defaultReviewPolicy('quarterly_checkin')}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Preset' }))
    fireEvent.click(screen.getByRole('option', { name: /Annual appraisal/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Use' }))

    const next = onChange.mock.calls[0]?.[0]
    expect(next.scorecard.questions.map((question: { id: string }) => question.id)).toEqual(
      expect.arrayContaining(['delivered', 'retain']),
    )
    expect(
      next.scorecard.pillars.find((pillar: { id: string }) => pillar.id === 'skills')
        ?.enabled,
    ).toBe(true)
  })

  it('adds a question the group can edit', () => {
    const onChange = vi.fn()
    render(
      <ScorecardFormEditor
        policy={defaultReviewPolicy('custom')}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Create question' }))
    expect(onChange).toHaveBeenCalled()
    expect(onChange.mock.calls[0]?.[0].scorecard.questions).toHaveLength(1)
  })

  it('creates a form instead of applying a blank preset', () => {
    const onChange = vi.fn()
    render(
      <ScorecardFormEditor
        policy={defaultReviewPolicy('annual_appraisal')}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Preset' }))
    const options = screen.getAllByRole('option')
    expect(options[0]).toHaveTextContent('Create form')
    expect(screen.queryByRole('option', { name: /Blank form/ })).not.toBeInTheDocument()
    fireEvent.click(options[0]!)
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    const next = onChange.mock.calls[0]?.[0]
    expect(next.scorecard.questions).toEqual([])
    expect(
      next.scorecard.pillars.find((pillar: { id: string }) => pillar.id === 'goals')
        ?.enabled,
    ).toBe(true)
  })

  it('shows the form the way people fill it in', () => {
    render(
      <ScorecardFormEditor
        policy={defaultReviewPolicy('annual_appraisal')}
        onChange={vi.fn()}
      />,
    )

    expect(screen.queryByRole('group', { name: 'Preview as' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Question 1 prompt')).toHaveValue(
      'What did I deliver this year?',
    )
    expect(screen.getByLabelText('Question 1 answer preview')).toBeDisabled()
    expect(
      screen.getByDisplayValue('Will we do what it takes to retain this person?'),
    ).toBeInTheDocument()
  })

  it('keeps helper copy off the form', () => {
    render(
      <ScorecardFormEditor
        policy={defaultReviewPolicy('annual_appraisal')}
        onChange={vi.fn()}
      />,
    )

    expect(
      screen.queryByText(/start from a preset/i),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(/enabled weights must add up/i),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(/this is the page people fill in/i),
    ).not.toBeInTheDocument()
  })

  it('steps a pillar weight like the goals window', () => {
    const onChange = vi.fn()
    render(
      <ScorecardFormEditor
        policy={defaultReviewPolicy('annual_appraisal')}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Decrease weight for Goals' }))
    expect(
      onChange.mock.calls[0]?.[0].scorecard.pillars.find(
        (pillar: { id: string }) => pillar.id === 'goals',
      )?.weight,
    ).toBe(45)
  })

  it('lets the user turn Leadership on', () => {
    const onChange = vi.fn()
    render(
      <ScorecardFormEditor
        policy={defaultReviewPolicy('annual_appraisal')}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByRole('switch', { name: 'Leadership' }))
    expect(
      onChange.mock.calls[0]?.[0].scorecard.pillars.find(
        (pillar: { id: string }) => pillar.id === 'leadership',
      )?.enabled,
    ).toBe(true)
  })
})
