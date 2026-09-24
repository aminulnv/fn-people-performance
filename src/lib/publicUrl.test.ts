import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { publicUrl } from './publicUrl'

const SRC_ROOT = join(import.meta.dirname, '..')

/** Root-absolute public paths ignore Vite `base` (`/platform/` in production). */
const FORBIDDEN_ROOT_PUBLIC_PATH =
  /(?:['"`]|url\(\s*['"]?)\/(?:images|assets|fonts|icons)\//g

function listSourceFiles(dir: string, files: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      listSourceFiles(path, files)
      continue
    }
    if (/\.(tsx?|css)$/.test(name) && !name.endsWith('.test.ts') && !name.endsWith('.test.tsx')) {
      files.push(path)
    }
  }
  return files
}

describe('publicUrl', () => {
  it('prefixes Vite BASE_URL and encodes path segments', () => {
    expect(publicUrl('images/3D Icons/Calendar.svg')).toBe(
      `${import.meta.env.BASE_URL}images/3D%20Icons/Calendar.svg`,
    )
    expect(publicUrl('/images/logo.svg')).toBe(
      `${import.meta.env.BASE_URL}images/logo.svg`,
    )
  })

  it('forbids root-absolute public asset paths in source (use publicUrl)', () => {
    const violations: string[] = []

    for (const file of listSourceFiles(SRC_ROOT)) {
      const text = readFileSync(file, 'utf8')
      const lines = text.split('\n')
      for (let i = 0; i < lines.length; i++) {
        FORBIDDEN_ROOT_PUBLIC_PATH.lastIndex = 0
        if (FORBIDDEN_ROOT_PUBLIC_PATH.test(lines[i]!)) {
          violations.push(`${relative(SRC_ROOT, file)}:${i + 1}: ${lines[i]!.trim()}`)
        }
      }
    }

    expect(violations).toEqual([])
  })
})
