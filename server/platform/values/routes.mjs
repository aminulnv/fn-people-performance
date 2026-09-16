import { asyncHandler, HttpError } from '../../errors.mjs'
import {
  requirePlatformAuth,
  requirePlatformPermission,
} from '../auth.mjs'
import { publishWrite } from '../realtime/fromRequest.mjs'
import {
  createValue,
  listValuesSnapshot,
  updateValue,
} from './store.mjs'

function toHttp(err) {
  if (err instanceof HttpError) return err
  const status = err?.statusCode
  if (typeof status === 'number' && status >= 400 && status < 600) {
    return new HttpError(status, err.message || 'Request failed')
  }
  return err
}

export function registerValuesRoutes(app) {
  app.get(
    '/api/platform/values',
    requirePlatformAuth,
    asyncHandler(async (_req, res) => {
      try {
        res.json(await listValuesSnapshot())
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.post(
    '/api/platform/values',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      try {
        const value = await createValue(req.body ?? {}, req.platformUser)
        await publishWrite(req, ['reviews', 'activity'], { valueId: value.id })
        res.status(201).json({ value })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.patch(
    '/api/platform/values/:valueId',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      try {
        const value = await updateValue(
          req.params.valueId,
          req.body ?? {},
          req.platformUser,
        )
        await publishWrite(req, ['reviews', 'activity'], { valueId: value.id })
        res.json({ value })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )
}
