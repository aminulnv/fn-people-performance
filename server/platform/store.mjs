/**
 * platform.* table access for /api/platform/*
 * Used by the standalone platform API (shared RDS, platform schema only).
 */
import { getPool } from '../db.mjs'
import { appendActivityEvent } from './activity.mjs'
import { recordGradeChange } from './career.mjs'
import { resolveEmployeeRole } from './roles/store.mjs'

function activityActor(actor = {}) {
  return {
    actorEmployeeId: actor.employeeId ?? actor.actorEmployeeId ?? null,
    actorEmail: actor.email ?? actor.actorEmail ?? '',
    actorName: actor.name ?? actor.actorName ?? '',
  }
}

const EMPLOYEE_SELECT = `
  SELECT
    e.employee_id,
    e.email,
    e.name,
    e.joining_date,
    e.status,
    e.role,
    e.role_id,
    e.job_title,
    e.job_grade,
    e.site,
    e.avatar_url,
    e.department_id,
    e.team_id,
    e.division_id,
    e.reports_to_employee_id,
    e.department_head_employee_id,
    e.created_at,
    e.updated_at,
    d.name AS department_name,
    t.name AS team_name,
    div.name AS division_name,
    head.employee_id AS department_head_id,
    head.name AS department_head_name,
    hrbp.employee_id AS hrbp_id,
    hrbp.name AS hrbp_name,
    own.employee_id AS team_owner_id,
    own.name AS team_owner_name,
    mgr.employee_id AS manager_id,
    mgr.name AS reports_to_name,
    mgr.email AS manager_email,
    role_cat.name AS role_catalog_name,
    grade_since.effective_on AS grade_effective_on,
    last_promo.effective_on AS last_promotion_on,
    (active_pip.employee_id IS NOT NULL) AS on_pip
  FROM platform.employees e
  LEFT JOIN platform.roles role_cat ON role_cat.id = e.role_id
  LEFT JOIN platform.departments d ON d.id = e.department_id
  LEFT JOIN platform.teams t ON t.id = e.team_id
  LEFT JOIN platform.divisions div ON div.id = e.division_id
  LEFT JOIN platform.employees head ON head.employee_id = e.department_head_employee_id
  LEFT JOIN platform.employees hrbp ON hrbp.employee_id = d.hrbp_employee_id
  LEFT JOIN platform.employees own ON own.employee_id = t.owner_employee_id
  LEFT JOIN platform.employees mgr ON mgr.employee_id = e.reports_to_employee_id
  LEFT JOIN LATERAL (
    SELECT g.effective_on
    FROM platform.employee_grade_changes g
    WHERE g.employee_id = e.employee_id
      AND btrim(g.job_grade) = btrim(e.job_grade)
    ORDER BY g.effective_on DESC, g.id DESC
    LIMIT 1
  ) grade_since ON true
  LEFT JOIN LATERAL (
    SELECT g.effective_on
    FROM platform.employee_grade_changes g
    WHERE g.employee_id = e.employee_id
      AND g.change_kind = 'promotion'
    ORDER BY g.effective_on DESC, g.id DESC
    LIMIT 1
  ) last_promo ON true
  LEFT JOIN LATERAL (
    SELECT p.employee_id
    FROM platform.employee_pips p
    WHERE p.employee_id = e.employee_id
      AND p.status = 'active'
    ORDER BY p.started_on DESC, p.id DESC
    LIMIT 1
  ) active_pip ON true
`

function isoDate(value) {
  if (value == null || value === '') return ''
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return ''
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${value.getFullYear()}-${month}-${day}`
  }
  const raw = String(value).trim()
  return /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : ''
}

function isoInstant(value) {
  if (value == null || value === '') return ''
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString()
  }
  const raw = String(value).trim()
  if (!raw) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw}T00:00:00.000Z`
  const instant = new Date(raw)
  return Number.isNaN(instant.getTime()) ? '' : instant.toISOString()
}

function isoTimestamp(value) {
  if (!value) return new Date().toISOString()
  if (value instanceof Date) return value.toISOString()
  return new Date(value).toISOString()
}

function integerId(value) {
  if (value == null || value === '') return undefined
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : undefined
}

/** Normalize avatar URLs; blank/whitespace → empty string. */
function usableAvatarUrl(src) {
  return String(src ?? '').trim()
}

