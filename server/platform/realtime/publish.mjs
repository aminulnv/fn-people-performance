import { getPool } from '../../db.mjs'
import { PLATFORM_EVENT_CHANNEL, normalizePlatformEvent } from './event.mjs'
import { broadcastPlatformEvent } from './hub.mjs'

export async function publishPlatformEvent(input) {
  const event = normalizePlatformEvent(input)
  if (!event) return null
  broadcastPlatformEvent(event)
  try {
    await getPool().query('SELECT pg_notify($1, $2)', [
      PLATFORM_EVENT_CHANNEL,
      JSON.stringify(event),
    ])
  } catch (error) {
    console.error('[realtime] pg_notify failed:', error)
  }
  return event
}

export async function publishPlatformTopics(topics, meta = {}) {
  const unique = [...new Set(topics)]
  for (const topic of unique) {
    await publishPlatformEvent({ ...meta, topic })
  }
}
