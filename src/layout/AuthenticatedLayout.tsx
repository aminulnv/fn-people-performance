import { Navigate, useNavigate } from 'react-router-dom'
import { AppLayout } from './AppLayout'
import { DEMO_USER, isSignedIn, signOut } from '@/lib/authApi'
import { layoutConfig } from '@/config/layout'

export default function AuthenticatedLayout() {
  const navigate = useNavigate()

  if (!isSignedIn()) {
    return <Navigate to="/login" replace />
  }

  return (
    <AppLayout
      {...layoutConfig}
      userName={DEMO_USER.name}
      profileSubtext={DEMO_USER.email}
      onSignOut={() => {
        signOut()
        navigate('/login', { replace: true })
      }}
    />
  )
}
