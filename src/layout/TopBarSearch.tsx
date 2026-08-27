import { Search } from 'lucide-react'
import { useGlobalSearch } from './GlobalSearchProvider'

export function TopBarSearch() {
  const { openSearch } = useGlobalSearch()

  return (
    <button
      type="button"
      className="pd-topbar__icon-btn pd-topbar__search-btn"
      onClick={openSearch}
      aria-haspopup="dialog"
      aria-keyshortcuts="/"
      aria-label="Search the company"
    >
      <Search size={16} strokeWidth={2} />
    </button>
  )
}
