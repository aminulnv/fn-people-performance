import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Target } from 'lucide-react'
import { GoalCreateDrawer } from './GoalCreateDrawer'

const okrSideSheet = {
  tabLabel: 'View OKRs',
  tabIcon: Target,
  label: 'Company, department, and wing OKRs',
  content: <p>Improve customer outcomes</p>,
}

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
})

describe('GoalCreateDrawer', () => {
  it('renders goal creation content in a dialog', () => {
    render(
      <GoalCreateDrawer onClose={() => undefined}>
        <p>Goal fields</p>
      </GoalCreateDrawer>,
    )

    expect(screen.getByRole('dialog', { name: 'Add goal' })).toHaveTextContent(
      'Goal fields',
    )
  })

  it('sits a ribbon above the padded goal body', () => {
    render(
      <GoalCreateDrawer
        ribbon={<p role="status">Action required</p>}
        onClose={() => undefined}
      >
        <p>Goal fields</p>
      </GoalCreateDrawer>,
    )

    const dialog = screen.getByRole('dialog', { name: 'Add goal' })
    const ribbon = dialog.querySelector('.pd-goals-drawer__ribbon')
    const body = dialog.querySelector('.pd-goals-drawer__body')
    expect(ribbon).toHaveTextContent('Action required')
    expect(body).toHaveTextContent('Goal fields')
    expect(body).not.toHaveTextContent('Action required')
  })

  it('closes when Escape is pressed', () => {
    const onClose = vi.fn()
    render(
      <GoalCreateDrawer onClose={onClose}>
        <p>Goal fields</p>
      </GoalCreateDrawer>,
    )

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('leaves the drawer open when another dialog is already showing', () => {
    const onClose = vi.fn()
    const nested = document.createElement('dialog')
    nested.setAttribute('open', '')
    document.body.append(nested)
    try {
      render(
        <GoalCreateDrawer onClose={onClose}>
          <p>Goal fields</p>
        </GoalCreateDrawer>,
      )

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(onClose).not.toHaveBeenCalled()
    } finally {
      nested.remove()
    }
  })

  it('closes when the background is clicked', () => {
    const onClose = vi.fn()
    render(
      <GoalCreateDrawer onClose={onClose}>
        <p>Goal fields</p>
      </GoalCreateDrawer>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cancel adding goal' }))

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('uses view-specific accessible labels when provided', () => {
    render(
      <GoalCreateDrawer
        label="View Improve delivery"
        closeLabel="Close goal"
        onClose={() => undefined}
      >
        <p>Goal details</p>
      </GoalCreateDrawer>,
    )

    expect(
      screen.getByRole('dialog', { name: 'View Improve delivery' }),
    ).toBeInTheDocument()
  })

  it('widens with the keyboard from its resize handle', () => {
    render(
      <GoalCreateDrawer onClose={() => undefined}>
        <p>Goal details</p>
      </GoalCreateDrawer>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Add goal' })

    fireEvent.keyDown(
      screen.getByRole('separator', { name: 'Resize goal panel' }),
      { key: 'ArrowLeft' },
    )

    expect(dialog).toHaveStyle({ width: '768px' })
  })

  it('widens the OKR side sheet with the keyboard from its resize handle', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1600,
    })

    render(
      <GoalCreateDrawer sideSheet={okrSideSheet} onClose={() => undefined}>
        <p>Goal fields</p>
      </GoalCreateDrawer>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'View OKRs' }))
    const sheet = screen.getByRole('region', { name: 'Company, department, and wing OKRs' })

    fireEvent.keyDown(
      screen.getByRole('separator', { name: 'Resize OKR reference panel' }),
      { key: 'ArrowLeft' },
    )

    expect(sheet).toHaveStyle({ width: '400px' })
  })

  it('keeps the side sheet closed until its tab is pulled', () => {
    render(
      <GoalCreateDrawer sideSheet={okrSideSheet} onClose={() => undefined}>
        <p>Goal fields</p>
      </GoalCreateDrawer>,
    )
    expect(screen.queryByText('Improve customer outcomes')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'View OKRs' }))

    expect(
      screen.getByRole('region', { name: 'Company, department, and wing OKRs' }),
    ).toHaveTextContent('Improve customer outcomes')
  })

  it('keeps the OKR tab expanded after a hover-then-click, then shrinks on the next hover', () => {
    render(
      <GoalCreateDrawer sideSheet={okrSideSheet} onClose={() => undefined}>
        <p>Goal fields</p>
      </GoalCreateDrawer>,
    )
    const tab = screen.getByRole('button', { name: 'View OKRs' })

    expect(tab).toHaveAttribute('data-expanded', 'false')

    fireEvent.pointerEnter(tab)
    expect(tab).toHaveAttribute('data-expanded', 'true')

    fireEvent.click(tab)
    expect(
      screen.getByRole('region', { name: 'Company, department, and wing OKRs' }),
    ).toBeInTheDocument()
    expect(tab).toHaveAttribute('data-expanded', 'true')

    fireEvent.pointerLeave(tab)
    fireEvent.pointerEnter(tab)
    expect(tab).toHaveAttribute('data-expanded', 'false')
  })

  it('closes the side sheet when its tab is clicked again', () => {
    render(
      <GoalCreateDrawer sideSheet={okrSideSheet} onClose={() => undefined}>
        <p>Goal fields</p>
      </GoalCreateDrawer>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'View OKRs' }))
    expect(
      screen.getByRole('region', { name: 'Company, department, and wing OKRs' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'View OKRs' }))

    expect(
      screen.queryByRole('region', { name: 'Company, department, and wing OKRs' }),
    ).toBeNull()
  })

  it('closes the side sheet before the drawer when Escape is pressed', () => {
    const onClose = vi.fn()
    render(
      <GoalCreateDrawer sideSheet={okrSideSheet} onClose={onClose}>
        <p>Goal fields</p>
      </GoalCreateDrawer>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'View OKRs' }))

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'View OKRs' })).toBeInTheDocument()
  })

  it('omits the tab when no side sheet is provided', () => {
    render(
      <GoalCreateDrawer onClose={() => undefined}>
        <p>Goal fields</p>
      </GoalCreateDrawer>,
    )

    expect(screen.queryByRole('button', { name: 'View OKRs' })).toBeNull()
  })
})
