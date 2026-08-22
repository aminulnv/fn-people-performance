import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ScorecardDetail } from '@/lib/reviews/scorecards'
import type { ReviewPacket } from '@/lib/reviews/types'
import { ScorecardHero } from './ScorecardHero'

afterEach(() => {
  cleanup()
})

function detail(
  partial: Partial<ScorecardDetail> = {},
): ScorecardDetail {
  return {
    id: 'q3-2026-871',
    cycleKey: 'q3-2026',
    cycleLabel: 'Q3 2026',
    employeeId: 871,
    employeeName: 'Saif Ivna Alam',
    employeeAvatarUrl: '',
    reviewerId: 1,
    reviewerName: 'Aminul Islam Borhan',
    reviewerAvatarUrl: '',
    gradeHidden: false,
    grade: 'exceeding',
    role: 'Executive',
    seniority: '',
    team: '',
    department: 'People & Culture',
    status: 'completed',
    isMine: false,
    goalsOverallPercent: 35,
    goalsOverallBand: 'unsatisfactory',
    performanceGoals: [],
    organisationalGoals: [],
    contributionGrade: 'exceeding',
    overallGrade: 'exceeding',
    feedback: {
      authorName: '',
      authorRole: '',
      dateLabel: '',
      strengths: '',
      developments: '',
    },
    ...partial,
  }
}

function packet(partial: Partial<ReviewPacket> = {}): ReviewPacket {
  return {
    id: 'pkt-1',
    cycleId: 'q3-2026',
    groupId: 'group-1',
    employeeId: 871,
    managerEmployeeId: 1,
    status: 'released_to_employees',
    selfOverallGrade: null,
    managerOverallGrade: 'exceeding',
    calibratedOverallGrade: null,
    publishedOverallGrade: 'exceeding',
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

function renderHero(
  nextPacket: Partial<ReviewPacket> = {},
  stages: Array<{ id: 'manager_review' | 'self_review' | 'calibration_hod_hrbp'; enabled: boolean }> = [
    { id: 'manager_review', enabled: true },
  ],
) {
  return render(
    <MemoryRouter>
      <ScorecardHero
        detail={detail()}
        packet={packet(nextPacket)}
        stages={stages}
      />
    </MemoryRouter>,
  )
}

describe('ScorecardHero', () => {
  it('shows the person name and review context without action buttons', () => {
    renderHero()

    expect(
      screen.getByRole('heading', { name: 'Saif Ivna Alam' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: 'Saif Ivna Alam' }).parentElement,
    ).toHaveTextContent('Q3 2026')
    expect(screen.queryByText('Completed review')).toBeNull()
    expect(screen.queryByText('Released to employees')).toBeNull()
    expect(
      screen.getByText((_, element) =>
        element?.textContent ===
        'Executive · People & Culture · Reviewer Aminul Islam Borhan',
      ),
    ).toBeTruthy()
    expect(screen.getByText('Overall grade')).toBeTruthy()
    expect(screen.queryByText('Manager grade')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Edit' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Export PDF' })).toBeNull()
  })

  it('lets the stage row carry status instead of repeating manager-review chips', () => {
    renderHero({ status: 'manager_submitted' })

    expect(screen.queryByText('In progress')).toBeNull()
    expect(screen.queryByText('Manager review submitted')).toBeNull()
    const managerStep = screen.getByText('Manager review').closest('li')
    const publishedStep = screen.getByText('Published').closest('li')
    expect(managerStep?.className).toContain('is-done')
    expect(publishedStep?.className).toContain('is-active')
  })
})
