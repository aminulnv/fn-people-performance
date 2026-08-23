import { useEffect, useMemo, useState } from 'react'
import { CycleSelect, type CycleSelectOption } from '@/components/ui'
import { cycleStatusLabel } from '@/lib/goals/cyclesFromReviews'
import { selectGoalCycle } from '@/lib/goalsApi'
import type { GoalsCycleOption } from '@/lib/goals/types'
import { getGoalsSnapshot, subscribeGoalsStore } from '@/lib/goals/store'

type GoalsCycleSelectBase = {
  /** Controlled cycles list; defaults to live store snapshot. */
  cycles?: GoalsCycleOption[]
  className?: string
}

type GoalsCycleSelectSingleProps = GoalsCycleSelectBase & {
  multiple?: false
  activeCycleId?: string
  onSelect?: (cycleId: string) => void
}

type GoalsCycleSelectMultiProps = GoalsCycleSelectBase & {
  multiple: true
  selectedCycleIds: string[]
  onSelectMany: (cycleIds: string[]) => void
}

type GoalsCycleSelectProps =
  | GoalsCycleSelectSingleProps
  | GoalsCycleSelectMultiProps

function useCycleOptions(cyclesProp?: GoalsCycleOption[]) {
  const [tick, setTick] = useState(0)
  useEffect(() => subscribeGoalsStore(() => setTick((n) => n + 1)), [])
  void tick
  const snapshot = getGoalsSnapshot()
  const cycles = cyclesProp ?? snapshot.availableCycles
  return useMemo<CycleSelectOption[]>(
    () =>
      cycles.map((cycle) => ({
        id: cycle.id,
        label: cycle.label,
        status: cycle.status,
        statusLabel: cycleStatusLabel(cycle.status),
      })),
    [cycles],
  )
}

/** Cycle picker wired to the goals store. */
export function GoalsCycleSelect(props: GoalsCycleSelectProps) {
  const options = useCycleOptions(props.cycles)

  if (props.multiple) {
    return (
      <CycleSelect
        className={props.className}
        label="Goal cycle"
        multiple
        options={options}
        value={props.selectedCycleIds}
        onChange={props.onSelectMany}
      />
    )
  }

  return (
    <GoalsCycleSelectSingle
      className={props.className}
      options={options}
      activeCycleId={props.activeCycleId}
      onSelect={props.onSelect}
    />
  )
}

function GoalsCycleSelectSingle({
  options,
  activeCycleId: activeProp,
  onSelect,
  className,
}: {
  options: CycleSelectOption[]
  activeCycleId?: string
  onSelect?: (cycleId: string) => void
  className?: string
}) {
  const [pendingCycleId, setPendingCycleId] = useState<string | null>(null)
  const snapshot = getGoalsSnapshot()
  const committedId = activeProp ?? snapshot.cycle.id
  const activeId = pendingCycleId ?? committedId

  useEffect(() => {
    if (pendingCycleId && committedId === pendingCycleId) {
      setPendingCycleId(null)
    }
  }, [committedId, pendingCycleId])

  return (
    <CycleSelect
      className={className}
      label="Goal cycle"
      options={options}
      value={activeId}
      onChange={
        onSelect ??
        ((cycleId) => {
          setPendingCycleId(cycleId)
          void selectGoalCycle(cycleId).finally(() => {
            setPendingCycleId((current) =>
              current === cycleId ? null : current,
            )
          })
        })
      }
    />
  )
}
