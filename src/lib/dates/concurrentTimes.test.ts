import { describe, expect, it } from 'vitest'
import { listConcurrentTimes } from './concurrentTimes'

describe('listConcurrentTimes', () => {
  it('converts 6:30 AM in Bangladesh into the matching clocks', () => {
    const zones = listConcurrentTimes('2026-08-25', '06:30', 'Asia/Dhaka')

    expect(zones.map((zone) => [zone.name, zone.timeLabel, zone.crossesDay])).toEqual([
      ['Bangladesh', '6:30 AM', false],
      ['Malaysia', '8:30 AM', false],
      ['Sri Lanka', '6:00 AM', false],
      ['Dubai', '4:30 AM', false],
    ])
  })

  it('marks a zone when the calendar day changes', () => {
    const zones = listConcurrentTimes('2026-08-25', '23:30', 'Asia/Dhaka')
    const malaysia = zones.find((zone) => zone.id === 'malaysia')
    const dubai = zones.find((zone) => zone.id === 'dubai')

    expect(malaysia).toMatchObject({
      timeLabel: '1:30 AM',
      dateLabel: '26 Aug',
      crossesDay: true,
    })
    expect(dubai).toMatchObject({
      timeLabel: '9:30 PM',
      crossesDay: false,
    })
  })
})
