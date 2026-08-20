import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MetricProgressUpdate, sanitizeMetricDraft } from './MetricProgressUpdate'
import type { Metric } from '@/lib/goals/types'

afterEach(cleanup)

const metric: Metric = {
  id: 'm1',
  kind: 'metric',
  title: 'NPS',
  weight: 100,
  unit: 'number',
  direction: 'increase',
  startValue: 0,
  currentValue: 2,
  targetValue: 6,
}

describe('sanitizeMetricDraft', () => {
  it('keeps digits, one decimal, and a leading minus', () => {
    expect(sanitizeMetricDraft('12.5')).toBe('12.5')
    expect(sanitizeMetricDraft('-3.14')).toBe('-3.14')
    expect(sanitizeMetricDraft('1.2.3')).toBe('1.23')
  })

  it('strips letters and other symbols', () => {
    expect(sanitizeMetricDraft('12ab')).toBe('12')
    expect(sanitizeMetricDraft('e10')).toBe('10')
    expect(sanitizeMetricDraft('+4')).toBe('4')
  })
})

describe('MetricProgressUpdate', () => {
  it('rejects non-numeric typing in the log field', () => {
    render(<MetricProgressUpdate metric={metric} onCommit={vi.fn()} />)

    const field = screen.getByLabelText('Current progress for NPS')
    fireEvent.change(field, { target: { value: '12px' } })
    expect(field).toHaveValue('12')
  })

  it('does not commit an empty or invalid draft', () => {
    const onCommit = vi.fn()
    render(<MetricProgressUpdate metric={metric} onCommit={onCommit} />)

    fireEvent.click(screen.getByRole('button', { name: 'Add update for NPS' }))
    expect(onCommit).not.toHaveBeenCalled()
  })
})
