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

describe('ScorecardHero', () => {
  it('shows the person name and review context without action buttons', () => {
    render(
      <MemoryRouter>
        <ScorecardHero
          detail={detail()}
          packet={packet()}
          viewingStage="publish_employees"
        />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: 'Saif Ivna Alam' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: 'Saif Ivna Alam' }).parentElement,
    ).toHaveTextContent('Q3 2026')
    expect(screen.queryByText('Completed review')).toBeNull()
    expect(screen.queryByText('Released to employees')).toBeNull()
    expect(screen.getByText('Reviewer:')).toBeTruthy()
    expect(
      screen.getByText('Aminul Islam Borhan', {
        selector: '.pd-reviews-scorecard__reviewer-name',
      }),
    ).toBeTruthy()
    expect(screen.getByText('Executive')).toBeTruthy()
    expect(screen.getByText('People & Culture')).toBeTruthy()
    expect(screen.getByText('Overall Grading')).toBeTruthy()
    expect(screen.queryByText('Manager grade')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Edit' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Export PDF' })).toBeNull()
  })

  it('hides unpublished official grades from the subject', () => {
    render(
      <MemoryRouter>
        <ScorecardHero
          detail={detail({ overallGrade: 'performing' })}
          packet={packet({
            employeeId: 871,
            status: 'in_calibration',
            selfOverallGrade: 'performing',
            managerOverallGrade: 'exceeding',
            calibratedOverallGrade: 'exceptional',
            publishedOverallGrade: 'exceptional',
          })}
          viewerEmployeeId={871}
          viewingStage="self_review"
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Self-Review Grade')).toBeTruthy()
    expect(screen.getByText('Performing')).toBeTruthy()
    expect(screen.queryByText('Exceeding')).toBeNull()
    expect(screen.queryByText('Exceptional')).toBeNull()
  })

  it('labels the grade from the viewing stage', () => {
    render(
      <MemoryRouter>
        <ScorecardHero
          detail={detail()}
          packet={packet({
            status: 'released_to_employees',
            selfOverallGrade: 'performing',
            managerOverallGrade: 'exceeding',
            publishedOverallGrade: 'exceeding',
          })}
          viewerEmployeeId={1}
          viewingStage="manager_review"
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Manager grade')).toBeTruthy()
    expect(screen.getByText('Exceeding')).toBeTruthy()
  })
})
