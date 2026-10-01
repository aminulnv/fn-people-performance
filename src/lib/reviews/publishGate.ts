/** Client mirror of server publishGate — keep messages in sync. */

export function calibrationPublishGateRequired(stagesConfig: {
  reviewStages?: Array<{ id: string; enabled?: boolean }> | null
} | null | undefined): boolean {
  const stages = stagesConfig?.reviewStages
  if (!Array.isArray(stages)) return false
  return stages.some(
    (stage) =>
      (stage.id === 'calibration' ||
        stage.id === 'calibration_hod_hrbp' ||
        stage.id === 'calibration_slt') &&
      Boolean(stage.enabled),
  )
}

export const CALIBRATION_LOCK_BEFORE_PUBLISH_MESSAGE =
  'Lock calibration before publishing grades.'
