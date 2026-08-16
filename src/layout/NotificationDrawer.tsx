import { useEffect, useId } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  ClipboardCheck,
  Clock,
  ShieldCheck,
  Target,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { VirtualList } from '@/components/VirtualList'
import {
  fetchNotifications,
  readAllNotifications,
  readNotification,
  type NotificationIconName,
  watchNotifications,
} from '@/lib/notificationsApi'
import { queryKeys } from '@/lib/queryClient'
import { useCurrentPerson } from '@/lib/useCurrentPerson'
import { useHoverMenu } from './useHoverMenu'

const NOTIFICATION_ICONS: Record<NotificationIconName, LucideIcon> = {
  target: Target,
  'clipboard-check': ClipboardCheck,
  users: Users,
  clock: Clock,
  shield: ShieldCheck,
}

function relativeTime(value: string): string {
  const elapsed = Date.now() - new Date(value).getTime()
  if (elapsed < 60_000) return 'Now'
  const minutes = Math.floor(elapsed / 60_000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value))
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
              {unreadCount > 0 ? (
                <span className="pd-topbar__notif-unread-count">
                  {unreadCount} unread
                </span>
              ) : openActionCount > 0 ? (
                <span className="pd-topbar__notif-unread-count">
                  {openActionCount} to do
                </span>
              ) : null}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="pd-topbar__notif-mark-all"
                onClick={markAllRead}
              >
                Mark All Read
              </button>
            )}
          </div>
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
          ) : (
            <VirtualList
              items={items}
              estimateSize={84}
              threshold={24}
              className="pd-topbar__notif-list"
              getKey={(item) => item.id}
              renderItem={(item) => {
                const Icon = NOTIFICATION_ICONS[item.icon] ?? Bell
                return (
                  <button
                    type="button"
                    className={
                      item.state === 'unread'
                        ? 'pd-topbar__notif-item pd-topbar__notif-item--unread'
                        : item.state === 'completed'
                          ? 'pd-topbar__notif-item pd-topbar__notif-item--completed'
                          : 'pd-topbar__notif-item'
                    }
                    onClick={() => {
                      void openNotification(item.id, item.destination)
                    }}
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
                          {relativeTime(item.updatedAt)}
                        </span>
                      </span>
                      {item.kind === 'action' &&
                      item.state !== 'completed' ? (
                        <span className="pd-topbar__notif-kind">To do</span>
                      ) : item.kind === 'reminder' ? (
                        <span className="pd-topbar__notif-kind">Reminder</span>
                      ) : null}
                      <span className="pd-topbar__notif-copy">{item.body}</span>
                    </span>
                    {item.state === 'unread' ? (
                      <span
                        className="pd-topbar__notif-dot"
                        aria-label="Unread"
                      />
                    ) : null}
                  </button>
                )
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}
