import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { REQUIRED_MIGRATIONS } from './migrations.mjs'

const migrationsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../db/migrations',
)

test('boot requires every migration file in the project', () => {
  const files = readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort()
  assert.deepEqual([...REQUIRED_MIGRATIONS].sort(), files)
  assert.equal(REQUIRED_MIGRATIONS.includes('00031_late_justification.sql'), true)
  assert.equal(REQUIRED_MIGRATIONS.includes('00033_scorecard_forms.sql'), true)
  assert.equal(REQUIRED_MIGRATIONS.includes('00045_calibration_calibrator_scope.sql'), true)
})
