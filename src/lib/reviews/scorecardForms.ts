import { defaultReviewPolicy, normalizeReviewPolicy } from './reviewPolicy'
import { applyScorecardTemplate } from './scorecardTemplates'
import type {
  CyclePurpose,
  CycleSettings,
  ReviewCycle,
  ReviewPolicy,
  ScorecardForm,
} from './types'

/** Resolve the live form policy for group/cycle settings. */
export function resolveReviewPolicyFromSettings(
  settings: CycleSettings,
  forms: readonly ScorecardForm[],
  purpose: CyclePurpose = 'quarterly_checkin',
  periodKey?: string,
): ReviewPolicy {
  const formId = settings.scorecardFormId
  if (formId) {
    const form = forms.find((item) => item.id === formId)
    if (form) {
      return normalizeReviewPolicy(form.policy, purpose, periodKey)
    }
  }
  return normalizeReviewPolicy(settings.reviewPolicy, purpose, periodKey)
}

export function countScorecardFormUsage(
  formId: string,
  cycles: readonly ReviewCycle[],
): number {
  return cycles.reduce((total, cycle) => {
    const hits = (cycle.groups ?? []).filter(
      (group) => group.settings.scorecardFormId === formId,
    ).length
    return total + hits
  }, 0)
}

function seededForm(input: {
  id: string
  name: string
  description: string
  purpose: CyclePurpose
  periodKey?: string
  templateId: 'annual' | 'quarterly' | 'q4' | 'blank'
  now: string
}): ScorecardForm {
  const policy = applyScorecardTemplate(
    defaultReviewPolicy(input.purpose, input.periodKey),
    input.templateId,
  )
  return {
    id: input.id,
    name: input.name,
    description: input.description,
    policy,
    createdAt: input.now,
    updatedAt: input.now,
    version: 1,
  }
}

/**
 * Built-in forms matching the appraisal model:
 * Q1–Q3 graded check-ins → Q4 progress → Annual overall.
 */
export function seedScorecardForms(): ScorecardForm[] {
  const now = new Date().toISOString()
  return [
    seededForm({
      id: 'form-q1-checkin',
      name: 'Q1 check-in',
      description:
        'Q1 Goals grade only. Locked grade later feeds the Annual Goals rollup.',
      purpose: 'quarterly_checkin',
      periodKey: 'q1-2026',
      templateId: 'quarterly',
      now,
    }),
    seededForm({
      id: 'form-q2-checkin',
      name: 'Q2 check-in',
      description:
        'Q2 Goals grade only. Locked grade later feeds the Annual Goals rollup.',
      purpose: 'quarterly_checkin',
      periodKey: 'q2-2026',
      templateId: 'quarterly',
      now,
    }),
    seededForm({
      id: 'form-q3-checkin',
      name: 'Q3 check-in',
      description:
        'Q3 Goals grade only. Locked grade later feeds the Annual Goals rollup.',
      purpose: 'quarterly_checkin',
      periodKey: 'q3-2026',
      templateId: 'quarterly',
      now,
    }),
    seededForm({
      id: 'form-q4-progress',
      name: 'Q4 progress',
      description:
        'Goals progress only — no quarter grade. Manager sets the Q4 grade in Annual.',
      purpose: 'quarterly_checkin',
      periodKey: 'q4-2026',
      templateId: 'q4',
      now,
    }),
    seededForm({
      id: 'form-annual-appraisal',
      name: 'Annual appraisal',
      description:
        'Goals (from Q1–Q4) 50% + Skills 25% + Values 25%, with year-end questions and overall grading.',
      purpose: 'annual_appraisal',
      periodKey: 'annual-2026',
      templateId: 'annual',
      now,
    }),
    seededForm({
      id: 'form-blank',
      name: 'Blank form',
      description: 'Empty canvas to build from scratch.',
      purpose: 'custom',
      templateId: 'blank',
      now,
    }),
  ]
}

/** Suggested built-in form id for a cycle purpose / period. */
export function suggestedScorecardFormId(
  purpose: CyclePurpose,
  periodKey?: string,
): string | null {
  if (purpose === 'annual_appraisal') return 'form-annual-appraisal'
  if (purpose === 'quarterly_checkin') {
    const match = /^q([1-4])-\d{4}$/i.exec(periodKey ?? '')
    if (!match) return 'form-q1-checkin'
    const quarter = match[1]
    if (quarter === '4') return 'form-q4-progress'
    return `form-q${quarter}-checkin`
  }
  return null
}

export function normalizeScorecardForm(
  form: Partial<ScorecardForm> & Pick<ScorecardForm, 'id' | 'name'>,
): ScorecardForm {
  const now = new Date().toISOString()
  return {
    id: form.id,
    name: form.name.trim() || 'Untitled form',
    description: form.description?.trim() || undefined,
    policy: normalizeReviewPolicy(form.policy, 'custom'),
    createdAt: form.createdAt ?? now,
    updatedAt: form.updatedAt ?? now,
    version: form.version ?? 1,
  }
}

/** True when the review form content (not metadata) differs. */
export function scorecardFormPolicyEquals(
  left: ReviewPolicy,
  right: ReviewPolicy,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

export const ALLOCATED_FORM_POLICY_LOCK =
  'This form is allocated to cycle groups. Duplicate it to edit the scorecard — changing it in place would also change every past quarter that uses it.'

