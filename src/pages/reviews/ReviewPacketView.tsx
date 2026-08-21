import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, PageStatus, Select } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { useEmployees } from '@/lib/employees/useEmployees'
import { GRADE_BAND_ORDER } from '@/lib/reviews/labels'
import {
  appealReviewPacket,
  calibrateReviewPacket,
  fetchReviewPacket,
  saveReviewPacket,
} from '@/lib/reviews/packetsApi'
import { PURPOSE_HINT } from '@/lib/reviews/purpose'
import {
  defaultReviewPolicy,
  enabledPillars,
  enabledQuestions,
} from '@/lib/reviews/reviewPolicy'
import { describeEnabledFlow, getReviewStage } from '@/lib/reviews/reviewStages'
import { combinePillarScores } from '@/lib/reviews/rollup'
import { getReviewCycle } from '@/lib/reviews/store'
import { reviewsTabPath } from '@/lib/reviews/paths'
import type { GradeBandId, ReviewPacket, ReviewPolicy } from '@/lib/reviews/types'
import { resolveCyclePolicyForPerson } from '@/lib/reviews/cycleGroups'

const GRADE_OPTIONS = GRADE_BAND_ORDER.map((id) => ({
  value: id,
  label: id.replace(/^\w/, (char) => char.toUpperCase()),
}))

type ReviewPacketViewProps = {
  cycleId: string
  employeeId: number
}

export function ReviewPacketView({ cycleId, employeeId }: ReviewPacketViewProps) {
  const { user } = useAuth()
  const { employees } = useEmployees()
  const [packet, setPacket] = useState<ReviewPacket | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const cycle = getReviewCycle(cycleId)
  const person = employees.find((item) => item.employeeId === employeeId)
  const policyResolution = cycle
    ? resolveCyclePolicyForPerson(cycle, employeeId)
    : null
  const policy =
    policyResolution?.settings.reviewPolicy ??
    defaultReviewPolicy(cycle?.purpose ?? 'quarterly_checkin')
  const viewerId = user?.employeeId ?? (Number(user?.personId) || null)
  const isSubject = viewerId === employeeId
  const isManager = Boolean(viewerId && viewerId !== employeeId)

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

  if (!cycle) {
    return <PageStatus variant="not-found" description="This cycle is not available." />
  }
  if (error) {
    return <PageStatus variant="error" description={error} />
  }
  if (!packet || !policy) {
    return (
      <PageStatus
        variant="loading"
        description="Loading the review packet…"
      />
    )
  }

  const stages = policyResolution?.stagesConfig.reviewStages
  const selfOn = Boolean(getReviewStage(stages, 'self_review')?.enabled)
  const managerOn = Boolean(getReviewStage(stages, 'manager_review')?.enabled)
  const calOn = Boolean(
    getReviewStage(stages, 'calibration_hod_hrbp')?.enabled ||
      getReviewStage(stages, 'calibration_slt')?.enabled,
  )
  const appealOn = Boolean(getReviewStage(stages, 'appeal')?.enabled)
  const pillars = enabledPillars(policy)
  const selfQuestions = enabledQuestions(policy, 'employee')
  const managerQuestions = enabledQuestions(policy, 'manager')

  return (
    <div className="pd-page pd-page--pane pd-page--wide pd-reviews pd-review-packet">
      <header className="pd-review-packet__header">
        <Link to={reviewsTabPath()} className="pd-review-packet__back">
          All reviews
        </Link>
        <h1 className="pd-review-packet__title">
          {person?.fullName ?? `Employee ${employeeId}`}
        </h1>
        <p className="pd-review-packet__meta">
          {cycle.name} · {packet.status.replace(/_/g, ' ')}
        </p>
        <p className="pd-reviews-flow__hint">
          {PURPOSE_HINT[cycle.purpose ?? 'quarterly_checkin']}
        </p>
        <p className="pd-reviews-flow__path">
          {describeEnabledFlow(stages)}
        </p>
      </header>

      {selfOn && (isSubject || packet.status !== 'not_started') ? (
        <PacketForm
          title="Self-review"
          locked={!isSubject || packet.status === 'self_submitted' || packet.status === 'manager_submitted'}
          policy={policy}
          questions={selfQuestions}
          pillars={pillars}
          packet={packet}
          actorRole="self"
          overall={packet.selfOverallGrade}
          saving={saving}
          onSave={async (draft, submit) => {
            setSaving(true)
            try {
              const next = await saveReviewPacket(packet.id, {
                ...draft,
                actorRole: 'self',
                submit,
              })
              setPacket(next)
            } finally {
              setSaving(false)
            }
          }}
        />
      ) : null}

      {managerOn && isManager ? (
        <PacketForm
          title="Manager review"
          locked={
            packet.status === 'released_to_employees' ||
            packet.status === 'released_to_managers'
          }
          policy={policy}
          questions={managerQuestions}
          pillars={pillars}
          packet={packet}
          actorRole="manager"
          overall={packet.managerOverallGrade}
          saving={saving}
          showSelf={
            policy.selfReview.visibility !== 'blinded' ||
            packet.status === 'self_submitted' ||
            packet.status === 'manager_submitted'
          }
          onSave={async (draft, submit) => {
            setSaving(true)
            try {
              const next = await saveReviewPacket(packet.id, {
                ...draft,
                actorRole: 'manager',
                submit,
              })
              setPacket(next)
            } finally {
              setSaving(false)
            }
          }}
        />
      ) : null}

      {calOn && isManager ? (
        <CalibrationBlock
          packet={packet}
          onSave={async (toGrade, reason) => {
            const next = await calibrateReviewPacket(packet.id, {
              toGrade,
              reason,
              stageId: 'calibration_hod_hrbp',
            })
            setPacket(next)
          }}
        />
      ) : null}

      {appealOn && isSubject && packet.status === 'released_to_employees' ? (
        <AppealBlock
          packet={packet}
          onSave={async (body) => {
            setPacket(await appealReviewPacket(packet.id, body))
          }}
        />
      ) : null}

      {packet.publishedOverallGrade &&
      (packet.status === 'released_to_employees' ||
        (!isSubject && packet.status === 'released_to_managers')) ? (
        <section className="pd-reviews-edit-card">
          <h2 className="pd-reviews-edit-card__title">Final grade</h2>
          <p className="pd-review-packet__grade">{packet.publishedOverallGrade}</p>
        </section>
      ) : null}
    </div>
  )
}

