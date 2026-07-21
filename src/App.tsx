import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AuthenticatedLayout from '@/layout/AuthenticatedLayout'
import DummyPage from '@/pages/DummyPage'
import SettingsPage from '@/pages/SettingsPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthenticatedLayout />}>
          <Route index element={<DummyPage title="Overview" />} />
          <Route path="people" element={<DummyPage title="People" />} />
          <Route path="goals" element={<DummyPage title="Goals" />} />
          <Route path="analytics" element={<DummyPage title="Analytics" />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
