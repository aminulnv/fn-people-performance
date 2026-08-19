import Clarity from '@microsoft/clarity'

let initialized = false

/** Loads Microsoft Clarity when `VITE_CLARITY_PROJECT_ID` is set (skipped in tests). */
export function initClarity(): void {
  if (initialized || import.meta.env.MODE === 'test') return

  const projectId = import.meta.env.VITE_CLARITY_PROJECT_ID?.trim()
  if (!projectId) return

  Clarity.init(projectId)
  initialized = true
}
