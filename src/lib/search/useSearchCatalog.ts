import { useEffect, useMemo, useState } from 'react'
import type { PlatformDepartment } from '@/lib/employees/types'
import { useOrganisation } from '@/lib/employees/useEmployees'
import { getGoalsSnapshot, subscribeGoalsStore } from '@/lib/goals/store'
import { getNotificationFeed, subscribeNotifications } from '@/lib/notifications/store'
import { buildEmployeeScorecardHistory } from '@/lib/reviews/scorecards'
import { listReviewCycles, subscribeReviewsStore } from '@/lib/reviews/store'
import { useAuth } from '@/lib/useAuth'
import { buildSearchCatalog } from './catalog'
import type { SearchItem } from './types'

const EMPTY_FEED_ITEMS: never[] = []
const NO_DEPARTMENT_CATALOG: PlatformDepartment[] = []

export function useSearchCatalog(): SearchItem[] {
  const { user } = useAuth()
  const { employees, organisation } = useOrganisation(
    NO_DEPARTMENT_CATALOG,
    { load: false },
  )
  const [goalsTick, setGoalsTick] = useState(0)
  const [reviewsTick, setReviewsTick] = useState(0)
  const [notifyTick, setNotifyTick] = useState(0)

  useEffect(() => subscribeGoalsStore(() => setGoalsTick((n) => n + 1)), [])
  useEffect(() => subscribeReviewsStore(() => setReviewsTick((n) => n + 1)), [])
  useEffect(() => subscribeNotifications(() => setNotifyTick((n) => n + 1)), [])

  return useMemo(() => {
    void goalsTick
    void reviewsTick
    void notifyTick

    const goals = getGoalsSnapshot()
    const userEmail = user?.email.trim().toLowerCase() ?? ''
    const me =
      employees.find((employee) => {
        if (user?.employeeId && employee.employeeId === user.employeeId) {
          return true
        }
        return (
          userEmail.length > 0 &&
          employee.email.trim().toLowerCase() === userEmail
        )
      }) ?? null

    return buildSearchCatalog({
      user: user
        ? {
            personId: user.personId,
            email: user.email,
            name: user.name,
            employeeId: user.employeeId,
            permissions: user.permissions,
          }
        : null,
      employees,
      organisation,
      goals,
      cycles: listReviewCycles(),
      scorecards: me
        ? buildEmployeeScorecardHistory(me, employees, user?.email)
        : [],
      notifications: user
        ? getNotificationFeed(user.personId).items
        : EMPTY_FEED_ITEMS,
    })
  }, [employees, goalsTick, notifyTick, organisation, reviewsTick, user])
}
