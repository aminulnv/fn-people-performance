import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Building2,
  Search,
  UserRound,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { searchablePages, navItemsForPermissions } from '@/config/layout'
import { useAuth } from '@/lib/useAuth'
import { useOrganisation } from '@/lib/employees/useEmployees'
import {
  departmentDetailPath,
  teamDetailPath,
} from '@/lib/organisation/paths'

type SearchSection = 'Pages' | 'People' | 'Departments' | 'Teams'

type GlobalSearchResult = {
  key: string
  section: SearchSection
  label: string
  description?: string
  path: string
  icon: LucideIcon
}

const RESULT_LIMIT_PER_SECTION = 5
const SEARCH_SECTIONS: SearchSection[] = [
  'Pages',
  'People',
  'Departments',
  'Teams',
]

function includesQuery(values: Array<string | number>, query: string): boolean {
  return values.some((value) => String(value).toLowerCase().includes(query))
}

function pluralize(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? '' : 's'}`
}

export function TopBarSearch() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { employees, organisation } = useOrganisation()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultRefs = useRef<Array<HTMLLIElement | null>>([])
  const listId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const results = useMemo<GlobalSearchResult[]>(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const visiblePages = navItemsForPermissions(
      searchablePages,
      user?.permissions,
    )

    const pageResults = visiblePages
      .filter(
        (page) =>
          !normalizedQuery ||
          includesQuery([page.label, page.path], normalizedQuery),
      )
      .slice(0, RESULT_LIMIT_PER_SECTION)
      .map((page) => ({
        key: `page:${page.path}`,
        section: 'Pages' as const,
        label: page.label,
        path: page.path,
        icon: page.icon,
      }))

    if (!normalizedQuery) return pageResults

    const peopleResults = employees
      .filter(
        (employee) =>
          employee.isActive &&
          includesQuery(
            [
              employee.employeeId,
              employee.fullName,
              employee.email,
              employee.jobTitle,
              employee.department,
              employee.team,
              employee.division,
              employee.jobGrade,
            ],
            normalizedQuery,
          ),
      )
      .slice(0, RESULT_LIMIT_PER_SECTION)
      .map((employee) => ({
        key: `person:${employee.employeeId}`,
        section: 'People' as const,
        label: employee.fullName,
        description:
          [employee.jobTitle, employee.department].filter(Boolean).join(' · ') ||
          employee.email,
        path: `/people/${employee.employeeId}`,
        icon: UserRound,
      }))

    const departmentResults = organisation.departments
      .filter((department) =>
        includesQuery(
          [
            department.name,
            department.head?.fullName ?? '',
            ...department.teams.flatMap((team) => [
              team.name,
              team.manager?.fullName ?? '',
            ]),
          ],
          normalizedQuery,
        ),
      )
      .slice(0, RESULT_LIMIT_PER_SECTION)
      .map((department) => ({
        key: `department:${department.id}`,
        section: 'Departments' as const,
        label: department.name,
        description: `${pluralize(department.headcount, 'person')} · ${pluralize(
          department.teams.length,
          'team',
        )}`,
        path: departmentDetailPath(department.id),
        icon: Building2,
      }))

    const teamResults = organisation.teams
      .filter((team) =>
        includesQuery(
          [team.name, team.departmentName, team.manager?.fullName ?? ''],
          normalizedQuery,
        ),
      )
      .slice(0, RESULT_LIMIT_PER_SECTION)
      .map((team) => ({
        key: `team:${team.id}`,
        section: 'Teams' as const,
        label: team.name,
        description: `${team.departmentName} · ${pluralize(
          team.headcount,
          'person',
        )}`,
        path: teamDetailPath(team.id),
        icon: UsersRound,
      }))

    return [
      ...pageResults,
      ...peopleResults,
      ...departmentResults,
      ...teamResults,
    ]
  }, [employees, organisation, query, user?.permissions])

  const groupedResults = SEARCH_SECTIONS.map((section) => ({
    section,
    results: results.filter((result) => result.section === section),
  })).filter((group) => group.results.length > 0)

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    if (!open) return
    resultRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  useEffect(() => {
    if (!open) return

    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const closeSearch = () => {
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
  }

  const goToResult = (path: string) => {
    navigate(path)
    closeSearch()
    inputRef.current?.blur()
  }

  const handleKeyDown = (e: {
    key: string
    preventDefault: () => void
  }) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      closeSearch()
      inputRef.current?.blur()
      return
    }

    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true)
      return
    }

    if (!results.length) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActiveIndex((index) => (index + 1) % results.length)
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      setActiveIndex((index) => (index - 1 + results.length) % results.length)
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      const result = results[activeIndex]
      if (result) goToResult(result.path)
    }
  }

  return (
    <div ref={containerRef} className="pd-topbar__search-wrap">
      <label className="pd-topbar__search">
        <Search
          size={16}
          strokeWidth={1.75}
          className="pd-topbar__search-icon"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="search"
          className="pd-topbar__search-input"
          placeholder="Search company…"
          aria-label="Search pages, people, departments, and teams"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={
            open && results[activeIndex]
              ? `${listId}-option-${activeIndex}`
              : undefined
          }
          aria-autocomplete="list"
          role="combobox"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
      </label>
      {open && (
        <div
          className="pd-topbar__dropdown-panel pd-topbar__dropdown-panel--search"
          role="listbox"
          id={listId}
          aria-label="Global search results"
        >
          {results.length === 0 ? (
            <div className="pd-topbar__search-empty">No results found</div>
          ) : (
            groupedResults.map((group) => (
              <div key={group.section} className="pd-topbar__search-section">
                <div className="pd-topbar__search-section-label">
                  {group.section}
                </div>
                <ul className="pd-topbar__search-list">
                  {group.results.map((result) => {
                    const index = results.indexOf(result)
                    const Icon = result.icon
                    const isActive = index === activeIndex
                    return (
                      <li
                        key={result.key}
                        id={`${listId}-option-${index}`}
                        ref={(element) => {
                          resultRefs.current[index] = element
                        }}
                        role="option"
                        aria-selected={isActive}
                      >
                        <Link
                          to={result.path}
                          className={
                            isActive
                              ? 'pd-topbar__search-result pd-topbar__search-result--active'
                              : 'pd-topbar__search-result'
                          }
                          onClick={closeSearch}
                          onMouseEnter={() => setActiveIndex(index)}
                        >
                          <span
                            className="pd-topbar__search-result-icon"
                            aria-hidden
                          >
                            <Icon size={14} strokeWidth={2} />
                          </span>
                          <span className="pd-topbar__search-result-text">
                            <span className="pd-topbar__search-result-label">
                              {result.label}
                            </span>
                            {result.description ? (
                              <span className="pd-topbar__search-result-description">
                                {result.description}
                              </span>
                            ) : null}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
