export type GoalRole =
  | 'employee'
  | 'manager'
  | 'seniormanager'
  | 'ptr'
  | 'hrbp'

export type GoalType = 'Outcome' | 'Output'
export type ProcessType = 'OKR' | 'BAU' | 'PI'
export type GoalPriority = 'High' | 'Medium' | 'Low'
export type MetricUnit = '%' | 'number' | 'days' | 'currency'
export type MetricDirection = 'greater_than' | 'less_than' | 'within_range'

export type SubmissionStatus =
  | 'not_eligible'
  | 'draft'
  | 'submitted'
  | 'sent_back'
  | 'approved'
  | 'incomplete'

export type DemoPhase = 'window_open' | 'hard_lock' | 'check_in'

export type Milestone = {
  id: string
  kind: 'milestone'
  title: string
  weight: number
  complete: boolean
  proofUrl?: string
  comment?: string
}

export type Metric = {
  id: string
  kind: 'metric'
  title: string
  weight: number
  unit: MetricUnit
  direction: MetricDirection
  startValue: number
  targetValue: number
  currentValue: number
  rangeMin?: number
  rangeMax?: number
  proofUrl?: string
  comment?: string
}

export type Measurement = Milestone | Metric

export type Goal = {
  id: string
  description: string
  goalType: GoalType
  processType: ProcessType
  priority: GoalPriority
  weight: number
  linkedGoalLabel?: string
  measurements: Measurement[]
}

export type QuarterRating = {
  tier: 1 | 2 | 3 | 4 | 5
  comment: string
  submittedAt: string
}

export type PersonGoals = {
  personId: string
  status: SubmissionStatus
  goals: Goal[]
  sendBackReason?: string
  managerNote?: string
  rating?: QuarterRating
}

export type DemoPerson = {
  id: string
  name: string
  email: string
  title: string
  department: string
  role: GoalRole
  /** ISO date — eligible if on/before quarter Day 1 */
  joinDate: string
  managerId?: string
  reportIds: string[]
  avatarHue: number
  avatarUrl?: string
  blurb: string
}

export type GoalsCycle = {
  id: string
  label: string
  /** YYYY-MM-DD */
  day1: string
  phase: DemoPhase
}

export type GoalsSnapshot = {
  cycle: GoalsCycle
  activePersonId: string
  people: DemoPerson[]
  byPerson: Record<string, PersonGoals>
}