/** Map a joined row to the SPA PlatformEmployee shape. */
export function mapEmployeeRow(row) {
  return {
    employeeId: row.employee_id,
    fullName: row.name ?? '',
    email: row.email ?? '',
    startDate: isoInstant(row.joining_date),
    role: row.role_catalog_name || row.role || '',
    roleId: row.role_id || undefined,
    jobTitle: row.job_title ?? '',
    department: row.department_name ?? '',
    departmentId: integerId(row.department_id),
    team: row.team_name ?? '',
    teamId: integerId(row.team_id),
    division: row.division_name ?? '',
    reportsToName: row.reports_to_name ?? '',
    departmentHeadName: row.department_head_name ?? '',
    hrbpName: row.hrbp_name ?? '',
    teamOwnerName: row.team_owner_name ?? '',
    jobGrade: row.job_grade ?? '',
    gradeEffectiveOn: isoDate(row.grade_effective_on) || undefined,
    lastPromotionOn: isoDate(row.last_promotion_on) || undefined,
    onPip: Boolean(row.on_pip),
    site: row.site ?? '',
    avatarUrl: usableAvatarUrl(row.avatar_url),
    managerEmail: row.manager_email ?? '',
    reportsToId: row.manager_id ?? undefined,
    departmentHeadId: row.department_head_id ?? undefined,
    hrbpId: row.hrbp_id ?? undefined,
    teamOwnerId: row.team_owner_id ?? undefined,
    isActive: row.status === 'active',
    createdAt: isoTimestamp(row.created_at),
    updatedAt: isoTimestamp(row.updated_at),
  }
}

export async function listPlatformEmployees() {
  const { rows } = await getPool().query(
    `${EMPLOYEE_SELECT} ORDER BY e.employee_id ASC`,
  )
  return rows.map(mapEmployeeRow)
}

export async function getPlatformEmployee(employeeId) {
  const { rows } = await getPool().query(
    `${EMPLOYEE_SELECT} WHERE e.employee_id = $1`,
    [employeeId],
  )
  return rows[0] ? mapEmployeeRow(rows[0]) : null
}

function uniquePositiveIds(ids) {
  return [
    ...new Set(
      ids.filter((id) => Number.isInteger(id) && id > 0),
    ),
  ]
}

/**
 * Profile-sized read: the subject, their reporting line, and direct reports.
 * Avoids `listPlatformEmployees` (full directory × 7 joins) on /people/:id.
 */
export async function getPlatformEmployeeProfile(employeeId) {
  const employee = await getPlatformEmployee(employeeId)
  if (!employee) return null

  const relatedIds = uniquePositiveIds([
    employee.reportsToId,
    employee.departmentHeadId,
    employee.hrbpId,
    employee.teamOwnerId,
  ]).filter((id) => id !== employeeId)

  const pool = getPool()
  const [relatedResult, reportsResult, managerCountResult, directoryResult] =
    await Promise.all([
      relatedIds.length > 0
        ? pool.query(`${EMPLOYEE_SELECT} WHERE e.employee_id = ANY($1::int[])`, [
            relatedIds,
          ])
        : Promise.resolve({ rows: [] }),
      pool.query(
        `${EMPLOYEE_SELECT} WHERE e.reports_to_employee_id = $1 ORDER BY e.name ASC`,
        [employeeId],
      ),
      employee.reportsToId
        ? pool.query(
            `SELECT count(*)::int AS n
             FROM platform.employees
             WHERE reports_to_employee_id = $1`,
            [employee.reportsToId],
          )
        : Promise.resolve({ rows: [{ n: 0 }] }),
      pool.query(`SELECT count(*)::int AS n FROM platform.employees`),
    ])

  const reportIds = reportsResult.rows.map((row) => row.employee_id)
  const nestedResult =
    reportIds.length > 0
      ? await pool.query(
          `SELECT reports_to_employee_id AS manager_id, count(*)::int AS n
           FROM platform.employees
           WHERE reports_to_employee_id = ANY($1::int[])
           GROUP BY reports_to_employee_id`,
          [reportIds],
        )
      : { rows: [] }

  const nestedReportCounts = {}
  for (const row of nestedResult.rows) {
    nestedReportCounts[row.manager_id] = row.n
  }

  return {
    employee,
    related: relatedResult.rows.map(mapEmployeeRow),
    directReports: reportsResult.rows.map(mapEmployeeRow),
    managerDirectReportCount: managerCountResult.rows[0]?.n ?? 0,
    directoryCount: directoryResult.rows[0]?.n ?? 0,
    nestedReportCounts,
  }
}

function dateOnly(value) {
  return isoInstant(value)
}

