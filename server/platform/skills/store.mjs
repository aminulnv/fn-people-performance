/**
 * Skills library + employee assignments.
 */

import crypto from 'node:crypto'
import { getPool } from '../../db.mjs'
import { HttpError } from '../../errors.mjs'
import { appendActivityEvent } from '../activity.mjs'

const SEED_SKILLS = [
  {
    id: 'skill-account-planning',
    name: 'Account Planning',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-accuracy',
    name: 'Accuracy',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-financial-accuracy',
    name: 'Accuracy in Financial Processing',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-acquisition-negotiation',
    name: 'Acquisition and Negotiation',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-admin-support',
    name: 'Administrative Support',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-ai-fluency',
    name: 'AI Fluency',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-analytical-methods',
    name: 'Analytical and Statistical Methods',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-analytical-thinking',
    name: 'Analytical Thinking',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-stakeholder-comms',
    name: 'Stakeholder Communication',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-delivery-ownership',
    name: 'Delivery Ownership',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-people-leadership',
    name: 'People Leadership',
    role: 'Manager',
    status: 'approved',
  },
  {
    id: 'skill-coaching',
    name: 'Coaching and Feedback',
    role: 'Manager',
    status: 'approved',
  },
  {
    id: 'skill-data-storytelling',
    name: 'Analytical Insight and Context Building',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-risk-judgement',
    name: 'Risk Judgement',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-process-design',
    name: 'Process Design',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-written-comms',
    name: 'Written Communication',
    role: '',
    status: 'approved',
  },
]

/** Rubric keys. `none` is Not Applicable; grading uses Poor…Expert. */
const MASTERY_LEVELS = [
  'none',
  'poor',
  'basic',
  'intermediate',
  'advanced',
  'expert',
]

function actorFromUser(platformUser) {
  return {
    actorEmployeeId: platformUser?.employeeId ?? null,
    actorEmail: platformUser?.email ?? '',
    actorName: platformUser?.name ?? '',
  }
}

function emptyMastery() {
  return {
    none: '',
    poor: '',
    basic: '',
    intermediate: '',
    advanced: '',
    expert: '',
  }
}

function normalizeMastery(value) {
  const next = emptyMastery()
  if (!value || typeof value !== 'object' || Array.isArray(value)) return next
  for (const level of MASTERY_LEVELS) {
    next[level] = String(value[level] ?? '').trim()
  }
  return next
}

function mapSkill(row) {
  return {
    id: row.id,
    name: row.name,
    role: row.role_name ?? '',
    status: row.status === 'draft' ? 'draft' : 'approved',
    mastery: normalizeMastery(row.mastery),
  }
}

