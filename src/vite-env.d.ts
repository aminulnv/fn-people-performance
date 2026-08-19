/// <reference types="vite/client" />

declare const __APP_VERSION__: string

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  /** `local` = sessionStorage auth only (no Google / no live cookie). */
  readonly VITE_AUTH_MODE?: 'local' | 'remote'
  readonly VITE_EMPLOYEES_BACKEND?: 'local' | 'api'
  readonly VITE_ACTIVITY_BACKEND?: 'local' | 'api'
  readonly VITE_REVIEWS_BACKEND?: 'local' | 'api'
  readonly VITE_GOALS_BACKEND?: 'local' | 'api'
  /** Microsoft Clarity project ID (Settings → Overview in Clarity dashboard). */
  readonly VITE_CLARITY_PROJECT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
