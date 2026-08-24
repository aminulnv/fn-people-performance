import { Search } from 'lucide-react'
import { useGlobalSearch } from './GlobalSearchProvider'

export function TopBarSearch() {
  const { openSearch } = useGlobalSearch()

  return (
    <span className="pd-topbar__search-wrap">
      <button
        type="button"
        className="pd-topbar__search"
        onClick={openSearch}
        aria-haspopup="dialog"
        aria-keyshortcuts="/"
        aria-label="Search the company"
      >
        <Search
          size={16}
          strokeWidth={1.75}
          className="pd-topbar__search-icon"
          aria-hidden
        />
        <span className="pd-topbar__search-placeholder">Search</span>
        <kbd className="pd-topbar__search-kbd">/</kbd>
      </button>
    </span>
  )
}
