import { HomeBanner } from '@/components/home/HomeBanner'
import { useHomeBanners } from '@/lib/home/useHomeBanners'
import '@/styles/layout-home.css'

export default function HomePage() {
  const banners = useHomeBanners()
  const isCompact = banners.length > 1

  return (
    <div
      className={`pd-page pd-page--home${isCompact ? ' pd-page--home-multiple' : ''}`}
    >
      {banners.map((banner) => (
        <HomeBanner key={banner.id} content={banner} />
      ))}
    </div>
  )
}
