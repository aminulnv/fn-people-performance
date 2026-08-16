import type {
  Goal,
  GoalPriority,
  GoalType,
  PersonGoals,
  ProcessType,
} from './types'

export const DEFAULT_GOAL_TYPE: GoalType = 'outcome'
export const DEFAULT_PROCESS_TYPE: ProcessType = 'bau'
export const DEFAULT_GOAL_PRIORITY: GoalPriority = 'medium'

export const GOAL_TYPE_OPTIONS: { value: GoalType; label: string }[] = [
  { value: 'outcome', label: 'Outcome' },
  { value: 'output', label: 'Output' },
]

export const PROCESS_TYPE_OPTIONS: {
  value: ProcessType
  label: string
  description: string
}[] = [
  { value: 'okr', label: 'OKR', description: 'Objective and key results' },
  { value: 'bau', label: 'BAU', description: 'Business as usual' },
  { value: 'pi', label: 'PI', description: 'Performance improvement' },
]

export const GOAL_PRIORITY_OPTIONS: { value: GoalPriority; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

export function isGoalType(value: unknown): value is GoalType {
  return value === 'outcome' || value === 'output'
}

export function isProcessType(value: unknown): value is ProcessType {
  return value === 'okr' || value === 'bau' || value === 'pi'
}

export function isGoalPriority(value: unknown): value is GoalPriority {
  return value === 'high' || value === 'medium' || value === 'low'
}

export function goalTypeLabel(value: GoalType): string {
  return GOAL_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value
}

export function processTypeLabel(value: ProcessType): string {
  return (
    PROCESS_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value
  )
}

export function goalPriorityLabel(value: GoalPriority): string {
  return (
    GOAL_PRIORITY_OPTIONS.find((option) => option.value === value)?.label ??
    value
  )
}

/** Fill classification on stored or incomplete goals so older sessions still load. */
export function normalizeGoal(goal: Goal): Goal {
  return {
    ...goal,
    goalType: isGoalType(goal.goalType) ? goal.goalType : DEFAULT_GOAL_TYPE,
    processType: isProcessType(goal.processType)
      ? goal.processType
      : DEFAULT_PROCESS_TYPE,
    priority: isGoalPriority(goal.priority)
      ? goal.priority
      : DEFAULT_GOAL_PRIORITY,
  }
}

export function normalizePersonGoals(row: PersonGoals): PersonGoals {
  return {
    ...row,
    goals: row.goals.map(normalizeGoal),
  }
}
