import { apiFetch } from '@/lib/apiClient'
import type {
  CreateRoleInput,
  PlatformRole,
  RoleMatrixSkillInput,
  UpdateRoleInput,
} from './types'

export async function fetchRolesRemote(): Promise<PlatformRole[]> {
  const response = await apiFetch<{ roles: PlatformRole[] }>(
    '/api/platform/roles',
  )
  return response.roles
}

export async function fetchRoleRemote(roleId: string): Promise<PlatformRole> {
  const response = await apiFetch<{ role: PlatformRole }>(
    `/api/platform/roles/${encodeURIComponent(roleId)}`,
  )
  return response.role
}

export async function createRoleRemote(
  body: CreateRoleInput,
): Promise<PlatformRole> {
  const response = await apiFetch<{ role: PlatformRole }>(
    '/api/platform/roles',
    { method: 'POST', body },
  )
  return response.role
}

export async function updateRoleRemote(
  roleId: string,
  body: UpdateRoleInput,
): Promise<PlatformRole> {
  const response = await apiFetch<{ role: PlatformRole }>(
    `/api/platform/roles/${encodeURIComponent(roleId)}`,
    { method: 'PATCH', body },
  )
  return response.role
}

export async function updateRoleMatrixRemote(
  roleId: string,
  skills: RoleMatrixSkillInput[],
): Promise<PlatformRole> {
  const response = await apiFetch<{ role: PlatformRole }>(
    `/api/platform/roles/${encodeURIComponent(roleId)}/matrix`,
    { method: 'PUT', body: { skills } },
  )
  return response.role
}

export async function duplicateRoleRemote(
  roleId: string,
): Promise<PlatformRole> {
  const response = await apiFetch<{ role: PlatformRole }>(
    `/api/platform/roles/${encodeURIComponent(roleId)}/duplicate`,
    { method: 'POST', body: {} },
  )
  return response.role
}
