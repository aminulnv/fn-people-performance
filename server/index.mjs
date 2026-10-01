import { config as loadEnv } from 'dotenv'
import { createPlatformApp } from './app.mjs'
import { assertPlatformMigrations } from './platform/migrations.mjs'
import { startCycleStageScheduler } from './platform/jobs/cycleStageScheduler.mjs'
import { notificationDeliveryStatus } from './platform/notifications/deliveryConfig.mjs'
import { startNotificationDeliveryWorker } from './platform/notifications/deliveryWorker.mjs'
import { startRealtimeHub } from './platform/realtime/hub.mjs'
import { sessionSecret } from './platform/sessionSecret.mjs'

loadEnv()
sessionSecret()

const port = Number(process.env.PORT?.trim() || 3002)
await assertPlatformMigrations()
await startRealtimeHub()
startNotificationDeliveryWorker()
startCycleStageScheduler()
const app = createPlatformApp()

app.listen(port, '0.0.0.0', () => {
  const delivery = notificationDeliveryStatus()
  console.log(`[platform-api] listening on :${port}`)
  console.log(
    `[platform-api] email delivery: ${delivery.email.enabled ? 'ON' : 'off'} (${delivery.email.reason || 'ready'})`,
  )
  console.log(
    `[platform-api] clickup delivery: ${delivery.clickup.enabled ? 'ON' : 'off'} (${delivery.clickup.reason || 'ready'})`,
  )
})
