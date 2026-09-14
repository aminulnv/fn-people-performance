/**
 * Shared scorecard form templates (live-linked from cycle groups).
 */

import crypto from 'node:crypto'
import { getPool } from '../../db.mjs'
import { HttpError } from '../../errors.mjs'
import { appendActivityEvent } from '../activity.mjs'
import { defaultReviewPolicy, normalizeReviewPolicy } from './reviewConfig.mjs'

function isoTimestamp(value) {
  if (!value) return undefined
  if (value instanceof Date) return value.toISOString()
  return new Date(value).toISOString()
}

function actorFromUser(platformUser) {
  return {
    actorEmployeeId: platformUser?.employeeId ?? null,
    actorEmail: platformUser?.email ?? '',
    actorName: platformUser?.name ?? '',
  }
}

export function mapScorecardForm(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    policy: normalizeReviewPolicy(row.policy, 'custom'),
    createdAt: isoTimestamp(row.created_at),
    updatedAt: isoTimestamp(row.updated_at),
    version: Number(row.version),
  }
}

/** Built-in Q1–Q4 + Annual (+ blank) forms. Inserted when missing. */
export function builtInScorecardForms() {
  return [
    {
      id: 'form-q1-checkin',
      name: 'Q1 check-in',
      description:
        'Q1 Goals grade only. Locked grade later feeds the Annual Goals rollup.',
      purpose: 'quarterly_checkin',
      periodKey: 'q1-2026',
    },
    {
      id: 'form-q2-checkin',
      name: 'Q2 check-in',
      description:
        'Q2 Goals grade only. Locked grade later feeds the Annual Goals rollup.',
      purpose: 'quarterly_checkin',
      periodKey: 'q2-2026',
    },
    {
      id: 'form-q3-checkin',
      name: 'Q3 check-in',
      description:
        'Q3 Goals grade only. Locked grade later feeds the Annual Goals rollup.',
      purpose: 'quarterly_checkin',
      periodKey: 'q3-2026',
    },
    {
      id: 'form-q4-progress',
      name: 'Q4 progress',
      description:
        'Goals progress only — no quarter grade. Manager sets the Q4 grade in Annual.',
      purpose: 'quarterly_checkin',
      periodKey: 'q4-2026',
    },
    {
      id: 'form-annual-appraisal',
      name: 'Annual appraisal',
      description:
        'Goals (from Q1–Q4) 50% + Skills 25% + Values 25%, with year-end questions and overall grading.',
      purpose: 'annual_appraisal',
      periodKey: 'annual-2026',
    },
    {
      id: 'form-blank',
      name: 'Blank form',
      description: 'Empty canvas to build from scratch.',
      purpose: 'custom',
      periodKey: undefined,
    },
  ]
}

