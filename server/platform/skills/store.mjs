/**
 * Skills library + employee assignments.
 */

import crypto from 'node:crypto'
import { getPool } from '../../db.mjs'
import { HttpError } from '../../errors.mjs'
import { appendActivityEvent } from '../activity.mjs'

function seedMastery(bands) {
  return {
    none: '',
    unsatisfactory: bands.unsatisfactory,
    basic: bands.basic,
    intermediate: bands.intermediate,
    advanced: bands.advanced,
    expert: bands.expert,
  }
}

const SEED_SKILLS = [
  {
    id: 'skill-account-planning',
    name: 'Account Planning',
    role: '',
    status: 'active',
    mastery: seedMastery({
      unsatisfactory: 'Has no clear plan for accounts; reacts only when problems appear.',
      basic: 'Keeps a simple account list but plans are thin or rarely updated.',
      intermediate:
        'Builds workable account plans with goals, next steps, and owners.',
      advanced:
        'Runs strong account plans that anticipate risks and growth opportunities.',
      expert:
        'Sets the standard for account planning; others copy their approach.',
    }),
  },
  {
    id: 'skill-accuracy',
    name: 'Accuracy',
    role: '',
    status: 'active',
    mastery: seedMastery({
      unsatisfactory: 'Work often has errors that others must catch and fix.',
      basic: 'Usually accurate on simple tasks; mistakes rise with complexity.',
      intermediate:
        'Delivers accurate work consistently and checks before handing off.',
      advanced:
        'Catches issues early; work rarely needs rework from accuracy gaps.',
      expert:
        'Trusted as the accuracy bar; prevents errors across the wider process.',
    }),
  },
  {
    id: 'skill-financial-accuracy',
    name: 'Accuracy in Financial Processing',
    role: '',
    status: 'active',
    mastery: seedMastery({
      unsatisfactory: 'Financial entries or checks frequently contain material mistakes.',
      basic: 'Completes routine financial tasks with supervision and rework.',
      intermediate:
        'Processes financial work accurately within policy and deadlines.',
      advanced:
        'Spots anomalies quickly and keeps financial records clean under volume.',
      expert:
        'Owns financial accuracy standards and coaches others to meet them.',
    }),
  },
  {
    id: 'skill-acquisition-negotiation',
    name: 'Acquisition and Negotiation',
    role: '',
    status: 'active',
    mastery: seedMastery({
      unsatisfactory: 'Avoids negotiation or accepts weak terms without clear trade-offs.',
      basic: 'Can negotiate simple deals with guidance on targets and limits.',
      intermediate:
        'Negotiates fair outcomes that protect value and keep relationships intact.',
      advanced:
        'Wins better terms through preparation, timing, and clear BATNA thinking.',
      expert:
        'Leads complex negotiations and raises the bar for deal quality org-wide.',
    }),
  },
  {
    id: 'skill-admin-support',
    name: 'Administrative Support',
    role: '',
    status: 'active',
    mastery: seedMastery({
      unsatisfactory: 'Admin tasks are late, incomplete, or need constant chasing.',
      basic: 'Handles routine admin when given clear instructions.',
      intermediate:
        'Keeps calendars, docs, and follow-ups organised without reminders.',
      advanced:
        'Anticipates admin needs and keeps teams running smoothly under pressure.',
      expert:
        'Designs admin systems others rely on; removes friction for the whole team.',
    }),
  },
  {
    id: 'skill-ai-fluency',
    name: 'AI Fluency',
    role: '',
    status: 'active',
    mastery: seedMastery({
      unsatisfactory: 'Avoids AI tools or uses them in ways that create risk or noise.',
      basic: 'Uses simple AI prompts for drafts with heavy manual cleanup.',
      intermediate:
        'Uses AI effectively to speed quality work while checking outputs.',
      advanced:
        'Builds repeatable AI workflows that save time without lowering standards.',
      expert:
        'Teaches others strong AI practice and sets safe, high-value usage norms.',
    }),
  },
  {
    id: 'skill-analytical-methods',
    name: 'Analytical and Statistical Methods',
    role: '',
    status: 'active',
    mastery: seedMastery({
      unsatisfactory: 'Cannot apply basic analysis methods; conclusions are unsupported.',
      basic: 'Runs simple stats or summaries with help choosing the method.',
      intermediate:
        'Chooses suitable methods and explains findings clearly to stakeholders.',
      advanced:
        'Applies robust methods, tests assumptions, and flags uncertainty honestly.',
      expert:
        'Defines analytical standards and methods others adopt across teams.',
    }),
  },
  {
    id: 'skill-analytical-thinking',
    name: 'Analytical Thinking',
    role: '',
    status: 'active',
    mastery: seedMastery({
      unsatisfactory: 'Jumps to conclusions without separating facts from opinions.',
      basic: 'Breaks simple problems into parts with coaching.',
      intermediate:
        'Structures problems, weighs evidence, and reaches sound recommendations.',
      advanced:
        'Cuts through ambiguity fast and surfaces the few decisions that matter.',
      expert:
        'Raises team analytical quality; frames hard problems others can solve.',
    }),
  },
  {
    id: 'skill-stakeholder-comms',
    name: 'Stakeholder Communication',
    role: '',
    status: 'active',
    mastery: seedMastery({
      unsatisfactory: 'Updates are missing, late, or confusing for stakeholders.',
      basic: 'Shares updates when asked; tone and clarity still uneven.',
      intermediate:
        'Keeps stakeholders informed with clear, timely, audience-fit messages.',
      advanced:
        'Manages tough conversations well and aligns people before issues escalate.',
      expert:
        'Sets the communication standard; builds trust across senior stakeholders.',
    }),
  },
  {
    id: 'skill-delivery-ownership',
    name: 'Delivery Ownership',
    role: '',
    status: 'active',
    mastery: seedMastery({
      unsatisfactory: 'Drops commitments; needs chasing to finish work.',
      basic: 'Delivers assigned work when priorities stay stable.',
      intermediate:
        'Owns outcomes end-to-end and flags risks early with a recovery plan.',
      advanced:
        'Drives delivery across dependencies and unblocks others without drama.',
      expert:
        'Trusted with critical outcomes; raises ownership norms for the team.',
    }),
  },
  {
    id: 'skill-people-leadership',
    name: 'People Leadership',
    role: 'Manager',
    status: 'active',
    mastery: seedMastery({
      unsatisfactory: 'Avoids people issues; team is unclear on priorities or support.',
      basic: 'Leads day-to-day tasks but struggles with harder people moments.',
      intermediate:
        'Sets clear expectations, supports the team, and follows through fairly.',
      advanced:
        'Builds a high-trust team that delivers; develops people for bigger seats.',
      expert:
        'Multiplies leaders; culture and performance improve under their leadership.',
    }),
  },
  {
    id: 'skill-coaching',
    name: 'Coaching and Feedback',
    role: 'Manager',
    status: 'active',
    mastery: seedMastery({
      unsatisfactory: 'Rarely gives feedback, or feedback is vague and unhelpful.',
      basic: 'Gives occasional feedback when prompted by reviews or issues.',
      intermediate:
        'Gives timely, specific feedback that helps people improve.',
      advanced:
        'Coaches through stretch moments and builds lasting capability in others.',
      expert:
        'Creates a feedback culture; others seek them out to grow.',
    }),
  },
  {
    id: 'skill-data-storytelling',
    name: 'Analytical Insight and Context Building',
    role: '',
    status: 'active',
    mastery: seedMastery({
      unsatisfactory: 'Shares numbers without meaning; stakeholders stay confused.',
      basic: 'Reports data points but struggles to explain “so what”.',
      intermediate:
        'Turns analysis into a clear story with context and a recommended action.',
      advanced:
        'Frames insights that change decisions and keep audiences aligned.',
      expert:
        'Sets the bar for insight storytelling; complex data becomes actionable.',
    }),
  },
  {
    id: 'skill-risk-judgement',
    name: 'Risk Judgement',
    role: '',
    status: 'active',
    mastery: seedMastery({
      unsatisfactory: 'Misses obvious risks or escalates everything without judgement.',
      basic: 'Spots basic risks but needs help deciding severity and response.',
      intermediate:
        'Assesses risk vs impact and chooses a proportionate next step.',
      advanced:
        'Anticipates second-order risks and protects outcomes without slowing everything.',
      expert:
        'Trusted on high-stakes calls; teaches others how to weigh risk well.',
    }),
  },
  {
    id: 'skill-process-design',
    name: 'Process Design',
    role: '',
    status: 'active',
    mastery: seedMastery({
      unsatisfactory: 'Work stays ad hoc; repeats the same friction without fixing it.',
      basic: 'Documents simple steps when asked; processes stay brittle.',
      intermediate:
        'Designs clear processes that reduce errors and handoff confusion.',
      advanced:
        'Improves processes end-to-end and measures whether the change stuck.',
      expert:
        'Builds scalable process systems others adopt across teams.',
    }),
  },
  {
    id: 'skill-written-comms',
    name: 'Written Communication',
    role: '',
    status: 'active',
    mastery: seedMastery({
      unsatisfactory: 'Writing is unclear, error-heavy, or hard to act on.',
      basic: 'Writes understandable notes for simple topics with editing help.',
      intermediate:
        'Writes clear, structured messages that people can act on quickly.',
      advanced:
        'Writes crisp docs that align busy stakeholders and reduce meetings.',
      expert:
        'Sets the writing standard; complex ideas stay short, sharp, and usable.',
    }),
  },
]

