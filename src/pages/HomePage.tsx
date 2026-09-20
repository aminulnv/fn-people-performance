import { useMemo } from 'react'
import { HomeBanner } from '@/components/home/HomeBanner'
import { previewAllHomeBanners } from '@/lib/home/homeBanner'
import { useCurrentPerson } from '@/lib/useCurrentPerson'
import '@/styles/layout-home.css'

/**
 * TEMPORARY: every home card is shown so they can be reviewed together.
 * Restore `useHomeBanners` (and delete `previewAllHomeBanners`) to return
 * to eligibility-driven banners.
 */
export default function HomePage() {
  const person = useCurrentPerson()
  const banners = useMemo(
    () => (person ? previewAllHomeBanners(person) : []),
    [person],
  )

  if (!person) {
    return (
      <div className="pd-page pd-page--home" aria-label="Home" aria-busy="true" />
    )
  }

  return (
    <div
      className="pd-page pd-page--home pd-page--home-multiple"
      aria-label="Home"
    >
      {banners.map((banner) => (
        <HomeBanner key={banner.id} content={banner} />
      ))}
    </div>
  )
}
