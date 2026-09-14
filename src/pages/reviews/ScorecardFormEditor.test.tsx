import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { defaultReviewPolicy } from '@/lib/reviews/reviewPolicy'
import { ScorecardFormEditor } from './ScorecardFormEditor'

if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
  }
}

afterEach(() => {
  cleanup()
})

function renderEditor(
  policy = defaultReviewPolicy('custom'),
  onChange = vi.fn(),
) {
  return render(
    <MemoryRouter>
      <ScorecardFormEditor policy={policy} onChange={onChange} />
    </MemoryRouter>,
  )
}

function openGradeAreas() {
  fireEvent.click(screen.getByRole('button', { name: 'Grade Areas' }))
}

function selectQuestion(number: number) {
  fireEvent.click(screen.getByRole('button', { name: `Question ${number} settings` }))
}

describe('ScorecardFormEditor', () => {
  it('adds a question the group can edit', () => {
    const onChange = vi.fn()
    renderEditor(defaultReviewPolicy('custom'), onChange)

    fireEvent.click(screen.getByRole('button', { name: 'Create Question' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Open-ended' }))
    expect(onChange).toHaveBeenCalled()
    expect(onChange.mock.calls[0]?.[0].scorecard.questions).toHaveLength(1)
    expect(onChange.mock.calls[0]?.[0].scorecard.questions[0].kind).toBe(
      'open_ended',
    )
  })

  it('adds a yes/no question from the type menu', () => {
    const onChange = vi.fn()
    renderEditor(defaultReviewPolicy('annual_appraisal'), onChange)

    fireEvent.click(screen.getByRole('button', { name: 'Add Question' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Yes / No' }))
    const next = onChange.mock.calls[0]?.[0]
    expect(next.scorecard.questions.at(-1)?.kind).toBe('yes_no')
  })

  it('shows the form the way people fill it in', () => {
    renderEditor(defaultReviewPolicy('annual_appraisal'))

    expect(screen.queryByRole('group', { name: 'Preview as' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Employee Name' })).toBeInTheDocument()
    expect(screen.getByText(/Reviewer Reviewer Name/)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Goals' })).toBeInTheDocument()
    expect(screen.getByText('Example Goal 1')).toBeInTheDocument()
    expect(screen.getByText('Example Goal 2')).toBeInTheDocument()
    expect(screen.getByLabelText('Question 1 prompt')).toHaveValue(
      'What did I deliver this year?',
    )
    expect(screen.getByLabelText('Question 1 answer preview')).toBeDisabled()
    expect(
      screen.getByDisplayValue('Will we do what it takes to retain this person?'),
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Review form preview' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Grade areas' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Grade Areas' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Manage evaluation criteria' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Manage Skills' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Manage Core Values' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Manage questions' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Manage performance grades' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Overall Grading' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Feedback' })).not.toBeInTheDocument()
  })

  it('opens grade areas from Manage on a section', () => {
    renderEditor(defaultReviewPolicy('annual_appraisal'))

    fireEvent.click(screen.getByRole('button', { name: 'Manage evaluation criteria' }))
    expect(screen.getByRole('heading', { name: 'Grade Areas' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Grade areas' })).toBeInTheDocument()
  })

  it('opens grade areas in a modal', () => {
    renderEditor(defaultReviewPolicy('annual_appraisal'))

    openGradeAreas()
    expect(screen.getByRole('heading', { name: 'Grade Areas' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Grade areas' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Goals grade preview')).not.toBeInTheDocument()
  })

  it('adds the Feedback section from the type menu', () => {
    const onChange = vi.fn()
    renderEditor(defaultReviewPolicy('annual_appraisal'), onChange)

    fireEvent.click(screen.getByRole('button', { name: 'Add Question' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Feedback' }))
    expect(onChange.mock.calls[0]?.[0].scorecard.feedback.enabled).toBe(true)
  })

  it('adds Overall Grading from the type menu', () => {
    const onChange = vi.fn()
    renderEditor(defaultReviewPolicy('custom'), onChange)

    fireEvent.click(screen.getByRole('button', { name: 'Create Question' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Overall Grading' }))
    expect(onChange.mock.calls[0]?.[0].managerReview.gradeOverall).toBe(true)
  })

  it('shows overall grade criteria on the canvas when enabled', () => {
    renderEditor(defaultReviewPolicy('annual_appraisal'))

    const overall = screen.getByRole('region', { name: 'Overall Grading' })
    expect(overall).toHaveTextContent('Unsatisfactory')
    expect(overall).toHaveTextContent('Developing')
    expect(overall).toHaveTextContent('Performing')
    expect(overall).toHaveTextContent('Exceeding')
    expect(overall).toHaveTextContent('Exceptional')
    expect(overall).toHaveTextContent(
      'Reliably achieves goals with minimal guidance.',
    )
  })

  it('lets Manage questions select the first question', () => {
    renderEditor(defaultReviewPolicy('annual_appraisal'))

    expect(screen.queryByRole('group', { name: 'Answered on' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Manage questions' }))
    expect(screen.getByRole('group', { name: 'Answered on' })).toBeInTheDocument()
  })

  it('reveals question tools only when a block is selected', () => {
    renderEditor(defaultReviewPolicy('annual_appraisal'))

    expect(screen.queryByRole('group', { name: 'Answered on' })).not.toBeInTheDocument()
    selectQuestion(1)
    expect(screen.getByRole('group', { name: 'Answered on' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Published to' })).toBeInTheDocument()
  })

  it('lets output visibility be toggled separately from input stages', () => {
    const onChange = vi.fn()
    renderEditor(defaultReviewPolicy('annual_appraisal'), onChange)

    selectQuestion(1)
    const output = screen.getByRole('group', { name: 'Published to' })
    fireEvent.click(output.querySelectorAll('button')[0]!)
    const question = onChange.mock.calls[0]?.[0].scorecard.questions[0]
    expect(question.visibility).toEqual(['employee', 'manager', 'calibrators'])
    expect(question.outputVisibility).toEqual(['manager'])
  })

  it('keeps helper copy off the form', () => {
    renderEditor(defaultReviewPolicy('annual_appraisal'))

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
    renderEditor(defaultReviewPolicy('annual_appraisal'), onChange)

    openGradeAreas()
    fireEvent.click(screen.getByRole('button', { name: 'Decrease weight for Goals' }))
    expect(
      onChange.mock.calls[0]?.[0].scorecard.pillars.find(
        (pillar: { id: string }) => pillar.id === 'goals',
      )?.weight,
    ).toBe(45)
  })

  it('does not let pillar weights go over 100%', () => {
    const onChange = vi.fn()
    renderEditor(defaultReviewPolicy('annual_appraisal'), onChange)

    openGradeAreas()
    expect(
      screen.getByRole('button', { name: 'Increase weight for Goals' }),
    ).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Increase weight for Goals' }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('lets the user turn Leadership on', () => {
    const onChange = vi.fn()
    renderEditor(defaultReviewPolicy('annual_appraisal'), onChange)

    openGradeAreas()
    fireEvent.click(screen.getByRole('switch', { name: 'Leadership Capabilities' }))
    expect(
      onChange.mock.calls[0]?.[0].scorecard.pillars.find(
        (pillar: { id: string }) => pillar.id === 'leadership',
      )?.enabled,
    ).toBe(true)
  })
})
