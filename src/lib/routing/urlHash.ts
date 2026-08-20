import { useCallback, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export function normalizeUrlHash(hash: string): string {
  return hash.startsWith('#') ? hash.slice(1) : hash
}

export function hashMatches(hash: string, value: string): boolean {
  return normalizeUrlHash(hash) === value
}

/** Hash-only navigation that keeps the current path and query string. */
export function locationWithHash(
  location: { pathname: string; search: string },
  hash: string,
) {
  return {
    pathname: location.pathname,
    search: location.search,
    hash: hash.startsWith('#') ? hash : `#${hash}`,
  }
}

type UseUrlHashTabOptions<T extends string> = {
  defaultTab: T
  tabFromHash: (hash: string) => T | null
  hashFromTab: (tab: T) => string
}

/** Keeps a segmented tab control in sync with the location hash. */
export function useUrlHashTab<T extends string>({
  defaultTab,
  tabFromHash,
  hashFromTab,
}: UseUrlHashTabOptions<T>): readonly [T, (tab: T) => void] {
  const location = useLocation()
  const navigate = useNavigate()

  const tab = tabFromHash(location.hash) ?? defaultTab

  useEffect(() => {
    if (tabFromHash(location.hash) !== null) return
    navigate(locationWithHash(location, hashFromTab(defaultTab)), {
      replace: true,
    })
  }, [
    defaultTab,
    hashFromTab,
    location,
    location.hash,
    location.pathname,
    location.search,
    navigate,
    tabFromHash,
  ])

  const setTab = useCallback(
    (next: T) => {
      const nextHash = hashFromTab(next)
      if (hashMatches(location.hash, nextHash)) return
      navigate(locationWithHash(location, nextHash), { replace: true })
    },
    [hashFromTab, location, navigate],
  )

  return [tab, setTab] as const
}

