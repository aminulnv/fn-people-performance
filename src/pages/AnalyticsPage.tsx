import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Building2,
  CircleCheck,
  CircleDashed,
  Clock3,
  Target,
  Users,
  type LucideIcon,
} from 'lucide-react'
import {
  CYCLE_SELECT_CLEAR_ID,
  CycleSelect,
  EmptyState,
  PageStatus,
  PageStatusRetry,
  Progress,
  ResizableTable,
  sanitizeCycleSelection,
  SegmentedControl,
  type CycleSelectOption,
  type ResizableColumn,
} from '@/components/ui'
import { useAuth } from '@/lib/auth'
import {
  buildAnalyticsDashboard,
  defaultAnalyticsScope,
  type AnalyticsDashboard,
  type AnalyticsScope,
} from '@/lib/analytics/dashboard'
import {
  analyticsScopeFromHash,
  hashForAnalyticsScope,
} from '@/lib/analytics/scope'
import { hasSystemPermission } from '@/lib/accessControl/types'
import { cx } from '@/lib/cx'
import {
  useHydrateManagerDelegations,
  useManagerDelegationsRevision,
} from '@/lib/delegations/useManagerDelegations'
import { viewerHasEffectiveReports } from '@/lib/delegations/roles'
import { fetchCycleGoalSubmissionsRemote } from '@/lib/goals/remoteApi'
import type { PersonGoals } from '@/lib/goals/types'
import { useEmployees } from '@/lib/employees/useEmployees'
import { useLiveTopic } from '@/lib/realtime/useLiveTopic'
import { fetchReviewPackets } from '@/lib/reviews/packetsApi'
import { cycleStatusLabel, resolveCycleStatus } from '@/lib/reviews/status'
import type { ReviewPacket } from '@/lib/reviews/types'
import {
  useReviewCyclesHydrated,
  useReviewsSnapshot,
} from '@/lib/reviews/useReviews'
import { useUrlHashTab } from '@/lib/routing/urlHash'
import '@/styles/layout-people.css'
import '@/styles/layout-analytics.css'

function formatDelta(points: number): string {
  if (points === 0) return 'on guideline'
  const signed = points > 0 ? `+${points}` : String(points)
  return `${signed} vs guideline`
}

function peopleLabel(count: number): string {
  return `${count} ${count === 1 ? 'person' : 'people'} in this view`
}

function AnalyticsSection({
  title,
  copy,
  label,
  table = false,
  children,
}: {
  title: string
  copy: string
  label: string
  table?: boolean
  children: ReactNode
}) {
  return (
    <section
      className={cx(
        'pd-analytics__section',
        table && 'pd-analytics__section--table',
      )}
      aria-label={label}
    >
      <header className="pd-analytics__section-head">
        <h2 className="pd-analytics__section-title">{title}</h2>
        <p className="pd-analytics__section-copy">{copy}</p>
      </header>
      {children}
    </section>
  )
}

function KpiTile({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number
  icon: LucideIcon
}) {
  return (
    <div className="pd-analytics__kpi">
      <span className="pd-analytics__kpi-label">
        <Icon size={14} strokeWidth={1.75} aria-hidden />
        {label}
      </span>
      <span className="pd-analytics__kpi-value">{value}</span>
    </div>
  )
}

function KpiGroup({
  title,
  label,
  tiles,
}: {
  title: string
  label: string
  tiles: { label: string; value: number; icon: LucideIcon }[]
}) {
  return (
    <section className="pd-analytics__kpis" aria-label={label}>
      <h2 className="pd-analytics__kpis-title">{title}</h2>
      <div className="pd-analytics__kpi-row">
        {tiles.map((tile) => (
          <KpiTile key={tile.label} {...tile} />
        ))}
      </div>
    </section>
  )
}

