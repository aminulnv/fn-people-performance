/**
 * Standalone Express app — /api/platform/* only.
 * Neighbor to NEXT-Performance on the same EC2; not mounted inside their container.
 */
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { errorHandler } from './errors.mjs'
import { registerPlatformRoutes } from './platform/routes.mjs'

export function createPlatformApp() {
  const app = express()
  app.set('trust proxy', 1)

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  )

  const origin = process.env.APP_URL?.trim().replace(/\/$/, '') || true
  app.use(
    cors({
      origin,
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '1mb' }))

  registerPlatformRoutes(app)

  app.get('/api/platform', (_req, res) => {
    res.json({ ok: true, service: 'platform-api' })
  })

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  app.use(errorHandler)
  return app
}