function PacketForm({
  title,
  locked,
  policy,
  questions,
  pillars,
  packet,
  actorRole,
  overall,
  saving,
  showSelf,
  onSave,
}: {
  title: string
  locked: boolean
  policy: ReviewPolicy
  questions: ReviewPolicy['scorecard']['questions']
  pillars: ReviewPolicy['scorecard']['pillars']
  packet: ReviewPacket
  actorRole: 'self' | 'manager'
  overall: GradeBandId | null
  saving: boolean
  showSelf?: boolean
  onSave: (
    draft: {
      answers: Array<{ questionId: string; body: string }>
      pillarScores: Array<{ pillarId: string; grade: GradeBandId | null; comment: string }>
      overallGrade: GradeBandId | null
    },
    submit: boolean,
  ) => Promise<void>
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

  const suggested = useMemo(
    () =>
      combinePillarScores({
        policy,
        pillarGrades: Object.fromEntries(
          Object.entries(grades).map(([id, grade]) => [id, grade || null]),
        ),
      }).suggestedGrade,
    [grades, policy],
  )

  return (
    <section className="pd-reviews-edit-card">
      <h2 className="pd-reviews-edit-card__title">{title}</h2>
      {showSelf && packet.selfOverallGrade ? (
        <p className="pd-reviews-flow__hint">
          Self-review overall: {packet.selfOverallGrade}
        </p>
      ) : null}
      {questions.map((question) => (
        <label key={question.id} className="pd-field">
          <span className="pd-field__label">{question.prompt}</span>
          <textarea
            className="pd-field__control"
            rows={3}
            disabled={locked}
            value={answers[question.id] ?? ''}
            onChange={(event) =>
              setAnswers((current) => ({
                ...current,
                [question.id]: event.target.value,
              }))
            }
          />
        </label>
      ))}
      {pillars.map((pillar) => (
        <Select
          key={pillar.id}
          label={`${pillar.label} (${pillar.weight}%)`}
          value={grades[pillar.id] ?? ''}
          disabled={locked}
          onChange={(event) =>
            setGrades((current) => ({
              ...current,
              [pillar.id]: event.target.value as GradeBandId,
            }))
          }
          options={[{ value: '', label: 'Select a grade' }, ...GRADE_OPTIONS]}
        />
      ))}
      <Select
        label="Overall grade"
        value={overallGrade}
        disabled={locked}
        hint={
          policy.managerReview.gradeSuggestion === 'none'
            ? 'The system does not recommend a grade.'
            : suggested
              ? `Reference only: ${suggested}`
              : undefined
        }
        onChange={(event) => setOverallGrade(event.target.value as GradeBandId)}
        options={[{ value: '', label: 'Select a grade' }, ...GRADE_OPTIONS]}
      />
      {locked ? null : (
        <div className="pd-review-packet__actions">
          <Button
            variant="secondary"
            pill
            disabled={saving}
            onClick={() =>
              void onSave(
                {
                  answers: questions.map((question) => ({
                    questionId: question.id,
                    body: answers[question.id] ?? '',
                  })),
                  pillarScores: pillars.map((pillar) => ({
                    pillarId: pillar.id,
                    grade: (grades[pillar.id] || null) as GradeBandId | null,
                    comment: '',
                  })),
                  overallGrade: (overallGrade || null) as GradeBandId | null,
                },
                false,
              )
            }
          >
            Save draft
          </Button>
          <Button
            variant="primary"
            pill
            disabled={saving}
            onClick={() =>
              void onSave(
                {
                  answers: questions.map((question) => ({
                    questionId: question.id,
                    body: answers[question.id] ?? '',
                  })),
                  pillarScores: pillars.map((pillar) => ({
                    pillarId: pillar.id,
                    grade: (grades[pillar.id] || null) as GradeBandId | null,
                    comment: '',
                  })),
                  overallGrade: (overallGrade || null) as GradeBandId | null,
                },
                true,
              )
            }
          >
            Submit
          </Button>
        </div>
      )}
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
        Manager grade: {packet.managerOverallGrade ?? '—'} · Self grade:{' '}
        {packet.selfOverallGrade ?? '—'}
      </p>
      <Select
        label="Calibrated grade"
        value={grade}
        onChange={(event) => setGrade(event.target.value as GradeBandId)}
        options={GRADE_OPTIONS}
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
        Record calibration change
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
        Submit appeal
      </Button>
    </section>
  )
}