async function ensureDepartment(client, name, actor) {
  const trimmed = name.trim()
  if (!trimmed) return null
  const existing = await client.query(
    `SELECT id FROM platform.departments WHERE lower(name) = lower($1) LIMIT 1`,
    [trimmed],
  )
  if (existing.rows[0]) return existing.rows[0].id
  const inserted = await client.query(
    `INSERT INTO platform.departments (name) VALUES ($1) RETURNING id`,
    [trimmed],
  )
  if (actor) {
    await appendActivityEvent(client, {
      eventKey: 'department.created',
      entityType: 'department',
      entityId: String(inserted.rows[0].id),
      ...actor,
      summary: `Created department ${trimmed}`,
      source: 'api',
    })
  }
  return inserted.rows[0].id
}

async function ensureTeam(client, departmentId, name, actor) {
  const trimmed = name.trim()
  if (!departmentId || !trimmed) return null
  const existing = await client.query(
    `SELECT id FROM platform.teams
     WHERE department_id = $1 AND lower(name) = lower($2)
     LIMIT 1`,
    [departmentId, trimmed],
  )
  if (existing.rows[0]) return existing.rows[0].id
  const inserted = await client.query(
    `INSERT INTO platform.teams (department_id, name) VALUES ($1, $2) RETURNING id`,
    [departmentId, trimmed],
  )
  if (actor) {
    await appendActivityEvent(client, {
      eventKey: 'team.created',
      entityType: 'team',
      entityId: String(inserted.rows[0].id),
      ...actor,
      summary: `Created team ${trimmed}`,
      metadata: { departmentId },
      source: 'api',
    })
  }
  return inserted.rows[0].id
}

/** Resolve division by name only - does not create unknown divisions. */
async function resolveDivisionId(client, name) {
  const trimmed = name.trim()
  if (!trimmed) return null
  const existing = await client.query(
    `SELECT id FROM platform.divisions WHERE lower(name) = lower($1) LIMIT 1`,
    [trimmed],
  )
  return existing.rows[0]?.id ?? null
}

async function resolveEmployeeIdByEmail(client, email, exceptId) {
  const normalized = email?.trim().toLowerCase()
  if (!normalized) return null
  const { rows } = await client.query(
    `SELECT employee_id FROM platform.employees
     WHERE lower(email) = $1
       AND ($2::int IS NULL OR employee_id <> $2)
     LIMIT 1`,
    [normalized, exceptId ?? null],
  )
  return rows[0]?.employee_id ?? null
}

async function resolveEmployeeIdByName(client, name, exceptId) {
  const normalized = name?.trim().toLowerCase()
  if (!normalized) return null
  const { rows } = await client.query(
    `SELECT employee_id FROM platform.employees
     WHERE lower(name) = $1
       AND ($2::int IS NULL OR employee_id <> $2)
     LIMIT 1`,
    [normalized, exceptId ?? null],
  )
  return rows[0]?.employee_id ?? null
}

/**
 * @param {object} input SPA CreateEmployeeInput / UpdateEmployeeInput shape
 * @param {{ replaceEmployeeId?: number, actor?: object }} [options]
 */
