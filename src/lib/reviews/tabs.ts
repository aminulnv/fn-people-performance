export const REVIEW_TABS = [
  { id: 'scorecards', label: 'Scorecards' },
  { id: 'cycles', label: 'Cycles' },
] as const

export type ReviewsTab = (typeof REVIEW_TABS)[number]['id']

export function isReviewsTab(value: string | undefined): value is ReviewsTab {
  return REVIEW_TABS.some((tab) => tab.id === value)
}
