import { asyncHandler, HttpError } from '../../errors.mjs'
import {
  requirePlatformAuth,
  requirePlatformPermission,
} from '../auth.mjs'
import { publishWrite } from '../realtime/fromRequest.mjs'
import {
  createSkill,
  listSkillsSnapshot,
  updateSkill,
} from './store.mjs'

function toHttp(err) {
  if (err instanceof HttpError) return err
  const status = err?.statusCode
  if (typeof status === 'number' && status >= 400 && status < 600) {
    return new HttpError(status, err.message || 'Request failed')
  }
  return err
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

  app.patch(
    '/api/platform/skills/:skillId',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      try {
        const skill = await updateSkill(
          req.params.skillId,
          req.body ?? {},
          req.platformUser,
        )
        await publishWrite(req, ['reviews', 'activity'], { skillId: skill.id })
        res.json({ skill })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.put(
    '/api/platform/skills/assignments/:employeeId',
    requirePlatformAuth,
    asyncHandler(async (_req, _res) => {
      throw new HttpError(
        403,
        'Skills belong on a role. Assign that role to the person.',
      )
    }),
  )
}
