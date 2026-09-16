/**
 * Cultural values library (platform."values").
 */

import crypto from 'node:crypto'
import { getPool } from '../../db.mjs'
import { HttpError } from '../../errors.mjs'
import { appendActivityEvent } from '../activity.mjs'
import { SEED_VALUES } from './seed.mjs'

function actorFromUser(platformUser) {
  return {
    actorEmployeeId: platformUser?.employeeId ?? null,
    actorEmail: platformUser?.email ?? '',
    actorName: platformUser?.name ?? '',
  }
}

function parseBehaviours(raw) {
  if (!Array.isArray(raw)) return []
  return raw
}

function mapValue(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    status: row.status === 'disabled' ? 'disabled' : 'enabled',
    playbookUrl: row.playbook_url ?? null,
    behaviours: parseBehaviours(row.behaviours),
  }
}

export async function ensureDefaultValues() {
  const ids = SEED_VALUES.map((item) => item.id)
  const { rows: existing } = await getPool().query(
    `SELECT id FROM platform."values"
     WHERE id = ANY($1::text[]) AND deleted_at IS NULL`,
    [ids],
  )
  const have = new Set(existing.map((row) => row.id))
  const missing = SEED_VALUES.filter((item) => !have.has(item.id))
  if (missing.length === 0) return

  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    for (const item of missing) {
      await client.query(
        `INSERT INTO platform."values" (
           id, name, description, status, playbook_url, behaviours
         ) VALUES ($1, $2, $3, $4, NULL, '[]'::jsonb)
         ON CONFLICT (id) DO NOTHING`,
        [item.id, item.name, item.description, item.status],
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

export async function listValuesCatalog() {
  try {
    await ensureDefaultValues()
  } catch {
    /* table may be missing until migrations run */
  }
  const { rows } = await getPool().query(
    `SELECT *
     FROM platform."values"
     WHERE deleted_at IS NULL
     ORDER BY created_at, lower(name)`,
  )
  return rows.map(mapValue)
}

export async function listValuesSnapshot() {
  const values = await listValuesCatalog()
  return { values }
}

export async function createValue(input, platformUser) {
  const name = String(input.name ?? '').trim()
  if (!name) throw new HttpError(400, 'Give the value a title.')
  const actor = actorFromUser(platformUser)
  const id = String(input.id ?? '').trim() || `value-${crypto.randomUUID()}`
  const description = String(input.description ?? '').trim()
  const status = input.status === 'disabled' ? 'disabled' : 'enabled'
  const behaviours = Array.isArray(input.behaviours) ? input.behaviours : []

  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `INSERT INTO platform."values" (
         id, name, description, status, playbook_url, behaviours,
         created_by_employee_id, updated_by_employee_id
       ) VALUES ($1, $2, $3, $4, NULL, $5::jsonb, $6, $6)
       RETURNING *`,
      [
        id,
        name,
        description,
        status,
        JSON.stringify(behaviours),
        actor.actorEmployeeId,
      ],
    )
    const value = mapValue(rows[0])
    await appendActivityEvent(client, {
      eventKey: 'value.created',
      entityType: 'value',
      entityId: value.id,
      ...actor,
      summary: `Created value ${value.name}`,
      metadata: { valueId: value.id },
      source: 'api',
    })
    await client.query('COMMIT')
    return value
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function updateValue(valueId, input, platformUser) {
  const id = String(valueId ?? '').trim()
  if (!id) throw new HttpError(400, 'Value id is required.')
  const name = String(input.name ?? '').trim()
  if (!name) throw new HttpError(400, 'Give the value a title.')
  const actor = actorFromUser(platformUser)
  const description = String(input.description ?? '').trim()
  const status = input.status === 'disabled' ? 'disabled' : 'enabled'
  const behaviours = Array.isArray(input.behaviours) ? input.behaviours : null

  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const { rows: existingRows } = await client.query(
      `SELECT * FROM platform."values"
       WHERE id = $1 AND deleted_at IS NULL
       FOR UPDATE`,
      [id],
    )
    if (!existingRows[0]) throw new HttpError(404, 'This value was not found.')

    const { rows } = await client.query(
      `UPDATE platform."values"
       SET name = $2,
           description = $3,
           status = $4,
           playbook_url = NULL,
           behaviours = COALESCE($5::jsonb, behaviours),
           updated_by_employee_id = $6,
           updated_at = now()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [
        id,
        name,
        description,
        status,
        behaviours == null ? null : JSON.stringify(behaviours),
        actor.actorEmployeeId,
      ],
    )
    const value = mapValue(rows[0])
    await appendActivityEvent(client, {
      eventKey: 'value.updated',
      entityType: 'value',
      entityId: value.id,
      ...actor,
      summary: `Updated value ${value.name}`,
      metadata: { valueId: value.id },
      source: 'api',
    })
    await client.query('COMMIT')
    return value
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
