/**
 * Postgres pool for platform.* only (shared RDS, separate schema).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const { Pool } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_RDS_CA_PATH = path.join(__dirname, 'certs', 'rds-global-bundle.pem')

let pool = null

export function isDatabaseConfigured() {
  if (process.env.DATABASE_URL?.trim()) return true
  const host = process.env.DB_HOST?.trim()
  const name = process.env.DB_NAME?.trim()
  const user = process.env.DB_USERNAME?.trim()
  const pass = process.env.DB_PASS?.trim()
  return Boolean(host && name && user && pass)
}

function isRdsHost(env = process.env) {
  const host = env.DB_HOST?.trim() ?? ''
  const url = env.DATABASE_URL?.trim() ?? ''
  return /\.rds\.amazonaws\.com/i.test(host) || /\.rds\.amazonaws\.com/i.test(url)
}

function readCaBundle(env = process.env) {
  const caFile = env.DB_SSL_CA_FILE?.trim() || DEFAULT_RDS_CA_PATH
  try {
    return fs.readFileSync(caFile)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`[db] Could not read SSL CA bundle at ${caFile}: ${message}`)
  }
}

function resolvePoolSsl(env = process.env) {
  if (env.DB_SSL === 'false') return undefined
  const needsSsl = env.DB_SSL === 'true' || isRdsHost(env)
  if (!needsSsl) return undefined
  if (env.DB_SSL_REJECT_UNAUTHORIZED === 'false') {
    return { rejectUnauthorized: false }
  }
  if (isRdsHost(env)) {
    return { rejectUnauthorized: true, ca: readCaBundle(env) }
  }
  return { rejectUnauthorized: true }
}

function poolConfig() {
  const ssl = resolvePoolSsl()
  if (process.env.DATABASE_URL?.trim()) {
    return { connectionString: process.env.DATABASE_URL.trim(), ssl }
  }
  return {
    host: process.env.DB_HOST.trim(),
    port: Number(process.env.DB_PORT?.trim() || 5432),
    database: process.env.DB_NAME.trim(),
    user: process.env.DB_USERNAME.trim(),
    password: process.env.DB_PASS.trim(),
    ssl,
  }
}

export function getPool() {
  if (!isDatabaseConfigured()) {
    throw new Error(
      'Set DATABASE_URL or DB_HOST, DB_NAME, DB_USERNAME, and DB_PASS in .env',
    )
  }
  if (!pool) pool = new Pool(poolConfig())
  return pool
}
