import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AuthenticatedLayout from '@/layout/AuthenticatedLayout'
import DummyPage from '@/pages/DummyPage'
import SettingsPage from '@/pages/SettingsPage'
import LoginPage from '@/pages/auth/LoginPage'
import { isSignedIn } from '@/lib/authApi'

function CatchAllRedirect() {
  return <Navigate to={isSignedIn() ? '/' : '/login'} replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<AuthenticatedLayout />}>
          <Route index element={<DummyPage title="Overview" />} />
          <Route path="people" element={<DummyPage title="People" />} />
          <Route path="goals" element={<DummyPage title="Goals" />} />
          <Route path="analytics" element={<DummyPage title="Analytics" />} />
          <Route path="profile" element={<DummyPage title="My Profile" />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<CatchAllRedirect />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