export async function ensureDefaultScorecardForms() {
  const seeds = builtInScorecardForms()
  const ids = seeds.map((item) => item.id)
  const { rows: existing } = await getPool().query(
    `SELECT id FROM platform.scorecard_forms
     WHERE id = ANY($1::text[]) AND deleted_at IS NULL`,
    [ids],
  )
  const have = new Set(existing.map((row) => row.id))
  const missing = seeds.filter((item) => !have.has(item.id))
  if (missing.length === 0) return

  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    for (const item of missing) {
      const policy = defaultReviewPolicy(item.purpose, item.periodKey)
      await client.query(
        `INSERT INTO platform.scorecard_forms (
           id, name, description, policy
         ) VALUES ($1, $2, $3, $4::jsonb)
         ON CONFLICT (id) DO NOTHING`,
        [item.id, item.name, item.description, JSON.stringify(policy)],
      )
    }
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function listScorecardForms() {
  try {
    await ensureDefaultScorecardForms()
  } catch {
    /* table may be missing until migrations run; still try the select */
  }
  const { rows } = await getPool().query(
    `SELECT *
     FROM platform.scorecard_forms
     WHERE deleted_at IS NULL
     ORDER BY lower(name), created_at`,
  )
  return rows.map(mapScorecardForm)
}

export async function getScorecardForm(formId) {
  const { rows } = await getPool().query(
    `SELECT *
     FROM platform.scorecard_forms
     WHERE id = $1 AND deleted_at IS NULL`,
    [formId],
  )
  return rows[0] ? mapScorecardForm(rows[0]) : null
}

export async function countFormUsage(formId) {
  const { rows } = await getPool().query(
    `SELECT count(*)::int AS count
     FROM platform.review_cycle_groups
     WHERE scorecard_form_id = $1 AND deleted_at IS NULL`,
    [formId],
  )
  return Number(rows[0]?.count ?? 0)
}

export async function createScorecardForm(input, platformUser) {
  const name = String(input.name ?? '').trim()
  if (!name) throw new HttpError(400, 'Form name is required.')
  const actor = actorFromUser(platformUser)
  const id = input.id || `form-${crypto.randomUUID()}`
  const policy = normalizeReviewPolicy(input.policy, 'custom')
  const description =
    input.description == null || String(input.description).trim() === ''
      ? null
      : String(input.description).trim()

  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `INSERT INTO platform.scorecard_forms (
         id, name, description, policy,
         created_by_employee_id, updated_by_employee_id
       ) VALUES ($1, $2, $3, $4::jsonb, $5, $5)
       RETURNING *`,
      [id, name, description, JSON.stringify(policy), actor.actorEmployeeId],
    )
    const form = mapScorecardForm(rows[0])
    await appendActivityEvent(client, {
      eventKey: 'scorecard_form.created',
      entityType: 'scorecard_form',
      entityId: form.id,
      ...actor,
      summary: `Created scorecard form ${form.name}`,
      metadata: { formId: form.id },
      source: 'api',
    })
    await client.query('COMMIT')
    return form
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function updateScorecardForm(formId, patch, platformUser) {
  const actor = actorFromUser(platformUser)
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const { rows: existingRows } = await client.query(
      `SELECT * FROM platform.scorecard_forms
       WHERE id = $1 AND deleted_at IS NULL
       FOR UPDATE`,
      [formId],
    )
    const before = existingRows[0]
    if (!before) throw new HttpError(404, 'Scorecard form not found.')
    if (
      patch.expectedVersion != null &&
      Number(before.version) !== Number(patch.expectedVersion)
    ) {
      throw new HttpError(
        409,
        'Form was updated by someone else. Reload and try again.',
      )
    }

    const nextName =
      patch.name != null ? String(patch.name).trim() : before.name
    if (!nextName) throw new HttpError(400, 'Form name is required.')
    const nextDescription =
      patch.description === undefined
        ? before.description
        : patch.description == null || String(patch.description).trim() === ''
          ? null
          : String(patch.description).trim()
    const beforePolicy = normalizeReviewPolicy(before.policy, 'custom')
    const nextPolicy =
      patch.policy !== undefined
        ? normalizeReviewPolicy(patch.policy, 'custom')
        : beforePolicy

    if (patch.policy !== undefined) {
      const usage = await countFormUsage(formId)
      if (
        usage > 0 &&
        JSON.stringify(beforePolicy) !== JSON.stringify(nextPolicy)
      ) {
        throw new HttpError(
          409,
          'This form is allocated to cycle groups. Duplicate it to edit the scorecard — changing it in place would also change every past quarter that uses it.',
        )
      }
    }

    const { rows } = await client.query(
      `UPDATE platform.scorecard_forms
       SET name = $2,
           description = $3,
           policy = $4::jsonb,
           version = version + 1,
           updated_by_employee_id = $5,
           updated_at = now()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [
        formId,
        nextName,
        nextDescription,
        JSON.stringify(nextPolicy),
        actor.actorEmployeeId,
      ],
    )
    const form = mapScorecardForm(rows[0])
    await appendActivityEvent(client, {
      eventKey: 'scorecard_form.updated',
      entityType: 'scorecard_form',
      entityId: form.id,
      ...actor,
      summary: `Updated scorecard form ${form.name}`,
      metadata: { formId: form.id },
      source: 'api',
    })
    await client.query('COMMIT')
    return form
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function deleteScorecardForm(formId, platformUser) {
  const usage = await countFormUsage(formId)
  if (usage > 0) {
    throw new HttpError(
      409,
      `This form is allocated to ${usage} cycle group${usage === 1 ? '' : 's'}. Reassign those groups first.`,
    )
  }
  const actor = actorFromUser(platformUser)
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `UPDATE platform.scorecard_forms
       SET deleted_at = now(),
           deleted_by_employee_id = $2,
           updated_by_employee_id = $2,
           updated_at = now(),
           version = version + 1
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [formId, actor.actorEmployeeId],
    )
    if (!rows[0]) throw new HttpError(404, 'Scorecard form not found.')
    const form = mapScorecardForm(rows[0])
    await appendActivityEvent(client, {
      eventKey: 'scorecard_form.deleted',
      entityType: 'scorecard_form',
      entityId: form.id,
      ...actor,
      summary: `Deleted scorecard form ${form.name}`,
      metadata: { formId: form.id },
      source: 'api',
    })
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
