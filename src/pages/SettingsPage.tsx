import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Monitor,
  Moon,
  MousePointerClick,
  PanelLeftOpen,
  Sun,
} from 'lucide-react'
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
import { applyAssistantEnabled } from '@/lib/assistantPrefs'
import {
  applySidebarMode,
  type SidebarExpandMode,
} from '@/lib/sidebarPrefs'
import { SegmentedControl, Switch } from '@/components/ui'
import { useAssistantPrefs } from '@/layout/useAssistantPrefs'
import { useSidebarPrefs } from '@/layout/useSidebarPrefs'
import { hasSystemPermission } from '@/lib/accessControl/types'
import { useAuth } from '@/lib/useAuth'
import { AccessControlPanel } from './settings/AccessControlPanel'
import { ActivitySettingsPanel } from './settings/ActivitySettingsPanel'

type SettingsSectionId =
  | 'appearance'
  | 'assistant'
  | 'access'
  | 'activity'
  | 'about'

const SETTINGS_SECTIONS: { id: SettingsSectionId; label: string }[] = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'assistant', label: 'Assistant' },
  { id: 'access', label: 'Admin Access' },
  { id: 'activity', label: 'Activity Log' },
  { id: 'about', label: 'About' },
]

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

function AppearancePanel() {
  const [themeMode, setThemeMode] = useState(readThemeMode)
  const [customColor, setCustomColor] = useState(readCustomThemeColor)
  const [appearance, setAppearance] = useState(readAppearance)
  const { mode: sidebarMode } = useSidebarPrefs()

  return (
    <section
      className="pd-settings-section"
      aria-labelledby="appearance-heading"
    >
      <div className="pd-settings-section__header">
        <h2 id="appearance-heading" className="pd-settings-section__title">
          Appearance
        </h2>
        <p className="pd-settings-section__hint">
          Choose light or dark mode, theme color, and how the desktop sidebar
          opens.
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

      <div className="pd-settings-row">
        <span className="pd-settings-row__label">Sidebar</span>
        <div
          className="pd-appearance-toggle"
          role="radiogroup"
          aria-label="Sidebar expand mode"
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
  )
}

function AssistantPanel() {
  const { enabled: assistantEnabled } = useAssistantPrefs()

  return (
    <section
      className="pd-settings-section"
      aria-labelledby="assistant-settings-heading"
    >
      <div className="pd-settings-section__header">
        <h2
          id="assistant-settings-heading"
          className="pd-settings-section__title"
        >
          Assistant
        </h2>
        <p className="pd-settings-section__hint">
          Show or hide the writing tip companion in the corner.
        </p>
      </div>

      <div className="pd-settings-row">
        <span className="pd-settings-row__label">Show assistant</span>
        <Switch
          label={assistantEnabled ? 'On' : 'Off'}
          checked={assistantEnabled}
          onChange={(event) => applyAssistantEnabled(event.target.checked)}
        />
      </div>
    </section>
  )
}

function AboutPanel() {
  return (
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
  )
}

function SettingsPanel({ section }: { section: SettingsSectionId }) {
  switch (section) {
    case 'appearance':
      return <AppearancePanel />
    case 'assistant':
      return <AssistantPanel />
    case 'access':
      return <AccessControlPanel />
    case 'activity':
      return <ActivitySettingsPanel />
    case 'about':
      return <AboutPanel />
  }
}

export default function SettingsPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeSection, setActiveSection] =
    useState<SettingsSectionId>('appearance')
  const canReadAccess = hasSystemPermission(
    user?.permissions,
    'platform.read_all',
  )
  const canReadActivity =
    hasSystemPermission(user?.permissions, 'activity.read_all') ||
    canReadAccess
  const sections = SETTINGS_SECTIONS.filter((section) => {
    if (section.id === 'access') return canReadAccess
    if (section.id === 'activity') return canReadActivity
    return true
  })

  useEffect(() => {
    const requested = searchParams.get('section')
    if (requested === 'sidebar') {
      setActiveSection('appearance')
      setSearchParams({}, { replace: true })
      return
    }
    if (
      requested !== 'access' &&
      requested !== 'activity' &&
      requested !== 'appearance' &&
      requested !== 'assistant' &&
      requested !== 'about'
    ) {
      return
    }
    if (requested === 'access' && !canReadAccess) return
    if (requested === 'activity' && !canReadActivity) return
    setActiveSection(requested)
  }, [searchParams, canReadAccess, canReadActivity, setSearchParams])

  return (
    <div className="pd-page pd-settings" aria-label="Settings">
      <div className="pd-settings__layout">
        <nav className="pd-settings-nav" aria-label="Settings sections">
          <SegmentedControl
            className="pd-settings-nav__tabs"
            options={sections}
            value={activeSection}
            onChange={(section) => {
              setActiveSection(section)
              setSearchParams(
                section === 'appearance' ? {} : { section },
                { replace: true },
              )
            }}
            aria-label="Settings section"
          />
        </nav>

        <div className="pd-settings__panel">
          <SettingsPanel section={activeSection} />
        </div>
      </div>
    </div>
  )
}
