import { Search } from 'lucide-react'
import { Tooltip } from '@/components/ui'
import { useGlobalSearch } from './GlobalSearchProvider'

export function TopBarSearch() {
  const { openSearch } = useGlobalSearch()

  return (
    <Tooltip content="Search" side="bottom" portal>
      <button
        type="button"
        className="pd-topbar__icon-btn pd-topbar__search-btn"
        onClick={openSearch}
        aria-haspopup="dialog"
        aria-keyshortcuts="/"
        aria-label="Search The Company"
      >
        <Search size={16} strokeWidth={2} />
      </button>
    </Tooltip>
  )
}
