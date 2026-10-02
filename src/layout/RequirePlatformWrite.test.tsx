import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { AuthProvider } from '@/lib/AuthProvider'
import { writeSession } from '@/lib/authApi'
import {
  RequirePlatformRead,
  RequirePlatformWrite,
} from './RequirePlatformWrite'

function renderWithPermissions(
  permissions: string[],
  children: ReactNode,
  email = 'test@example.com',
) {
  writeSession({
    user: {
      id: 'test',
      email,
      name: 'Test User',
      personId: '1',
      permissions,
      title: '',
    },
    signedInAt: '2026-01-01T00:00:00.000Z',
  })

  return render(
    <AuthProvider>
      <MemoryRouter>{children}</MemoryRouter>
    </AuthProvider>,
  )
}

describe('RequirePlatformWrite', () => {
  it('blocks users without platform.write_all', async () => {
    renderWithPermissions(
      ['platform.read_all'],
      <RequirePlatformWrite>
        <p>Cycle admin content</p>
      </RequirePlatformWrite>,
    )
    expect(
      await screen.findByText(
        /do not have permission to make this change/i,
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText('Cycle admin content')).not.toBeInTheDocument()
  })

  it('allows users with platform.write_all', async () => {
    renderWithPermissions(
      ['platform.write_all'],
      <RequirePlatformWrite>
        <p>Cycle admin content</p>
      </RequirePlatformWrite>,
    )
    expect(await screen.findByText('Cycle admin content')).toBeInTheDocument()
  })
})

describe('RequirePlatformRead', () => {
  it('blocks users who are not on the analytics allowlist', async () => {
    renderWithPermissions(
      ['platform.read_all', 'platform.write_all'],
      <RequirePlatformRead>
        <p>Analytics content</p>
      </RequirePlatformRead>,
      'other@nextventures.io',
    )
    expect(
      await screen.findByText(/available to a limited set of users/i),
    ).toBeInTheDocument()
    expect(screen.queryByText('Analytics content')).not.toBeInTheDocument()
  })

  it('allows aminul.islam@nextventures.io', async () => {
    renderWithPermissions(
      [],
      <RequirePlatformRead>
        <p>Analytics content</p>
      </RequirePlatformRead>,
      'aminul.islam@nextventures.io',
    )
    expect(await screen.findByText('Analytics content')).toBeInTheDocument()
  })
})
