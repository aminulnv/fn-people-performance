import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  Flag,
} from 'lucide-react'
import {
  Avatar,
  ListboxSelect,
  PageStatus,
  SegmentedControl,
  Textarea,
} from '@/components/ui'
import { cx } from '@/lib/cx'
import { officialGrade } from '@/lib/analytics/dashboard'
import {
  formatGapLabel,
  GRADE_SHORT_LABEL,
  type RatingTableRow,
} from '@/lib/calibration/ratingTable'
import {
  gradeTierDelta,
  monthsBetweenDates,
  previousCyclesOfSamePurpose,
} from '@/lib/calibration/indicators'
import {
  saveCalibrationSittingEmployee,
  type CalibrationSitting,
  type CalibrationSittingEmployee,
  type CalibrationSittingStatus,
} from '@/lib/calibration/sessionApi'
import type { PlatformEmployee } from '@/lib/employees/types'
import { pipStatusLabel } from '@/lib/employees/career'
import { PipDisplayOnlyMark } from '@/pages/profile/PipDisplayOnlyMark'
import { annualSourceLinks } from '@/lib/reviews/annualQuarters'
import { resolveCyclePolicyForPerson } from '@/lib/reviews/cycleGroups'
import { GRADE_BAND_META, OVERALL_GRADE_ORDER } from '@/lib/reviews/labels'
import {
  calibrateReviewPacket,
  fetchReviewPacket,
} from '@/lib/reviews/packetsApi'
import { scoreForBand } from '@/lib/reviews/rollup'
import { listScorecardForms } from '@/lib/reviews/scorecardFormsStore'
import type {
  GradeBandId,
  ReviewCycle,
  ReviewPacket,
  ReviewPillarScore,
} from '@/lib/reviews/types'
import { SettingsSidePanel } from '@/pages/reviews/SettingsSidePanel'
import '@/styles/layout-reviews.css'

const DRAWER_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'self', label: 'Self-Review' },
  { id: 'manager', label: 'Manager Review' },
  { id: 'history', label: 'Rating History' },
  { id: 'calibration', label: 'Calibration' },
] as const

type DrawerTabId = (typeof DRAWER_TABS)[number]['id']

const CALIBRATION_STATUS_OPTIONS = [
  { value: 'not_reviewed', label: 'Not Reviewed' },
  { value: 'discussed', label: 'Discussed' },
  { value: 'confirmed', label: 'Confirmed' },
] as const

type CalibrationSessionStatus = CalibrationSittingStatus

type CalibrationEmployeeDrawerProps = {
  row: RatingTableRow
  employee: PlatformEmployee | undefined
  cycle: ReviewCycle
  cycles: readonly ReviewCycle[]
  summaryPacket: ReviewPacket | null
  historyPackets: readonly (readonly ReviewPacket[])[]
  onClose: () => void
  onPacketUpdated: (packet: ReviewPacket) => void
  sittingEmployee: CalibrationSittingEmployee | null
  sittingReady: boolean
  sessionLocked: boolean
  canOverride: boolean
  onSittingSaved: (sitting: CalibrationSitting) => void
  onRatingAdjusted: () => void
}

function GradePill({
  grade,
  compact = false,
}: {
  grade: GradeBandId | null | undefined
  compact?: boolean
}) {
  if (!grade) return <span className="pd-cal-drawer__muted">—</span>
  return (
    <span
      className={cx(
        'pd-cal-rt__grade',
        `is-${grade}`,
        compact && 'is-compact',
      )}
      title={GRADE_BAND_META[grade].label}
    >
      {compact ? GRADE_SHORT_LABEL[grade] : GRADE_BAND_META[grade].label}
    </span>
  )
}

function bandBarWidth(grade: GradeBandId | null | undefined): string {
  if (!grade) return '0%'
  return `${(scoreForBand(grade) / 5) * 100}%`
}

