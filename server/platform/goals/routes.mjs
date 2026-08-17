import { asyncHandler, HttpError } from '../../errors.mjs'
import {
  requirePlatformAuth,
  requirePlatformPermission,
} from '../auth.mjs'
import {
  approvePersonGoals,
  getPersonGoals,
  importGoalsBundle,
  listCycleGoalSubmissions,
  savePersonGoalsDraft,
  sendBackPersonGoals,
  submitPersonGoals,
} from './store.mjs'

function toHttp(err) {
  if (err instanceof HttpError) return err
  const status = err?.statusCode
  if (typeof status === 'number' && status >= 400 && status < 600) {
    return new HttpError(status, err.message || 'Request failed')
  }
  return err
}

function parseEmployeeId(value) {
  const employeeId = Number(value)
  if (!Number.isInteger(employeeId)) {
    throw new HttpError(400, 'Invalid employee id')
  }
  return employeeId
}

export function registerGoalRoutes(app) {
  app.get(
    '/api/platform/goal-cycles/:cycleId',
    requirePlatformAuth,
    asyncHandler(async (req, res) => {
      const submissions = await listCycleGoalSubmissions(req.params.cycleId)
      res.json({ cycleId: req.params.cycleId, submissions })
    }),
  )

  app.get(
    '/api/platform/goal-cycles/:cycleId/people/:employeeId',
    requirePlatformAuth,
    asyncHandler(async (req, res) => {
      const employeeId = parseEmployeeId(req.params.employeeId)
      const submission = await getPersonGoals(req.params.cycleId, employeeId)
      res.json({ submission })
    }),
  )

  app.put(
    '/api/platform/goal-cycles/:cycleId/people/:employeeId/draft',
    requirePlatformAuth,
    asyncHandler(async (req, res) => {
      try {
        const employeeId = parseEmployeeId(req.params.employeeId)
        const submission = await savePersonGoalsDraft(
          req.params.cycleId,
          employeeId,
          Array.isArray(req.body?.goals) ? req.body.goals : [],
          req.platformUser,
          req.body?.expectedVersion,
        )
        res.json({ submission })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.post(
    '/api/platform/goal-cycles/:cycleId/people/:employeeId/submit',
    requirePlatformAuth,
    asyncHandler(async (req, res) => {
      try {
        const employeeId = parseEmployeeId(req.params.employeeId)
        const submission = await submitPersonGoals(
          req.params.cycleId,
          employeeId,
          req.platformUser,
          {
            late: Boolean(req.body?.late),
            expectedVersion: req.body?.expectedVersion,
          },
        )
        res.json({ submission })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.post(
    '/api/platform/goal-cycles/:cycleId/people/:employeeId/approve',
    requirePlatformAuth,
    asyncHandler(async (req, res) => {
      try {
        const employeeId = parseEmployeeId(req.params.employeeId)
        const submission = await approvePersonGoals(
          req.params.cycleId,
          employeeId,
          req.platformUser,
          req.body?.expectedVersion,
        )
        res.json({ submission })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.post(
    '/api/platform/goal-cycles/:cycleId/people/:employeeId/send-back',
    requirePlatformAuth,
    asyncHandler(async (req, res) => {
      try {
        const employeeId = parseEmployeeId(req.params.employeeId)
        const submission = await sendBackPersonGoals(
          req.params.cycleId,
          employeeId,
          String(req.body?.reason ?? ''),
          req.platformUser,
          req.body?.expectedVersion,
        )
        res.json({ submission })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.post(
    '/api/platform/goal-imports',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      try {
        const imported = await importGoalsBundle(
          Array.isArray(req.body?.entries) ? req.body.entries : [],
          req.platformUser,
          String(req.body?.fingerprint ?? ''),
        )
        res.status(201).json({ imported })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )
}
