import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LogOut, Moon, Settings, Sun, UserRound } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { settingsNavItem, profileNavItem } from '@/config/layout'
import { applyAppearance } from '@/lib/brand'
import { formatGoalRole } from '@/lib/goals/roles'
import { useCurrentPerson } from '@/lib/useCurrentPerson'
import { nameInitials } from './utils'
import { useHoverMenu } from './useHoverMenu'

function readIsDark(): boolean {
  if (typeof document === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}

export function ProfileDropdown({
  onSignOut,
  isMobile,
}: {
  onSignOut?: () => void
  isMobile?: boolean
}) {
  const person = useCurrentPerson()
  const { open, setOpen, containerRef, hoverHandlers, toggle } = useHoverMenu({
    isMobile,
    closeOnEscape: true,
  })
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const [isDark, setIsDark] = useState(readIsDark)

  const name = person?.name ?? 'Signed in'
  const title = person?.title ?? ''
  const roleLabel = person ? formatGoalRole(person.role) : ''
  const initials = nameInitials(name)
  const avatarHue = person?.avatarHue ?? 220

  const handleCloseConfirm = useCallback(() => {
    setShowSignOutConfirm(false)
  }, [])

  const handleConfirmSignOut = useCallback(() => {
    setShowSignOutConfirm(false)
    onSignOut?.()
  }, [onSignOut])

  useEffect(() => {
    if (open) setIsDark(readIsDark())
  }, [open])

  const handleToggleDarkMode = useCallback(() => {
    const next = isDark ? 'light' : 'dark'
    applyAppearance(next)
    setIsDark(!isDark)
  }, [isDark])

  return (
    <div
      ref={containerRef}
      className="pd-topbar__profile"
      {...hoverHandlers}
    >
      <button
        type="button"
        onClick={toggle}
        className="pd-topbar__profile-avatar pd-topbar__profile-avatar--btn"
        aria-label="Profile menu"
        aria-expanded={open}
        style={{ background: `hsl(${avatarHue} 55% 42%)` }}
      >
        {initials}
      </button>
      {open && (
        <div
          className="pd-topbar__dropdown-panel pd-topbar__dropdown-panel--profile"
          role="menu"
          aria-label="Profile menu"
        >
          <div className="pd-topbar__dropdown-header">
            <span
              className="pd-topbar__profile-avatar pd-topbar__profile-avatar--menu"
              style={{ background: `hsl(${avatarHue} 55% 42%)` }}
            >
              {initials}
            </span>
            <div className="pd-topbar__dropdown-header-text">
              <div className="pd-topbar__dropdown-title">{name}</div>
              <div className="pd-topbar__dropdown-subtitle">
                {[title, roleLabel].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>

          <Link
            to={profileNavItem.path}
            className="pd-topbar__dropdown-item"
            onClick={() => setOpen(false)}
            role="menuitem"
          >
            <UserRound size={14} strokeWidth={2} />
            {profileNavItem.label}
          </Link>
          <Link
            to={settingsNavItem.path}
            className="pd-topbar__dropdown-item"
            onClick={() => setOpen(false)}
            role="menuitem"
          >
            <Settings size={14} strokeWidth={2} />
            {settingsNavItem.label}
          </Link>
          <button
            type="button"
            className="pd-topbar__dropdown-item"
            onClick={handleToggleDarkMode}
            role="menuitemcheckbox"
            aria-checked={isDark}
          >
            {isDark ? (
              <Sun size={14} strokeWidth={2} aria-hidden />
            ) : (
              <Moon size={14} strokeWidth={2} aria-hidden />
            )}
            {isDark ? 'Light mode' : 'Dark mode'}
          </button>
          <button
            type="button"
            className="pd-topbar__dropdown-item pd-topbar__dropdown-item--danger"
            onClick={() => {
              setOpen(false)
              setShowSignOutConfirm(true)
            }}
            role="menuitem"
          >
            <LogOut size={14} strokeWidth={2} />
            Sign out
          </button>
        </div>
      )}
      <ConfirmDialog
        open={showSignOutConfirm}
        onClose={handleCloseConfirm}
        onConfirm={handleConfirmSignOut}
        title="Sign out?"
        description="Are you sure you want to sign out?"
        confirmLabel="Sign out"
        confirmVariant="danger"
      />
    </div>
  )
}
