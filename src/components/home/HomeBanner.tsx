import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui'
import type { HomeBannerContent } from '@/lib/home/homeBanner'
import { HOME_BANNER_GRADIENTS } from '@/lib/home/homeBanner'
import {
  formatDeadlineTimerUnits,
  GOAL_DEADLINE_URGENCY_ACCENTS,
  remainingTimeUntilDeadline,
  type GoalDeadlineTimerUnit,
} from '@/lib/home/goalDeadlineBanner'
import { avatarStyle } from '@/lib/employees/avatar'
import { publicUrl } from '@/lib/publicUrl'

const ARTWORK_SRC: Record<Exclude<HomeBannerContent['artwork'], 'none' | undefined>, string> = {
  calendar: publicUrl('images/3D Icons/Calendar.svg'),
  approve: publicUrl('images/3D Icons/Approve.png'),
  return: publicUrl('images/3D Icons/Return.png'),
  logbook: publicUrl('images/3D Icons/Logbook.png'),
}

function resolveArtworkSrc(artwork: HomeBannerContent['artwork']): string {
  if (artwork && artwork !== 'none') return ARTWORK_SRC[artwork]
  return ARTWORK_SRC.calendar
}

type HomeBannerProps = {
  content: HomeBannerContent
}

function bannerColors(content: HomeBannerContent) {
  const gradient = HOME_BANNER_GRADIENTS[content.variant]
  const accent = content.urgency
    ? GOAL_DEADLINE_URGENCY_ACCENTS[content.urgency]
    : gradient.accent
  return {
    start: gradient.start,
    end: gradient.end,
    accent,
  }
}

function useDeadlineTimerUnits(
  deadline: string | undefined,
  seed: GoalDeadlineTimerUnit[] | undefined,
): GoalDeadlineTimerUnit[] | undefined {
  const [liveUnits, setLiveUnits] = useState<GoalDeadlineTimerUnit[] | undefined>()

  useEffect(() => {
    if (!deadline) {
      setLiveUnits(undefined)
      return
    }

    const tick = () => {
      setLiveUnits(formatDeadlineTimerUnits(remainingTimeUntilDeadline(deadline)))
    }
    tick()
    const id = window.setInterval(tick, 30_000)
    return () => window.clearInterval(id)
  }, [deadline])

  if (!deadline) return seed
  return liveUnits ?? seed
}

function BannerChips({
  units,
}: {
  units: { label: string; value: string }[]
}) {
  return (
    <div className="pd-home-banner__timer" aria-hidden>
      {units.map((unit) => (
        <div key={`${unit.label}-${unit.value}`} className="pd-home-banner__timer-unit">
          {unit.label ? (
            <span className="pd-home-banner__timer-label">{unit.label}</span>
          ) : null}
          <span className="pd-home-banner__timer-value">{unit.value}</span>
        </div>
      ))}
    </div>
  )
}

function resolveChips(
  content: HomeBannerContent,
  timerUnits: GoalDeadlineTimerUnit[] | undefined,
): { label: string; value: string }[] {
  if (timerUnits?.length) return timerUnits

  const { aside } = content
  if (aside.kind === 'countdown' && aside.units?.length) return aside.units

  if (aside.secondary) {
    return [
      { label: aside.secondary, value: aside.primary },
    ]
  }

  return [{ label: '', value: aside.primary }]
}

export function HomeBanner({ content }: HomeBannerProps) {
  const colors = bannerColors(content)
  const seedUnits =
    content.aside.kind === 'countdown' ? content.aside.units : undefined
  const timerUnits = useDeadlineTimerUnits(content.deadline, seedUnits)
  const chips = resolveChips(content, timerUnits)
  const urgencyClass =
    content.urgency && content.urgency !== 'default'
      ? ` pd-home-banner--urgency-${content.urgency}`
      : ''

  return (
    <Link
      to={content.href}
      className={`pd-home-banner pd-home-banner--card pd-home-banner--${content.variant} pd-home-banner--${content.aside.kind}${urgencyClass}`}
      aria-label={content.ariaLabel}
      style={
        {
          '--pd-home-banner-gradient-start': colors.start,
          '--pd-home-banner-gradient-end': colors.end,
          '--pd-home-banner-accent': colors.accent,
        } as CSSProperties
      }
    >
      <div className="pd-home-banner__surface">
        <div className="pd-home-banner__grain" aria-hidden />
        <div className="pd-home-banner__body">
          <div className="pd-home-banner__main">
            <div className="pd-home-banner__copy">
              <h2 className="pd-home-banner__title">{content.headline}</h2>
              <p className="pd-home-banner__subline">
                {content.sublineActor ? (
                  <>
                    <span className="pd-home-banner__subline-actor">
                      <Avatar
                        name={content.sublineActor.name}
                        src={content.sublineActor.avatarUrl}
                        size="sm"
                        className="pd-home-banner__subline-avatar"
                        alt=""
                        style={avatarStyle(content.sublineActor.name)}
                      />
                      <span className="pd-home-banner__subline-actor-name">
                        {content.sublineActor.name}
                      </span>
                    </span>
                    {' '}
                    sent your goals back.
                  </>
                ) : (
                  <>
                    {content.subline}
                    {content.sublineEmphasis ? (
                      <span className="pd-home-banner__subline-emphasis">
                        {content.sublineEmphasis}
                      </span>
                    ) : null}
                  </>
                )}
              </p>
            </div>

            {chips.length ? <BannerChips units={chips} /> : null}
          </div>

          <div className="pd-home-banner__artwork" aria-hidden>
            <img
              className="pd-home-banner__artwork-img"
              src={resolveArtworkSrc(content.artwork)}
              alt=""
              draggable={false}
            />
          </div>
        </div>
      </div>
    </Link>
  )
}
