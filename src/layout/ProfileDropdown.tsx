import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { LogOut, Settings, UserRound } from 'lucide-react'
import { SignOutConfirmModal } from '@/components/ConfirmModal'
import { settingsNavItem, profileNavItem } from '@/config/layout'
import { nameInitials } from './utils'
import { useHoverMenu } from './useHoverMenu'

export function ProfileDropdown({
  userName,
  profileSubtext,
  onSignOut,
  isMobile,
}: {
  userName?: string
  profileSubtext?: string
  onSignOut?: () => void
  isMobile?: boolean
}) {
  const { open, setOpen, containerRef, hoverHandlers, toggle } = useHoverMenu({
    isMobile,
    closeOnEscape: true,
  })
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const initials = nameInitials(userName)

  const handleCloseConfirm = useCallback(() => {
    setShowSignOutConfirm(false)
  }, [])

  const handleConfirmSignOut = useCallback(() => {
    setShowSignOutConfirm(false)
    onSignOut?.()
  }, [onSignOut])

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
            <span className="pd-topbar__profile-avatar pd-topbar__profile-avatar--menu">
              {initials}
            </span>
            <div className="pd-topbar__dropdown-header-text">
              <div className="pd-topbar__dropdown-title">
                {userName ?? 'User'}
              </div>
              {profileSubtext && (
                <div className="pd-topbar__dropdown-subtitle">
                  {profileSubtext}
                </div>
              )}
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
      <SignOutConfirmModal
        open={showSignOutConfirm}
        onClose={handleCloseConfirm}
        onConfirm={handleConfirmSignOut}
      />
    </div>
  )
}
