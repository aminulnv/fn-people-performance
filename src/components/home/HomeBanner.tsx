import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import type { HomeBannerContent } from '@/lib/home/homeBanner'
import { HOME_BANNER_GRADIENTS } from '@/lib/home/homeBanner'
import { GOAL_DEADLINE_URGENCY_GRADIENTS } from '@/lib/home/goalDeadlineBanner'
import { HomeBannerIcon } from './HomeBannerIcons'

type HomeBannerProps = {
  content: HomeBannerContent
}

function bannerGradient(content: HomeBannerContent) {
  if (content.urgency) {
    return GOAL_DEADLINE_URGENCY_GRADIENTS[content.urgency]
  }
  return HOME_BANNER_GRADIENTS[content.variant]
}

export function HomeBanner({ content }: HomeBannerProps) {
  const gradient = bannerGradient(content)
  const hasIcon = content.icon !== 'none'
  const urgencyClass =
    content.urgency && content.urgency !== 'default'
      ? ` pd-home-banner--urgency-${content.urgency}`
      : ''
  const insetFilterId = `pd-home-banner-inset-${content.id.replace(/[^a-zA-Z0-9-]/g, '-')}`

  return (
    <Link
      to={content.href}
      className={`pd-home-banner pd-home-banner--${content.variant}${urgencyClass}${hasIcon ? '' : ' pd-home-banner--no-icon'}`}
      aria-label={content.ariaLabel}
      style={
        {
          '--pd-home-banner-gradient-start': gradient.start,
          '--pd-home-banner-gradient-end': gradient.end,
          '--pd-home-banner-accent': gradient.accent,
          '--pd-home-banner-inset-filter': `url(#${insetFilterId})`,
        } as CSSProperties
      }
    >
      <svg className="pd-home-banner__filters" aria-hidden focusable="false">
        <defs>
          <filter
            id={insetFilterId}
            x="-10%"
            y="-10%"
            width="120%"
            height="130%"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend
              in="SourceGraphic"
              in2="BackgroundImageFix"
              result="shape"
            />
            <feColorMatrix
              in="SourceAlpha"
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              result="hardAlpha"
            />
            <feOffset dy="4" />
            <feGaussianBlur stdDeviation="2" />
            <feComposite
              in2="hardAlpha"
              operator="arithmetic"
              k2="-1"
              k3="1"
            />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"
            />
            <feBlend in2="shape" mode="normal" />
          </filter>
        </defs>
      </svg>

      <div className="pd-home-banner__surface">
        <div className="pd-home-banner__grain" aria-hidden />
        <div className="pd-home-banner__body">
          {hasIcon ? (
            <div className="pd-home-banner__icon-wrap">
              <HomeBannerIcon icon={content.icon} />
            </div>
          ) : null}

          <div className="pd-home-banner__copy">
            <h2 className="pd-home-banner__title">{content.headline}</h2>
            <p className="pd-home-banner__subline">
              {content.subline}
              {content.sublineEmphasis ? (
                <span className="pd-home-banner__subline-emphasis">
                  {content.sublineEmphasis}
                </span>
              ) : null}
            </p>
          </div>

          <div className="pd-home-banner__aside" aria-hidden>
            <span className="pd-home-banner__aside-primary">
              {content.aside.primary}
            </span>
            <span className="pd-home-banner__aside-secondary">
              {content.aside.secondary}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
