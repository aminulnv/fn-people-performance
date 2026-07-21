import { useState, useEffect } from 'react'

const MOBILE_QUERY = '(max-width: 767px)'

function readIsMobile() {
  return window.matchMedia(MOBILE_QUERY).matches
}

/** Updates only when the mobile breakpoint is crossed — not on every resize pixel. */
export function useBreakpoint() {
  const [isMobile, setIsMobile] = useState(readIsMobile)

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY)
    const onChange = () => setIsMobile(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return { isMobile }
}
