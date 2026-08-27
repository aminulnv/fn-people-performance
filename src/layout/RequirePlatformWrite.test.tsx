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

function renderWithPermissions(permissions: string[], children: ReactNode) {
  writeSession({
    user: {
      id: 'test',
      email: 'test@example.com',
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
        /do not have permission to manage cycles/i,
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
  it('blocks users who are not Settings admins', async () => {
    renderWithPermissions(
      [],
      <RequirePlatformRead>
        <p>Analytics content</p>
      </RequirePlatformRead>,
    )
    expect(
      await screen.findByText(/available to administrators/i),
    ).toBeInTheDocument()
    expect(screen.queryByText('Analytics content')).not.toBeInTheDocument()
  })

  it('allows Settings admins with platform.read_all', async () => {
    renderWithPermissions(
      ['platform.read_all'],
      <RequirePlatformRead>
        <p>Analytics content</p>
      </RequirePlatformRead>,
    )
    expect(await screen.findByText('Analytics content')).toBeInTheDocument()
  })
})
