/**
 * Stakeholder demo seed. Wipes cycle/review/goal/activity rows, keeps employees.
 * Run inside the platform API container: node platform/scripts/seedStakeholderDemo.mjs
 */
import { config as loadEnv } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPool } from '../../db.mjs'
import { createReviewCycle } from '../reviewCycles/store.mjs'
import { createCycleGroup } from '../reviewCycles/groups.mjs'

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
loadEnv({ path: path.join(serverRoot, '.env') })

const ACTOR = {
  employeeId: 1,
  email: 'aj@nextventures.io',
  name: 'Syed Abdullah Jayed',
}

const LEADERSHIP_GRADES = new Set([
  'M5',
  'M6',
  'M7',
  'M8',
  'M9',
  'M10',
  'M11',
])

const LEADERSHIP_POLICY = {
  selfReview: { ratePillars: true, rateOverall: true },
  managerReview: {
    narrative: 'overall',
    gapCommentTiers: 2,
    gradeGoals: true,
    gradeOverall: true,
    gradeSuggestion: 'weighted_suggest',
    latePolicy: 'escalate',
    escalationRoles: ['hod', 'slt', 'ptr'],
  },
  calibration: { editors: 'hod_and_hrbp', distribution: 'guidance' },
  eligibility: {
    excludeNoticePeriod: true,
    excludeProbation: false,
    excludePip: false,
  },
  scorecard: {
    pillars: [
      {
        id: 'goals',
        kind: 'goals',
        label: 'Goals',
        enabled: true,
        weight: 50,
        pullLinkedQuarters: true,
      },
      {
        id: 'skills',
        kind: 'skills',
        label: 'Skills',
        enabled: false,
        weight: 0,
        pullLinkedQuarters: false,
      },
      {
        id: 'values',
        kind: 'values',
        label: 'Core Values',
        enabled: false,
        weight: 0,
        pullLinkedQuarters: false,
      },
      {
        id: 'leadership',
        kind: 'leadership',
        label: 'Leadership Capabilities',
        enabled: true,
        weight: 50,
        pullLinkedQuarters: false,
      },
    ],
    questions: [
      {
        id: 'lead-delivered',
        prompt: 'What did this person deliver through their team this period?',
        enabled: true,
        required: true,
        kind: 'open_ended',
        visibility: ['employee', 'manager', 'calibrators'],
        outputVisibility: ['employee', 'manager'],
      },
      {
        id: 'lead-capability',
        prompt: 'How did they demonstrate leadership capability?',
        enabled: true,
        required: true,
        kind: 'open_ended',
        visibility: ['employee', 'manager', 'calibrators'],
        outputVisibility: ['employee', 'manager'],
      },
      {
        id: 'lead-retain',
        prompt: 'Will we do what it takes to retain this person?',
        enabled: true,
        required: false,
        kind: 'open_ended',
        visibility: ['calibrators'],
        outputVisibility: ['manager'],
      },
    ],
    bands: [
      { id: 'exceptional', label: 'Exceptional', sort: 1 },
      { id: 'exceeding', label: 'Exceeding', sort: 2 },
      { id: 'performing', label: 'Performing', sort: 3 },
      { id: 'developing', label: 'Developing', sort: 4 },
      { id: 'unsatisfactory', label: 'Unsatisfactory', sort: 5 },
    ],
    extraGradeFields: [],
  },
}

function hash(id, salt = 0) {
  return Math.abs((Number(id) * 1103515245 + salt * 12345) % 2147483647)
}

function pick(id, salt, list) {
  return list[hash(id, salt) % list.length]
}

function isoDate(date, hour = 10) {
  return `${date}T${String(hour).padStart(2, '0')}:15:00.000Z`
}

