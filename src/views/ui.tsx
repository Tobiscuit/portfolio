import type { Child, PropsWithChildren } from "hono/jsx";

import type { ProjectStatus } from "../../lib/projects/port";

/**
 * The design system's primitives as server-only hono/jsx components (spec 003
 * R2). The markup and class names are PR #5's (app/components/ui/*.tsx on
 * design/jrcodex-2026); the React-only parts (next/link, client hooks) are
 * gone: every link is a plain anchor, and navigations are documents, which
 * CSS view transitions animate.
 */

type Spacing = "default" | "tight" | "loose";

export function Section({ children, spacing = "default", rule = false, labelledBy, class: extra }: PropsWithChildren<{ spacing?: Spacing; rule?: boolean; labelledBy?: string; class?: string }>) {
  const classes = ["section", spacing !== "default" && `section--${spacing}`, rule && "section--rule", extra].filter(Boolean).join(" ");
  return (
    <section class={classes} aria-labelledby={labelledBy}>
      {children}
    </section>
  );
}

export function Shell({ children, size = "default" }: PropsWithChildren<{ size?: "default" | "narrow" | "wide" }>) {
  return <div class={size === "default" ? "shell" : `shell shell--${size}`}>{children}</div>;
}

export function SectionHeader({ title, as = "h2", eyebrow, lede, id, actions }: { title: Child; as?: "h1" | "h2"; eyebrow?: Child; lede?: Child; id?: string; actions?: Child }) {
  const Heading = as;
  return (
    <div class={actions ? "section-header section-header--split" : "section-header"}>
      <div>
        {eyebrow ? <p class="eyebrow">{eyebrow}</p> : null}
        <Heading id={id} class="section-header__title">
          {title}
        </Heading>
        {lede ? <p class="section-header__lede">{lede}</p> : null}
      </div>
      {actions ? <div class="section-header__actions">{actions}</div> : null}
    </div>
  );
}

export function ChipList({ items, label, tone }: { items: readonly string[]; label: string; tone?: "accent" | "outline" }) {
  if (items.length === 0) return null;
  return (
    <ul class="chip-list" aria-label={label}>
      {items.map((item) => (
        <li class={tone ? `chip chip--${tone}` : "chip"}>{item}</li>
      ))}
    </ul>
  );
}

const STATUS: Record<ProjectStatus, { text: string; tone: string }> = {
  live: { text: "Live", tone: "chip--success" },
  built: { text: "Built", tone: "chip--outline" },
  "in-progress": { text: "In progress", tone: "chip--warning" },
  archived: { text: "Archived", tone: "chip--outline" },
};

/** The tone always follows the status; the words may be the owner's (spec 030's model labels). */
export function StatusChip({ status, label }: { status: ProjectStatus; label?: string }) {
  const { text, tone } = STATUS[status];
  return <span class={`chip ${tone}`}>{label ?? text}</span>;
}

export function EmptyState({ title, as = "h2", children }: PropsWithChildren<{ title: string; as?: "h1" | "h2" }>) {
  const Heading = as;
  return (
    <div class="empty-state">
      <Heading class="empty-state__title">{title}</Heading>
      <div class="empty-state__text">{children}</div>
    </div>
  );
}

export function ButtonLink({ href, children, variant = "primary", external = false }: PropsWithChildren<{ href: string; variant?: "primary" | "secondary" | "tertiary"; external?: boolean }>) {
  return (
    <a class={`btn btn--${variant}`} href={href} rel={external ? "noopener" : undefined}>
      {children}
    </a>
  );
}

/** Lucide-style outline icons, inline so no icon font or sprite is fetched. */
export const Icon = {
  sun: () => (
    <svg class="theme-toggle__icon theme-toggle__icon--sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  ),
  moon: () => (
    <svg class="theme-toggle__icon theme-toggle__icon--moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  ),
  menu: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  monogram: () => (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <text x="16" y="21.5" text-anchor="middle" font-family="Georgia, serif" font-size="15" font-weight="700" fill="var(--on-accent)">
        JR
      </text>
    </svg>
  ),
};
