import { describe, expect, it } from 'vitest'

type ActivityViewer = {
  employeeId: number | null
  permissions: Set<string>
  reportIds: Set<number>
  skipLevelIds: Set<number>
}

type ActivityEventLike = {
  eventKey: string
  entityType: string
  subjectEmployeeId?: number
  actorEmployeeId?: number
}

/**
 * Mirrors server/platform/activityPolicy.mjs canViewActivityRow for unit tests
 * without pulling in the Postgres-backed server module graph.
 */
function canViewActivityRow(
  viewer: ActivityViewer,
  event: ActivityEventLike,
): boolean {
  if (viewer.permissions.has('activity.read_all')) return true
  if (viewer.permissions.has('platform.read_all')) {
    if (
      event.entityType === 'access' &&
      !viewer.permissions.has('access.manage')
    ) {
      return false
    }
    return true
  }

  if (event.entityType === 'access') {
    return viewer.permissions.has('access.manage')
  }

  const subjectId = event.subjectEmployeeId
  if (subjectId == null) return false
  if (viewer.employeeId != null && subjectId === viewer.employeeId) return true
  if (viewer.reportIds.has(subjectId)) return true

  if (
    viewer.skipLevelIds.has(subjectId) &&
    (event.eventKey.includes('final_approved') ||
      event.eventKey.includes('manager_manager') ||
      event.eventKey.includes('submitted') ||
      event.eventKey.includes('sent_back'))
  ) {
    return true
  }

  return false
}

function viewer(
  overrides: Partial<ActivityViewer> = {},
): ActivityViewer {
  return {
    employeeId: 1,
    permissions: new Set<string>(),
    reportIds: new Set<number>(),
    skipLevelIds: new Set<number>(),
    ...overrides,
  }
}

describe('canViewActivityRow policy', () => {
  it('lets people see their own subject history', () => {
    expect(
      canViewActivityRow(viewer(), {
        eventKey: 'goal_submission.submitted',
        entityType: 'goal_submission',
        subjectEmployeeId: 1,
      }),
    ).toBe(true)
  })

  it('isolates unrelated subjects', () => {
    expect(
      canViewActivityRow(viewer(), {
        eventKey: 'goal_submission.submitted',
        entityType: 'goal_submission',
        subjectEmployeeId: 99,
      }),
    ).toBe(false)
  })

  it('allows direct managers for report subjects', () => {
    expect(
      canViewActivityRow(viewer({ reportIds: new Set([12]) }), {
        eventKey: 'goal_submission.approved',
        entityType: 'goal_submission',
        subjectEmployeeId: 12,
      }),
    ).toBe(true)
  })

  it('keeps access events behind access.manage', () => {
    expect(
      canViewActivityRow(
        viewer({ permissions: new Set(['platform.read_all']) }),
        {
          eventKey: 'access.profile_changed',
          entityType: 'access',
          subjectEmployeeId: 12,
        },
      ),
    ).toBe(false)
    expect(
      canViewActivityRow(
        viewer({
          permissions: new Set(['platform.read_all', 'access.manage']),
        }),
        {
          eventKey: 'access.profile_changed',
          entityType: 'access',
          subjectEmployeeId: 12,
        },
      ),
    ).toBe(true)
  })
})
