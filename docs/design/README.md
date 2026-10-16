# SageScale v2: styling jrcodex.dev

This is the working guide for adding or restyling a page. The machine-readable spec is
[`design-system.json`](../../design-system.json); the source of truth is the CSS.

```
app/globals.css             Tailwind + @theme inline (utilities read the tokens)
app/styles/tokens.css       palette, type, space, layout, shape, motion, semantic colours
app/styles/base.css         element defaults, focus, skip link, reduced motion
app/styles/primitives.css   layout + component classes (.shell, .card, .prose …)
app/styles/enhancements.css feature-gated extras (view transitions, scroll-driven, anchors …)
app/components/ui/          the same primitives as React components
tests/                      guards: contact form, landmarks, CSS gating, contrast
```

## 1. Tokens

### Colour

The eleven palette colours in `tokens.css` are fixed. Do not add a colour. Components use
**semantic** tokens, which switch with the scheme (dark is the default; light is
`<html data-theme="light">`, set by the header toggle and persisted):

| Token | Dark | Light | Use |
| --- | --- | --- | --- |
| `--surface` | sage-blue-900 | parchment-200 | page |
| `--surface-raised` | ink-900 | parchment-100 | cards, panels, popovers, dialogs |
| `--surface-muted` | ink-900/sage mix | parchment-300/200 mix | footer, code, hover fills |
| `--text` | parchment-100 | ink-900 | body, headings |
| `--text-muted` | parchment-300 | ink-700 | ledes, secondary text |
| `--text-subtle` | ink-500 | ink-700 | labels and captions on the **page** surface only |
| `--accent` / `--on-accent` | gold / sage-blue | same | primary button fill and label |
| `--accent-text` | gold | ink-900 | gold-as-text; never gold text on light |
| `--link`, `--link-underline` | gold, gold | ink-900, ink-500 | inline links |
| `--focus-ring` | gold | ink-900 | `:focus-visible` outline |
| `--success-text`, `--warning-text`, `--error-text` | palette (error lightened) | darkened in oklch | status text |
| `--line`, `--line-strong` | ink-500 @30%, ink-700 | ink-500 @50%, ink-500 | hairlines, emphasised dividers |
| `--control-bg`, `--control-border` | ink-900, ink-500 | parchment-100, ink-500 | inputs (borders pass 3:1) |

Raised components (`.card`, `.tile`, panels) re-point `--text-subtle` to `--text-muted`,
because ink-500 on ink-900 is 4.45:1, just under AA. If you make a new raised surface, do
the same.

Derived tints use `color-mix(in oklch, …)` behind `@supports`, with the same mix
pre-computed as a hex fallback just above. Every documented pair is checked by
`tests/tokens.test.ts`; add your new pair to `design-system.json` → `accessibility`.

### Type

One fluid modular scale: 16px→18px base, ratio 1.2→1.25, between 320px and 1280px
viewports. Use the **roles**, not the steps:

| Role | Step | Range | Default element |
| --- | --- | --- | --- |
| `--type-display` | 5 | 39.8→54.9px | `h1` |
| `--type-title` | 4 | 33.2→43.9px | big numbers, rare |
| `--type-heading` | 3 | 27.6→35.2px | `h2` |
| `--type-subheading` | 2 | 23.0→28.1px | `h3` |
| `--type-lead` | 1 | 19.2→22.5px | `h4`, `.lede`, card titles |
| `--type-body` | 0 | 16→18px | body |
| `--type-small` | −1 | 13.3→14.4px | meta, chips, labels |
| `--type-micro` | −2 | 11.1→11.5px | uppercase eyebrows in the footer only |

Headings are Source Serif 4 and get `text-wrap: balance`; paragraphs, list items and
captions get `text-wrap: pretty`. Keep running text inside `--measure` (65ch).

### Space, layout, shape, motion

- Space: `--space-3xs … --space-4xl` (4→5px up to 128→160px), the same fluid base ×
  0.25 · 0.5 · 0.75 · 1 · 1.5 · 2 · 3 · 4 · 6 · 8.
