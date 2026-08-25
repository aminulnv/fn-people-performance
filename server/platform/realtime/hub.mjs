import pg from 'pg'
import { getPgConfig, isDatabaseConfigured } from '../../db.mjs'
import {
  PLATFORM_EVENT_CHANNEL,
  parsePlatformEventPayload,
} from './event.mjs'

const clients = new Set()
const seenEventIds = new Set()
const SEEN_LIMIT = 800
let listenClient = null
let listenStarted = false
let reconnectTimer = null

function rememberEventId(id) {
  if (!id || seenEventIds.has(id)) return false
  seenEventIds.add(id)
  if (seenEventIds.size > SEEN_LIMIT) {
    const first = seenEventIds.values().next().value
    seenEventIds.delete(first)
  }
  return true
}

export function attachRealtimeClient(res) {
  clients.add(res)
  return () => {
    clients.delete(res)
  }
}

export function broadcastPlatformEvent(event) {
  if (!event || !rememberEventId(event.id)) return
  const frame = `id: ${event.id}\nevent: platform\ndata: ${JSON.stringify(event)}\n\n`
  for (const res of clients) {
    try {
      res.write(frame)
    } catch {
      clients.delete(res)
    }
  }
}

function scheduleListenReconnect() {
  if (reconnectTimer) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    listenClient = null
    listenStarted = false
    void startRealtimeHub()
  }, 5000)
}

async function listenForNotifications() {
  if (!isDatabaseConfigured()) return
  const client = new pg.Client(getPgConfig())
  listenClient = client
  client.on('error', (error) => {
    console.error('[realtime] listen connection failed:', error)
    try {
      client.end().catch(() => {})
    } catch {
      /* already closed */
    }
    if (listenClient === client) scheduleListenReconnect()
  })
  client.on('end', () => {
    if (listenClient === client) scheduleListenReconnect()
  })
  await client.connect()
  await client.query(`LISTEN ${PLATFORM_EVENT_CHANNEL}`)
  client.on('notification', (message) => {
    if (message.channel !== PLATFORM_EVENT_CHANNEL) return
    const event = parsePlatformEventPayload(message.payload)
    if (event) broadcastPlatformEvent(event)
  })
}

export async function startRealtimeHub() {
  if (listenStarted) return
  listenStarted = true
  try {
    await listenForNotifications()
  } catch (error) {
    console.error('[realtime] could not LISTEN for platform events:', error)
    listenStarted = false
    scheduleListenReconnect()
  }
}

export function resetRealtimeHubForTests() {
  clients.clear()
  seenEventIds.clear()
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  listenStarted = false
  if (listenClient) {
    listenClient.end().catch(() => {})
    listenClient = null
  }
}
