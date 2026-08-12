import type { PlatformEmployee } from '@/lib/employees/types'

export type ReportingNode = {
  employee: PlatformEmployee
  children: ReportingNode[]
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

function resolveManagerId(
  employee: PlatformEmployee,
  byId: Map<number, PlatformEmployee>,
  byName: Map<string, PlatformEmployee>,
): number | null {
  if (
    employee.reportsToId != null &&
    byId.has(employee.reportsToId) &&
    employee.reportsToId !== employee.employeeId
  ) {
    return employee.reportsToId
  }
  const name = normalizeName(employee.reportsToName)
  if (!name) return null
  const manager = byName.get(name)
  if (!manager || manager.employeeId === employee.employeeId) return null
  return manager.employeeId
}

/**
 * Build a forest of reporting trees from People directory rows.
 * Roots = people whose manager is missing / not in the directory.
 */
export function buildReportingForest(
  employees: PlatformEmployee[],
): ReportingNode[] {
  const active = employees.filter((e) => e.isActive)
  const byId = new Map(active.map((e) => [e.employeeId, e]))
  const byName = new Map<string, PlatformEmployee>()
  for (const employee of active) {
    const key = normalizeName(employee.fullName)
    if (key && !byName.has(key)) byName.set(key, employee)
  }

  const childIds = new Map<number, number[]>()
  const hasParent = new Set<number>()

  for (const employee of active) {
    const managerId = resolveManagerId(employee, byId, byName)
    if (managerId == null) continue
    hasParent.add(employee.employeeId)
    const list = childIds.get(managerId)
    if (list) list.push(employee.employeeId)
    else childIds.set(managerId, [employee.employeeId])
  }

  const visiting = new Set<number>()
  const built = new Map<number, ReportingNode>()

  function buildNode(employeeId: number): ReportingNode | null {
    if (built.has(employeeId)) return built.get(employeeId) ?? null
    if (visiting.has(employeeId)) return null
    const employee = byId.get(employeeId)
    if (!employee) return null

    visiting.add(employeeId)
    const children: ReportingNode[] = []
    for (const childId of childIds.get(employeeId) ?? []) {
      const child = buildNode(childId)
      if (child) children.push(child)
    }
    visiting.delete(employeeId)

    children.sort((a, b) =>
      a.employee.fullName.localeCompare(b.employee.fullName),
    )
    const node: ReportingNode = { employee, children }
    built.set(employeeId, node)
    return node
  }

  const roots: ReportingNode[] = []
  for (const employee of active) {
    if (hasParent.has(employee.employeeId)) continue
    const node = buildNode(employee.employeeId)
    if (node) roots.push(node)
  }

  roots.sort((a, b) => {
    const sizeDiff = countDescendants(b) - countDescendants(a)
    if (sizeDiff !== 0) return sizeDiff
    return a.employee.fullName.localeCompare(b.employee.fullName)
  })

  return roots
}

export function countDescendants(node: ReportingNode): number {
  let total = node.children.length
  for (const child of node.children) total += countDescendants(child)
  return total
}

/** Ancestor chain from root → person (inclusive), or empty if not found. */
export function findPathToEmployee(
  forest: ReportingNode[],
  employeeId: number,
): number[] {
  const path: number[] = []

  function walk(node: ReportingNode): boolean {
    path.push(node.employee.employeeId)
    if (node.employee.employeeId === employeeId) return true
    for (const child of node.children) {
      if (walk(child)) return true
    }
    path.pop()
    return false
  }

  for (const root of forest) {
    if (walk(root)) return [...path]
  }
  return []
}

export function collectSubtreeIds(node: ReportingNode): number[] {
  const ids = [node.employee.employeeId]
  for (const child of node.children) ids.push(...collectSubtreeIds(child))
  return ids
}
