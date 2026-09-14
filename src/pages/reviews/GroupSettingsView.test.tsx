import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { buildDefaultStagesConfig } from '@/lib/reviews/demoData'
import { resetReviewsStoreForTests } from '@/lib/reviews/store'
import type { CycleGroup, ReviewCycle } from '@/lib/reviews/types'
import { GroupSettingsView } from './GroupSettingsView'

vi.mock('./GroupMembersEditor', () => ({
  GroupMembersEditor: ({
    onDirtyChange,
    searchLabel,
    pane = 'browse',
    onPaneChange,
  }: {
    onDirtyChange?: (dirty: boolean) => void
    searchLabel?: string
    pane?: 'browse' | 'selected'
    onPaneChange?: (pane: 'browse' | 'selected') => void
  }) => (
    <>
      <div role="group" aria-label="People selection view">
        <button
          type="button"
          aria-pressed={pane === 'selected'}
          onClick={() => onPaneChange?.('selected')}
        >
          Added
        </button>
        <button
          type="button"
          aria-pressed={pane === 'browse'}
          onClick={() => onPaneChange?.('browse')}
        >
          Not added
        </button>
      </div>
      <button type="button" onClick={() => onDirtyChange?.(true)}>
        Stage people change
      </button>
      {searchLabel ? <input type="search" aria-label={searchLabel} /> : null}
    </>
  ),
}))

if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
  }
}

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
        <GroupSettingsView cycle={cycle} group={group} onClose={() => { }} />
      </MemoryRouter>,
    )

    expect(screen.getByLabelText('Group name')).toHaveValue('Everyone')
    expect(screen.getByText('0 people')).toBeInTheDocument()
    expect(screen.queryByText('Needs people')).not.toBeInTheDocument()
  })

  it('warns before leaving unsaved people changes', () => {
    const { cycle, group } = sample()
    render(
      <MemoryRouter>
        <GroupSettingsView cycle={cycle} group={group} onClose={() => { }} />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Stage people change' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reviews' }))

    expect(
      screen.getByRole('heading', { name: 'Discard people changes?' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'People' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }))

    expect(screen.getByRole('button', { name: 'Reviews' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('warns before closing with unsaved people changes', () => {
    const { cycle, group } = sample()
    const onClose = vi.fn()
    render(
      <MemoryRouter>
        <GroupSettingsView cycle={cycle} group={group} onClose={onClose} />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Stage people change' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(
      screen.getByRole('heading', { name: 'Discard people changes?' }),
    ).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }))

    expect(onClose).toHaveBeenCalledOnce()
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

    fireEvent.click(screen.getByRole('button', { name: /advanced/i }))

    expect(
      screen.getByRole('switch', { name: 'Enable Goals Grading' }),
    ).toBeChecked()
    expect(
      screen.getByRole('switch', { name: 'Enable Overall Grading' }),
    ).not.toBeChecked()
    expect(screen.getByText('Goals Grading')).toBeInTheDocument()
    expect(screen.getByText('Overall Grading')).toBeInTheDocument()
    expect(screen.queryByLabelText('Preset')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Review Form' }))

    expect(screen.queryByLabelText('Preset')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Builder/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Allocated form')).toBeInTheDocument()
  })

  it('keeps publish dates on the release stages', () => {
    const { cycle, group } = sample()
    render(
      <MemoryRouter>
        <GroupSettingsView cycle={cycle} group={group} onClose={() => { }} />
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

  it('opens the review form tab on the full page Reviews job', async () => {
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
    expect(screen.queryByRole('button', { name: 'Preset' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Review Form' }))

    expect(screen.queryByRole('button', { name: 'Preset' })).toBeNull()
    expect(screen.getByRole('link', { name: /Builder/i })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Reviews' })).toBeInTheDocument()
  })

  it('opens people panes from the hash on the full page', () => {
    const { cycle, group } = sample()
    render(
      <MemoryRouter
        initialEntries={['/cycles/cycle-1/groups/group-1#people/added']}
      >
        <GroupSettingsView
          cycle={cycle}
          group={group}
          variant="page"
          onClose={() => { }}
        />
      </MemoryRouter>,
    )

    const peopleView = screen.getByRole('group', {
      name: 'People selection view',
    })
    expect(
      within(peopleView).getByRole('button', { name: /^Added/i }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      within(peopleView).getByRole('button', { name: /^Not added/i }),
    ).toHaveAttribute('aria-pressed', 'false')
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
    expect(screen.getByText('Window')).toBeInTheDocument()
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
    expect(screen.queryByText('When Reviews Happen')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Review path')).not.toBeInTheDocument()
    expect(
      screen.getByRole('switch', { name: 'Enable Manager Review' }),
    ).toBeDisabled()
    expect(screen.queryByLabelText('Opens')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Goes live')).not.toBeInTheDocument()
    expect(screen.queryByText('Goes live')).not.toBeInTheDocument()
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
    expect(screen.getByText('Goes live')).toBeInTheDocument()
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

  it('keeps the calibration section as a placeholder', () => {
    const { cycle, group } = sample()
    render(
      <MemoryRouter>
        <GroupSettingsView cycle={cycle} group={group} onClose={() => { }} />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Calibration' }))

    expect(screen.getByText('Under development')).toBeInTheDocument()
    expect(
      screen.queryByRole('switch', { name: 'Enable HOD / HRBP Calibration' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('switch', { name: 'Enable SLT Calibration' }),
    ).not.toBeInTheDocument()
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
