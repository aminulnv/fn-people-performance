import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '@/lib/authContext'
import { SEARCH_RECENTS_KEY } from '@/lib/search'
import { GlobalSearchProvider } from './GlobalSearchProvider'
import { TopBarSearch } from './TopBarSearch'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})

afterEach(() => {
  cleanup()
  localStorage.removeItem(SEARCH_RECENTS_KEY)
})

function renderProvider() {
  return render(
    <AuthContext.Provider
      value={{
        status: 'authenticated',
        user: {
          id: '1',
          email: 'ada@example.com',
          name: 'Ada Lovelace',
          personId: '1',
          permissions: ['platform.read_all'],
          title: 'Engineer',
        },
        session: null,
        signInWithGoogle: async () => {},
        signInWithEmailPassword: async () => {},
        signOut: async () => {},
      }}
    >
      <MemoryRouter>
        <GlobalSearchProvider>
          <TopBarSearch />
          <input aria-label="Page field" />
        </GlobalSearchProvider>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('GlobalSearchProvider', () => {
  it('opens search from slash when the page is not a typing target', () => {
    renderProvider()
    fireEvent.keyDown(window, { key: '/' })
    expect(screen.getByRole('dialog', { name: 'Search the company' })).toBeInTheDocument()
  })

  it('leaves slash alone inside a text field', () => {
    renderProvider()
    const field = screen.getByLabelText('Page field')
    field.focus()
    fireEvent.keyDown(field, { key: '/' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('toggles search with meta+k', () => {
    renderProvider()
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens search from the top-bar button', () => {
    renderProvider()
    fireEvent.click(screen.getByRole('button', { name: 'Search the company' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
