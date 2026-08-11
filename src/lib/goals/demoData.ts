import type {
  DemoPerson,
  Goal,
  GoalsCycle,
  GoalsSnapshot,
  PersonGoals,
} from './types'

/** Quarters available in the cycle picker. */
export const DEMO_CYCLES: GoalsCycle[] = [
  {
    id: 'q1-2026',
    label: 'Q1 2026',
    day1: '2026-01-01',
    phase: 'window_open',
  },
  {
    id: 'q2-2026',
    label: 'Q2 2026',
    day1: '2026-04-01',
    phase: 'window_open',
  },
  {
    id: 'q3-2026',
    label: 'Q3 2026',
    day1: '2026-07-01',
    phase: 'window_open',
  },
  {
    id: 'q4-2026',
    label: 'Q4 2026',
    day1: '2026-10-01',
    phase: 'window_open',
  },
]

/** Active demo quarter (Q2). */
export const DEMO_CYCLE: GoalsCycle =
  DEMO_CYCLES.find((c) => c.id === 'q2-2026') ?? DEMO_CYCLES[1]

export const CURRENT_CYCLE_ID = DEMO_CYCLE.id

/**
 * Org seed for goals. Login identities use @demo.com emails;
 * additional employees exist so managers have a team to review.
 */
export const DEMO_PEOPLE: DemoPerson[] = [
  {
    id: 'seniormanager',
    name: 'Daniel Croft',
    email: 'seniormanager@demo.com',
    title: 'Director of Engineering',
    department: 'Product Engineering',
    role: 'seniormanager',
    joinDate: '2018-02-01',
    reportIds: ['manager'],
    avatarHue: 220,
    blurb: 'Skip-level view — manages Rachel and can review her team.',
  },
  {
    id: 'manager',
    name: 'Rachel Brooks',
    email: 'manager@demo.com',
    title: 'Engineering Manager',
    department: 'Product Engineering',
    role: 'manager',
    joinDate: '2022-01-10',
    managerId: 'seniormanager',
    reportIds: ['employee', 'nabila', 'karim', 'sam'],
    avatarHue: 265,
    blurb: 'Approves team goals in batch. Can still approve after Day 30.',
  },
  {
    id: 'employee',
    name: 'Ethan Walker',
    email: 'employee@demo.com',
    title: 'Product Designer',
    department: 'Product Engineering',
    role: 'employee',
    joinDate: '2024-03-01',
    managerId: 'manager',
    reportIds: [],
    avatarHue: 200,
    blurb: 'Eligible employee — draft, submit, update progress, see score.',
  },
  {
    id: 'nabila',
    name: 'Olivia Bennett',
    email: 'olivia.bennett@fn.example',
    title: 'Frontend Engineer',
    department: 'Product Engineering',
    role: 'employee',
    joinDate: '2023-08-15',
    managerId: 'manager',
    reportIds: [],
    avatarHue: 330,
    blurb: 'Already submitted — waiting on manager approval.',
  },
  {
    id: 'karim',
    name: 'Marcus Reed',
    email: 'marcus.reed@fn.example',
    title: 'Backend Engineer',
    department: 'Product Engineering',
    role: 'employee',
    joinDate: '2021-11-02',
    managerId: 'manager',
    reportIds: [],
    avatarHue: 150,
    blurb: 'Goals approved — mid-quarter progress updates.',
  },
  {
    id: 'sam',
    name: 'Jake Sullivan',
    email: 'jake.sullivan@fn.example',
    title: 'QA Analyst',
    department: 'Product Engineering',
    role: 'employee',
    joinDate: '2026-04-25',
    managerId: 'manager',
    reportIds: [],
    avatarHue: 30,
    blurb: 'Joined Day 25 — not eligible for this quarter.',
  },
  {
    id: 'ptr',
    name: 'Hannah Price',
    email: 'ptr@demo.com',
    title: 'PTR Lead',
    department: 'People',
    role: 'ptr',
    joinDate: '2019-05-01',
    reportIds: [],
    avatarHue: 280,
    blurb: 'People team view — cycle phase + eligibility overview.',
  },
  {
    id: 'hrbp',
    name: 'Amelia Shaw',
    email: 'hrbp@demo.com',
    title: 'HR Business Partner',
    department: 'People',
    role: 'hrbp',
    joinDate: '2020-09-12',
    reportIds: [],
    avatarHue: 310,
    blurb: 'HRBP view — cycle coverage for the partnered org.',
  },
]

function mid(
  id: string,
  title: string,
  weight: number,
  complete = false,
): Goal['measurements'][number] {
  return { id, kind: 'milestone', title, weight, complete }
}

function metric(
  id: string,
  title: string,
  weight: number,
  start: number,
  target: number,
  current: number,
): Goal['measurements'][number] {
  return {
    id,
    kind: 'metric',
    title,
    weight,
    unit: '%',
    direction: 'greater_than',
    startValue: start,
    targetValue: target,
    currentValue: current,
  }
}