async function wipeTransactional(pool) {
  const client = await pool.connect()
  const tables = [
    'review_answers',
    'review_appeals',
    'review_calibration_events',
    'review_pillar_scores',
    'calibration_sitting_employees',
    'calibration_sittings',
    'review_packets',
    'review_cycle_sources',
    'review_cycle_grade_exclusions',
    'review_cycle_group_members',
    'review_cycle_groups',
    'goal_comments',
    'goal_measurements',
    'goal_progress_entries',
    'goal_ratings',
    'goals',
    'goal_submissions',
    'notification_deliveries',
    'notifications',
    'manager_delegations',
    'activity_events',
    'review_cycles',
  ]
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'platform'
         AND table_name = ANY($1::text[])`,
      [tables],
    )
    const present = new Set(rows.map((row) => row.table_name))
    if (present.has('activity_events')) {
      await client.query('ALTER TABLE platform.activity_events DISABLE TRIGGER USER')
    }
    const existing = tables.filter((name) => present.has(name))
    if (existing.length > 0) {
      await client.query(
        `TRUNCATE TABLE ${existing.map((name) => `platform.${name}`).join(', ')} RESTART IDENTITY`,
      )
    }
    if (present.has('activity_events')) {
      await client.query('ALTER TABLE platform.activity_events ENABLE TRIGGER USER')
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

function partitionEmployees(employees) {
  const leadership = []
  const peopleCulture = []
  const newJoiners = []
  const company = []
  for (const employee of employees) {
    const joined =
      employee.joining_date instanceof Date
        ? employee.joining_date.toISOString().slice(0, 10)
        : String(employee.joining_date).slice(0, 10)
    if (LEADERSHIP_GRADES.has(employee.job_grade)) {
      leadership.push(employee)
      continue
    }
    if (employee.department_name === 'People & Culture') {
      peopleCulture.push(employee)
      continue
    }
    if (joined >= '2026-04-01') {
      newJoiners.push(employee)
      continue
    }
    company.push(employee)
  }
  return { leadership, peopleCulture, newJoiners, company }
}

function enableStages(stagesConfig, stageIds) {
  const wanted = new Set(stageIds)
  const next = structuredClone(stagesConfig)
  next.reviewStages = (next.reviewStages ?? []).map((stage) =>
    wanted.has(stage.id) ? { ...stage, enabled: true } : stage,
  )
  const calibrationOn = next.reviewStages.some(
    (stage) =>
      (stage.id === 'calibration_hod_hrbp' || stage.id === 'calibration_slt') &&
      stage.enabled,
  )
  next.calibration = { ...next.calibration, enabled: calibrationOn }
  return next
}

function enableStage(stagesConfig, stageId) {
  return enableStages(stagesConfig, [stageId])
}

const Q3_COMPANY_JOURNEY = [
  ['draft', 'not_started'],
  ['draft', 'not_started'],
  ['submitted', 'not_started'],
  ['submitted', 'not_started'],
  ['sent_back', 'not_started'],
  ['approved', 'manager_in_progress'],
  ['approved', 'manager_in_progress'],
  ['approved', 'manager_submitted'],
  ['approved', 'manager_submitted'],
  ['approved', 'in_calibration'],
  ['approved', 'in_calibration'],
  ['approved', 'in_calibration'],
  ['approved', 'calibrated'],
  ['approved', 'calibrated'],
  ['approved', 'released_to_managers'],
  ['approved', 'released_to_employees'],
  ['approved', 'released_to_employees'],
  ['approved', 'appealed'],
  ['not_eligible', 'not_started'],
  ['approved', 'in_calibration'],
]

const Q3_LEADERSHIP_JOURNEY = [
  ['draft', 'not_started'],
  ['submitted', 'not_started'],
  ['sent_back', 'not_started'],
  ['approved', 'self_in_progress'],
  ['approved', 'self_submitted'],
  ['approved', 'manager_in_progress'],
  ['approved', 'manager_submitted'],
  ['approved', 'in_calibration'],
  ['approved', 'calibrated'],
  ['approved', 'released_to_employees'],
]

function joinedOn(employee) {
  const value = employee.joining_date
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value ?? '').slice(0, 10)
}

/** Q3 demo walk: goal status and review packet stay on the same step. */
function q3Journey(employee) {
  if (employee.job_grade === 'Intern') {
    return { goal: 'not_eligible', packet: 'not_started' }
  }
  const roll = hash(employee.employee_id, 303) % 20
  if (joinedOn(employee) >= '2026-04-01' && roll === 0) {
    return { goal: 'incomplete', packet: 'not_started' }
  }
  const table = LEADERSHIP_GRADES.has(employee.job_grade)
    ? Q3_LEADERSHIP_JOURNEY
    : Q3_COMPANY_JOURNEY
  const [goal, packet] = table[roll % table.length]
  return { goal, packet }
}

function goalPack(employee, cycleId, progress) {
  const variant = hash(employee.employee_id, cycleId.length) % 6
  const dept = employee.department_name || 'the team'
  const name = employee.name.split(' ')[0]
  const scale = progress === 'done' ? 1 : progress === 'mid' ? 0.55 : 0.15
  const metric = (suffix, title, target, extras = {}) => {
    const current = Math.round(target * scale + (hash(employee.employee_id, suffix.length) % 8) - 3)
    const start = extras.start ?? 0
    const clamped = Math.max(start, current)
    return {
      id: `m-${cycleId}-${employee.employee_id}-${suffix}`,
      kind: 'metric',
      title,
      weight: extras.weight ?? 100,
      unit: extras.unit ?? 'number',
      direction: extras.direction ?? 'greater_than',
      startValue: start,
      targetValue: target,
      currentValue: clamped,
      proofUrl: extras.proof
        ? `https://docs.google.com/document/d/demo-${cycleId}-${employee.employee_id}`
        : undefined,
      progressLog:
        clamped > start
          ? [
              {
                id: `p-${cycleId}-${employee.employee_id}-${suffix}-1`,
                recordedAt: isoDate(
                  progress === 'done' ? '2026-02-20' : '2026-08-08',
                  9,
                ),
                authorName: employee.name,
                from: start,
                to: Math.round((start + clamped) / 2),
              },
              {
                id: `p-${cycleId}-${employee.employee_id}-${suffix}-2`,
                recordedAt: isoDate(
                  progress === 'done' ? '2026-03-18' : '2026-08-21',
                  14,
                ),
                authorName: employee.name,
                from: Math.round((start + clamped) / 2),
                to: clamped,
              },
            ]
          : [],
    }
  }
  const milestone = (suffix, title, complete, group, measureTitle) => ({
    id: `m-${cycleId}-${employee.employee_id}-${suffix}`,
    kind: 'milestone',
    title,
    weight: 0,
    complete: progress === 'done' ? true : complete,
    measureGroupId: `mg-${cycleId}-${employee.employee_id}-${group}`,
    measureTitle,
    listId: `ml-${cycleId}-${employee.employee_id}-${group}`,
    listTitle: measureTitle,
    proofUrl: complete
      ? `https://clickup.com/t/${cycleId}-${employee.employee_id}`
      : undefined,
  })

  const packs = [
    [
      {
        description: `Raise delivery quality across ${dept}`,
        details: `${name} closes defects faster and keeps reopen rate down.`,
        weight: 40,
        measurements: [
          metric('defects', 'Critical defects closed', 80, { weight: 60 }),
          milestone('triage', 'Triage incoming defects within one business day', scale > 0.4, 'quality', 'Quality process'),
          milestone('reopen', 'Keep reopen rate under the agreed quality bar', scale > 0.7, 'quality', 'Quality process'),
        ],
      },
      {
        description: 'Ship the committed quarter roadmap',
        details: 'Hit agreed milestones without slipping the public date.',
        weight: 35,
        measurements: [metric('milestones', 'Roadmap milestones shipped', 10)],
      },
      {
        description: 'Keep stakeholders current with a weekly operating rhythm',
        details: 'Written updates and a measurable feedback score.',
        weight: 25,
        measurements: [
          metric('nps', 'Stakeholder feedback score', 10, { proof: true }),
        ],
      },
    ],
    [
      {
        description: 'Reduce cycle time on the highest-volume request path',
        details: 'Cut median handling time without dropping quality.',
        weight: 60,
        measurements: [
          metric('cycle', 'Median cycle time (hours)', 12, {
            direction: 'less_than',
            start: 20,
            weight: 100,
          }),
        ],
      },
      {
        description: 'Document the operating playbook for the next hire',
        details: 'A usable playbook, not a slide deck.',
        weight: 40,
        measurements: [
          milestone('draft', 'Draft playbook reviewed by manager', scale > 0.3, 'playbook', 'Playbook'),
          milestone('publish', 'Publish v1 to the team wiki', scale > 0.8, 'playbook', 'Playbook'),
        ],
      },
    ],
    [
      {
        description: 'Grow the team’s output without growing headcount',
        details: 'Automation or process change that removes a weekly manual step.',
        weight: 30,
        measurements: [metric('hours', 'Hours saved per week', 8)],
      },
      {
        description: 'Coach two reports to independently own a workstream',
        details: 'Each report runs the cadence without the manager in the room.',
        weight: 35,
        measurements: [
          milestone('coach-1', 'Report A owns weekly ops review', scale > 0.5, 'coach', 'Coaching'),
          milestone('coach-2', 'Report B owns escalation path', scale > 0.5, 'coach', 'Coaching'),
        ],
      },
      {
        description: 'Hold a clean hiring bar for the open IC role',
        details: 'Scorecards filled, no “gut feel” offers.',
        weight: 20,
        measurements: [metric('hires', 'Scorecard-complete interviews', 12)],
      },
      {
        description: 'Unblock the cross-team dependency with Product',
        details: 'Written decision and a dated follow-through.',
        weight: 15,
        measurements: [
          milestone('decision', 'Decision memo agreed', scale > 0.4, 'dep', 'Dependency'),
        ],
      },
    ],
    [
      {
        description: 'Build a reliable weekly metric pack for the department',
        details: 'Same numbers every Monday, no spreadsheet archaeology.',
        weight: 50,
        measurements: [
          metric('packs', 'Weekly packs published on time', 12, { weight: 70 }),
          milestone('source', 'Single source of truth agreed', scale > 0.5, 'metrics', 'Metric pack'),
          milestone('review', 'HOD review live for four weeks', scale > 0.7, 'metrics', 'Metric pack'),
        ],
      },
      {
        description: 'Close the audit findings assigned this cycle',
        details: 'No open P1 findings at period end.',
        weight: 50,
        measurements: [metric('findings', 'P1 findings closed', 6)],
      },
    ],
    [
      {
        description: 'Define the role outcomes for this cycle',
        details: 'Still being scoped - this is an incomplete / early draft.',
        weight: 100,
        measurements: [
          metric('tbd', 'Outcomes defined', 3, { weight: 50 }),
        ],
      },
    ],
    [
      {
        description: 'Protect client trust on the top three complaint themes',
        details: 'Theme volume down, first-response time held.',
        weight: 25,
        measurements: [metric('complaints', 'Repeat complaint themes closed', 3)],
      },
      {
        description: 'Lift first-contact resolution on the live queue',
        details: 'FCR up without inflating handle time.',
        weight: 20,
        measurements: [metric('fcr', 'First-contact resolution %', 82, { unit: 'percent' })],
      },
      {
        description: 'Run a clean month-end close with Finance',
        details: 'No late reconciling items owned by this team.',
        weight: 20,
        measurements: [milestone('close', 'Month-end close signed off', scale > 0.6, 'close', 'Close')],
      },
      {
        description: 'Share one reusable improvement with a sibling team',
        details: 'A borrowed play, not a presentation.',
        weight: 15,
        measurements: [
          milestone('share', 'Sibling team adopted the change', scale > 0.5, 'share', 'Share'),
        ],
      },
      {
        description: 'Keep personal development visible',
        details: 'One skill stretch with evidence, not a course certificate dump.',
        weight: 20,
        measurements: [
          metric('skill', 'Observed skill demonstrations', 4, { proof: true }),
        ],
      },
    ],
  ]

  const goals = packs[variant].map((goal, index) => ({
    id: `goal-${cycleId}-${employee.employee_id}-${index}`,
    ownerId: String(employee.employee_id),
    ...goal,
    measurements: (goal.measurements ?? []).map((measurement, mIndex) => ({
      ...measurement,
      weight:
        measurement.kind === 'metric' && goal.measurements.filter((item) => item.kind === 'metric').length === 1
          ? 100
          : measurement.weight,
      id: measurement.id ?? `m-${cycleId}-${employee.employee_id}-${index}-${mIndex}`,
    })),
  }))

  if (variant === 4 && progress !== 'done') {
    goals[0].weight = 40
  }
  return goals
}

