import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'

const AuthenticatedLayout = lazy(() => import('@/layout/AuthenticatedLayout'))
const ComponentsPage = lazy(() => import('@/pages/ComponentsPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const DummyPage = lazy(() => import('@/pages/DummyPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))

function RouteFallback() {
  return <div className="pd-route-fallback" aria-busy="true" aria-live="polite" />
}

function CatchAllRedirect() {
  const { status } = useAuth()
  return (
    <Navigate to={status === 'authenticated' ? '/' : '/login'} replace />
  )
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<AuthenticatedLayout />}>
            <Route index element={<DummyPage title="Home" />} />
            <Route path="profile" element={<DummyPage title="My profile" />} />
            <Route path="people" element={<DummyPage title="People" />} />
            <Route path="organisation" element={<DummyPage title="Organisation" />} />
            <Route path="goals" element={<DummyPage title="Goals" />} />
            <Route path="reviews" element={<DummyPage title="Reviews" />} />
            <Route path="analytics" element={<DummyPage title="Analytics" />} />
            <Route path="engagement" element={<DummyPage title="Engagement" />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="components" element={<ComponentsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<CatchAllRedirect />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
