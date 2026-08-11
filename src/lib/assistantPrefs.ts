export const ASSISTANT_ENABLED_KEY = 'app-assistant-enabled'
export const ASSISTANT_PREFS_EVENT = 'assistant-prefs-change'

export const DEFAULT_ASSISTANT_ENABLED = true

export interface AssistantPrefs {
  enabled: boolean
}

export function readAssistantEnabled(): boolean {
  try {
    const stored = localStorage.getItem(ASSISTANT_ENABLED_KEY)
    if (stored === '0') return false
    if (stored === '1') return true
    return DEFAULT_ASSISTANT_ENABLED
  } catch {
    return DEFAULT_ASSISTANT_ENABLED
  }
}

export function readAssistantPrefs(): AssistantPrefs {
  return { enabled: readAssistantEnabled() }
}

function emitAssistantPrefsChange(prefs: AssistantPrefs) {
  window.dispatchEvent(
    new CustomEvent<AssistantPrefs>(ASSISTANT_PREFS_EVENT, { detail: prefs }),
  )
}

export function applyAssistantEnabled(enabled: boolean): AssistantPrefs {
  const next: AssistantPrefs = { enabled }
  try {
    localStorage.setItem(ASSISTANT_ENABLED_KEY, enabled ? '1' : '0')
  } catch {
    /* ignore quota / private mode */
  }
  emitAssistantPrefsChange(next)
  return next
}
