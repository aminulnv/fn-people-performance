import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { RatingDistribution } from '@/lib/calibration/distribution'
import { RatingDistributionChart } from './RatingDistributionChart'

afterEach(() => {
  cleanup()
})

const bands: RatingDistribution['bands'] = [
  {
    id: 'unsatisfactory',
    label: 'Unsatisfactory',
    count: 0,
    percent: 0,
    guidelinePercent: 5,
  },
  {
    id: 'developing',
    label: 'Developing',
    count: 4,
    percent: 20,
    guidelinePercent: 28,
  },
  {
    id: 'performing',
    label: 'Performing',
    count: 7,
    percent: 35,
    guidelinePercent: 40,
  },
  {
    id: 'exceeding',
    label: 'Exceeding',
    count: 7,
    percent: 35,
    guidelinePercent: 25,
  },
  {
    id: 'exceptional',
    label: 'Exceptional',
    count: 2,
    percent: 10,
    guidelinePercent: 2,
  },
]

const distribution: RatingDistribution = {
  bands,
  series: [
    {
      id: 'overall',
      label: 'Overall',
      total: 20,
      bands,
    },
  ],
  summary: {
    total: 20,
    exceedingAndAbove: { count: 9, percent: 45 },
    performing: { count: 7, percent: 35 },
    developingAndBelow: { count: 4, percent: 20 },
  },
}

describe('RatingDistributionChart', () => {
  it('renders overall bars, guideline, and totals', () => {
    render(
      <RatingDistributionChart
        distribution={distribution}
        breakdown="overall"
        onBreakdownChange={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('img', {
        name: /Developing: 20% · 4 people\. Guideline 28%\./,
      }),
    ).toBeTruthy()
    expect(screen.getByText('Total in calibration')).toBeTruthy()
    expect(screen.getByText('20')).toBeTruthy()
    expect(screen.getByText('Exceeding & above')).toBeTruthy()
    expect(screen.getByText('Red line = guideline target per band')).toBeTruthy()
  })

  it('asks for another breakdown', () => {
    const onBreakdownChange = vi.fn()
    render(
      <RatingDistributionChart
        distribution={distribution}
        breakdown="overall"
        onBreakdownChange={onBreakdownChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'By Department' }))
    expect(onBreakdownChange).toHaveBeenCalledWith('department')
  })
})
