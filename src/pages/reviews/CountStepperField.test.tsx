import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { CountStepperField } from './CountStepperField'

describe('CountStepperField', () => {
  it('steps a required count up and down', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <CountStepperField label="Minimum" value={2} onChange={onChange} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Increase Minimum' }))
    expect(onChange).toHaveBeenLastCalledWith(3)

    rerender(
      <CountStepperField label="Minimum" value={2} onChange={onChange} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Decrease Minimum' }))
    expect(onChange).toHaveBeenLastCalledWith(1)
  })

  it('clears an optional maximum down to empty', () => {
    const onChange = vi.fn()
    render(
      <CountStepperField
        label="Maximum"
        value={1}
        allowEmpty
        placeholder="None"
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Decrease Maximum' }))
    expect(onChange).toHaveBeenLastCalledWith(null)
  })

  it('does not increase beyond the configured maximum', () => {
    const onChange = vi.fn()
    render(
      <CountStepperField
        label="Days"
        value={30}
        min={0}
        max={30}
        onChange={onChange}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Increase Days' }),
    ).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Days'), {
      target: { value: '45' },
    })
    expect(onChange).toHaveBeenLastCalledWith(30)
  })
})
