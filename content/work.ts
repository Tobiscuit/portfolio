import type { ProjectCard } from "../lib/projects/port";

/**
 * The work, as static summaries, until engine spec 030 lets him write these
 * on his dashboard (spec 003 R3, tasks W1). Every claim here is in
 * specs/003-juanramirez-codes/plan.md section 6 with its source; every number
 * carries its `source` below. tests/unit/claims.test.ts holds the content
 * rules (only montanobtm.com is live, no "production", clients anonymised).
 */
export const WORK: ProjectCard[] = [
  {
    slug: "proprietor-systems",
    title: "Proprietor Systems",
    summary:
      "A multi-tenant platform for local trade businesses on Cloudflare Workers: an SEO and blog engine, the owner's dashboard, inquiries, a catalog with a photo visualizer, and a customer chat. Client sites use it through a small npm kit. It runs montanobtm.com, live since September 2026.",
    status: "in-progress",
    kind: "product",
    role: "Designed and built it",
    stack: ["TypeScript", "Cloudflare Workers", "D1", "R2", "Durable Objects", "Workflows", "Queues", "Agents SDK"],
    highlights: [
      "The engine and its AI agents have no public address. Client sites and the dashboard reach them only over Workers service bindings, so there is nothing to scan and no door to guard.",
      "Five locks between a person and a business's data: sign-in re-verified in the Worker, the business taken from the session's memberships, one agent per business, an agent that refuses any other business, and a test that fails the build if a query forgets the business. All five trust the first, and the docs say so.",
      "Model output is constrained by a JSON Schema into blocks; the platform renders and escapes every piece of text, so no model-written markup is served.",
      "Each feature starts as a spec with its decisions written down, then tests, then code.",
    ],
    facts: [
      { value: "28", label: "specs", source: "git -C ~/seo-engine ls-tree -d origin/main specs/ (9ca1df4, 2026-10-19)" },
      { value: "35", label: "database migrations", source: "git -C ~/seo-engine ls-tree origin/main migrations/ | grep .sql (9ca1df4)" },
      { value: "188", label: "test files", source: "git -C ~/seo-engine ls-tree -r origin/main | grep .test.ts (9ca1df4)" },
    ],
    links: [{ label: "montanobtm.com, a client site running on it", href: "https://montanobtm.com/", kind: "live" }],
    featured: true,
    path: null,
  },
  {
    slug: "proprietor-mail",
    title: "proprietor-mail",
    summary:
      "The platform's inbox: one mailbox per business, with mail the platform's operator cannot read at rest. Each arriving message is sealed to the mailbox's public key; only the owner's own devices hold the private key. Public and Apache-2.0 licensed, so the claim can be checked.",
    status: "built",
    kind: "open-source",
    role: "Designed and built it",
    stack: ["TypeScript", "Cloudflare Workers", "Durable Objects", "R2", "Email Routing", "Amazon SES", "HPKE", "WebAuthn PRF"],
    highlights: [
      "The key is generated in the owner's browser and stored on the server only wrapped: once per passkey, under a key derived from the passkey's PRF output, and once under a recovery key shown to the owner a single time.",
      "The README states the two limits no web-based encrypted mail escapes: mail travels the internet as plaintext, and the code that decrypts it in the browser comes from the operator.",
      "Byte formats and RPC contracts are written down with test vectors.",
    ],
    facts: [{ value: "Apache-2.0", label: "licence", source: "gh api repos/Tobiscuit/proprietor-mail (license apache-2.0), 2026-10-22" }],
    links: [{ label: "Source on GitHub", href: "https://github.com/Tobiscuit/proprietor-mail", kind: "repo" }],
    featured: true,
    path: null,
  },
  {
    slug: "platform",
    title: "My own platform",
    summary:
      "One Hetzner server running k3s, reconciled from git by Argo CD: secrets from Vault through External Secrets, certificates from cert-manager, nightly restic backups to R2, and DNS for seven Cloudflare zones in Terraform. My own apps, and the tools I study with, run here.",
    status: "in-progress",
    kind: "platform",
    role: "Built and operate it",
    stack: ["Kubernetes (k3s)", "Argo CD", "Vault", "External Secrets", "cert-manager", "Traefik", "Terraform", "restic"],
    highlights: [
      "Every change is a commit. A change made by hand is reverted by Argo CD, and that is the point.",
      "A security practice range, attacker tooling and deliberately vulnerable targets, sits behind network policy: the targets can never reach the rest of the platform.",
      "Client-facing systems never depend on this server at runtime; it is the workbench, not the storefront.",
    ],
    facts: [
      { value: "37", label: "Argo CD applications", source: "ls ~/platform-gitops/apps | wc -l (be16e70, 2026-10-05)" },
      { value: "7", label: "DNS zones in Terraform", source: "gh repo view Tobiscuit/cloudflare-infra (description), 2026-10-22" },
    ],
    links: [],
    featured: true,
    path: null,
  },
  {
    slug: "fluency",
    title: "Fluency",
    summary:
      "A learning app built on spaced repetition (FSRS): decks generated and illustrated for a topic, reviewed in one queue. Next.js 16, Better Auth, Postgres and Stripe. GitHub Actions builds the image on a version tag and Argo CD rolls it out on my platform.",
    status: "in-progress",
    kind: "product",
    role: "Designed and built it",
    stack: ["TypeScript", "Next.js 16", "React 19", "Better Auth", "PostgreSQL", "ts-fsrs", "Stripe"],
    highlights: [
      "Folding an older app into it one slice at a time, so there is always one review queue.",
      "The service worker caches static files only, never pages or API answers, because every page belongs to one signed-in person.",
    ],
    facts: [],
    links: [],
    featured: false,
    path: null,
  },
  {
    slug: "pulse",
    title: "Pulse",
    summary:
      "Tools for the computer repair shop where I work. Pulse Diagnostics starts a customer's check-in from a USB stick: the machine describes itself, plays a sound and a video, tests the internet, and sends the scan to the front desk. Pulse Agent is one Rust binary that lets an AI model propose diagnostics to a technician.",
    status: "built",
    kind: "tooling",
    role: "Built it on shift, for the people I work with",
    stack: ["Rust", "Tauri 2", "MCP", "WMI"],
    highlights: [
      "Pulse Agent's tool server is its safety limit: what can happen to a customer's computer is exactly the list of functions it exposes, and every call waits for a technician's keypress.",
      "The agent's terminal interface has to work at 80 by 16 characters; a cut-off approval prompt once reached a real job, so rendering is now tested at those sizes.",
    ],
    facts: [{ value: "0.3.0", label: "Pulse Agent version", source: "~/Projects/pulse-agent/Cargo.toml, tag v0.3.0" }],
    links: [],
    featured: false,
    path: null,
  },
  {
    slug: "montanobtm",
    title: "montanobtm.com",
    summary:
      "montanobtm.com, a Houston bath and tile contractor's site, has been live on Proprietor since September 2026. Its quote form feeds the engine's inquiries; its blog (in English, Spanish and Vietnamese), gallery and work pages come from the engine.",
    status: "live",
    kind: "client",
    role: "Built and run it",
    stack: ["vinext", "Cloudflare Workers", "@jrcodex/seo-kit"],
    highlights: [],
    facts: [],
    links: [{ label: "montanobtm.com", href: "https://montanobtm.com/", kind: "live" }],
    featured: false,
    path: null,
  },
  {
    slug: "other-client-sites",
    title: "Other small-business sites",
    summary:
      "Sites for a garage-door company, a granite shop, a masonry contractor and others: built, not launched. Their names are left out until each owner agrees.",
    status: "built",
    kind: "client",
    role: "Built them",
    stack: ["TypeScript", "Next.js", "Astro", "Cloudflare Workers"],
    highlights: [],
    facts: [],
    links: [],
    featured: false,
    path: null,
  },
];
