type MetricTileProps = {
  label: string
  value: string | number
  hint?: string
}

export function MetricTile({ label, value, hint }: MetricTileProps) {
  return (
    <div className="pd-metric">
      <span className="pd-metric__label">{label}</span>
      <span className="pd-metric__value">{value}</span>
      {hint ? <span className="pd-metric__hint">{hint}</span> : null}
    </div>
  )
}
