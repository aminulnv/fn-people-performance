import { useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Scale } from 'lucide-react'
import {
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
import {
  buildEmployeeRatingRows,
  employeeMatchesCohort,
  jobLevelOf,
  sortJobLevels,
  uniqueSortedValues,
} from '@/lib/calibration/ratingTable'
import { useEmployees } from '@/lib/employees/useEmployees'
import { cycleMemberIds } from '@/lib/reviews/cycleGroups'
import { cycleSupportsCalibration } from '@/lib/reviews/purpose'
import { annualSourceLinks } from '@/lib/reviews/annualQuarters'
import { formatDateRange } from '@/lib/reviews/periods'
import { cycleStatusLabel, resolveCycleStatus } from '@/lib/reviews/status'
import {
  usePatchReviewPacketCache,
  useReviewPacketSummaries,
  useReviewPacketSummariesForCycles,
} from '@/lib/reviews/useReviewPackets'
import { prefetchCalibrationSession } from '@/lib/calibration/useCalibrationSession'
import {
  useReviewCyclesHydrated,
  useReviewsSnapshot,
} from '@/lib/reviews/useReviews'
import { CalibrationEmployeePanelHost } from '@/pages/calibration/CalibrationEmployeePanelHost'
import { CalibrationIndicators } from '@/pages/calibration/CalibrationIndicators'
import { CalibrationSessionBadge } from '@/pages/calibration/CalibrationSessionBadge'
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
      searchPlaceholder={`Search ${label}`}
      noResultsText={`No ${label} Match`}
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
  const patchPacketCache = usePatchReviewPacketCache()
  const [breakdown, setBreakdown] = useState<RatingBreakdownId>('overall')
  const [cycleId, setCycleId] = useState('')
  const [cyclePicked, setCyclePicked] = useState(false)
  const [departments, setDepartments] = useState<string[]>([])
  const [teams, setTeams] = useState<string[]>([])
  const [markets, setMarkets] = useState<string[]>([])
  const [jobLevels, setJobLevels] = useState<string[]>([])
  const [managers, setManagers] = useState<string[]>([])
  const [panelEmployeeId, setPanelEmployeeId] = useState<number | null>(null)
  const [sittingEpoch, setSittingEpoch] = useState(0)

  useEffect(() => {
    setPanelEmployeeId(null)
  }, [cycleId])

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
  }

  useEffect(() => {
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
  }, [cycleId, cycleOptions, cycles])

  const cycle = cycles.find((item) => item.id === cycleId) ?? null
  const historyCycleIds = useMemo(() => {
    if (!cycle) return [] as string[]
    return previousCyclesOfSamePurpose(cycle, cycles, 3).map((item) => item.id)
  }, [cycle, cycles])
  const linkedCycleIds = useMemo(() => {
    if (!cycle) return [] as string[]
    return annualSourceLinks(cycle, cycles).map((link) => link.sourceCycleId)
  }, [cycle, cycles])
  const contextCycleIds = useMemo(
    () => [...historyCycleIds, ...linkedCycleIds],
    [historyCycleIds, linkedCycleIds],
  )

  const {
    data: packetsData,
    isPending: packetsPending,
    isError: packetsError,
    error: packetsQueryError,
    refetch: refetchPackets,
  } = useReviewPacketSummaries(cycleId || null)

  // History / linked summaries are non-blocking — wait until the paint-critical
  // cycle summaries land so they do not compete for bandwidth on cold load.
  const contextReady = packetsData !== undefined
  const {
    byCycleId: contextByCycleId,
    isError: contextError,
    error: contextQueryError,
  } = useReviewPacketSummariesForCycles(
    contextReady ? contextCycleIds : [],
  )

  // Sitting + calibrator assignments are cheap; warm as soon as the cycle is known.
  useEffect(() => {
    if (!cycleId) return
    prefetchCalibrationSession(cycleId)
  }, [cycleId])

  const packets = packetsData ?? []
  const historyPackets = useMemo(
    () =>
      historyCycleIds.map(
        (id) => contextByCycleId.get(id) ?? ([] as typeof packets),
      ),
    [contextByCycleId, historyCycleIds, packets],
  )
  const linkedPacketsByCycleId = useMemo(() => {
    const map = new Map<string, typeof packets>()
    for (const id of linkedCycleIds) {
      map.set(id, contextByCycleId.get(id) ?? [])
    }
    return map
  }, [contextByCycleId, linkedCycleIds, packets])

  const dataError =
    (packetsError && packetsData === undefined) ||
      (contextError && packetsData === undefined)
      ? ((packetsQueryError ?? contextQueryError) instanceof Error
        ? (packetsQueryError ?? contextQueryError)!.message
        : 'Could Not Load Calibration.')
      : null

  const retryLoad = () => {
    void refetchPackets()
  }
  const cohortActive =
    departments.length > 0 ||
    teams.length > 0 ||
    markets.length > 0 ||
    jobLevels.length > 0 ||
    managers.length > 0
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
          manager: managers,
        }),
    )
  }, [cycle, departments, employees, jobLevels, managers, markets, teams])
  const cohortIds = useMemo(
    () => new Set(cohortEmployees.map((employee) => employee.employeeId)),
    [cohortEmployees],
  )
  const cohortOptions = useMemo(() => {
    if (!cycle) {
      return {
        departments: [],
        teams: [],
        markets: [],
        jobLevels: [],
        managers: [],
      }
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
      managers: uniqueSortedValues(
        people.map((employee) => employee.reportsToName.trim() || '—'),
      ),
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

  const insightRows = useMemo(() => {
    if (!cycle) return []
    return buildEmployeeRatingRows({
      cycle,
      cycles,
      employees: cohortEmployees,
      packets: cyclePackets,
      previousPackets: historyPackets[0] ?? [],
      linkedPacketsByCycleId,
      indicators,
    })
  }, [
    cohortEmployees,
    cycle,
    cyclePackets,
    cycles,
    historyPackets,
    indicators,
    linkedPacketsByCycleId,
  ])

  const directoryLoading = loadState === 'idle' || loadState === 'loading'
  const waitingForDefaultCycle =
    !cyclePicked && cycleOptions.length > 0 && !cycleId
  const pageLoading =
    directoryLoading ||
    !cyclesHydrated ||
    waitingForDefaultCycle ||
    (Boolean(cycleId) && packetsPending && packetsData === undefined)

  if (viewParam !== 'insights' && viewParam !== 'ratings') {
    return <Navigate to={calibrationTabPath('insights')} replace />
  }

  return (
    <div
      className={
        view === 'ratings'
          ? 'pd-page pd-page--pane pd-page--wide pd-people pd-calibration'
          : 'pd-page pd-page--wide pd-people pd-calibration'
      }
      aria-label="Calibration"
    >
      {cycleOptions.length > 0 ? (
        <div className="pd-people__header pd-people__header--bar">
          <div className="pd-people__bar-start">
            <div className="pd-cal-rt__filters">
              <CycleSelect
                label="Cycle"
                options={cycleOptions}
                value={cycleId}
                onChange={handleCycleChange}
              />
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
                label="Job Levels"
                emptyLabel="All Job Levels"
                options={cohortOptions.jobLevels}
                values={jobLevels}
                onChange={setJobLevels}
              />
              <CohortFilter
                label="Managers"
                emptyLabel="All Managers"
                options={cohortOptions.managers}
                values={managers}
                onChange={setManagers}
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
                    setManagers([])
                  }}
                >
                  Reset
                </button>
              ) : null}
            </div>
          </div>
          {cycleId ? (
            <div className="pd-people__bar-end">
              <CalibrationSessionBadge
                cycleId={cycleId}
                onSittingChange={() =>
                  setSittingEpoch((epoch) => epoch + 1)
                }
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {loadState === 'error' ? (
        <PageStatus
          variant="error"
          title="Could Not Load People"
          description={loadError ?? 'Reload And Try Again.'}
        />
      ) : dataError ? (
        <PageStatus
          variant="error"
          title="Could Not Load Calibration"
          description={dataError}
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
                ? 'Create A Review Cycle To Start Calibration.'
                : 'Choose A Cycle To See The Employee Rating Table.'
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
            managers={managers}
            sittingEpoch={sittingEpoch}
            onPacketUpdated={patchPacketCache}
          />
        )
      ) : !cycle ? (
        <EmptyState
          className="pd-people__empty-panel"
          icon={Scale}
          title={cycleOptions.length === 0 ? 'No Cycles Yet' : 'Pick A Cycle'}
          description={
            cycleOptions.length === 0
              ? 'Create A Review Cycle To Start Calibration.'
              : 'Choose A Cycle To See The Rating Distribution.'
          }
        />
      ) : (
        <>
          {!distribution || distribution.summary.total === 0 ? (
            <EmptyState
              className="pd-people__empty-panel"
              icon={Scale}
              title="No Grades Yet"
              description="Rating Distribution Appears Once People In This Cycle Have An Official Grade."
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
            packets={cyclePackets}
            rows={insightRows}
            onSelectEmployee={setPanelEmployeeId}
          />
          <ManagerRatingHeatmap
            heatmap={heatmap}
            employees={employees}
            packets={cyclePackets}
            onSelectEmployee={setPanelEmployeeId}
          />
          <RatingComparison
            cycle={cycle}
            employees={employees}
            packets={cyclePackets}
          />
          <SelfManagerRatingGrid
            cycle={cycle}
            employees={employees}
            packets={cyclePackets}
            onSelectEmployee={setPanelEmployeeId}
          />
          {panelEmployeeId != null ? (
            <CalibrationEmployeePanelHost
              employeeId={panelEmployeeId}
              rows={insightRows}
              cycle={cycle}
              cycles={cycles}
              employees={employees}
              packets={cyclePackets}
              historyPackets={historyPackets}
              sittingEpoch={sittingEpoch}
              onClose={() => setPanelEmployeeId(null)}
              onPacketUpdated={patchPacketCache}
            />
          ) : null}
        </>
      )}
    </div>
  )
}
