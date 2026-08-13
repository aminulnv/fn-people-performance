/** Starter directory options for the People form (local UI until catalogs are backed by an API). */

export const JOB_TITLE_OPTIONS = [
  'Analyst',
  'Associate',
  'Specialist',
  'Senior Specialist',
  'Team Lead',
  'Manager',
  'Senior Manager',
  'Head of Department',
  'Director',
  'Executive',
  'Engineering Manager',
  'Product Manager',
  'Software Engineer',
  'Senior Software Engineer',
  'Designer',
  'HR Business Partner',
] as const

export const JOB_GRADE_OPTIONS = [
  'IC1',
  'IC2',
  'IC3',
  'IC4',
  'IC5',
  'M1',
  'M2',
  'M3',
  'M4',
  'L1',
  'L2',
  'L3',
] as const

export const DEPARTMENT_OPTIONS = [
  'Product',
  'Engineering',
  'Design',
  'Marketing',
  'Operations',
  'People',
  'Finance',
  'Legal',
  'Customer Success',
  'Data / BI',
  'CPM',
] as const

export const TEAM_OPTIONS = [
  'Core',
  'Platform',
  'Growth',
  'Enablement',
  'Risk',
  'Support',
  'Infrastructure',
  'Insights',
] as const

export const DIVISION_OPTIONS = [
  'FundedNext',
  'FNmarkets',
  'NEXT Group',
  'Core',
] as const

export const SITE_OPTIONS = [
  'NEXT Ventures Bangladesh',
  'NEXT Ventures Lanka',
  'NEXT Malaysia',
  'NEXT UAE',
  'NEXT Cyprus',
] as const

export type CatalogOption = {
  value: string
  label: string
}

/** Merge seeded options with any values already used in the directory (and current form). */
export function buildCatalogOptions(
  seeded: readonly string[],
  extraValues: Array<string | undefined | null> = [],
): CatalogOption[] {
  const seen = new Set<string>()
  const options: CatalogOption[] = []

  for (const value of [...seeded, ...extraValues]) {
    const trimmed = value?.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    options.push({ value: trimmed, label: trimmed })
  }

  return options.sort((a, b) => a.label.localeCompare(b.label))
}
