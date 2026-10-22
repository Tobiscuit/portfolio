import type { InquiryEnv } from "../lib/inquiry/handle";

/** The Worker's env as the app reads it: wrangler's generated Env plus the secrets (env.d.ts). */
export type SiteEnv = Cloudflare.Env & InquiryEnv;

export type AppEnv = { Bindings: SiteEnv };
