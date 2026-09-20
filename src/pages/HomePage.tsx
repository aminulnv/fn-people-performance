import { HomeBanner } from '@/components/home/HomeBanner'
import { useHomeBanners } from '@/lib/home/useHomeBanners'
import '@/styles/layout-home.css'

export default function HomePage() {
  const { banners, ready } = useHomeBanners()

  if (!ready) {
    return (
      <div className="pd-page pd-page--home" aria-label="Home" aria-busy="true" />
    )
  }

  return (
    <div
      className={
        banners.length > 1
          ? 'pd-page pd-page--home pd-page--home-multiple'
          : 'pd-page pd-page--home'
      }
      aria-label="Home"
    >
      {banners.map((banner) => (
        <HomeBanner key={banner.id} content={banner} />
      ))}
    </div>
  )
}
