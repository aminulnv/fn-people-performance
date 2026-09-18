import { asyncHandler, HttpError } from '../../errors.mjs'
import {
  requirePlatformAuth,
  requirePlatformPermission,
} from '../auth.mjs'
import { publishWrite } from '../realtime/fromRequest.mjs'
import {
  createRole,
  duplicateRole,
  getRole,
  listRoles,
  replaceRoleMatrix,
  updateRole,
} from './store.mjs'

function toHttp(err) {
  if (err instanceof HttpError) return err
  const status = err?.statusCode
  if (typeof status === 'number' && status >= 400 && status < 600) {
    return new HttpError(status, err.message || 'Request failed')
  }
  return err
}

export function registerRolesRoutes(app) {
  app.get(
    '/api/platform/roles',
    requirePlatformAuth,
    asyncHandler(async (_req, res) => {
      try {
        res.json({ roles: await listRoles() })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.get(
    '/api/platform/roles/:roleId',
    requirePlatformAuth,
    asyncHandler(async (req, res) => {
      try {
        const role = await getRole(req.params.roleId)
        if (!role) throw new HttpError(404, 'Role not found.')
        res.json({ role })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.post(
    '/api/platform/roles',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      try {
        const role = await createRole(req.body ?? {}, req.platformUser)
        await publishWrite(req, ['employees', 'reviews', 'activity'], {
          roleId: role.id,
        })
        res.status(201).json({ role })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.post(
    '/api/platform/roles/:roleId/duplicate',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      try {
        const role = await duplicateRole(req.params.roleId, req.platformUser)
        await publishWrite(req, ['employees', 'reviews', 'activity'], {
          roleId: role.id,
        })
        res.status(201).json({ role })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.patch(
    '/api/platform/roles/:roleId',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      try {
        const role = await updateRole(
          req.params.roleId,
          req.body ?? {},
          req.platformUser,
        )
        await publishWrite(req, ['employees', 'reviews', 'activity'], {
          roleId: role.id,
        })
        res.json({ role })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.put(
    '/api/platform/roles/:roleId/matrix',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      try {
        const role = await replaceRoleMatrix(
          req.params.roleId,
          req.body?.skills,
          req.platformUser,
        )
        await publishWrite(req, ['employees', 'reviews', 'activity'], {
          roleId: role.id,
        })
        res.json({ role })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )
}
