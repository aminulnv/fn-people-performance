import { resolveApiUrl } from '@/lib/apiClient'
import { parsePlatformEvent } from './event'
import { refreshAllPlatformStores, schedulePlatformEvent } from './handlers'

const BACKOFF_MS = [1000, 2000, 5000, 10_000, 30_000]
const STALE_AFTER_MS = 30_000

export type PlatformRealtimeStatus = 'off' | 'connecting' | 'live' | 'fallback'

let source: EventSource | null = null
let reconnectTimer: number | null = null
let attempt = 0
let lastEventAt = 0
let started = false
let status: PlatformRealtimeStatus = 'off'
const statusListeners = new Set<(next: PlatformRealtimeStatus) => void>()

function setStatus(next: PlatformRealtimeStatus) {
  if (status === next) return
  status = next
  for (const listener of statusListeners) listener(next)
}

export function getPlatformRealtimeStatus(): PlatformRealtimeStatus {
  return status
}

export function subscribePlatformRealtimeStatus(
  listener: (next: PlatformRealtimeStatus) => void,
): () => void {
  statusListeners.add(listener)
  listener(status)
  return () => {
    statusListeners.delete(listener)
  }
}

function useLocalRealtime(): boolean {
  return (
    import.meta.env.MODE === 'test' ||
    import.meta.env.VITE_GOALS_BACKEND === 'local' ||
    import.meta.env.VITE_EMPLOYEES_BACKEND === 'local'
  )
}

function clearReconnect() {
  if (reconnectTimer == null) return
  window.clearTimeout(reconnectTimer)
  reconnectTimer = null
}

function scheduleReconnect() {
  if (!started) return
  clearReconnect()
  setStatus('fallback')
  const delay = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)]
  attempt += 1
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null
    connect()
  }, delay)
}

function handleMessage(raw: string) {
  try {
    const event = parsePlatformEvent(JSON.parse(raw) as unknown)
    if (!event) return
    lastEventAt = Date.now()
    schedulePlatformEvent(event)
  } catch {
    /* ignore malformed frames */
  }
}

function connect() {
  if (!started || useLocalRealtime()) return
  source?.close()
  setStatus(attempt === 0 ? 'connecting' : 'fallback')
  const next = new EventSource(resolveApiUrl('/api/platform/events'), {
    withCredentials: true,
  })
  source = next
  next.addEventListener('ready', () => {
    const wasReconnect = attempt > 0 || status === 'fallback'
    attempt = 0
    lastEventAt = Date.now()
    setStatus('live')
    if (wasReconnect) refreshAllPlatformStores()
  })
  next.addEventListener('platform', (message) => {
    handleMessage((message as MessageEvent<string>).data)
  })
  next.onerror = () => {
    next.close()
    if (source === next) source = null
    scheduleReconnect()
  }
}

function onVisibility() {
  if (document.visibilityState !== 'visible') return
  if (status !== 'live' || Date.now() - lastEventAt > STALE_AFTER_MS) {
    refreshAllPlatformStores()
  }
  if (status !== 'live' && started) connect()
}

export function startPlatformRealtime(): () => void {
  if (useLocalRealtime()) {
    setStatus('off')
    return () => {}
  }
  if (started) return stopPlatformRealtime
  started = true
  lastEventAt = Date.now()
  connect()
  document.addEventListener('visibilitychange', onVisibility)
  return stopPlatformRealtime
}

export function stopPlatformRealtime(): void {
  started = false
  clearReconnect()
  source?.close()
  source = null
  document.removeEventListener('visibilitychange', onVisibility)
  setStatus('off')
}
