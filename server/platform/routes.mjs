/**
 * /api/platform/* — People Performance on shared RDS.
 * Auth is platform-only (pd_platform_sid) — not dashboard Google / pd.sid.
 */
import { asyncHandler, HttpError } from '../errors.mjs'
import {
  registerPlatformAuthRoutes,
  requirePlatformAuth,
  requirePlatformPermission,
} from './auth.mjs'
import {
  listPlatformNotifications,
  markAllPlatformNotificationsRead,
  markPlatformNotificationRead,
} from './notifications.mjs'
import {
  createPlatformDepartment,
  getPlatformEmployee,
  getPlatformEmployeeProfile,
  listPlatformDepartments,
  listPlatformDivisions,
  listPlatformEmployees,
  listPlatformTeams,
  listAccessControl,
  setEmployeeAccess,
  upsertPlatformEmployee,
} from './store.mjs'
import { listActivityEvents } from './activity.mjs'
import { registerReviewCycleRoutes } from './reviewCycles/routes.mjs'
import { registerReviewPacketRoutes } from './reviewPackets/routes.mjs'
import { registerGoalRoutes } from './goals/routes.mjs'
import { registerOkrRoutes } from './okr/routes.mjs'
import { registerRealtimeRoutes } from './realtime/routes.mjs'
import { publishWrite } from './realtime/fromRequest.mjs'
import {
  assignManagerDelegation,
  canViewManagerDelegations,
  listManagerDelegations,
  revokeManagerDelegation,
} from './delegations.mjs'

function toHttp(err) {
  if (err instanceof HttpError) return err
  const status = err?.statusCode
  if (typeof status === 'number' && status >= 400 && status < 600) {
    return new HttpError(status, err.message || 'Request failed')
  }
  return err
}

