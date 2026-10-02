import {
  appPublicBaseUrl,
  emailDeliveryConfig,
} from './deliveryConfig.mjs'
import {
  absoluteNotificationUrl,
  sanitizeNotificationDestination,
} from './sanitizeDestination.mjs'

/**
 * Sends one notification email. No-ops / throws clearly when SMTP is off so
 * the outbox worker can record not_configured or failed without crashing.
 */
export async function sendNotificationEmail({
  to,
  title,
  body,
  destination,
}) {
  const config = emailDeliveryConfig()
  if (!config.enabled) {
    const error = new Error(config.reason || 'smtp_not_configured')
    error.code = 'NOT_CONFIGURED'
    throw error
  }
  if (!to) {
    const error = new Error('recipient_email_missing')
    error.code = 'NO_RECIPIENT'
    throw error
  }

  const nodemailer = await import('nodemailer')
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user
      ? { user: config.user, pass: config.pass }
      : undefined,
  })

  const safeDestination = sanitizeNotificationDestination(destination)
  const link = absoluteNotificationUrl(safeDestination, appPublicBaseUrl())

  const text = [
    body,
    '',
    safeDestination ? `Open in People Performance: ${link}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const html = `
    <p style="font-family:sans-serif;font-size:15px;line-height:1.5;color:#111">
      ${escapeHtml(body)}
    </p>
    ${
      safeDestination
        ? `<p style="font-family:sans-serif;font-size:14px">
            <a href="${escapeHtml(link)}">Open in People Performance</a>
          </p>`
        : ''
    }
  `

  await transporter.sendMail({
    from: config.from,
    to,
    subject: title,
    text,
    html,
  })
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
