import { useState } from 'react'
import { Monitor, Moon, MousePointerClick, PanelLeftOpen, Sun } from 'lucide-react'
import '@/styles/layout-settings.css'
import {
  applyAppearance,
  applyThemeColor,
  applyThemeMode,
  DEFAULT_THEME_COLOR,
  readAppearance,
  readCustomThemeColor,
  readThemeMode,
  type AppearanceMode,
} from '@/lib/brand'
import { APP_VERSION_LABEL } from '@/lib/appVersion'
import {
  applySidebarMode,
  type SidebarExpandMode,
} from '@/lib/sidebarPrefs'
import { useSidebarPrefs } from '@/layout/useSidebarPrefs'

const SIDEBAR_MODE_OPTIONS: {
  value: SidebarExpandMode
  label: string
  title: string
  icon: typeof PanelLeftOpen
}[] = [
    {
      value: 'auto',
      label: 'Auto',
      title: 'Sidebar expands when you hover, and collapses when you leave.',
      icon: PanelLeftOpen,
    },
    {
      value: 'manual',
      label: 'Click',
      title:
        'Use the button at the bottom of the sidebar to expand or collapse.',
      icon: MousePointerClick,
    },
  ]

const APPEARANCE_OPTIONS: {
  value: AppearanceMode
  label: string
  icon: typeof Sun
}[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ]

function formatHex(hex: string): string {
  return hex.toUpperCase()
}

export default function SettingsPage() {
  const [themeMode, setThemeMode] = useState(readThemeMode)
  const [customColor, setCustomColor] = useState(readCustomThemeColor)
  const [appearance, setAppearance] = useState(readAppearance)
  const { mode: sidebarMode } = useSidebarPrefs()

  return (
    <div className="pd-page pd-settings" aria-label="Settings">
      <section className="pd-settings-section" aria-labelledby="appearance-heading">
        <div className="pd-settings-section__header">
          <h2 id="appearance-heading" className="pd-settings-section__title">
            Appearance
          </h2>
          <p className="pd-settings-section__hint">
            Choose light or dark mode, or follow your system setting.
          </p>
        </div>

        <div className="pd-settings-row">
          <span className="pd-settings-row__label">Dark mode</span>
          <div
            className="pd-appearance-toggle"
            role="radiogroup"
            aria-label="Dark mode"
          >
            {APPEARANCE_OPTIONS.map((option) => {
              const selected = appearance === option.value
              const Icon = option.icon
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`pd-appearance-toggle__option${selected ? ' is-selected' : ''}`}
                  title={option.label}
                  aria-label={option.label}
                  onClick={() => setAppearance(applyAppearance(option.value))}
                >
                  <Icon size={15} strokeWidth={2.25} aria-hidden />
                  <span>{option.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="pd-settings-row pd-settings-row--align-start">
          <span className="pd-settings-row__label">Theme color</span>
          <div
            className="pd-theme-mode"
            role="radiogroup"
            aria-label="Theme color"
          >
            <button
              type="button"
              role="radio"
              aria-checked={themeMode === 'default'}
              className={`pd-theme-mode__option${themeMode === 'default' ? ' is-selected' : ''}`}
              title={`Default ${formatHex(DEFAULT_THEME_COLOR)}`}
              aria-label={`Default ${formatHex(DEFAULT_THEME_COLOR)}`}
              onClick={() => setThemeMode(applyThemeMode('default'))}
            >
              <span
                className="pd-theme-mode__swatch"
                style={{ background: DEFAULT_THEME_COLOR }}
                aria-hidden
              />
              <span className="pd-theme-mode__label">Default</span>
            </button>

            <label
              role="radio"
              tabIndex={0}
              aria-checked={themeMode === 'custom'}
              aria-label={`Custom ${formatHex(customColor)}`}
              title={`Custom ${formatHex(customColor)}`}
              className={`pd-theme-mode__option pd-theme-mode__option--custom${themeMode === 'custom' ? ' is-selected' : ''}`}
              onClick={() => setThemeMode(applyThemeMode('custom'))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setThemeMode(applyThemeMode('custom'))
                  e.currentTarget.querySelector('input')?.click()
                }
              }}
            >
              <span
                className="pd-theme-mode__swatch"
                style={{ background: customColor }}
                aria-hidden
              />
              <span className="pd-theme-mode__label">Custom</span>
              <input
                type="color"
                className="pd-theme-swatch__input"
                value={customColor}
                onChange={(e) => {
                  const next = applyThemeColor(e.target.value)
                  if (next) {
                    setCustomColor(next)
                    setThemeMode('custom')
                  }
                }}
              />
            </label>
          </div>
        </div>
      </section>

      <section className="pd-settings-section" aria-labelledby="sidebar-settings-heading">
        <div className="pd-settings-section__header">
          <h2 id="sidebar-settings-heading" className="pd-settings-section__title">
            Sidebar
          </h2>
          <p className="pd-settings-section__hint">
            Choose how the desktop sidebar opens and closes.
          </p>
        </div>

        <div className="pd-settings-row">
          <span className="pd-settings-row__label">Expand mode</span>
          <div
            className="pd-appearance-toggle"
            role="radiogroup"
            aria-label="Expand mode"
          >
            {SIDEBAR_MODE_OPTIONS.map((option) => {
              const selected = sidebarMode === option.value
              const Icon = option.icon
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`pd-appearance-toggle__option${selected ? ' is-selected' : ''}`}
                  title={option.title}
                  aria-label={option.title}
                  onClick={() => applySidebarMode(option.value)}
                >
                  <Icon size={15} strokeWidth={2.25} aria-hidden />
                  <span>{option.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <section className="pd-settings-section" aria-labelledby="about-heading">
        <div className="pd-settings-section__header">
          <h2 id="about-heading" className="pd-settings-section__title">
            About
          </h2>
          <p className="pd-settings-section__hint">
            App details useful for support and bug reports.
          </p>
        </div>

        <div className="pd-settings-row">
          <span className="pd-settings-row__label">Version</span>
          <span className="pd-settings-version" title="Select to copy">
            {APP_VERSION_LABEL}
          </span>
        </div>
      </section>
    </div>
  )
}
