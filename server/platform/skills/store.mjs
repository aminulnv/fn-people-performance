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
    department: 'Sales',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-accuracy',
    name: 'Accuracy',
    department: '',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-financial-accuracy',
    name: 'Accuracy in Financial Processing',
    department: 'Finance',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-acquisition-negotiation',
    name: 'Acquisition and Negotiation',
    department: '',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-admin-support',
    name: 'Administrative Support',
    department: 'HR',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-ai-fluency',
    name: 'AI Fluency',
    department: 'Strategic Execution',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-analytical-methods',
    name: 'Analytical and Statistical Methods',
    department: 'Product',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-analytical-thinking',
    name: 'Analytical Thinking',
    department: 'Trading & Risk',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-stakeholder-comms',
    name: 'Stakeholder Communication',
    department: '',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-delivery-ownership',
    name: 'Delivery Ownership',
    department: 'Engineering',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-people-leadership',
    name: 'People Leadership',
    department: '',
    role: 'Manager',
    status: 'approved',
  },
  {
    id: 'skill-coaching',
    name: 'Coaching and Feedback',
    department: '',
    role: 'Manager',
    status: 'approved',
  },
  {
    id: 'skill-data-storytelling',
    name: 'Analytical Insight and Context Building',
    department: 'Product',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-risk-judgement',
    name: 'Risk Judgement',
    department: 'Trading & Risk',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-process-design',
    name: 'Process Design',
    department: 'Operations',
    role: '',
    status: 'approved',
  },
  {
    id: 'skill-written-comms',
    name: 'Written Communication',
    department: '',
    role: '',
    status: 'approved',
  },
]

const MASTERY_LEVELS = [
  'none',
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
    department: row.function_name ?? '',
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
           id, name, function_name, role_name, status
         ) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        [item.id, item.name, item.department, item.role, item.status],
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

async function resolveDepartmentName(client, input) {
  const departmentName = String(input.department ?? input.function ?? '').trim()
  if (!departmentName) return ''
  const { rows } = await client.query(
    `SELECT name FROM platform.departments WHERE lower(name) = lower($1) LIMIT 1`,
    [departmentName],
  )
  if (!rows[0]) {
    throw new HttpError(
      400,
      'Pick a department from the list, or leave blank for company-wide.',
    )
  }
  return rows[0].name
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
    const departmentName = await resolveDepartmentName(client, input)
    const { rows } = await client.query(
      `INSERT INTO platform.skills (
         id, name, function_name, role_name, status, mastery,
         created_by_employee_id, updated_by_employee_id
       ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $7)
       RETURNING *`,
      [
        id,
        name,
        departmentName,
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
    const departmentName = await resolveDepartmentName(client, input)
    const mastery = Object.prototype.hasOwnProperty.call(input, 'mastery')
      ? normalizeMastery(input.mastery)
      : normalizeMastery(existingRows[0].mastery)

    const { rows } = await client.query(
      `UPDATE platform.skills
       SET name = $2,
           function_name = $3,
           role_name = $4,
           status = $5,
           mastery = $6::jsonb,
           updated_by_employee_id = $7,
           updated_at = now()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [
        id,
        name,
        departmentName,
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
