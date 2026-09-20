import pg from 'pg'
import { getPgConfig, isDatabaseConfigured } from '../../db.mjs'
import {
  PLATFORM_EVENT_CHANNEL,
  parsePlatformEventPayload,
} from './event.mjs'
import { loadRealtimeViewer, viewerMayHearEvent } from './audience.mjs'

const clients = new Map()
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

const SCOPE_REFRESH_MS = 15_000

function wireEvent(event) {
  const { audienceEmployeeIds: _audience, ...wire } = event
  return wire
}

export function attachRealtimeClient(res, viewer) {
  clients.set(res, {
    viewer: viewer ?? {
      employeeId: null,
      permissions: new Set(),
      goalSubjectIds: new Set(),
      packetSubjectIds: new Set(),
    },
    user: null,
    loadedAt: Date.now(),
    refreshing: false,
  })
  return () => {
    clients.delete(res)
  }
}

export async function openRealtimeClient(res, user) {
  const viewer = await loadRealtimeViewer(user)
  if (res.writableEnded) return () => {}
  clients.set(res, {
    viewer,
    user,
    loadedAt: Date.now(),
    refreshing: false,
  })
  return () => {
    clients.delete(res)
  }
}

function refreshViewer(state) {
  if (!state.user || state.refreshing) return
  if (Date.now() - state.loadedAt < SCOPE_REFRESH_MS) return
  state.refreshing = true
  loadRealtimeViewer(state.user)
    .then((viewer) => {
      state.viewer = viewer
      state.loadedAt = Date.now()
    })
    .catch((error) => {
      console.error('[realtime] could not refresh viewer scope:', error)
    })
    .finally(() => {
      state.refreshing = false
    })
}

export function broadcastPlatformEvent(event) {
  if (!event || !rememberEventId(event.id)) return
  const frame = `id: ${event.id}\nevent: platform\ndata: ${JSON.stringify(wireEvent(event))}\n\n`
  for (const [res, state] of clients) {
    refreshViewer(state)
    if (!viewerMayHearEvent(state.viewer, event)) continue
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
