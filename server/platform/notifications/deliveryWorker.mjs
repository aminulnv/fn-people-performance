import { getPool } from '../../db.mjs'
import { clickupDeliveryConfig, emailDeliveryConfig } from './deliveryConfig.mjs'
import { sendNotificationClickup } from './clickupTransport.mjs'
import { sendNotificationEmail } from './emailTransport.mjs'

const DEFAULT_BATCH = 25
const RETRY_MINUTES = [1, 5, 15, 60, 240]

let timer = null
let running = false

function backoffMinutes(attempts) {
  return RETRY_MINUTES[Math.min(attempts, RETRY_MINUTES.length - 1)]
}

async function markDelivery(client, id, patch) {
  await client.query(
    `UPDATE platform.notification_deliveries
     SET
       status = COALESCE($2, status),
       attempts = COALESCE($3, attempts),
       next_attempt_at = $4,
       delivered_at = COALESCE($5, delivered_at),
       last_error = $6,
       updated_at = now()
     WHERE id = $1`,
    [
      id,
      patch.status ?? null,
      patch.attempts ?? null,
      patch.nextAttemptAt ?? null,
      patch.deliveredAt ?? null,
      patch.lastError ?? null,
    ],
  )
}

async function claimPendingBatch(limit) {
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    // Lease rows for ~2 minutes so a second API instance does not double-send.
    const { rows } = await client.query(
      `WITH due AS (
         SELECT d.id
         FROM platform.notification_deliveries d
         WHERE d.channel IN ('email', 'clickup')
           AND d.status IN ('pending', 'failed')
           AND (d.next_attempt_at IS NULL OR d.next_attempt_at <= now())
         ORDER BY d.next_attempt_at NULLS FIRST, d.id
         LIMIT $1
         FOR UPDATE OF d SKIP LOCKED
       )
       UPDATE platform.notification_deliveries d
       SET next_attempt_at = now() + interval '2 minutes',
           updated_at = now()
       FROM due
       WHERE d.id = due.id
       RETURNING d.id`,
      [limit],
    )
    if (rows.length === 0) {
      await client.query('COMMIT')
      return []
    }
    const ids = rows.map((row) => row.id)
    const { rows: claimed } = await client.query(
      `SELECT
         d.id AS delivery_id,
         d.channel,
         d.attempts,
         n.id AS notification_id,
         n.title,
         n.body,
         n.destination,
         n.recipient_employee_id,
         e.email AS recipient_email,
         e.name AS recipient_name
       FROM platform.notification_deliveries d
       INNER JOIN platform.notifications n ON n.id = d.notification_id
       LEFT JOIN platform.employees e ON e.employee_id = n.recipient_employee_id
       WHERE d.id = ANY($1::bigint[])
       ORDER BY d.id`,
      [ids],
    )
    await client.query('COMMIT')
    return claimed
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function deliverOne(row) {
  const client = await getPool().connect()
  const attempts = Number(row.attempts ?? 0) + 1
  try {
    if (row.channel === 'email') {
      const email = emailDeliveryConfig()
      if (!email.enabled) {
        await markDelivery(client, row.delivery_id, {
          status: 'not_configured',
          attempts,
          nextAttemptAt: null,
          lastError: email.reason,
        })
        return { status: 'not_configured' }
      }
      await sendNotificationEmail({
        to: row.recipient_email,
        title: row.title,
        body: row.body,
        destination: row.destination,
      })
    } else if (row.channel === 'clickup') {
      const clickup = clickupDeliveryConfig()
      if (!clickup.enabled) {
        await markDelivery(client, row.delivery_id, {
          status: 'not_configured',
          attempts,
          nextAttemptAt: null,
          lastError: clickup.reason,
        })
        return { status: 'not_configured' }
      }
      await sendNotificationClickup({
        title: row.title,
        body: row.body,
        destination: row.destination,
        recipientEmail: row.recipient_email,
        recipientName: row.recipient_name,
      })
    } else {
      await markDelivery(client, row.delivery_id, {
        status: 'not_configured',
        attempts,
        nextAttemptAt: null,
        lastError: 'unknown_channel',
      })
      return { status: 'not_configured' }
    }

    await markDelivery(client, row.delivery_id, {
      status: 'delivered',
      attempts,
      nextAttemptAt: null,
      deliveredAt: new Date().toISOString(),
      lastError: null,
    })
    return { status: 'delivered' }
  } catch (error) {
    if (error?.code === 'NOT_CONFIGURED') {
      await markDelivery(client, row.delivery_id, {
        status: 'not_configured',
        attempts,
        nextAttemptAt: null,
        lastError: error.message,
      })
      return { status: 'not_configured' }
    }
    const delayMin = backoffMinutes(attempts)
    const next = new Date(Date.now() + delayMin * 60_000).toISOString()
    await markDelivery(client, row.delivery_id, {
      status: 'failed',
      attempts,
      nextAttemptAt: next,
      lastError: String(error?.message || error).slice(0, 500),
    })
    return { status: 'failed' }
  } finally {
    client.release()
  }
}

export async function processNotificationDeliveries({
  limit = DEFAULT_BATCH,
} = {}) {
  if (running) return { skipped: true }
  running = true
  try {
    const rows = await claimPendingBatch(limit)
    const summary = {
      claimed: rows.length,
      delivered: 0,
      failed: 0,
      not_configured: 0,
    }
    for (const row of rows) {
      const result = await deliverOne(row)
      if (result.status === 'delivered') summary.delivered += 1
      else if (result.status === 'failed') summary.failed += 1
      else if (result.status === 'not_configured') summary.not_configured += 1
    }
    return summary
  } finally {
    running = false
  }
}

/**
 * Starts a lightweight outbox poller. Safe when SMTP/ClickUp are unset:
 * new rows are written as not_configured at create time; any leftover pending
 * rows are marked not_configured instead of being emailed.
 */
export function startNotificationDeliveryWorker({
  intervalMs = Number(process.env.PLATFORM_NOTIFICATION_DELIVERY_INTERVAL_MS || 15_000),
} = {}) {
  if (timer) return
  const tick = () => {
    void processNotificationDeliveries().catch((error) => {
      console.error('[platform-api] notification delivery tick failed', error)
    })
  }
  timer = setInterval(tick, Math.max(5_000, intervalMs))
  if (typeof timer.unref === 'function') timer.unref()
  // One pass shortly after boot so pending rows drain without waiting a full interval.
  setTimeout(tick, 2_000).unref?.()
  console.log(
    `[platform-api] notification delivery worker every ${Math.max(5_000, intervalMs)}ms`,
  )
}

export function stopNotificationDeliveryWorker() {
  if (!timer) return
  clearInterval(timer)
  timer = null
}
