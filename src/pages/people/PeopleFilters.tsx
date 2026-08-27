import { useCallback, useMemo } from 'react'
import {
  AtSign,
  Briefcase,
  Building2,
  CircleDot,
  IdCard,
  UserRound,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { AttributeFilters } from '@/components/ui'
import type { PlatformEmployee } from '@/lib/employees/types'
import {
  activeDirectoryFilterCount,
  DIRECTORY_ATTRIBUTES,
  directoryAttributeValues,
  selectedStatusValues,
  statusAttributeValues,
  statusFilterFromValues,
  type DirectoryAttributeFilters,
  type DirectoryAttributeId,
  type DirectoryAttributeOption,
  type StatusFilter,
} from '@/pages/people/filterDirectory'

const ATTRIBUTE_ICONS: Record<DirectoryAttributeOption['id'], LucideIcon> = {
  name: IdCard,
  email: AtSign,
  status: CircleDot,
  jobTitle: Briefcase,
  department: Building2,
  team: UsersRound,
  reportsTo: UserRound,
}

const PEOPLE_ATTRIBUTES = DIRECTORY_ATTRIBUTES.map((attribute) => ({
  ...attribute,
  icon: ATTRIBUTE_ICONS[attribute.id],
}))

export type PeopleFiltersProps = {
  employees: readonly PlatformEmployee[]
  statusFilter: StatusFilter | null
  onStatusFilterChange: (next: StatusFilter | null) => void
  attributeFilters: DirectoryAttributeFilters
  onAttributeFiltersChange: (next: DirectoryAttributeFilters) => void
}

export function PeopleFilters({
  employees,
  statusFilter,
  onStatusFilterChange,
  attributeFilters,
  onAttributeFiltersChange,
}: PeopleFiltersProps) {
  const selected = useMemo(
    () => ({
      ...attributeFilters,
      status: selectedStatusValues(statusFilter),
    }),
    [attributeFilters, statusFilter],
  )

  const valuesFor = useCallback(
    (id: string) => {
      if (id === 'status') return statusAttributeValues()
      return directoryAttributeValues(employees, id as DirectoryAttributeId)
    },
    [employees],
  )

  return (
    <AttributeFilters
      attributes={PEOPLE_ATTRIBUTES}
      valuesFor={valuesFor}
      selected={selected}
      onChange={(next) => {
        const { status, ...rest } = next
        onStatusFilterChange(statusFilterFromValues(status ?? []))
        onAttributeFiltersChange(rest)
      }}
      sectionLabel="People attributes"
      count={activeDirectoryFilterCount(statusFilter, attributeFilters)}
    />
  )
}
