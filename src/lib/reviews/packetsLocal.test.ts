import { describe, expect, it } from 'vitest'
import { calibrateLocalPacket, getLocalPacket } from './packetsLocal'

describe('calibrateLocalPacket', () => {
  it('refuses to start before the manager review is submitted', () => {
    const packet = getLocalPacket('q3-2026', 2)
    expect(packet.status).toBe('not_started')
    expect(() =>
      calibrateLocalPacket(packet.id, {
        toGrade: 'exceeding',
        reason: 'Too early',
      }),
    ).toThrow('Calibration cannot start until the manager review is submitted.')
  })
})