/** Rubric keys. `none` is Not Applicable; grading uses Unsatisfactory…Expert. */
const MASTERY_LEVELS = [
  'none',
  'unsatisfactory',
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
    unsatisfactory: '',
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
  // Legacy mastery key before Unsatisfactory rename.
  if (!next.unsatisfactory && value.poor != null) {
    next.unsatisfactory = String(value.poor).trim()
  }
  return next
}

function mapSkill(row) {
  return {
    id: row.id,
    name: row.name,
    role: row.role_name ?? '',
    status:
      row.status === 'inactive' || row.status === 'draft'
        ? 'inactive'
        : 'active',
    mastery: normalizeMastery(row.mastery),
  }
}

function masteryIsEmpty(value) {
  const mastery = normalizeMastery(value)
  return MASTERY_LEVELS.every((level) => !mastery[level])
}

export async function ensureDefaultSkills() {
  const ids = SEED_SKILLS.map((item) => item.id)
  const { rows: existing } = await getPool().query(
    `SELECT id, mastery FROM platform.skills
     WHERE id = ANY($1::text[]) AND deleted_at IS NULL`,
    [ids],
  )
  const byId = new Map(existing.map((row) => [row.id, row]))
  const missing = SEED_SKILLS.filter((item) => !byId.has(item.id))
  const emptyMastery = SEED_SKILLS.filter((item) => {
    const row = byId.get(item.id)
    return row && masteryIsEmpty(row.mastery)
  })
  if (missing.length === 0 && emptyMastery.length === 0) return

  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    for (const item of missing) {
      await client.query(
        `INSERT INTO platform.skills (
           id, name, role_name, status, mastery
         ) VALUES ($1, $2, $3, $4, $5::jsonb)
         ON CONFLICT (id) DO NOTHING`,
        [
          item.id,
          item.name,
          item.role,
          item.status,
          JSON.stringify(normalizeMastery(item.mastery)),
        ],
      )
    }
    for (const item of emptyMastery) {
      await client.query(
        `UPDATE platform.skills
         SET mastery = $2::jsonb, updated_at = now()
         WHERE id = $1 AND deleted_at IS NULL`,
        [item.id, JSON.stringify(normalizeMastery(item.mastery))],
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
  const status =
    input.status === 'inactive' || input.status === 'draft'
      ? 'inactive'
      : 'active'
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
  const status =
    input.status === 'inactive' || input.status === 'draft'
      ? 'inactive'
      : 'active'

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