const CLOSED_CYCLES = new Set([
  'h1-2025',
  'h2-2025',
  'q1-2026',
  'q2-2026',
  'q3-2026',
  'q4-2026',
])

const PUBLISHED_REVIEWS = new Set([
  'h1-2025',
  'h2-2025',
  'q1-2026',
  'q2-2026',
  'q3-2026',
])

const CYCLE_MOMENTS = {
  'h1-2025': {
    submitted: '2025-03-10',
    approved: '2025-03-14',
    viewed: '2025-06-10',
    calibration: '2025-06-18',
    manager: '2025-06-20',
    employee: '2025-06-24',
  },
  'h2-2025': {
    submitted: '2025-09-10',
    approved: '2025-09-14',
    viewed: '2025-12-08',
    calibration: '2025-12-16',
    manager: '2025-12-18',
    employee: '2025-12-22',
  },
  'q1-2026': {
    submitted: '2026-01-20',
    approved: '2026-01-24',
    viewed: '2026-03-16',
    manager: '2026-03-24',
    employee: '2026-03-27',
  },
  'q2-2026': {
    submitted: '2026-04-16',
    approved: '2026-04-20',
    viewed: '2026-06-16',
    manager: '2026-06-24',
    employee: '2026-06-26',
  },
  'q3-2026': {
    submitted: '2026-07-16',
    approved: '2026-07-20',
    viewed: '2026-09-08',
    manager: '2026-09-16',
    employee: '2026-09-18',
  },
  'q4-2026': {
    submitted: '2026-10-14',
    approved: '2026-10-18',
    viewed: '2026-12-10',
    manager: '2026-12-18',
    employee: '2026-12-20',
  },
  'annual-2026': {
    submitted: '2027-01-08',
    approved: '2027-01-12',
    viewed: '2027-01-06',
    calibration: '2027-01-20',
    manager: '2027-01-18',
    employee: '2027-02-02',
  },
}

function isClosedCycle(cycleId) {
  return CLOSED_CYCLES.has(cycleId)
}

function isPublishedReview(cycleId) {
  return PUBLISHED_REVIEWS.has(cycleId)
}

function isAppraisalCycle(cycleId) {
  return cycleId === 'h1-2025' || cycleId === 'h2-2025' || cycleId === 'annual-2026'
}

function momentsOf(cycleId) {
  return CYCLE_MOMENTS[cycleId] ?? CYCLE_MOMENTS['q3-2026']
}

function submissionStatus(cycleId, employee) {
  if (employee.job_grade === 'Intern') return 'not_eligible'
  if (isClosedCycle(cycleId)) return 'approved'
  return 'draft'
}

function packetStatus(cycleId) {
  if (cycleId === 'annual-2026') return 'manager_submitted'
  if (isPublishedReview(cycleId)) return 'released_to_employees'
  return 'not_started'
}

function gradeFor(employee, salt) {
  const roll = hash(employee.employee_id, salt) % 100
  if (roll < 4) return 'exceptional'
  if (roll < 22) return 'exceeding'
  if (roll < 68) return 'performing'
  if (roll < 92) return 'developing'
  return 'unsatisfactory'
}

async function insertRows(client, sql, rows, mapFn) {
  const chunkSize = 200
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize)
    await client.query(sql, mapFn(chunk))
  }
}

