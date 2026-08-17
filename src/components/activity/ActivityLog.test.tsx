import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { ActivityLog } from '@/components/activity/ActivityLog'
import { ActivityLogTrigger } from '@/components/activity/ActivityLogDrawer'
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
  })
})

describe('ActivityLogTrigger', () => {
  it('exposes a quiet text action', () => {
    const onClick = vi.fn()
    renderWithQuery(
      <ActivityLogTrigger label="View activity" onClick={onClick} />,
    )
    const button = screen.getByRole('button', { name: 'View activity' })
    expect(button.className).toContain('pd-activity-link')
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })
})
