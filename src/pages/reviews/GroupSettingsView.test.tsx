import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { buildDefaultStagesConfig } from '@/lib/reviews/demoData'
import { resetReviewsStoreForTests } from '@/lib/reviews/store'
import type { CycleGroup, ReviewCycle } from '@/lib/reviews/types'
import { GroupSettingsView } from './GroupSettingsView'

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
  resetReviewsStoreForTests()
})

function sample(): { cycle: ReviewCycle; group: CycleGroup } {
  const settings = {
    reviewTypes: {
      line_manager: true,
      self: false,
      upwards: false,
      peer: false,
      functional_manager: false,
    },
    goalCountPolicy: {
      minimumRequired: 3,
      recommendedMinimum: 4,
      recommendedMaximum: 6,
      maximumAllowed: null,
    },
    postWindowGoalPolicy: 'hard_stop' as const,
    excludedEmployeeIds: [],
    autoScorecardGeneration: true,
  }
  const group: CycleGroup = {
    id: 'group-1',
    cycleId: 'cycle-1',
    name: 'Everyone',
    memberIds: [1],
    settings,
    stagesConfig: buildDefaultStagesConfig('2026-07-01', '2026-09-30'),
    calibration: {
      calibrationMode: 'department',
      gradeRecommendation: 'manager_average',
      gradeDistribution: {
        exceptional: 5,
        exceeding: 15,
        performing: 60,
        developing: 15,
        unsatisfactory: 5,
      },
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    version: 1,
  }
  return {
    group,
    cycle: {
      id: 'cycle-1',
      name: 'Q3 2026',
      type: 'regular',
      startDate: '2026-07-01',
      endDate: '2026-09-30',
      stagesConfig: group.stagesConfig,
      settings,
      calibration: group.calibration,
      groups: [group],
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  }
}

describe('GroupSettingsView', () => {
  it('shows the people count instead of a needs-people chip', () => {
    const { cycle, group } = sample()
    group.memberIds = []
    cycle.groups = [group]

    render(
      <MemoryRouter>
        <GroupSettingsView cycle={cycle} group={group} onClose={() => {}} />
      </MemoryRouter>,
    )

    expect(screen.getByLabelText('Group name')).toHaveValue('Everyone')
    expect(screen.getByText('0 people')).toBeInTheDocument()
    expect(screen.queryByText('Needs people')).not.toBeInTheDocument()
  })

  it('opens review settings without a full-view link', () => {
    const { cycle, group } = sample()
    render(
      <MemoryRouter>
        <GroupSettingsView cycle={cycle} group={group} onClose={() => { }} />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reviews' }))

    expect(screen.queryByRole('link', { name: 'Full View' })).not.toBeInTheDocument()
    const dialog = screen.getByRole('dialog')
    expect(dialog.querySelector('.pd-settings-panel__chrome')).toContainElement(
      screen.getByRole('button', { name: 'Save' }),
    )
    expect(screen.queryByText('Goal Setting')).not.toBeInTheDocument()
    expect(
      screen.getByRole('switch', { name: 'Enable Manager Review' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('switch', { name: 'Enable HOD / HRBP Calibration' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('switch', { name: 'Enable SLT Calibration' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('switch', { name: 'Enable Goals Grade' }),
    ).not.toBeChecked()
    expect(
      screen.getByRole('switch', { name: 'Enable Overall Grade' }),
    ).toBeChecked()
    expect(screen.getByText('Goals Grade')).toBeInTheDocument()
    expect(screen.getByText('Overall Grade')).toBeInTheDocument()
    expect(screen.queryByLabelText('Preset')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Review Form' }))

    expect(screen.getByLabelText('Preset')).toBeInTheDocument()
    expect(screen.getByText('What We Grade')).toBeInTheDocument()
  })

  it('keeps publish dates on the release stages', () => {
    const { cycle, group } = sample()
    render(
      <MemoryRouter>
        <GroupSettingsView cycle={cycle} group={group} onClose={() => {}} />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reviews' }))

    expect(
      screen.queryByRole('heading', { name: 'Publish results' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('switch', { name: 'Enable Publish to Managers First' }),
    ).not.toBeChecked()
    expect(
      screen.queryByLabelText('Publish to managers from'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('switch', {
        name: 'Enable Publish to Everyone',
      }),
    ).not.toBeInTheDocument()
    expect(screen.getByLabelText('Publish to everyone from')).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('switch', { name: 'Enable Publish to Managers First' }),
    )

    expect(screen.getByLabelText('Publish to managers from')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Publish to Managers First Now' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByLabelText('Release To Managers On'),
    ).not.toBeInTheDocument()
  })

  it('hides the review form tab until Reviews is open', () => {
    const { cycle, group } = sample()
    render(
      <MemoryRouter>
        <GroupSettingsView cycle={cycle} group={group} onClose={() => { }} />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('button', { name: 'Review Form' })).toBeNull()
  })

  it('opens the review form tab on the full page Reviews job', () => {
    const { cycle, group } = sample()
    render(
      <MemoryRouter initialEntries={['/cycles/cycle-1/groups/group-1#review']}>
        <GroupSettingsView
          cycle={cycle}
          group={group}
          variant="page"
          onClose={() => { }}
        />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reviews' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.queryByLabelText('Preset')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Review Form' }))

    expect(screen.getByLabelText('Preset')).toBeInTheDocument()
  })

  it('opens a job from the hash on the full page', () => {
    const { cycle, group } = sample()
    render(
      <MemoryRouter initialEntries={['/cycles/cycle-1/groups/group-1#goals']}>
        <GroupSettingsView
          cycle={cycle}
          group={group}
          variant="page"
          onClose={() => { }}
        />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Group name')).toHaveValue('Everyone')
    expect(screen.getByText('1 person')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Goals' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.queryByRole('button', { name: 'Back To Group' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Back To Cycle' })).toBeInTheDocument()
  })

  it('unlocks goal settings from the Goals page', () => {
    const { cycle, group } = sample()
    group.stagesConfig = buildDefaultStagesConfig(
      '2029-01-01',
      '2029-02-15',
      'annual_appraisal',
      'annual-2028',
    )
    cycle.periodKey = 'annual-2028'
    cycle.stagesConfig = group.stagesConfig

    render(
      <MemoryRouter>
        <GroupSettingsView cycle={cycle} group={group} onClose={() => { }} />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Goals' }))

    expect(screen.getByRole('switch', { name: 'Enable Goals' })).not.toBeChecked()
    expect(screen.getByText('Goal Window')).toBeInTheDocument()
    expect(screen.getByLabelText('Opens')).toBeDisabled()

    fireEvent.click(screen.getByRole('switch', { name: 'Enable Goals' }))

    expect(screen.getByRole('switch', { name: 'Enable Goals' })).toBeChecked()
    expect(screen.getByLabelText('Opens')).toBeEnabled()
  })

  it('unlocks review settings from the Reviews page', () => {
    const { cycle, group } = sample()
    group.stagesConfig = buildDefaultStagesConfig(
      '2026-10-01',
      '2026-12-31',
      'quarterly_checkin',
      'q4-2026',
    )
    cycle.periodKey = 'q4-2026'
    cycle.stagesConfig = group.stagesConfig

    render(
      <MemoryRouter>
        <GroupSettingsView cycle={cycle} group={group} onClose={() => { }} />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reviews' }))

    expect(screen.getByRole('switch', { name: 'Enable Reviews' })).not.toBeChecked()
    expect(screen.getByText('When Reviews Happen')).toBeInTheDocument()
    expect(
      screen.getByRole('switch', { name: 'Enable Manager Review' }),
    ).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Calibration' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Calibration' })).toHaveAttribute(
      'title',
      'Turn on Reviews to use Calibration.',
    )

    fireEvent.click(screen.getByRole('switch', { name: 'Enable Reviews' }))

    expect(screen.getByRole('switch', { name: 'Enable Reviews' })).toBeChecked()
    expect(
      screen.getByRole('switch', { name: 'Enable Manager Review' }),
    ).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Calibration' })).not.toHaveAttribute(
      'aria-disabled',
    )
  })

  it('keeps the top nav when switching sections', () => {
    const { cycle, group } = sample()
    render(
      <MemoryRouter>
        <GroupSettingsView cycle={cycle} group={group} onClose={() => { }} />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reviews' }))

    expect(screen.getByRole('navigation', { name: 'Group settings' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Back To Group' })).toBeNull()
    expect(
      screen.getByRole('switch', { name: 'Enable Manager Review' }),
    ).toBeInTheDocument()
  })

  it('lets the user pick senior leadership on Calibration', () => {
    const { cycle, group } = sample()
    render(
      <MemoryRouter>
        <GroupSettingsView cycle={cycle} group={group} onClose={() => { }} />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Calibration' }))

    expect(screen.getByText('When Calibration Happens')).toBeInTheDocument()
    expect(
      screen.getByRole('switch', { name: 'Enable HOD / HRBP Calibration' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('switch', { name: 'Enable SLT Calibration' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Senior Leadership')).toBeInTheDocument()
    expect(
      screen.getByRole('searchbox', { name: 'Add Senior Leaders' }),
    ).toBeInTheDocument()
  })

  it('keeps the Goals tab on an annual cycle so Goals can be turned on there', () => {
    const { cycle, group } = sample()
    group.stagesConfig = buildDefaultStagesConfig(
      '2029-01-01',
      '2029-02-15',
      'annual_appraisal',
      'annual-2028',
    )
    cycle.periodKey = 'annual-2028'
    cycle.stagesConfig = group.stagesConfig

    render(
      <MemoryRouter>
        <GroupSettingsView cycle={cycle} group={group} onClose={() => { }} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'People' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Goals' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reviews' })).toBeInTheDocument()
    expect(screen.queryByText('What they do')).not.toBeInTheDocument()
    for (const name of ['People', 'Goals', 'Reviews', 'Calibration'] as const) {
      expect(
        screen.getByRole('button', { name }).querySelector('svg'),
      ).toBeInTheDocument()
    }
  })

  it('keeps the Reviews tab on a Q4 cycle so Reviews can be turned on there', () => {
    const { cycle, group } = sample()
    group.stagesConfig = buildDefaultStagesConfig(
      '2026-10-01',
      '2026-12-31',
      'quarterly_checkin',
      'q4-2026',
    )
    cycle.periodKey = 'q4-2026'
    cycle.stagesConfig = group.stagesConfig

    render(
      <MemoryRouter>
        <GroupSettingsView cycle={cycle} group={group} onClose={() => { }} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Goals' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reviews' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Calibration' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Calibration' })).toHaveAttribute(
      'title',
      'Turn on Reviews to use Calibration.',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Calibration' }))
    expect(screen.queryByText('Senior Leadership')).not.toBeInTheDocument()
  })
})
