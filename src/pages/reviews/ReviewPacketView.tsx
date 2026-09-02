import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ActivityLogDrawer,
  ActivityLogTrigger,
} from '@/components/activity/ActivityLogDrawer'
import { Button, ConfirmDialog, Field, ListboxSelect, PageStatus } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { useHydrateManagerDelegations } from '@/lib/delegations/useManagerDelegations'
import { useEmployees } from '@/lib/employees/useEmployees'
import { selectGoalCycle } from '@/lib/goalsApi'
import { getGoalsSnapshotForCycle, subscribeGoalsStore } from '@/lib/goals/store'
import {
  answersFromFeedbackText,
  buildScorecardDetail,
  feedbackTextForRole,
  isScorecardFeedbackQuestion,
  scorecardDetailPath,
} from '@/lib/reviews/scorecards'
import {
  appealReviewPacket,
  calibrateReviewPacket,
  fetchReviewPacket,
  saveReviewPacket,
} from '@/lib/reviews/packetsApi'
import { cyclePurposeOf } from '@/lib/reviews/purpose'
import {
  defaultReviewPolicy,
  enabledPillars,
  enabledQuestions,
  gradesGoalsSeparately,
  gradesOverall,
} from '@/lib/reviews/reviewPolicy'
import { describeEnabledFlow, getReviewStage } from '@/lib/reviews/reviewStages'
import { getReviewCycle } from '@/lib/reviews/store'
import {
  useReviewCyclesHydrated,
  useReviewsSnapshot,
} from '@/lib/reviews/useReviews'
import type { GradeBandId, ReviewPacket, ReviewPolicy } from '@/lib/reviews/types'
import { resolveCyclePolicyForPerson } from '@/lib/reviews/cycleGroups'
import { calibrationIsEditable } from '@/lib/reviews/scorecardStages'
import { useLiveTopic } from '@/lib/realtime/useLiveTopic'
import { goalsDetailPath } from '@/pages/goals/goalHelpers'
import { AnnualGoalsQuarters } from '@/pages/reviews/AnnualGoalsQuarters'
import { OverallGradePicker } from '@/pages/reviews/OverallGradePicker'
import { ScorecardFeedbackCard } from '@/pages/reviews/ScorecardFeedbackCard'
import {
  GRADE_LISTBOX_OPTIONS,
  ScorecardGoalsCard,
} from '@/pages/reviews/ScorecardGoalsCard'
import { ScorecardHero } from '@/pages/reviews/ScorecardHero'
import {
  ReviewActionIsland,
  ReviewSaveBanner,
  type ReviewSaveNotice,
} from '@/pages/reviews/ReviewSaveBanner'
import { useAnnualLinkedQuarters } from '@/pages/reviews/useAnnualLinkedQuarters'
import { useScorecardViewStage } from '@/pages/reviews/useScorecardViewStage'
import '@/styles/layout-activity.css'

type PacketDraft = {
  answers: Array<{ questionId: string; body: string }>
  pillarScores: Array<{ pillarId: string; grade: GradeBandId | null; comment: string }>
  overallGrade: GradeBandId | null
}

function GradeField({
  id,
  label,
  value,
  disabled,
  hint,
  allowEmpty = true,
  onChange,
}: {
  id: string
  label: string
  value: string
  disabled?: boolean
  hint?: string
  allowEmpty?: boolean
  onChange: (value: GradeBandId | '') => void
}) {
  return (
    <Field htmlFor={id} label={label} hint={hint}>
      <ListboxSelect
        className={[
          'pd-reviews-scorecard__grade-select',
          value ? `pd-reviews-scorecard__grade-select--${value}` : '',
        ]
          .filter(Boolean)
          .join(' ')}
        id={id}
        aria-label={label}
        value={value}
        disabled={disabled}
        allowEmpty={allowEmpty}
        placeholder="Select a grade"
        emptyLabel="Select a grade"
        onValueChange={(next) => onChange(next as GradeBandId | '')}
        options={GRADE_LISTBOX_OPTIONS}
      />
    </Field>
  )
}

type ReviewPacketViewProps = {
  cycleId: string
  employeeId: number
}

