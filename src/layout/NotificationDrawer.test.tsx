import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NotificationDrawer } from '@/layout/NotificationDrawer'
import { AuthContext } from '@/lib/authContext'
import { NOTIFICATION_EVENTS } from '@/lib/notifications/catalogue'
import {
  emitNotification,
  resetNotificationsForTests,
} from '@/lib/notifications/store'

vi.mock('@/lib/useCurrentPerson', () => ({
  useCurrentPerson: () => ({
    id: '2',
    name: 'Line Manager',
    email: 'manager@example.com',
    title: 'Manager',
    department: 'People',
    joinDate: '2024-01-01',
    reportIds: ['1'],
    avatarHue: 12,
    blurb: '',
  }),
}))

function renderDrawer() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider
        value={{
          status: 'authenticated',
          user: {
            id: '2',
            email: 'manager@example.com',
            name: 'Line Manager',
            personId: '2',
            permissions: [],
            title: 'Manager',
          },
          session: null,
          signInWithGoogle: async () => {},
          signInWithEmailPassword: async () => {},
          signOut: async () => {},
        }}
      >
        <MemoryRouter>
          <NotificationDrawer />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

describe('NotificationDrawer', () => {
  beforeEach(() => {
    localStorage.clear()
    resetNotificationsForTests()
  })

  afterEach(() => {
    cleanup()
  })

  it('shows live workflow notifications for the signed-in person', async () => {
    emitNotification({
      eventKey: NOTIFICATION_EVENTS.GOAL_SUBMITTED,
      recipientId: '2',
      actorId: '1',
      dedupeKey: 'goal-approval:q3:1:manager',
      destination: '/goals/q3/1',
      variables: {
        employee: 'Aminul',
        count: 3,
        cycle: 'Q3 2026',
      },
    })

    renderDrawer()
    const button = await screen.findByRole('button', {
      name: /Notifications, 1 unread/,
    })
    fireEvent.click(button)

    expect(
      await screen.findByText('Aminul’s goals need approval'),
    ).toBeInTheDocument()
    expect(screen.getByText('Now')).toBeInTheDocument()
    expect(screen.getAllByText('To do').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Reviews' }))
    expect(screen.getByText('Nothing in this filter.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Goals' }))
    expect(
      screen.getByText('Aminul’s goals need approval'),
    ).toBeInTheDocument()
  })
})
