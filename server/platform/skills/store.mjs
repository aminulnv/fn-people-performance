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
    function: 'Sales',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-accuracy',
    name: 'Accuracy',
    function: '',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-financial-accuracy',
    name: 'Accuracy in Financial Processing',
    function: 'Finance',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-acquisition-negotiation',
    name: 'Acquisition and Negotiation',
    function: '',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-admin-support',
    name: 'Administrative Support',
    function: 'HR',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-ai-fluency',
    name: 'AI Fluency',
    function: 'Strategic Execution',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-analytical-methods',
    name: 'Analytical and Statistical Methods',
    function: 'Product',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-analytical-thinking',
    name: 'Analytical Thinking',
    function: 'Trading & Risk',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-stakeholder-comms',
    name: 'Stakeholder Communication',
    function: '',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-delivery-ownership',
    name: 'Delivery Ownership',
    function: 'Engineering',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-people-leadership',
    name: 'People Leadership',
    function: '',
    role: 'Manager',
    status: 'approved',
  },
  {
    id: 'skill-coaching',
    name: 'Coaching and Feedback',
    function: '',
    role: 'Manager',
    status: 'approved',
  },
  {
    id: 'skill-data-storytelling',
    name: 'Analytical Insight and Context Building',
    function: 'Product',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-risk-judgement',
    name: 'Risk Judgement',
    function: 'Trading & Risk',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-process-design',
    name: 'Process Design',
    function: 'Operations',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-written-comms',
    name: 'Written Communication',
    function: '',
    role: '',
    status: 'approved',
  },
]

function actorFromUser(platformUser) {
  return {
    actorEmployeeId: platformUser?.employeeId ?? null,
    actorEmail: platformUser?.email ?? '',
    actorName: platformUser?.name ?? '',
  }
}

function mapSkill(row) {
  return {
    id: row.id,
    name: row.name,
    function: row.function_name ?? '',
    role: row.role_name ?? '',
    status: row.status === 'draft' ? 'draft' : 'approved',
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
           id, name, function_name, role_name, status
         ) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        [item.id, item.name, item.function, item.role, item.status],
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
  const functionName = String(input.function ?? '').trim()
  const roleName = String(input.role ?? '').trim()
  const status = input.status === 'draft' ? 'draft' : 'approved'

  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `INSERT INTO platform.skills (
         id, name, function_name, role_name, status,
         created_by_employee_id, updated_by_employee_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $6)
       RETURNING *`,
      [id, name, functionName, roleName, status, actor.actorEmployeeId],
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
