type IconProps = {
  className?: string
}

/** Shared canvas — every banner icon draws into this box. */
const ICON_SIZE = 64
/** Artwork fill — matches the progress mark (48px circle in a 64px frame). */
const ARTWORK_SIZE = 48

/** Shared stroke — matches Figma banner icons (#635CFF etc. at 2px). */
function iconStroke(scale = 1) {
  return {
    stroke: 'currentColor' as const,
    strokeWidth: 2 / scale,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
}

/**
 * Fit path artwork into the shared 48px optical frame, centered in 64×64.
 * Compensates stroke so a 2px mark stays 2px after the group scale.
 */
function artworkTransform(x: number, y: number, width: number, height: number) {
  const scale = ARTWORK_SIZE / Math.max(width, height)
  const tx = (ICON_SIZE - width * scale) / 2 - x * scale
  const ty = (ICON_SIZE - height * scale) / 2 - y * scale
  return { transform: `translate(${tx} ${ty}) scale(${scale})`, scale }
}

/** Goal-setting mark — flag with target rings (Figma reference). */
export function HomeGoalsIcon({ className = 'pd-home-banner__icon-svg' }: IconProps) {
  const { transform, scale } = artworkTransform(28, 42, 92, 102)
  const stroke = iconStroke(scale)
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden>
      <g transform={transform}>
        <path
          d="M76 98.9167V44.8333L115.333 64.5L76 84.1667"
          {...stroke}
        />
        <path
          d="M118.092 85.2582C120.708 93.3222 120.953 101.968 118.797 110.167C116.641 118.366 112.175 125.774 105.931 131.508C99.686 137.242 91.9257 141.061 83.5728 142.512C75.22 143.962 66.6263 142.983 58.8141 139.69C51.0019 136.397 44.3001 130.929 39.506 123.937C34.7119 116.945 32.0273 108.723 31.7717 100.249C31.5161 91.7747 33.7001 83.4056 38.064 76.1372C42.4279 68.8687 48.7879 63.0069 56.3874 59.249"
          {...stroke}
        />
        <path
          d="M56.3432 84.1519C53.8795 87.4314 52.2755 91.2753 51.6775 95.3334C51.0794 99.3914 51.5063 103.535 52.9192 107.385C54.3321 111.236 56.6861 114.672 59.7668 117.381C62.8475 120.089 66.5568 121.983 70.5569 122.891C74.5571 123.799 78.7208 123.692 82.6687 122.579C86.6167 121.466 90.2234 119.382 93.1602 116.519C96.0971 113.655 98.2707 110.102 99.4831 106.184C100.695 102.265 100.908 98.1054 100.102 94.0836"
          {...stroke}
        />
      </g>
    </svg>
  )
}

/** Check-in progress mark — circle with check (Figma reference). */
export function HomeProgressIcon({ className = 'pd-home-banner__icon-svg' }: IconProps) {
  const { transform, scale } = artworkTransform(8, 8, 48, 48)
  const stroke = iconStroke(scale)
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden>
      <g transform={transform}>
        <circle cx="32" cy="32" r="24" {...stroke} />
        <path d="M21 32L28.5 39.5L44 24" {...stroke} />
      </g>
    </svg>
  )
}

/** Sent-back mark — undo arrow (Figma reference). */
export function HomeSentBackIcon({ className = 'pd-home-banner__icon-svg' }: IconProps) {
  const { transform, scale } = artworkTransform(55.5, 45.5, 78, 78)
  const stroke = iconStroke(scale)
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden>
      <g transform={transform}>
        <path d="M79.875 94.25L55.5 69.875L79.875 45.5" {...stroke} />
        <path
          d="M55.5 69.875H106.688C110.209 69.875 113.695 70.5685 116.948 71.916C120.201 73.2634 123.157 75.2384 125.647 77.7282C128.137 80.218 130.112 83.1738 131.459 86.4268C132.806 89.6798 133.5 93.1664 133.5 96.6875C133.5 100.209 132.806 103.695 131.459 106.948C130.112 110.201 128.137 113.157 125.647 115.647C123.157 118.137 120.201 120.112 116.948 121.459C113.695 122.806 110.209 123.5 106.688 123.5H89.625"
          {...stroke}
        />
      </g>
    </svg>
  )
}

/** Manager approval mark — notification bell (Figma reference). */
export function HomeApproveIcon({ className = 'pd-home-banner__icon-svg' }: IconProps) {
  const { transform, scale } = artworkTransform(15, 10, 34, 40)
  const stroke = iconStroke(scale)
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden>
      <g transform={transform}>
        <path d="M32 10V14" {...stroke} />
        <path
          d="M18 26C18 18.82 24.27 13 32 13C39.73 13 46 18.82 46 26V36.5C46 38.43 46.77 40.29 48.12 41.65L49 42.5H15L15.88 41.65C17.23 40.29 18 38.43 18 36.5V26Z"
          {...stroke}
        />
        <path
          d="M24 42.5C24 46.64 27.58 50 32 50C36.42 50 40 46.64 40 42.5"
          {...stroke}
        />
      </g>
    </svg>
  )
}

export function HomeBannerIcon({
  icon,
}: {
  icon: 'goals' | 'progress' | 'approve' | 'sent_back' | 'none'
}) {
  switch (icon) {
    case 'goals':
      return <HomeGoalsIcon />
    case 'progress':
      return <HomeProgressIcon />
    case 'approve':
      return <HomeApproveIcon />
    case 'sent_back':
      return <HomeSentBackIcon />
    default:
      return null
  }
}
