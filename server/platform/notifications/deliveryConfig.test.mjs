import assert from 'node:assert/strict'
import test from 'node:test'
import {
  emailDeliveryConfig,
  clickupDeliveryConfig,
  initialDeliveryStatus,
  notificationDeliveryStatus,
} from './deliveryConfig.mjs'

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

test('email stays off until SMTP host and from are set', () => {
  withEnv(
    {
      PLATFORM_SMTP_HOST: null,
      PLATFORM_SMTP_FROM: null,
      PLATFORM_EMAIL_DELIVERY_ENABLED: null,
    },
    () => {
      const email = emailDeliveryConfig()
      assert.equal(email.configured, false)
      assert.equal(email.enabled, false)
      assert.equal(email.reason, 'smtp_not_configured')
      assert.deepEqual(initialDeliveryStatus('email'), {
        status: 'not_configured',
        reason: 'smtp_not_configured',
      })
    },
  )
})

test('email enables when SMTP is set and kill-switch is not off', () => {
  withEnv(
    {
      PLATFORM_SMTP_HOST: 'smtp.example.com',
      PLATFORM_SMTP_FROM: 'People <noreply@example.com>',
      PLATFORM_SMTP_PORT: '587',
      PLATFORM_EMAIL_DELIVERY_ENABLED: null,
    },
    () => {
      const email = emailDeliveryConfig()
      assert.equal(email.configured, true)
      assert.equal(email.enabled, true)
      assert.equal(email.reason, null)
      assert.deepEqual(initialDeliveryStatus('email'), {
        status: 'pending',
        reason: null,
      })
    },
  )
})

test('email kill-switch keeps outbox not_configured even with SMTP set', () => {
  withEnv(
    {
      PLATFORM_SMTP_HOST: 'smtp.example.com',
      PLATFORM_SMTP_FROM: 'People <noreply@example.com>',
      PLATFORM_EMAIL_DELIVERY_ENABLED: 'false',
    },
    () => {
      const email = emailDeliveryConfig()
      assert.equal(email.configured, true)
      assert.equal(email.enabled, false)
      assert.equal(email.reason, 'email_delivery_disabled')
      assert.equal(initialDeliveryStatus('email').status, 'not_configured')
    },
  )
})

test('clickup stays off until token and list id are set', () => {
  withEnv(
    {
      PLATFORM_CLICKUP_API_TOKEN: null,
      PLATFORM_CLICKUP_LIST_ID: null,
    },
    () => {
      const clickup = clickupDeliveryConfig()
      assert.equal(clickup.enabled, false)
      assert.equal(initialDeliveryStatus('clickup').status, 'not_configured')
    },
  )
})

test('in_app is delivered immediately; browser stays pending for the client', () => {
  assert.deepEqual(initialDeliveryStatus('in_app'), {
    status: 'delivered',
    reason: null,
  })
  assert.deepEqual(initialDeliveryStatus('browser'), {
    status: 'pending',
    reason: null,
  })
})

test('notificationDeliveryStatus exposes safe public flags only', () => {
  withEnv(
    {
      PLATFORM_SMTP_HOST: null,
      PLATFORM_SMTP_FROM: null,
      PLATFORM_CLICKUP_API_TOKEN: 'secret',
      PLATFORM_CLICKUP_LIST_ID: null,
    },
    () => {
      const status = notificationDeliveryStatus()
      assert.equal(status.email.enabled, false)
      assert.equal(status.clickup.enabled, false)
      assert.ok(!('token' in status.clickup))
      assert.ok(!('pass' in status.email))
    },
  )
})
