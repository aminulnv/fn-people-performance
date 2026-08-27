import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GoalActionsMenu } from './GoalActionsMenu'

afterEach(cleanup)

function renderMenu(
  props: Partial<Parameters<typeof GoalActionsMenu>[0]> = {},
) {
  return render(
    <MemoryRouter>
      <GoalActionsMenu
        variant="menu"
        label="More Actions For Ship quality"
        onDuplicate={vi.fn()}
        onCascade={vi.fn()}
        canCascade
        canRemove
        onRemove={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  )
}

describe('GoalActionsMenu', () => {
  it('keeps labeled toolbar actions on the default layout', () => {
    render(
      <MemoryRouter>
        <GoalActionsMenu onDuplicate={vi.fn()} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Duplicate' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'More Actions' }),
    ).not.toBeInTheDocument()
  })

  it('puts extra window actions in the 3-dot menu', () => {
    const onEdit = vi.fn()
    renderMenu({
      extraItems: [
        {
          id: 'edit',
          label: 'Edit',
          onSelect: onEdit,
        },
      ],
    })

    fireEvent.mouseEnter(
      screen.getByRole('button', { name: 'More Actions For Ship quality' })
        .closest('.pd-menu')!,
    )
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }))
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it('hides table actions behind a 3-dot menu', () => {
    const onDuplicate = vi.fn()
    renderMenu({ onDuplicate })

    expect(screen.queryByRole('button', { name: 'Duplicate' })).not.toBeInTheDocument()
    fireEvent.mouseEnter(
      screen.getByRole('button', { name: 'More Actions For Ship quality' })
        .closest('.pd-menu')!,
    )
    fireEvent.click(screen.getByRole('menuitem', { name: 'Duplicate' }))
    expect(onDuplicate).toHaveBeenCalledTimes(1)
  })
})
