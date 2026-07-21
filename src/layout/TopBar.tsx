import { useRef, useEffect, useState } from 'react'
import { ChevronDown, Menu, LogOut } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { SignOutConfirmModal } from '@/components/ConfirmModal'
import { nameInitials } from './utils'

const HOVER_CLOSE_DELAY_MS = 150

interface TopBarProps {
  title: string
  titleIcon?: LucideIcon
  userName?: string
  profileSubtext?: string
  onSignOut?: () => void
  onMobileMenuOpen: () => void
  isMobile?: boolean
}

function ProfileDropdown({
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
  const [open, setOpen] = useState(false)
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initials = nameInitials(userName)

  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
  }

  useEffect(() => () => clearCloseTimeout(), [])

  useEffect(() => {
    if (!open || isMobile) return
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, isMobile])

  return (
    <div
      ref={containerRef}
      className="pd-topbar__profile"
      onMouseEnter={() => {
        if (isMobile) return
        clearCloseTimeout()
        setOpen(true)
      }}
      onMouseLeave={() => {
        if (isMobile) return
        clearCloseTimeout()
        closeTimeoutRef.current = setTimeout(
          () => setOpen(false),
          HOVER_CLOSE_DELAY_MS,
        )
      }}
    >
      <button
        type="button"
        onClick={isMobile ? () => setOpen((o) => !o) : undefined}
        className={
          isMobile
            ? 'pd-topbar__profile-avatar pd-topbar__profile-avatar--btn'
            : 'pd-topbar__profile-trigger'
        }
        aria-label="Profile menu"
        aria-expanded={open}
      >
        {isMobile ? (
          initials
        ) : (
          <>
            <span className="pd-topbar__profile-avatar">{initials}</span>
            {userName != null && (
              <span className="pd-topbar__profile-name">{userName}</span>
            )}
            <ChevronDown
              size={12}
              color="var(--color-text-secondary)"
              strokeWidth={2}
              className={`pd-topbar__profile-chevron${open ? ' is-open' : ''}`}
            />
          </>
        )}
      </button>
      {open && (
        <div
          className="pd-topbar__dropdown-panel pd-topbar__dropdown-panel--profile"
          role="menu"
          aria-label="Profile menu"
        >
          <div className="pd-topbar__dropdown-header">
            <div className="pd-topbar__dropdown-title">
              {userName ?? 'User'}
            </div>
            {profileSubtext && (
              <div className="pd-topbar__dropdown-subtitle">
                {profileSubtext}
              </div>
            )}
          </div>
          <button
            type="button"
            className="pd-topbar__dropdown-item pd-topbar__dropdown-item--danger"
            onClick={() => {
              setOpen(false)
              setShowSignOutConfirm(true)
            }}
            role="menuitem"
          >
            <LogOut size={14} color="var(--color-red)" strokeWidth={2} />
            Sign out
          </button>
        </div>
      )}
      <SignOutConfirmModal
        open={showSignOutConfirm}
        onClose={() => setShowSignOutConfirm(false)}
        onConfirm={() => {
          setShowSignOutConfirm(false)
          onSignOut?.()
        }}
      />
    </div>
  )
}

export function TopBar({
  title,
  titleIcon: TitleIcon,
  userName,
  profileSubtext,
  onSignOut,
  onMobileMenuOpen,
  isMobile = false,
}: TopBarProps) {
  const profile = (
    <ProfileDropdown
      userName={userName}
      profileSubtext={profileSubtext}
      onSignOut={onSignOut}
      isMobile={isMobile}
    />
  )

  if (isMobile) {
    return (
      <header className="pd-topbar pd-topbar--mobile">
        <div className="pd-topbar__row">
          <button
            type="button"
            className="pd-topbar__icon-btn"
            onClick={onMobileMenuOpen}
            aria-label="Open menu"
          >
            <Menu size={16} strokeWidth={2} />
          </button>
          <span className="pd-topbar__title">
            {TitleIcon && (
              <TitleIcon
                size={18}
                strokeWidth={1.75}
                className="pd-topbar__title-icon"
              />
            )}
            <span className="pd-topbar__title-text">{title}</span>
          </span>
          {profile}
        </div>
      </header>
    )
  }

  return (
    <header className="pd-topbar pd-topbar--desktop">
      <div className="pd-topbar__title">
        {TitleIcon && (
          <TitleIcon
            size={18}
            strokeWidth={1.75}
            className="pd-topbar__title-icon"
          />
        )}
        <span className="pd-topbar__title-text">{title}</span>
      </div>
      <div style={{ flex: 1 }} />
      {profile}
    </header>
  )
}
