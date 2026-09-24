import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Scale } from 'lucide-react'
import {
  CYCLE_SELECT_CLEAR_ID,
  CycleSelect,
  EmptyState,
  PageStatus,
  PageStatusRetry,
  sanitizeCycleSelection,
  type CycleSelectOption,
} from '@/components/ui'
import { calibrationTabPath } from '@/lib/calibration/paths'
import {
  buildRatingDistribution,
  type RatingBreakdownId,
} from '@/lib/calibration/distribution'
import {
  buildCalibrationIndicators,
  previousCyclesOfSamePurpose,
} from '@/lib/calibration/indicators'
import { buildManagerRatingHeatmap } from '@/lib/calibration/managerHeatmap'
import { useEmployees } from '@/lib/employees/useEmployees'
import { useLiveTopic } from '@/lib/realtime/useLiveTopic'
import { cycleMemberIds } from '@/lib/reviews/cycleGroups'
import { cycleSupportsCalibration } from '@/lib/reviews/purpose'
import { annualSourceLinks } from '@/lib/reviews/annualQuarters'
import { fetchReviewPacketSummaries } from '@/lib/reviews/packetsApi'
import { formatDateRange } from '@/lib/reviews/periods'
import { cycleStatusLabel, resolveCycleStatus } from '@/lib/reviews/status'
import type { ReviewPacket } from '@/lib/reviews/types'
import {
  useReviewCyclesHydrated,
  useReviewsSnapshot,
} from '@/lib/reviews/useReviews'
import {
  employeeMatchesCohort,
  jobLevelOf,
  sortJobLevels,
  uniqueSortedValues,
} from '@/lib/calibration/ratingTable'
import { CalibrationIndicators } from '@/pages/calibration/CalibrationIndicators'
import { EmployeeRatingTable } from '@/pages/calibration/EmployeeRatingTable'
import { ManagerRatingHeatmap } from '@/pages/calibration/ManagerRatingHeatmap'
import { RatingComparison } from '@/pages/calibration/RatingComparison'
import { RatingDistributionChart } from '@/pages/calibration/RatingDistributionChart'
import { SelfManagerRatingGrid } from '@/pages/calibration/SelfManagerRatingGrid'
import '@/styles/layout-people.css'
import '@/styles/layout-calibration.css'

type CalibrationView = 'insights' | 'ratings'

function CohortFilter({
  label,
  emptyLabel,
  options,
  values,
  onChange,
}: {
  label: string
  emptyLabel: string
  options: readonly string[]
  values: string[]
  onChange: (values: string[]) => void
}) {
  return (
    <CycleSelect
      multiple
      allowEmpty
      label={label}
      emptyLabel={emptyLabel}
      searchPlaceholder={`Search ${label.toLowerCase()}`}
      noResultsText={`No ${label.toLowerCase()} match`}
      options={options.map((option) => ({ id: option, label: option }))}
      value={values}
      onChange={onChange}
    />
  )
}

