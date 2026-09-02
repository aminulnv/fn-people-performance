import { useEffect, useId, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  Check,
  ClipboardCheck,
  Clock,
  ShieldCheck,
  Target,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { CountBadge } from '@/components/ui/CountBadge'
import { VirtualList } from '@/components/VirtualList'
import {
  fetchNotifications,
  readAllNotifications,
  readNotification,
  type NotificationIconName,
  type NotificationRecord,
  watchNotifications,
} from '@/lib/notificationsApi'
import { queryKeys } from '@/lib/queryClient'
import { useCurrentPerson } from '@/lib/useCurrentPerson'
import { useHoverMenu } from './useHoverMenu'

type NotificationTab = 'all' | 'goals' | 'reviews' | 'actions'

const TABS: { id: NotificationTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'goals', label: 'Goals' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'actions', label: 'To do' },
]

const NOTIFICATION_ICONS: Record<NotificationIconName, LucideIcon> = {
  target: Target,
  'clipboard-check': ClipboardCheck,
  users: Users,
  clock: Clock,
  shield: ShieldCheck,
}

function relativeTime(value: string): string {
  const date = new Date(value)
  const elapsed = Date.now() - date.getTime()
  if (elapsed < 60_000) return 'Now'
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  if (date >= startOfToday) return 'Today'
  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfYesterday.getDate() - 1)
  if (date >= startOfYesterday) return 'Yesterday'
  const days = Math.floor(elapsed / 86_400_000)
  if (days < 7) return `${days}d`
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
  }).format(date)
}

function matchesTab(item: NotificationRecord, tab: NotificationTab): boolean {
  if (tab === 'all') return true
  if (tab === 'goals') return item.eventKey.startsWith('goal.')
  if (tab === 'reviews') return item.eventKey.startsWith('review.')
  return item.kind === 'action' && item.state !== 'completed'
}

function kindLabel(item: NotificationRecord): string | null {
  if (item.kind === 'action' && item.state !== 'completed') return 'To do'
  if (item.kind === 'reminder') return 'Reminder'
  if (item.kind === 'summary') return 'Summary'
  if (item.kind === 'security') return 'Access'
  return null
}

export function NotificationDrawer({ isMobile }: { isMobile?: boolean }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const recipient = useCurrentPerson()
  const panelId = useId()
  const { open, containerRef, hoverHandlers, toggle } = useHoverMenu({
    isMobile,
    closeOnEscape: true,
  })
  const recipientId = recipient?.id ?? ''
  const {
    data: feed = { items: [], unreadCount: 0, openActionCount: 0 },
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.notifications(recipientId),
    queryFn: () => fetchNotifications(recipient!),
    enabled: Boolean(recipient),
  })
  const { items, unreadCount, openActionCount } = feed
  const [tab, setTab] = useState<NotificationTab>('all')
  const visibleItems = useMemo(
    () => items.filter((item) => matchesTab(item, tab)),
    [items, tab],
  )
  const feedCount = unreadCount > 0 ? unreadCount : openActionCount

  useEffect(
    () =>
      watchNotifications(() => {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.notifications(recipientId),
        })
      }),
    [queryClient, recipientId],
  )

  const markAllRead = async () => {
    if (!recipientId) return
    await readAllNotifications(recipientId)
  }

  const openNotification = async (id: string, destination?: string) => {
    if (!recipientId) return
    await readNotification(recipientId, id)
    if (destination) navigate(destination)
  }

  return (
    <div
      ref={containerRef}
      className="pd-topbar__notifications"
      {...hoverHandlers}
    >
      <button
        type="button"
        className="pd-topbar__icon-btn pd-topbar__notif-btn"
        onClick={toggle}
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
              <CountBadge
                count={feedCount}
                className="pd-topbar__notif-count"
                aria-label={
                  unreadCount > 0
                    ? `${unreadCount} unread`
                    : `${openActionCount} to do`
                }
              />
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
          {items.length > 0 ? (
            <div className="pd-topbar__notif-tabs" role="tablist" aria-label="Filter notifications">
              {TABS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === option.id}
                  className={
                    tab === option.id
                      ? 'pd-topbar__notif-tab is-active'
                      : 'pd-topbar__notif-tab'
                  }
                  onClick={() => {
                    setTab(option.id)
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
          {isPending ? (
            <div className="pd-topbar__notif-empty" aria-busy="true">
              Loading…
            </div>
          ) : isError ? (
            <div className="pd-topbar__notif-empty">
              Couldn’t load notifications.{' '}
              <button
                type="button"
                className="pd-topbar__notif-mark-all"
                onClick={() => {
                  void refetch()
                }}
              >
                Retry
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="pd-topbar__notif-empty">You're all caught up.</div>
          ) : visibleItems.length === 0 ? (
            <div className="pd-topbar__notif-empty">Nothing in this filter.</div>
          ) : (
            <VirtualList
              items={visibleItems}
              estimateSize={96}
              threshold={24}
              className="pd-topbar__notif-list"
              getKey={(item) => item.id}
              renderItem={(item) => {
                const Icon = NOTIFICATION_ICONS[item.icon] ?? Bell
                const badge = kindLabel(item)
                const showActions =
                  item.kind === 'action' &&
                  item.state !== 'completed' &&
                  Boolean(item.destination)
                return (
                  <div
                    className={
                      item.state === 'unread'
                        ? 'pd-topbar__notif-item pd-topbar__notif-item--unread'
                        : item.state === 'completed'
                          ? 'pd-topbar__notif-item pd-topbar__notif-item--completed'
                          : 'pd-topbar__notif-item'
                    }
                  >
                    <button
                      type="button"
                      className="pd-topbar__notif-item-main"
                      onClick={() => {
                        void openNotification(item.id, item.destination)
                      }}
                    >
                      <span
                        className={`pd-topbar__notif-icon pd-topbar__notif-icon--${item.icon}`}
                        aria-hidden
                      >
                        <Icon size={16} strokeWidth={2} />
                      </span>
                      <span className="pd-topbar__notif-body">
                        <span className="pd-topbar__notif-title-row">
                          <span className="pd-topbar__notif-heading">
                            <span className="pd-topbar__notif-title">
                              {item.title}
                            </span>
                            {badge ? (
                              <span className="pd-topbar__notif-kind">
                                {badge}
                              </span>
                            ) : null}
                          </span>
                          <span className="pd-topbar__notif-time">
                            {relativeTime(item.updatedAt)}
                          </span>
                        </span>
                        <span className="pd-topbar__notif-copy">{item.body}</span>
                      </span>
                    </button>
                    {showActions ? (
                      <div className="pd-topbar__notif-actions">
                        <button
                          type="button"
                          className="pd-topbar__notif-action pd-topbar__notif-action--ghost"
                          onClick={() => {
                            void readNotification(recipientId, item.id)
                          }}
                        >
                          <X size={12} strokeWidth={2.25} />
                          Dismiss
                        </button>
                        <button
                          type="button"
                          className="pd-topbar__notif-action pd-topbar__notif-action--primary"
                          onClick={() => {
                            void openNotification(item.id, item.destination)
                          }}
                        >
                          <Check size={12} strokeWidth={2.5} />
                          Open
                        </button>
                      </div>
                    ) : null}
                  </div>
                )
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}
