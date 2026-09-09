import { asyncHandler, HttpError } from '../../errors.mjs'
import { requirePlatformAuth, requirePlatformPermission } from '../auth.mjs'
import {
  calibrateReviewPacket,
  createReviewAppeal,
  getReviewPacket,
  listReviewPackets,
  markPacketViewed,
  releaseReviewPackets,
  resolveReviewAppeal,
  saveReviewDraft,
} from './store.mjs'
import { packetForViewer, packetsForViewer } from './visibility.mjs'
import { publishWrite } from '../realtime/fromRequest.mjs'
import { getReviewCycle } from '../reviewCycles/store.mjs'

function viewerEmployeeId(req) {
  return req.platformUser?.employeeId ?? null
}

function questionsForPacket(cycle, packet) {
  const group = (cycle?.groups ?? []).find((item) => item.id === packet.groupId)
  return (
    group?.settings?.reviewPolicy?.scorecard?.questions ??
    cycle?.settings?.reviewPolicy?.scorecard?.questions ??
    []
  )
}

async function visiblePacket(req, packet) {
  const cycle = await getReviewCycle(packet.cycleId)
  return packetForViewer(
    packet,
    viewerEmployeeId(req),
    questionsForPacket(cycle, packet),
  )
}

function toHttp(err) {
  if (err instanceof HttpError) return err
  const status = err?.statusCode
  if (typeof status === 'number' && status >= 400 && status < 600) {
    return new HttpError(status, err.message || 'Request failed')
  }
  return new HttpError(500, err instanceof Error ? err.message : 'Request failed')
}

export function registerReviewPacketRoutes(app) {
  app.get(
    '/api/platform/review-cycles/:cycleId/packets',
    requirePlatformAuth,
    asyncHandler(async (req, res) => {
      const cycle = await getReviewCycle(req.params.cycleId)
      res.json({
        packets: packetsForViewer(
          await listReviewPackets(req.params.cycleId),
          viewerEmployeeId(req),
          (packet) => questionsForPacket(cycle, packet),
        ),
      })
    }),
  )

  app.get(
    '/api/platform/review-cycles/:cycleId/packets/:employeeId',
    requirePlatformAuth,
    asyncHandler(async (req, res) => {
      const packet = await getReviewPacket(
        req.params.cycleId,
        Number(req.params.employeeId),
      )
      if (!packet) throw new HttpError(404, 'Review not found')
      if (
        req.platformUser?.employeeId &&
        Number(req.platformUser.employeeId) === packet.employeeId
      ) {
        await markPacketViewed(packet.id)
      }
      res.json({ packet: await visiblePacket(req, packet) })
    }),
  )

  app.patch(
    '/api/platform/review-packets/:packetId',
    requirePlatformAuth,
    asyncHandler(async (req, res) => {
      try {
        const packet = await saveReviewDraft(
          req.params.packetId,
          req.body ?? {},
          req.platformUser,
        )
        await publishWrite(req, ['packets', 'activity'], {
          cycleId: packet.cycleId,
          employeeId: packet.employeeId,
        })
        res.json({ packet: await visiblePacket(req, packet) })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.post(
    '/api/platform/review-packets/:packetId/calibrate',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      try {
        const packet = await calibrateReviewPacket(
          req.params.packetId,
          req.body ?? {},
          req.platformUser,
        )
        await publishWrite(req, ['packets', 'activity'], {
          cycleId: packet.cycleId,
          employeeId: packet.employeeId,
        })
        res.json({ packet: await visiblePacket(req, packet) })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.post(
    '/api/platform/review-cycles/:cycleId/groups/:groupId/release',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      try {
        const packets = await releaseReviewPackets(
          req.params.cycleId,
          req.params.groupId,
          req.body?.target === 'employees' ? 'employees' : 'managers',
          req.platformUser,
        )
        await publishWrite(req, ['packets', 'notifications', 'activity'], {
          cycleId: req.params.cycleId,
        })
        const cycle = await getReviewCycle(req.params.cycleId)
        res.json({
          packets: packetsForViewer(
            packets,
            viewerEmployeeId(req),
            (packet) => questionsForPacket(cycle, packet),
          ),
        })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.post(
    '/api/platform/review-packets/:packetId/appeals',
    requirePlatformAuth,
    asyncHandler(async (req, res) => {
      try {
        const packet = await createReviewAppeal(
          req.params.packetId,
          req.body?.body,
          req.platformUser,
        )
        await publishWrite(req, ['packets', 'notifications', 'activity'], {
          cycleId: packet.cycleId,
          employeeId: packet.employeeId,
        })
        res.json({ packet: await visiblePacket(req, packet) })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )

  app.post(
    '/api/platform/review-packets/:packetId/appeals/:appealId/resolve',
    requirePlatformAuth,
    requirePlatformPermission('platform.write_all'),
    asyncHandler(async (req, res) => {
      try {
        const packet = await resolveReviewAppeal(
          req.params.packetId,
          req.params.appealId,
          req.body ?? {},
          req.platformUser,
        )
        await publishWrite(req, ['packets', 'notifications', 'activity'], {
          cycleId: packet.cycleId,
          employeeId: packet.employeeId,
        })
        res.json({ packet: await visiblePacket(req, packet) })
      } catch (err) {
        throw toHttp(err)
      }
    }),
  )
}