function formatTenureMonths(months: number): string {
  const safe = Math.max(0, months)
  const years = Math.floor(safe / 12)
  const rem = safe % 12
  if (years <= 0) return `${rem}m`
  if (rem <= 0) return `${years}y`
  return `${years}y ${rem}m`
}

function pillarGrade(
  scores: readonly ReviewPillarScore[],
  pillarId: string,
  actor: 'self' | 'manager',
): GradeBandId | null {
  return (
    scores.find(
      (score) => score.pillarId === pillarId && score.actorRole === actor,
    )?.grade ?? null
  )
}

function pillarComment(
  scores: readonly ReviewPillarScore[],
  actor: 'self' | 'manager',
): string {
  const comments = scores
    .filter((score) => score.actorRole === actor && score.comment.trim())
    .map((score) => score.comment.trim())
  return comments[0] ?? ''
}

function narrativeFromAnswers(
  packet: ReviewPacket | null,
  actor: 'self' | 'manager',
): string {
  if (!packet) return ''
  const bodies = packet.answers
    .filter((answer) => answer.actorRole === actor && answer.body.trim())
    .map((answer) => answer.body.trim())
  return bodies[0] ?? pillarComment(packet.pillarScores, actor)
}

export function CalibrationEmployeeDrawer({
  row,
  employee,
  cycle,
  cycles,
  summaryPacket,
  historyPackets,
  onClose,
  onPacketUpdated,
  sittingEmployee,
  sittingReady,
  sessionLocked,
  canOverride,
  onSittingSaved,
  onRatingAdjusted,
}: CalibrationEmployeeDrawerProps) {
  const [tab, setTab] = useState<DrawerTabId>('overview')
  const [packet, setPacket] = useState<ReviewPacket | null>(summaryPacket)
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle',
  )
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sessionStatus, setSessionStatus] =
    useState<CalibrationSessionStatus>('not_reviewed')
  const [sessionNotes, setSessionNotes] = useState('')
  const [overrideGrade, setOverrideGrade] = useState<GradeBandId | ''>(
    row.annualGrade ?? '',
  )
  const [overrideReason, setOverrideReason] = useState('')
  const [overrideSaving, setOverrideSaving] = useState(false)
  const [overrideError, setOverrideError] = useState<string | null>(null)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [overrideOpen, setOverrideOpen] = useState(false)

  useEffect(() => {
    setTab('overview')
    setPacket(summaryPacket)
    setOverrideGrade(row.annualGrade ?? '')
    setOverrideReason('')
    setOverrideError(null)
    setOverrideOpen(false)
  }, [row.employeeId, summaryPacket, row.annualGrade])

  useEffect(() => {
    setSessionStatus(sittingEmployee?.status ?? 'not_reviewed')
    setSessionNotes(sittingEmployee?.notes ?? '')
    setSessionError(null)
  }, [row.employeeId, sittingEmployee?.notes, sittingEmployee?.status])

  useEffect(() => {
    if (!sittingReady || sessionLocked) return
    const savedNotes = sittingEmployee?.notes ?? ''
    if (sessionNotes === savedNotes) return
    const handle = window.setTimeout(() => {
      void saveCalibrationSittingEmployee(cycle.id, row.employeeId, {
        status: sessionStatus,
        notes: sessionNotes,
      })
        .then((next) => {
          setSessionError(null)
          onSittingSaved(next)
        })
        .catch((error: unknown) => {
          setSessionError(
            error instanceof Error
              ? error.message
              : 'Could not save the calibration notes.',
          )
        })
    }, 500)
    return () => window.clearTimeout(handle)
  }, [
    cycle.id,
    onSittingSaved,
    row.employeeId,
    sessionNotes,
    sessionStatus,
    sittingEmployee?.notes,
    sittingReady,
    sessionLocked,
  ])

  useEffect(() => {
    let cancelled = false
    setLoadState('loading')
    setLoadError(null)
    void fetchReviewPacket(cycle.id, row.employeeId)
      .then((next) => {
        if (cancelled) return
        setPacket(next)
        setLoadState('ready')
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setLoadState('error')
        setLoadError(
          error instanceof Error
            ? error.message
            : 'Could not load review packet.',
        )
      })
    return () => {
      cancelled = true
    }
  }, [cycle.id, row.employeeId])

  const policy = useMemo(
    () => resolveCyclePolicyForPerson(cycle, row.employeeId, listScorecardForms()),
    [cycle, row.employeeId],
  )
  const pillars = useMemo(
    () =>
      (policy.settings.reviewPolicy?.scorecard.pillars ?? []).filter(
        (pillar) => pillar.enabled,
      ),
    [policy],
  )

  const metaLine = [
    row.department !== '—' ? row.department : null,
    row.market !== '—' ? row.market : null,
    row.jobGrade !== '—' ? row.jobGrade : null,
    row.managerName !== '—' ? row.managerName : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const gapLabel =
    row.gapTiers == null || row.gapTiers === 0
      ? 'Aligned'
      : formatGapLabel(row.gapTiers)

  const flagCount = row.flags.length
  const tabOptions = useMemo(
    () =>
      DRAWER_TABS.map((item) =>
        item.id === 'calibration' && flagCount > 0
          ? {
              id: item.id,
              label: (
                <span className="pd-org-role__tab-label">
                  Calibration
                  <span className="pd-org-role__tab-badge pd-cal-drawer__tab-badge">
                    {flagCount}
                  </span>
                </span>
              ),
            }
          : item,
      ),
    [flagCount],
  )

  const historyRows = useMemo(() => {
    const previousCycles = previousCyclesOfSamePurpose(cycle, cycles, 3)
    const entries: Array<{
      cycleId: string
      yearLabel: string
      grade: GradeBandId | null
      delta: number | null
    }> = []
    const currentGrade = officialGrade(packet) ?? row.annualGrade
    entries.push({
      cycleId: cycle.id,
      yearLabel: cycle.yearKey ?? cycle.startDate.slice(0, 4) ?? cycle.name,
      grade: currentGrade,
      delta: null,
    })
    previousCycles.forEach((prev, index) => {
      const packets = historyPackets[index] ?? []
      const prevPacket = packets.find(
        (item) => item.employeeId === row.employeeId,
      )
      const grade = officialGrade(prevPacket)
      const newerGrade = entries[entries.length - 1]?.grade ?? null
      entries.push({
        cycleId: prev.id,
        yearLabel: prev.yearKey ?? prev.startDate.slice(0, 4) ?? prev.name,
        grade,
        delta: gradeTierDelta(grade, newerGrade),
      })
    })
    return entries
  }, [cycle, cycles, historyPackets, packet, row.annualGrade, row.employeeId])

  const hasAnnualQuarters = annualSourceLinks(cycle, [...cycles]).length > 0
  const todayIso = new Date().toISOString().slice(0, 10)
  const tenureMonths = employee?.startDate
    ? monthsBetweenDates(employee.startDate, todayIso)
    : 0

  async function saveOverride() {
    if (!packet || !overrideGrade || !overrideReason.trim() || sessionLocked || !canOverride) return
    setOverrideSaving(true)
    setOverrideError(null)
    try {
      const next = await calibrateReviewPacket(packet.id, {
        toGrade: overrideGrade,
        reason: overrideReason.trim(),
      })
      setPacket(next)
      onPacketUpdated(next)
      onRatingAdjusted()
      setOverrideOpen(false)
    } catch (error: unknown) {
      setOverrideError(
        error instanceof Error ? error.message : 'Could not save override.',
      )
    } finally {
      setOverrideSaving(false)
    }
  }

  const selfGrade = packet?.selfOverallGrade ?? row.selfGrade
  const managerGrade = packet?.managerOverallGrade ?? null
  const finalGrade = officialGrade(packet) ?? row.annualGrade
  const selfNarrative = narrativeFromAnswers(packet, 'self')
  const managerNarrative = narrativeFromAnswers(packet, 'manager')

  return (
    <SettingsSidePanel
      label={row.fullName}
      closeLabel="Close employee calibration"
      fitContent
      onClose={onClose}
      title={
        <div className="pd-cal-drawer__title-block">
          <h2 className="pd-settings-panel__title">{row.fullName}</h2>
          {metaLine ? (
            <p className="pd-cal-drawer__title-meta">{metaLine}</p>
          ) : null}
        </div>
      }
      tools={
        <Link
          to={`/people/${row.employeeId}`}
          className="pd-people__ghost-btn"
        >
          Full profile
        </Link>
      }
      subnav={
        <SegmentedControl
          className="pd-cal-drawer__tabs"
          options={tabOptions}
          value={tab}
          onChange={setTab}
          aria-label="Employee calibration sections"
        />
      }
    >
      <div className="pd-cal-drawer">
        <header className="pd-cal-drawer__summary">
          <div className="pd-cal-drawer__person">
            <Avatar
              name={row.fullName}
              src={employee?.avatarUrl}
              size="lg"
            />
            <div className="pd-cal-drawer__person-copy">
              <strong>{row.fullName}</strong>
              <span>{metaLine || '—'}</span>
            </div>
          </div>
          <ul className="pd-cal-drawer__metrics">
            <li>
              <span>Final rating</span>
              <GradePill grade={finalGrade} />
            </li>
            <li>
              <span>Self-rating</span>
              <GradePill grade={selfGrade} />
            </li>
            <li>
              <span>Gap</span>
              <strong
                className={cx(
                  'pd-cal-drawer__gap',
                  row.gapTiers != null &&
                    row.gapTiers !== 0 &&
                    (row.gapTiers < 0 ? 'is-self' : 'is-mgr'),
                  (row.gapTiers == null || row.gapTiers === 0) && 'is-aligned',
                )}
              >
                {row.gapTiers == null || row.gapTiers === 0 ? (
                  <>
                    <Check size={14} strokeWidth={2.25} aria-hidden />
                    Aligned
                  </>
                ) : (
                  gapLabel
                )}
              </strong>
            </li>
          </ul>
        </header>

        {loadState === 'loading' && !packet ? (
          <PageStatus variant="loading" title="Loading Review" />
        ) : loadState === 'error' && !packet ? (
          <PageStatus
            variant="error"
            title="Could Not Load Review"
            description={loadError ?? 'Try again.'}
          />
        ) : null}

        {tab === 'overview' ? (
          <div className="pd-cal-drawer__stack">
            {hasAnnualQuarters ? (
              <section className="pd-cal-drawer__card" aria-label="Quarterly ratings">
                <h3 className="pd-cal-drawer__section-title">
                  Quarterly goal ratings
                </h3>
                <ul className="pd-cal-drawer__quarter-bars">
                  {row.quarters.map((quarter) => (
                    <li key={quarter.sourceCycleId}>
                      <span>{quarter.shortLabel}</span>
                      <div className="pd-cal-drawer__track">
                        <span
                          className={cx(
                            'pd-cal-drawer__fill',
                            quarter.grade && `is-${quarter.grade}`,
                          )}
                          style={{ width: bandBarWidth(quarter.grade) }}
                        />
                      </div>
                      <GradePill grade={quarter.grade} compact />
                    </li>
                  ))}
                  <li>
                    <span>Annual</span>
                    <div className="pd-cal-drawer__track">
                      <span
                        className={cx(
                          'pd-cal-drawer__fill',
                          finalGrade && `is-${finalGrade}`,
                        )}
                        style={{ width: bandBarWidth(finalGrade) }}
                      />
                    </div>
                    <GradePill grade={finalGrade} compact />
                  </li>
                </ul>
              </section>
            ) : null}

            <section className="pd-cal-drawer__card" aria-label="Rating breakdown">
              <h3 className="pd-cal-drawer__section-title">Rating breakdown</h3>
              <ul className="pd-cal-drawer__pillar-list">
                {pillars.map((pillar) => {
                  const grade =
                    pillarGrade(packet?.pillarScores ?? [], pillar.id, 'manager') ??
                    pillarGrade(packet?.pillarScores ?? [], pillar.id, 'self')
                  return (
                    <li key={pillar.id}>
                      <div>
                        <strong>{pillar.label}</strong>
                        <span>{pillar.weight}% weight</span>
                      </div>
                      <GradePill grade={grade} />
                    </li>
                  )
                })}
              </ul>
              <div className="pd-cal-drawer__final-row">
                <span>Final annual rating</span>
                <GradePill grade={finalGrade} />
              </div>
            </section>

            <section className="pd-cal-drawer__card" aria-label="Self vs manager">
              <h3 className="pd-cal-drawer__section-title">
                Self vs manager comparison
              </h3>
              <ul className="pd-cal-drawer__compare">
                <li>
                  <span>Self-rating</span>
                  <div className="pd-cal-drawer__track">
                    <span
                      className={cx(
                        'pd-cal-drawer__fill is-self-bar',
                        selfGrade && `is-${selfGrade}`,
                      )}
                      style={{ width: bandBarWidth(selfGrade) }}
                    />
                  </div>
                  <GradePill grade={selfGrade} compact />
                </li>
                <li>
                  <span>Mgr rating</span>
                  <div className="pd-cal-drawer__track">
                    <span
                      className={cx(
                        'pd-cal-drawer__fill',
                        managerGrade && `is-${managerGrade}`,
                      )}
                      style={{ width: bandBarWidth(managerGrade) }}
                    />
                  </div>
                  <GradePill grade={managerGrade} compact />
                </li>
              </ul>
              <p
                className={cx(
                  'pd-cal-drawer__compare-note',
                  row.gapTiers != null &&
                    row.gapTiers !== 0 &&
                    (row.gapTiers < 0 ? 'is-self' : 'is-mgr'),
                )}
              >
                {row.gapTiers == null || row.gapTiers === 0
                  ? 'Aligned'
                  : row.gapTiers < 0
                    ? `Self-rated ${Math.abs(row.gapTiers)} tier${Math.abs(row.gapTiers) === 1 ? '' : 's'} higher`
                    : `Manager rated ${row.gapTiers} tier${row.gapTiers === 1 ? '' : 's'} higher`}
              </p>
            </section>
          </div>
        ) : null}

        {tab === 'self' ? (
          <div className="pd-cal-drawer__stack">
            <section className="pd-cal-drawer__card">
              <div className="pd-cal-drawer__final-row">
                <span>Annual self-rating</span>
                <GradePill grade={selfGrade} />
              </div>
            </section>
            <section className="pd-cal-drawer__card">
              <h3 className="pd-cal-drawer__section-title">
                Self-ratings by pillar
              </h3>
              <ul className="pd-cal-drawer__pillar-list">
                {pillars.map((pillar) => (
                  <li key={pillar.id}>
                    <div>
                      <strong>{pillar.label}</strong>
                      <span>
                        {pillar.id === 'goals'
                          ? 'Based on Q1–Q4 reflection'
                          : pillar.id === 'skills'
                            ? 'Own assessment of competency level'
                            : 'Own assessment across values'}
                      </span>
                    </div>
                    <GradePill
                      grade={pillarGrade(
                        packet?.pillarScores ?? [],
                        pillar.id,
                        'self',
                      )}
                    />
                  </li>
                ))}
              </ul>
            </section>
            <section className="pd-cal-drawer__card">
              <h3 className="pd-cal-drawer__section-title">Full year narrative</h3>
              <p className="pd-cal-drawer__eyebrow">Written by employee</p>
              <blockquote className="pd-cal-drawer__quote">
                {selfNarrative || 'No self narrative submitted yet.'}
              </blockquote>
            </section>
            {hasAnnualQuarters ? (
              <section className="pd-cal-drawer__card">
                <h3 className="pd-cal-drawer__section-title">
                  Goals — quarterly history
                </h3>
                <ul className="pd-cal-drawer__history-list">
                  {row.quarters.map((quarter) => (
                    <li key={quarter.sourceCycleId}>
                      <span>{quarter.label}</span>
                      <GradePill grade={quarter.grade} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}

        {tab === 'manager' ? (
          <div className="pd-cal-drawer__stack">
            <p className="pd-cal-drawer__eyebrow">
              Manager: {row.managerName !== '—' ? row.managerName : 'Unassigned'}
            </p>
            <section className="pd-cal-drawer__card pd-cal-drawer__card--accent">
              <div className="pd-cal-drawer__final-row">
                <span>Final rating given by manager</span>
                <GradePill grade={managerGrade ?? finalGrade} />
              </div>
            </section>
            <section className="pd-cal-drawer__card">
              <h3 className="pd-cal-drawer__section-title">Ratings by pillar</h3>
              <ul className="pd-cal-drawer__pillar-list">
                {pillars.map((pillar) => {
                  const grade = pillarGrade(
                    packet?.pillarScores ?? [],
                    pillar.id,
                    'manager',
                  )
                  return (
                    <li key={pillar.id}>
                      <div>
                        <strong>{pillar.label}</strong>
                        <span>
                          {pillar.weight}% weight
                          {pillar.id === 'goals' &&
                          row.quarterAverageScore != null
                            ? ` · Q avg ${row.quarterAverageScore.toFixed(2)}`
                            : ''}
                        </span>
                      </div>
                      <GradePill grade={grade} />
                    </li>
                  )
                })}
              </ul>
            </section>
            <section className="pd-cal-drawer__card">
              <h3 className="pd-cal-drawer__section-title">Manager comment</h3>
              <p className="pd-cal-drawer__eyebrow">
                Written by {row.managerName !== '—' ? row.managerName : 'manager'}
              </p>
              <blockquote className="pd-cal-drawer__quote">
                {managerNarrative || 'No manager comment submitted yet.'}
              </blockquote>
            </section>
            <section className="pd-cal-drawer__card">
              <h3 className="pd-cal-drawer__section-title">
                Vs employee self-review
              </h3>
              <ul className="pd-cal-drawer__compare">
                <li>
                  <span>Self-rating</span>
                  <div className="pd-cal-drawer__track">
                    <span
                      className={cx(
                        'pd-cal-drawer__fill is-self-bar',
                        selfGrade && `is-${selfGrade}`,
                      )}
                      style={{ width: bandBarWidth(selfGrade) }}
                    />
                  </div>
                  <GradePill grade={selfGrade} compact />
                </li>
                <li>
                  <span>Mgr rating</span>
                  <div className="pd-cal-drawer__track">
                    <span
                      className={cx(
                        'pd-cal-drawer__fill',
                        managerGrade && `is-${managerGrade}`,
                      )}
                      style={{ width: bandBarWidth(managerGrade) }}
                    />
                  </div>
                  <GradePill grade={managerGrade} compact />
                </li>
              </ul>
              <p className="pd-cal-drawer__compare-note">
                {row.gapTiers == null || row.gapTiers === 0
                  ? 'Aligned'
                  : row.gapTiers < 0
                    ? `Self-rated ${Math.abs(row.gapTiers)} tier${Math.abs(row.gapTiers) === 1 ? '' : 's'} higher`
                    : `Manager rated ${row.gapTiers} tier${row.gapTiers === 1 ? '' : 's'} higher`}
              </p>
            </section>
          </div>
        ) : null}

        {tab === 'history' ? (
          <div className="pd-cal-drawer__stack">
            <section className="pd-cal-drawer__card">
              <h3 className="pd-cal-drawer__section-title">
                Annual rating history
              </h3>
              <ul className="pd-cal-drawer__year-history">
                {historyRows.map((entry) => (
                  <li key={entry.cycleId}>
                    <span className="pd-cal-drawer__year">{entry.yearLabel}</span>
                    <div className="pd-cal-drawer__track">
                      <span
                        className={cx(
                          'pd-cal-drawer__fill',
                          entry.grade && `is-${entry.grade}`,
                        )}
                        style={{ width: bandBarWidth(entry.grade) }}
                      />
                    </div>
                    <GradePill grade={entry.grade} />
                    {entry.delta != null && entry.delta !== 0 ? (
                      <span
                        className={cx(
                          'pd-cal-drawer__delta',
                          entry.delta > 0 ? 'is-up' : 'is-down',
                        )}
                      >
                        {entry.delta > 0 ? (
                          <ArrowUpRight size={14} strokeWidth={2.25} aria-hidden />
                        ) : (
                          <ArrowDownRight
                            size={14}
                            strokeWidth={2.25}
                            aria-hidden
                          />
                        )}
                        {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                      </span>
                    ) : (
                      <span className="pd-cal-drawer__delta-spacer" />
                    )}
                  </li>
                ))}
              </ul>
              {historyRows.length >= 2 &&
              historyRows[0]?.grade &&
              historyRows[1]?.grade &&
              historyRows[0].grade !== historyRows[1].grade ? (
                <p className="pd-cal-drawer__trend-note">
                  {gradeTierDelta(historyRows[1].grade, historyRows[0].grade)! >
                  0
                    ? `Improved in ${historyRows[0].yearLabel} vs ${historyRows[1].yearLabel}`
                    : `Declined in ${historyRows[0].yearLabel} vs ${historyRows[1].yearLabel}`}{' '}
                  — discuss in calibration.
                </p>
              ) : null}
            </section>
            <section className="pd-cal-drawer__card">
              <h3 className="pd-cal-drawer__section-title">Career timeline</h3>
              <ul className="pd-cal-drawer__timeline">
                <li>
                  <span>Join date</span>
                  <strong>
                    {row.joinDateLabel}
                    {employee?.startDate
                      ? ` · ${formatTenureMonths(tenureMonths)} ago`
                      : ''}
                  </strong>
                </li>
                <li>
                  <span>Current grade</span>
                  <strong>
                    {row.jobGrade}
                    {row.timeInGradeLabel !== '—'
                      ? ` · in grade ${row.timeInGradeLabel}`
                      : ''}
                  </strong>
                </li>
                <li>
                  <span>Last promotion</span>
                  <strong>{row.lastPromoLabel}</strong>
                </li>
                <li>
                  <span>PIP history</span>
                  <strong className={employee?.onPip ? undefined : 'is-ok'}>
                    <span className="pd-pip-status">
                      {pipStatusLabel(employee?.onPip)}
                      <PipDisplayOnlyMark />
                    </span>
                  </strong>
                </li>
              </ul>
            </section>
          </div>
        ) : null}

        {tab === 'calibration' ? (
          <div className="pd-cal-drawer__stack">
            {row.flags.length === 0 ? (
              <p className="pd-cal-drawer__empty-flags">
                No calibration flags for this employee.
              </p>
            ) : (
              <section className="pd-cal-drawer__card">
                <h3 className="pd-cal-drawer__section-title">
                  <Flag size={14} strokeWidth={2.25} aria-hidden />
                  Flags ({row.flags.length})
                </h3>
                <ul className="pd-cal-drawer__flag-list">
                  {row.flags.map((flag) => (
                    <li key={flag.id}>
                      <strong>{flag.title}</strong>
                      <span>{flag.definition}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="pd-cal-drawer__card">
              <h3 className="pd-cal-drawer__section-title">Calibration status</h3>
              <ListboxSelect
                value={sessionStatus}
                disabled={!sittingReady || sessionLocked}
                onValueChange={(value) => {
                  const next = value as CalibrationSittingStatus
                  setSessionStatus(next)
                  if (!sittingReady || sessionLocked) return
                  setSessionError(null)
                  void saveCalibrationSittingEmployee(cycle.id, row.employeeId, {
                    status: next,
                    notes: sessionNotes,
                  })
                    .then((saved) => {
                      setSessionError(null)
                      onSittingSaved(saved)
                    })
                    .catch((error: unknown) => {
                      setSessionStatus(sittingEmployee?.status ?? 'not_reviewed')
                      setSessionError(
                        error instanceof Error
                          ? error.message
                          : 'Could not save the calibration status.',
                      )
                    })
                }}
                options={[...CALIBRATION_STATUS_OPTIONS]}
                allowEmpty={false}
                portal={false}
                aria-label="Calibration status"
              />
              {sessionError ? (
                <p className="pd-cal-drawer__error" role="alert">
                  {sessionError}
                </p>
              ) : null}
            </section>

            <section className="pd-cal-drawer__card">
              <h3 className="pd-cal-drawer__section-title">Session notes</h3>
              <Textarea
                value={sessionNotes}
                disabled={sessionLocked}
                onChange={(event) => setSessionNotes(event.target.value)}
                rows={4}
                placeholder="Add calibration notes for this employee"
              />
            </section>

            <section className="pd-cal-drawer__card">
              <h3 className="pd-cal-drawer__section-title">Rating override</h3>
              <div className="pd-cal-drawer__final-row">
                <span>Current rating</span>
                <GradePill grade={finalGrade} />
              </div>
              <p className="pd-cal-drawer__hint">
                Written reason required · Permanently audit logged
              </p>
              {!overrideOpen ? (
                <button
                  type="button"
                  className="pd-btn pd-btn--secondary pd-btn--sm pd-btn--pill"
                  disabled={!packet || sessionLocked || !canOverride}
                  onClick={() => {
                    setOverrideGrade(finalGrade ?? '')
                    setOverrideOpen(true)
                  }}
                >
                  Override rating
                </button>
              ) : (
                <div className="pd-cal-drawer__override">
                  <label className="pd-cal-drawer__field">
                    <span>Calibrated grade</span>
                    <ListboxSelect
                      value={overrideGrade}
                      onValueChange={(value) =>
                        setOverrideGrade((value as GradeBandId) || '')
                      }
                      options={OVERALL_GRADE_ORDER.map((id) => ({
                        value: id,
                        label: GRADE_BAND_META[id].label,
                      }))}
                      allowEmpty={false}
                      portal={false}
                      aria-label="Calibrated grade"
                    />
                  </label>
                  <label className="pd-cal-drawer__field">
                    <span>Reason</span>
                    <Textarea
                      value={overrideReason}
                      onChange={(event) => setOverrideReason(event.target.value)}
                      rows={3}
                      placeholder="Why is this grade changing?"
                    />
                  </label>
                  {overrideError ? (
                    <p className="pd-cal-drawer__error" role="alert">
                      {overrideError}
                    </p>
                  ) : null}
                  <div className="pd-cal-drawer__override-actions">
                    <button
                      type="button"
                      className="pd-btn pd-btn--ghost pd-btn--sm pd-btn--pill"
                      disabled={overrideSaving}
                      onClick={() => setOverrideOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="pd-btn pd-btn--primary pd-btn--sm pd-btn--pill"
                      disabled={
                        overrideSaving ||
                        !overrideGrade ||
                        !overrideReason.trim() ||
                        !packet
                      }
                      onClick={() => {
                        void saveOverride()
                      }}
                    >
                      {overrideSaving ? 'Saving…' : 'Save override'}
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </SettingsSidePanel>
  )
}
