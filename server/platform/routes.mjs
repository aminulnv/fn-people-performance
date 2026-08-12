/**
 * /api/platform/* — People Performance on shared RDS.
 * Auth is platform-only (pd_platform_sid) — not dashboard Google / pd.sid.
 */
import { asyncHandler, HttpError } from '../errors.mjs'
import {
  registerPlatformAuthRoutes,
  requirePlatformAuth,
} from './auth.mjs'
import {
  createPlatformDepartment,
  getPlatformEmployee,
  listPlatformDepartments,
  listPlatformDivisions,
  listPlatformEmployees,
  listPlatformTeams,
  upsertPlatformEmployee,
} from './store.mjs'

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
      const employee = await getPlatformEmployee(employeeId)
      if (!employee) throw new HttpError(404, 'Employee not found')
      res.json({ employee })
    }),
  )

  app.post(
    '/api/platform/employees',
    requirePlatformAuth,
    asyncHandler(async (req, res) => {
      try {
        const employee = await upsertPlatformEmployee(req.body ?? {})
        res.status(201).json({ employee })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.patch(
    '/api/platform/employees/:employeeId',
    requirePlatformAuth,
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
        })
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
    asyncHandler(async (req, res) => {
      try {
        const department = await createPlatformDepartment(req.body ?? {})
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
}
