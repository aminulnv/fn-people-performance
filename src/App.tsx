import { Suspense, lazy } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
} from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { isCycleSection } from '@/lib/reviews/cycleSections'
import { cycleDetailPath } from '@/lib/reviews/paths'
import {
  goalsDetailPath,
  goalsGoalPath,
} from '@/pages/goals/goalHelpers'
import { RequirePlatformWrite } from '@/layout/RequirePlatformWrite'
import {
  GlobalRouteProgressComplete,
  NavigationProgressProvider,
} from '@/components/ui/NavigationProgress'

const AuthenticatedLayout = lazy(() => import('@/layout/AuthenticatedLayout'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const HomePage = lazy(() => import('@/pages/HomePage'))
const ComingSoonPage = lazy(() => import('@/pages/ComingSoonPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const GoalsPage = lazy(() => import('@/pages/GoalsPage'))
const ReviewsPage = lazy(() => import('@/pages/ReviewsPage'))
const CyclesPage = lazy(() => import('@/pages/CyclesPage'))
const CycleDetailPage = lazy(() => import('@/pages/CycleDetailPage'))
const ScorecardDetailPage = lazy(() => import('@/pages/ScorecardDetailPage'))
/** Canonical People directory — same pill controls as Organisation. */
const PeoplePage = lazy(() => import('@/pages/PeoplePage'))
/** Soft-rect radius preview (optional). */
const PeopleV3Page = lazy(() => import('@/pages/PeopleV3Page'))
const CreateEmployeePage = lazy(() => import('@/pages/CreateEmployeePage'))
const EditEmployeePage = lazy(() => import('@/pages/EditEmployeePage'))
const EmployeeProfilePage = lazy(() => import('@/pages/EmployeeProfilePage'))
const MyProfilePage = lazy(() => import('@/pages/MyProfilePage'))
const OrganisationPage = lazy(() => import('@/pages/OrganisationPage'))
const OrgChartPage = lazy(() => import('@/pages/OrgChartPage'))
const DepartmentDetailPage = lazy(
  () => import('@/pages/DepartmentDetailPage'),
)
const CreateDepartmentPage = lazy(
  () => import('@/pages/CreateDepartmentPage'),
)
const TeamDetailPage = lazy(() => import('@/pages/TeamDetailPage'))
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))

function CatchAllRedirect() {
  const { status } = useAuth()
  if (status === 'loading') {
    return null
  }
  return (
    <Navigate to={status === 'authenticated' ? '/' : '/login'} replace />
  )
}

/** Legacy `/reviews/cycles/...` URLs → standalone `/cycles/...`. */
function LegacyCycleRedirect() {
  const { cycleId = '', section } = useParams()
  if (!cycleId) return <Navigate to="/cycles" replace />
  return (
    <Navigate
      to={cycleDetailPath(
        cycleId,
        isCycleSection(section) ? section : 'settings',
      )}
      replace
    />
  )
}

/** Legacy `/goals-v2/...` URLs → canonical `/goals/...`. */
function LegacyGoalsV2Redirect() {
  const { cycleId = '', personId = '', goalId } = useParams()
  if (!cycleId || !personId) return <Navigate to="/goals" replace />
  const path = goalId
    ? goalsGoalPath(cycleId, personId, goalId)
    : goalsDetailPath(cycleId, personId)
  return <Navigate to={path} replace />
}

/** Matches Vite `base` (`/` locally, `/platform/` in production builds). */
const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined

function App() {
  return (
    <BrowserRouter basename={routerBasename}>
      <NavigationProgressProvider>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<AuthenticatedLayout />}>
              <Route index element={<HomePage />} />
              <Route path="profile" element={<MyProfilePage />} />
              <Route path="people" element={<PeoplePage />} />
              <Route path="people-v3" element={<PeopleV3Page />} />
              <Route path="people/new" element={<CreateEmployeePage />} />
              <Route path="people/:employeeId/edit" element={<EditEmployeePage />} />
              <Route path="people/:employeeId" element={<EmployeeProfilePage />} />
              <Route path="organisation" element={<OrganisationPage />} />
              <Route path="organisation/chart" element={<OrgChartPage />} />
              <Route
                path="organisation/departments/new"
                element={<CreateDepartmentPage />}
              />
              <Route
                path="organisation/departments/:departmentId"
                element={<DepartmentDetailPage />}
              />
              <Route
                path="organisation/teams/:teamId"
                element={<TeamDetailPage />}
              />
              <Route path="goals" element={<GoalsPage />} />
              <Route
                path="goals/:cycleId/:personId/:goalId?"
                element={<GoalsPage />}
              />
              <Route path="goals-v2" element={<Navigate to="/goals" replace />} />
              <Route
                path="goals-v2/:cycleId/:personId/:goalId?"
                element={<LegacyGoalsV2Redirect />}
              />
              <Route
                path="reviews"
                element={<Navigate to="/reviews/scorecards" replace />}
              />
              <Route
                path="reviews/scorecards/:cycleKey/:employeeId"
                element={<ScorecardDetailPage />}
              />
              <Route path="reviews/scorecards" element={<ReviewsPage />} />
              <Route
                path="reviews/cycles/:cycleId/:section"
                element={<LegacyCycleRedirect />}
              />
              <Route
                path="reviews/cycles/:cycleId"
                element={<LegacyCycleRedirect />}
              />
              <Route
                path="reviews/cycles"
                element={<Navigate to="/cycles" replace />}
              />
              <Route
                path="reviews/:tab"
                element={<Navigate to="/reviews/scorecards" replace />}
              />
              <Route
                path="cycles"
                element={
                  <RequirePlatformWrite>
                    <CyclesPage />
                  </RequirePlatformWrite>
                }
              />
              <Route
                path="cycles/:cycleId/:section"
                element={
                  <RequirePlatformWrite>
                    <CycleDetailPage />
                  </RequirePlatformWrite>
                }
              />
              <Route
                path="cycles/:cycleId"
                element={
                  <RequirePlatformWrite>
                    <Navigate to="settings" replace />
                  </RequirePlatformWrite>
                }
              />
              <Route
                path="analytics"
                element={<ComingSoonPage page="analytics" />}
              />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<CatchAllRedirect />} />
          </Routes>
          <GlobalRouteProgressComplete />
        </Suspense>
      </NavigationProgressProvider>
    </BrowserRouter>
  )
}

export default App
