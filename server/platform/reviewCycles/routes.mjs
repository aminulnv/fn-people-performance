import { asyncHandler, HttpError } from '../../errors.mjs'
import {
  requirePlatformAuth,
  requirePlatformPermission,
} from '../auth.mjs'
import {
  createReviewCycle,
  deleteReviewCycle,
  getReviewCycle,
  importReviewCycles,
  listReviewCycles,
  updateReviewCycle,
  updateReviewCycleCalibration,
  updateReviewCycleSettings,
  updateReviewCycleStages,
} from './store.mjs'
import {
  copyCycleGroups,
  createCycleGroup,
  deleteCycleGroup,
  updateCycleGroup,
} from './groups.mjs'
import {
  createScorecardForm,
  deleteScorecardForm,
  getScorecardForm,
  listScorecardForms,
  updateScorecardForm,
} from './scorecardForms.mjs'
import { publishWrite } from '../realtime/fromRequest.mjs'
import {
  confirmCalibrationClean,
  getCalibrationSitting,
  lockCalibrationSession,
  saveCalibrationSittingEmployee,
} from '../calibrationSession.mjs'
import {
  listCalibratorAssignments,
  setDepartmentCalibrators,
  setPersonCalibrators,
  setTeamCalibrators,
} from '../calibrationGovernance.mjs'

function toHttp(err) {
  if (err instanceof HttpError) return err
  const status = err?.statusCode
  if (typeof status === 'number' && status >= 400 && status < 600) {
    return new HttpError(status, err.message || 'Request failed')
  }
  if (err instanceof Error) {
    return new HttpError(500, err.message || 'An unexpected error occurred')
  }
  return new HttpError(500, 'An unexpected error occurred')
}

