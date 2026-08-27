import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DropdownMenu } from './DropdownMenu'

afterEach(cleanup)

describe('DropdownMenu', () => {
  it('opens the menu on hover', () => {
    const onSelect = vi.fn()
    render(
      <DropdownMenu
        label="More Actions"
        items={[{ id: 'duplicate', label: 'Duplicate', onSelect }]}
      />,
    )

    expect(
      screen.queryByRole('menuitem', { name: 'Duplicate' }),
    ).not.toBeInTheDocument()

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'More Actions' }).closest('.pd-menu')!)

    expect(screen.getByRole('menuitem', { name: 'Duplicate' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Duplicate' }))
    expect(onSelect).toHaveBeenCalledTimes(1)
  })
})
