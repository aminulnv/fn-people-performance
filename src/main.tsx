import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AuthProvider } from '@/lib/auth'
import { initClarity } from './lib/analytics/clarity'
import { initAppearanceListener } from './lib/brand'

/* Login-critical fonts only - shell weights load with AuthenticatedLayout */
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-800.css'

import './index.css'

initAppearanceListener()
initClarity()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
