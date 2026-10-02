import assert from 'node:assert/strict'
import test from 'node:test'
import {
  absoluteNotificationUrl,
  sanitizeNotificationDestination,
} from './sanitizeDestination.mjs'

test('accepts relative in-app paths', () => {
  assert.equal(
    sanitizeNotificationDestination('/goals/q3/12'),
    '/goals/q3/12',
  )
  assert.equal(sanitizeNotificationDestination('  /reviews  '), '/reviews')
})

test('rejects protocol-relative and unsafe paths', () => {
  assert.equal(sanitizeNotificationDestination('//evil.example'), null)
  assert.equal(sanitizeNotificationDestination('javascript:alert(1)'), null)
  assert.equal(sanitizeNotificationDestination('http://insecure.example'), null)
})

test('accepts https without userinfo', () => {
  assert.equal(
    sanitizeNotificationDestination('https://performance.nextventures.io/platform/goals'),
    'https://performance.nextventures.io/platform/goals',
  )
  assert.equal(
    sanitizeNotificationDestination('https://user:pass@evil.example/x'),
    null,
  )
})

test('absoluteNotificationUrl joins base and path', () => {
  assert.equal(
    absoluteNotificationUrl(
      '/goals/q3/1',
      'https://performance.nextventures.io/platform',
    ),
    'https://performance.nextventures.io/platform/goals/q3/1',
  )
  assert.equal(
    absoluteNotificationUrl(
      null,
      'https://performance.nextventures.io/platform',
    ),
    'https://performance.nextventures.io/platform',
  )
})
