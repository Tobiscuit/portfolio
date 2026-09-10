import { NextResponse } from 'next/server'
import { contactRoute } from '@/lib/ses/adapters'

/**
 * Contact form -> SES.
 *
 * Environment variable names are unchanged from the previous implementation so
 * that nothing has to be reconfigured in Vercel:
 *
 *   SES_AWS_ACCESS_KEY_ID / SES_AWS_SECRET_ACCESS_KEY
 *   SES_SENDER_EMAIL      - must sit inside a verified SES identity
 *   SES_RECIPIENT_EMAIL   - where enquiries land
 *   AWS_REGION            - optional; see below
 *   SES_CONFIGURATION_SET - optional, defaults to send-jrcodex
 *
 * The region default is us-east-1, NOT us-east-2. The verified identity, the
 * send-jrcodex configuration set and the production-access request all live in
 * us-east-1. The old default pointed at us-east-2, where the same domain
 * happens to be verified but no configuration set exists - so if AWS_REGION
 * were ever unset, mail would keep sending with no suppression and no
 * reputation tracking, and nothing would look broken.
 */

const region = process.env.AWS_REGION ?? 'us-east-1'
const sender = process.env.SES_SENDER_EMAIL
const recipient = process.env.SES_RECIPIENT_EMAIL
const accessKeyId = process.env.SES_AWS_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID
const secretAccessKey =
  process.env.SES_AWS_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY

const configured = Boolean(sender && recipient && accessKeyId && secretAccessKey)

// Built only when the configuration is complete. Constructing it unconditionally
// would send to an empty recipient and surface as an opaque 502.
const handler = configured
  ? contactRoute({
      from: sender!,
      owner: recipient!,
      configurationSet: process.env.SES_CONFIGURATION_SET ?? 'send-jrcodex',
      siteName: 'jrcodex.dev',
      signature: 'Juan',
      credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey!, region },
    })
  : null

export async function POST(request: Request) {
  if (!handler) {
    console.error('contact: SES environment variables missing')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }
  return handler(request)
}
