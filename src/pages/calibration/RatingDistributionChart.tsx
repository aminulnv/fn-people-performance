import { SegmentedControl, Tooltip } from '@/components/ui'
import {
  RATING_BREAKDOWNS,
  chartScale,
  type RatingBandRow,
  type RatingBreakdownId,
  type RatingDistribution,
  type RatingSeries,
} from '@/lib/calibration/distribution'
import { cx } from '@/lib/cx'

const GROUPED_SERIES_LIMIT = 4

function peopleLabel(count: number): string {
  return `${count} ${count === 1 ? 'person' : 'people'}`
}

function heightPercent(value: number, scale: number): number {
  if (scale <= 0) return 0
  return Math.max(0, Math.min(100, (value / scale) * 100))
}

function BandColumn({
  band,
  series,
  scale,
  grouped,
}: {
  band: RatingBandRow
  series: RatingSeries[]
  scale: number
  grouped: boolean
}) {
  const guide = heightPercent(band.guidelinePercent, scale)
  const cells = series.map((row, index) => {
    const match = row.bands.find((item) => item.id === band.id) ?? band
    return {
      seriesId: row.id,
      seriesLabel: row.label,
      index,
      count: match.count,
      percent: match.percent,
      height: heightPercent(match.percent, scale),
    }
  })
  const headline = grouped
    ? cells
        .map(
          (cell) =>
            `${cell.seriesLabel} ${cell.percent}% (${peopleLabel(cell.count)})`,
        )
        .join(', ')
    : `${band.percent}% · ${peopleLabel(band.count)}`

  return (
    <li className={cx('pd-cal-dist__col', `is-${band.id}`)}>
      <div
        className="pd-cal-dist__track"
        role="img"
        aria-label={`${band.label}: ${headline}. Guideline ${band.guidelinePercent}%.`}
      >
        <div
          className={cx(
            'pd-cal-dist__cluster',
            grouped && 'pd-cal-dist__cluster--grouped',
          )}
        >
          {cells.map((cell) => (
            <span
              key={cell.seriesId}
              className={cx(
                'pd-cal-dist__fill',
                !grouped && `is-${band.id}`,
                grouped && `is-series-${(cell.index % 6) + 1}`,
              )}
              style={{ height: `${cell.height}%` }}
            >
              {(!grouped || cells.length === 1) && cell.percent > 0 ? (
                <span className="pd-cal-dist__pct">{cell.percent}%</span>
              ) : null}
            </span>
          ))}
        </div>
        {band.guidelinePercent > 0 ? (
          <span
            className="pd-cal-dist__guide"
            style={{ bottom: `${guide}%` }}
          >
            <Tooltip
              className="pd-cal-dist__guide-tip"
              content="This cycle’s target for this band."
              side="top"
            >
              <span className="pd-cal-dist__guide-label">
                {band.guidelinePercent}%
              </span>
            </Tooltip>
          </span>
        ) : null}
      </div>
      <strong className="pd-cal-dist__count">{band.count}</strong>
      <span className="pd-cal-dist__label">{band.label}</span>
    </li>
  )
}

function Plot({
  bands,
  series,
  grouped,
  label,
}: {
  bands: RatingBandRow[]
  series: RatingSeries[]
  grouped: boolean
  label: string
}) {
  const scale = chartScale([
    ...bands.flatMap((band) => [band.percent, band.guidelinePercent]),
    ...series.flatMap((row) =>
      row.bands.flatMap((band) => [band.percent, band.guidelinePercent]),
    ),
  ])

  return (
    <ol className="pd-cal-dist__plot" aria-label={label}>
      {bands.map((band) => (
        <BandColumn
          key={band.id}
          band={band}
          series={series}
          scale={scale}
          grouped={grouped}
        />
      ))}
    </ol>
  )
}

export function RatingDistributionChart({
  distribution,
  breakdown,
  onBreakdownChange,
  title,
  hideBreakdown = false,
  hideSummary = false,
}: {
  distribution: RatingDistribution
  breakdown: RatingBreakdownId
  onBreakdownChange: (value: RatingBreakdownId) => void
  title?: string
  hideBreakdown?: boolean
  hideSummary?: boolean
}) {
  const { bands, series, summary } = distribution
  const useSmallMultiples =
    breakdown !== 'overall' && series.length > GROUPED_SERIES_LIMIT
  const grouped = breakdown !== 'overall' && !useSmallMultiples

  return (
    <section
      className={cx('pd-cal-dist', hideSummary && 'pd-cal-dist--solo')}
      aria-label={title ?? 'Rating distribution'}
    >
      <header className="pd-cal-dist__head">
        {hideBreakdown ? (
          <h2 className="pd-cal-dist__title">{title}</h2>
        ) : (
          <SegmentedControl
            className="pd-cal-dist__tabs"
            options={RATING_BREAKDOWNS}
            value={breakdown}
            onChange={onBreakdownChange}
            aria-label="Rating breakdown"
          />
        )}
        <ul className="pd-cal-dist__key" aria-label="How to read this chart">
          <li>
            <Tooltip
              content="Bar height is the share of graded people."
              side="bottom"
            >
              <span className="pd-cal-dist__key-item" tabIndex={0}>
                <span className="pd-cal-dist__key-bar" aria-hidden />
                Share of people
              </span>
            </Tooltip>
          </li>
          <li>
            <Tooltip
              content="The red line is this cycle’s target per band."
              side="bottom"
            >
              <span className="pd-cal-dist__key-item" tabIndex={0}>
                <span className="pd-cal-dist__key-line" aria-hidden />
                Guideline
              </span>
            </Tooltip>
          </li>
        </ul>
      </header>

      {useSmallMultiples ? (
        <ol className="pd-cal-dist__multiples">
          {series.map((row) => (
            <li key={row.id} className="pd-cal-dist__multiple">
              <h3 className="pd-cal-dist__multiple-title">
                {row.label}
                <span>{peopleLabel(row.total)}</span>
              </h3>
              <Plot
                bands={row.bands}
                series={[row]}
                grouped={false}
                label={`${row.label} rating distribution`}
              />
            </li>
          ))}
        </ol>
      ) : (
        <Plot
          bands={bands}
          series={grouped ? series : series.slice(0, 1)}
          grouped={grouped}
          label="Rating distribution by band"
        />
      )}

      {grouped ? (
        <ul className="pd-cal-dist__legend-series">
          {series.map((row, index) => (
            <li key={row.id}>
              <span
                className={cx(
                  'pd-cal-dist__swatch',
                  `is-series-${(index % 6) + 1}`,
                )}
                aria-hidden
              />
              {row.label}
            </li>
          ))}
        </ul>
      ) : null}

      {hideSummary ? null : (
      <aside className="pd-cal-dist__stats" aria-label="Calibration totals">
        <p className="pd-cal-dist__stat">
          <span>Total in calibration</span>
          <strong>{summary.total}</strong>
        </p>
        <p className="pd-cal-dist__stat">
          <span>Exceeding & above</span>
          <strong className="is-high">
            {summary.exceedingAndAbove.count}
            <em>({summary.exceedingAndAbove.percent}%)</em>
          </strong>
        </p>
        <p className="pd-cal-dist__stat">
          <span>Performing</span>
          <strong className="is-mid">
            {summary.performing.count}
            <em>({summary.performing.percent}%)</em>
          </strong>
        </p>
        <p className="pd-cal-dist__stat">
          <span>Developing & below</span>
          <strong className="is-low">
            {summary.developingAndBelow.count}
            <em>({summary.developingAndBelow.percent}%)</em>
          </strong>
        </p>
      </aside>
      )}
    </section>
  )
}
