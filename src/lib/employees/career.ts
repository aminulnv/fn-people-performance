import { monthsBetweenDates } from '@/lib/calibration/indicators'

export function formatCareerTenure(fromIso: string, toIso?: string): string {
  const months = monthsBetweenDates(
    fromIso,
    toIso ?? new Date().toISOString(),
  )
  if (months < 1) return '<1 mo'
  const years = Math.floor(months / 12)
  const rest = months % 12
  if (years === 0) return `${months} mo`
  if (rest === 0) return years === 1 ? '1 yr' : `${years} yr`
  return `${years} yr ${rest} mo`
}

export function inGradeLabel(gradeEffectiveOn: string | undefined): string {
  if (!gradeEffectiveOn) return '—'
  return formatCareerTenure(gradeEffectiveOn)
}

export function lastPromoLabel(lastPromotionOn: string | undefined): string {
  if (!lastPromotionOn) return '—'
  return formatCareerTenure(lastPromotionOn)
}

export function pipStatusLabel(onPip: boolean | undefined): string {
  return onPip ? 'Active PIP' : 'No PIP on record'
}
