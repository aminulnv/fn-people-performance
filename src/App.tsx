import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'

const AuthenticatedLayout = lazy(() => import('@/layout/AuthenticatedLayout'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const ComingSoonPage = lazy(() => import('@/pages/ComingSoonPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const GoalsPage = lazy(() => import('@/pages/GoalsPage'))
/** Soft-rect People directory (canonical `/people`). */
const PeopleV3Page = lazy(() => import('@/pages/PeopleV3Page'))
/** Redesign under review — lives beside `people` until one direction wins. */
const PeopleV2Page = lazy(() => import('@/pages/PeopleV2Page'))
const CreateEmployeePage = lazy(() => import('@/pages/CreateEmployeePage'))
const EditEmployeePage = lazy(() => import('@/pages/EditEmployeePage'))
const EmployeeProfilePage = lazy(() => import('@/pages/EmployeeProfilePage'))
/** Profile redesign paired with people-v2. */
const EmployeeProfileV2Page = lazy(
  () => import('@/pages/EmployeeProfileV2Page'),
)
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

function RouteFallback() {
  return <div className="pd-route-fallback" aria-busy="true" aria-live="polite" />
}

function CatchAllRedirect() {
  const { status } = useAuth()
  if (status === 'loading') {
    return (
      <div className="pd-route-fallback" aria-busy="true" aria-live="polite" />
    )
  }
  return (
    <Navigate to={status === 'authenticated' ? '/' : '/login'} replace />
  )
}

/** Matches Vite `base` (`/` locally, `/platform/` in production builds). */
const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined

function App() {
  return (
    <BrowserRouter basename={routerBasename}>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<AuthenticatedLayout />}>
            <Route index element={<ComingSoonPage page="home" />} />
            <Route path="profile" element={<MyProfilePage />} />
            <Route path="people" element={<PeopleV3Page />} />
            <Route path="people-v2" element={<PeopleV2Page />} />
            <Route
              path="people-v3"
              element={<Navigate to="/people" replace />}
            />
            <Route
              path="people-v2/:employeeId"
              element={<EmployeeProfileV2Page />}
            />
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
            <Route path="reviews" element={<ComingSoonPage page="reviews" />} />
            <Route
              path="analytics"
              element={<ComingSoonPage page="analytics" />}
            />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<CatchAllRedirect />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
