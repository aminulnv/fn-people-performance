import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { GlobalSearchPalette } from './GlobalSearchPalette'
import { SEARCH_RECENTS_KEY, type SearchItem } from '@/lib/search'

const items: SearchItem[] = [
  {
    id: 'person:1',
    kind: 'person',
    scope: 'people',
    label: 'Ada Lovelace',
    description: 'Engineer · Platform',
    keywords: ['1', 'ada@example.com'],
    path: '/people/1',
    avatarName: 'Ada Lovelace',
  },
  {
    id: 'page:goals',
    kind: 'page',
    scope: 'pages',
    label: 'Goals',
    keywords: ['/goals'],
    path: '/goals',
  },
  {
    id: 'action:my-goals',
    kind: 'action',
    scope: 'actions',
    label: 'Go To My Goals',
    keywords: ['goals'],
    path: '/goals/q3/1',
  },
]

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

function renderPalette(onClose = vi.fn()) {
  render(
    <MemoryRouter>
      <GlobalSearchPalette open onClose={onClose} items={items} />
    </MemoryRouter>,
  )
  return onClose
}

describe('GlobalSearchPalette', () => {
  it('filters results and highlights the match', () => {
    renderPalette()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Ada' } })

    expect(screen.getByRole('option', { name: /Ada Lovelace/ })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Goals' })).toBeNull()
    expect(document.querySelector('.pd-global-search__mark')?.textContent).toBe(
      'Ada',
    )
  })

  it('moves the People filter with Tab and hides other scopes', () => {
    renderPalette()
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Tab' })

    expect(screen.getByRole('button', { name: 'People' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('option', { name: /Ada Lovelace/ })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Goals' })).toBeNull()
  })

  it('opens the active result with Enter and remembers it', () => {
    const onClose = renderPalette()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Ada' } })
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' })

    expect(onClose).toHaveBeenCalled()
    expect(localStorage.getItem(SEARCH_RECENTS_KEY)).toContain('person:1')
  })
})
