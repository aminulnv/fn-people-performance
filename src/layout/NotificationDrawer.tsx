import { useCallback, useId } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, ClipboardCheck, Target, Users, type LucideIcon } from 'lucide-react'
import { VirtualList } from '@/components/VirtualList'
import {
  fetchNotifications,
  type NotificationIconName,
  type NotificationItem,
} from '@/lib/notificationsApi'
import { queryKeys } from '@/lib/queryClient'
import { useHoverMenu } from './useHoverMenu'

const NOTIFICATION_ICONS: Record<NotificationIconName, LucideIcon> = {
  target: Target,
  'clipboard-check': ClipboardCheck,
  users: Users,
}

export function NotificationDrawer({ isMobile }: { isMobile?: boolean }) {
  const queryClient = useQueryClient()
  const panelId = useId()
  const { open, containerRef, hoverHandlers, toggle } = useHoverMenu({
    isMobile,
    closeOnEscape: true,
  })
  const { data: items = [], isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: fetchNotifications,
    enabled: open,
  })
  const unreadCount = items.filter((item) => item.unread).length

  const setItems = useCallback(
    (updater: (prev: NotificationItem[]) => NotificationItem[]) => {
      queryClient.setQueryData<NotificationItem[]>(
        queryKeys.notifications,
        (prev) => updater(prev ?? []),
      )
    },
    [queryClient],
  )

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
      {...hoverHandlers}
    >
      <button
        type="button"
        className="pd-topbar__icon-btn pd-topbar__notif-btn"
        onClick={isMobile ? toggle : undefined}
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
              estimateSize={72}
              threshold={24}
              className="pd-topbar__notif-list"
              getKey={(item) => item.id}
              renderItem={(item) => {
                const Icon = NOTIFICATION_ICONS[item.icon] ?? Bell
                return (
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
                )
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}
