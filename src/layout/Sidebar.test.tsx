import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { cleanup, render, screen } from '@testing-library/react'
import { Target } from 'lucide-react'
import { Sidebar } from './Sidebar'

afterEach(cleanup)

describe('Sidebar nav badge', () => {
  it('shows the pending-approval count on the Goals item', () => {
    render(
      <MemoryRouter>
        <Sidebar
          navItems={[
            {
              path: '/goals',
              label: 'Goals',
              icon: Target,
              badgeCount: 1,
            },
          ]}
          brand={{ name: 'FN', icon: Target }}
        />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('link', { name: 'Goals, 1 item needs attention' }),
    ).toHaveTextContent('1')
  })

  it('hides the badge when nothing is pending', () => {
    render(
      <MemoryRouter>
        <Sidebar
          navItems={[{ path: '/goals', label: 'Goals', icon: Target }]}
          brand={{ name: 'FN', icon: Target }}
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Goals' })).not.toHaveTextContent(
      '1',
    )
  })
})
