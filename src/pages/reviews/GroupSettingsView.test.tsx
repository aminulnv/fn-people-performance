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

  it('links Full view to the current job', () => {
    const { cycle, group } = sample()
    render(
      <MemoryRouter>
        <GroupSettingsView cycle={cycle} group={group} onClose={() => { }} />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reviews' }))

    expect(screen.getByRole('link', { name: 'Full view' })).toHaveAttribute(
      'href',
      '/cycles/cycle-1/groups/group-1#review',
    )
    expect(screen.queryByText('Goal setting')).not.toBeInTheDocument()
    expect(
      screen.getByRole('switch', { name: 'Enable Manager review' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('switch', { name: 'Enable Goals grade' }),
    ).not.toBeChecked()
    expect(
      screen.getByRole('switch', { name: 'Enable Overall grade' }),
    ).toBeChecked()
    expect(screen.getByText('Goals grade')).toBeInTheDocument()
    expect(screen.getByText('Overall grade')).toBeInTheDocument()
    expect(screen.queryByLabelText('Preset')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Review form' }))

    expect(screen.getByLabelText('Preset')).toBeInTheDocument()
    expect(screen.getByText('What we grade')).toBeInTheDocument()
  })

  it('keeps release dates off the group Reviews page', () => {
    const { cycle, group } = sample()
    render(
      <MemoryRouter>
        <GroupSettingsView cycle={cycle} group={group} onClose={() => {}} />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reviews' }))

    expect(
      screen.getByRole('switch', { name: 'Enable Release to managers' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('switch', { name: 'Enable Release to employees' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByLabelText('Release to managers on'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText('Release to employees on'),
    ).not.toBeInTheDocument()
  })

  it('hides the review form tab until Reviews is open', () => {
    const { cycle, group } = sample()
    render(
      <MemoryRouter>
        <GroupSettingsView cycle={cycle} group={group} onClose={() => { }} />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('button', { name: 'Review form' })).toBeNull()
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

    fireEvent.click(screen.getByRole('button', { name: 'Review form' }))

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
    expect(screen.queryByRole('button', { name: 'Back to group' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Back to cycle' })).toBeInTheDocument()
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
    expect(screen.getByText('Goal window')).toBeInTheDocument()
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
    expect(screen.getByText('When reviews happen')).toBeInTheDocument()
    expect(
      screen.getByRole('switch', { name: 'Enable Manager review' }),
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
      screen.getByRole('switch', { name: 'Enable Manager review' }),
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
    expect(screen.queryByRole('button', { name: 'Back to group' })).toBeNull()
    expect(
      screen.getByRole('switch', { name: 'Enable Manager review' }),
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

    expect(screen.getByText('Senior leadership')).toBeInTheDocument()
    expect(
      screen.getByRole('searchbox', { name: 'Add senior leaders' }),
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
    expect(screen.queryByText('Senior leadership')).not.toBeInTheDocument()
  })
})
