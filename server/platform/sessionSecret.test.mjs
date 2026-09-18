import assert from 'node:assert/strict'
import test from 'node:test'
import { sessionSecret } from './sessionSecret.mjs'

function withEnv(values, run) {
  const previous = new Map()
  for (const key of Object.keys(values)) {
    previous.set(key, process.env[key])
    const next = values[key]
    if (next == null) delete process.env[key]
    else process.env[key] = next
  }
  try {
    return run()
  } finally {
    for (const [key, value] of previous) {
      if (value == null) delete process.env[key]
      else process.env[key] = value
    }
  }
}

test('refuses to sign sessions when no secret is set', () => {
  withEnv(
    { PLATFORM_SESSION_SECRET: null, SESSION_SECRET: null },
    () => {
      assert.throws(
        () => sessionSecret(),
        /PLATFORM_SESSION_SECRET or SESSION_SECRET/,
      )
    },
  )
})

test('uses PLATFORM_SESSION_SECRET before SESSION_SECRET', () => {
  withEnv(
    {
      PLATFORM_SESSION_SECRET: 'platform-secret',
      SESSION_SECRET: 'shared-secret',
    },
    () => {
      assert.equal(sessionSecret(), 'platform-secret')
    },
  )
})

test('falls back to SESSION_SECRET when the platform secret is blank', () => {
  withEnv(
    { PLATFORM_SESSION_SECRET: '   ', SESSION_SECRET: 'shared-secret' },
    () => {
      assert.equal(sessionSecret(), 'shared-secret')
    },
  )
})
