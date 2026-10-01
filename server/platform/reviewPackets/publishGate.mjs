/**
 * When calibration stages are on, grades cannot publish until the sitting is locked.
 */

export function calibrationPublishGateRequired(stagesConfig) {
  const stages = stagesConfig?.reviewStages
  if (!Array.isArray(stages)) return false
  return stages.some(
    (stage) =>
      (stage.id === 'calibration' || stage.id === 'calibration_hod_hrbp' || stage.id === 'calibration_slt') &&
      stage.enabled,
  )
}

export const CALIBRATION_LOCK_BEFORE_PUBLISH_MESSAGE =
  'Lock calibration before publishing grades.'
