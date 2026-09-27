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
  CountBadge,
  ListboxSelect,
  PageStatus,
  SegmentedControl,
  Textarea,
} from '@/components/ui'
import { cx } from '@/lib/cx'
import { officialGrade } from '@/lib/analytics/dashboard'
import {
  formatGapLabel,
  type RatingTableRow,
} from '@/lib/calibration/ratingTable'
import {
  gradeTierDelta,
  monthsBetweenDates,
  previousCyclesOfSamePurpose,
} from '@/lib/calibration/indicators'
import {
  CALIBRATION_SITTING_STATUSES,
  CALIBRATION_SITTING_STATUS_LABEL,
  saveCalibrationSittingEmployee,
  type CalibrationSitting,
  type CalibrationSittingEmployee,
  type CalibrationSittingStatus,
} from '@/lib/calibration/sessionApi'
import {
  reasonWithHrbpCosign,
  requiresHrbpCosign,
} from '@/lib/calibration/overrideAccess'
import type { PlatformEmployee } from '@/lib/employees/types'
import { pipStatusLabel } from '@/lib/employees/career'
import { PipDisplayOnlyMark } from '@/pages/profile/PipDisplayOnlyMark'
import { annualSourceLinks } from '@/lib/reviews/annualQuarters'
import { resolveCyclePolicyForPerson } from '@/lib/reviews/cycleGroups'
import { GRADE_BAND_META, OVERALL_GRADE_ORDER } from '@/lib/reviews/labels'
import {
  calibrateReviewPacket,
} from '@/lib/reviews/packetsApi'
import {
  usePatchReviewPacketCache,
  useReviewPacket,
} from '@/lib/reviews/useReviewPackets'
import { scoreForBand } from '@/lib/reviews/rollup'
import { listScorecardForms } from '@/lib/reviews/scorecardFormsStore'
import type {
  GradeBandId,
  ReviewCycle,
  ReviewPacket,
  ReviewPillarScore,
  ReviewQuestion,
  ScorecardPillar,
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

const CALIBRATION_STATUS_OPTIONS = CALIBRATION_SITTING_STATUSES.map(
  (value) => ({
    value,
    label: CALIBRATION_SITTING_STATUS_LABEL[value],
  }),
)

type CalibrationSessionStatus = CalibrationSittingStatus

type NarrativeBlock = {
  id: string
  label: string
  body: string
}

type DisplayPillar = Pick<ScorecardPillar, 'id' | 'label' | 'weight' | 'kind'>

const PILLAR_FALLBACK_LABEL: Record<string, string> = {
  goals: 'Goals Achievement',
  skills: 'Skills Assessment',
  values: 'Core Values',
  leadership: 'Leadership',
}

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

function GradePill({ grade }: { grade: GradeBandId | null | undefined }) {
  if (!grade) return <span className="pd-cal-drawer__muted">—</span>
  return (
    <span
      className={cx('pd-cal-rt__grade', `is-${grade}`)}
      title={GRADE_BAND_META[grade].label}
    >
      {GRADE_BAND_META[grade].label}
    </span>
  )
}

function bandBarWidth(grade: GradeBandId | null | undefined): string {
  if (!grade) return '0%'
  return `${(scoreForBand(grade) / 5) * 100}%`
}

/** Vertical quarter-trend bars — matches client prototype scale (score/5 × max + floor). */
function bandBarHeight(grade: GradeBandId | null | undefined): string {
  if (!grade) return '0.25rem'
  return `calc(${scoreForBand(grade) / 5} * 2.75rem + 0.25rem)`
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

function pillarHint(pillar: DisplayPillar, actor: 'self' | 'manager'): string {
  if (pillar.kind === 'goals' || pillar.id === 'goals') {
    return actor === 'self'
      ? 'Based on Q1–Q4 reflection'
      : `${pillar.weight}% weight`
  }
  if (pillar.kind === 'skills' || pillar.id === 'skills') {
    return actor === 'self'
      ? 'Own assessment of competency level'
      : `${pillar.weight}% weight`
  }
  if (pillar.kind === 'values' || pillar.id === 'values') {
    return actor === 'self'
      ? 'Own assessment across values'
      : `${pillar.weight}% weight`
  }
  return pillar.weight > 0 ? `${pillar.weight}% weight` : ''
}

/** Real packet answers + pillar comments — never canned HTML templates. */
function narrativesFromPacket(
  packet: ReviewPacket | null,
  actor: 'self' | 'manager',
  questions: readonly ReviewQuestion[],
): NarrativeBlock[] {
  if (!packet) return []
  const questionById = new Map(questions.map((question) => [question.id, question]))
  const blocks: NarrativeBlock[] = packet.answers
    .filter((answer) => answer.actorRole === actor && answer.body.trim())
    .map((answer) => ({
      id: `answer:${answer.questionId}`,
      label:
        questionById.get(answer.questionId)?.prompt.trim() ||
        'Written response',
      body: answer.body.trim(),
    }))
  for (const score of packet.pillarScores) {
    if (score.actorRole !== actor || !score.comment.trim()) continue
    blocks.push({
      id: `pillar:${score.pillarId}`,
      label:
        PILLAR_FALLBACK_LABEL[score.pillarId] ??
        `${score.pillarId} comment`,
      body: score.comment.trim(),
    })
  }
  return blocks
}

/** Policy pillars plus any scored pillars on the packet (skills/values etc.). */
function displayPillarsFor(
  policyPillars: readonly ScorecardPillar[],
  scores: readonly ReviewPillarScore[],
): DisplayPillar[] {
  const byId = new Map<string, DisplayPillar>()
  for (const pillar of policyPillars) {
    if (!pillar.enabled) continue
    byId.set(pillar.id, {
      id: pillar.id,
      label: pillar.label,
      weight: pillar.weight,
      kind: pillar.kind,
    })
  }
  for (const score of scores) {
    if (byId.has(score.pillarId) || !score.grade) continue
    byId.set(score.pillarId, {
      id: score.pillarId,
      label: PILLAR_FALLBACK_LABEL[score.pillarId] ?? score.pillarId,
      weight: 0,
      kind:
        score.pillarId === 'goals' ||
          score.pillarId === 'skills' ||
          score.pillarId === 'values' ||
          score.pillarId === 'leadership'
          ? score.pillarId
          : 'custom',
    })
  }
  return [...byId.values()]
}

function NarrativeBlocks({
  blocks,
  emptyLabel,
}: {
  blocks: readonly NarrativeBlock[]
  emptyLabel: string
}) {
  if (blocks.length === 0) {
    return <blockquote className="pd-cal-drawer__quote">{emptyLabel}</blockquote>
  }
  return (
    <ul className="pd-cal-drawer__narratives">
      {blocks.map((block) => (
        <li key={block.id}>
          <p className="pd-cal-drawer__eyebrow">{block.label}</p>
          <blockquote className="pd-cal-drawer__quote">{block.body}</blockquote>
        </li>
      ))}
    </ul>
  )
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
  const patchPacketCache = usePatchReviewPacketCache()
  const {
    data: fullPacket,
    isPending: packetPending,
    isError: packetQueryError,
    error: packetLoadError,
  } = useReviewPacket(cycle.id, row.employeeId)
  const packet = fullPacket ?? summaryPacket ?? null
  const loadState: 'idle' | 'loading' | 'ready' | 'error' =
    fullPacket || summaryPacket
      ? 'ready'
      : packetPending
        ? 'loading'
        : packetQueryError
          ? 'error'
          : 'idle'
  const loadError =
    packetQueryError && !packet
      ? packetLoadError instanceof Error
        ? packetLoadError.message
        : 'Could not load review packet.'
      : null
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
  const [hrbpCosign, setHrbpCosign] = useState(false)

  useEffect(() => {
    setTab('overview')
    setOverrideGrade(row.annualGrade ?? '')
    setOverrideReason('')
    setOverrideError(null)
    setOverrideOpen(false)
    setHrbpCosign(false)
  }, [row.employeeId, row.annualGrade])

  useEffect(() => {
    setSessionStatus(sittingEmployee?.status ?? 'not_reviewed')
    setSessionNotes(sittingEmployee?.notes ?? '')
    setSessionError(null)
  }, [row.employeeId, sittingEmployee?.notes, sittingEmployee?.status])

  useEffect(() => {
    if (!sittingReady || sessionLocked || !canOverride) return
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
    canOverride,
    cycle.id,
    onSittingSaved,
    row.employeeId,
    sessionNotes,
    sessionStatus,
    sittingEmployee?.notes,
    sittingReady,
    sessionLocked,
  ])

  const policy = useMemo(
    () => resolveCyclePolicyForPerson(cycle, row.employeeId, listScorecardForms()),
    [cycle, row.employeeId],
  )
  const questions = useMemo(
    () => policy.settings.reviewPolicy?.scorecard.questions ?? [],
    [policy],
  )
  const pillars = useMemo(
    () =>
      displayPillarsFor(
        policy.settings.reviewPolicy?.scorecard.pillars ?? [],
        packet?.pillarScores ?? [],
      ),
    [policy, packet?.pillarScores],
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
              <span className="pd-cal-drawer__tab-label">
                Calibration
                <CountBadge count={flagCount} tone="danger" />
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

  const selfGrade = packet?.selfOverallGrade ?? row.selfGrade
  const managerGrade = packet?.managerOverallGrade ?? null
  const finalGrade = officialGrade(packet) ?? row.annualGrade
  const selfNarratives = narrativesFromPacket(packet, 'self', questions)
  const managerNarratives = narrativesFromPacket(packet, 'manager', questions)
  const overrideNeedsCosign = requiresHrbpCosign(finalGrade, overrideGrade || null)
  const q4Quarter = row.quarters.find((quarter) =>
    /q\s*4/i.test(quarter.shortLabel) || /q\s*4/i.test(quarter.label),
  )

  async function saveOverride() {
    if (!packet || !overrideGrade || !overrideReason.trim() || sessionLocked || !canOverride) {
      return
    }
    const needsCosign = requiresHrbpCosign(finalGrade, overrideGrade)
    if (needsCosign && !hrbpCosign) {
      setOverrideError(
        'This is a 3+ tier change. Check the HRBP co-sign flag before saving.',
      )
      return
    }
    setOverrideSaving(true)
    setOverrideError(null)
    try {
      const next = await calibrateReviewPacket(packet.id, {
        toGrade: overrideGrade,
        reason: reasonWithHrbpCosign(overrideReason, needsCosign),
      })
      patchPacketCache(next)
      onPacketUpdated(next)
      if (sittingReady && !sessionLocked) {
        const saved = await saveCalibrationSittingEmployee(
          cycle.id,
          row.employeeId,
          {
            status: 'rating_changed',
            notes: sessionNotes,
            adjusted: true,
          },
        )
        setSessionStatus('rating_changed')
        onSittingSaved(saved)
      }
      onRatingAdjusted()
      setOverrideOpen(false)
      setHrbpCosign(false)
    } catch (error: unknown) {
      setOverrideError(
        error instanceof Error ? error.message : 'Could not save override.',
      )
    } finally {
      setOverrideSaving(false)
    }
  }
  return (
    <SettingsSidePanel
      label={row.fullName}
      closeLabel="Close Employee Calibration"
      defaultWidth={736}
      onClose={onClose}
      title={
        <div className="pd-cal-drawer__title-row">
          <h2 className="pd-settings-panel__title">Employee Calibration</h2>
          <span
            className={cx(
              'pd-cal-drawer__status-chip',
              `is-${sessionStatus}`,
            )}
          >
            {CALIBRATION_SITTING_STATUS_LABEL[sessionStatus]}
          </span>
        </div>
      }
      tools={
        <Link
          to={`/people/${row.employeeId}`}
          className="pd-people__ghost-btn"
        >
          Full Profile
        </Link>
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
              <span>Final Rating</span>
              <GradePill grade={finalGrade} />
            </li>
            <li>
              <span>Self-Rating</span>
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

        <SegmentedControl
          className="pd-cal-drawer__tabs"
          options={tabOptions}
          value={tab}
          onChange={setTab}
          aria-label="Employee calibration sections"
        />

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
                  Quarterly Goal Ratings → Annual
                </h3>
                <div
                  className="pd-cal-drawer__q-chart"
                  role="img"
                  aria-label={
                    [
                      ...row.quarters.map(
                        (quarter) =>
                          `${quarter.label}: ${quarter.grade
                            ? GRADE_BAND_META[quarter.grade].label
                            : 'none'
                          }`,
                      ),
                      `Annual: ${finalGrade
                        ? GRADE_BAND_META[finalGrade].label
                        : 'none'
                      }`,
                    ].join('. ')
                  }
                >
                  {row.quarters.map((quarter) => (
                    <div
                      key={quarter.sourceCycleId}
                      className="pd-cal-drawer__q-col"
                    >
                      <span
                        className={cx(
                          'pd-cal-drawer__q-val',
                          quarter.grade && `is-${quarter.grade}`,
                        )}
                      >
                        {quarter.grade
                          ? GRADE_BAND_META[quarter.grade].label
                          : '—'}
                      </span>
                      <span
                        className={cx(
                          'pd-cal-drawer__q-bar',
                          quarter.grade && `is-${quarter.grade}`,
                        )}
                        style={{ height: bandBarHeight(quarter.grade) }}
                      />
                      <span className="pd-cal-drawer__q-lbl">
                        {quarter.label}
                      </span>
                    </div>
                  ))}
                  <div
                    className="pd-cal-drawer__q-divider"
                    aria-hidden
                  />
                  <div className="pd-cal-drawer__q-col">
                    <span
                      className={cx(
                        'pd-cal-drawer__q-val',
                        finalGrade && `is-${finalGrade}`,
                      )}
                    >
                      {finalGrade ? GRADE_BAND_META[finalGrade].label : '—'}
                    </span>
                    <span
                      className={cx(
                        'pd-cal-drawer__q-bar',
                        finalGrade && `is-${finalGrade}`,
                      )}
                      style={{ height: bandBarHeight(finalGrade) }}
                    />
                    <span className="pd-cal-drawer__q-lbl">Annual</span>
                  </div>
                </div>
                {row.flags.some((flag) => flag.id === 'annual_vs_quarterly') &&
                  row.quarterAverageGrade ? (
                  <p className="pd-cal-drawer__diverge-note">
                    Annual rating diverges from quarterly average (Q avg:{' '}
                    {GRADE_BAND_META[row.quarterAverageGrade].label})
                  </p>
                ) : null}
              </section>
            ) : null}

            <section className="pd-cal-drawer__card" aria-label="Rating breakdown">
              <h3 className="pd-cal-drawer__section-title">Rating Breakdown</h3>
              <ul className="pd-cal-drawer__pillar-list">
                {pillars.map((pillar) => {
                  const grade =
                    pillarGrade(packet?.pillarScores ?? [], pillar.id, 'manager') ??
                    pillarGrade(packet?.pillarScores ?? [], pillar.id, 'self')
                  const weightHint =
                    pillar.weight > 0 ? `${pillar.weight}% weight` : null
                  const qAvgHint =
                    pillar.id === 'goals' && row.quarterAverageScore != null
                      ? `Q avg: ${row.quarterAverageScore.toFixed(2)}`
                      : null
                  return (
                    <li key={pillar.id}>
                      <div>
                        <strong>{pillar.label}</strong>
                        <span>
                          {[weightHint, qAvgHint].filter(Boolean).join(' · ') ||
                            '—'}
                        </span>
                      </div>
                      <GradePill grade={grade} />
                    </li>
                  )
                })}
              </ul>
              <div className="pd-cal-drawer__final-row">
                <span>Final Annual Rating</span>
                <GradePill grade={finalGrade} />
              </div>
            </section>

            <section className="pd-cal-drawer__card" aria-label="Self vs manager">
              <h3 className="pd-cal-drawer__section-title">
                Self vs Manager Comparison
              </h3>
              <ul className="pd-cal-drawer__compare">
                <li>
                  <span>Self-Rating</span>
                  <div className="pd-cal-drawer__track">
                    <span
                      className={cx(
                        'pd-cal-drawer__fill is-self-bar',
                        selfGrade && `is-${selfGrade}`,
                      )}
                      style={{ width: bandBarWidth(selfGrade) }}
                    />
                  </div>
                  <GradePill grade={selfGrade} />
                </li>
                <li>
                  <span>Mgr Rating</span>
                  <div className="pd-cal-drawer__track">
                    <span
                      className={cx(
                        'pd-cal-drawer__fill',
                        managerGrade && `is-${managerGrade}`,
                      )}
                      style={{ width: bandBarWidth(managerGrade) }}
                    />
                  </div>
                  <GradePill grade={managerGrade} />
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
                <span>Annual Self-Rating</span>
                <GradePill grade={selfGrade} />
              </div>
            </section>
            <section className="pd-cal-drawer__card">
              <h3 className="pd-cal-drawer__section-title">
                Self-Ratings by Pillar
              </h3>
              <ul className="pd-cal-drawer__pillar-list">
                {pillars.map((pillar) => (
                  <li key={pillar.id}>
                    <div>
                      <strong>{pillar.label}</strong>
                      <span>{pillarHint(pillar, 'self') || '—'}</span>
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
              <h3 className="pd-cal-drawer__section-title">Full Year Narrative</h3>
              <p className="pd-cal-drawer__eyebrow">Written by Employee</p>
              <NarrativeBlocks
                blocks={selfNarratives}
                emptyLabel="No self narrative submitted yet."
              />
            </section>
            {hasAnnualQuarters ? (
              <section className="pd-cal-drawer__card">
                <h3 className="pd-cal-drawer__section-title">
                  Goals — Quarterly History
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
                <span>Final Rating Given by Manager</span>
                <GradePill grade={managerGrade ?? finalGrade} />
              </div>
            </section>
            <section className="pd-cal-drawer__card">
              <h3 className="pd-cal-drawer__section-title">Ratings by Pillar</h3>
              <ul className="pd-cal-drawer__pillar-list">
                {pillars.map((pillar) => {
                  const grade = pillarGrade(
                    packet?.pillarScores ?? [],
                    pillar.id,
                    'manager',
                  )
                  const hint = pillarHint(pillar, 'manager')
                  const qAvgHint =
                    pillar.id === 'goals' && row.quarterAverageScore != null
                      ? `Q avg ${row.quarterAverageScore.toFixed(2)}`
                      : null
                  return (
                    <li key={pillar.id}>
                      <div>
                        <strong>{pillar.label}</strong>
                        <span>
                          {[hint, qAvgHint].filter(Boolean).join(' · ') || '—'}
                        </span>
                      </div>
                      <GradePill grade={grade} />
                    </li>
                  )
                })}
              </ul>
            </section>
            <section className="pd-cal-drawer__card">
              <h3 className="pd-cal-drawer__section-title">Manager Comment</h3>
              <p className="pd-cal-drawer__eyebrow">
                Written by {row.managerName !== '—' ? row.managerName : 'manager'}
              </p>
              <NarrativeBlocks
                blocks={managerNarratives}
                emptyLabel="No manager comment submitted yet."
              />
            </section>
            <section className="pd-cal-drawer__card">
              <h3 className="pd-cal-drawer__section-title">
                Vs Employee Self-Review
              </h3>
              <ul className="pd-cal-drawer__compare">
                <li>
                  <span>Self-Rating</span>
                  <div className="pd-cal-drawer__track">
                    <span
                      className={cx(
                        'pd-cal-drawer__fill is-self-bar',
                        selfGrade && `is-${selfGrade}`,
                      )}
                      style={{ width: bandBarWidth(selfGrade) }}
                    />
                  </div>
                  <GradePill grade={selfGrade} />
                </li>
                <li>
                  <span>Mgr Rating</span>
                  <div className="pd-cal-drawer__track">
                    <span
                      className={cx(
                        'pd-cal-drawer__fill',
                        managerGrade && `is-${managerGrade}`,
                      )}
                      style={{ width: bandBarWidth(managerGrade) }}
                    />
                  </div>
                  <GradePill grade={managerGrade} />
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
            {hasAnnualQuarters && q4Quarter ? (
              <section className="pd-cal-drawer__card">
                <h3 className="pd-cal-drawer__section-title">Q4 Goal Rating</h3>
                <p className="pd-cal-drawer__hint">
                  Q4 is rated by the manager inside the annual review (no
                  standalone Q4 check-in).
                </p>
                <div className="pd-cal-drawer__final-row">
                  <span>{q4Quarter.label}</span>
                  <GradePill grade={q4Quarter.grade} />
                </div>
              </section>
            ) : null}
          </div>
        ) : null}

        {tab === 'history' ? (
          <div className="pd-cal-drawer__stack">
            <section className="pd-cal-drawer__card">
              <h3 className="pd-cal-drawer__section-title">
                Annual Rating History
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
              {historyRows.length >= 2 ? (
                <p className="pd-cal-drawer__trend-note">
                  {(() => {
                    const grades = historyRows
                      .map((entry) => entry.grade)
                      .filter((grade): grade is GradeBandId => grade != null)
                    if (grades.length < 2) {
                      return 'Not enough prior ratings to summarize a trend.'
                    }
                    const newest = grades[0]
                    const previous = grades[1]
                    const oldest = grades[grades.length - 1]
                    const recentDelta = gradeTierDelta(previous, newest)
                    const allUp =
                      grades.length >= 3 &&
                      grades.every(
                        (_grade, index) =>
                          index === 0 ||
                          (gradeTierDelta(grades[index], grades[index - 1]) ??
                            0) > 0,
                      )
                    const allDown =
                      grades.length >= 3 &&
                      grades.every(
                        (_grade, index) =>
                          index === 0 ||
                          (gradeTierDelta(grades[index], grades[index - 1]) ??
                            0) < 0,
                      )
                    const allSame =
                      grades.length >= 3 &&
                      grades.every((grade) => grade === newest)
                    if (allUp) {
                      return 'Consistently improving across available cycles.'
                    }
                    if (allDown) {
                      return 'Consistently declining across available cycles — review needed.'
                    }
                    if (allSame) {
                      return `Stable — same rating for ${grades.length} consecutive cycles.`
                    }
                    if (recentDelta != null && recentDelta > 0) {
                      return `Improved in ${historyRows[0].yearLabel} vs ${historyRows[1].yearLabel} (${GRADE_BAND_META[previous].label} → ${GRADE_BAND_META[newest].label}).`
                    }
                    if (recentDelta != null && recentDelta < 0) {
                      return `Declined in ${historyRows[0].yearLabel} vs ${historyRows[1].yearLabel} (${GRADE_BAND_META[previous].label} → ${GRADE_BAND_META[newest].label}) — discuss in calibration.`
                    }
                    if (oldest && newest && oldest !== newest) {
                      return `Mixed trend across cycles (${GRADE_BAND_META[oldest].label} → ${GRADE_BAND_META[newest].label}).`
                    }
                    return 'No change vs the previous cycle.'
                  })()}
                </p>
              ) : null}
            </section>
            <section className="pd-cal-drawer__card">
              <h3 className="pd-cal-drawer__section-title">Career Timeline</h3>
              <ul className="pd-cal-drawer__timeline">
                <li>
                  <span>Join Date</span>
                  <strong>
                    {row.joinDateLabel}
                    {employee?.startDate
                      ? ` · ${formatTenureMonths(tenureMonths)} ago`
                      : ''}
                  </strong>
                </li>
                <li>
                  <span>Current Grade</span>
                  <strong>
                    {row.jobGrade}
                    {row.timeInGradeLabel !== '—'
                      ? ` · in grade ${row.timeInGradeLabel}`
                      : ''}
                  </strong>
                </li>
                <li>
                  <span>Last Promotion</span>
                  <strong>{row.lastPromoLabel}</strong>
                </li>
                <li>
                  <span>PIP History</span>
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
              <h3 className="pd-cal-drawer__section-title">Calibration Status</h3>
              <ListboxSelect
                value={sessionStatus}
                disabled={!sittingReady || sessionLocked || !canOverride}
                onValueChange={(value) => {
                  const next = value as CalibrationSittingStatus
                  setSessionStatus(next)
                  if (!sittingReady || sessionLocked || !canOverride) return
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
              <h3 className="pd-cal-drawer__section-title">Session Notes</h3>
              <Textarea
                value={sessionNotes}
                disabled={sessionLocked || !canOverride}
                onChange={(event) => setSessionNotes(event.target.value)}
                rows={4}
                placeholder="Add calibration notes for this employee"
              />
            </section>

            <section className="pd-cal-drawer__card">
              <h3 className="pd-cal-drawer__section-title">Rating Override</h3>
              <div className="pd-cal-drawer__final-row">
                <span>Current Rating</span>
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
                    setHrbpCosign(false)
                    setOverrideOpen(true)
                  }}
                >
                  Override Rating
                </button>
              ) : (
                <div className="pd-cal-drawer__override">
                  <label className="pd-cal-drawer__field">
                    <span>Calibrated Grade</span>
                    <ListboxSelect
                      value={overrideGrade}
                      onValueChange={(value) => {
                        setOverrideGrade((value as GradeBandId) || '')
                        setHrbpCosign(false)
                        setOverrideError(null)
                      }}
                      options={OVERALL_GRADE_ORDER.map((id) => ({
                        value: id,
                        label: GRADE_BAND_META[id].label,
                      }))}
                      allowEmpty={false}
                      portal={false}
                      aria-label="Calibrated Grade"
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
                  {overrideNeedsCosign ? (
                    <label className="pd-cal-drawer__cosign">
                      <input
                        type="checkbox"
                        checked={hrbpCosign}
                        onChange={(event) => setHrbpCosign(event.target.checked)}
                      />
                      <span>
                        This is a 3+ tier change. Add an HRBP co-sign flag to
                        the reason (this does not wait for HRBP approval).
                      </span>
                    </label>
                  ) : null}
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
                        !packet ||
                        (overrideNeedsCosign && !hrbpCosign)
                      }
                      onClick={() => {
                        void saveOverride()
                      }}
                    >
                      {overrideSaving ? 'Saving…' : 'Save Override'}
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
