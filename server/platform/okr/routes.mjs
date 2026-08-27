import { asyncHandler, HttpError } from '../../errors.mjs'
import { requirePlatformAuth } from '../auth.mjs'
import { listVisibleGoalSubjectIds } from '../goals/policy.mjs'
import { getPlatformEmployee } from '../store.mjs'
import {
  fetchPerformanceEmployeeKrs,
  normalizeHrEmployeeId,
  okrApiConfigured,
} from './performanceClient.mjs'

async function assertCanReadEmployeeOkrs(user, subjectEmployeeId) {
  const visible = await listVisibleGoalSubjectIds(user)
  if (visible && !visible.includes(subjectEmployeeId)) {
    throw new HttpError(403, 'Insufficient goal access')
  }
}

export function registerOkrRoutes(app) {
  app.get(
    '/api/platform/okr/employee-krs',
    requirePlatformAuth,
    asyncHandler(async (req, res) => {
      if (!okrApiConfigured()) {
        throw new HttpError(503, 'OKR integration is not configured')
      }

      const employeeId = normalizeHrEmployeeId(req.query.employeeId)
      if (!employeeId) {
        throw new HttpError(400, 'employeeId is required')
      }

      await assertCanReadEmployeeOkrs(req.platformUser, employeeId)

      const quarter =
        typeof req.query.quarter === 'string' ? req.query.quarter : undefined

      try {
        res.json(
          await fetchPerformanceEmployeeKrs({
            employeeId,
            quarter,
          }),
        )
        return
      } catch (error) {
        if (!(error instanceof HttpError) || error.statusCode !== 404) {
          throw error
        }
      }

      const employee = await getPlatformEmployee(employeeId)
      if (!employee?.email.trim()) {
        throw new HttpError(404, 'Could not load OKRs')
      }

      res.json(
        await fetchPerformanceEmployeeKrs({
          email: employee.email,
          quarter,
        }),
      )
    }),
  )
}
