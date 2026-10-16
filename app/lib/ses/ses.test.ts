/**
 * Characterization tests for the dependency-free SES v2 client. The signature
 * is recomputed here with node:crypto, independently of the WebCrypto code
 * under test, so the test is a real check of the SigV4 derivation.
 */
import { createHash, createHmac } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSes } from './ses'

const creds = { accessKeyId: 'AKID', secretAccessKey: 'SHH' }
const FROZEN = new Date('2026-09-10T15:04:05.678Z')
const AMZ_DATE = '20260910T150405Z'
const DATE = '20260910'

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

function sigV4(secret: string, region: string, signedHeaders: string, canonicalHeaders: string, body: string) {
  const canonicalRequest = ['POST', '/v2/email/outbound-emails', '', canonicalHeaders, signedHeaders, sha256(body)].join('\n')
  const scope = `${DATE}/${region}/ses/aws4_request`
  const stringToSign = ['AWS4-HMAC-SHA256', AMZ_DATE, scope, sha256(canonicalRequest)].join('\n')
  let key: Buffer = createHmac('sha256', `AWS4${secret}`).update(DATE).digest()
  for (const part of [region, 'ses', 'aws4_request']) key = createHmac('sha256', key).update(part).digest()
  return createHmac('sha256', key).update(stringToSign).digest('hex')
}

const fetchMock = vi.fn()

function lastRequest() {
  const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1] as [string, RequestInit]
  const headers = init.headers as Record<string, string>
  return { url, init, headers, body: JSON.parse(init.body as string) }
}

const okResponse = () => new Response(JSON.stringify({ MessageId: 'msg-1' }), { status: 200 })

describe('createSes().send', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(FROZEN)
    fetchMock.mockReset()
    fetchMock.mockResolvedValue(okResponse())
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('POSTs a SigV4-signed request to SES v2 in us-east-1 by default', async () => {
    const result = await createSes(creds).send({
      from: 'Juan <hello@jrcodex.dev>',
      to: ['someone@example.com'],
      subject: 'Hi',
      text: 'Hello',
    })

    expect(result).toEqual({ messageId: 'msg-1' })
    const { url, init, headers, body } = lastRequest()
    expect(url).toBe('https://email.us-east-1.amazonaws.com/v2/email/outbound-emails')
    expect(init.method).toBe('POST')
    expect(headers['content-type']).toBe('application/json')
    expect(headers.host).toBe('email.us-east-1.amazonaws.com')
    expect(headers['x-amz-date']).toBe(AMZ_DATE)
    expect(headers['x-amz-content-sha256']).toBe(sha256(init.body as string))
    expect(headers).not.toHaveProperty('x-amz-security-token')

    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date'
    const canonicalHeaders =
      `content-type:application/json\nhost:email.us-east-1.amazonaws.com\n` +
      `x-amz-content-sha256:${headers['x-amz-content-sha256']}\nx-amz-date:${AMZ_DATE}\n`
    const signature = sigV4(creds.secretAccessKey, 'us-east-1', signedHeaders, canonicalHeaders, init.body as string)
    expect(headers.Authorization).toBe(
      `AWS4-HMAC-SHA256 Credential=${creds.accessKeyId}/${DATE}/us-east-1/ses/aws4_request, ` +
        `SignedHeaders=${signedHeaders}, Signature=${signature}`,
    )

    expect(body).toEqual({
      FromEmailAddress: 'Juan <hello@jrcodex.dev>',
      Destination: { ToAddresses: ['someone@example.com'] },
      Content: {
        Simple: {
          Subject: { Data: 'Hi', Charset: 'UTF-8' },
          Body: { Text: { Data: 'Hello', Charset: 'UTF-8' } },
        },
      },
    })
  })

  it('includes cc, bcc, reply-to, html and the configuration set only when given', async () => {
    await createSes(creds).send({
      from: 'a@x.dev',
      to: ['b@x.dev'],
      cc: ['c@x.dev'],
      bcc: ['d@x.dev'],
      replyTo: ['r@x.dev'],
      subject: 'S',
      text: 'T',
      html: '<p>T</p>',
      configurationSet: 'send-x',
    })

    expect(lastRequest().body).toEqual({
      FromEmailAddress: 'a@x.dev',
      Destination: { ToAddresses: ['b@x.dev'], CcAddresses: ['c@x.dev'], BccAddresses: ['d@x.dev'] },
      ReplyToAddresses: ['r@x.dev'],
      ConfigurationSetName: 'send-x',
      Content: {
        Simple: {
          Subject: { Data: 'S', Charset: 'UTF-8' },
          Body: { Text: { Data: 'T', Charset: 'UTF-8' }, Html: { Data: '<p>T</p>', Charset: 'UTF-8' } },
        },
      },
    })
  })

  it('adds both one-click unsubscribe headers for marketing mail and refuses a non-https URL', async () => {
    const ses = createSes(creds)
    await ses.send({ from: 'a@x.dev', to: ['b@x.dev'], subject: 'S', text: 'T', unsubscribeUrl: 'https://x.dev/u' })
    expect(lastRequest().body.Content.Simple.Headers).toEqual([
      { Name: 'List-Unsubscribe', Value: '<https://x.dev/u>' },
      { Name: 'List-Unsubscribe-Post', Value: 'List-Unsubscribe=One-Click' },
    ])

    fetchMock.mockClear()
    await expect(
      ses.send({ from: 'a@x.dev', to: ['b@x.dev'], subject: 'S', text: 'T', unsubscribeUrl: 'http://x.dev/u' }),
    ).rejects.toThrow('ses: unsubscribeUrl must be https')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('signs the session token and uses the configured region', async () => {
    await createSes({ ...creds, sessionToken: 'tok', region: 'eu-west-1' }).send({
      from: 'a@x.dev',
      to: ['b@x.dev'],
      subject: 'S',
      text: 'T',
    })

    const { url, init, headers } = lastRequest()
    expect(url).toBe('https://email.eu-west-1.amazonaws.com/v2/email/outbound-emails')
    expect(headers['x-amz-security-token']).toBe('tok')
    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date;x-amz-security-token'
    const canonicalHeaders =
      `content-type:application/json\nhost:email.eu-west-1.amazonaws.com\n` +
      `x-amz-content-sha256:${headers['x-amz-content-sha256']}\nx-amz-date:${AMZ_DATE}\nx-amz-security-token:tok\n`
    const signature = sigV4(creds.secretAccessKey, 'eu-west-1', signedHeaders, canonicalHeaders, init.body as string)
    expect(headers.Authorization).toContain(`/${DATE}/eu-west-1/ses/aws4_request, SignedHeaders=${signedHeaders}, Signature=${signature}`)
  })

  it('requires at least one recipient', async () => {
    await expect(createSes(creds).send({ from: 'a@x.dev', to: [], subject: 'S', text: 'T' })).rejects.toThrow(
      'ses: at least one recipient is required',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('surfaces the SES error message, or the raw body when it is not JSON', async () => {
    const ses = createSes(creds)
    const send = () => ses.send({ from: 'a@x.dev', to: ['b@x.dev'], subject: 'S', text: 'T' })

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Email address is not verified.' }), { status: 400 }))
    await expect(send()).rejects.toThrow('ses: 400 Email address is not verified.')

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ Message: 'Throttled' }), { status: 429 }))
    await expect(send()).rejects.toThrow('ses: 429 Throttled')

    fetchMock.mockResolvedValueOnce(new Response('Service Unavailable', { status: 503 }))
    await expect(send()).rejects.toThrow('ses: 503 Service Unavailable')
  })
})
