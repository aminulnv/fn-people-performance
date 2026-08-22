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

    expect(screen.getByRole('heading', { name: 'Overall Grade' })).toBeTruthy()
    expect(screen.getByRole('radiogroup', { name: 'Overall Grade' })).toBeTruthy()
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
})
