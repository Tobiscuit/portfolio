/**
 * Characterization tests for the framework adapter: env-to-credentials and the
 * Request -> ContactOutcome -> Response plumbing.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { handle } = vi.hoisted(() => ({ handle: vi.fn() }))
vi.mock('./contact', () => ({ createContactHandler: vi.fn(() => handle) }))

import { contactRoute, credentialsFromEnv } from './adapters'
import { createContactHandler } from './contact'

describe('credentialsFromEnv', () => {
  it('fails at startup when either key is missing', () => {
    const error = 'contact: AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY are not set'
    expect(() => credentialsFromEnv({})).toThrow(error)
    expect(() => credentialsFromEnv({ AWS_ACCESS_KEY_ID: 'k' })).toThrow(error)
    expect(() => credentialsFromEnv({ AWS_SECRET_ACCESS_KEY: 's' })).toThrow(error)
  })

  it('reads the keys, the optional session token, and defaults the region', () => {
    expect(credentialsFromEnv({ AWS_ACCESS_KEY_ID: 'k', AWS_SECRET_ACCESS_KEY: 's' })).toEqual({
      accessKeyId: 'k',
      secretAccessKey: 's',
      sessionToken: undefined,
      region: 'us-east-1',
    })
    expect(
      credentialsFromEnv({
        AWS_ACCESS_KEY_ID: 'k',
        AWS_SECRET_ACCESS_KEY: 's',
        AWS_SESSION_TOKEN: 't',
        AWS_REGION: 'us-east-2',
      }),
    ).toEqual({ accessKeyId: 'k', secretAccessKey: 's', sessionToken: 't', region: 'us-east-2' })
  })
})

describe('contactRoute', () => {
  const config = {
    from: 'a@x.dev',
    owner: 'o@x.dev',
    credentials: { accessKeyId: 'k', secretAccessKey: 's' },
  }
  const url = 'http://localhost/api/contact'

  beforeEach(() => {
    handle.mockReset()
    handle.mockResolvedValue({ ok: true })
  })

  it('creates the handler once from the config', () => {
    contactRoute(config)
    expect(createContactHandler).toHaveBeenCalledWith(config)
  })

  it('accepts a JSON body', async () => {
    const POST = contactRoute(config)
    const body = { name: 'A', email: 'a@b.co', message: 'm' }
    const res = await POST(new Request(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }))

    expect(handle).toHaveBeenCalledWith(body)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('accepts a classic form post', async () => {
    const POST = contactRoute(config)
    const res = await POST(
      new Request(url, { method: 'POST', body: new URLSearchParams({ name: 'A', email: 'a@b.co', message: 'm', _gotcha: '' }) }),
    )

    expect(handle).toHaveBeenCalledWith({ name: 'A', email: 'a@b.co', message: 'm', _gotcha: '' })
    expect(res.status).toBe(200)
  })

  it('answers 400 to a body it cannot parse', async () => {
    const POST = contactRoute(config)
    const res = await POST(new Request(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' }))

    expect(handle).not.toHaveBeenCalled()
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ ok: false, error: 'Malformed request.' })
  })

  it('maps a failed outcome onto its status and error', async () => {
    handle.mockResolvedValue({ ok: false, status: 502, error: 'nope' })
    const POST = contactRoute(config)
    const res = await POST(new Request(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }))

    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ ok: false, error: 'nope' })
  })

  it('does not leak the discarded flag to the client', async () => {
    handle.mockResolvedValue({ ok: true, discarded: true })
    const POST = contactRoute(config)
    const res = await POST(new Request(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }))

    expect(await res.json()).toEqual({ ok: true })
  })
})