export function registerPlatformRoutes(app) {
  registerPlatformAuthRoutes(app)
  registerRealtimeRoutes(app)

  app.get(
    '/api/platform/health',
    asyncHandler(async (_req, res) => {
      const googleConfigured = Boolean(
        process.env.PLATFORM_GOOGLE_CLIENT_ID?.trim() &&
          process.env.PLATFORM_GOOGLE_CLIENT_SECRET?.trim(),
      )
      res.json({
        ok: true,
        schema: 'platform',
        auth: 'platform',
        googleOAuthConfigured: googleConfigured,
      })
    }),
  )

  app.get(
    '/api/platform/notifications',
    requirePlatformAuth,
    asyncHandler(async (req, res) => {
      const employeeId = Number(req.platformUser.employeeId)
      if (!Number.isInteger(employeeId)) {
        res.json({ items: [], unreadCount: 0, openActionCount: 0 })
        return
      }
      res.json(await listPlatformNotifications(employeeId))
    }),
  )

  app.post(
    '/api/platform/notifications/:notificationId/read',
    requirePlatformAuth,
    asyncHandler(async (req, res) => {
      const employeeId = Number(req.platformUser.employeeId)
      if (!Number.isInteger(employeeId)) {
        throw new HttpError(400, 'Signed-in employee is required')
      }
      await markPlatformNotificationRead(
        employeeId,
        String(req.params.notificationId),
      )
      await publishWrite(req, ['notifications'], { employeeId })
      res.json({ ok: true })
    }),
  )

  app.post(
    '/api/platform/notifications/read-all',
    requirePlatformAuth,
    asyncHandler(async (req, res) => {
      const employeeId = Number(req.platformUser.employeeId)
      if (!Number.isInteger(employeeId)) {
        throw new HttpError(400, 'Signed-in employee is required')
      }
      await markAllPlatformNotificationsRead(employeeId)
      await publishWrite(req, ['notifications'], { employeeId })
      res.json({ ok: true })
    }),
  )

  app.get(
    '/api/platform/access-control',
    requirePlatformAuth,
    requirePlatformPermission('platform.read_all'),
    asyncHandler(async (_req, res) => {
      res.json(await listAccessControl())
    }),
  )

  app.put(
    '/api/platform/access-control/employees/:employeeId',
    requirePlatformAuth,
    requirePlatformPermission('access.manage'),
    asyncHandler(async (req, res) => {
      const employeeId = Number(req.params.employeeId)
      if (!Number.isInteger(employeeId)) {
        throw new HttpError(400, 'Invalid employee id')
      }
      const employee = await getPlatformEmployee(employeeId)
      if (!employee) throw new HttpError(404, 'Employee not found')

      const profileKey =
        req.body?.profileKey == null ? null : String(req.body.profileKey)
      const access = await listAccessControl()
      if (
        profileKey &&
        !access.profiles.some((profile) => profile.key === profileKey)
      ) {
        throw new HttpError(400, 'Unknown access profile')
      }

      const assignment = await setEmployeeAccess(
        employeeId,
        profileKey,
        req.platformUser.employeeId,
        req.platformUser,
      )
      await publishWrite(req, ['access', 'employees', 'activity'], {
        employeeId,
      })
      res.json({ assignment })
    }),
  )

  app.get(
    '/api/platform/manager-delegations',
    requirePlatformAuth,
    asyncHandler(async (req, res) => {
      const employeeId = req.query.employeeId
        ? Number(req.query.employeeId)
        : undefined
      if (Number.isInteger(employeeId)) {
        if (!(await canViewManagerDelegations(req.platformUser, employeeId))) {
          throw new HttpError(403, 'Insufficient access to view delegations')
        }
        res.json({
          delegations: await listManagerDelegations({ employeeId }),
        })
        return
      }
      const delegateEmployeeId = Number(req.platformUser.employeeId)
      if (!Number.isInteger(delegateEmployeeId)) {
        res.json({ delegations: [] })
        return
      }
      res.json({
        delegations: await listManagerDelegations({ delegateEmployeeId }),
      })
    }),
  )

  app.post(
    '/api/platform/manager-delegations',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      const delegation = await assignManagerDelegation(
        req.body ?? {},
        req.platformUser,
      )
      await publishWrite(req, ['delegations', 'activity'])
      res.status(201).json({ delegation })
    }),
  )

  app.post(
    '/api/platform/manager-delegations/:delegationId/revoke',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      const delegation = await revokeManagerDelegation(
        req.params.delegationId,
        req.platformUser,
      )
      await publishWrite(req, ['delegations', 'activity'])
      res.json({ delegation })
    }),
  )

  app.get(
    '/api/platform/employees',
    requirePlatformAuth,
    asyncHandler(async (_req, res) => {
      const employees = await listPlatformEmployees()
      res.json({ employees })
    }),
  )

  app.get(
    '/api/platform/employees/:employeeId',
    requirePlatformAuth,
    asyncHandler(async (req, res) => {
      const employeeId = Number(req.params.employeeId)
      if (!Number.isInteger(employeeId)) {
        throw new HttpError(400, 'Invalid employee id')
      }
      const profile = await getPlatformEmployeeProfile(employeeId)
      if (!profile) throw new HttpError(404, 'Employee not found')
      res.json(profile)
    }),
  )

  app.post(
    '/api/platform/employees',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      try {
        const employee = await upsertPlatformEmployee(req.body ?? {}, {
          actor: req.platformUser,
        })
        await publishWrite(req, ['employees', 'activity'], {
          employeeId: employee?.employeeId ?? employee?.id,
        })
        res.status(201).json({ employee })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.patch(
    '/api/platform/employees/:employeeId',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      const employeeId = Number(req.params.employeeId)
      if (!Number.isInteger(employeeId)) {
        throw new HttpError(400, 'Invalid employee id')
      }
      const existing = await getPlatformEmployee(employeeId)
      if (!existing) throw new HttpError(404, 'Employee not found')
      try {
        const employee = await upsertPlatformEmployee(req.body ?? {}, {
          replaceEmployeeId: employeeId,
          actor: req.platformUser,
        })
        await publishWrite(req, ['employees', 'activity'], { employeeId })
        res.json({ employee })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.get(
    '/api/platform/departments',
    requirePlatformAuth,
    asyncHandler(async (_req, res) => {
      const departments = await listPlatformDepartments()
      res.json({ departments })
    }),
  )

  app.post(
    '/api/platform/departments',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      try {
        const department = await createPlatformDepartment(
          req.body ?? {},
          req.platformUser,
        )
        await publishWrite(req, ['employees', 'activity'])
        res.status(201).json({ department })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.get(
    '/api/platform/teams',
    requirePlatformAuth,
    asyncHandler(async (req, res) => {
      const teams = await listPlatformTeams(req.query.departmentId)
      res.json({ teams })
    }),
  )

  app.get(
    '/api/platform/divisions',
    requirePlatformAuth,
    asyncHandler(async (_req, res) => {
      const divisions = await listPlatformDivisions()
      res.json({ divisions })
    }),
  )

  app.get(
    '/api/platform/activity',
    requirePlatformAuth,
    asyncHandler(async (req, res) => {
      const filters = {
        limit: req.query.limit,
        cursor: typeof req.query.cursor === 'string' ? req.query.cursor : undefined,
        eventKey:
          typeof req.query.eventKey === 'string' ? req.query.eventKey : undefined,
        entityType:
          typeof req.query.entityType === 'string'
            ? req.query.entityType
            : undefined,
        entityId:
          typeof req.query.entityId === 'string' ? req.query.entityId : undefined,
        actorEmployeeId:
          req.query.actorEmployeeId != null
            ? Number(req.query.actorEmployeeId)
            : undefined,
        subjectEmployeeId:
          req.query.subjectEmployeeId != null
            ? Number(req.query.subjectEmployeeId)
            : undefined,
        cycleId:
          typeof req.query.cycleId === 'string' ? req.query.cycleId : undefined,
        goalId:
          typeof req.query.goalId === 'string' ? req.query.goalId : undefined,
        from: typeof req.query.from === 'string' ? req.query.from : undefined,
        to: typeof req.query.to === 'string' ? req.query.to : undefined,
      }
      res.json(await listActivityEvents(req.platformUser, filters))
    }),
  )

  registerReviewCycleRoutes(app)
  registerReviewPacketRoutes(app)
  registerGoalRoutes(app)
  registerOkrRoutes(app)
}
