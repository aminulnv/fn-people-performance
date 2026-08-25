import type { PlatformEvent, PlatformTopic } from './event'

type Listener = (event: PlatformEvent) => void

const listeners = new Map<PlatformTopic, Set<Listener>>()
const anyListeners = new Set<Listener>()

export function subscribePlatformTopic(
  topic: PlatformTopic,
  listener: Listener,
): () => void {
  const bucket = listeners.get(topic) ?? new Set<Listener>()
  bucket.add(listener)
  listeners.set(topic, bucket)
  return () => {
    bucket.delete(listener)
    if (bucket.size === 0) listeners.delete(topic)
  }
}

export function subscribePlatformEvents(listener: Listener): () => void {
  anyListeners.add(listener)
  return () => {
    anyListeners.delete(listener)
  }
}

export function emitPlatformEvent(event: PlatformEvent): void {
  for (const listener of anyListeners) listener(event)
  const bucket = listeners.get(event.topic)
  if (!bucket) return
  for (const listener of bucket) listener(event)
}

export function resetPlatformInvalidationForTests(): void {
  listeners.clear()
  anyListeners.clear()
}
