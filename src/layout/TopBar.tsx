import { useRef, useEffect, useState, useId } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Menu,
  LogOut,
  Settings,
  Bell,
  Target,
  ClipboardCheck,
  Users,
  Search,
  UserRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { SignOutConfirmModal } from '@/components/ConfirmModal'
import { settingsNavItem, profileNavItem, searchablePages } from '@/config/layout'
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

type NotificationItem = {
  id: string
  title: string
  body: string
  time: string
  unread: boolean
  icon: LucideIcon
}

const DEMO_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    title: 'Goal check-in due',
    body: 'Q3 check-ins for your team close Friday.',
    time: '2h ago',
    unread: true,
    icon: Target,
  },
  {
    id: '2',
    title: 'Review ready to grade',
    body: '3 employees are waiting on performance ratings.',
    time: 'Yesterday',
    unread: true,
    icon: ClipboardCheck,
  },
  {
    id: '3',
    title: 'Team update',
    body: 'Two new hires were added to Product Design.',
    time: 'Mon',
    unread: false,
    icon: Users,
  },
]

function filterPages(query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return searchablePages
  return searchablePages.filter(
    (page) =>
      page.label.toLowerCase().includes(normalized) ||
      page.path.toLowerCase().includes(normalized),
  )
}

function TopBarSearch() {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const results = filterPages(query)

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    if (!open) return

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
  }, [open])

  const closeSearch = () => {
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
  }

  const goToPage = (path: string) => {
    navigate(path)
    closeSearch()
    inputRef.current?.blur()
  }

  const handleKeyDown = (e: {
    key: string
    preventDefault: () => void
  }) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      closeSearch()
      inputRef.current?.blur()
      return
    }

    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true)
      return
    }

    if (!results.length) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActiveIndex((index) => (index + 1) % results.length)
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      setActiveIndex((index) => (index - 1 + results.length) % results.length)
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      const page = results[activeIndex]
      if (page) goToPage(page.path)
    }
  }

  return (
    <div ref={containerRef} className="pd-topbar__search-wrap">
      <label className="pd-topbar__search">
        <Search
          size={14}
          strokeWidth={2}
          className="pd-topbar__search-icon"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="search"
          className="pd-topbar__search-input"
          placeholder="Search pages"
          aria-label="Search pages"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          role="combobox"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
      </label>
      {open && (
        <div
          className="pd-topbar__dropdown-panel pd-topbar__dropdown-panel--search"
          role="listbox"
          id={listId}
          aria-label="Pages"
        >
          <div className="pd-topbar__search-section-label">Pages</div>
          {results.length === 0 ? (
            <div className="pd-topbar__search-empty">No pages found</div>
          ) : (
            <ul className="pd-topbar__search-list">
              {results.map((page, index) => {
                const Icon = page.icon
                const isActive = index === activeIndex
                return (
                  <li key={page.path} role="option" aria-selected={isActive}>
                    <Link
                      to={page.path}
                      className={
                        isActive
                          ? 'pd-topbar__search-result pd-topbar__search-result--active'
                          : 'pd-topbar__search-result'
                      }
                      onClick={closeSearch}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      <span className="pd-topbar__search-result-icon" aria-hidden>
                        <Icon size={14} strokeWidth={2} />
                      </span>
                      <span className="pd-topbar__search-result-text">
                        <span className="pd-topbar__search-result-label">
                          {page.label}
                        </span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function NotificationDrawer({ isMobile }: { isMobile?: boolean }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState(DEMO_NOTIFICATIONS)
  const containerRef = useRef<HTMLDivElement>(null)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const panelId = useId()
  const unreadCount = items.filter((item) => item.unread).length

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
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, isMobile])

  const markAllRead = () => {
    setItems((prev) => prev.map((item) => ({ ...item, unread: false })))
  }

  const markRead = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, unread: false } : item)),
    )
  }

  return (
    <div
      ref={containerRef}
      className="pd-topbar__notifications"
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
        className="pd-topbar__icon-btn pd-topbar__notif-btn"
        onClick={isMobile ? () => setOpen((value) => !value) : undefined}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : 'Notifications'
        }
        aria-expanded={open}
        aria-controls={panelId}
      >
        <Bell size={16} strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="pd-topbar__notif-badge" aria-hidden>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div
          id={panelId}
          className="pd-topbar__dropdown-panel pd-topbar__dropdown-panel--notifications"
          role="region"
          aria-label="Notifications"
        >
          <div className="pd-topbar__notif-header">
            <div className="pd-topbar__notif-header-text">
              <span className="pd-topbar__dropdown-title">Notifications</span>
              {unreadCount > 0 && (
                <span className="pd-topbar__notif-unread-count">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="pd-topbar__notif-mark-all"
                onClick={markAllRead}
              >
                Mark all read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div className="pd-topbar__notif-empty">You're all caught up.</div>
          ) : (
            <ul className="pd-topbar__notif-list">
              {items.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={
                        item.unread
                          ? 'pd-topbar__notif-item pd-topbar__notif-item--unread'
                          : 'pd-topbar__notif-item'
                      }
                      onClick={() => markRead(item.id)}
                    >
                      <span className="pd-topbar__notif-icon" aria-hidden>
                        <Icon size={14} strokeWidth={2} />
                      </span>
                      <span className="pd-topbar__notif-body">
                        <span className="pd-topbar__notif-title-row">
                          <span className="pd-topbar__notif-title">
                            {item.title}
                          </span>
                          <span className="pd-topbar__notif-time">
                            {item.time}
                          </span>
                        </span>
                        <span className="pd-topbar__notif-copy">{item.body}</span>
                      </span>
                      {item.unread && (
                        <span
                          className="pd-topbar__notif-dot"
                          aria-label="Unread"
                        />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
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
  const actions = (
    <div className="pd-topbar__actions">
      <TopBarSearch />
      <NotificationDrawer isMobile={isMobile} />
      <ProfileDropdown
        userName={userName}
        profileSubtext={profileSubtext}
        onSignOut={onSignOut}
        isMobile={isMobile}
      />
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
          {actions}
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
      {actions}
    </header>
  )
}
