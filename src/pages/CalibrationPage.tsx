import { useState } from 'react'
import { SegmentedControl } from '@/components/ui'
import '@/styles/layout-people.css'

const VIEWS = [
  { id: 'insights', label: 'Calibration Insights' },
  { id: 'ratings', label: 'Employee Rating Table' },
] as const

type CalibrationView = (typeof VIEWS)[number]['id']

export default function CalibrationPage() {
  const [view, setView] = useState<CalibrationView>('insights')

  return (
    <div
      className="pd-page pd-page--pane pd-page--wide pd-people"
      aria-label="Calibration"
    >
      <div className="pd-people__header pd-people__header--bar">
        <SegmentedControl
          options={VIEWS}
          value={view}
          onChange={setView}
          aria-label="Calibration view"
        />
      </div>
    </div>
  )
}
