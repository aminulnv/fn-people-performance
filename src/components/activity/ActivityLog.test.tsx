import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { ActivityLog } from '@/components/activity/ActivityLog'
import {
  ActivityLogDrawer,
  ActivityLogTrigger,
} from '@/components/activity/ActivityLogDrawer'
import type { ActivityEvent } from '@/lib/activity/types'

afterEach(cleanup)

function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  )
}

describe('ActivityLog', () => {
  it('groups events by day without looking like a CTA', () => {
    const events: ActivityEvent[] = [
      {
        id: '1',
        eventKey: 'goal_submission.submitted',
        entityType: 'goal_submission',
        entityId: 'q3:1',
        actorType: 'user',
        actorName: 'Api Singha',
        source: 'api',
        summary: 'Submitted goals for approval',
        changes: [],
        metadata: {},
        occurredAt: '2026-08-17T10:00:00.000Z',
      },
    ]
    render(<ActivityLog events={events} />)
    expect(screen.getByText('Submitted goals')).toBeInTheDocument()
    expect(screen.getByText('Api Singha')).toBeInTheDocument()
    expect(screen.getByText('Goals')).toBeInTheDocument()
    expect(screen.getByLabelText('Api Singha')).toBeInTheDocument()
  })

  it('shows the actor photo when an avatar URL is present', () => {
    const events: ActivityEvent[] = [
      {
        id: '5',
        eventKey: 'goal.created',
        entityType: 'goal',
        entityId: 'g1',
        actorType: 'user',
        actorName: 'Aminul Islam Borhan',
        actorEmployeeId: 12,
        actorAvatarUrl: 'https://cdn.example.com/aminul.jpg',
        source: 'api',
        summary: 'Created goal “test”',
        changes: [],
        metadata: {},
        occurredAt: '2026-08-25T00:27:00.000Z',
      },
    ]
    render(<ActivityLog events={events} />)
    const photo = screen.getByRole('img', { name: 'Aminul Islam Borhan' })
      .querySelector('img')
    expect(photo).toHaveAttribute('src', 'https://cdn.example.com/aminul.jpg')
  })

  it('shows who the actor was delegating for when hovering their name', async () => {
    const events: ActivityEvent[] = [
      {
        id: '2',
        eventKey: 'goal_submission.approved',
        entityType: 'goal_submission',
        entityId: 'q3:1',
        actorType: 'user',
        actorName: 'Peer Manager',
        source: 'api',
        summary: 'Approved goals',
        changes: [],
        metadata: {
          coveringForName: 'Ada Manager',
          coveringForAvatarUrl: '',
        },
        occurredAt: '2026-08-17T10:00:00.000Z',
      },
    ]
    render(<ActivityLog events={events} />)
    fireEvent.mouseEnter(screen.getByText('Peer Manager'))
    const tip = await screen.findByRole('tooltip')
    expect(tip).toHaveTextContent('Delegating on behalf of')
    expect(tip).toHaveTextContent('Ada Manager')
    expect(screen.getByLabelText('Ada Manager')).toBeInTheDocument()
  })

  it('shows progress as a short label and from-to values', () => {
    const title =
      'Build Performance Platform Phase 1 | Q3 Build, Q4 Testing, Q1 2027 Launch'
    const events: ActivityEvent[] = [
      {
        id: '6',
        eventKey: 'goal.metric_progress_updated',
        entityType: 'goal',
        entityId: 'g1',
        actorType: 'user',
        actorName: 'Aminul Islam Borhan',
        source: 'api',
        summary: `Updated “${title}” on “${title}”`,
        changes: [{ field: title, from: 20, to: 50 }],
        metadata: { title },
        occurredAt: '2026-09-01T04:45:00.000Z',
      },
    ]
    render(<ActivityLog events={events} />)
    expect(screen.queryByText('Updated metric progress')).not.toBeInTheDocument()
    expect(screen.getByText('Progress')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument()
    expect(screen.queryByText(title)).not.toBeInTheDocument()
    expect(screen.queryByText(/Updated progress on/)).not.toBeInTheDocument()
  })

  it('shows human field changes instead of raw JSON', () => {
    const events: ActivityEvent[] = [
      {
        id: '3',
        eventKey: 'goal.updated',
        entityType: 'goal',
        entityId: 'g1',
        actorType: 'user',
        actorName: 'Aminul Islam Borhan',
        source: 'api',
        summary: 'Updated goal “This is the test world.”',
        changes: [
          {
            field: 'goal',
            from: {
              description: 'This is the test world.',
              weight: 0,
              measurements: [],
            },
            to: {
              description: 'This is the test world.',
              weight: 100,
              measurements: [],
            },
          },
        ],
        metadata: {},
        occurredAt: '2026-08-24T17:16:00.000Z',
      },
    ]
    render(<ActivityLog events={events} />)
    expect(screen.queryByText('Updated a goal')).not.toBeInTheDocument()
    expect(screen.getByText('Weight')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.queryByText(/\{"weight"/)).not.toBeInTheDocument()
  })

  it('bundles rapid goal edits and hides repeated actor rows', () => {
    const events: ActivityEvent[] = [
      {
        id: '3',
        eventKey: 'goal.updated',
        entityType: 'goal',
        entityId: 'g1',
        actorType: 'user',
        actorName: 'Aminul Islam Borhan',
        actorEmployeeId: 12,
        source: 'api',
        summary: 'Updated goal',
        changes: [
          {
            field: 'goal',
            from: { description: 'Grow NPS', weight: 7, measurements: [] },
            to: { description: 'Grow NPS', weight: 16, measurements: [] },
          },
        ],
        metadata: {},
        occurredAt: '2026-09-01T05:09:12.000Z',
      },
      {
        id: '2',
        eventKey: 'goal.updated',
        entityType: 'goal',
        entityId: 'g1',
        actorType: 'user',
        actorName: 'Aminul Islam Borhan',
        actorEmployeeId: 12,
        source: 'api',
        summary: 'Updated goal',
        changes: [
          {
            field: 'goal',
            from: { description: 'Grow NPS', weight: 7, measurements: [] },
            to: { description: 'Grow NPS', weight: 11, measurements: [] },
          },
        ],
        metadata: {},
        occurredAt: '2026-09-01T05:09:40.000Z',
      },
    ]
    render(<ActivityLog events={events} scoped />)
    expect(screen.getByText('2 edits')).toBeInTheDocument()
    expect(screen.getByText('16%')).toBeInTheDocument()
    expect(screen.getByText('11%')).toBeInTheDocument()
    expect(screen.queryByText('Goal')).not.toBeInTheDocument()
    expect(screen.getAllByText('Aminul Islam Borhan')).toHaveLength(1)
  })

  it('names a late submission in plain language', () => {
    const events: ActivityEvent[] = [
      {
        id: '4',
        eventKey: 'goal_submission.submitted',
        entityType: 'goal_submission',
        entityId: 'q3:1',
        actorType: 'user',
        actorName: 'Sarah Chen',
        source: 'api',
        summary: 'Submitted goals after the deadline',
        changes: [{ field: 'late', from: false, to: true }],
        metadata: { late: true },
        occurredAt: '2026-08-24T17:16:00.000Z',
      },
    ]
    render(<ActivityLog events={events} />)
    expect(
      screen.getAllByText('Submitted goals after the deadline').length,
    ).toBeGreaterThan(0)
    expect(screen.getByText('Late')).toBeInTheDocument()
    expect(screen.getByText('Yes')).toBeInTheDocument()
  })
})

describe('ActivityLogDrawer', () => {
  it('opens a side sheet with the same chrome as other drawers', () => {
    renderWithQuery(
      <ActivityLogDrawer
        open
        onClose={() => {}}
        title="Goal activity"
        filters={{}}
      />,
    )
    const dialog = screen.getByRole('dialog', { name: 'Goal activity' })
    expect(dialog).toHaveClass('pd-activity-drawer__panel')
    expect(screen.getByText('Activity Log')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Goal activity' }),
    ).toBeInTheDocument()
  })
})

describe('ActivityLogTrigger', () => {
  it('exposes a quiet text action', () => {
    const onClick = vi.fn()
    renderWithQuery(
      <ActivityLogTrigger label="View Activity" onClick={onClick} />,
    )
    const button = screen.getByRole('button', { name: 'View Activity' })
    expect(button.className).toContain('pd-activity-link')
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })
})