export function ReviewPacketView({ cycleId, employeeId }: ReviewPacketViewProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  useHydrateManagerDelegations(user?.employeeId ?? undefined)
  const { employees, isLoading: employeesLoading } = useEmployees()
  const [packet, setPacket] = useState<ReviewPacket | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [goalsRevision, setGoalsRevision] = useState(0)
  const [strengths, setStrengths] = useState('')
  const [developments, setDevelopments] = useState('')
  const [goalsGrade, setGoalsGrade] = useState<GradeBandId | ''>('')
  const [packetDraft, setPacketDraft] = useState<PacketDraft | null>(null)
  const [isDirty, setDirty] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [saveNotice, setSaveNotice] = useState<ReviewSaveNotice | null>(null)
  const [activityOpen, setActivityOpen] = useState(false)
  const { cycles } = useReviewsSnapshot()
  const cyclesHydrated = useReviewCyclesHydrated()
  const cycle = getReviewCycle(cycleId)
  const policyResolution = cycle
    ? resolveCyclePolicyForPerson(cycle, employeeId)
    : null
  const policy =
    policyResolution?.settings.reviewPolicy ??
    defaultReviewPolicy(cyclePurposeOf(cycle))
  const viewerId = user?.employeeId ?? (Number(user?.personId) || null)
  const isSubject = viewerId === employeeId
  const isManager = Boolean(viewerId && viewerId !== employeeId)
  const goalsPillar = enabledPillars(policy).find((pillar) => pillar.id === 'goals')
  const linkedQuarters = useAnnualLinkedQuarters({
    cycle,
    employeeId,
    goalsPillar,
    goalsRevision,
  })

  useEffect(() => {
    let cancelled = false
    void selectGoalCycle(cycleId).then(() => {
      if (!cancelled) setGoalsRevision((value) => value + 1)
    })
    return () => {
      cancelled = true
    }
  }, [cycleId])

  useEffect(() => {
    return subscribeGoalsStore(() => setGoalsRevision((value) => value + 1))
  }, [])

  const detail = useMemo(
    () =>
      buildScorecardDetail(cycleId, employeeId, employees, user?.email, packet),
    [cycleId, cycles, employeeId, employees, goalsRevision, packet, user?.email],
  )

  useEffect(() => {
    let cancelled = false
    void fetchReviewPacket(cycleId, employeeId)
      .then((next) => {
        if (!cancelled) setPacket(next)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load this review.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [cycleId, employeeId])

  const refreshLivePacket = useCallback(
    (event: { cycleId?: string; employeeId?: string }) => {
      if (isDirty) return
      if (event.cycleId && event.cycleId !== cycleId) return
      if (event.employeeId && event.employeeId !== String(employeeId)) return
      void fetchReviewPacket(cycleId, employeeId)
        .then(setPacket)
        .catch(() => {
          /* Keep the open packet until the next event or navigation. */
        })
    },
    [cycleId, employeeId, isDirty],
  )
  useLiveTopic('packets', refreshLivePacket)

  const stages = policyResolution?.stagesConfig.reviewStages
  const stageView = useScorecardViewStage({
    packet,
    stages,
    viewerEmployeeId: viewerId,
  })
  const selfOn = Boolean(getReviewStage(stages, 'self_review')?.enabled)
  const managerOn = Boolean(getReviewStage(stages, 'manager_review')?.enabled)
  const feedbackRole = managerOn && isManager
    ? 'manager'
    : selfOn && isSubject
      ? 'self'
      : null

  useEffect(() => {
    if (!packet || !feedbackRole) return
    const next = feedbackTextForRole(packet.answers, feedbackRole)
    setStrengths(next.strengths)
    setDevelopments(next.developments)
  }, [feedbackRole, packet])

  const goalsGradeRole = managerOn && isManager
    ? 'manager'
    : selfOn && isSubject
      ? 'self'
      : null

  useEffect(() => {
    if (!packet || !goalsGradeRole) return
    setGoalsGrade(
      packet.pillarScores.find(
        (score) =>
          score.pillarId === 'goals' && score.actorRole === goalsGradeRole,
      )?.grade ?? '',
    )
  }, [goalsGradeRole, packet])

  if (!cycle) {
    if (!cyclesHydrated) {
      return (
        <PageStatus
          variant="loading"
          description="Loading the review packet…"
        />
      )
    }
    return <PageStatus variant="not-found" description="This cycle is not available." />
  }
  if (error) {
    return <PageStatus variant="error" description={error} />
  }
  if (!packet || !policy || (employeesLoading && !detail)) {
    return (
      <PageStatus
        variant="loading"
        description="Loading the review packet…"
      />
    )
  }

  const calOn = Boolean(
    getReviewStage(stages, 'calibration_hod_hrbp')?.enabled ||
    getReviewStage(stages, 'calibration_slt')?.enabled,
  )
  const appealOn = Boolean(getReviewStage(stages, 'appeal')?.enabled)
  const pillars = enabledPillars(policy)
  const selfQuestions = enabledQuestions(policy, 'employee')
  const managerQuestions = enabledQuestions(policy, 'manager')
  const showSelfForm = selfOn && (isSubject || packet.status !== 'not_started')
  const showManagerForm = managerOn && isManager
  const showCalibrationForm =
    calOn && isManager && calibrationIsEditable(packet.status)
  const showAppealForm =
    appealOn && isSubject && packet.status === 'released_to_employees'
  const feedbackLocked =
    feedbackRole === 'manager'
      ? packet.status === 'released_to_employees' ||
        packet.status === 'released_to_managers'
      : !isSubject ||
        packet.status === 'self_submitted' ||
        packet.status === 'manager_submitted'
  const feedbackQuestions =
    feedbackRole === 'manager' ? managerQuestions : selfQuestions
  const feedbackAnswers = answersFromFeedbackText(
    feedbackQuestions,
    strengths,
    developments,
  )
  const hideEmployeeGoalsGrade = linkedQuarters.enabled && isSubject
  const gradeGoals = gradesGoalsSeparately(policy)
  const gradeOverall = gradesOverall(policy)
  const extraGrades =
    gradeGoals && goalsGradeRole && !hideEmployeeGoalsGrade
      ? { goals: goalsGrade }
      : undefined
  const managerFormLocked =
    packet.status === 'released_to_employees' ||
    packet.status === 'released_to_managers'
  const selfFormLocked =
    !isSubject ||
    packet.status === 'self_submitted' ||
    packet.status === 'manager_submitted'
  const goalsGradeLocked =
    goalsGradeRole === 'manager' ? managerFormLocked : selfFormLocked
  const formLocked = showManagerForm ? managerFormLocked : selfFormLocked
  const formActorRole = showManagerForm ? 'manager' : 'self'

  const viewHref = `${scorecardDetailPath(
    detail?.cycleKey ?? cycleId,
    detail?.employeeId ?? employeeId,
  )}?stage=${stageView.viewing}`

  const requestLeave = () => {
    if (isDirty) {
      setLeaveOpen(true)
      return
    }
    navigate(viewHref)
  }

  const savePacket = async (submit: boolean) => {
    if (!packetDraft) return
    setSaving(true)
    setSaveNotice(null)
    try {
      const next = await saveReviewPacket(packet.id, {
        ...packetDraft,
        actorRole: formActorRole,
        submit,
      })
      setPacket(next)
      setDirty(false)
      navigate(viewHref, {
        state: {
          reviewNotice: {
            variant: 'success',
            message: submit ? 'Review submitted.' : 'Draft saved.',
            shownAt: Date.now(),
          } satisfies ReviewSaveNotice,
        },
      })
    } catch (err: unknown) {
      setSaveNotice({
        variant: 'error',
        message:
          err instanceof Error ? err.message : 'Could not save this review.',
        shownAt: Date.now(),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="pd-page pd-page--wide pd-reviews pd-reviews-scorecard pd-review-packet">
      {detail ? (
        <ScorecardHero
          detail={detail}
          packet={packet}
          stages={stages}
          viewerEmployeeId={viewerId}
          viewingStage={stageView.viewing}
          onViewStage={stageView.selectStage}
        />
      ) : null}
      <p className="pd-reviews-flow__path">
        {describeEnabledFlow(stages)}
      </p>
      <ActivityLogTrigger
        label="View Review Activity"
        onClick={() => setActivityOpen(true)}
      />

      {detail && linkedQuarters.enabled ? (
        <AnnualGoalsQuarters
          rows={linkedQuarters.rows}
          goalsByCycleId={linkedQuarters.goalsByCycleId}
          q4Goals={linkedQuarters.q4Goals}
          q4CycleId={linkedQuarters.progressRow?.sourceCycleId}
          personId={String(employeeId)}
          owner={{
            id: String(detail.employeeId),
            name: detail.employeeName,
            avatarUrl: detail.employeeAvatarUrl || undefined,
          }}
          q4Grade={isManager && gradeGoals ? goalsGrade || null : null}
          onQ4GradeChange={
            isManager && goalsGradeRole && gradeGoals
              ? (next) => {
                  setGoalsGrade(next)
                  setDirty(true)
                }
              : undefined
          }
          q4GradeLocked={goalsGradeLocked}
        />
      ) : detail ? (
        <ScorecardGoalsCard
          cycleId={cycleId}
          personId={String(employeeId)}
          owner={{
            id: String(detail.employeeId),
            name: detail.employeeName,
            avatarUrl: detail.employeeAvatarUrl || undefined,
          }}
          cycleLabel={detail.cycleLabel}
          goals={
            getGoalsSnapshotForCycle(cycleId).byPerson[String(employeeId)]
              ?.goals ?? []
          }
          overallPercent={detail.goalsOverallPercent}
          overallBand={
            gradeGoals
              ? showManagerForm
                ? packet.pillarScores.find(
                    (score) =>
                      score.pillarId === 'goals' && score.actorRole === 'manager',
                  )?.grade ?? null
                : detail.goalsOverallBand
              : null
          }
          goalsHref={goalsDetailPath(cycleId, String(employeeId))}
          editing={gradeGoals}
          goalsWeight={goalsPillar?.weight}
          goalsGrade={gradeGoals ? goalsGrade || null : null}
          onGoalsGradeChange={
            gradeGoals && goalsGradeRole && goalsPillar
              ? (next) => {
                  setGoalsGrade(next)
                  setDirty(true)
                }
              : undefined
          }
          gradeLocked={goalsGradeLocked}
        />
      ) : null}

      {showSelfForm && stageView.viewing === 'self_review' ? (
        <PacketForm
          title="Self-Review"
          locked={!isSubject || packet.status === 'self_submitted' || packet.status === 'manager_submitted'}
          questions={selfQuestions}
          pillars={pillars}
          packet={packet}
          actorRole="self"
          overall={packet.selfOverallGrade}
          extraAnswers={feedbackRole === 'self' ? feedbackAnswers : undefined}
          extraGrades={
            gradeGoals && goalsGradeRole === 'self' && !hideEmployeeGoalsGrade
              ? extraGrades
              : undefined
          }
          hidePillarIds={
            !gradeGoals || goalsGradeRole === 'self' || hideEmployeeGoalsGrade
              ? ['goals']
              : []
          }
          showOverall={gradeOverall}
          onDraftChange={setPacketDraft}
          onUserEdit={() => setDirty(true)}
        />
      ) : null}

      {showManagerForm && stageView.viewing === 'manager_review' ? (
        <PacketForm
          title="Manager Review"
          locked={
            packet.status === 'released_to_employees' ||
            packet.status === 'released_to_managers'
          }
          questions={managerQuestions}
          pillars={pillars}
          packet={packet}
          actorRole="manager"
          overall={packet.managerOverallGrade}
          extraAnswers={feedbackRole === 'manager' ? feedbackAnswers : undefined}
          extraGrades={
            gradeGoals && goalsGradeRole === 'manager' ? extraGrades : undefined
          }
          hidePillarIds={
            !gradeGoals || goalsGradeRole === 'manager' ? ['goals'] : []
          }
          showOverall={gradeOverall}
          onDraftChange={setPacketDraft}
          onUserEdit={() => setDirty(true)}
        />
      ) : null}

      {stageView.viewing === 'self_review' ||
      stageView.viewing === 'manager_review' ? (
        <ScorecardFeedbackCard
          feedback={
            detail?.feedback ?? {
              authorName: '',
              authorRole: '',
              dateLabel: '',
              strengths: '',
              developments: '',
            }
          }
          editing
          locked={feedbackRole == null || feedbackLocked}
          strengths={strengths}
          developments={developments}
          onStrengthsChange={(next) => {
            setStrengths(next)
            setDirty(true)
          }}
          onDevelopmentsChange={(next) => {
            setDevelopments(next)
            setDirty(true)
          }}
        />
      ) : null}

      <ReviewSaveBanner
        notice={saveNotice}
        onDismiss={() => setSaveNotice(null)}
      />
      <ReviewActionIsland>
        <div className="pd-review-packet__island">
          <div className="pd-review-packet__actions">
            <Button variant="secondary" pill disabled={saving} onClick={requestLeave}>
              Cancel
            </Button>
            {!formLocked &&
            ((showSelfForm && stageView.viewing === 'self_review') ||
              (showManagerForm && stageView.viewing === 'manager_review')) ? (
              <>
                <Button
                  variant="secondary"
                  pill
                  disabled={saving || packetDraft == null}
                  onClick={() => void savePacket(false)}
                >
                  Save Draft
                </Button>
                <Button
                  variant="primary"
                  pill
                  disabled={saving || packetDraft == null}
                  onClick={() => void savePacket(true)}
                >
                  Submit
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </ReviewActionIsland>

      <ConfirmDialog
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        onConfirm={() => {
          setLeaveOpen(false)
          navigate(viewHref)
        }}
        title="Unsaved Changes"
        description="Leave without saving? Your edits will be lost."
        confirmLabel="Discard"
        cancelLabel="Stay"
        confirmVariant="danger"
      />

      {showCalibrationForm && stageView.viewing === 'calibration_hod_hrbp' ? (
        <CalibrationBlock
          packet={packet}
          onSave={async (toGrade, reason) => {
            try {
              const next = await calibrateReviewPacket(packet.id, {
                toGrade,
                reason,
                stageId: 'calibration_hod_hrbp',
              })
              setPacket(next)
              setSaveNotice({
                variant: 'success',
                message: 'Calibration recorded.',
                shownAt: Date.now(),
              })
            } catch (err: unknown) {
              setSaveNotice({
                variant: 'error',
                message:
                  err instanceof Error
                    ? err.message
                    : 'Could not record calibration.',
                shownAt: Date.now(),
              })
            }
          }}
        />
      ) : null}

      {showAppealForm ? (
        <AppealBlock
          packet={packet}
          onSave={async (body) => {
            try {
              setPacket(await appealReviewPacket(packet.id, body))
              setSaveNotice({
                variant: 'success',
                message: 'Appeal submitted.',
                shownAt: Date.now(),
              })
            } catch (err: unknown) {
              setSaveNotice({
                variant: 'error',
                message:
                  err instanceof Error
                    ? err.message
                    : 'Could not submit this appeal.',
                shownAt: Date.now(),
              })
            }
          }}
        />
      ) : null}
      <ActivityLogDrawer
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
        title="Review activity"
        description="Self-review, manager review, calibration, and release for this person."
        filters={{ cycleId, subjectEmployeeId: employeeId }}
      />
    </div>
  )
}

function PacketForm({
  title,
  locked,
  questions,
  pillars,
  packet,
  actorRole,
  overall,
  extraAnswers,
  extraGrades,
  hidePillarIds = [],
  showOverall = true,
  onDraftChange,
  onUserEdit,
}: {
  title: string
  locked: boolean
  questions: ReviewPolicy['scorecard']['questions']
  pillars: ReviewPolicy['scorecard']['pillars']
  packet: ReviewPacket
  actorRole: 'self' | 'manager'
  overall: GradeBandId | null
  extraAnswers?: Array<{ questionId: string; body: string }>
  extraGrades?: Record<string, GradeBandId | ''>
  hidePillarIds?: string[]
  showOverall?: boolean
  onDraftChange: (draft: PacketDraft) => void
  onUserEdit: () => void
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const next: Record<string, string> = {}
    for (const answer of packet.answers) {
      if (answer.actorRole === actorRole) next[answer.questionId] = answer.body
    }
    return next
  })
  const [grades, setGrades] = useState<Record<string, GradeBandId | ''>>(() => {
    const next: Record<string, GradeBandId | ''> = {}
    for (const score of packet.pillarScores) {
      if (score.actorRole === actorRole) next[score.pillarId] = score.grade ?? ''
    }
    return next
  })
  const [overallGrade, setOverallGrade] = useState<GradeBandId | ''>(overall ?? '')
  const lastDraftJson = useRef('')

  const mergedGrades = { ...grades, ...extraGrades }
  const formPillars = pillars.filter(
    (pillar) => !hidePillarIds.includes(pillar.id),
  )
  const formQuestions = questions.filter(
    (question) => !isScorecardFeedbackQuestion(question.id),
  )

  useEffect(() => {
    const nextGrades = { ...grades, ...extraGrades }
    const draft = {
      answers: [
        ...questions
          .filter((question) => !isScorecardFeedbackQuestion(question.id))
          .map((question) => ({
            questionId: question.id,
            body: answers[question.id] ?? '',
          })),
        ...(extraAnswers ?? []),
      ],
      pillarScores: pillars.map((pillar) => ({
        pillarId: pillar.id,
        grade: (nextGrades[pillar.id] || null) as GradeBandId | null,
        comment: '',
      })),
      overallGrade: (overallGrade || null) as GradeBandId | null,
    }
    const serialized = JSON.stringify(draft)
    if (serialized === lastDraftJson.current) return
    lastDraftJson.current = serialized
    onDraftChange(draft)
  }, [
    answers,
    extraAnswers,
    extraGrades,
    grades,
    onDraftChange,
    overallGrade,
    pillars,
    questions,
  ])

  return (
    <section className="pd-reviews-edit-card" aria-label={title}>
      {showOverall && packet.selfOverallGrade ? (
        <p className="pd-reviews-flow__hint">
          Self-review overall: {packet.selfOverallGrade}
        </p>
      ) : null}
      {formQuestions.map((question) => (
        <label key={question.id} className="pd-field">
          <span className="pd-field__label">{question.prompt}</span>
          <textarea
            className="pd-field__control"
            rows={3}
            disabled={locked}
            value={answers[question.id] ?? ''}
            onChange={(event) => {
              setAnswers((current) => ({
                ...current,
                [question.id]: event.target.value,
              }))
              onUserEdit()
            }}
          />
        </label>
      ))}
      {formPillars.map((pillar) => (
        <GradeField
          key={pillar.id}
          id={`packet-grade-${actorRole}-${pillar.id}`}
          label={`${pillar.label} (${pillar.weight}%)`}
          value={mergedGrades[pillar.id] ?? ''}
          disabled={locked}
          onChange={(next) => {
            setGrades((current) => ({
              ...current,
              [pillar.id]: next,
            }))
            onUserEdit()
          }}
        />
      ))}
      {showOverall ? (
        <OverallGradePicker
          name={`packet-grade-${actorRole}-overall`}
          value={overallGrade}
          disabled={locked}
          onChange={(next) => {
            setOverallGrade(next)
            onUserEdit()
          }}
        />
      ) : null}
    </section>
  )
}

function CalibrationBlock({
  packet,
  onSave,
}: {
  packet: ReviewPacket
  onSave: (toGrade: GradeBandId, reason: string) => Promise<void>
}) {
  const [grade, setGrade] = useState<GradeBandId | ''>(
    packet.calibratedOverallGrade ?? packet.managerOverallGrade ?? '',
  )
  const [reason, setReason] = useState('')
  return (
    <section className="pd-reviews-edit-card">
      <h2 className="pd-reviews-edit-card__title">Calibration</h2>
      <p className="pd-reviews-flow__hint">
        Manager grade: {packet.managerOverallGrade ?? '-'} · Self grade:{' '}
        {packet.selfOverallGrade ?? '-'}
      </p>
      <GradeField
        id="packet-grade-calibrated"
        label="Calibrated grade"
        value={grade}
        allowEmpty={false}
        onChange={(next) => {
          if (next) setGrade(next)
        }}
      />
      <label className="pd-field">
        <span className="pd-field__label">Reason for the change</span>
        <textarea
          className="pd-field__control"
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      <Button
        variant="primary"
        pill
        disabled={!grade || !reason.trim()}
        onClick={() => grade && void onSave(grade, reason)}
      >
        Record Calibration Change
      </Button>
    </section>
  )
}

function AppealBlock({
  packet,
  onSave,
}: {
  packet: ReviewPacket
  onSave: (body: string) => Promise<void>
}) {
  const [body, setBody] = useState('')
  if (packet.appeals.length > 0) {
    return (
      <section className="pd-reviews-edit-card">
        <h2 className="pd-reviews-edit-card__title">Appeal</h2>
        <p>{packet.appeals[0].body}</p>
      </section>
    )
  }
  return (
    <section className="pd-reviews-edit-card">
      <h2 className="pd-reviews-edit-card__title">Appeal</h2>
      <label className="pd-field">
        <span className="pd-field__label">Written record</span>
        <textarea
          className="pd-field__control"
          rows={4}
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </label>
      <Button
        variant="primary"
        pill
        disabled={!body.trim()}
        onClick={() => void onSave(body)}
      >
        Submit Appeal
      </Button>
    </section>
  )
}
