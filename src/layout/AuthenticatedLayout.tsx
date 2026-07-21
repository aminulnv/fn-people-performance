import { AppLayout } from './AppLayout'
import { DEMO_USER } from '@/lib/authApi'
import { layoutConfig } from '@/config/layout'

export default function AuthenticatedLayout() {
  return (
    <AppLayout
      {...layoutConfig}
      userName={DEMO_USER.name}
      profileSubtext={DEMO_USER.email}
      onSignOut={() => window.location.assign('/')}
    />
  )
}
