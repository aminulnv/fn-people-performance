import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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
          stages={[
            { id: 'self_review', enabled: true },
            { id: 'manager_review', enabled: true },
            { id: 'calibration_hod_hrbp', enabled: true },
          ]}
          viewerEmployeeId={871}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Self-review grade')).toBeTruthy()
    expect(screen.getByText('Performing')).toBeTruthy()
    expect(screen.queryByText('Exceeding')).toBeNull()
    expect(screen.queryByText('Exceptional')).toBeNull()
  })

  it('lets the viewer open a finished stage', () => {
    const onViewStage = vi.fn()
    render(
      <MemoryRouter>
        <ScorecardHero
          detail={detail()}
          packet={packet({
            status: 'in_calibration',
            selfOverallGrade: 'performing',
            managerOverallGrade: 'exceeding',
          })}
          stages={[
            { id: 'self_review', enabled: true },
            { id: 'manager_review', enabled: true },
            { id: 'calibration_hod_hrbp', enabled: true },
          ]}
          viewerEmployeeId={1}
          onViewStage={onViewStage}
        />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Self-review' }))
    expect(onViewStage).toHaveBeenCalledWith('self_review')
    expect(screen.getByRole('button', { name: 'Calibration' })).toHaveAttribute(
      'aria-current',
      'step',
    )
  })

  it('places the stage map above the person name', () => {
    renderHero({ status: 'manager_submitted' })

    const stages = screen.getByRole('list', { name: 'Review stages' })
    const name = screen.getByRole('heading', { name: 'Saif Ivna Alam' })
    expect(stages.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(stages.closest('.pd-reviews-scorecard__hero')).toBeNull()
  })

  it('lets the stage row carry status instead of repeating manager-review chips', () => {
    renderHero({ status: 'manager_submitted' })

    expect(screen.queryByText('In progress')).toBeNull()
    expect(screen.queryByText('Manager review submitted')).toBeNull()
    const managerStep = screen.getByText('Manager review').closest('li')
    const publishedStep = screen.getByText('Published').closest('li')
    expect(managerStep?.className).toContain('is-done')
    expect(publishedStep?.className).toContain('is-active')
    expect(
      managerStep?.querySelector('.pd-reviews-scorecard__step-dot svg'),
    ).toBeTruthy()
    expect(
      publishedStep?.querySelector('.pd-reviews-scorecard__step-dot svg'),
    ).toBeTruthy()
  })
})
