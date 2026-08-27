import { datePart } from './timestamp'

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

/** Display format for date inputs: 05-Mar-2027 */
export function formatInputDate(iso: string): string {
  const date = datePart(iso)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return ''
  const [, year, month, day] = match
  const monthName = MONTHS[Number(month) - 1]
  if (!monthName) return ''
  return `${day}-${monthName}-${year}`
}