export function registerReviewCycleRoutes(app) {
  app.get(
    '/api/platform/review-cycles',
    requirePlatformAuth,
    asyncHandler(async (_req, res) => {
      res.json({ cycles: await listReviewCycles() })
    }),
  )

  app.get(
    '/api/platform/review-cycles/:cycleId',
    requirePlatformAuth,
    asyncHandler(async (req, res) => {
      const cycle = await getReviewCycle(req.params.cycleId)
      if (!cycle) throw new HttpError(404, 'Cycle not found')
      res.json({ cycle })
    }),
  )

  app.post(
    '/api/platform/review-cycles',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      try {
        const cycle = await createReviewCycle(req.body ?? {}, req.platformUser)
        await publishWrite(req, ['reviews', 'activity'], { cycleId: cycle?.id })
        res.status(201).json({ cycle })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.post(
    '/api/platform/review-cycles/:cycleId/test-copies',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      try {
        const source = await getReviewCycle(req.params.cycleId)
        if (!source) throw new HttpError(404, 'Cycle not found')
        const created = await createReviewCycle(
          {
            ...source,
            id: undefined,
            type: 'custom',
            periodKey: undefined,
            isTest: true,
            name: `${source.name} (Test)`,
            sourceCycleId: source.id,
          },
          req.platformUser,
        )
        if ((source.groups ?? []).length > 0) {
          await copyCycleGroups(source.id, created.id, req.platformUser)
        }
        const cycle = (await getReviewCycle(created.id)) ?? created
        await publishWrite(req, ['reviews', 'activity'], { cycleId: cycle.id })
        res.status(201).json({ cycle })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.patch(
    '/api/platform/review-cycles/:cycleId',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      try {
        const cycle = await updateReviewCycle(
          req.params.cycleId,
          req.body ?? {},
          req.platformUser,
        )
        await publishWrite(req, ['reviews', 'activity'], {
          cycleId: req.params.cycleId,
        })
        res.json({ cycle })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.patch(
    '/api/platform/review-cycles/:cycleId/settings',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      try {
        const cycle = await updateReviewCycleSettings(
          req.params.cycleId,
          req.body ?? {},
          req.platformUser,
        )
        await publishWrite(req, ['reviews', 'goals', 'activity'], {
          cycleId: req.params.cycleId,
        })
        res.json({ cycle })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.patch(
    '/api/platform/review-cycles/:cycleId/stages',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      try {
        const cycle = await updateReviewCycleStages(
          req.params.cycleId,
          req.body ?? {},
          req.platformUser,
        )
        await publishWrite(req, ['reviews', 'packets', 'activity'], {
          cycleId: req.params.cycleId,
        })
        res.json({ cycle })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.patch(
    '/api/platform/review-cycles/:cycleId/calibration',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      try {
        const cycle = await updateReviewCycleCalibration(
          req.params.cycleId,
          req.body ?? {},
          req.platformUser,
        )
        await publishWrite(req, ['reviews', 'packets', 'activity'], {
          cycleId: req.params.cycleId,
        })
        res.json({ cycle })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.delete(
    '/api/platform/review-cycles/:cycleId',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      try {
        const expectedVersion =
          req.body?.expectedVersion ??
          (req.query.expectedVersion != null
            ? Number(req.query.expectedVersion)
            : undefined)
        await deleteReviewCycle(
          req.params.cycleId,
          req.platformUser,
          expectedVersion,
        )
        await publishWrite(req, ['reviews', 'goals', 'packets', 'activity'], {
          cycleId: req.params.cycleId,
        })
        res.json({ ok: true })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.post(
    '/api/platform/review-cycles/:cycleId/groups',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      try {
        const group = await createCycleGroup(
          req.params.cycleId,
          req.body ?? {},
          req.platformUser,
        )
        await publishWrite(req, ['reviews', 'activity'], {
          cycleId: req.params.cycleId,
        })
        res.status(201).json({ group })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.patch(
    '/api/platform/review-cycles/:cycleId/groups/:groupId',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      try {
        const group = await updateCycleGroup(
          req.params.cycleId,
          req.params.groupId,
          req.body ?? {},
          req.platformUser,
        )
        await publishWrite(req, ['reviews', 'activity'], {
          cycleId: req.params.cycleId,
        })
        res.json({ group })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.delete(
    '/api/platform/review-cycles/:cycleId/groups/:groupId',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      try {
        await deleteCycleGroup(
          req.params.cycleId,
          req.params.groupId,
          req.platformUser,
        )
        await publishWrite(req, ['reviews', 'activity'], {
          cycleId: req.params.cycleId,
        })
        res.json({ ok: true })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.post(
    '/api/platform/review-cycle-imports',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      try {
        const cycles = Array.isArray(req.body?.cycles) ? req.body.cycles : []
        const fingerprint = String(req.body?.fingerprint ?? '')
        const imported = await importReviewCycles(
          cycles,
          req.platformUser,
          fingerprint,
        )
        await publishWrite(req, ['reviews', 'activity'])
        res.status(201).json({ cycles: imported })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.get(
    '/api/platform/scorecard-forms',
    requirePlatformAuth,
    asyncHandler(async (_req, res) => {
      res.json({ forms: await listScorecardForms() })
    }),
  )

  app.get(
    '/api/platform/scorecard-forms/:formId',
    requirePlatformAuth,
    asyncHandler(async (req, res) => {
      const form = await getScorecardForm(req.params.formId)
      if (!form) throw new HttpError(404, 'Scorecard form not found')
      res.json({ form })
    }),
  )

  app.post(
    '/api/platform/scorecard-forms',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      try {
        const form = await createScorecardForm(req.body ?? {}, req.platformUser)
        await publishWrite(req, ['reviews', 'activity'], { formId: form.id })
        res.status(201).json({ form })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.patch(
    '/api/platform/scorecard-forms/:formId',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      try {
        const form = await updateScorecardForm(
          req.params.formId,
          req.body ?? {},
          req.platformUser,
        )
        await publishWrite(req, ['reviews', 'activity'], { formId: form.id })
        res.json({ form })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.delete(
    '/api/platform/scorecard-forms/:formId',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      try {
        await deleteScorecardForm(req.params.formId, req.platformUser)
        await publishWrite(req, ['reviews', 'activity'], {
          formId: req.params.formId,
        })
        res.json({ ok: true })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.get(
    '/api/platform/review-cycles/:cycleId/calibration-sitting',
    requirePlatformAuth,
    asyncHandler(async (req, res) => {
      const cycle = await getReviewCycle(req.params.cycleId)
      if (!cycle) throw new HttpError(404, 'Review cycle not found')
      res.json(await getCalibrationSitting(req.params.cycleId))
    }),
  )

  app.patch(
    '/api/platform/review-cycles/:cycleId/calibration-sitting/employees/:employeeId',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      const cycle = await getReviewCycle(req.params.cycleId)
      if (!cycle) throw new HttpError(404, 'Review cycle not found')
      const employeeId = Number(req.params.employeeId)
      if (!Number.isInteger(employeeId) || employeeId <= 0) {
        throw new HttpError(400, 'Invalid employee id')
      }
      try {
        const sitting = await saveCalibrationSittingEmployee(
          req.params.cycleId,
          employeeId,
          req.body ?? {},
          req.platformUser?.employeeId ?? null,
        )
        await publishWrite(req, ['reviews'], { cycleId: req.params.cycleId })
        res.json(sitting)
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.post(
    '/api/platform/review-cycles/:cycleId/calibration-sitting/confirm-clean',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      const cycle = await getReviewCycle(req.params.cycleId)
      if (!cycle) throw new HttpError(404, 'Review cycle not found')
      try {
        const sitting = await confirmCalibrationClean(
          req.params.cycleId,
          req.platformUser?.employeeId ?? null,
        )
        await publishWrite(req, ['reviews'], { cycleId: req.params.cycleId })
        res.json(sitting)
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.post(
    '/api/platform/review-cycles/:cycleId/calibration-sitting/lock',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      const cycle = await getReviewCycle(req.params.cycleId)
      if (!cycle) throw new HttpError(404, 'Review cycle not found')
      try {
        const sitting = await lockCalibrationSession(
          req.params.cycleId,
          req.platformUser?.employeeId ?? null,
        )
        await publishWrite(req, ['reviews'], { cycleId: req.params.cycleId })
        res.json(sitting)
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.get(
    '/api/platform/department-calibrators',
    requirePlatformAuth,
    asyncHandler(async (_req, res) => {
      res.json(await listCalibratorAssignments())
    }),
  )

  app.put(
    '/api/platform/departments/:departmentId/calibrators',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      const departmentId = Number(req.params.departmentId)
      if (!Number.isInteger(departmentId) || departmentId <= 0) {
        throw new HttpError(400, 'Invalid department id')
      }
      const employeeIds = Array.isArray(req.body?.employeeIds)
        ? req.body.employeeIds
        : []
      try {
        const department = await setDepartmentCalibrators(
          departmentId,
          employeeIds,
        )
        res.json({ department })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.put(
    '/api/platform/teams/:teamId/calibrators',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      const teamId = Number(req.params.teamId)
      if (!Number.isInteger(teamId) || teamId <= 0) {
        throw new HttpError(400, 'Invalid team id')
      }
      const employeeIds = Array.isArray(req.body?.employeeIds)
        ? req.body.employeeIds
        : []
      try {
        const team = await setTeamCalibrators(teamId, employeeIds)
        res.json({ team })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.put(
    '/api/platform/employees/:employeeId/calibrators',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      const employeeId = Number(req.params.employeeId)
      if (!Number.isInteger(employeeId) || employeeId <= 0) {
        throw new HttpError(400, 'Invalid employee id')
      }
      const employeeIds = Array.isArray(req.body?.employeeIds)
        ? req.body.employeeIds
        : []
      try {
        const person = await setPersonCalibrators(employeeId, employeeIds)
        res.json({ person })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )
}
