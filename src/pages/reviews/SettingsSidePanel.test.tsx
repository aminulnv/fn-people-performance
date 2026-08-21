import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SettingsSidePanel } from './SettingsSidePanel'

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
})
