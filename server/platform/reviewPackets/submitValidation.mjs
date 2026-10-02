const PERFORMANCE_GRADES = new Set([
  'unsatisfactory',
  'developing',
  'performing',
  'exceeding',
  'exceptional',
])

const SKILL_GRADES = new Set([
  'unsatisfactory',
  'basic',
  'intermediate',
  'advanced',
  'expert',
])

const LEGACY_SKILL_BANDS = new Set([
  'poor',
  'developing',
  'performing',
  'exceeding',
  'exceptional',
])

const PACKED_FEEDBACK_IDS = new Set(['strengths', 'developments'])

function isPerformanceGrade(value) {
  return PERFORMANCE_GRADES.has(String(value ?? ''))
}

function isSkillGrade(value) {
  const raw = String(value ?? '')
  return SKILL_GRADES.has(raw) || LEGACY_SKILL_BANDS.has(raw)
}

function visibilityForActor(actorRole) {
  return actorRole === 'self' ? 'employee' : 'manager'
}

function enabledPillars(policy) {
  return (policy?.scorecard?.pillars ?? []).filter((pillar) => pillar.enabled)
}

function enabledQuestions(policy, visibility) {
  return (policy?.scorecard?.questions ?? []).filter((question) => {
    if (!question || question.enabled === false) return false
    if (!visibility) return true
    return (
      Array.isArray(question.visibility) &&
      question.visibility.includes(visibility)
    )
  })
}

function feedbackConfig(policy) {
  const feedback = policy?.scorecard?.feedback ?? {}
  return {
    enabled: feedback.enabled === true,
    required: feedback.required === true,
    visibility: Array.isArray(feedback.visibility)
      ? feedback.visibility
      : ['employee', 'manager'],
    labels:
      Array.isArray(feedback.labels) && feedback.labels.length === 2
        ? feedback.labels
        : ['Strengths', 'Areas Of Improvement'],
  }
}

function questionComplete(question, body) {
  const kind = question.kind ?? 'open_ended'
  const raw = String(body ?? '')
  if (kind === 'yes_no') return raw === 'yes' || raw === 'no'
  if (kind === 'multiple_choice') return Boolean(raw.trim())
  if (kind === 'dual_text') {
    try {
      const parsed = JSON.parse(raw)
      return Boolean(
        String(parsed?.a ?? '').trim() || String(parsed?.b ?? '').trim(),
      )
    } catch {
      return Boolean(raw.trim())
    }
  }
  return Boolean(raw.trim())
}

function gradeFromScores(scores, pillarId) {
  const match = (scores ?? []).find((score) => score.pillarId === pillarId)
  return match?.grade ?? null
}

function skillGradeFromScores(scores, skillId) {
  const match = (scores ?? []).find(
    (score) =>
      score.pillarId === `skill:${skillId}` ||
      (typeof score.pillarId === 'string' &&
        score.pillarId.startsWith('skill:') &&
        score.pillarId.slice('skill:'.length) === skillId),
  )
  return match?.grade ?? null
}

function valueGradeFromScores(scores, valueId) {
  const match = (scores ?? []).find(
    (score) =>
      score.pillarId === `value:${valueId}` ||
      (typeof score.pillarId === 'string' &&
        score.pillarId.startsWith('value:') &&
        score.pillarId.slice('value:'.length) === valueId),
  )
  return match?.grade ?? null
}

/**
 * First reason this scorecard cannot be submitted, or null when complete.
 */
export function describeScorecardSubmitBlock(input) {
  const policy = input.policy ?? {}
  const actorRole = input.actorRole === 'manager' ? 'manager' : 'self'
  const leave = Boolean(input.leave)
  const pillars = enabledPillars(policy)
  const gradeGoals = Boolean(policy.managerReview?.gradeGoals)
  const gradeOverall = Boolean(policy.managerReview?.gradeOverall)
  const visibility = visibilityForActor(actorRole)
  const scores = input.pillarScores ?? []

  if (gradeGoals && !leave) {
    const goalsOn = pillars.some((pillar) => pillar.id === 'goals')
    if (goalsOn) {
      if (input.useWeightedSuggest && actorRole === 'manager') {
        if (!isPerformanceGrade(input.q4Grade)) {
          return 'Select a Q4 Goals grade before submitting.'
        }
      } else if (
        !isPerformanceGrade(input.goalsGrade ?? gradeFromScores(scores, 'goals'))
      ) {
        return 'Select a Goals grade before submitting.'
      }
    }
  }

  if (pillars.some((pillar) => pillar.id === 'skills')) {
    const skillIds = input.skillIds ?? []
    if (skillIds.some((skillId) => !isSkillGrade(skillGradeFromScores(scores, skillId)))) {
      return 'Grade every skill before submitting.'
    }
  }

  if (pillars.some((pillar) => pillar.id === 'values')) {
    const valueIds = input.valueIds ?? []
    if (
      valueIds.some((valueId) => !isPerformanceGrade(valueGradeFromScores(scores, valueId)))
    ) {
      return 'Grade every core value before submitting.'
    }
  }

  for (const pillar of pillars) {
    if (
      pillar.id === 'goals' ||
      pillar.id === 'skills' ||
      pillar.id === 'values'
    ) {
      continue
    }
    if (!isPerformanceGrade(gradeFromScores(scores, pillar.id))) {
      return `Select a ${pillar.label} grade before submitting.`
    }
  }

  const answersById = new Map(
    (input.answers ?? []).map((answer) => [
      answer.questionId,
      String(answer.body ?? ''),
    ]),
  )
  const questions = enabledQuestions(policy, visibility).filter(
    (question) => !PACKED_FEEDBACK_IDS.has(question.id),
  )
  for (const question of questions) {
    if (question.required !== true) continue
    if (!questionComplete(question, answersById.get(question.id) ?? '')) {
      return 'Answer every required question before submitting.'
    }
  }

  if (gradeOverall && !leave && !isPerformanceGrade(input.overallGrade)) {
    return 'Select an overall grade before submitting.'
  }

  const feedback = feedbackConfig(policy)
  if (feedback.enabled && feedback.visibility.includes(visibility) && feedback.required) {
    const strengths = String(input.strengths ?? '').trim()
    const developments = String(input.developments ?? '').trim()
    if (!strengths || !developments) {
      const [labelA, labelB] = feedback.labels
      return `Fill in ${labelA} and ${labelB} before submitting.`
    }
  }

  return null
}

export function packedFeedbackFromAnswers(answers) {
  const list = Array.isArray(answers) ? answers : []
  return {
    strengths:
      list.find((answer) => answer.questionId === 'strengths')?.body ?? '',
    developments:
      list.find((answer) => answer.questionId === 'developments')?.body ?? '',
  }
}
