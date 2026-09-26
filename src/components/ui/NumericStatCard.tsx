import { useId } from 'react'
import { ChevronDown, TrendingUp } from 'lucide-react'
import { cx } from '@/lib/cx'
import '@/styles/numeric-stat-card.css'

export type NumericStatTone = 'positive' | 'negative'

export type NumericStatPoint = {
  value: number
  label: string
  date: string
}

export type NumericStatCardProps = {
  title: string
  value: string | number
  delta: string
  changePercent: string
  periodLabel?: string
  tone?: NumericStatTone
  series: number[]
  /** Index into `series` for the tooltip marker. Defaults to ~70% along the series. */
  activeIndex?: number
  activePoint: NumericStatPoint
  className?: string
}

function buildSmoothPath(
  values: number[],
  width: number,
  height: number,
  padX: number,
  padY: number,
): string {
  if (values.length < 2) return ''

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const innerW = width - padX * 2
  const innerH = height - padY * 2

  const points = values.map((v, i) => {
    const x = padX + (i / (values.length - 1)) * innerW
    const y = padY + innerH - ((v - min) / range) * innerH
    return { x, y }
  })

  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }
  return d
}

function pointAt(
  values: number[],
  index: number,
  width: number,
  height: number,
  padX: number,
  padY: number,
): { x: number; y: number } {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const innerW = width - padX * 2
  const innerH = height - padY * 2
  const i = Math.max(0, Math.min(values.length - 1, index))
  return {
    x: padX + (i / (values.length - 1)) * innerW,
    y: padY + innerH - ((values[i] - min) / range) * innerH,
  }
}

const CHART_W = 280
const CHART_H = 140
const PAD_X = 8
const PAD_Y = 18

export function NumericStatCard({
  title,
  value,
  delta,
  changePercent,
  periodLabel = 'Past 30 days',
  tone = 'positive',
  series,
  activeIndex,
  activePoint,
  className,
}: NumericStatCardProps) {
  const markerIndex =
    activeIndex ?? Math.max(0, Math.round((series.length - 1) * 0.72))
  const path = buildSmoothPath(series, CHART_W, CHART_H, PAD_X, PAD_Y)
  const marker = pointAt(series, markerIndex, CHART_W, CHART_H, PAD_X, PAD_Y)
  const uid = useId().replace(/:/g, '')
  const patternId = `nsc-dots-${uid}`
  const glowId = `nsc-glow-${uid}`
  const fadeId = `nsc-fade-${uid}`
  const maskId = `nsc-mask-${uid}`

  return (
    <article
      className={cx('pd-numeric-stat', `pd-numeric-stat--${tone}`, className)}
      aria-label={`${title}: ${value}`}
    >
      <header className="pd-numeric-stat__header">
        <h3 className="pd-numeric-stat__title">{title}</h3>
        <div className="pd-numeric-stat__meta">
          <span className="pd-numeric-stat__change" aria-label={`Up ${changePercent}`}>
            <span className="pd-numeric-stat__change-icon" aria-hidden>
              <TrendingUp size={12} strokeWidth={2.5} />
            </span>
            <span className="pd-numeric-stat__change-value">{changePercent}</span>
          </span>
          <button type="button" className="pd-numeric-stat__period">
            {periodLabel}
            <ChevronDown size={14} strokeWidth={2} aria-hidden />
          </button>
        </div>
      </header>

      <div className="pd-numeric-stat__body">
        <div className="pd-numeric-stat__figures">
          <p className="pd-numeric-stat__value">{value}</p>
          <p className="pd-numeric-stat__delta">{delta}</p>
        </div>

        <div className="pd-numeric-stat__chart" aria-hidden>
          <svg
            className="pd-numeric-stat__svg"
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            preserveAspectRatio="xMaxYMid meet"
          >
            <defs>
              <radialGradient id={glowId} cx="78%" cy="88%" r="55%">
                <stop offset="0%" stopColor="var(--nsc-accent)" stopOpacity="0.22" />
                <stop offset="55%" stopColor="var(--nsc-accent)" stopOpacity="0.08" />
                <stop offset="100%" stopColor="var(--nsc-accent)" stopOpacity="0" />
              </radialGradient>
              <pattern
                id={patternId}
                width="10"
                height="10"
                patternUnits="userSpaceOnUse"
              >
                <circle
                  cx="1"
                  cy="1"
                  r="0.9"
                  fill="var(--nsc-accent)"
                  opacity="0.28"
                />
              </pattern>
              <linearGradient id={fadeId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="white" stopOpacity="0" />
                <stop offset="35%" stopColor="white" stopOpacity="0.55" />
                <stop offset="100%" stopColor="white" stopOpacity="1" />
              </linearGradient>
              <mask id={maskId}>
                <rect width={CHART_W} height={CHART_H} fill={`url(#${fadeId})`} />
              </mask>
            </defs>

            <rect width={CHART_W} height={CHART_H} fill={`url(#${glowId})`} />
            <rect
              width={CHART_W}
              height={CHART_H}
              fill={`url(#${patternId})`}
              mask={`url(#${maskId})`}
            />

            <path
              d={path}
              fill="none"
              stroke="var(--nsc-accent)"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            <line
              x1={marker.x}
              y1={PAD_Y - 4}
              x2={marker.x}
              y2={CHART_H - 4}
              stroke="var(--color-text-muted)"
              strokeWidth="1"
              strokeDasharray="3 4"
              opacity="0.7"
            />
            <circle
              cx={marker.x}
              cy={marker.y}
              r="4.5"
              fill="var(--nsc-accent)"
            />
            <circle
              cx={marker.x}
              cy={marker.y}
              r="7"
              fill="var(--nsc-accent)"
              opacity="0.18"
            />
          </svg>

          <div
            className="pd-numeric-stat__tooltip"
            style={{
              left: `${(marker.x / CHART_W) * 100}%`,
              top: `${(marker.y / CHART_H) * 100}%`,
            }}
          >
            <span className="pd-numeric-stat__tooltip-value">
              {activePoint.label}
            </span>
            <span className="pd-numeric-stat__tooltip-date">
              {activePoint.date}
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}