function goalProgressForCycle(cycleId) {
  return isClosedCycle(cycleId) ? 'done' : 'early'
}

async function seedGoals(client, cycleId, members, employeesById) {
  const submissions = []
  const goals = []
  const measurements = []
  const progress = []
  const comments = []
  const ratings = []

  for (const member of members) {
    const employee = employeesById.get(member.employee_id)
    if (!employee) continue
    const status = submissionStatus(cycleId, employee)
    const manager = employee.reports_to_employee_id
      ? employeesById.get(employee.reports_to_employee_id)
      : null
    const empty = status === 'not_eligible'
    const goalProgress = goalProgressForCycle(cycleId)
    const clock = momentsOf(cycleId)
    const pack = empty ? [] : goalPack(employee, cycleId, goalProgress)
    submissions.push({
      cycleId,
      employeeId: employee.employee_id,
      status,
      managerNote:
        status === 'approved'
          ? pick(employee.employee_id, 1, [
              'Approved - keep the same altitude next cycle.',
              'Clear outcomes. Watch the dependency risk.',
              'Approved for performance review.',
            ])
          : null,
      sendBackReason:
        status === 'sent_back'
          ? 'Tighten the metric targets and rebalance weightage to 100%.'
          : null,
      sendBackById: status === 'sent_back' ? manager?.employee_id ?? null : null,
      sendBackByName: status === 'sent_back' ? manager?.name ?? 'Manager' : null,
      approvedById: status === 'approved' ? manager?.employee_id ?? ACTOR.employeeId : null,
      approvedByName: status === 'approved' ? manager?.name ?? ACTOR.name : null,
      submittedAt:
        status === 'draft' || status === 'not_eligible' || status === 'incomplete'
          ? null
          : isoDate(clock.submitted),
      approvedAt: status === 'approved' ? isoDate(clock.approved) : null,
    })

    pack.forEach((goal, goalIndex) => {
      goals.push({
        goalId: goal.id,
        cycleId,
        employeeId: employee.employee_id,
        ownerId: employee.employee_id,
        description: goal.description,
        details: goal.details,
        weight: goal.weight,
        position: goalIndex,
      })
      if (status === 'sent_back' && goalIndex === 0) {
        comments.push({
          commentId: `c-${goal.id}`,
          goalId: goal.id,
          authorId: manager?.employee_id ?? null,
          authorName: manager?.name ?? 'Manager',
          body: 'The target is too soft. Make the success line something a stranger could audit.',
        })
      }
      if (status === 'approved' && goalIndex === 0 && hash(employee.employee_id, 11) % 4 === 0) {
        comments.push({
          commentId: `c-${goal.id}-ok`,
          goalId: goal.id,
          authorId: manager?.employee_id ?? null,
          authorName: manager?.name ?? 'Manager',
          body: 'This is the right altitude. Keep the weekly evidence coming.',
        })
      }
      goal.measurements.forEach((measurement, measurementIndex) => {
        measurements.push({
          measurementId: measurement.id,
          goalId: goal.id,
          kind: measurement.kind,
          title: measurement.title,
          weight: measurement.weight ?? 0,
          position: measurementIndex,
          unit: measurement.unit ?? null,
          direction: measurement.direction ?? null,
          startValue: measurement.startValue ?? null,
          targetValue: measurement.targetValue ?? null,
          currentValue: measurement.currentValue ?? null,
          complete: measurement.kind === 'milestone' ? Boolean(measurement.complete) : null,
          proofUrl: measurement.proofUrl ?? null,
          listTitle: measurement.listTitle ?? null,
          listId: measurement.listId ?? null,
          measureGroupId: measurement.measureGroupId ?? null,
          measureTitle: measurement.measureTitle ?? null,
        })
        for (const entry of measurement.progressLog ?? []) {
          progress.push({
            entryId: entry.id,
            goalId: goal.id,
            measurementId: measurement.id,
            actorId: employee.employee_id,
            actorName: employee.name,
            label: measurement.title,
            from: entry.from,
            to: entry.to,
            recordedAt: entry.recordedAt,
          })
        }
      })
    })

    if (status === 'approved') {
      ratings.push({
        cycleId,
        employeeId: employee.employee_id,
        tier: 1 + (hash(employee.employee_id, 21) % 5),
        comment: pick(employee.employee_id, 3, [
          'Delivered the plan and helped the team around them.',
          'Solid quarter. One stretch still open.',
          'Strong outcome, thinner on the leading indicators.',
        ]),
        submittedBy: manager?.employee_id ?? ACTOR.employeeId,
      })
    }
  }

  await insertRows(
    client,
    `INSERT INTO platform.goal_submissions (
       cycle_id, employee_id, status, manager_note, send_back_reason,
       send_back_by_employee_id, send_back_by_name, approved_by_employee_id,
       approved_by_name, submitted_at, approved_at
     )
     SELECT * FROM unnest(
       $1::text[], $2::int[], $3::text[], $4::text[], $5::text[],
       $6::int[], $7::text[], $8::int[], $9::text[], $10::timestamptz[], $11::timestamptz[]
     )`,
    submissions,
    (chunk) => [
      chunk.map((row) => row.cycleId),
      chunk.map((row) => row.employeeId),
      chunk.map((row) => row.status),
      chunk.map((row) => row.managerNote),
      chunk.map((row) => row.sendBackReason),
      chunk.map((row) => row.sendBackById),
      chunk.map((row) => row.sendBackByName),
      chunk.map((row) => row.approvedById),
      chunk.map((row) => row.approvedByName),
      chunk.map((row) => row.submittedAt),
      chunk.map((row) => row.approvedAt),
    ],
  )

  await insertRows(
    client,
    `INSERT INTO platform.goals (
       goal_id, cycle_id, employee_id, owner_employee_id, description, details, weight, position
     )
     SELECT * FROM unnest(
       $1::text[], $2::text[], $3::int[], $4::int[], $5::text[], $6::text[], $7::numeric[], $8::int[]
     )`,
    goals,
    (chunk) => [
      chunk.map((row) => row.goalId),
      chunk.map((row) => row.cycleId),
      chunk.map((row) => row.employeeId),
      chunk.map((row) => row.ownerId),
      chunk.map((row) => row.description),
      chunk.map((row) => row.details),
      chunk.map((row) => row.weight),
      chunk.map((row) => row.position),
    ],
  )

  await insertRows(
    client,
    `INSERT INTO platform.goal_measurements (
       measurement_id, goal_id, kind, title, weight, position, unit, direction,
       start_value, target_value, current_value, complete, proof_url,
       list_title, list_id, measure_group_id, measure_title
     )
     SELECT * FROM unnest(
       $1::text[], $2::text[], $3::text[], $4::text[], $5::numeric[], $6::int[],
       $7::text[], $8::text[], $9::numeric[], $10::numeric[], $11::numeric[],
       $12::boolean[], $13::text[], $14::text[], $15::text[], $16::text[], $17::text[]
     )`,
    measurements,
    (chunk) => [
      chunk.map((row) => row.measurementId),
      chunk.map((row) => row.goalId),
      chunk.map((row) => row.kind),
      chunk.map((row) => row.title),
      chunk.map((row) => row.weight),
      chunk.map((row) => row.position),
      chunk.map((row) => row.unit),
      chunk.map((row) => row.direction),
      chunk.map((row) => row.startValue),
      chunk.map((row) => row.targetValue),
      chunk.map((row) => row.currentValue),
      chunk.map((row) => row.complete),
      chunk.map((row) => row.proofUrl),
      chunk.map((row) => row.listTitle),
      chunk.map((row) => row.listId),
      chunk.map((row) => row.measureGroupId),
      chunk.map((row) => row.measureTitle),
    ],
  )

  await insertRows(
    client,
    `INSERT INTO platform.goal_progress_entries (
       entry_id, goal_id, measurement_id, actor_employee_id, actor_name,
       measurement_label, from_value, to_value, recorded_at
     )
     SELECT * FROM unnest(
       $1::text[], $2::text[], $3::text[], $4::int[], $5::text[],
       $6::text[], $7::numeric[], $8::numeric[], $9::timestamptz[]
     )`,
    progress,
    (chunk) => [
      chunk.map((row) => row.entryId),
      chunk.map((row) => row.goalId),
      chunk.map((row) => row.measurementId),
      chunk.map((row) => row.actorId),
      chunk.map((row) => row.actorName),
      chunk.map((row) => row.label),
      chunk.map((row) => row.from),
      chunk.map((row) => row.to),
      chunk.map((row) => row.recordedAt),
    ],
  )

  await insertRows(
    client,
    `INSERT INTO platform.goal_comments (
       comment_id, goal_id, author_employee_id, author_name, body
     )
     SELECT * FROM unnest($1::text[], $2::text[], $3::int[], $4::text[], $5::text[])`,
    comments,
    (chunk) => [
      chunk.map((row) => row.commentId),
      chunk.map((row) => row.goalId),
      chunk.map((row) => row.authorId),
      chunk.map((row) => row.authorName),
      chunk.map((row) => row.body),
    ],
  )

  await insertRows(
    client,
    `INSERT INTO platform.goal_ratings (
       cycle_id, employee_id, tier, comment, submitted_by_employee_id
     )
     SELECT * FROM unnest($1::text[], $2::int[], $3::int[], $4::text[], $5::int[])`,
    ratings,
    (chunk) => [
      chunk.map((row) => row.cycleId),
      chunk.map((row) => row.employeeId),
      chunk.map((row) => row.tier),
      chunk.map((row) => row.comment),
      chunk.map((row) => row.submittedBy),
    ],
  )

  await client.query(
    `UPDATE platform.goals child
     SET cascaded_from_goal_id = parent.goal_id,
         linked_goal_label = parent.description
     FROM platform.employees employee
     JOIN platform.goals parent
       ON parent.cycle_id = $1
      AND parent.employee_id = employee.reports_to_employee_id
      AND parent.position = 0
     WHERE child.cycle_id = $1
       AND child.employee_id = employee.employee_id
       AND child.position = 0
       AND employee.reports_to_employee_id IS NOT NULL
       AND (employee.employee_id % 11) = 0`,
    [cycleId],
  )
}

