import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initAppearanceListener } from './lib/brand'
import './index.css'
import './styles/layout.css'

initAppearanceListener()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
