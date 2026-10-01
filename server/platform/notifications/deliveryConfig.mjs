/**
 * Outbound channel config. Email and ClickUp stay silent until credentials
 * (and optional enable flags) are present — so testing never spams inboxes.
 */

function envFlag(name, fallbackWhenUnset = true) {
  const raw = process.env[name]?.trim().toLowerCase()
  if (raw == null || raw === '') return fallbackWhenUnset
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on'
}

function trim(name) {
  const value = process.env[name]?.trim()
  return value || ''
}

export function emailDeliveryConfig() {
  const host = trim('PLATFORM_SMTP_HOST')
  const from = trim('PLATFORM_SMTP_FROM')
  const user = trim('PLATFORM_SMTP_USER')
  const pass = trim('PLATFORM_SMTP_PASS')
  const portRaw = trim('PLATFORM_SMTP_PORT') || '587'
  const port = Number(portRaw)
  const secure = envFlag('PLATFORM_SMTP_SECURE', false)
  const enabledFlag = envFlag('PLATFORM_EMAIL_DELIVERY_ENABLED', true)
  const configured = Boolean(host && from)
  const enabled = configured && enabledFlag
  return {
    channel: 'email',
    configured,
    enabled,
    host,
    port: Number.isFinite(port) && port > 0 ? port : 587,
    secure,
    user,
    pass,
    from,
    reason: !configured
      ? 'smtp_not_configured'
      : !enabledFlag
        ? 'email_delivery_disabled'
        : null,
  }
}

export function clickupDeliveryConfig() {
  const token = trim('PLATFORM_CLICKUP_API_TOKEN')
  const listId = trim('PLATFORM_CLICKUP_LIST_ID')
  const enabledFlag = envFlag('PLATFORM_CLICKUP_DELIVERY_ENABLED', true)
  const configured = Boolean(token && listId)
  const enabled = configured && enabledFlag
  return {
    channel: 'clickup',
    configured,
    enabled,
    token,
    listId,
    apiBase:
      trim('PLATFORM_CLICKUP_API_BASE') || 'https://api.clickup.com/api/v2',
    reason: !configured
      ? 'clickup_not_configured'
      : !enabledFlag
        ? 'clickup_delivery_disabled'
        : null,
  }
}

export function appPublicBaseUrl() {
  const raw =
    trim('PLATFORM_APP_BASE_URL') ||
    trim('PLATFORM_PUBLIC_APP_URL') ||
    'https://performance.nextventures.io/platform'
  return raw.replace(/\/$/, '')
}

export function notificationDeliveryStatus() {
  const email = emailDeliveryConfig()
  const clickup = clickupDeliveryConfig()
  return {
    email: {
      configured: email.configured,
      enabled: email.enabled,
      reason: email.reason,
    },
    clickup: {
      configured: clickup.configured,
      enabled: clickup.enabled,
      reason: clickup.reason,
    },
    appBaseUrl: appPublicBaseUrl(),
  }
}

/** Initial outbox row status when a notification is created. */
export function initialDeliveryStatus(channel) {
  if (channel === 'in_app') {
    return { status: 'delivered', reason: null }
  }
  if (channel === 'browser') {
    return { status: 'pending', reason: null }
  }
  if (channel === 'email') {
    const email = emailDeliveryConfig()
    if (!email.enabled) {
      return { status: 'not_configured', reason: email.reason }
    }
    return { status: 'pending', reason: null }
  }
  if (channel === 'clickup') {
    const clickup = clickupDeliveryConfig()
    if (!clickup.enabled) {
      return { status: 'not_configured', reason: clickup.reason }
    }
    return { status: 'pending', reason: null }
  }
  return { status: 'not_configured', reason: 'unknown_channel' }
}