function questionBodies(cycleId) {
  if (isAppraisalCycle(cycleId)) {
    return {
      self: [
        ['delivered', 'Shipped the committed plan and unblocked two dependent teams.'],
        ['values', 'Held the quality bar in public, including when it slowed a launch.'],
        ['improve', 'Need a tighter weekly operating cadence with skip-levels.'],
        ['support', 'More decision rights on hiring would remove a recurring stall.'],
      ],
      manager: [
        ['delivered', 'Reliable owner. The team’s output is visibly better than last period.'],
        ['values', 'Models the standard. Does not hide bad news.'],
        ['improve', 'Delegate the status pack; stay on the two or three real decisions.'],
        ['retain', 'Yes - this is someone we should fight to keep.'],
      ],
    }
  }
  return {
    self: [],
    manager: [
      [
        'quarter-comment',
        'Performed against the plan. One dependency slipped; recovery was clean.',
      ],
    ],
  }
}

async function seedPackets(client, cycleId, members, employeesById) {
  const packets = []
  const answers = []
  const pillars = []
  const calibrations = []
  const appeals = []
  const questions = questionBodies(cycleId)
  const appraisalPillars = ['goals', 'skills', 'values']
  const clock = momentsOf(cycleId)
  const bands = ['unsatisfactory', 'developing', 'performing', 'exceeding', 'exceptional']

  for (const member of members) {
    const employee = employeesById.get(member.employee_id)
    if (!employee) continue
    if (employee.job_grade === 'Intern' && cycleId !== 'annual-2026') continue
    const status = packetStatus(cycleId)
    const appraisal = isAppraisalCycle(cycleId)
    const closedAppraisal = cycleId === 'h1-2025' || cycleId === 'h2-2025'
    const selfGrade = gradeFor(employee, 31)
    const managerGrade = gradeFor(employee, 41)
    let calibratedGrade = managerGrade
    if (closedAppraisal && hash(employee.employee_id, 77) % 4 === 0) {
      const index = Math.max(0, bands.indexOf(managerGrade))
      calibratedGrade = bands[Math.min(bands.length - 1, index + 1)]
    }
    const pending = status === 'not_started'
    const hasSelf = appraisal && !pending
    const hasManager = !pending
    const released = status === 'released_to_employees'
    const packetId = `pkt-${cycleId}-${employee.employee_id}`
      const publishedGrade = released
      ? closedAppraisal
        ? calibratedGrade
        : managerGrade
      : null
    packets.push({
      id: packetId,
      cycleId,
      groupId: member.group_id,
      employeeId: employee.employee_id,
      managerId: employee.reports_to_employee_id,
      status,
      selfGrade: hasSelf ? selfGrade : null,
      managerGrade: hasManager ? managerGrade : null,
      calibratedGrade: closedAppraisal && released ? calibratedGrade : null,
      publishedGrade,
      override:
        hasSelf && selfGrade !== managerGrade && hash(employee.employee_id, 8) % 5 === 0
          ? 'Manager override: the written outcomes do not match the self-score.'
          : '',
      firstViewed: pending ? null : isoDate(clock.viewed),
      releasedManager: released ? isoDate(clock.manager) : null,
      releasedEmployee: released ? isoDate(clock.employee) : null,
    })

    if (hasSelf) {
      for (const [questionId, body] of questions.self) {
        answers.push({ packetId, role: 'self', questionId, body })
      }
    }
    if (hasManager) {
      for (const [questionId, body] of questions.manager) {
        answers.push({ packetId, role: 'manager', questionId, body })
      }
      const pillarIds = appraisal ? appraisalPillars : ['goals']
      for (const pillarId of pillarIds) {
        pillars.push({
          packetId,
          role: 'manager',
          pillarId,
          grade: pillarId === 'goals' ? managerGrade : gradeFor(employee, pillarId.length),
          comment: `Manager view on ${pillarId}.`,
        })
        if (hasSelf) {
          pillars.push({
            packetId,
            role: 'self',
            pillarId,
            grade: pillarId === 'goals' ? selfGrade : gradeFor(employee, pillarId.length + 3),
            comment: `Self view on ${pillarId}.`,
          })
        }
      }
    }
    if (closedAppraisal && released && managerGrade !== calibratedGrade) {
      calibrations.push({
        id: `cal-${packetId}`,
        packetId,
        stageId: 'calibration_slt',
        fromGrade: managerGrade,
        toGrade: calibratedGrade,
        reason: 'Aligned to the department distribution and peer set.',
        actorId: ACTOR.employeeId,
      })
    }
  }

  await insertRows(
    client,
    `INSERT INTO platform.review_packets (
       id, cycle_id, group_id, employee_id, manager_employee_id, status,
       self_overall_grade, manager_overall_grade, calibrated_overall_grade,
       published_overall_grade, manager_override_reason, first_viewed_at,
       released_to_manager_at, released_to_employee_at
     )
     SELECT * FROM unnest(
       $1::text[], $2::text[], $3::text[], $4::int[], $5::int[], $6::text[],
       $7::text[], $8::text[], $9::text[], $10::text[], $11::text[],
       $12::timestamptz[], $13::timestamptz[], $14::timestamptz[]
     )`,
    packets,
    (chunk) => [
      chunk.map((row) => row.id),
      chunk.map((row) => row.cycleId),
      chunk.map((row) => row.groupId),
      chunk.map((row) => row.employeeId),
      chunk.map((row) => row.managerId),
      chunk.map((row) => row.status),
      chunk.map((row) => row.selfGrade),
      chunk.map((row) => row.managerGrade),
      chunk.map((row) => row.calibratedGrade),
      chunk.map((row) => row.publishedGrade),
      chunk.map((row) => row.override),
      chunk.map((row) => row.firstViewed),
      chunk.map((row) => row.releasedManager),
      chunk.map((row) => row.releasedEmployee),
    ],
  )

  await insertRows(
    client,
    `INSERT INTO platform.review_answers (packet_id, actor_role, question_id, body)
     SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[])`,
    answers,
    (chunk) => [
      chunk.map((row) => row.packetId),
      chunk.map((row) => row.role),
      chunk.map((row) => row.questionId),
      chunk.map((row) => row.body),
    ],
  )

  await insertRows(
    client,
    `INSERT INTO platform.review_pillar_scores (
       packet_id, actor_role, pillar_id, grade, comment
     )
     SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[])`,
    pillars,
    (chunk) => [
      chunk.map((row) => row.packetId),
      chunk.map((row) => row.role),
      chunk.map((row) => row.pillarId),
      chunk.map((row) => row.grade),
      chunk.map((row) => row.comment),
    ],
  )

  await insertRows(
    client,
    `INSERT INTO platform.review_calibration_events (
       id, packet_id, stage_id, from_grade, to_grade, reason, actor_employee_id
     )
     SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::int[])`,
    calibrations,
    (chunk) => [
      chunk.map((row) => row.id),
      chunk.map((row) => row.packetId),
      chunk.map((row) => row.stageId),
      chunk.map((row) => row.fromGrade),
      chunk.map((row) => row.toGrade),
      chunk.map((row) => row.reason),
      chunk.map((row) => row.actorId),
    ],
  )

  await insertRows(
    client,
    `INSERT INTO platform.review_appeals (
       id, packet_id, body, status, created_by_employee_id
     )
     SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::int[])`,
    appeals,
    (chunk) => [
      chunk.map((row) => row.id),
      chunk.map((row) => row.packetId),
      chunk.map((row) => row.body),
      chunk.map((row) => row.status),
      chunk.map((row) => row.createdBy),
    ],
  )

  if (cycleId !== 'h1-2025' && cycleId !== 'h2-2025') return
  const sitting = packets.map((packet) => {
    const adjusted = packet.managerGrade !== packet.calibratedGrade
    return {
      employeeId: packet.employeeId,
      status: 'confirmed',
      notes: adjusted
        ? 'Confirmed after a one-band move to fit the department curve.'
        : 'Confirmed the manager grade.',
      adjustedAt: adjusted ? isoDate(clock.calibration, 16) : null,
    }
  })
  if (!sitting.length) return
  const closedAt = isoDate(clock.calibration, 18)
  await client.query(
    `INSERT INTO platform.calibration_sittings (
       cycle_id, clean_confirmed_at, clean_confirmed_by_employee_id,
       locked_at, locked_by_employee_id
     )
     VALUES ($1, $2, $3, $2, $3)
     ON CONFLICT (cycle_id) DO UPDATE SET
       clean_confirmed_at = EXCLUDED.clean_confirmed_at,
       clean_confirmed_by_employee_id = EXCLUDED.clean_confirmed_by_employee_id,
       locked_at = EXCLUDED.locked_at,
       locked_by_employee_id = EXCLUDED.locked_by_employee_id`,
    [cycleId, closedAt, ACTOR.employeeId],
  )
  await insertRows(
    client,
    `INSERT INTO platform.calibration_sitting_employees (
       cycle_id, employee_id, status, notes, adjusted_at, updated_by_employee_id
     )
     SELECT * FROM unnest($1::text[], $2::int[], $3::text[], $4::text[], $5::timestamptz[], $6::int[])`,
    sitting,
    (chunk) => [
      chunk.map(() => cycleId),
      chunk.map((row) => row.employeeId),
      chunk.map((row) => row.status),
      chunk.map((row) => row.notes),
      chunk.map((row) => row.adjustedAt),
      chunk.map(() => ACTOR.employeeId),
    ],
  )
}

