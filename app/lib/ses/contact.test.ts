/**
 * Characterization tests for the contact-form handler: validation, the
 * notification-then-acknowledgement ordering, header-injection hardening and
 * the configuration-set fallback.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { send } = vi.hoisted(() => ({ send: vi.fn() }))
vi.mock('./ses', () => ({ createSes: vi.fn(() => ({ send })) }))

import { createContactHandler, validate, type ContactConfig } from './contact'
import { createSes } from './ses'

const config: ContactConfig = {
  from: 'jrcodex.dev <hello@jrcodex.dev>',
  owner: 'juan@example.com',
  configurationSet: 'send-jrcodex',
  credentials: { accessKeyId: 'AKID', secretAccessKey: 'SHH' },
}

const submission = { name: 'Ada Lovelace', email: 'ada@example.com', message: 'Hello there' }
const ok = { messageId: 'msg' }

describe('validate', () => {
  it('requires name, email and message', () => {
    expect(validate({})).toEqual({ ok: false, error: 'Please enter your name.' })
    expect(validate({ name: 'A' })).toEqual({ ok: false, error: 'Please enter your email address.' })
    expect(validate({ name: 'A', email: 'a@b.co' })).toEqual({ ok: false, error: 'Please enter a message.' })
    expect(validate(submission)).toEqual({ ok: true, ...submission })
  })

  it('enforces the length limits', () => {
    expect(validate({ ...submission, name: 'x'.repeat(101) })).toEqual({ ok: false, error: 'That name is too long.' })
    expect(validate({ ...submission, email: `${'x'.repeat(250)}@b.co` })).toEqual({
      ok: false,
      error: 'That email address does not look right.',
    })
    expect(validate({ ...submission, message: 'x'.repeat(5001) })).toEqual({
      ok: false,
      error: 'Please keep the message under 5000 characters.',
    })
  })

  it('accepts permissively-shaped addresses, lower-cases them, and rejects the obviously broken', () => {
    expect(validate({ ...submission, email: 'Ada@Example.COM' })).toMatchObject({ ok: true, email: 'ada@example.com' })
    for (const bad of ['a@b', 'a b@c.d', 'a@b,c.d', 'ab.c', 'a@@b.c']) {
      expect(validate({ ...submission, email: bad })).toEqual({ ok: false, error: 'That email address does not look right.' })
    }
  })

  it('collapses control characters in name and email but only trims the message', () => {
    expect(validate({ ...submission, name: 'Ada\r\nBcc: evil@x.dev' })).toMatchObject({ ok: true, name: 'Ada Bcc: evil@x.dev' })
    expect(validate({ ...submission, message: '  line one\n\nline two  ' })).toMatchObject({
      ok: true,
      message: 'line one\n\nline two',
    })
    expect(validate({ ...submission, name: 42 })).toEqual({ ok: false, error: 'Please enter your name.' })
  })
})

describe('createContactHandler', () => {
  beforeEach(() => {
    send.mockReset()
    send.mockResolvedValue(ok)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('builds one SES client from the configured credentials', () => {
    createContactHandler(config)
    expect(createSes).toHaveBeenCalledWith(config.credentials)
  })

  it('silently discards honeypot submissions', async () => {
    const handle = createContactHandler(config)
    expect(await handle({ ...submission, _gotcha: 'http://spam' })).toEqual({ ok: true, discarded: true })
    expect(send).not.toHaveBeenCalled()
  })

  it('rejects invalid submissions with a 400 and the validation message', async () => {
    const handle = createContactHandler(config)
    expect(await handle({ name: 'A', email: 'nope', message: 'm' })).toEqual({
      ok: false,
      status: 400,
      error: 'That email address does not look right.',
    })
    expect(send).not.toHaveBeenCalled()
  })

  it('notifies the owner first, then acknowledges the sender', async () => {
    const handle = createContactHandler(config)
    expect(await handle(submission)).toEqual({ ok: true })
    expect(send).toHaveBeenCalledTimes(2)

    const [notification] = send.mock.calls[0]
    expect(notification).toMatchObject({
      from: config.from,
      to: ['juan@example.com'],
      replyTo: ['"Ada Lovelace" <ada@example.com>'],
      subject: 'jrcodex.dev: enquiry from Ada Lovelace',
      configurationSet: 'send-jrcodex',
    })
    expect(notification.text).toBe('From: Ada Lovelace <ada@example.com>\n\nHello there\n')
    expect(notification.html).toBe(
      '<p><strong>Ada Lovelace</strong> &lt;ada@example.com&gt;</p><p style="white-space:pre-wrap">Hello there</p>',
    )

    const [acknowledgement] = send.mock.calls[1]
    expect(acknowledgement).toMatchObject({
      from: config.from,
      to: ['ada@example.com'],
      replyTo: ['juan@example.com'],
      subject: 'Thanks - I got your message',
      configurationSet: 'send-jrcodex',
    })
    expect(acknowledgement.text).toContain('Hi Ada Lovelace,')
    expect(acknowledgement.text).toContain('through jrcodex.dev.')
    expect(acknowledgement.text).toContain('Hello there')
    expect(acknowledgement.text.endsWith('- Juan\n')).toBe(true)
    expect(acknowledgement.html).toContain('<blockquote style="white-space:pre-wrap;border-left:3px solid #2f7d6b;')
    expect(acknowledgement.html).toContain('<p>&ndash; Juan</p>')
  })

  it('uses the configured site name and signature in the acknowledgement', async () => {
    const handle = createContactHandler({ ...config, siteName: 'example.org', signature: 'J.' })
    await handle(submission)
    const [acknowledgement] = send.mock.calls[1]
    expect(acknowledgement.text).toContain('through example.org.')
    expect(acknowledgement.text.endsWith('- J.\n')).toBe(true)
    expect(acknowledgement.html).toContain('<p>&ndash; J.</p>')
  })

  it('quotes the display name in Reply-To and escapes HTML from the visitor', async () => {
    const handle = createContactHandler(config)
    await handle({ name: 'Jo "Jay" O\\Neil <x>', email: 'jo@example.com', message: '<script>alert(1)</script> & co' })

    const [notification] = send.mock.calls[0]
    expect(notification.replyTo).toEqual(['"Jo \\"Jay\\" O\\\\Neil <x>" <jo@example.com>'])
    expect(notification.subject).toBe('jrcodex.dev: enquiry from Jo "Jay" O\\Neil <x>')
    expect(notification.html).toContain('<strong>Jo &quot;Jay&quot; O\\Neil &lt;x&gt;</strong>')
    expect(notification.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; co')
    expect(notification.text).toContain('<script>alert(1)</script> & co')
  })

  it('returns a 502 and never acknowledges when the owner notification fails', async () => {
    send.mockRejectedValue(new Error('AccessDenied'))
    const handle = createContactHandler(config)

    expect(await handle(submission)).toEqual({
      ok: false,
      status: 502,
      error: 'Sorry - the message could not be sent. Please email juan@example.com directly.',
    })
    // One attempt with the configuration set, one without, nothing to the sender.
    expect(send).toHaveBeenCalledTimes(2)
    expect(send.mock.calls.every(([opts]) => opts.to[0] === 'juan@example.com')).toBe(true)
  })

  it('retries without the configuration set when sending with it fails', async () => {
    send.mockRejectedValueOnce(new Error('AccessDenied')).mockResolvedValue(ok)
    const handle = createContactHandler(config)

    expect(await handle(submission)).toEqual({ ok: true })
    expect(send).toHaveBeenCalledTimes(3)
    expect(send.mock.calls[0][0]).toHaveProperty('configurationSet', 'send-jrcodex')
    expect(send.mock.calls[1][0]).not.toHaveProperty('configurationSet')
    expect(send.mock.calls[1][0]).toMatchObject({ to: ['juan@example.com'] })
    expect(send.mock.calls[2][0]).toMatchObject({ to: ['ada@example.com'], configurationSet: 'send-jrcodex' })
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('retrying without it'), expect.any(Error))
  })

  it('does not retry when no configuration set was requested', async () => {
    send.mockRejectedValue(new Error('boom'))
    const handle = createContactHandler({ ...config, configurationSet: undefined })

    expect(await handle(submission)).toMatchObject({ ok: false, status: 502 })
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('still reports success when only the acknowledgement fails', async () => {
    send.mockResolvedValueOnce(ok).mockRejectedValue(new Error('bounce'))
    const handle = createContactHandler(config)

    expect(await handle(submission)).toEqual({ ok: true })
    expect(send).toHaveBeenCalledTimes(3)
    expect(console.error).toHaveBeenCalledWith(
      'contact: acknowledgement failed (enquiry was delivered)',
      expect.any(Error),
    )
  })
})
