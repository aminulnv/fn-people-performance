import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Menu } from 'lucide-react'
import { Breadcrumbs, type BreadcrumbItem } from '@/components/ui'
import { TopBarDarkMode } from './TopBarDarkMode'
import { TopBarSearch } from './TopBarSearch'
import { NotificationDrawer } from './NotificationDrawer'
import { ProfileDropdown } from './ProfileDropdown'

interface TopBarProps {
  breadcrumbs: BreadcrumbItem[]
  titleIcon?: LucideIcon
  /** Section links (e.g. Reviews subpages) - centered on desktop, own row on mobile. */
  centerSlot?: ReactNode
  onSignOut?: () => void
  onMobileMenuOpen: () => void
  isMobile?: boolean
}

export function TopBar({
  breadcrumbs,
  titleIcon: TitleIcon,
  centerSlot,
  onSignOut,
  onMobileMenuOpen,
  isMobile = false,
}: TopBarProps) {
  const actions = (
    <div className="pd-topbar__actions">
      <TopBarDarkMode />
      <TopBarSearch />
      <NotificationDrawer isMobile={isMobile} />
      <ProfileDropdown onSignOut={onSignOut} isMobile={isMobile} />
    </div>
  )

  const heading = (
    <div className="pd-topbar__heading">
      <div className="pd-topbar__title">
        {TitleIcon ? (
          <TitleIcon
            size={18}
            strokeWidth={1.75}
            className="pd-topbar__title-icon"
            aria-hidden
          />
        ) : null}
        <Breadcrumbs
          items={breadcrumbs}
          className="pd-topbar__breadcrumbs"
        />
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <header className="pd-topbar pd-topbar--mobile">
        <div className="pd-topbar__row">
          <button
            type="button"
            className="pd-topbar__icon-btn"
            onClick={onMobileMenuOpen}
            aria-label="Open Menu"
          >
            <Menu size={16} strokeWidth={2} />
          </button>
          {heading}
          {actions}
        </div>
        {centerSlot ? (
          <div className="pd-topbar__subnav">{centerSlot}</div>
        ) : null}
      </header>
    )
  }

  return (
    <header className="pd-topbar pd-topbar--desktop">
      {heading}
      <div className="pd-topbar__center">{centerSlot}</div>
      {actions}
    </header>
  )
}
