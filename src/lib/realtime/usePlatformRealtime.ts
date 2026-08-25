import { useEffect } from 'react'
import { startPlatformRealtime } from './client'

/** One SSE connection for the signed-in shell. REST refetch is the fallback. */
export function usePlatformRealtime(): void {
  useEffect(() => startPlatformRealtime(), [])
}

export function PlatformRealtime() {
  usePlatformRealtime()
  return null
}
