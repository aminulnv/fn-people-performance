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
import { cycleDetailPath, scorecardsLibraryPath } from '@/lib/reviews/paths'
import {
  goalsDetailPath,
  goalsGoalPath,
} from '@/pages/goals/goalHelpers'
import {
  RequirePlatformRead,
  RequirePlatformWrite,
  RequireReviewOversight,
} from '@/layout/RequirePlatformWrite'
import {
  GlobalRouteProgressComplete,
  NavigationProgressProvider,
  RouteLoadingFallback,
} from '@/components/ui/NavigationProgress'

const AuthenticatedLayout = lazy(() => import('@/layout/AuthenticatedLayout'))
const HomePage = lazy(() => import('@/pages/HomePage'))
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const GoalsPage = lazy(() => import('@/pages/GoalsPage'))
const ReviewsPage = lazy(() => import('@/pages/ReviewsPage'))
const SkillsPage = lazy(() => import('@/pages/SkillsPage'))
const ValuesPage = lazy(() => import('@/pages/ValuesPage'))
const CalibrationPage = lazy(() => import('@/pages/CalibrationPage'))
const CyclesPage = lazy(() => import('@/pages/CyclesPage'))
const CycleDetailPage = lazy(() => import('@/pages/CycleDetailPage'))
const GroupSettingsPage = lazy(() => import('@/pages/reviews/GroupSettingsPage'))
const ScorecardDetailPage = lazy(() => import('@/pages/ScorecardDetailPage'))
const ScorecardsBuilderPage = lazy(() => import('@/pages/ScorecardsBuilderPage'))
/** Canonical People directory - same pill controls as Organisation. */
const PeoplePage = lazy(() => import('@/pages/PeoplePage'))
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
const EditDepartmentPage = lazy(() => import('@/pages/EditDepartmentPage'))
const TeamDetailPage = lazy(() => import('@/pages/TeamDetailPage'))
const TeamFormPage = lazy(() => import('@/pages/TeamFormPage'))
const EditRolePage = lazy(() => import('@/pages/EditRolePage'))
const RoleDetailPage = lazy(() => import('@/pages/RoleDetailPage'))
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

/** Legacy `/scorecards-builder/...` URLs → Reviews Scorecards Library. */
function LegacyScorecardsBuilderRedirect() {
  const { formId } = useParams()
  return <Navigate to={scorecardsLibraryPath(formId)} replace />
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
    <BrowserRouter basename={routerBasename} useTransitions={false}>
      <NavigationProgressProvider>
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<AuthenticatedLayout />}>
              <Route index element={<HomePage />} />
              <Route path="profile" element={<MyProfilePage />} />
              <Route path="people" element={<PeoplePage />} />
              <Route path="people/new" element={<CreateEmployeePage />} />
              <Route path="people/:employeeId/edit" element={<EditEmployeePage />} />
              <Route path="people/:employeeId" element={<EmployeeProfilePage />} />
              <Route
                path="organisation"
                element={<Navigate to="/organisation/departments" replace />}
              />
              <Route
                path="organisation/departments"
                element={<OrganisationPage />}
              />
              <Route path="organisation/teams" element={<OrganisationPage />} />
              <Route
                path="organisation/roles/new"
                element={<OrganisationPage />}
              />
              <Route path="organisation/roles" element={<OrganisationPage />} />
              <Route path="organisation/chart" element={<OrgChartPage />} />
              <Route
                path="organisation/departments/new"
                element={
                  <RequirePlatformWrite>
                    <CreateDepartmentPage />
                  </RequirePlatformWrite>
                }
              />
              <Route
                path="organisation/departments/:departmentId/edit"
                element={
                  <RequirePlatformWrite>
                    <EditDepartmentPage />
                  </RequirePlatformWrite>
                }
              />
              <Route
                path="organisation/departments/:departmentId"
                element={<DepartmentDetailPage />}
              />
              <Route
                path="organisation/teams/new"
                element={
                  <RequirePlatformWrite>
                    <TeamFormPage />
                  </RequirePlatformWrite>
                }
              />
              <Route
                path="organisation/teams/:teamId/edit"
                element={
                  <RequirePlatformWrite>
                    <TeamFormPage />
                  </RequirePlatformWrite>
                }
              />
              <Route
                path="organisation/teams/:teamId"
                element={<TeamDetailPage />}
              />
              <Route
                path="organisation/roles/:roleId/edit"
                element={
                  <RequirePlatformWrite>
                    <EditRolePage />
                  </RequirePlatformWrite>
                }
              />
              <Route
                path="organisation/roles/:roleId"
                element={<RoleDetailPage />}
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
                path="reviews/scorecards-library/:formId"
                element={
                  <RequirePlatformWrite>
                    <ScorecardsBuilderPage />
                  </RequirePlatformWrite>
                }
              />
              <Route
                path="reviews/scorecards-library"
                element={
                  <RequirePlatformWrite>
                    <ScorecardsBuilderPage />
                  </RequirePlatformWrite>
                }
              />
              {/* Splat keeps SkillsPage mounted when opening create/edit panels. */}
              <Route path="reviews/skills/*" element={<SkillsPage />} />
              <Route path="reviews/values/*" element={<ValuesPage />} />
              <Route
                path="scorecards-builder/:formId"
                element={<LegacyScorecardsBuilderRedirect />}
              />
              <Route
                path="scorecards-builder"
                element={<Navigate to="/reviews/scorecards-library" replace />}
              />
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
                path="calibration"
                element={<Navigate to="/calibration/insights" replace />}
              />
              <Route
                path="calibration/:view"
                element={
                  <RequireReviewOversight>
                    <CalibrationPage />
                  </RequireReviewOversight>
                }
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
                path="cycles/:cycleId/groups/:groupId"
                element={
                  <RequirePlatformWrite>
                    <GroupSettingsPage />
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
                element={
                  <RequirePlatformRead>
                    <AnalyticsPage />
                  </RequirePlatformRead>
                }
              />
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
