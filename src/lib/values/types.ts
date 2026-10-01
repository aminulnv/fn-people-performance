import type { GradeBandId } from '@/lib/reviews/types'

/** Same 5-tier scale used on the annual values grade picker. */
export const VALUE_BEHAVIOUR_BANDS = [
  'unsatisfactory',
  'developing',
  'performing',
  'exceeding',
  'exceptional',
] as const satisfies readonly GradeBandId[]

export type ValueBehaviourBand = (typeof VALUE_BEHAVIOUR_BANDS)[number]

export type ValueStatus = 'enabled' | 'disabled'

export type ValueBehaviour = {
  id: string
  name: string
  /** Observable bars for each grade band. */
  bands: Record<ValueBehaviourBand, string[]>
}

export type CompanyValue = {
  id: string
  name: string
  description: string
  status: ValueStatus
  playbookUrl: string | null
  behaviours: ValueBehaviour[]
}
