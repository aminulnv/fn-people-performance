export type CalibrationTabId = 'insights' | 'ratings'

const CALIBRATION_TAB_ROOTS = new Set([
  '/calibration/insights',
  '/calibration/ratings',
])

export function calibrationTabPath(
  tab: CalibrationTabId = 'insights',
): string {
  return `/calibration/${tab}`
}

/** True on the Calibration tab roots — not nested detail routes. */
export function isCalibrationTabRoot(pathname: string): boolean {
  return CALIBRATION_TAB_ROOTS.has(pathname)
}

export function calibrationTabFromPath(
  pathname: string,
): CalibrationTabId | null {
  if (pathname === '/calibration/ratings') return 'ratings'
  if (pathname === '/calibration/insights') return 'insights'
  return null
}
