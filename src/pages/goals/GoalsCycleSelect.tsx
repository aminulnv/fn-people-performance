import { useEffect, useMemo, useState } from 'react'
import { CycleSelect, type CycleSelectOption } from '@/components/ui'
import { cycleStatusLabel } from '@/lib/goals/cyclesFromReviews'
import type { GoalsCycleOption } from '@/lib/goals/types'
import {
  getGoalsSnapshot,
  setActiveCycle,
  subscribeGoalsStore,
} from '@/lib/goals/store'

type GoalsCycleSelectProps = {
  /** Controlled cycles list; defaults to live store snapshot. */
  cycles?: GoalsCycleOption[]
  activeCycleId?: string
  onSelect?: (cycleId: string) => void
  className?: string
}

/** Cycle picker wired to the goals store. */
export function GoalsCycleSelect({
  cycles: cyclesProp,
  activeCycleId: activeProp,
  onSelect,
  className,
}: GoalsCycleSelectProps) {
  const [tick, setTick] = useState(0)

  useEffect(() => subscribeGoalsStore(() => setTick((n) => n + 1)), [])

  void tick
  const snapshot = getGoalsSnapshot()
  const cycles = cyclesProp ?? snapshot.availableCycles
  const activeId = activeProp ?? snapshot.cycle.id

  const options = useMemo<CycleSelectOption[]>(
    () =>
      cycles.map((cycle) => ({
        id: cycle.id,
        label: cycle.label,
        status: cycle.status,
        statusLabel: cycleStatusLabel(cycle.status),
      })),
    [cycles],
  )

  return (
    <CycleSelect
      className={className}
      label="Goal cycle"
      options={options}
      value={activeId}
      onChange={onSelect ?? ((cycleId) => void setActiveCycle(cycleId))}
    />
  )
}
