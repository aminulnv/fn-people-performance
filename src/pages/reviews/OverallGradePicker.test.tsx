import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { OverallGradePicker } from './OverallGradePicker'

afterEach(() => {
  cleanup()
})

describe('OverallGradePicker', () => {
  it('renders the radio list and selects a grade', () => {
    const onChange = vi.fn()
    render(
      <OverallGradePicker
        name="overall"
        value="exceeding"
        onChange={onChange}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Overall Grading' })).toBeTruthy()
    expect(screen.getByRole('radiogroup', { name: 'Overall Grading' })).toBeTruthy()
    expect(
      screen.queryByText(/How would you describe/),
    ).toBeNull()
    expect(
      screen.queryByText(/does not recommend a grade/),
    ).toBeNull()
    expect(
      screen.getByRole('radio', { name: /Exceeding/ }),
    ).toHaveProperty('checked', true)
    expect(
      screen.getByText('Achieves all goals and often delivers beyond what was asked.'),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('radio', { name: /Performing/ }))
    expect(onChange).toHaveBeenCalledWith('performing')
  })

  it('shows the formula calculation without locking the picker', () => {
    render(
      <OverallGradePicker
        name="overall-suggest"
        value="performing"
        suggestedGrade="exceeding"
        calculationRows={[
          { label: 'Goals', weight: 50, gradeLabel: 'Exceeding' },
          { label: 'Skills', weight: 25, gradeLabel: 'Performing' },
          { label: 'Values', weight: 25, gradeLabel: 'Exceeding' },
        ]}
      />,
    )

    expect(screen.getByText('Calculated: Exceeding')).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'How this calculated grade works' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('radio', { name: /Performing/ }),
    ).toHaveProperty('disabled', false)
  })

  it('keeps the same list in view mode without changing the grade', () => {
    const onChange = vi.fn()
    render(
      <OverallGradePicker
        name="overall-view"
        value="exceeding"
        disabled
        onChange={onChange}
      />,
    )

    expect(
      screen.getByRole('radio', { name: /Exceeding/ }),
    ).toHaveProperty('checked', true)
    expect(
      screen.getByRole('radio', { name: /Exceeding/ }),
    ).toHaveProperty('disabled', true)

    fireEvent.click(screen.getByRole('radio', { name: /Performing/ }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('offers Leave (O) beside the grades when allowed', () => {
    const onLeaveChange = vi.fn()
    const onChange = vi.fn()
    render(
      <OverallGradePicker
        name="overall-leave"
        value="performing"
        allowLeave
        onChange={onChange}
        onLeaveChange={onLeaveChange}
      />,
    )

    fireEvent.click(screen.getByRole('radio', { name: /Leave \(O\)/ }))
    expect(onLeaveChange).toHaveBeenCalledWith(true)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('clears leave when a grade is chosen', () => {
    const onLeaveChange = vi.fn()
    const onChange = vi.fn()
    render(
      <OverallGradePicker
        name="overall-leave-clear"
        value=""
        leave
        allowLeave
        onChange={onChange}
        onLeaveChange={onLeaveChange}
      />,
    )

    expect(screen.getByRole('radio', { name: /Leave \(O\)/ })).toHaveProperty(
      'checked',
      true,
    )
    fireEvent.click(screen.getByRole('radio', { name: /Performing/ }))
    expect(onLeaveChange).toHaveBeenCalledWith(false)
    expect(onChange).toHaveBeenCalledWith('performing')
  })

  it('shows a required reason under the overall grades', () => {
    const onReasonChange = vi.fn()
    render(
      <OverallGradePicker
        name="overall-reason"
        value="exceeding"
        suggestedGrade="performing"
        reasonNeed={{
          required: true,
          title: 'Why this overall grade?',
          hint: 'The formula result is Performing. Explain why you are choosing a different overall grade.',
        }}
        reason=""
        onReasonChange={onReasonChange}
      />,
    )

    expect(screen.getByRole('textbox', { name: 'Justification' })).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Why justification is required' }),
    ).toBeTruthy()
    fireEvent.change(screen.getByRole('textbox', { name: 'Justification' }), {
      target: { value: 'Delivered above the plan.' },
    })
    expect(onReasonChange).toHaveBeenCalledWith('Delivered above the plan.')
  })
})
