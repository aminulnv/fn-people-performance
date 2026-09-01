import { describe, expect, it } from 'vitest'
import {
  activityDisplaySummary,
  activityHeadline,
  formatActivityChanges,
} from './formatChanges'
import type { ActivityEvent } from './types'

describe('formatActivityChanges', () => {
  it('expands a stored goal blob into field rows', () => {
    const rows = formatActivityChanges([
      {
        field: 'goal',
        from: {
          description: 'Grow NPS',
          weight: 20,
          measurements: [
            {
              id: 'm1',
              kind: 'metric',
              title: 'NPS',
              currentValue: 62,
              targetValue: 70,
            },
          ],
        },
        to: {
          description: 'Grow NPS',
          weight: 30,
          measurements: [
            {
              id: 'm1',
              kind: 'metric',
              title: 'NPS',
              currentValue: 68,
              targetValue: 70,
            },
          ],
        },
      },
    ])
    expect(rows).toEqual([
      { field: 'Weight', from: '20%', to: '30%' },
      { field: 'NPS · Progress', from: '62', to: '68' },
    ])
  })

  it('formats grades and statuses in plain language', () => {
    const rows = formatActivityChanges([
      { field: 'grade', from: 'performing', to: 'exceeding' },
      { field: 'status', from: 'submitted', to: 'approved' },
    ])
    expect(rows).toEqual([
      { field: 'Grade', from: 'Performing', to: 'Exceeding' },
      { field: 'Status', from: 'Submitted', to: 'Approved' },
    ])
  })

  it('labels a repeated goal title as Progress', () => {
    const title =
      'Build Performance Platform Phase 1 | Q3 Build, Q4 Testing, Q1 2027 Launch'
    const rows = formatActivityChanges(
      [{ field: title, from: 20, to: 50 }],
      { goalTitle: title },
    )
    expect(rows).toEqual([{ field: 'Progress', from: '20', to: '50' }])
  })

  it('never prints raw JSON for nested cycle settings', () => {
    const rows = formatActivityChanges([
      {
        field: 'calibration',
        from: { mode: 'off', bands: [1, 2] },
        to: { mode: 'department', bands: [1, 2] },
      },
    ])
    expect(rows).toEqual([
      {
        field: 'Calibration · Mode',
        from: 'off',
        to: 'department',
      },
    ])
    expect(rows.every((row) => !row.from.includes('{') && !row.to.includes('{'))).toBe(
      true,
    )
  })
})

describe('activityDisplaySummary', () => {
  it('collapses a metric name that repeats the goal title', () => {
    const event = {
      summary:
        'Updated “Build Performance Platform Phase 1” on “Build Performance Platform Phase 1”',
    } as ActivityEvent
    expect(activityDisplaySummary(event)).toBe(
      'Updated progress on “Build Performance Platform Phase 1”',
    )
  })
})

describe('activityHeadline', () => {
  it('calls out a late goal submission', () => {
    const event = {
      eventKey: 'goal_submission.submitted',
      metadata: { late: true },
    } as ActivityEvent
    expect(activityHeadline(event)).toBe('Submitted goals after the deadline')
  })
})
