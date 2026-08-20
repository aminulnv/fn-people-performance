import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Metric } from '@/lib/goals/types'
import { NumberTargetEditor } from './NumberTargetEditor'

afterEach(cleanup)

const metric: Metric = {
  id: 'm1',
  kind: 'metric',
  title: 'NPS',
  weight: 100,
  unit: 'number',
  direction: 'increase',
  startValue: 0,
  currentValue: 0,
  targetValue: 10,
}

describe('NumberTargetEditor', () => {
  it('keeps start and target edits local until blur', () => {
    const onChange = vi.fn()
    render(<NumberTargetEditor metric={metric} onChange={onChange} />)

    const start = screen.getByLabelText('Start value')
    fireEvent.change(start, { target: { value: '4' } })
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.blur(start)
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ startValue: 4, currentValue: 4 }),
    )

    onChange.mockClear()
    const target = screen.getByLabelText('Target value')
    fireEvent.change(target, { target: { value: '20' } })
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.blur(target)
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ targetValue: 20 }),
    )
  })
})
