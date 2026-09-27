import { asyncHandler, HttpError } from '../../errors.mjs'
import {
  requirePlatformAuth,
  requirePlatformPermission,
} from '../auth.mjs'
import { publishWrite } from '../realtime/fromRequest.mjs'
import {
  listNotificationRules,
  resetNotificationRule,
  sendTestNotificationRule,
  updateNotificationRule,
} from './store.mjs'

function toHttp(err) {
  if (err instanceof HttpError) return err
  const status = err?.statusCode
  if (typeof status === 'number' && status >= 400 && status < 600) {
    return new HttpError(status, err.message || 'Request failed')
  }
  return err
}

export function registerNotificationRuleRoutes(app) {
  app.get(
    '/api/platform/notification-rules',
    requirePlatformAuth,
    asyncHandler(async (_req, res) => {
      try {
        res.json({ rules: await listNotificationRules() })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.patch(
    '/api/platform/notification-rules/:eventKey',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      try {
        const rule = await updateNotificationRule(
          String(req.params.eventKey),
          req.body ?? {},
          req.platformUser,
        )
        await publishWrite(req, ['notification-rules'], {
          eventKey: rule.eventKey,
        })
        res.json({ rule })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.post(
    '/api/platform/notification-rules/:eventKey/reset',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      try {
        const rule = await resetNotificationRule(
          String(req.params.eventKey),
          req.platformUser,
        )
        await publishWrite(req, ['notification-rules'], {
          eventKey: rule.eventKey,
        })
        res.json({ rule })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.post(
    '/api/platform/notification-rules/:eventKey/test',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      try {
        const result = await sendTestNotificationRule(
          String(req.params.eventKey),
          req.platformUser,
        )
        const employeeId = Number(req.platformUser.employeeId)
        await publishWrite(req, ['notifications'], { employeeId })
        res.status(201).json(result)
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )
}
