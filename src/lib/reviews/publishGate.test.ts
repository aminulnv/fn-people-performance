import { describe, expect, it } from 'vitest'
import { calibrationPublishGateRequired } from './publishGate'

describe('calibrationPublishGateRequired', () => {
  it('is off when no calibration stages are enabled', () => {
    expect(
      calibrationPublishGateRequired({
        reviewStages: [
          { id: 'manager_review', enabled: true },
          { id: 'calibration', enabled: false },
          { id: 'publish_employees', enabled: true },
        ],
      }),
    ).toBe(false)
  })

  it('is on when calibration is enabled', () => {
    expect(
      calibrationPublishGateRequired({
        reviewStages: [{ id: 'calibration', enabled: true }],
      }),
    ).toBe(true)
  })

  it('still treats legacy dual-window ids as calibration-on', () => {
    expect(
      calibrationPublishGateRequired({
        reviewStages: [{ id: 'calibration_slt', enabled: true }],
      }),
    ).toBe(true)
    expect(
      calibrationPublishGateRequired({
        reviewStages: [{ id: 'calibration_hod_hrbp', enabled: true }],
      }),
    ).toBe(true)
  })
})
