import type { InquiryEnv } from "../lib/inquiry/handle";
import type { Ports } from "./ports";

/** The Worker's env as the app reads it: wrangler's generated Env plus the secrets (env.d.ts). */
export type SiteEnv = Cloudflare.Env & InquiryEnv;

/** Variables: the ports, set once per request by the composition root's middleware (src/app.tsx). */
export type AppEnv = { Bindings: SiteEnv; Variables: Ports };
