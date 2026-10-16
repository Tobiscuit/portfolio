/**
 * Characterization test for the Payload config: it loads the real
 * payload.config.ts with dummy environment values and pins the sanitized
 * shape that the admin, the API routes and scripts/mirror-assets.ts rely on.
 * Nothing is connected to - buildConfig only constructs adapters.
 */
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { SanitizedConfig } from 'payload'

let config: SanitizedConfig

beforeAll(async () => {
  vi.stubEnv('PAYLOAD_SECRET', 'test-secret')
  vi.stubEnv('DATABASE_URI', 'mongodb://127.0.0.1:1/never-connected')
  vi.stubEnv('S3_BUCKET', ' test-bucket ')
  vi.stubEnv('AWS_ACCESS_KEY_ID', ' test-access-key-id ')
  vi.stubEnv('AWS_SECRET_ACCESS_KEY', ' test-secret-access-key ')
  vi.stubEnv('AWS_REGION', 'us-east-2')
  config = await (await import('./payload.config')).default
})
afterAll(() => vi.unstubAllEnvs())

describe('payload.config', () => {
  it('registers the users, media and projects collections with users as the admin auth collection', () => {
    const slugs = config.collections.map((c) => c.slug)
    expect(slugs.slice(0, 3)).toEqual(['users', 'media', 'projects'])
    // Anything after the app's own collections is Payload's internal bookkeeping.
    expect(slugs.slice(3).every((slug) => slug.startsWith('payload-'))).toBe(true)
    expect(config.admin.user).toBe('users')
    expect(config.collections.find((c) => c.slug === 'users')?.auth).toBeTruthy()
  })

  it('reads the secret and generates types and the import map next to the config', () => {
    expect(config.secret).toBe('test-secret')
    expect(config.typescript.outputFile).toBe(path.resolve(import.meta.dirname, 'payload-types.ts'))
    expect(config.admin.importMap.baseDir).toBe(path.resolve(import.meta.dirname))
  })

  it('keeps media public, stored in S3 only, with the blur placeholder field', () => {
    const media = config.collections.find((c) => c.slug === 'media')
    expect(media?.upload.disableLocalStorage).toBe(true)
    expect(media?.fields.map((f) => ('name' in f ? f.name : f.type))).toEqual(
      expect.arrayContaining(['alt', 'blurDataURL']),
    )
  })

  it('sorts projects by order and nests the case study groups', () => {
    const projects = config.collections.find((c) => c.slug === 'projects')
    expect(projects?.defaultSort).toBe('order')
    expect(projects?.admin.useAsTitle).toBe('title')
    const names = projects?.fields.map((f) => ('name' in f ? f.name : f.type))
    expect(names).toEqual(
      expect.arrayContaining(['title', 'slug', 'description', 'tech', 'features', 'order', 'image', 'url', 'caseStudy']),
    )
  })

  it('wires the Mongo adapter, the lexical editor and sharp', () => {
    expect(config.db).toBeDefined()
    expect(config.editor).toBeDefined()
    expect(typeof config.sharp).toBe('function')
  })
})