export default function CalibrationPage() {
  const { view: viewParam } = useParams()
  const view: CalibrationView = viewParam === 'ratings' ? 'ratings' : 'insights'
  const { employees, loadState, loadError } = useEmployees()
  const { cycles } = useReviewsSnapshot()
  const cyclesHydrated = useReviewCyclesHydrated()
  const [breakdown, setBreakdown] = useState<RatingBreakdownId>('overall')
  const [cycleId, setCycleId] = useState('')
  const [cyclePicked, setCyclePicked] = useState(false)
  const [packets, setPackets] = useState<ReviewPacket[]>([])
  const [historyPackets, setHistoryPackets] = useState<ReviewPacket[][]>([])
  const [linkedPacketsByCycleId, setLinkedPacketsByCycleId] = useState<
    Map<string, ReviewPacket[]>
  >(() => new Map())
  const [dataState, setDataState] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle')
  const [dataError, setDataError] = useState<string | null>(null)
  const [departments, setDepartments] = useState<string[]>([])
  const [teams, setTeams] = useState<string[]>([])
  const [markets, setMarkets] = useState<string[]>([])
  const [jobLevels, setJobLevels] = useState<string[]>([])

  const cycleOptions = useMemo<CycleSelectOption[]>(
    () =>
      cycles.filter(cycleSupportsCalibration).map((cycle) => {
        const status = resolveCycleStatus(cycle)
        return {
          id: cycle.id,
          label: cycle.name,
          status,
          statusLabel: cycleStatusLabel(status),
          dateLabel: formatDateRange(cycle.startDate, cycle.endDate),
        }
      }),
    [cycles],
  )

  function handleCycleChange(nextId: string) {
    setCyclePicked(true)
    setCycleId(nextId)
    if (!nextId) {
      setPackets([])
      setHistoryPackets([])
      setLinkedPacketsByCycleId(new Map())
      setDataState('ready')
      setDataError(null)
    }
  }

  useEffect(() => {
    if (cyclePicked && cycleId === CYCLE_SELECT_CLEAR_ID) return
    const availableIds = cycleOptions.map((option) => option.id)
    const fallback =
      cycles.find(
        (item) =>
          cycleSupportsCalibration(item) &&
          resolveCycleStatus(item) === 'current',
      )?.id ??
      cycleOptions[0]?.id ??
      ''
    const next = sanitizeCycleSelection(
      cycleId ? [cycleId] : [],
      availableIds,
      fallback,
    )[0]
    if (next && next !== cycleId) setCycleId(next)
  }, [cycleId, cycleOptions, cyclePicked, cycles])

  const loadPackets = useCallback(async (selectedCycleId: string) => {
    return fetchReviewPacketSummaries(selectedCycleId)
  }, [])

  const loadIndicatorContext = useCallback(
    async (selectedCycleId: string) => {
      const selected = cycles.find((item) => item.id === selectedCycleId)
      if (!selected) {
        return {
          history: [] as ReviewPacket[][],
          linked: new Map<string, ReviewPacket[]>(),
        }
      }
      const previous = previousCyclesOfSamePurpose(selected, cycles, 2)
      const linkedIds = annualSourceLinks(selected, cycles).map(
        (link) => link.sourceCycleId,
      )
      const [historyRows, linkedRows] = await Promise.all([
        Promise.all(previous.map((cycle) => loadPackets(cycle.id))),
        Promise.all(
          linkedIds.map(async (id) => [id, await loadPackets(id)] as const),
        ),
      ])
      return {
        history: historyRows,
        linked: new Map(linkedRows),
      }
    },
    [cycles, loadPackets],
  )

  useEffect(() => {
    if (!cycleId) {
      setPackets([])
      setHistoryPackets([])
      setLinkedPacketsByCycleId(new Map())
      setDataState('ready')
      setDataError(null)
      return
    }
    let cancelled = false
    setDataState('loading')
    setDataError(null)
    setPackets([])
    setHistoryPackets([])
    setLinkedPacketsByCycleId(new Map())
    void Promise.all([loadPackets(cycleId), loadIndicatorContext(cycleId)])
      .then(([nextPackets, context]) => {
        if (cancelled) return
        setPackets(nextPackets)
        setHistoryPackets(context.history)
        setLinkedPacketsByCycleId(context.linked)
        setDataState('ready')
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setPackets([])
        setHistoryPackets([])
        setLinkedPacketsByCycleId(new Map())
        setDataState('error')
        setDataError(
          error instanceof Error
            ? error.message
            : 'Could not load calibration.',
        )
      })
    return () => {
      cancelled = true
    }
  }, [cycleId, loadIndicatorContext, loadPackets])

  const retryLoad = useCallback(() => {
    if (!cycleId) return
    setDataState('loading')
    setDataError(null)
    void Promise.all([loadPackets(cycleId), loadIndicatorContext(cycleId)])
      .then(([nextPackets, context]) => {
        setPackets(nextPackets)
        setHistoryPackets(context.history)
        setLinkedPacketsByCycleId(context.linked)
        setDataState('ready')
      })
      .catch((error: unknown) => {
        setDataState('error')
        setDataError(
          error instanceof Error
            ? error.message
            : 'Could not load calibration.',
        )
      })
  }, [cycleId, loadIndicatorContext, loadPackets])

  const refreshLive = useCallback(
    (event: { cycleId?: string }) => {
      const target = event.cycleId ?? cycleId
      if (!target || (event.cycleId && event.cycleId !== cycleId)) return
      void Promise.all([loadPackets(target), loadIndicatorContext(target)])
        .then(([nextPackets, context]) => {
          setPackets(nextPackets)
          setHistoryPackets(context.history)
          setLinkedPacketsByCycleId(context.linked)
        })
        .catch(() => {
          /* Keep the last good snapshot. */
        })
    },
    [cycleId, loadIndicatorContext, loadPackets],
  )
  useLiveTopic('packets', refreshLive)

  const cycle = cycles.find((item) => item.id === cycleId) ?? null
  const cohortActive =
    departments.length > 0 ||
    teams.length > 0 ||
    markets.length > 0 ||
    jobLevels.length > 0
  const cohortEmployees = useMemo(() => {
    if (!cycle) return []
    const members = new Set(cycleMemberIds(cycle))
    return employees.filter(
      (employee) =>
        members.has(employee.employeeId) &&
        employeeMatchesCohort(employee, {
          department: departments,
          team: teams,
          market: markets,
          jobLevel: jobLevels,
        }),
    )
  }, [cycle, departments, employees, jobLevels, markets, teams])
  const cohortIds = useMemo(
    () => new Set(cohortEmployees.map((employee) => employee.employeeId)),
    [cohortEmployees],
  )
  const cohortOptions = useMemo(() => {
    if (!cycle) {
      return { departments: [], teams: [], markets: [], jobLevels: [] }
    }
    const members = new Set(cycleMemberIds(cycle))
    const people = employees.filter((employee) =>
      members.has(employee.employeeId),
    )
    return {
      departments: uniqueSortedValues(
        people.map((employee) => employee.department.trim() || '—'),
      ),
      teams: uniqueSortedValues(
        people.map((employee) => employee.team.trim() || '—'),
      ),
      markets: uniqueSortedValues(
        people.map((employee) => employee.site.trim() || '—'),
      ),
      jobLevels: sortJobLevels(people.map((employee) => jobLevelOf(employee.jobGrade))),
    }
  }, [cycle, employees])
  const cyclePackets = useMemo(
    () =>
      packets.filter((packet) => {
        if (!cycle || packet.cycleId !== cycle.id) return false
        return !cohortActive || cohortIds.has(packet.employeeId)
      }),
    [cohortActive, cohortIds, cycle, packets],
  )
  const distribution = useMemo(() => {
    if (!cycle) return null
    return buildRatingDistribution({
      cycle,
      employees,
      packets: cyclePackets,
      breakdown,
    })
  }, [breakdown, cycle, cyclePackets, employees])

  const indicators = useMemo(() => {
    if (!cycle) return []
    const previousCycle = previousCyclesOfSamePurpose(cycle, cycles, 1)[0]
    const promotedEmployeeIds = new Set(
      employees
        .filter((employee) => {
          if (!previousCycle) return false
          const day = employee.lastPromotionOn?.slice(0, 10)
          return Boolean(
            day &&
              day >= previousCycle.startDate &&
              day <= previousCycle.endDate,
          )
        })
        .map((employee) => employee.employeeId),
    )
    const pipEmployeeIds = new Set(
      employees
        .filter((employee) => employee.onPip)
        .map((employee) => employee.employeeId),
    )
    return buildCalibrationIndicators({
      cycle,
      cycles,
      employees: cohortEmployees,
      packets: cyclePackets,
      previousPackets: historyPackets,
      linkedPacketsByCycleId,
      promotedEmployeeIds,
      pipEmployeeIds,
    })
  }, [
    cohortEmployees,
    cycle,
    cyclePackets,
    cycles,
    employees,
    historyPackets,
    linkedPacketsByCycleId,
  ])

  const heatmap = useMemo(() => {
    if (!cycle) return { rows: [], orgAverageScore: null }
    return buildManagerRatingHeatmap({
      cycle,
      employees,
      packets: cyclePackets,
    })
  }, [cycle, cyclePackets, employees])

  const directoryLoading = loadState === 'idle' || loadState === 'loading'
  const waitingForDefaultCycle =
    !cyclePicked && cycleOptions.length > 0 && !cycleId
  const pageLoading =
    directoryLoading ||
    !cyclesHydrated ||
    waitingForDefaultCycle ||
    (Boolean(cycleId) && dataState !== 'ready' && dataState !== 'error')

  if (viewParam !== 'insights' && viewParam !== 'ratings') {
    return <Navigate to={calibrationTabPath('insights')} replace />
  }

  return (
    <div
      className="pd-page pd-page--pane pd-page--wide pd-people pd-calibration"
      aria-label="Calibration"
    >
      {cycleOptions.length > 0 ? (
        <div className="pd-people__header pd-people__header--bar">
          <div className="pd-cal-rt__filters">
            <CohortFilter
              label="Departments"
              emptyLabel="All Departments"
              options={cohortOptions.departments}
              values={departments}
              onChange={setDepartments}
            />
            <CohortFilter
              label="Teams"
              emptyLabel="All Teams"
              options={cohortOptions.teams}
              values={teams}
              onChange={setTeams}
            />
            <CohortFilter
              label="Markets"
              emptyLabel="All Markets"
              options={cohortOptions.markets}
              values={markets}
              onChange={setMarkets}
            />
            <CohortFilter
              label="Job levels"
              emptyLabel="All Job Levels"
              options={cohortOptions.jobLevels}
              values={jobLevels}
              onChange={setJobLevels}
            />
            {cohortActive ? (
              <button
                type="button"
                className="pd-people__ghost-btn"
                onClick={() => {
                  setDepartments([])
                  setTeams([])
                  setMarkets([])
                  setJobLevels([])
                }}
              >
                Reset
              </button>
            ) : null}
          </div>
          <div className="pd-people__bar-end">
            <CycleSelect
              label="Cycle"
              options={cycleOptions}
              value={cycleId}
              onChange={handleCycleChange}
              allowEmpty
              emptyLabel="Clear"
            />
          </div>
        </div>
      ) : null}

      {loadState === 'error' ? (
        <PageStatus
          variant="error"
          title="Could Not Load People"
          description={loadError ?? 'Reload and try again.'}
        />
      ) : dataState === 'error' ? (
        <PageStatus
          variant="error"
          title="Could Not Load Calibration"
          description={dataError ?? 'Reload and try again.'}
          action={<PageStatusRetry onClick={retryLoad} />}
        />
      ) : pageLoading ? (
        <PageStatus variant="loading" title="Loading Calibration" />
      ) : view === 'ratings' ? (
        !cycle ? (
          <EmptyState
            className="pd-people__empty-panel"
            icon={Scale}
            title={cycleOptions.length === 0 ? 'No Cycles Yet' : 'Pick A Cycle'}
            description={
              cycleOptions.length === 0
                ? 'Create a review cycle to start calibration.'
                : 'Choose a cycle to see the employee rating table.'
            }
          />
        ) : (
          <EmployeeRatingTable
            cycle={cycle}
            cycles={cycles}
            employees={employees}
            packets={cyclePackets}
            previousPackets={historyPackets[0] ?? []}
            historyPackets={historyPackets}
            linkedPacketsByCycleId={linkedPacketsByCycleId}
            indicators={indicators}
            departments={departments}
            teams={teams}
            markets={markets}
            jobLevels={jobLevels}
            onPacketUpdated={(next) => {
              setPackets((current) =>
                current.map((packet) =>
                  packet.id === next.id ? next : packet,
                ),
              )
            }}
          />
        )
      ) : !cycle ? (
        <EmptyState
          className="pd-people__empty-panel"
          icon={Scale}
          title={cycleOptions.length === 0 ? 'No Cycles Yet' : 'Pick A Cycle'}
          description={
            cycleOptions.length === 0
              ? 'Create a review cycle to start calibration.'
              : 'Choose a cycle to see the rating distribution.'
          }
        />
      ) : (
        <>
          {!distribution || distribution.summary.total === 0 ? (
            <EmptyState
              className="pd-people__empty-panel"
              icon={Scale}
              title="No Grades Yet"
              description="Rating distribution appears once people in this cycle have an official grade."
            />
          ) : (
            <RatingDistributionChart
              distribution={distribution}
              breakdown={breakdown}
              onBreakdownChange={setBreakdown}
            />
          )}
          <CalibrationIndicators
            indicators={indicators}
            employees={employees}
          />
          <ManagerRatingHeatmap heatmap={heatmap} />
          <RatingComparison
            cycle={cycle}
            employees={employees}
            packets={cyclePackets}
          />
          <SelfManagerRatingGrid
            cycle={cycle}
            employees={employees}
            packets={cyclePackets}
          />
        </>
      )}
    </div>
  )
}
