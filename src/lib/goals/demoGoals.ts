import { rebalanceMeasurementWeights } from './measurements'
import type { Goal, PersonGoals, SendBackAuthor, SubmissionStatus } from './types'

function seedId(cycleId: string, personId: string, suffix: string): string {
  return `demo-${cycleId}-${personId}-${suffix}`
}

/**
 * Demo goals live in the Goals domain so Goals and Scorecards render the same
 * records. Persisted edits replace these defaults for that person and cycle.
 */
export function buildDemoGoals(cycleId: string, personId: string): Goal[] {
  return [
    {
      id: seedId(cycleId, personId, 'delivery-quality'),
      description: 'Improve delivery quality and close critical defects faster',
      details:
        'Close critical defects faster than last quarter and keep reopen rate down. Success: 80 defects closed with quality held.',
      goalType: 'outcome',
      processType: 'bau',
      priority: 'high',
      weight: 40,
      progressStatus: 'on_track',
      measurements: rebalanceMeasurementWeights([
        {
          id: seedId(cycleId, personId, 'defects-closed'),
          kind: 'metric',
          title: 'Defects closed',
          weight: 0,
          unit: 'number',
          direction: 'greater_than',
          startValue: 0,
          targetValue: 80,
          currentValue: 90,
          progressLog: [
            {
              id: seedId(cycleId, personId, 'defects-log-1'),
              recordedAt: '2026-08-01T09:00:00.000Z',
              authorName: 'Owner',
              from: 0,
              to: 40,
            },
            {
              id: seedId(cycleId, personId, 'defects-log-2'),
              recordedAt: '2026-08-10T14:30:00.000Z',
              authorName: 'Owner',
              from: 40,
              to: 90,
            },
          ],
        },
        {
          id: seedId(cycleId, personId, 'todo-triage'),
          kind: 'milestone',
          title: 'Triage incoming defects within one business day',
          weight: 0,
          complete: false,
        },
        {
          id: seedId(cycleId, personId, 'todo-reopen'),
          kind: 'milestone',
          title: 'Keep reopen rate under the agreed quality bar',
          weight: 0,
          complete: false,
        },
      ]),
    },
    {
      id: seedId(cycleId, personId, 'roadmap'),
      description: 'Ship roadmap commitments for the quarter on schedule',
      details:
        'Deliver the committed quarter roadmap. Success: 10 milestones shipped on the agreed dates.',
      goalType: 'output',
      processType: 'okr',
      priority: 'high',
      weight: 35,
      progressStatus: 'on_track',
      measurements: [
        {
          id: seedId(cycleId, personId, 'milestones'),
          kind: 'metric',
          title: 'Milestones',
          weight: 100,
          unit: 'number',
          direction: 'greater_than',
          startValue: 0,
          targetValue: 10,
          currentValue: 10,
        },
      ],
    },
    {
      id: seedId(cycleId, personId, 'collaboration'),
      description:
        'Strengthen cross-team collaboration and stakeholder updates',
      details:
        'Keep stakeholders current and raise the quality of cross-team feedback. Success: feedback score at or above 10.',
      goalType: 'outcome',
      processType: 'bau',
      priority: 'medium',
      weight: 25,
      progressStatus: 'on_track',
      measurements: [
        {
          id: seedId(cycleId, personId, 'feedback'),
          kind: 'metric',
          title: 'NPS / feedback',
          weight: 100,
          unit: 'number',
          direction: 'greater_than',
          startValue: 0,
          targetValue: 10,
          currentValue: 13,
          progressLog: [
            {
              id: seedId(cycleId, personId, 'feedback-log-1'),
              recordedAt: '2026-08-05T11:15:00.000Z',
              authorName: 'Owner',
              from: 0,
              to: 10,
            },
            {
              id: seedId(cycleId, personId, 'feedback-log-2'),
              recordedAt: '2026-08-14T08:40:00.000Z',
              authorName: 'Owner',
              from: 10,
              to: 13,
            },
          ],
        },
      ],
    },
  ]
}

/**
 * Stable demo status so the Goals UI shows approval variations.
 * Signed-in person stays draft so goal setting remains demoable, and their
 * direct reports stay pending so the approval flow has something to act on.
 */
export function demoSeedStatus(
  personId: string,
  signedInPersonId?: string,
  managerId?: string,
): SubmissionStatus {
  if (signedInPersonId && personId === signedInPersonId) return 'draft'
  if (signedInPersonId && managerId === signedInPersonId) return 'submitted'

  let hash = 0
  for (let i = 0; i < personId.length; i++) {
    hash = (hash + personId.charCodeAt(i) * (i + 1)) % 1000
  }

  // Roughly half pending approval, half approved (plus a few sent-back).
  switch (hash % 5) {
    case 0:
    case 1:
      return 'submitted'
    case 2:
      return 'sent_back'
    default:
      return 'approved'
  }
}

export function buildDemoPersonGoals(
  cycleId: string,
  personId: string,
  status: SubmissionStatus,
  sendBackBy?: SendBackAuthor,
): PersonGoals {
  return {
    personId,
    status,
    goals: buildDemoGoals(cycleId, personId),
    managerNote:
      status === 'approved' ? 'Approved for performance review' : undefined,
    sendBackReason:
      status === 'sent_back'
        ? 'Please tighten measurement targets and rebalance weightage to 100%.'
        : undefined,
    sendBackBy: status === 'sent_back' ? sendBackBy : undefined,
  }
}
