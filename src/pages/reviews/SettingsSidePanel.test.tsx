import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ClipboardList } from 'lucide-react'
import { SettingsSidePanel } from './SettingsSidePanel'

const reviewFormSheet = {
  tabLabel: 'Review form',
  tabIcon: ClipboardList,
  label: 'Review form templates',
  content: <p>Preset questions</p>,
}

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
})

describe('SettingsSidePanel', () => {
  it('renders content in a right-side dialog', () => {
    render(
      <SettingsSidePanel
        label="Cycle details"
        closeLabel="Close cycle details"
        onClose={() => undefined}
      >
        <p>Cycle fields</p>
      </SettingsSidePanel>,
    )

    expect(screen.getByRole('dialog', { name: 'Cycle details' })).toHaveTextContent(
      'Cycle fields',
    )
  })

  it('renders a custom title in the panel chrome', () => {
    render(
      <SettingsSidePanel
        label="Group settings"
        closeLabel="Close group settings"
        title={<input aria-label="Group name" defaultValue="SLT" />}
        onClose={() => undefined}
      >
        <p>People</p>
      </SettingsSidePanel>,
    )

    const dialog = screen.getByRole('dialog', { name: 'Group settings' })
    expect(dialog.querySelector('.pd-settings-panel__chrome')).toContainElement(
      screen.getByLabelText('Group name'),
    )
  })

  it('pins top navigation under the title', () => {
    render(
      <SettingsSidePanel
        label="Everyone"
        closeLabel="Close group settings"
        subnav={<nav aria-label="Group settings">People</nav>}
        onClose={() => undefined}
      >
        <p>Members</p>
      </SettingsSidePanel>,
    )

    const dialog = screen.getByRole('dialog', { name: 'Everyone' })
    expect(dialog.querySelector('.pd-settings-panel__subnav')).toHaveTextContent(
      'People',
    )
  })

  it('closes when the background is clicked', () => {
    const onClose = vi.fn()
    render(
      <SettingsSidePanel
        label="Cycle details"
        closeLabel="Close cycle details"
        onClose={onClose}
      >
        <p>Cycle fields</p>
      </SettingsSidePanel>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Close cycle details' }))

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes when Escape is pressed from the panel', () => {
    const onClose = vi.fn()
    render(
      <SettingsSidePanel
        label="Cycle details"
        closeLabel="Close cycle details"
        onClose={onClose}
      >
        <p>Cycle fields</p>
      </SettingsSidePanel>,
    )

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('leaves the panel open when another dialog is already showing', () => {
    const onClose = vi.fn()
    const nested = document.createElement('dialog')
    nested.setAttribute('open', '')
    document.body.append(nested)
    try {
      render(
        <SettingsSidePanel
          label="Cycle details"
          closeLabel="Close cycle details"
          onClose={onClose}
        >
          <p>Cycle fields</p>
        </SettingsSidePanel>,
      )

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(onClose).not.toHaveBeenCalled()
    } finally {
      nested.remove()
    }
  })

  it('keeps the side sheet closed until its tab is pulled', () => {
    render(
      <SettingsSidePanel
        label="Everyone"
        closeLabel="Close group settings"
        sideSheet={reviewFormSheet}
        onClose={() => undefined}
      >
        <p>Review windows</p>
      </SettingsSidePanel>,
    )

    expect(screen.queryByText('Preset questions')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Review form' }))

    expect(
      screen.getByRole('region', { name: 'Review form templates' }),
    ).toHaveTextContent('Preset questions')
  })

  it('keeps the review form tab expanded after a hover-then-click, then shrinks on the next hover', () => {
    render(
      <SettingsSidePanel
        label="Everyone"
        closeLabel="Close group settings"
        sideSheet={reviewFormSheet}
        onClose={() => undefined}
      >
        <p>Review windows</p>
      </SettingsSidePanel>,
    )
    const tab = screen.getByRole('button', { name: 'Review form' })

    expect(tab).toHaveAttribute('data-expanded', 'false')

    fireEvent.pointerEnter(tab)
    expect(tab).toHaveAttribute('data-expanded', 'true')

    fireEvent.click(tab)
    expect(
      screen.getByRole('region', { name: 'Review form templates' }),
    ).toBeInTheDocument()
    expect(tab).toHaveAttribute('data-expanded', 'true')

    fireEvent.pointerLeave(tab)
    fireEvent.pointerEnter(tab)
    expect(tab).toHaveAttribute('data-expanded', 'false')
  })

  it('closes the side sheet before the panel when Escape is pressed', () => {
    const onClose = vi.fn()
    render(
      <SettingsSidePanel
        label="Everyone"
        closeLabel="Close group settings"
        sideSheet={reviewFormSheet}
        onClose={onClose}
      >
        <p>Review windows</p>
      </SettingsSidePanel>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Review form' }))

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).not.toHaveBeenCalled()
    expect(
      screen.queryByRole('region', { name: 'Review form templates' }),
    ).toBeNull()
  })

  it('omits the tab when no side sheet is provided', () => {
    render(
      <SettingsSidePanel
        label="Cycle details"
        closeLabel="Close cycle details"
        onClose={() => undefined}
      >
        <p>Cycle fields</p>
      </SettingsSidePanel>,
    )

    expect(screen.queryByRole('button', { name: 'Review form' })).toBeNull()
  })

  it('widens the review form sheet with the keyboard from its resize handle', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1600,
    })

    render(
      <SettingsSidePanel
        label="Everyone"
        closeLabel="Close group settings"
        sideSheet={reviewFormSheet}
        onClose={() => undefined}
      >
        <p>Review windows</p>
      </SettingsSidePanel>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Review form' }))
    const sheet = screen.getByRole('region', { name: 'Review form templates' })

    fireEvent.keyDown(
      screen.getByRole('separator', { name: 'Resize review form panel' }),
      { key: 'ArrowLeft' },
    )

    expect(sheet).toHaveStyle({ width: '512px' })
  })
})