- Layout: `--gutter` (16px minimum), `--container` 72rem, `--container-narrow` 48rem,
  `--container-wide` 86rem. Breakpoints 40 / 48 / 64rem (Tailwind's `sm md lg`).
- Shape: `--corner-xs/s/m/l/full` (4, 8, 16, 24px, pill).
- Motion: `--duration-1…4` (120, 200, 320, 520ms) and `--easing-standard|enter|exit`.
  Under `prefers-reduced-motion: reduce` every duration is 0ms and animations stop.

### Tailwind

Utilities map to the same tokens through `@theme inline`, so prefer them for one-offs:

| Want | Utility |
| --- | --- |
| semantic colour | `bg-surface-raised`, `text-text-muted`, `border-line`, `text-accent-text` |
| palette colour | `bg-sage-blue-900`, `text-arcane-gold-500` (rarely; prefer semantic) |
| fluid space | `mt-space-m`, `gap-space-s`, `p-space-l` |
| type step | `text-step-1` |
| radius / shadow | `rounded-card`, `rounded-pill`, `shadow-elev-3` |
| easing | `ease-standard` |

Tailwind's numeric scale (`p-4`, `text-xl`) still works but is off-system: use it only
where the scale has no answer.

## 2. Styling a new page

The layout already renders the skip link, header, `<main id="main">` and footer. A page
renders **one** `h1` and never its own `<main>` (both are tested).

```tsx
import PageShell, { Section } from '@/components/ui/PageShell'
import SectionHeader from '@/components/ui/SectionHeader'

export default function Page() {
  return (
    <Section>
      <PageShell>
        <SectionHeader as="h1" eyebrow="Writing" title="Blog" lede="Notes on what I build." />
        {/* content */}
      </PageShell>
    </Section>
  )
}
```

Further sections are `<Section rule>` + `<PageShell>` + `<SectionHeader>` (h2), with the
section labelled: `<Section aria-labelledby="x">` and `<SectionHeader id="x" …>`.

### Recipes for the Proprietor-fed pages

**`/blog` and `/work` indexes.** `CardGrid` of `Card`s (`titleAs="h2"` on an index page),
`Pagination` under it, `EmptyState` when the list is empty, and a `loading.tsx` that
renders `<CardGridSkeleton />` inside the same shell so nothing shifts.

```tsx
<CardGrid aria-label="Articles">
  {posts.map((p) => (
    <Card key={p.slug} titleAs="h2" title={p.title} href={`/blog/${p.slug}`} description={p.excerpt}
      media={p.image && <SuspenseImage src={p.image} alt="" className="w-full h-full object-cover" sizes="(max-width: 48rem) 100vw, 33vw" />}
      footer={<TagList items={p.tags} max={3} label="Tags" />} />
  ))}
</CardGrid>
<Pagination page={page} totalPages={total} hrefFor={(n) => (n === 1 ? '/blog' : `/blog?page=${n}`)} />
```

`ProjectCard` is the reference implementation. One link per card (the title, stretched over the card). Secondary links go in `footer`,
which sits above the stretched link.

**`/blog/[slug]` articles.** `Prose` is the article grid (tracks: `content` 65ch, `wide`,
`full`). Use it as the page's top element: it has its own gutters. Map each block's
placement with `placementClass()`:

```tsx
<Prose aria-labelledby="post-title">
  <header className="stack">
    <p className="eyebrow">{date}</p>
    <h1 id="post-title">{title}</h1>
  </header>
  {blocks.map((b) =>
    b.kind === 'html' ? (
      <ProseFlow key={b.id} html={b.html} placement={b.placement} />
    ) : (
      <MediaFrame key={b.id} className={placementClass(b.placement)} caption={b.caption}>
        <img src={b.src} alt={b.alt} loading="lazy" />
      </MediaFrame>
    ),
  )}
</Prose>
```

`inset-right` / `inset-left` float on screens ≥48rem, so the paragraphs that wrap around
them must be in the same flow block: put the inset media and the following HTML inside
one `<ProseFlow>`. `ProseFlow html=` renders HTML as is, so only pass the platform's
already-filtered HTML. `.prose-body` styles every element that HTML can contain
(headings, lists, links, code, blockquote, figure, table).

**`/work/[slug]`.** Same shell as the project detail page (`ProjectDetailsView` is the
reference): `article` → header with `h1`, lede and `TagList` → `MediaFrame` hero → a
`.project-layout` grid with the write-up (`.prose-body`) and an aside. Before/after photos:
two `MediaFrame`s with the same `ratio` in a `.split`, captioned "Before" / "After".
Detail photos: a `CardGrid` without `href`, or `MediaFrame`s with `onZoom` and the
existing `ImageModal`.

**`/videos`.** `VideoEmbed` per clip (it is a `MediaFrame` with a lazy iframe; `title`
is required and becomes the player's accessible name), in a `.card-grid` or a `.split`.
Use `ratio="9 / 16"` for vertical clips.

**Profile details in the footer / contact page.** `SiteFooter` renders `children` under
the tagline; pass a `<dl className="fact-list">` there. On the contact page, add details
inside `.contact-channels` using `.contact-channel` links.

## 3. Primitives

| Component (file) | Classes | Use it for |
| --- | --- | --- |
| `PageShell`, `Section` (`ui/PageShell.tsx`) | `.shell`, `.section` | every page's horizontal container and vertical rhythm |
| `SectionHeader` | `.section-header` | page and section titles with eyebrow, lede, actions |
| `Button`, `ButtonLink` | `.btn--primary/secondary/tertiary/icon` | one primary action per view |
| `CardGrid`, `Card` | `.card-grid`, `.card` | lists of projects, posts, work |
| `TagChip`, `TagList` | `.chip`, `.chip-list` | tech stacks, tags, status (`success`/`warning` tones) |
| `MediaFrame` | `.media-frame` | any image/video with a fixed ratio and a caption |
| `VideoEmbed` | `.media-frame` | iframes (YouTube, Twitch, Stream) |
| `Prose`, `ProseFlow` | `.prose`, `.prose-body`, `.placement-*` | articles and filtered HTML |
| `Pagination` | `.pagination` | paged indexes |
| `EmptyState` | `.empty-state` | empty lists, not-found (`as="h1"`) |
| `Skeleton`, `CardGridSkeleton`, `ProseSkeleton` | `.skeleton` | `loading.tsx` |
| `Dialog` | `.dialog` | modals; native `<dialog>` with focus trap and Esc |
| `Tooltip` | `.tooltip` | short hints; never the only label |
| `TransitionLink` | none | internal links that should animate between pages |

## 4. Modern CSS, and what happens without it

| Feature | Gate | Without it |
| --- | --- | --- |
| `light-dark()` | `@supports (color: light-dark(#000, #fff))` | static per-scheme values |
| `color-mix(in oklch)` | `@supports (color: color-mix(in oklch, red 50%, blue))` | pre-computed hexes |
| cross-document view transitions | `@view-transition` (unknown at-rule is dropped) | normal navigation |
| same-document view transitions | `startViewTransition` exists and motion allowed | plain `next/link` |
| `view-transition-name` (card → detail hero) | inline style, ignored if unknown | no morph |
| scroll-driven reveal / progress bar | `@supports (animation-timeline: …)` | content visible; no bar |
| `@starting-style` entrances | `@supports (transition-behavior: allow-discrete)` | instant open/close |
| anchor positioning | `@supports (anchor-name: --a)` | menu pinned under header; tooltip hidden |
| container queries | unknown `@container` is dropped | stacked cards |
| subgrid | `@supports (grid-template-rows: subgrid)` | cards stretch; footers align via `1fr` |
| `:has()` | `@supports selector(:has(*))` | `:focus-within` ring |
| `field-sizing: content` | `@supports (field-sizing: content)` | `rows` + `min-height` |
| `text-wrap: balance / pretty` | ignored if unknown | normal wrapping |
| `backdrop-filter` | `@supports` | opaque header |

`tests/css-features.test.ts` fails if any of these properties appears outside its gate,
so add new ones to `enhancements.css` inside a gate.

## 5. Accessibility checklist

- One `h1`; heading levels never skip; sections labelled by their heading.
- Every interactive element is reachable by keyboard and shows `:focus-visible`.
- Targets are at least 44px (`.btn`, `.btn--icon`, pagination links).
- Text contrast ≥4.5:1, control borders and focus rings ≥3:1. Check new pairs with
  `tests/helpers.ts → contrast()` and record them in `design-system.json`.
- Images: real `alt` for content, `alt=""` when the title next to it already says it.
- Modals are `Dialog`; menus and hints are popovers. Do not hand-roll overlays.
- Motion: anything that moves on its own goes inside
  `@media (prefers-reduced-motion: no-preference)`.

## 6. Performance budgets

- No layout shift: images and embeds sit in a `MediaFrame`/`aspect-ratio`; skeletons
  reserve the final size; fonts come from `next/font` with size-adjusted fallbacks.
- The LCP image gets `priority`; everything below the fold is lazy.
- No render-blocking third-party CSS or script. The only inline script is the theme
  bootstrap in the layout.

## 7. Do and don't

**Do**

- Use semantic tokens (`--text-muted`, `bg-surface-raised`), not palette names.
- Compose primitives; add a class to `primitives.css` only when a pattern repeats.
- Keep copy factual: client builds that were not launched are "built", never "live" or
  "production". Only montanobtm.com is live on the platform.

**Don't**

- Add colours, fonts or a spacing value outside the scale.
- Use gold as text on light surfaces, or ink-500 text on raised dark surfaces.
- Render `<main>`, a second `h1`, or a link inside a link.
- Put a modern CSS property outside its `@supports` gate.
- Change the contact form's logic. `tests/contact-form.test.ts` compares it with
  `tests/fixtures/contact-form-logic.txt` (copied from main). An intentional change,
  such as adding the Turnstile token, updates that fixture in the same commit.

## 8. Checks

```
npm test            # node:test via tsx: form, landmarks, CSS gating, contrast, theme
npx tsc --noEmit    # tests are type-checked too
npm run build
```
