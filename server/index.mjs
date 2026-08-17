import { config as loadEnv } from 'dotenv'
import { createPlatformApp } from './app.mjs'
import { assertPlatformMigrations } from './platform/migrations.mjs'

loadEnv()

const port = Number(process.env.PORT?.trim() || 3002)
await assertPlatformMigrations()
const app = createPlatformApp()

app.listen(port, '0.0.0.0', () => {
  console.log(`[platform-api] listening on :${port}`)
})