export async function ensureDefaultSkills() {
  const ids = SEED_SKILLS.map((item) => item.id)
  const { rows: existing } = await getPool().query(
    `SELECT id FROM platform.skills
     WHERE id = ANY($1::text[]) AND deleted_at IS NULL`,
    [ids],
  )
  const have = new Set(existing.map((row) => row.id))
  const missing = SEED_SKILLS.filter((item) => !have.has(item.id))
  if (missing.length === 0) return

  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    for (const item of missing) {
      await client.query(
        `INSERT INTO platform.skills (
           id, name, role_name, status
         ) VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [item.id, item.name, item.role, item.status],
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

export async function listSkillsCatalog() {
  try {
    await ensureDefaultSkills()
  } catch {
    /* table may be missing until migrations run */
  }
  const { rows } = await getPool().query(
    `SELECT *
     FROM platform.skills
     WHERE deleted_at IS NULL
     ORDER BY lower(name), created_at`,
  )
  return rows.map(mapSkill)
}

export async function listSkillAssignments() {
  const { rows } = await getPool().query(
    `SELECT employee_id, skill_id
     FROM platform.employee_skills
     ORDER BY employee_id, skill_id`,
  )
  const byEmployee = new Map()
  for (const row of rows) {
    const employeeId = Number(row.employee_id)
    const list = byEmployee.get(employeeId) ?? []
    list.push(String(row.skill_id))
    byEmployee.set(employeeId, list)
  }
  return [...byEmployee.entries()].map(([employeeId, skillIds]) => ({
    employeeId,
    skillIds,
  }))
}

export async function listSkillsSnapshot() {
  const [skills, assignments] = await Promise.all([
    listSkillsCatalog(),
    listSkillAssignments().catch(() => []),
  ])
  return { skills, assignments }
}

export async function createSkill(input, platformUser) {
  const name = String(input.name ?? '').trim()
  if (!name) throw new HttpError(400, 'Give the skill a name.')
  const actor = actorFromUser(platformUser)
  const id = input.id || `skill-${crypto.randomUUID()}`
  const roleName = String(input.role ?? '').trim()
  const status = input.status === 'draft' ? 'draft' : 'approved'
  const mastery = normalizeMastery(input.mastery)

  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `INSERT INTO platform.skills (
         id, name, role_name, status, mastery,
         created_by_employee_id, updated_by_employee_id
       ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $6)
       RETURNING *`,
      [
        id,
        name,
        roleName,
        status,
        JSON.stringify(mastery),
        actor.actorEmployeeId,
      ],
    )
    const skill = mapSkill(rows[0])
    await appendActivityEvent(client, {
      eventKey: 'skill.created',
      entityType: 'skill',
      entityId: skill.id,
      ...actor,
      summary: `Created skill ${skill.name}`,
      metadata: { skillId: skill.id },
      source: 'api',
    })
    await client.query('COMMIT')
    return skill
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function archiveSkill(skillId, platformUser) {
  const id = String(skillId ?? '').trim()
  if (!id) throw new HttpError(400, 'Skill id is required.')
  const actor = actorFromUser(platformUser)
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `UPDATE platform.skills
       SET deleted_at = now(),
           deleted_by_employee_id = $2,
           updated_by_employee_id = $2,
           updated_at = now()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id, name`,
      [id, actor.actorEmployeeId],
    )
    if (!rows[0]) throw new HttpError(404, 'This skill was not found.')
    await appendActivityEvent(client, {
      eventKey: 'skill.archived',
      entityType: 'skill',
      entityId: rows[0].id,
      ...actor,
      summary: `Archived skill ${rows[0].name}`,
      metadata: { skillId: rows[0].id },
      source: 'api',
    })
    await client.query('COMMIT')
    return { id: rows[0].id, name: rows[0].name, archived: true }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function updateSkill(skillId, input, platformUser) {
  const id = String(skillId ?? '').trim()
  if (!id) throw new HttpError(400, 'Skill id is required.')
  const name = String(input.name ?? '').trim()
  if (!name) throw new HttpError(400, 'Give the skill a name.')
  const actor = actorFromUser(platformUser)
  const roleName = String(input.role ?? '').trim()
  const status = input.status === 'draft' ? 'draft' : 'approved'

  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const { rows: existingRows } = await client.query(
      `SELECT * FROM platform.skills
       WHERE id = $1 AND deleted_at IS NULL
       FOR UPDATE`,
      [id],
    )
    if (!existingRows[0]) throw new HttpError(404, 'This skill was not found.')
    const mastery = Object.prototype.hasOwnProperty.call(input, 'mastery')
      ? normalizeMastery(input.mastery)
      : normalizeMastery(existingRows[0].mastery)

    const { rows } = await client.query(
      `UPDATE platform.skills
       SET name = $2,
           role_name = $3,
           status = $4,
           mastery = $5::jsonb,
           updated_by_employee_id = $6,
           updated_at = now()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [
        id,
        name,
        roleName,
        status,
        JSON.stringify(mastery),
        actor.actorEmployeeId,
      ],
    )
    const skill = mapSkill(rows[0])
    await appendActivityEvent(client, {
      eventKey: 'skill.updated',
      entityType: 'skill',
      entityId: skill.id,
      ...actor,
      summary: `Updated skill ${skill.name}`,
      metadata: { skillId: skill.id },
      source: 'api',
    })
    await client.query('COMMIT')
    return skill
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function setEmployeeSkillIds(employeeId, skillIds, platformUser) {
  const id = Number(employeeId)
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, 'Employee id is required.')
  }
  const actor = actorFromUser(platformUser)
  const requested = [
    ...new Set(
      (Array.isArray(skillIds) ? skillIds : [])
        .map((value) => String(value ?? '').trim())
        .filter(Boolean),
    ),
  ]

  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const { rows: employeeRows } = await client.query(
      `SELECT employee_id FROM platform.employees WHERE employee_id = $1`,
      [id],
    )
    if (!employeeRows[0]) throw new HttpError(404, 'Employee not found.')

    let nextIds = requested
    if (requested.length > 0) {
      const { rows: known } = await client.query(
        `SELECT id FROM platform.skills
         WHERE deleted_at IS NULL AND id = ANY($1::text[])`,
        [requested],
      )
      const knownIds = new Set(known.map((row) => row.id))
      nextIds = requested.filter((skillId) => knownIds.has(skillId))
    }

    await client.query(
      `DELETE FROM platform.employee_skills WHERE employee_id = $1`,
      [id],
    )
    for (const skillId of nextIds) {
      await client.query(
        `INSERT INTO platform.employee_skills (
           employee_id, skill_id, assigned_by_employee_id
         ) VALUES ($1, $2, $3)`,
        [id, skillId, actor.actorEmployeeId],
      )
    }
    await appendActivityEvent(client, {
      eventKey: 'skill.assignment_updated',
      entityType: 'employee',
      entityId: String(id),
      ...actor,
      summary: `Updated skills for employee ${id}`,
      metadata: { employeeId: id, skillIds: nextIds },
      source: 'api',
    })
    await client.query('COMMIT')
    return { employeeId: id, skillIds: nextIds }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