function goal(
  id: string,
  description: string,
  weight: number,
  measurements: Goal['measurements'],
  linked?: string,
): Goal {
  return {
    id,
    description,
    goalType: 'Outcome',
    processType: 'OKR',
    priority: weight >= 40 ? 'High' : 'Medium',
    weight,
    linkedGoalLabel: linked,
    measurements,
  }
}

const emptyDraft = (): Goal[] => [
  goal('g-new-1', '', 50, [mid('m1', 'Define success criteria', 100)]),
  goal('g-new-2', '', 50, [mid('m2', 'Ship first milestone', 100)]),
]

function seedByPerson(): Record<string, PersonGoals> {
  return {
    employee: {
      personId: 'employee',
      status: 'draft',
      goals: [
        goal(
          'emp-1',
          'Ship redesign of goal-setting experience for managers',
          40,
          [
            mid('e1m1', 'Us research with 5 managers', 40),
            mid('e1m2', 'High-fidelity prototype approved', 30),
            metric('e1m3', 'Task success rate in usability test', 30, 40, 85, 40),
          ],
          'Rachel Brooks — Lift team delivery predictability',
        ),
        goal(
          'emp-2',
          'Reduce design system inconsistency across People platform',
          35,
          [
            mid('e2m1', 'Audit top 20 screens', 50),
            mid('e2m2', 'Publish component usage guide', 50),
          ],
        ),
        goal(
          'emp-3',
          'Mentor one junior designer through a full feature cycle',
          25,
          [mid('e3m1', 'Complete mentoring plan', 100)],
        ),
      ],
    },
    nabila: {
      personId: 'nabila',
      status: 'submitted',
      goals: [
        goal(
          'nab-1',
          'Deliver goals approval queue with batch actions',
          50,
          [
            mid('n1m1', 'Queue list + Next navigation', 40, true),
            mid('n1m2', 'Approve / send-back actions', 60),
          ],
        ),
        goal(
          'nab-2',
          'Improve frontend performance on People shell',
          30,
          [metric('n2m1', 'LCP on /goals', 100, 4.2, 2.5, 3.8)],
        ),
        goal(
          'nab-3',
          'Document frontend patterns for new joiners',
          20,
          [mid('n3m1', 'Publish onboarding checklist', 100)],
        ),
      ],
    },
    karim: {
      personId: 'karim',
      status: 'approved',
      goals: [
        goal(
          'kar-1',
          'Build goals API contracts and mock service layer',
          45,
          [
            mid('k1m1', 'Types + validation helpers', 40, true),
            mid('k1m2', 'Submit / approve endpoints (mock)', 60, true),
          ],
        ),
        goal(
          'kar-2',
          'Add audit trail for manager edits during approval',
          35,
          [
            mid('k2m1', 'Capture before/after fields', 50, true),
            metric('k2m2', 'Coverage of edit paths', 50, 0, 100, 70),
          ],
        ),
        goal(
          'kar-3',
          'Support post-lock pending approval path',
          20,
          [mid('k3m1', 'Direct manager + +1 can approve', 100)],
        ),
      ],
    },
    sam: {
      personId: 'sam',
      status: 'not_eligible',
      goals: [],
    },
    manager: {
      personId: 'manager',
      status: 'draft',
      goals: [
        goal(
          'mgr-1',
          'Lift team delivery predictability this quarter',
          50,
          [
            mid('m1m1', 'Weekly risk review with directs', 40),
            metric('m1m2', 'On-time milestone rate', 60, 60, 90, 60),
          ],
        ),
        goal(
          'mgr-2',
          'Grow two engineers into tech-lead readiness',
          30,
          [mid('m2m1', 'Growth plans signed off', 100)],
        ),
        goal(
          'mgr-3',
          'Close Q1 check-ins for all directs on time',
          20,
          [mid('m3m1', 'All check-ins submitted by Day 15', 100)],
        ),
      ],
    },
    seniormanager: {
      personId: 'seniormanager',
      status: 'draft',
      goals: [
        goal(
          'sm-1',
          'Raise engineering org predictability across product squads',
          50,
          [
            mid('s1m1', 'Monthly delivery review with managers', 40),
            metric('s1m2', 'Squads hitting milestone plan', 60, 55, 85, 55),
          ],
        ),
        goal(
          'sm-2',
          'Strengthen manager coaching cadence',
          30,
          [mid('s2m1', '1:1 quality checklist adopted', 100)],
        ),
        goal(
          'sm-3',
          'Hire two senior ICs for platform reliability',
          20,
          [mid('s3m1', 'Offers accepted', 100)],
        ),
      ],
    },
    ptr: {
      personId: 'ptr',
      status: 'draft',
      goals: emptyDraft(),
    },
    hrbp: {
      personId: 'hrbp',
      status: 'draft',
      goals: emptyDraft(),
    },
  }
}

export function createInitialSnapshot(): GoalsSnapshot {
  return {
    cycle: { ...DEMO_CYCLE },
    activePersonId: 'employee',
    people: DEMO_PEOPLE.map((p) => ({ ...p, reportIds: [...p.reportIds] })),
    byPerson: seedByPerson(),
  }
}

export function isEligibleForCycle(
  person: DemoPerson,
  cycle: GoalsCycle,
): boolean {
  return person.joinDate <= cycle.day1
}
