export type NotificationIconName = 'target' | 'clipboard-check' | 'users'

export type NotificationItem = {
  id: string
  title: string
  body: string
  time: string
  unread: boolean
  /** Icon key resolved in the UI — safe for JSON APIs. */
  icon: NotificationIconName
}

/** Demo feed — replace with `apiFetch('/notifications')` when the API exists. */
export async function fetchNotifications(): Promise<NotificationItem[]> {
  await Promise.resolve()
  return [
    {
      id: '1',
      title: 'Goal check-in due',
      body: 'Q3 check-ins for your team close Friday.',
      time: '2h ago',
      unread: true,
      icon: 'target',
    },
    {
      id: '2',
      title: 'Review ready to grade',
      body: '3 employees are waiting on performance ratings.',
      time: 'Yesterday',
      unread: true,
      icon: 'clipboard-check',
    },
    {
      id: '3',
      title: 'Team update',
      body: 'Two new hires were added to Product Design.',
      time: 'Mon',
      unread: false,
      icon: 'users',
    },
  ]
}
