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
  updateReviewCycleCalibration,
  updateReviewCycleSettings,
  updateReviewCycleStages,
} from './store.mjs'

function toHttp(err) {
  if (err instanceof HttpError) return err
  const status = err?.statusCode
  if (typeof status === 'number' && status >= 400 && status < 600) {
    return new HttpError(status, err.message || 'Request failed')
  }
  return err
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
        const cycle = await createReviewCycle(
          {
            ...source,
            id: undefined,
            type: 'ad-hoc',
            periodKey: undefined,
            isTest: true,
            name: `${source.name} (Test)`,
            sourceCycleId: source.id,
          },
          req.platformUser,
        )
        res.status(201).json({ cycle })
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
        res.status(201).json({ cycles: imported })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )
}
