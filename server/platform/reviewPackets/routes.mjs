import { asyncHandler, HttpError } from '../../errors.mjs'
import { getPool } from '../../db.mjs'
import {
  permissionsForPlatformUser,
  requirePlatformAuth,
  requirePlatformPermission,
} from '../auth.mjs'
import {
  calibrateReviewPacket,
  createReviewAppeal,
  getReviewPacket,
  listReviewPacketSummaries,
  listReviewPackets,
  markPacketViewed,
  releaseReviewPackets,
  resolveReviewAppeal,
  saveReviewDraft,
} from './store.mjs'
import { listEmployeesManagedBy } from '../delegations.mjs'
import { packetForViewer, packetsForViewer } from './visibility.mjs'
import { publishWrite } from '../realtime/fromRequest.mjs'
import { getReviewCycle } from '../reviewCycles/store.mjs'
import { getScorecardForm } from '../reviewCycles/scorecardForms.mjs'

function viewerEmployeeId(req) {
  return req.platformUser?.employeeId ?? null
}

async function viewerReviewAccess(req) {
  const permissions = await permissionsForPlatformUser(req.platformUser ?? {})
  const list = Array.isArray(permissions) ? permissions : []
  const viewerId = viewerEmployeeId(req)
  const managedEmployeeIds = viewerId
    ? await listEmployeesManagedBy(viewerId)
    : []
  return {
    canViewAllReviews:
      list.includes('platform.read_all') || list.includes('platform.write_all'),
    managedEmployeeIds,
  }
}

/**
 * Questions for one packet without loading the cycle's full member roster.
 * Reads group + cycle settings only.
 */
async function questionsForPacketLite(packet) {
  const client = await getPool().connect()
  try {
    const { rows } = await client.query(
      `SELECT
         grp.scorecard_form_id AS group_form_id,
         grp.review_policy AS group_review_policy,
         cycle.review_policy AS cycle_review_policy
       FROM platform.review_cycles cycle
       LEFT JOIN platform.review_cycle_groups grp
         ON grp.id = $2
        AND grp.cycle_id = cycle.id
        AND grp.deleted_at IS NULL
       WHERE cycle.id = $1
       LIMIT 1`,
      [packet.cycleId, packet.groupId ?? null],
    )
    const row = rows[0]
    if (!row) return []
    const formId = row.group_form_id ?? null
    if (formId) {
      const form = await getScorecardForm(formId)
      if (form?.policy?.scorecard?.questions) {
        return form.policy.scorecard.questions
      }
    }
    const groupPolicy =
      typeof row.group_review_policy === 'string'
        ? JSON.parse(row.group_review_policy)
        : row.group_review_policy
    const cyclePolicy =
      typeof row.cycle_review_policy === 'string'
        ? JSON.parse(row.cycle_review_policy)
        : row.cycle_review_policy
    return (
      groupPolicy?.scorecard?.questions ??
      cyclePolicy?.scorecard?.questions ??
      []
    )
  } finally {
    client.release()
  }
}

async function questionsByPacketId(cycle, packets) {
  const formCache = new Map()
  const entries = await Promise.all(
    packets.map(async (packet) => {
      const group = (cycle?.groups ?? []).find(
        (item) => item.id === packet.groupId,
      )
      const formId = group?.settings?.scorecardFormId
      if (formId) {
        if (!formCache.has(formId)) {
          formCache.set(formId, getScorecardForm(formId))
        }
        const form = await formCache.get(formId)
        if (form?.policy?.scorecard?.questions) {
          return [packet.id, form.policy.scorecard.questions]
        }
      }
      return [
        packet.id,
        group?.settings?.reviewPolicy?.scorecard?.questions ??
          cycle?.settings?.reviewPolicy?.scorecard?.questions ??
          [],
      ]
    }),
  )
  return new Map(entries)
}

async function visiblePacket(req, packet) {
  const [questions, access] = await Promise.all([
    questionsForPacketLite(packet),
    viewerReviewAccess(req),
  ])
  return packetForViewer(
    packet,
    viewerEmployeeId(req),
    questions,
    access,
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
      const summary =
        req.query.summary === '1' ||
        req.query.summary === 'true' ||
        req.query.fields === 'summary'
      const packets = summary
        ? await listReviewPacketSummaries(req.params.cycleId)
        : await listReviewPackets(req.params.cycleId)
      const access = await viewerReviewAccess(req)
      // Summaries have no answers — question visibility is unused and was
      // fetching scorecard forms for every packet on the cold path.
      if (summary) {
        res.json({
          packets: packetsForViewer(
            packets,
            viewerEmployeeId(req),
            () => [],
            access,
          ),
        })
        return
      }
      const cycle = await getReviewCycle(req.params.cycleId)
      const questions = await questionsByPacketId(cycle, packets)
      res.json({
        packets: packetsForViewer(
          packets,
          viewerEmployeeId(req),
          (packet) => questions.get(packet.id) ?? [],
          access,
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
    asyncHandler(async (req, res) => {
      try {
        const packet = await calibrateReviewPacket(
          req.params.packetId,
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
        const questions = await questionsByPacketId(cycle, packets)
        const access = await viewerReviewAccess(req)
        res.json({
          packets: packetsForViewer(
            packets,
            viewerEmployeeId(req),
            (packet) => questions.get(packet.id) ?? [],
            access,
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
