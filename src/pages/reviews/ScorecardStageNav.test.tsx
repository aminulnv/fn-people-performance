import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReviewPacket } from '@/lib/reviews/types'
import { ScorecardStageNav } from './ScorecardStageNav'

afterEach(() => {
  cleanup()
})

function packet(partial: Partial<ReviewPacket> = {}): ReviewPacket {
  return {
    id: 'pkt-1',
    cycleId: 'annual-2026',
    groupId: 'group-1',
    employeeId: 871,
    managerEmployeeId: 1,
    status: 'manager_in_progress',
    selfOverallGrade: 'performing',
    managerOverallGrade: null,
    calibratedOverallGrade: null,
    publishedOverallGrade: null,
    managerOverrideReason: '',
    goalsComponent: null,
    answers: [],
    pillarScores: [],
    calibrationEvents: [],
    appeals: [],
    version: 1,
    ...partial,
  }
}

const stages = [
  { id: 'self_review' as const, enabled: true },
  { id: 'manager_review' as const, enabled: true },
  { id: 'publish_employees' as const, enabled: true },
  { id: 'appeal' as const, enabled: true },
]

describe('ScorecardStageNav', () => {
  it('renders the segmented stage control at page width', () => {
    render(
      <ScorecardStageNav
        packet={packet()}
        stages={stages}
        viewerEmployeeId={871}
        viewing="self_review"
        onViewStage={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('navigation', {
        name: 'Review stages, viewing Self-Review',
      }),
    ).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Review stages' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Self-Review' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.queryByRole('button', { name: 'Manager Review' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Published' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })

  it('notifies when an open stage is selected', () => {
    const onViewStage = vi.fn()
    render(
      <ScorecardStageNav
        packet={packet({
          status: 'in_calibration',
          managerOverallGrade: 'exceeding',
        })}
        stages={stages}
        viewerEmployeeId={1}
        viewing="manager_review"
        onViewStage={onViewStage}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Self-Review' }))
    expect(onViewStage).toHaveBeenCalledWith('self_review')
  })
})
