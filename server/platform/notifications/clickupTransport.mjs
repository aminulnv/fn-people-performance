import { clickupDeliveryConfig } from './deliveryConfig.mjs'

/**
 * ClickUp delivery stub. Ready for credentials; does not call the API until
 * PLATFORM_CLICKUP_API_TOKEN + PLATFORM_CLICKUP_LIST_ID are set (and enabled).
 *
 * Intended behaviour once live: create a short task (or comment) on the list
 * with the same title/body as the in-app notification so assignees see it in
 * ClickUp without a separate product path.
 */
export async function sendNotificationClickup({
  title,
  body,
  destination,
  recipientEmail,
  recipientName,
}) {
  const config = clickupDeliveryConfig()
  if (!config.enabled) {
    const error = new Error(config.reason || 'clickup_not_configured')
    error.code = 'NOT_CONFIGURED'
    throw error
  }

  const description = [
    body,
    '',
    recipientName ? `For: ${recipientName}` : null,
    recipientEmail ? `Email: ${recipientEmail}` : null,
    destination ? `App path: ${destination}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const response = await fetch(
    `${config.apiBase}/list/${encodeURIComponent(config.listId)}/task`,
    {
      method: 'POST',
      headers: {
        Authorization: config.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: title,
        description,
        status: 'Open',
      }),
    },
  )

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    const error = new Error(
      `clickup_http_${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`,
    )
    error.code = 'CLICKUP_HTTP'
    throw error
  }
}
