import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useOrganisationCatalogs } from './useEmployees'

const { listDepartments, listTeams } = vi.hoisted(() => ({
  listDepartments: vi.fn(),
  listTeams: vi.fn(),
}))

vi.mock('@/lib/employees/store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/employees/store')>()
  return {
    ...actual,
    listDepartments,
    listTeams,
  }
})

beforeEach(() => {
  listDepartments.mockReset()
  listTeams.mockReset()
})

describe('useOrganisationCatalogs', () => {
  it('keeps a failed load from looking like an empty organisation', async () => {
    listDepartments.mockRejectedValue(new Error('Could not load departments'))
    listTeams.mockResolvedValue([])

    const { result } = renderHook(() => useOrganisationCatalogs())

    await waitFor(() => expect(result.current.ready).toBe(true))
    expect(result.current.error).toBe('Could not load departments')
    expect(result.current.departments).toEqual([])
  })

  it('clears the error when retry succeeds', async () => {
    listDepartments.mockRejectedValueOnce(new Error('Could not load departments'))
    listTeams.mockResolvedValue([])

    const { result } = renderHook(() => useOrganisationCatalogs())
    await waitFor(() => expect(result.current.error).toBe('Could not load departments'))

    listDepartments.mockResolvedValue([
      {
        id: 1,
        name: 'Product',
        headEmployeeId: null,
        headName: null,
        headEmail: null,
        hrbpEmployeeId: null,
        hrbpName: null,
        hrbpEmail: null,
        headcount: 0,
        teamCount: 0,
      },
    ])
    result.current.reload()

    await waitFor(() => expect(result.current.error).toBeNull())
    expect(result.current.departments.map((row) => row.name)).toEqual(['Product'])
  })
})
