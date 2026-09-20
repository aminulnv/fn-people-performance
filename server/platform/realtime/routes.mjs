import { requirePlatformAuth } from '../auth.mjs'
import { openRealtimeClient, attachRealtimeClient } from './hub.mjs'

const HEARTBEAT_MS = 25_000

export function registerRealtimeRoutes(app) {
  app.get('/api/platform/events', requirePlatformAuth, async (req, res) => {
    res.status(200)
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    if (typeof res.flushHeaders === 'function') res.flushHeaders()

    res.write('event: ready\ndata: {"ok":true}\n\n')

    let detach = () => {}
    try {
      detach = await openRealtimeClient(res, req.platformUser)
    } catch (error) {
      console.error('[realtime] could not load viewer scope:', error)
      detach = attachRealtimeClient(res)
    }
    const heartbeat = setInterval(() => {
      try {
        res.write(': ping\n\n')
      } catch {
        clearInterval(heartbeat)
        detach()
      }
    }, HEARTBEAT_MS)

    const close = () => {
      clearInterval(heartbeat)
      detach()
    }
    req.on('close', close)
    req.on('end', close)
  })
}
