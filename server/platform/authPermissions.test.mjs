import assert from 'node:assert/strict'
import test from 'node:test'
import { permissionsForAccessRules } from './auth.mjs'

const bootstrap = new Set(['aminul.islam@nextventures.io'])

test('built-in admin keeps full access even after access assignments exist', () => {
  const before = permissionsForAccessRules({
    email: 'aminul.islam@nextventures.io',
    bootstrapEmails: bootstrap,
    assignedPermissions: [],
  })
  assert.ok(before.includes('platform.write_all'))

  const after = permissionsForAccessRules({
    email: 'aminul.islam@nextventures.io',
    bootstrapEmails: bootstrap,
    assignedPermissions: ['platform.read_all'],
  })
  assert.ok(after.includes('platform.write_all'))
})

test('assigned permissions are used for non-bootstrap emails', () => {
  const rights = permissionsForAccessRules({
    email: 'someone@nextventures.io',
    bootstrapEmails: bootstrap,
    assignedPermissions: ['platform.read_all'],
  })
  assert.deepEqual(rights, ['platform.read_all'])
})

test('non-bootstrap emails with no assignment get no elevated permissions', () => {
  const rights = permissionsForAccessRules({
    email: 'someone@nextventures.io',
    bootstrapEmails: bootstrap,
    assignedPermissions: [],
  })
  assert.deepEqual(rights, [])
})