const DEMO_CALIBRATION = {
  gradeDistribution: {
    exceptional: 2,
    exceeding: 25,
    performing: 40,
    developing: 28,
    unsatisfactory: 5,
  },
}

async function clearCycle(pool, cycleId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `DELETE FROM platform.review_answers
       WHERE packet_id IN (SELECT id FROM platform.review_packets WHERE cycle_id = $1)`,
      [cycleId],
    )
    await client.query(
      `DELETE FROM platform.review_appeals
       WHERE packet_id IN (SELECT id FROM platform.review_packets WHERE cycle_id = $1)`,
      [cycleId],
    )
    await client.query(
      `DELETE FROM platform.review_calibration_events
       WHERE packet_id IN (SELECT id FROM platform.review_packets WHERE cycle_id = $1)`,
      [cycleId],
    )
    await client.query(
      `DELETE FROM platform.review_pillar_scores
       WHERE packet_id IN (SELECT id FROM platform.review_packets WHERE cycle_id = $1)`,
      [cycleId],
    )
    await client.query(
      `DELETE FROM platform.calibration_sitting_employees WHERE cycle_id = $1`,
      [cycleId],
    )
    await client.query(
      `DELETE FROM platform.calibration_sittings WHERE cycle_id = $1`,
      [cycleId],
    )
    await client.query(`DELETE FROM platform.review_packets WHERE cycle_id = $1`, [cycleId])
    await client.query(
      `UPDATE platform.goals SET cascaded_from_goal_id = NULL WHERE cycle_id = $1`,
      [cycleId],
    )
    await client.query(
      `DELETE FROM platform.goal_comments
       WHERE goal_id IN (SELECT goal_id FROM platform.goals WHERE cycle_id = $1)`,
      [cycleId],
    )
    await client.query(
      `DELETE FROM platform.goal_measurements
       WHERE goal_id IN (SELECT goal_id FROM platform.goals WHERE cycle_id = $1)`,
      [cycleId],
    )
    await client.query(
      `DELETE FROM platform.goal_progress_entries
       WHERE goal_id IN (SELECT goal_id FROM platform.goals WHERE cycle_id = $1)`,
      [cycleId],
    )
    await client.query(`DELETE FROM platform.goal_ratings WHERE cycle_id = $1`, [cycleId])
    await client.query(`DELETE FROM platform.goals WHERE cycle_id = $1`, [cycleId])
    await client.query(`DELETE FROM platform.goal_submissions WHERE cycle_id = $1`, [cycleId])
    await client.query(
      `DELETE FROM platform.review_cycle_group_members WHERE cycle_id = $1`,
      [cycleId],
    )
    await client.query(
      `DELETE FROM platform.review_cycle_grade_exclusions WHERE cycle_id = $1`,
      [cycleId],
    )
    await client.query(`DELETE FROM platform.review_cycle_groups WHERE cycle_id = $1`, [cycleId])
    await client.query(
      `DELETE FROM platform.review_cycle_sources
       WHERE cycle_id = $1 OR source_cycle_id = $1`,
      [cycleId],
    )
    await client.query(`DELETE FROM platform.review_cycles WHERE id = $1`, [cycleId])
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function main() {
  const onlyIndex = process.argv.indexOf('--only')
  const onlyCycle = onlyIndex >= 0 ? process.argv[onlyIndex + 1] : null
  if (onlyCycle && onlyCycle !== 'q3-2026') {
    throw new Error(`Unsupported --only value: ${onlyCycle}`)
  }

  const pool = getPool()
  if (onlyCycle) {
    console.log(`Clearing ${onlyCycle} before reseed…`)
    await clearCycle(pool, onlyCycle)
  } else {
    console.log('Wiping previous cycle/review/goal seed…')
    await wipeTransactional(pool)
  }

  const { rows: employees } = await pool.query(`
    SELECT
      employee.employee_id,
      employee.name,
      employee.email,
      employee.job_grade,
      employee.joining_date,
      employee.reports_to_employee_id,
      department.name AS department_name
    FROM platform.employees employee
    LEFT JOIN platform.departments department ON department.id = employee.department_id
    WHERE employee.status = 'active'
    ORDER BY employee.employee_id
  `)
  const employeesById = new Map(employees.map((row) => [row.employee_id, row]))
  const parts = partitionEmployees(employees)
  console.log(
    `People: ${employees.length} active · leadership ${parts.leadership.length} · P&C ${parts.peopleCulture.length} · new joiners ${parts.newJoiners.length} · company ${parts.company.length}`,
  )

  const ids = (list) => list.map((row) => row.employee_id)
  const presentBy = (list, endDate) =>
    ids(list.filter((employee) => joinedOn(employee) <= endDate))

  const quarterSettings = {
    reviewTypes: { line_manager: true, self: false },
    goalCountPolicy: { minimumRequired: 2, recommendedMinimum: 3, recommendedMaximum: 5, maximumAllowed: null },
    postWindowGoalPolicy: 'two_tier_approval',
    excludedEmployeeIds: [],
    autoScorecardGeneration: true,
  }
  const appraisalSettings = {
    ...quarterSettings,
    reviewTypes: { line_manager: true, self: true },
    autoScorecardGeneration: false,
  }

  let h1
  let h2
  let q1
  let q2
  let q4
  let annual
  if (!onlyCycle) {
    h1 = await createReviewCycle(
      {
        id: 'h1-2025',
        name: 'H1 2025',
        type: 'regular',
        periodKey: 'h1-2025',
        yearKey: '2025',
        startDate: '2025-01-01',
        endDate: '2025-06-30',
        settings: appraisalSettings,
        calibration: DEMO_CALIBRATION,
      },
      ACTOR,
    )
    h2 = await createReviewCycle(
      {
        id: 'h2-2025',
        name: 'H2 2025',
        type: 'regular',
        periodKey: 'h2-2025',
        yearKey: '2025',
        startDate: '2025-07-01',
        endDate: '2025-12-31',
        settings: appraisalSettings,
        calibration: DEMO_CALIBRATION,
      },
      ACTOR,
    )
    q1 = await createReviewCycle(
      {
        id: 'q1-2026',
        name: 'Q1 2026',
        type: 'regular',
        periodKey: 'q1-2026',
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        settings: quarterSettings,
        calibration: DEMO_CALIBRATION,
      },
      ACTOR,
    )
    q2 = await createReviewCycle(
      {
        id: 'q2-2026',
        name: 'Q2 2026',
        type: 'regular',
        periodKey: 'q2-2026',
        startDate: '2026-04-01',
        endDate: '2026-06-30',
        settings: quarterSettings,
        calibration: DEMO_CALIBRATION,
      },
      ACTOR,
    )
  }
  const q3 = await createReviewCycle(
    {
      id: 'q3-2026',
      name: 'Q3 2026',
      type: 'regular',
      periodKey: 'q3-2026',
      startDate: '2026-07-01',
      endDate: '2026-09-30',
      settings: quarterSettings,
      calibration: DEMO_CALIBRATION,
    },
    ACTOR,
  )
  if (!onlyCycle) {
    q4 = await createReviewCycle(
      {
        id: 'q4-2026',
        name: 'Q4 2026',
        type: 'regular',
        periodKey: 'q4-2026',
        startDate: '2026-10-01',
        endDate: '2026-12-31',
        settings: {
          ...quarterSettings,
          postWindowGoalPolicy: 'hard_stop',
          autoScorecardGeneration: false,
        },
        calibration: DEMO_CALIBRATION,
      },
      ACTOR,
    )
    annual = await createReviewCycle(
      {
        id: 'annual-2026',
        name: 'Annual 2026',
        type: 'regular',
        periodKey: 'annual-2026',
        yearKey: '2026',
        startDate: '2027-01-01',
        endDate: '2027-02-15',
        sourceLinks: [
          { sourceCycleId: q1.id, weightPercent: 25, excluded: false },
          { sourceCycleId: q2.id, weightPercent: 25, excluded: false },
          { sourceCycleId: q3.id, weightPercent: 25, excluded: false },
          { sourceCycleId: q4.id, weightPercent: 25, excluded: false },
        ],
        settings: appraisalSettings,
        calibration: DEMO_CALIBRATION,
      },
      ACTOR,
    )
  }

  console.log('Cycles created. Building groups…')

  const defaultSettings = (overrides = {}) => ({
    reviewTypes: { line_manager: true, self: false },
    goalCountPolicy: { minimumRequired: 2, recommendedMinimum: 3, recommendedMaximum: 5, maximumAllowed: null },
    postWindowGoalPolicy: 'two_tier_approval',
    autoScorecardGeneration: false,
    ...overrides,
  })

  async function addGroups(cycle, groups) {
    for (const group of groups) {
      if (!group.memberIds.length) continue
      await createCycleGroup(
        cycle.id,
        {
          name: group.name,
          memberIds: group.memberIds,
          stagesConfig: group.stagesConfig ?? cycle.stagesConfig,
          settings: group.settings ?? defaultSettings(),
          calibration: group.calibration ?? cycle.calibration,
        },
        ACTOR,
      )
    }
  }

  const staff = (endDate) => [
    { name: 'Leadership', memberIds: presentBy(parts.leadership, endDate), settings: defaultSettings({ reviewTypes: { line_manager: true, self: true } }) },
    { name: 'Company', memberIds: presentBy([...parts.company, ...parts.peopleCulture, ...parts.newJoiners], endDate) },
  ]

  if (!onlyCycle) {
    await addGroups(h1, staff('2025-06-30').map((group) => ({
      ...group,
      settings: defaultSettings({ reviewTypes: { line_manager: true, self: true } }),
    })))
    await addGroups(h2, staff('2025-12-31').map((group) => ({
      ...group,
      settings: defaultSettings({ reviewTypes: { line_manager: true, self: true } }),
    })))
    await addGroups(q1, [
      { name: 'Leadership', memberIds: presentBy(parts.leadership, '2026-03-31') },
      { name: 'Company', memberIds: presentBy([...parts.company, ...parts.peopleCulture, ...parts.newJoiners], '2026-03-31') },
    ])
    await addGroups(q2, [
      { name: 'Leadership', memberIds: presentBy(parts.leadership, '2026-06-30') },
      { name: 'Company', memberIds: presentBy([...parts.company, ...parts.peopleCulture, ...parts.newJoiners], '2026-06-30') },
    ])
  }

  await addGroups(q3, [
    { name: 'Leadership', memberIds: presentBy(parts.leadership, '2026-09-30') },
    { name: 'Company', memberIds: presentBy([...parts.company, ...parts.peopleCulture, ...parts.newJoiners], '2026-09-30') },
  ])
  if (!onlyCycle) {
    await addGroups(q4, [
      { name: 'Everyone', memberIds: presentBy(employees, '2026-12-31'), settings: defaultSettings({ postWindowGoalPolicy: 'hard_stop' }) },
    ])
    await addGroups(annual, [
      { name: 'Leadership', memberIds: ids(parts.leadership), settings: defaultSettings({ reviewTypes: { line_manager: true, self: true } }) },
      { name: 'Company', memberIds: ids([...parts.company, ...parts.peopleCulture, ...parts.newJoiners]), settings: defaultSettings({ reviewTypes: { line_manager: true, self: true } }) },
    ])
  }

  const client = await pool.connect()
  try {
    const { rows: memberships } = await client.query(`
      SELECT cycle_id, group_id, employee_id
      FROM platform.review_cycle_group_members
    `)
    const byCycle = new Map()
    for (const row of memberships) {
      const list = byCycle.get(row.cycle_id) ?? []
      list.push(row)
      byCycle.set(row.cycle_id, list)
    }

    const goalCycles = onlyCycle
      ? [onlyCycle]
      : ['h1-2025', 'h2-2025', 'q1-2026', 'q2-2026', 'q3-2026', 'q4-2026']
    const reviewCycles = onlyCycle
      ? [onlyCycle]
      : ['h1-2025', 'h2-2025', 'q1-2026', 'q2-2026', 'q3-2026', 'annual-2026']

    for (const cycleId of goalCycles) {
      console.log(`Seeding goals for ${cycleId}…`)
      await seedGoals(client, cycleId, byCycle.get(cycleId) ?? [], employeesById)
    }

    for (const cycleId of reviewCycles) {
      console.log(`Seeding reviews for ${cycleId}…`)
      await seedPackets(client, cycleId, byCycle.get(cycleId) ?? [], employeesById)
    }
  } finally {
    client.release()
  }

  const summary = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM platform.review_cycles) AS cycles,
      (SELECT COUNT(*)::int FROM platform.review_cycle_groups) AS groups,
      (SELECT json_object_agg(status, n) FROM (
         SELECT status, COUNT(*)::int AS n FROM platform.goal_submissions GROUP BY status
       ) s) AS goal_statuses,
      (SELECT json_object_agg(status, n) FROM (
         SELECT status, COUNT(*)::int AS n FROM platform.review_packets GROUP BY status
       ) s) AS packet_statuses,
      (SELECT COUNT(*)::int FROM platform.goals) AS goals,
      (SELECT COUNT(*)::int FROM platform.employees) AS employees
  `)
  console.log(JSON.stringify(summary.rows[0], null, 2))
  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
