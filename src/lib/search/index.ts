export { buildSearchCatalog } from './catalog'
export type { ExtraCycleGoals, SearchCatalogInput, SearchCatalogUser } from './catalog'
export { scoreFuzzy, mergeHighlightRanges } from './fuzzy'
export { isTypingTarget } from './isTypingTarget'
export { parseSearchQuery, resolveSearchScope } from './query'
export {
  presentSearchResults,
  scoreSearchItem,
  SEARCH_LIMIT_PER_GROUP,
} from './rank'
export {
  clearRecentSearches,
  readRecentSearchIds,
  rememberSearchVisit,
  SEARCH_RECENTS_KEY,
} from './recents'
export type {
  HighlightRange,
  ParsedSearchQuery,
  RankedSearchItem,
  SearchGroup,
  SearchItem,
  SearchKind,
  SearchScope,
} from './types'
export { SEARCH_KIND_GROUP, SEARCH_SCOPES } from './types'
