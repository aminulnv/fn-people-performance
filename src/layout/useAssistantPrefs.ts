import { useEffect, useState } from 'react'
import {
  ASSISTANT_ENABLED_KEY,
  ASSISTANT_PREFS_EVENT,
  readAssistantPrefs,
  type AssistantPrefs,
} from '@/lib/assistantPrefs'

export function useAssistantPrefs(): AssistantPrefs {
  const [prefs, setPrefs] = useState(readAssistantPrefs)

  useEffect(() => {
    const onPrefsChange = (event: Event) => {
      const custom = event as CustomEvent<AssistantPrefs>
      if (custom.detail) {
        setPrefs(custom.detail)
        return
      }
      setPrefs(readAssistantPrefs())
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === ASSISTANT_ENABLED_KEY) {
        setPrefs(readAssistantPrefs())
      }
    }

    window.addEventListener(ASSISTANT_PREFS_EVENT, onPrefsChange)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(ASSISTANT_PREFS_EVENT, onPrefsChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return prefs
}
