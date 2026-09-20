import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { PlatformDepartment } from '@/lib/employees/types'
import { useOrganisation } from '@/lib/employees/useEmployees'
import { getGoalsSnapshot, subscribeGoalsStore } from '@/lib/goals/store'
import { fetchNotifications, watchNotifications } from '@/lib/notificationsApi'
import { queryKeys } from '@/lib/queryClient'
import { buildEmployeeScorecardHistory } from '@/lib/reviews/scorecards'
import { listReviewCycles, subscribeReviewsStore } from '@/lib/reviews/store'
import { useAuth } from '@/lib/useAuth'
import { useCurrentPerson } from '@/lib/useCurrentPerson'
import { buildSearchCatalog } from './catalog'
import type { SearchItem } from './types'

const NO_DEPARTMENT_CATALOG: PlatformDepartment[] = []

export function useSearchCatalog(): SearchItem[] {
  const { user } = useAuth()
  const person = useCurrentPerson()
  const queryClient = useQueryClient()
  const { employees, organisation } = useOrganisation(
    NO_DEPARTMENT_CATALOG,
    { load: false },
  )
  const [goalsTick, setGoalsTick] = useState(0)
  const [reviewsTick, setReviewsTick] = useState(0)

  useEffect(() => subscribeGoalsStore(() => setGoalsTick((n) => n + 1)), [])
  useEffect(() => subscribeReviewsStore(() => setReviewsTick((n) => n + 1)), [])
  useEffect(
    () =>
      watchNotifications(() => {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.notifications(person?.id ?? ''),
        })
      }),
    [person?.id, queryClient],
  )

  const { data: feed } = useQuery({
    queryKey: queryKeys.notifications(person?.id ?? ''),
    queryFn: () => fetchNotifications(person!),
    enabled: Boolean(person),
  })

  return useMemo(() => {
    void goalsTick
    void reviewsTick

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
      notifications: feed?.items ?? [],
    })
  }, [employees, feed?.items, goalsTick, organisation, reviewsTick, user])
}
