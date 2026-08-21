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
})
