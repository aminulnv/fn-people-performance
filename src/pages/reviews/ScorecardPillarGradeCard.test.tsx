import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ScorecardPillarGradeCard } from './ScorecardPillarGradeCard'

afterEach(() => {
  cleanup()
})

describe('ScorecardPillarGradeCard', () => {
  it('shows the pillar weight and grade band', () => {
    render(
      <ScorecardPillarGradeCard label="Skills" weight={25} grade="exceeding" />,
    )

    expect(screen.getByRole('region', { name: 'Skills' })).toBeInTheDocument()
    expect(screen.getByText('25%')).toBeInTheDocument()
    expect(screen.getByText('Exceeding')).toBeInTheDocument()
  })

  it('shows an empty label when ungraded', () => {
    render(
      <ScorecardPillarGradeCard label="Core Values" weight={25} grade={null} />,
    )

    expect(screen.getByText('Not graded yet')).toBeInTheDocument()
  })
})
