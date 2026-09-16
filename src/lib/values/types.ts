import type { GradeBandId } from '@/lib/reviews/types'

/** Bands Revolut uses on each cultural-value behaviour. */
export const VALUE_BEHAVIOUR_BANDS = [
  'developing',
  'performing',
  'exceeding',
] as const satisfies readonly GradeBandId[]

export type ValueBehaviourBand = (typeof VALUE_BEHAVIOUR_BANDS)[number]

export type ValueStatus = 'enabled' | 'disabled'

export type ValueBehaviour = {
  id: string
  name: string
  /** Observable bars for Developing / Performing / Exceeding. */
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
