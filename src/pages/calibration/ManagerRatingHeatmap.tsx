import { HintIcon } from '@/pages/reviews/HintIcon'
import {
  HEATMAP_BAND_ORDER,
  heatmapBandLabel,
  heatmapIntensity,
  type ManagerHeatmapRow,
  type ManagerRatingHeatmap,
} from '@/lib/calibration/managerHeatmap'
import { GRADE_BAND_META } from '@/lib/reviews/labels'
import { cx } from '@/lib/cx'

const HEATMAP_HINT = (
  <ul className="pd-help-tip">
    <li>
      <strong>Cells</strong>
      Share of that manager’s graded team. Darker teal is a higher share.
    </li>
    <li>
      <strong>Red</strong>
      Outlier: 40% or more at Developing & below, or over 60% at Exceeding &
      above.
    </li>
    <li>
      <strong>Team avg / Vs org</strong>
      Mean score from 1–5, compared with the cycle overall.
    </li>
  </ul>
)

function peopleLabel(count: number): string {
  return `${count} ${count === 1 ? 'employee' : 'employees'}`
}

function formatDelta(delta: number): string {
  const rounded = Math.round(delta * 100) / 100
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(2)}`
}

function VsOrgCell({ row }: { row: ManagerHeatmapRow }) {
  if (row.vsOrgKind == null || row.vsOrgDelta == null) {
    return <span className="pd-cal-heat__dash">—</span>
  }
  const label =
    row.vsOrgKind === 'on'
      ? '≈ On avg'
      : row.vsOrgKind === 'above'
        ? '↑ Above avg'
        : '↓ Below avg'
  return (
    <span className={cx('pd-cal-heat__vs', `is-${row.vsOrgKind}`)}>
      <span className="pd-cal-heat__vs-label">{label}</span>
      <span className="pd-cal-heat__vs-delta">{formatDelta(row.vsOrgDelta)}</span>
    </span>
  )
}

export function ManagerRatingHeatmap({
  heatmap,
}: {
  heatmap: ManagerRatingHeatmap
}) {
  return (
    <section className="pd-cal-heat" aria-label="Manager rating heatmap">
      <header className="pd-cal-heat__head">
        <h2 className="pd-cal-heat__title">
          <span className="pd-cal-heat__step" aria-hidden>
            3
          </span>
          Manager Rating Heatmap
          <HintIcon content={HEATMAP_HINT} label="About manager rating heatmap" />
        </h2>
      </header>

      <div className="pd-cal-heat__scroller">
        <table className="pd-cal-heat__table">
          <thead>
            <tr>
              <th scope="col">Manager</th>
              {HEATMAP_BAND_ORDER.map((bandId) => (
                <th key={bandId} scope="col">
                  {heatmapBandLabel(bandId)}
                </th>
              ))}
              <th scope="col">Team Avg</th>
              <th scope="col">Vs Org</th>
            </tr>
          </thead>
          <tbody>
            {heatmap.rows.length === 0 ? (
              <tr>
                <td
                  className="pd-cal-heat__empty"
                  colSpan={HEATMAP_BAND_ORDER.length + 3}
                >
                  No graded manager teams in this cycle yet. Rows appear once
                  reports have an official grade.
                </td>
              </tr>
            ) : (
              heatmap.rows.map((row) => (
                <tr key={row.managerEmployeeId}>
                  <th scope="row">
                    <span className="pd-cal-heat__manager">
                      <span className="pd-cal-heat__manager-name">
                        {row.shortName}
                      </span>
                      <span className="pd-cal-heat__manager-meta">
                        {peopleLabel(row.teamSize)}
                      </span>
                    </span>
                  </th>
                  {row.cells.map((cell) => {
                    const intensity = heatmapIntensity(cell.percent, cell.count)
                    const title =
                      cell.count > 0
                        ? `${cell.percent}% · ${cell.count} ${cell.count === 1 ? 'person' : 'people'}`
                        : 'No people in this band'
                    return (
                      <td key={cell.bandId}>
                        <span
                          className={cx(
                            'pd-cal-heat__cell',
                            `is-${cell.bandId}`,
                            `is-i${intensity}`,
                            cell.outlier && 'is-outlier',
                          )}
                          title={title}
                        >
                          {cell.count > 0 ? (
                            <>
                              <strong>{cell.percent}%</strong>
                              <em>
                                {cell.count} pax
                              </em>
                            </>
                          ) : (
                            <span className="pd-cal-heat__dash">—</span>
                          )}
                        </span>
                      </td>
                    )
                  })}
                  <td>
                    {row.averageScore != null && row.averageBand ? (
                      <span
                        className={cx(
                          'pd-cal-heat__avg',
                          `is-${row.averageBand}`,
                        )}
                      >
                        {row.averageScore.toFixed(1)} ·{' '}
                        {GRADE_BAND_META[row.averageBand].label}
                      </span>
                    ) : (
                      <span className="pd-cal-heat__dash">—</span>
                    )}
                  </td>
                  <td>
                    <VsOrgCell row={row} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
