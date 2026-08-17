import { useCallback } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { AppLayout } from './AppLayout'
import { useAuth } from '@/lib/auth'
import { layoutConfig } from '@/config/layout'
import { queryClient } from '@/lib/queryClient'
import '@/styles/layout-shell.css'
import '@/styles/layout-assistant.css'

/* Shell-only font weights — login already has Inter 400/500 + PJ 800 */
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'

export default function AuthenticatedLayout() {
  const navigate = useNavigate()
  const { status, user, signOut } = useAuth()

  const handleSignOut = useCallback(async () => {
    queryClient.clear()
    await signOut()
    navigate('/login', { replace: true })
  }, [navigate, signOut])

  if (status === 'loading') {
    return null
  }

  if (status !== 'authenticated' || !user) {
    return <Navigate to="/login" replace />
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppLayout {...layoutConfig} onSignOut={handleSignOut} />
    </QueryClientProvider>
  )
}
