import assert from 'node:assert/strict'
import test from 'node:test'
import { permissionsForAccessRules } from './auth.mjs'

const bootstrap = new Set(['aminul.islam@nextventures.io'])

test('built-in admin applies only before any access assignment exists', () => {
  const full = permissionsForAccessRules({
    email: 'aminul.islam@nextventures.io',
    bootstrapEmails: bootstrap,
    rulesExist: false,
    assignedPermissions: [],
  })
  assert.ok(full.includes('platform.write_all'))

  const removed = permissionsForAccessRules({
    email: 'aminul.islam@nextventures.io',
    bootstrapEmails: bootstrap,
    rulesExist: true,
    assignedPermissions: [],
  })
  assert.deepEqual(removed, [])
})

test('assigned permissions are used once access rules exist', () => {
  const rights = permissionsForAccessRules({
    email: 'someone@nextventures.io',
    bootstrapEmails: bootstrap,
    rulesExist: true,
    assignedPermissions: ['platform.read_all'],
  })
  assert.deepEqual(rights, ['platform.read_all'])
})