export async function upsertPlatformEmployee(input, options = {}) {
  const employeeId = Number(input.employeeId)
  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    const err = new Error('Employee ID must be a positive whole number.')
    err.statusCode = 400
    throw err
  }

  const email = String(input.email ?? '')
    .trim()
    .toLowerCase()
  const fullName = String(input.fullName ?? '').trim()
  const startDateRaw = String(input.startDate ?? '').trim()
  const startDate = startDateRaw || null
  if (!email) {
    const err = new Error('Email is required.')
    err.statusCode = 400
    throw err
  }
  if (!fullName) {
    const err = new Error('Full name is required.')
    err.statusCode = 400
    throw err
  }

  const status = input.isActive === false ? 'inactive' : 'active'
  const replaceId = options.replaceEmployeeId ?? null
  const actor = activityActor(options.actor)
  const client = await getPool().connect()

  try {
    await client.query('BEGIN')

    const previous =
      replaceId != null
        ? (
            await client.query(
              `SELECT e.*, d.name AS department_name, t.name AS team_name,
                      div.name AS division_name,
                      mgr.employee_id AS manager_id
               FROM platform.employees e
               LEFT JOIN platform.departments d ON d.id = e.department_id
               LEFT JOIN platform.teams t ON t.id = e.team_id
               LEFT JOIN platform.divisions div ON div.id = e.division_id
               LEFT JOIN platform.employees mgr ON mgr.employee_id = e.reports_to_employee_id
               WHERE e.employee_id = $1`,
              [replaceId],
            )
          ).rows[0]
        : null

    if (replaceId != null && replaceId !== employeeId) {
      const taken = await client.query(
        `SELECT 1 FROM platform.employees WHERE employee_id = $1`,
        [employeeId],
      )
      if (taken.rows[0]) {
        const err = new Error(`Employee ID ${employeeId} already exists.`)
        err.statusCode = 409
        throw err
      }
    }

    const emailClash = await client.query(
      `SELECT employee_id FROM platform.employees
       WHERE lower(email) = $1
         AND ($2::int IS NULL OR employee_id <> $2)`,
      [email, replaceId],
    )
    if (emailClash.rows[0]) {
      const err = new Error('An employee with this email already exists.')
      err.statusCode = 409
      throw err
    }

    if (replaceId == null) {
      const exists = await client.query(
        `SELECT 1 FROM platform.employees WHERE employee_id = $1`,
        [employeeId],
      )
      if (exists.rows[0]) {
        const err = new Error(`Employee ID ${employeeId} already exists.`)
        err.statusCode = 409
        throw err
      }
    }

    const departmentId = await ensureDepartment(
      client,
      input.department ?? '',
      actor,
    )
    const teamId = await ensureTeam(
      client,
      departmentId,
      input.team ?? '',
      actor,
    )
    const divisionName = String(input.division ?? '').trim()
    const divisionId = await resolveDivisionId(client, divisionName)
    if (divisionName && divisionId == null) {
      const err = new Error(
        `Unknown division "${divisionName}". Choose FundedNext, FNmarkets, NEXT Group, or Core.`,
      )
      err.statusCode = 400
      throw err
    }
    const managerEmail = String(input.managerEmail ?? '')
      .trim()
      .toLowerCase()
    const reportsToId =
      (await resolveEmployeeIdByEmail(client, managerEmail, employeeId)) ??
      (await resolveEmployeeIdByName(
        client,
        input.reportsToName ?? '',
        employeeId,
      ))
    const departmentHeadId = await resolveEmployeeIdByName(
      client,
      input.departmentHeadName ?? '',
      null,
    )
    const avatarUrlProvided = Object.prototype.hasOwnProperty.call(
      input,
      'avatarUrl',
    )
    const avatarUrl = avatarUrlProvided
      ? usableAvatarUrl(input.avatarUrl)
      : null
    const roleAssignment = await resolveEmployeeRole(client, input)

    if (replaceId == null) {
      await client.query(
        `INSERT INTO platform.employees (
           employee_id, email, name, joining_date, status,
           role, role_id, job_title, job_grade, site, avatar_url, department_id, team_id, division_id,
           reports_to_employee_id, department_head_employee_id
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [
          employeeId,
          email,
          fullName,
          startDate,
          status,
          roleAssignment.roleName,
          roleAssignment.roleId,
          String(input.jobTitle ?? '').trim() || null,
          String(input.jobGrade ?? '').trim() || null,
          String(input.site ?? '').trim() || null,
          // NOT NULL column: omitted/empty becomes '' (defaults do not apply to explicit NULL)
          avatarUrl ?? '',
          departmentId,
          teamId,
          divisionId,
          reportsToId,
          departmentHeadId,
        ],
      )
      await appendActivityEvent(client, {
        eventKey: 'employee.created',
        entityType: 'employee',
        entityId: String(employeeId),
        ...actor,
        subjectEmployeeId: employeeId,
        summary: `Created employee ${fullName}`,
        source: 'api',
      })
      const hiredGrade = String(input.jobGrade ?? '').trim()
      if (hiredGrade) {
        await recordGradeChange(client, {
          employeeId,
          jobGrade: hiredGrade,
          previousGrade: '',
          effectiveOn: startDate,
          changeKind: 'hire',
        })
      }
    } else {
      await client.query(
        `UPDATE platform.employees SET
           employee_id = $2,
           email = $3,
           name = $4,
           joining_date = $5,
           status = $6,
           role = $7,
           role_id = $8,
           job_title = $9,
           job_grade = $10,
           site = $11,
           avatar_url = COALESCE($12, avatar_url),
           department_id = $13,
           team_id = $14,
           division_id = $15,
           reports_to_employee_id = $16,
           department_head_employee_id = $17,
           updated_at = now()
         WHERE employee_id = $1`,
        [
          replaceId,
          employeeId,
          email,
          fullName,
          startDate,
          status,
          roleAssignment.roleName,
          roleAssignment.roleId,
          String(input.jobTitle ?? '').trim(),
          String(input.jobGrade ?? '').trim(),
          String(input.site ?? '').trim(),
          avatarUrl,
          departmentId,
          teamId,
          divisionId,
          reportsToId,
          departmentHeadId,
        ],
      )

      if (replaceId !== employeeId) {
        await client.query(
          `UPDATE platform.employees
           SET reports_to_employee_id = $2
           WHERE reports_to_employee_id = $1`,
          [replaceId, employeeId],
        )
        await client.query(
          `UPDATE platform.employees
           SET department_head_employee_id = $2
           WHERE department_head_employee_id = $1`,
          [replaceId, employeeId],
        )
        await client.query(
          `UPDATE platform.departments
           SET head_employee_id = $2
           WHERE head_employee_id = $1`,
          [replaceId, employeeId],
        )
        await client.query(
          `UPDATE platform.departments
           SET hrbp_employee_id = $2
           WHERE hrbp_employee_id = $1`,
          [replaceId, employeeId],
        )
        await client.query(
          `UPDATE platform.teams
           SET owner_employee_id = $2
           WHERE owner_employee_id = $1`,
          [replaceId, employeeId],
        )
        await appendActivityEvent(client, {
          eventKey: 'employee.identifier_changed',
          entityType: 'employee',
          entityId: String(employeeId),
          ...actor,
          subjectEmployeeId: employeeId,
          summary: `Changed employee ID from ${replaceId} to ${employeeId}`,
          changes: [
            { field: 'employeeId', from: replaceId, to: employeeId },
          ],
          source: 'api',
        })
      }

      const changes = []
      if (previous) {
        if (previous.status !== status) {
          changes.push({ field: 'status', from: previous.status, to: status })
          await appendActivityEvent(client, {
            eventKey:
              status === 'active'
                ? 'employee.activated'
                : 'employee.deactivated',
            entityType: 'employee',
            entityId: String(employeeId),
            ...actor,
            subjectEmployeeId: employeeId,
            summary:
              status === 'active'
                ? `Activated employee ${fullName}`
                : `Deactivated employee ${fullName}`,
            changes: [{ field: 'status', from: previous.status, to: status }],
            source: 'api',
          })
        }
        if (Number(previous.manager_id ?? 0) !== Number(reportsToId ?? 0)) {
          await appendActivityEvent(client, {
            eventKey: 'employee.manager_changed',
            entityType: 'employee',
            entityId: String(employeeId),
            ...actor,
            subjectEmployeeId: employeeId,
            summary: `Changed manager for ${fullName}`,
            changes: [
              {
                field: 'managerId',
                from: previous.manager_id ?? null,
                to: reportsToId,
              },
            ],
            source: 'api',
          })
        }
        if (
          String(previous.department_name ?? '') !==
          String(input.department ?? '').trim()
        ) {
          await appendActivityEvent(client, {
            eventKey: 'employee.department_changed',
            entityType: 'employee',
            entityId: String(employeeId),
            ...actor,
            subjectEmployeeId: employeeId,
            summary: `Changed department for ${fullName}`,
            changes: [
              {
                field: 'department',
                from: previous.department_name ?? null,
                to: String(input.department ?? '').trim() || null,
              },
            ],
            source: 'api',
          })
        }
        if (
          String(previous.team_name ?? '') !== String(input.team ?? '').trim()
        ) {
          await appendActivityEvent(client, {
            eventKey: 'employee.team_changed',
            entityType: 'employee',
            entityId: String(employeeId),
            ...actor,
            subjectEmployeeId: employeeId,
            summary: `Changed team for ${fullName}`,
            changes: [
              {
                field: 'team',
                from: previous.team_name ?? null,
                to: String(input.team ?? '').trim() || null,
              },
            ],
            source: 'api',
          })
        }
        if (
          String(previous.division_name ?? '') !==
          String(input.division ?? '').trim()
        ) {
          await appendActivityEvent(client, {
            eventKey: 'employee.division_changed',
            entityType: 'employee',
            entityId: String(employeeId),
            ...actor,
            subjectEmployeeId: employeeId,
            summary: `Changed division for ${fullName}`,
            changes: [
              {
                field: 'division',
                from: previous.division_name ?? null,
                to: String(input.division ?? '').trim() || null,
              },
            ],
            source: 'api',
          })
        }
        if (previous.name !== fullName || previous.email !== email) {
          changes.push(
            ...(previous.name !== fullName
              ? [{ field: 'name', from: previous.name, to: fullName }]
              : []),
            ...(previous.email !== email
              ? [{ field: 'email', from: previous.email, to: email }]
              : []),
          )
        }
        const nextRole = roleAssignment.roleName
        const nextJobTitle = String(input.jobTitle ?? '').trim()
        const nextJobGrade = String(input.jobGrade ?? '').trim()
        const nextSite = String(input.site ?? '').trim()
        const nextStart = dateOnly(startDate)
        const previousStart = dateOnly(previous.joining_date)
        const jobChanges = []
        if (String(previous.role ?? '') !== nextRole) {
          jobChanges.push({
            field: 'role',
            from: previous.role ?? null,
            to: nextRole || null,
          })
        }
        if (String(previous.job_title ?? '') !== nextJobTitle) {
          jobChanges.push({
            field: 'jobTitle',
            from: previous.job_title ?? null,
            to: nextJobTitle || null,
          })
        }
        if (String(previous.job_grade ?? '').trim() !== nextJobGrade) {
          jobChanges.push({
            field: 'jobGrade',
            from: previous.job_grade ?? null,
            to: nextJobGrade || null,
          })
          if (nextJobGrade) {
            await recordGradeChange(client, {
              employeeId,
              jobGrade: nextJobGrade,
              previousGrade: previous.job_grade,
              effectiveOn: String(previous.job_grade ?? '').trim()
                ? undefined
                : startDate,
              changeKind: input.gradeChangeKind,
            })
          }
        }
        if (String(previous.site ?? '') !== nextSite) {
          jobChanges.push({
            field: 'site',
            from: previous.site ?? null,
            to: nextSite || null,
          })
        }
        if (previousStart !== nextStart) {
          jobChanges.push({
            field: 'joiningDate',
            from: previousStart || null,
            to: nextStart || null,
          })
        }
        if (jobChanges.length > 0) {
          await appendActivityEvent(client, {
            eventKey: 'employee.job_details_updated',
            entityType: 'employee',
            entityId: String(employeeId),
            ...actor,
            subjectEmployeeId: employeeId,
            summary: `Updated job details for ${fullName}`,
            changes: jobChanges,
            source: 'api',
          })
        }
      }
      if (changes.length > 0) {
        await appendActivityEvent(client, {
          eventKey: 'employee.profile_updated',
          entityType: 'employee',
          entityId: String(employeeId),
          ...actor,
          subjectEmployeeId: employeeId,
          summary: `Updated profile for ${fullName}`,
          changes,
          source: 'api',
        })
      }
    }

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }

  return getPlatformEmployee(employeeId)
}

function mapDepartmentRow(row) {
  return {
    id: row.id,
    name: row.name,
    headEmployeeId: row.head_employee_id,
    headName: row.head_name,
    headEmail: row.head_email,
    hrbpEmployeeId: row.hrbp_employee_id,
    hrbpName: row.hrbp_name,
    hrbpEmail: row.hrbp_email,
    headcount: row.headcount ?? 0,
    teamCount: row.team_count ?? 0,
  }
}

const DEPARTMENT_SELECT = `
  SELECT
    d.id,
    d.name,
    d.head_employee_id,
    d.hrbp_employee_id,
    head.name AS head_name,
    head.email AS head_email,
    hrbp.name AS hrbp_name,
    hrbp.email AS hrbp_email,
    (SELECT count(*)::int FROM platform.employees e
      WHERE e.department_id = d.id AND e.status = 'active') AS headcount,
    (SELECT count(*)::int FROM platform.teams t
      WHERE t.department_id = d.id) AS team_count
  FROM platform.departments d
  LEFT JOIN platform.employees head ON head.employee_id = d.head_employee_id
  LEFT JOIN platform.employees hrbp ON hrbp.employee_id = d.hrbp_employee_id
`

export async function listPlatformDepartments() {
  const { rows } = await getPool().query(
    `${DEPARTMENT_SELECT} ORDER BY d.name ASC`,
  )
  return rows.map(mapDepartmentRow)
}

export async function getPlatformDepartment(departmentId) {
  const id = Number(departmentId)
  if (!Number.isInteger(id) || id <= 0) return null
  const { rows } = await getPool().query(
    `${DEPARTMENT_SELECT} WHERE d.id = $1 LIMIT 1`,
    [id],
  )
  return rows[0] ? mapDepartmentRow(rows[0]) : null
}

export async function createPlatformDepartment(input = {}, actorInput = {}) {
  const name = String(input.name ?? '').trim()
  if (!name) {
    const err = new Error('Department name is required')
    err.statusCode = 400
    throw err
  }

  const headEmployeeId =
    input.headEmployeeId != null && input.headEmployeeId !== ''
      ? Number(input.headEmployeeId)
      : null
  const hrbpEmployeeId =
    input.hrbpEmployeeId != null && input.hrbpEmployeeId !== ''
      ? Number(input.hrbpEmployeeId)
      : null
  const actor = activityActor(actorInput)

  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const existing = await client.query(
      `SELECT id FROM platform.departments WHERE lower(name) = lower($1) LIMIT 1`,
      [name],
    )
    if (existing.rows[0]) {
      const err = new Error('A department with this name already exists')
      err.statusCode = 409
      throw err
    }

    for (const [label, employeeId] of [
      ['Department owner', headEmployeeId],
      ['HRBP', hrbpEmployeeId],
    ]) {
      if (employeeId == null) continue
      if (!Number.isInteger(employeeId) || employeeId <= 0) {
        const err = new Error(`Invalid ${label}`)
        err.statusCode = 400
        throw err
      }
      const person = await client.query(
        `SELECT employee_id FROM platform.employees WHERE employee_id = $1 LIMIT 1`,
        [employeeId],
      )
      if (!person.rows[0]) {
        const err = new Error(`${label} was not found in the directory`)
        err.statusCode = 400
        throw err
      }
    }

    const inserted = await client.query(
      `INSERT INTO platform.departments (name, head_employee_id, hrbp_employee_id)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [name, headEmployeeId, hrbpEmployeeId],
    )
    const departmentId = inserted.rows[0].id
    await appendActivityEvent(client, {
      eventKey: 'department.created',
      entityType: 'department',
      entityId: String(departmentId),
      ...actor,
      summary: `Created department ${name}`,
      metadata: { headEmployeeId, hrbpEmployeeId },
      source: 'api',
    })
    if (headEmployeeId != null) {
      await appendActivityEvent(client, {
        eventKey: 'department.owner_assigned',
        entityType: 'department',
        entityId: String(departmentId),
        ...actor,
        subjectEmployeeId: headEmployeeId,
        summary: `Assigned department owner for ${name}`,
        source: 'api',
      })
    }
    if (hrbpEmployeeId != null) {
      await appendActivityEvent(client, {
        eventKey: 'department.hrbp_assigned',
        entityType: 'department',
        entityId: String(departmentId),
        ...actor,
        subjectEmployeeId: hrbpEmployeeId,
        summary: `Assigned HRBP for ${name}`,
        source: 'api',
      })
    }
    await client.query('COMMIT')
    return getPlatformDepartment(departmentId)
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch {
      /* ignore */
    }
    throw err
  } finally {
    client.release()
  }
}

