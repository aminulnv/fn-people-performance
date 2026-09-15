import { asyncHandler, HttpError } from '../../errors.mjs'
import {
  requirePlatformAuth,
  requirePlatformPermission,
} from '../auth.mjs'
import { publishWrite } from '../realtime/fromRequest.mjs'
import {
  createSkill,
  listSkillsSnapshot,
  setEmployeeSkillIds,
} from './store.mjs'

function toHttp(err) {
  if (err instanceof HttpError) return err
  const status = err?.statusCode
  if (typeof status === 'number' && status >= 400 && status < 600) {
    return new HttpError(status, err.message || 'Request failed')
  }
  return err
}

function hasWriteAll(platformUser) {
  const permissions = platformUser?.permissions
  return Array.isArray(permissions) && permissions.includes('platform.write_all')
}

function canEditEmployeeSkills(platformUser, employeeId) {
  if (hasWriteAll(platformUser)) return true
  return Number(platformUser?.employeeId) === Number(employeeId)
}

export function registerSkillsRoutes(app) {
  app.get(
    '/api/platform/skills',
    requirePlatformAuth,
    asyncHandler(async (_req, res) => {
      try {
        res.json(await listSkillsSnapshot())
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.post(
    '/api/platform/skills',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      try {
        const skill = await createSkill(req.body ?? {}, req.platformUser)
        await publishWrite(req, ['reviews', 'activity'], { skillId: skill.id })
        res.status(201).json({ skill })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.put(
    '/api/platform/skills/assignments/:employeeId',
    requirePlatformAuth,
    asyncHandler(async (req, res) => {
      const employeeId = Number(req.params.employeeId)
      if (!canEditEmployeeSkills(req.platformUser, employeeId)) {
        throw new HttpError(403, 'You cannot edit skills for this person.')
      }
      try {
        const assignment = await setEmployeeSkillIds(
          employeeId,
          req.body?.skillIds,
          req.platformUser,
        )
        await publishWrite(req, ['reviews', 'activity'], {
          employeeId: assignment.employeeId,
        })
        res.json({ assignment })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )
}
