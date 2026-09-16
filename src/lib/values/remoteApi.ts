import { apiFetch } from '@/lib/apiClient'
import type { CompanyValue, ValueStatus } from './types'

export async function fetchValuesSnapshotRemote(): Promise<{
  values: CompanyValue[]
}> {
  return apiFetch<{ values: CompanyValue[] }>('/api/platform/values')
}

export async function createValueRemote(body: {
  name: string
  description?: string
  status?: ValueStatus
  behaviours?: CompanyValue['behaviours']
}): Promise<CompanyValue> {
  const response = await apiFetch<{ value: CompanyValue }>(
    '/api/platform/values',
    { method: 'POST', body },
  )
  return response.value
}

export async function updateValueRemote(
  valueId: string,
  body: {
    name: string
    description?: string
    status?: ValueStatus
    behaviours?: CompanyValue['behaviours']
  },
): Promise<CompanyValue> {
  const response = await apiFetch<{ value: CompanyValue }>(
    `/api/platform/values/${encodeURIComponent(valueId)}`,
    { method: 'PATCH', body },
  )
  return response.value
}