export async function listPlatformDivisions() {
  const { rows } = await getPool().query(
    `SELECT
       div.id,
       div.name,
       (SELECT count(*)::int FROM platform.employees e
         WHERE e.division_id = div.id AND e.status = 'active') AS headcount
     FROM platform.divisions div
     ORDER BY div.name ASC`,
  )
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    headcount: row.headcount,
  }))
}

export async function listPlatformTeams(departmentId) {
  const params = []
  let where = ''
  if (departmentId != null && departmentId !== '') {
    params.push(Number(departmentId))
    where = `WHERE t.department_id = $1`
  }
  const { rows } = await getPool().query(
    `SELECT
       t.id,
       t.name,
       t.department_id,
       d.name AS department_name,
       t.owner_employee_id,
       own.name AS owner_name,
       own.email AS owner_email,
       t.revolut_id,
       t.revolut_department_id,
       t.revolut_owner_id,
       t.status,
       t.team_function,
       t.mission,
       t.revolut_updated_at,
       (SELECT count(*)::int FROM platform.employees e
         WHERE e.team_id = t.id AND e.status = 'active') AS headcount
    FROM platform.teams t
    JOIN platform.departments d ON d.id = t.department_id
    LEFT JOIN platform.employees own ON own.employee_id = t.owner_employee_id
    ${where}
    ORDER BY d.name ASC, t.name ASC`,
    params,
  )
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    departmentId: integerId(row.department_id) ?? row.department_id,
    departmentName: row.department_name,
    ownerEmployeeId: row.owner_employee_id,
    ownerName: row.owner_name,
    ownerEmail: row.owner_email,
    revolutId: integerId(row.revolut_id),
    revolutDepartmentId: integerId(row.revolut_department_id),
    revolutOwnerId: integerId(row.revolut_owner_id),
    status: row.status,
    teamFunction: row.team_function,
    mission: row.mission,
    revolutUpdatedAt: row.revolut_updated_at
      ? isoTimestamp(row.revolut_updated_at)
      : undefined,
    headcount: row.headcount,
  }))
}

