import crypto from 'node:crypto'
import { getPool } from '../../db.mjs'
import { HttpError } from '../../errors.mjs'
import { getReviewCycle } from '../reviewCycles/store.mjs'

function iso(value) {
  if (!value) return undefined
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function mapPacket(row, extras = {}) {
  return {
    id: row.id,
    cycleId: row.cycle_id,
    groupId: row.group_id,
    employeeId: Number(row.employee_id),
    managerEmployeeId: row.manager_employee_id
      ? Number(row.manager_employee_id)
      : null,
    status: row.status,
    selfOverallGrade: row.self_overall_grade,
    managerOverallGrade: row.manager_overall_grade,
    calibratedOverallGrade: row.calibrated_overall_grade,
    publishedOverallGrade: row.published_overall_grade,
    managerOverrideReason: row.manager_override_reason ?? '',
    goalsComponent: row.goals_component,
    answers: extras.answers ?? [],
    pillarScores: extras.pillarScores ?? [],
    calibrationEvents: extras.calibrationEvents ?? [],
    appeals: extras.appeals ?? [],
    firstViewedAt: iso(row.first_viewed_at),
    releasedToManagerAt: iso(row.released_to_manager_at),
    releasedToEmployeeAt: iso(row.released_to_employee_at),
    version: Number(row.version),
    updatedAt: iso(row.updated_at),
  }
}

async function loadChildren(client, packetIds) {
  if (packetIds.length === 0) {
    return {
      answers: new Map(),
      pillarScores: new Map(),
      calibrationEvents: new Map(),
      appeals: new Map(),
    }
  }
  const { rows: answerRows } = await client.query(
    `SELECT * FROM platform.review_answers
     WHERE packet_id = ANY($1::text[])`,
    [packetIds],
  )
  const { rows: pillarRows } = await client.query(
    `SELECT * FROM platform.review_pillar_scores
     WHERE packet_id = ANY($1::text[])`,
    [packetIds],
  )
  const { rows: eventRows } = await client.query(
    `SELECT event.*, employee.name AS full_name
     FROM platform.review_calibration_events event
     LEFT JOIN platform.employees employee
       ON employee.employee_id = event.actor_employee_id`
     WHERE event.packet_id = ANY($1::text[])
     ORDER BY event.created_at`,
    [packetIds],
  )
  const { rows: appealRows } = await client.query(
    `SELECT * FROM platform.review_appeals
     WHERE packet_id = ANY($1::text[])
     ORDER BY created_at`,
    [packetIds],
  )

  const answers = new Map()
  for (const row of answerRows) {
    const list = answers.get(row.packet_id) ?? []
    list.push({
      questionId: row.question_id,
      actorRole: row.actor_role,
      body: row.body,
    })
    answers.set(row.packet_id, list)
  }
  const pillarScores = new Map()
  for (const row of pillarRows) {
    const list = pillarScores.get(row.packet_id) ?? []
    list.push({
      pillarId: row.pillar_id,
      actorRole: row.actor_role,
      grade: row.grade,
      comment: row.comment ?? '',
    })
    pillarScores.set(row.packet_id, list)
  }
  const calibrationEvents = new Map()
  for (const row of eventRows) {
    const list = calibrationEvents.get(row.packet_id) ?? []
    list.push({
      id: row.id,
      stageId: row.stage_id,
      fromGrade: row.from_grade,
      toGrade: row.to_grade,
      reason: row.reason,
      actorEmployeeId: row.actor_employee_id,
      actorName: row.full_name ?? '',
      createdAt: iso(row.created_at),
    })
    calibrationEvents.set(row.packet_id, list)
  }
  const appeals = new Map()
  for (const row of appealRows) {
    const list = appeals.get(row.packet_id) ?? []
    list.push({
      id: row.id,
      body: row.body,
      status: row.status,
      createdAt: iso(row.created_at),
      createdByEmployeeId: row.created_by_employee_id,
    })
    appeals.set(row.packet_id, list)
  }
  return { answers, pillarScores, calibrationEvents, appeals }
}

function withChildren(row, children) {
  return mapPacket(row, {
    answers: children.answers.get(row.id) ?? [],
    pillarScores: children.pillarScores.get(row.id) ?? [],
    calibrationEvents: children.calibrationEvents.get(row.id) ?? [],
    appeals: children.appeals.get(row.id) ?? [],
  })
}

async function ensurePacketsForCycle(client, cycle) {
  const groups = cycle.groups ?? []
  for (const group of groups) {
    for (const employeeId of group.memberIds) {
      await client.query(
        `INSERT INTO platform.review_packets (
           id, cycle_id, group_id, employee_id, status
         ) VALUES ($1,$2,$3,$4,'not_started')
         ON CONFLICT (cycle_id, employee_id) DO UPDATE
         SET group_id = EXCLUDED.group_id`,
        [`pkt-${cycle.id}-${employeeId}`, cycle.id, group.id, employeeId],
      )
    }
  }
}

export async function listReviewPackets(cycleId) {
  const cycle = await getReviewCycle(cycleId)
  if (!cycle) throw new HttpError(404, 'Cycle not found')
  const client = await getPool().connect()
  try {
    await ensurePacketsForCycle(client, cycle)
    const { rows } = await client.query(
      `SELECT * FROM platform.review_packets
       WHERE cycle_id = $1
       ORDER BY employee_id`,
      [cycleId],
    )
    const children = await loadChildren(client, rows.map((row) => row.id))
    return rows.map((row) => withChildren(row, children))
  } finally {
    client.release()
  }
}

export async function getReviewPacket(cycleId, employeeId) {
  const packets = await listReviewPackets(cycleId)
  return packets.find((packet) => packet.employeeId === Number(employeeId)) ?? null
}

async function getPacketRow(client, packetId, { forUpdate = false } = {}) {
  const { rows } = await client.query(
    `SELECT * FROM platform.review_packets
     WHERE id = $1
     ${forUpdate ? 'FOR UPDATE' : ''}`,
    [packetId],
  )
  return rows[0] ?? null
}

export async function saveReviewDraft(packetId, input, platformUser) {
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const row = await getPacketRow(client, packetId, { forUpdate: true })
    if (!row) throw new HttpError(404, 'Review not found')
    const actorRole = input.actorRole === 'manager' ? 'manager' : 'self'
    if (
      actorRole === 'self' &&
      platformUser?.employeeId &&
      Number(platformUser.employeeId) !== Number(row.employee_id)
    ) {
      throw new HttpError(403, 'You can only write your own self-review.')
    }
    if (
      actorRole === 'manager' &&
      platformUser?.employeeId &&
      Number(platformUser.employeeId) === Number(row.employee_id)
    ) {
      throw new HttpError(403, 'You cannot rate your own packet as a manager.')
    }

    if (Array.isArray(input.answers)) {
      for (const answer of input.answers) {
        await client.query(
          `INSERT INTO platform.review_answers (packet_id, actor_role, question_id, body)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (packet_id, actor_role, question_id)
           DO UPDATE SET body = EXCLUDED.body, updated_at = now()`,
          [packetId, actorRole, answer.questionId, String(answer.body ?? '')],
        )
      }
    }
    if (Array.isArray(input.pillarScores)) {
      for (const score of input.pillarScores) {
        await client.query(
          `INSERT INTO platform.review_pillar_scores (
             packet_id, actor_role, pillar_id, grade, comment
           ) VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (packet_id, actor_role, pillar_id)
           DO UPDATE SET grade = EXCLUDED.grade, comment = EXCLUDED.comment, updated_at = now()`,
          [
            packetId,
            actorRole,
            score.pillarId,
            score.grade ?? null,
            String(score.comment ?? ''),
          ],
        )
      }
    }

    const nextStatus =
      input.submit === true
        ? actorRole === 'self'
          ? 'self_submitted'
          : 'manager_submitted'
        : actorRole === 'self'
          ? 'self_in_progress'
          : 'manager_in_progress'

    const { rows } = await client.query(
      `UPDATE platform.review_packets
       SET status = $2,
           self_overall_grade = CASE WHEN $3::text IS NOT NULL AND $6 = 'self' THEN $3 ELSE self_overall_grade END,
           manager_overall_grade = CASE WHEN $3::text IS NOT NULL AND $6 = 'manager' THEN $3 ELSE manager_overall_grade END,
           manager_override_reason = CASE WHEN $6 = 'manager' THEN COALESCE($4, manager_override_reason) ELSE manager_override_reason END,
           manager_employee_id = CASE WHEN $6 = 'manager' THEN COALESCE($5, manager_employee_id) ELSE manager_employee_id END,
           goals_component = COALESCE($7::jsonb, goals_component),
           version = version + 1,
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [
        packetId,
        nextStatus,
        input.overallGrade ?? null,
        input.overrideReason ?? null,
        platformUser?.employeeId ?? null,
        actorRole,
        input.goalsComponent ? JSON.stringify(input.goalsComponent) : null,
      ],
    )
    await client.query('COMMIT')
    const children = await loadChildren(client, [packetId])
    return withChildren(rows[0], children)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function calibrateReviewPacket(packetId, input, platformUser) {
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const row = await getPacketRow(client, packetId, { forUpdate: true })
    if (!row) throw new HttpError(404, 'Review not found')
    if (platformUser?.employeeId && Number(platformUser.employeeId) === Number(row.employee_id)) {
      throw new HttpError(403, 'You cannot calibrate your own packet.')
    }
    if (!input.toGrade || !String(input.reason ?? '').trim()) {
      throw new HttpError(400, 'A new grade and a written reason are required.')
    }
    await client.query(
      `INSERT INTO platform.review_calibration_events (
         id, packet_id, stage_id, from_grade, to_grade, reason, actor_employee_id
       ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        `cal-${crypto.randomUUID()}`,
        packetId,
        input.stageId ?? 'calibration_hod_hrbp',
        row.calibrated_overall_grade ?? row.manager_overall_grade,
        input.toGrade,
        String(input.reason).trim(),
        platformUser?.employeeId ?? null,
      ],
    )
    const { rows } = await client.query(
      `UPDATE platform.review_packets
       SET calibrated_overall_grade = $2,
           status = 'in_calibration',
           version = version + 1,
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [packetId, input.toGrade],
    )
    await client.query('COMMIT')
    const children = await loadChildren(client, [packetId])
    return withChildren(rows[0], children)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function releaseReviewPackets(cycleId, target, platformUser) {
  const toManagers = target === 'managers'
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `UPDATE platform.review_packets
       SET published_overall_grade = COALESCE(calibrated_overall_grade, manager_overall_grade),
           status = $2,
           released_to_manager_at = CASE WHEN $3 THEN now() ELSE released_to_manager_at END,
           released_to_employee_at = CASE WHEN $3 THEN released_to_employee_at ELSE now() END,
           version = version + 1,
           updated_at = now()
       WHERE cycle_id = $1
         AND manager_overall_grade IS NOT NULL`,
      [
        cycleId,
        toManagers ? 'released_to_managers' : 'released_to_employees',
        toManagers,
      ],
    )
    await client.query('COMMIT')
    return listReviewPackets(cycleId)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function markPacketViewed(packetId) {
  const client = await getPool().connect()
  try {
    await client.query(
      `UPDATE platform.review_packets
       SET first_viewed_at = COALESCE(first_viewed_at, now())
       WHERE id = $1`,
      [packetId],
    )
  } finally {
    client.release()
  }
}

export async function createReviewAppeal(packetId, body, platformUser) {
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const row = await getPacketRow(client, packetId, { forUpdate: true })
    if (!row) throw new HttpError(404, 'Review not found')
    if (row.status !== 'released_to_employees') {
      throw new HttpError(400, 'Appeals open after the grade is released to the employee.')
    }
    await client.query(
      `INSERT INTO platform.review_appeals (
         id, packet_id, body, status, created_by_employee_id
       ) VALUES ($1,$2,$3,'open',$4)`,
      [
        `apl-${crypto.randomUUID()}`,
        packetId,
        String(body ?? '').trim(),
        platformUser?.employeeId ?? null,
      ],
    )
    await client.query(
      `UPDATE platform.review_packets
       SET status = 'appealed', version = version + 1, updated_at = now()
       WHERE id = $1`,
      [packetId],
    )
    await client.query('COMMIT')
    const children = await loadChildren(client, [packetId])
    const latest = await getPacketRow(client, packetId)
    return withChildren(latest, children)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
