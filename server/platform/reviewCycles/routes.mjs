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
import { publishWrite } from '../realtime/fromRequest.mjs'

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
}
