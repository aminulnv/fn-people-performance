import { useEffect } from 'react'
import type { PlatformEvent, PlatformTopic } from './event'
import { subscribePlatformTopic } from './invalidation'

/** Page-local refetch when a live event matches this screen. */
export function useLiveTopic(
  topic: PlatformTopic,
  onEvent: (event: PlatformEvent) => void,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled) return
    return subscribePlatformTopic(topic, onEvent)
  }, [enabled, onEvent, topic])
}
