import { HomeActionsIdle } from '@/components/home/HomeActionsIdle'
import { HomeBanner } from '@/components/home/HomeBanner'
import { HomeOrientationPanel } from '@/components/home/HomeOrientationPanel'
import { useHomeBanners } from '@/lib/home/useHomeBanners'
import { useHomeOrientation } from '@/lib/home/useHomeOrientation'
import { useCurrentPerson } from '@/lib/useCurrentPerson'
import '@/styles/layout-home.css'

export default function HomePage() {
  const person = useCurrentPerson()
  const { banners, ready: bannersReady } = useHomeBanners()
  const { orientation, ready: orientationReady } = useHomeOrientation()

  if (!person || !bannersReady || !orientationReady) {
    return (
      <div className="pd-page pd-page--home" aria-label="Home" aria-busy="true" />
    )
  }

  const hasActions = banners.length > 0

  return (
    <div
      className={
        hasActions
          ? 'pd-page pd-page--home pd-page--home-split'
          : 'pd-page pd-page--home pd-page--home-split pd-page--home-clear'
      }
      aria-label="Home"
    >
      <div className="pd-home-layout">
        {orientation ? (
          <HomeOrientationPanel
            orientation={orientation}
            personName={person.name}
            isClear={!hasActions}
          />
        ) : (
          <div className="pd-home-orientation pd-home-orientation--empty" />
        )}

        <div
          className={
            hasActions
              ? 'pd-home-actions pd-home-actions--stack'
              : 'pd-home-actions'
          }
          aria-label="Actions that need you"
        >
          {hasActions ? (
            banners.map((banner) => (
              <HomeBanner key={banner.id} content={banner} />
            ))
          ) : (
            <HomeActionsIdle orientation={orientation} />
          )}
        </div>
      </div>
    </div>
  )
}
