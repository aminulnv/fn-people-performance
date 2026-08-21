import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { AuthProvider } from '@/lib/AuthProvider'
import { writeSession } from '@/lib/authApi'
import { RequirePlatformWrite } from './RequirePlatformWrite'

function renderGate(permissions: string[]) {
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
      <MemoryRouter>
        <RequirePlatformWrite>
          <p>Cycle admin content</p>
        </RequirePlatformWrite>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('RequirePlatformWrite', () => {
  it('blocks users without platform.write_all', async () => {
    renderGate(['platform.read_all'])
    expect(
      await screen.findByText(
        /do not have permission to manage cycles/i,
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText('Cycle admin content')).not.toBeInTheDocument()
  })

  it('allows users with platform.write_all', async () => {
    renderGate(['platform.write_all'])
    expect(await screen.findByText('Cycle admin content')).toBeInTheDocument()
  })
})