function DashboardBody({ dashboard }: { dashboard: AnalyticsDashboard }) {
  const reviewTiles = dashboard.reviews
    ? [
        {
          label: 'Not Started',
          value: dashboard.reviews.notStarted,
          icon: CircleDashed,
        },
        {
          label: 'In Progress',
          value: dashboard.reviews.inProgress,
          icon: Clock3,
        },
        {
          label: 'Waiting On Release',
          value: dashboard.reviews.waiting,
          icon: AlertTriangle,
        },
        {
          label: 'Released',
          value: dashboard.reviews.released,
          icon: CircleCheck,
        },
      ]
    : []
  const goalTiles = dashboard.goals
    ? [
        {
          label: 'Goals On File',
          value: dashboard.goals.withGoals,
          icon: Target,
        },
        {
          label: 'Missing',
          value: dashboard.goals.missing,
          icon: CircleDashed,
        },
        {
          label: 'Approved',
          value: dashboard.goals.approved,
          icon: CircleCheck,
        },
      ]
    : []

  return (
    <>
      {reviewTiles.length > 0 || goalTiles.length > 0 ? (
        <div
          className={cx(
            'pd-analytics__kpis-grid',
            reviewTiles.length > 0 &&
              goalTiles.length > 0 &&
              'pd-analytics__kpis-grid--paired',
          )}
        >
          {reviewTiles.length > 0 ? (
            <KpiGroup
              title="Reviews"
              label="Review Progress"
              tiles={reviewTiles}
            />
          ) : null}
          {goalTiles.length > 0 ? (
            <KpiGroup title="Goals" label="Goal Coverage" tiles={goalTiles} />
          ) : null}
        </div>
      ) : null}

      {dashboard.attention.length > 0 ? (
        <AnalyticsSection
          title="Needs Attention"
          copy="The queues that still change the cycle outcome."
          label="Needs Attention"
        >
          <div className="pd-analytics__attention">
            {dashboard.attention.map((item) => (
              <Link
                key={item.id}
                to={item.href}
                className="pd-analytics__attention-link"
                aria-label={`${item.title}, ${item.count}`}
              >
                <span className="pd-analytics__attention-count">
                  {item.count}
                </span>
                <span className="pd-analytics__attention-copy">
                  <span className="pd-analytics__attention-title">
                    {item.title}
                  </span>
                  <span className="pd-analytics__attention-why">{item.why}</span>
                </span>
              </Link>
            ))}
          </div>
        </AnalyticsSection>
      ) : null}

      {dashboard.pipeline.length > 0 || dashboard.gradeMix.length > 0 ? (
        <div className="pd-analytics__grid pd-analytics__grid--insights">
          {dashboard.pipeline.length > 0 ? (
            <AnalyticsSection
              title="Review Pipeline"
              copy="Where each packet sits right now - not a vanity completion score."
              label="Review Pipeline"
            >
              <div className="pd-analytics__pipeline">
                {dashboard.pipeline.map((step) => (
                  <div key={step.id} className="pd-analytics__pipe">
                    <div className="pd-analytics__pipe-meta">
                      <span>{step.label}</span>
                      <span className="pd-analytics__pipe-count">
                        {step.count}
                      </span>
                    </div>
                    <Progress
                      value={step.count}
                      max={Math.max(dashboard.memberCount, 1)}
                      aria-label={step.label}
                    />
                  </div>
                ))}
              </div>
            </AnalyticsSection>
          ) : null}

          {dashboard.gradeMix.length > 0 ? (
            <AnalyticsSection
              title="Grade Mix Vs Guideline"
              copy="Official grades against this cycle’s calibration bands."
              label="Grade Mix"
            >
              <div className="pd-analytics__grades">
                {dashboard.gradeMix.map((row) => (
                  <div key={row.id} className="pd-analytics__grade">
                    <div className="pd-analytics__grade-meta">
                      <span>
                        {row.label} · {row.count}
                      </span>
                      <span
                        className={cx(
                          'pd-analytics__grade-delta',
                          Math.abs(row.deltaPoints) >= 5 && 'is-off',
                        )}
                      >
                        {row.percent}% · {formatDelta(row.deltaPoints)}
                      </span>
                    </div>
                    <Progress
                      value={row.percent}
                      aria-label={`${row.label} share`}
                    />
                  </div>
                ))}
              </div>
              <p className="pd-analytics__hint">
                Guideline is the cycle calibration target, not a forced curve.
              </p>
            </AnalyticsSection>
          ) : null}
        </div>
      ) : null}

      {dashboard.departments.length > 0 || dashboard.managers.length > 0 ? (
        <div className="pd-analytics__grid pd-analytics__grid--tables">
          {dashboard.departments.length > 0 ? (
            <AnalyticsSection
              title="Departments Behind"
              copy="Sorted by reviews still open. Waiting means submitted or in calibration."
              label="Departments"
              table
            >
              <div className="pd-people__table-wrap">
                <ResizableTable
                  className="pd-people__table"
                  storageKey="analytics-departments-column-widths-v1"
                  columns={DEPARTMENT_COLUMNS}
                >
                  <tbody>
                    {dashboard.departments.map((row) => (
                      <tr key={row.name}>
                        <td>
                          <span className="pd-people__person-name">
                            <Building2
                              size={14}
                              strokeWidth={1.75}
                              aria-hidden
                            />{' '}
                            {row.name}
                          </span>
                        </td>
                        <td>{row.people}</td>
                        <td>{row.notStarted}</td>
                        <td>{row.inProgress}</td>
                        <td>{row.waiting}</td>
                        <td>{row.released}</td>
                        <td>{row.unfinishedPercent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </ResizableTable>
              </div>
            </AnalyticsSection>
          ) : null}

          {dashboard.managers.length > 0 ? (
            <AnalyticsSection
              title="Managers To Follow Up"
              copy="Line managers with the most reviews still not submitted."
              label="Managers"
              table
            >
              <div className="pd-people__table-wrap">
                <ResizableTable
                  className="pd-people__table"
                  storageKey="analytics-managers-column-widths-v1"
                  columns={MANAGER_COLUMNS}
                >
                  <tbody>
                    {dashboard.managers.map((row) => (
                      <tr key={row.employeeId}>
                        <td>
                          <Link
                            to={`/people/${row.employeeId}`}
                            className="pd-people__person-link"
                          >
                            {row.name}
                          </Link>
                        </td>
                        <td>{row.teamSize}</td>
                        <td>{row.notStarted}</td>
                        <td>{row.inProgress}</td>
                        <td>{row.unfinished}</td>
                      </tr>
                    ))}
                  </tbody>
                </ResizableTable>
              </div>
            </AnalyticsSection>
          ) : null}
        </div>
      ) : null}
    </>
  )
}

const DEPARTMENT_COLUMNS: ResizableColumn[] = [
  { id: 'department', label: 'Department', grow: true, minWidth: 160 },
  { id: 'people', label: 'People', minWidth: 72 },
  { id: 'not-started', label: 'Not Started', minWidth: 96 },
  { id: 'in-progress', label: 'In Progress', minWidth: 96 },
  { id: 'waiting', label: 'Waiting', minWidth: 88 },
  { id: 'released', label: 'Released', minWidth: 88 },
  { id: 'unfinished', label: 'Still Open', minWidth: 88 },
]

const MANAGER_COLUMNS: ResizableColumn[] = [
  { id: 'manager', label: 'Manager', grow: true, minWidth: 160 },
  { id: 'team', label: 'Reviews', minWidth: 80 },
  { id: 'not-started', label: 'Not Started', minWidth: 96 },
  { id: 'in-progress', label: 'In Progress', minWidth: 96 },
  { id: 'unfinished', label: 'Still Open', minWidth: 88 },
]

export default function AnalyticsPage() {
  const { user } = useAuth()
  const { employees, loadState, loadError } = useEmployees()
  const { cycles } = useReviewsSnapshot()
  const cyclesHydrated = useReviewCyclesHydrated()
  const coversRevision = useManagerDelegationsRevision()
  useHydrateManagerDelegations(user?.employeeId ?? undefined)

  const me = useMemo(() => {
    const email = user?.email?.trim().toLowerCase()
    if (!email) return null
    return (
      employees.find(
        (employee) => employee.email.trim().toLowerCase() === email,
      ) ?? null
    )
  }, [employees, user?.email])

  const hasDirectReports = useMemo(
    () => (me ? viewerHasEffectiveReports(me, employees) : false),
    [coversRevision, employees, me],
  )
  const canReadAll = hasSystemPermission(user?.permissions, 'platform.read_all')
  const hasDepartment = Boolean(me?.department.trim())

  const scopeOptions = useMemo(() => {
    const options: { id: AnalyticsScope; label: string }[] = [
      { id: 'all', label: 'Everyone' },
    ]
    if (hasDirectReports) options.push({ id: 'reports', label: 'My Reports' })
    if (hasDepartment) options.push({ id: 'department', label: 'My Department' })
    if (me) options.push({ id: 'mine', label: 'Me' })
    return options
  }, [hasDepartment, hasDirectReports, me])

  const defaultScope = defaultAnalyticsScope({
    canReadAll,
    hasDirectReports,
    hasDepartment,
  })
  const [scope, setScope] = useUrlHashTab<AnalyticsScope>({
    defaultTab: defaultScope,
    tabFromHash: analyticsScopeFromHash,
    hashFromTab: hashForAnalyticsScope,
    enabled: Boolean(me),
  })
  const visibleScope = scopeOptions.some((option) => option.id === scope)
    ? scope
    : defaultScope

  const cycleOptions = useMemo<CycleSelectOption[]>(
    () =>
      cycles.map((cycle) => {
        const status = resolveCycleStatus(cycle)
        return {
          id: cycle.id,
          label: cycle.name,
          status,
          statusLabel: cycleStatusLabel(status),
        }
      }),
    [cycles],
  )

  const [cycleId, setCycleId] = useState('')
  const [cyclePicked, setCyclePicked] = useState(false)
  const [packets, setPackets] = useState<ReviewPacket[]>([])
  const [submissions, setSubmissions] = useState<PersonGoals[]>([])
  const [dataState, setDataState] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle')
  const [dataError, setDataError] = useState<string | null>(null)

  function handleCycleChange(nextId: string) {
    setCyclePicked(true)
    setCycleId(nextId)
    if (!nextId) {
      setPackets([])
      setSubmissions([])
      setDataState('ready')
      setDataError(null)
      return
    }
    setDataState('loading')
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

  const loadCycleData = useCallback(async (selectedCycleId: string) => {
    const [nextPackets, nextSubmissions] = await Promise.all([
      fetchReviewPackets(selectedCycleId),
      fetchCycleGoalSubmissionsRemote(selectedCycleId).catch(() => []),
    ])
    return { packets: nextPackets, submissions: nextSubmissions }
  }, [])

  const applyCycleData = useCallback(
    (result: { packets: ReviewPacket[]; submissions: PersonGoals[] }) => {
      setPackets(result.packets)
      setSubmissions(result.submissions)
      setDataState('ready')
      setDataError(null)
    },
    [],
  )

  useEffect(() => {
    if (!cycleId) {
      setPackets([])
      setSubmissions([])
      setDataState('ready')
      setDataError(null)
      return
    }
    let cancelled = false
    setDataState('loading')
    setDataError(null)
    setPackets([])
    setSubmissions([])
    void loadCycleData(cycleId)
      .then((result) => {
        if (cancelled) return
        applyCycleData(result)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setPackets([])
        setSubmissions([])
        setDataState('error')
        setDataError(
          error instanceof Error
            ? error.message
            : 'Could not load cycle analytics.',
        )
      })
    return () => {
      cancelled = true
    }
  }, [applyCycleData, cycleId, loadCycleData])

  const retryLoad = useCallback(() => {
    if (!cycleId) return
    setDataState('loading')
    setDataError(null)
    void loadCycleData(cycleId)
      .then(applyCycleData)
      .catch((error: unknown) => {
        setDataState('error')
        setDataError(
          error instanceof Error
            ? error.message
            : 'Could not load cycle analytics.',
        )
      })
  }, [applyCycleData, cycleId, loadCycleData])

  const refreshLive = useCallback(
    (event: { cycleId?: string }) => {
      const target = event.cycleId ?? cycleId
      if (!target || (event.cycleId && event.cycleId !== cycleId)) return
      void loadCycleData(target)
        .then(applyCycleData)
        .catch(() => {
          /* Keep the last good snapshot. */
        })
    },
    [applyCycleData, cycleId, loadCycleData],
  )
  useLiveTopic('packets', refreshLive)
  useLiveTopic('goals', refreshLive)

  const cycle = cycles.find((item) => item.id === cycleId) ?? null
  const dashboard = useMemo(() => {
    if (!cycle) return null
    return buildAnalyticsDashboard({
      cycle,
      employees,
      packets: packets.filter((packet) => packet.cycleId === cycle.id),
      submissions,
      scope: visibleScope,
      viewer: me,
      reviewsHref: '/reviews',
      goalsHref: '/goals',
    })
  }, [coversRevision, cycle, employees, me, packets, submissions, visibleScope])

  const directoryLoading = loadState === 'idle' || loadState === 'loading'
  if (loadState === 'error') {
    return (
      <PageStatus
        variant="error"
        title="Could Not Load People"
        description={loadError ?? 'Reload and try again.'}
      />
    )
  }
  if (dataState === 'error') {
    return (
      <PageStatus
        variant="error"
        title="Could Not Load Analytics"
        description={dataError ?? 'Reload and try again.'}
        action={<PageStatusRetry onClick={retryLoad} />}
      />
    )
  }
  const waitingForDefaultCycle =
    !cyclePicked && cycleOptions.length > 0 && !cycleId
  if (
    directoryLoading ||
    !cyclesHydrated ||
    waitingForDefaultCycle ||
    (Boolean(cycleId) && dataState !== 'ready')
  ) {
    return <PageStatus variant="loading" title="Loading Analytics" />
  }

  const hasRoster = Boolean(dashboard && dashboard.memberCount > 0)

  return (
    <div className="pd-page pd-page--wide pd-analytics" aria-label="Analytics">
      <div className="pd-analytics__toolbar">
        <div className="pd-analytics__toolbar-start">
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
          {scopeOptions.length > 1 ? (
            <SegmentedControl
              className="pd-people__scope"
              buttonClassName="pd-people__scope-btn"
              aria-label="Analytics scope"
              options={scopeOptions}
              value={visibleScope}
              onChange={setScope}
            />
          ) : null}
        </div>
        {dashboard ? (
          <p className="pd-analytics__stat">{peopleLabel(dashboard.memberCount)}</p>
        ) : null}
      </div>

      {!cycle ? (
        <EmptyState
          icon={Users}
          title={cycleOptions.length === 0 ? 'No Cycles Yet' : 'Pick A Cycle'}
          description={
            cycleOptions.length === 0
              ? 'Create a review cycle to start tracking goals and reviews.'
              : 'Choose a cycle to see goals and reviews.'
          }
        />
      ) : !hasRoster ? (
        <EmptyState
          icon={Users}
          title="No One In This View"
          description="This cycle has no matching people for the selected scope."
        />
      ) : dashboard ? (
        <DashboardBody dashboard={dashboard} />
      ) : null}
    </div>
  )
}