export async function getEmployeeAccess(employeeId) {
  if (!employeeId) return { profileKey: null, permissions: [] }
  try {
    const { rows } = await getPool().query(
      `SELECT
         eap.profile_key,
         COALESCE(
           array_agg(app.permission_key)
             FILTER (WHERE app.permission_key IS NOT NULL),
           ARRAY[]::text[]
         ) AS permissions
       FROM platform.employee_access_profiles eap
       LEFT JOIN platform.access_profile_permissions app
         ON app.profile_key = eap.profile_key
       WHERE eap.employee_id = $1
       GROUP BY eap.profile_key`,
      [employeeId],
    )
    return rows[0]
      ? {
          profileKey: rows[0].profile_key,
          permissions: rows[0].permissions,
        }
      : { profileKey: null, permissions: [] }
  } catch (error) {
    // Keep sign-in working while the additive access-control migration is pending.
    if (error?.code === '42P01') {
      return { profileKey: null, permissions: [] }
    }
    throw error
  }
}

export async function listAccessControl() {
  const [profilesResult, permissionsResult, assignmentsResult] =
    await Promise.all([
      getPool().query(
        `SELECT profile_key, role_name, label, description
         FROM platform.access_profiles
         ORDER BY profile_key ASC`,
      ),
      getPool().query(
        `SELECT profile_key, permission_key
         FROM platform.access_profile_permissions
         ORDER BY profile_key, permission_key`,
      ),
      getPool().query(
        `SELECT employee_id, profile_key, assigned_by_employee_id, assigned_at
         FROM platform.employee_access_profiles
         ORDER BY employee_id ASC`,
      ),
    ])

  const permissionsByProfile = new Map()
  for (const row of permissionsResult.rows) {
    const permissions = permissionsByProfile.get(row.profile_key) ?? []
    permissions.push(row.permission_key)
    permissionsByProfile.set(row.profile_key, permissions)
  }

  return {
    profiles: profilesResult.rows.map((row) => ({
      key: row.profile_key,
      roleName: row.role_name,
      label: row.label,
      description: row.description,
      permissions: permissionsByProfile.get(row.profile_key) ?? [],
    })),
    assignments: assignmentsResult.rows.map((row) => ({
      employeeId: row.employee_id,
      profileKey: row.profile_key,
      assignedByEmployeeId: row.assigned_by_employee_id ?? undefined,
      assignedAt: isoTimestamp(row.assigned_at),
    })),
  }
}

