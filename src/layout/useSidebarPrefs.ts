import { useEffect, useState } from 'react'
import {
  SIDEBAR_PREFS_EVENT,
  readSidebarPrefs,
  type SidebarPrefs,
} from '@/lib/sidebarPrefs'

export function useSidebarPrefs(): SidebarPrefs {
  const [prefs, setPrefs] = useState(readSidebarPrefs)

  useEffect(() => {
    const onPrefsChange = (event: Event) => {
      const custom = event as CustomEvent<SidebarPrefs>
      if (custom.detail) {
        setPrefs(custom.detail)
        return
      }
      setPrefs(readSidebarPrefs())
    }

    const onStorage = (event: StorageEvent) => {
      if (
        event.key === null ||
        event.key === 'app-sidebar-mode' ||
        event.key === 'app-sidebar-expanded'
      ) {
        setPrefs(readSidebarPrefs())
      }
    }

    window.addEventListener(SIDEBAR_PREFS_EVENT, onPrefsChange)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(SIDEBAR_PREFS_EVENT, onPrefsChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return prefs
}
