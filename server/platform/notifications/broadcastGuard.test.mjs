import assert from 'node:assert/strict'
import test from 'node:test'
import {
  developerEmailAllowlist,
  isFullBroadcastAllowed,
} from './broadcastGuard.mjs'

test('full broadcast only in production with kill-switch on', () => {
  assert.equal(isFullBroadcastAllowed({ NODE_ENV: 'development' }), false)
  assert.equal(isFullBroadcastAllowed({ NODE_ENV: 'test' }), false)
  assert.equal(
    isFullBroadcastAllowed({
      NODE_ENV: 'production',
      BROADCAST_NOTIFY_ALL_USERS: '0',
    }),
    false,
  )
  assert.equal(
    isFullBroadcastAllowed({
      NODE_ENV: 'production',
      PLATFORM_BROADCAST_NOTIFY_ALL: 'false',
    }),
    false,
  )
  assert.equal(isFullBroadcastAllowed({ NODE_ENV: 'production' }), true)
})

test('developer allowlist parses comma-separated emails', () => {
  assert.deepEqual(
    developerEmailAllowlist({
      PLATFORM_DEVELOPER_EMAILS: ' Dev@Example.com, other@test.io ,, ',
    }),
    ['dev@example.com', 'other@test.io'],
  )
  assert.deepEqual(developerEmailAllowlist({}), [])
})