export async function setEmployeeAccess(
  employeeId,
  profileKey,
  assignedByEmployeeId,
  actorInput = {},
) {
  const actor = activityActor({
    employeeId: assignedByEmployeeId,
    ...actorInput,
  })
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const previous = (
      await client.query(
        `SELECT profile_key FROM platform.employee_access_profiles
         WHERE employee_id = $1`,
        [employeeId],
      )
    ).rows[0]

    if (profileKey !== 'admin_write') {
      const { rows } = await client.query(
        `SELECT
           eap.profile_key,
           (SELECT count(*)::int
            FROM platform.employee_access_profiles
            WHERE profile_key = 'admin_write') AS write_admin_count
         FROM platform.employee_access_profiles eap
         WHERE eap.employee_id = $1`,
        [employeeId],
      )
      if (
        rows[0]?.profile_key === 'admin_write' &&
        rows[0].write_admin_count <= 1
      ) {
        const error = new Error('At least one read + write admin is required.')
        error.statusCode = 409
        throw error
      }
    }

    let assignment = null
    if (profileKey == null) {
      await client.query(
        `DELETE FROM platform.employee_access_profiles WHERE employee_id = $1`,
        [employeeId],
      )
      await appendActivityEvent(client, {
        eventKey: 'access.profile_removed',
        entityType: 'access',
        entityId: String(employeeId),
        ...actor,
        subjectEmployeeId: employeeId,
        summary: 'Removed access profile',
        changes: [
          {
            field: 'profileKey',
            from: previous?.profile_key ?? null,
            to: null,
          },
        ],
        source: 'api',
      })
    } else {
      const { rows } = await client.query(
        `INSERT INTO platform.employee_access_profiles (
           employee_id,
           profile_key,
           assigned_by_employee_id
         ) VALUES ($1, $2, $3)
         ON CONFLICT (employee_id) DO UPDATE SET
           profile_key = EXCLUDED.profile_key,
           assigned_by_employee_id = EXCLUDED.assigned_by_employee_id,
           assigned_at = now()
         RETURNING employee_id, profile_key, assigned_by_employee_id, assigned_at`,
        [employeeId, profileKey, assignedByEmployeeId ?? null],
      )
      const row = rows[0]
      assignment = {
        employeeId: row.employee_id,
        profileKey: row.profile_key,
        assignedByEmployeeId: row.assigned_by_employee_id ?? undefined,
        assignedAt: isoTimestamp(row.assigned_at),
      }
      await appendActivityEvent(client, {
        eventKey: previous
          ? 'access.profile_changed'
          : 'access.profile_assigned',
        entityType: 'access',
        entityId: String(employeeId),
        ...actor,
        subjectEmployeeId: employeeId,
        summary: previous
          ? `Changed access profile to ${profileKey}`
          : `Assigned access profile ${profileKey}`,
        changes: [
          {
            field: 'profileKey',
            from: previous?.profile_key ?? null,
            to: profileKey,
          },
        ],
        source: 'api',
      })
    }
    await client.query('COMMIT')
    return assignment
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
