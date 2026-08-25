import { asyncHandler, HttpError } from '../../errors.mjs'
import {
  requirePlatformAuth,
  requirePlatformPermission,
} from '../auth.mjs'
import {
  approvePersonGoals,
  cascadeGoalToEmployees,
  copyPreviousCycleGoals,
  getPersonGoals,
  importGoalsBundle,
  listCycleGoalSubmissions,
  savePersonGoalsDraft,
  sendBackPersonGoals,
  submitPersonGoalRating,
  submitPersonGoals,
} from './store.mjs'
import {
  assertGoalAccess,
  listVisibleGoalSubjectIds,
} from './policy.mjs'
import { publishWrite } from '../realtime/fromRequest.mjs'

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
      const subjectEmployeeIds = await listVisibleGoalSubjectIds(
        req.platformUser,
      )
      const submissions = await listCycleGoalSubmissions(
        req.params.cycleId,
        subjectEmployeeIds,
      )
      res.json({ cycleId: req.params.cycleId, submissions })
    }),
  )

  app.get(
    '/api/platform/goal-cycles/:cycleId/people/:employeeId',
    requirePlatformAuth,
    asyncHandler(async (req, res) => {
      const employeeId = parseEmployeeId(req.params.employeeId)
      await assertGoalAccess(req.platformUser, {
        action: 'read',
        cycleId: req.params.cycleId,
        subjectEmployeeId: employeeId,
      })
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
        await assertGoalAccess(req.platformUser, {
          action: 'edit',
          cycleId: req.params.cycleId,
          subjectEmployeeId: employeeId,
        })
        const submission = await savePersonGoalsDraft(
          req.params.cycleId,
          employeeId,
          Array.isArray(req.body?.goals) ? req.body.goals : [],
          req.platformUser,
          req.body?.expectedVersion,
        )
        await publishWrite(req, ['goals', 'activity'], {
          cycleId: req.params.cycleId,
          employeeId,
        })
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
        await assertGoalAccess(req.platformUser, {
          action: 'submit',
          cycleId: req.params.cycleId,
          subjectEmployeeId: employeeId,
        })
        const submission = await submitPersonGoals(
          req.params.cycleId,
          employeeId,
          req.platformUser,
          {
            goals: Array.isArray(req.body?.goals)
              ? req.body.goals
              : undefined,
            expectedVersion: req.body?.expectedVersion,
          },
        )
        await publishWrite(req, ['goals', 'notifications', 'activity'], {
          cycleId: req.params.cycleId,
          employeeId,
        })
        res.json({ submission })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.post(
    '/api/platform/goal-cycles/:cycleId/people/:employeeId/copy-previous',
    requirePlatformAuth,
    asyncHandler(async (req, res) => {
      try {
        const employeeId = parseEmployeeId(req.params.employeeId)
        await assertGoalAccess(req.platformUser, {
          action: 'edit',
          cycleId: req.params.cycleId,
          subjectEmployeeId: employeeId,
        })
        const submission = await copyPreviousCycleGoals(
          req.params.cycleId,
          employeeId,
          req.platformUser,
          req.body?.expectedVersion,
        )
        await publishWrite(req, ['goals', 'activity'], {
          cycleId: req.params.cycleId,
          employeeId,
        })
        res.json({ submission })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.post(
    '/api/platform/goal-cycles/:cycleId/people/:employeeId/goals/:goalId/cascade',
    requirePlatformAuth,
    asyncHandler(async (req, res) => {
      try {
        const sourceEmployeeId = parseEmployeeId(req.params.employeeId)
        const recipientEmployeeIds = Array.isArray(
          req.body?.recipientEmployeeIds,
        )
          ? req.body.recipientEmployeeIds.map(parseEmployeeId)
          : []
        await assertGoalAccess(req.platformUser, {
          action: 'edit',
          cycleId: req.params.cycleId,
          subjectEmployeeId: sourceEmployeeId,
        })
        for (const recipientEmployeeId of recipientEmployeeIds) {
          await assertGoalAccess(req.platformUser, {
            action: 'edit',
            cycleId: req.params.cycleId,
            subjectEmployeeId: recipientEmployeeId,
          })
        }
        const submissions = await cascadeGoalToEmployees(
          req.params.cycleId,
          sourceEmployeeId,
          String(req.params.goalId),
          recipientEmployeeIds,
          req.body?.expectedVersions ?? {},
          req.platformUser,
        )
        await publishWrite(req, ['goals', 'notifications', 'activity'], {
          cycleId: req.params.cycleId,
          employeeId: sourceEmployeeId,
        })
        res.json({ submissions })
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
        await assertGoalAccess(req.platformUser, {
          action: 'approve',
          cycleId: req.params.cycleId,
          subjectEmployeeId: employeeId,
        })
        const submission = await approvePersonGoals(
          req.params.cycleId,
          employeeId,
          req.platformUser,
          {
            goals: Array.isArray(req.body?.goals)
              ? req.body.goals
              : undefined,
            expectedVersion: req.body?.expectedVersion,
          },
        )
        await publishWrite(req, ['goals', 'notifications', 'activity'], {
          cycleId: req.params.cycleId,
          employeeId,
        })
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
        await assertGoalAccess(req.platformUser, {
          action: 'send_back',
          cycleId: req.params.cycleId,
          subjectEmployeeId: employeeId,
        })
        const submission = await sendBackPersonGoals(
          req.params.cycleId,
          employeeId,
          String(req.body?.reason ?? ''),
          req.platformUser,
          req.body?.expectedVersion,
        )
        await publishWrite(req, ['goals', 'notifications', 'activity'], {
          cycleId: req.params.cycleId,
          employeeId,
        })
        res.json({ submission })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.post(
    '/api/platform/goal-cycles/:cycleId/people/:employeeId/rating',
    requirePlatformAuth,
    asyncHandler(async (req, res) => {
      try {
        const employeeId = parseEmployeeId(req.params.employeeId)
        await assertGoalAccess(req.platformUser, {
          action: 'rate',
          cycleId: req.params.cycleId,
          subjectEmployeeId: employeeId,
        })
        const submission = await submitPersonGoalRating(
          req.params.cycleId,
          employeeId,
          req.body?.rating ?? {},
          req.platformUser,
          req.body?.expectedVersion,
        )
        await publishWrite(req, ['goals', 'activity'], {
          cycleId: req.params.cycleId,
          employeeId,
        })
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
        await publishWrite(req, ['goals', 'activity'])
        res.status(201).json({ imported })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )
}
