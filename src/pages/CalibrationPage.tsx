import { useCallback, useEffect, useMemo, useState } from 'react'
import { Scale, Users } from 'lucide-react'
import {
  CYCLE_SELECT_CLEAR_ID,
  CycleSelect,
  EmptyState,
  PageStatus,
  PageStatusRetry,
  sanitizeCycleSelection,
  SegmentedControl,
  type CycleSelectOption,
} from '@/components/ui'
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
import { annualSourceLinks } from '@/lib/reviews/annualQuarters'
import { fetchReviewPacketSummaries } from '@/lib/reviews/packetsApi'
import { cycleStatusLabel, resolveCycleStatus } from '@/lib/reviews/status'
import { formatDateRange } from '@/lib/reviews/periods'
import type { ReviewPacket } from '@/lib/reviews/types'
import {
  useReviewCyclesHydrated,
  useReviewsSnapshot,
} from '@/lib/reviews/useReviews'
import { CalibrationIndicators } from '@/pages/calibration/CalibrationIndicators'
import { ManagerRatingHeatmap } from '@/pages/calibration/ManagerRatingHeatmap'
import { RatingComparison } from '@/pages/calibration/RatingComparison'
import { RatingDistributionChart } from '@/pages/calibration/RatingDistributionChart'
import { SelfManagerRatingGrid } from '@/pages/calibration/SelfManagerRatingGrid'
import '@/styles/layout-people.css'
import '@/styles/layout-calibration.css'

const VIEWS = [
  { id: 'insights', label: 'Calibration Insights' },
  { id: 'ratings', label: 'Employee Rating Table' },
] as const

type CalibrationView = (typeof VIEWS)[number]['id']

export default function CalibrationPage() {
  const { employees, loadState, loadError } = useEmployees()
  const { cycles } = useReviewsSnapshot()
  const cyclesHydrated = useReviewCyclesHydrated()
  const [view, setView] = useState<CalibrationView>('insights')
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

  const cycleOptions = useMemo<CycleSelectOption[]>(
    () =>
      cycles.map((cycle) => {
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
      cycles.find((item) => resolveCycleStatus(item) === 'current')?.id ??
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
  const distribution = useMemo(() => {
    if (!cycle) return null
    return buildRatingDistribution({
      cycle,
      employees,
      packets: packets.filter((packet) => packet.cycleId === cycle.id),
      breakdown,
    })
  }, [breakdown, cycle, employees, packets])

  const indicators = useMemo(() => {
    if (!cycle) return []
    return buildCalibrationIndicators({
      cycle,
      cycles,
      employees,
      packets: packets.filter((packet) => packet.cycleId === cycle.id),
      previousPackets: historyPackets,
      linkedPacketsByCycleId,
    })
  }, [cycle, cycles, employees, historyPackets, linkedPacketsByCycleId, packets])

  const heatmap = useMemo(() => {
    if (!cycle) return { rows: [], orgAverageScore: null }
    return buildManagerRatingHeatmap({
      cycle,
      employees,
      packets: packets.filter((packet) => packet.cycleId === cycle.id),
    })
  }, [cycle, employees, packets])

  const directoryLoading = loadState === 'idle' || loadState === 'loading'
  const waitingForDefaultCycle =
    !cyclePicked && cycleOptions.length > 0 && !cycleId
  const pageLoading =
    directoryLoading ||
    !cyclesHydrated ||
    waitingForDefaultCycle ||
    (Boolean(cycleId) && dataState !== 'ready' && dataState !== 'error')

  return (
    <div
      className="pd-page pd-page--pane pd-page--wide pd-people pd-calibration"
      aria-label="Calibration"
    >
      <div className="pd-people__header pd-people__header--bar">
        <div className="pd-people__bar-start">
          <SegmentedControl
            options={VIEWS}
            value={view}
            onChange={setView}
            aria-label="Calibration view"
          />
        </div>
        <div className="pd-people__bar-end">
          {cycleOptions.length > 0 ? (
            <CycleSelect
              label="Cycle"
              options={cycleOptions}
              value={cycleId}
              onChange={handleCycleChange}
              allowEmpty
              emptyLabel="Clear"
            />
          ) : null}
        </div>
      </div>

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
        <EmptyState
          icon={Users}
          title="Employee Rating Table"
          description="This view is coming next."
        />
      ) : !cycle ? (
        <EmptyState
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
            packets={packets.filter((packet) => packet.cycleId === cycle.id)}
          />
          <SelfManagerRatingGrid
            cycle={cycle}
            employees={employees}
            packets={packets.filter((packet) => packet.cycleId === cycle.id)}
          />
        </>
      )}
    </div>
  )
}
