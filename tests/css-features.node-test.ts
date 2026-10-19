/**
 * Every modern CSS feature is gated on support, has a fallback outside the
 * gate, and reduced motion is honoured. Reads the stylesheets as text and
 * checks which at-rules enclose each declaration.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { enclosingAtRules, inPrelude, indexesOf, read, stripComments } from './helpers'

const files = ['app/styles/tokens.css', 'app/styles/base.css', 'app/styles/primitives.css', 'app/styles/enhancements.css']
const sheets: Record<string, string> = {}
files.forEach((f) => {
  sheets[f] = stripComments(read(f))
})

function assertGated(needle: string, gatePrefix: string) {
  let seen = 0
  for (const file of files) {
    const css = sheets[file]
    for (const i of indexesOf(css, needle)) {
      if (inPrelude(css, i)) continue // the @supports condition itself
      seen++
      const gates = enclosingAtRules(css, i)
      const ok = gates.some((g) => g.indexOf(gatePrefix) === 0)
      assert.ok(ok, file + ': "' + needle + '" at ' + i + ' must be inside ' + gatePrefix + ' (found: ' + (gates.join(' > ') || 'none') + ')')
    }
  }
  assert.ok(seen > 0, '"' + needle + '" is used somewhere (otherwise this test proves nothing)')
}

test('scroll-driven animations are wrapped in @supports (animation-timeline', () => {
  assertGated('animation-timeline:', '@supports (animation-timeline')
})

test('field-sizing is wrapped in @supports (field-sizing', () => {
  assertGated('field-sizing:', '@supports (field-sizing')
})

test('anchor positioning is wrapped in @supports (anchor-name', () => {
  for (const prop of ['anchor-name:', 'position-anchor:', 'position-area:', 'position-try-fallbacks:']) {
    assertGated(prop, '@supports (anchor-name')
  }
})

test('light-dark() is wrapped in @supports (color: light-dark', () => {
  assertGated('light-dark(', '@supports (color: light-dark')
})

test('color-mix() is wrapped in @supports (color: color-mix', () => {
  assertGated('color-mix(', '@supports (color: color-mix')
})

test('subgrid is wrapped in @supports (grid-template-rows: subgrid', () => {
  assertGated('subgrid;', '@supports (grid-template-rows: subgrid')
})

test('@starting-style and discrete transitions are wrapped in @supports (transition-behavior', () => {
  assertGated('@starting-style', '@supports (transition-behavior: allow-discrete')
  assertGated(' allow-discrete,', '@supports (transition-behavior: allow-discrete')
})

test('backdrop-filter and :has() are wrapped in @supports', () => {
  assertGated('backdrop-filter:', '@supports (backdrop-filter')
  assertGated(':has(.card__link', '@supports selector(:has(*))')
})

test('each gated feature has a fallback declared outside the gate', () => {
  const tokens = sheets['app/styles/tokens.css']
  const primitives = sheets['app/styles/primitives.css']
  const enh = sheets['app/styles/enhancements.css']
  assert.ok(tokens.indexOf('@supports not (color: light-dark(#000, #fff))') > -1, 'static per-scheme colours')
  assert.ok(/--accent-hover: #FFCB49;/.test(tokens), 'static accent-hover before color-mix()')
  assert.ok(/\.nav-popover \{[^}]*position: fixed;[^}]*inset: calc\(var\(--header-h\)/.test(primitives), 'menu pinned without anchors')
  assert.ok(/\.tooltip \{\s*display: none;/.test(primitives), 'tooltip hidden without anchors')
  assert.ok(/\.reading-progress \{ display: none; \}/.test(enh), 'progress bar hidden without scroll timelines')
  assert.ok(/\.field__textarea \{ min-block-size: 9rem;/.test(primitives), 'textarea has a min height without field-sizing')
  assert.ok(primitives.indexOf('var(--scrim, rgb(13 27 42 / 0.8))') > -1, 'dialog backdrop literal fallback')
  assert.ok(/\.card \{[^}]*grid-template-rows: auto auto 1fr auto;/.test(primitives), 'cards align footers without subgrid')
  assert.ok(/\.site-header \{[^}]*background: var\(--surface\);/.test(primitives), 'opaque header without backdrop-filter')
})

test('reduced motion: durations collapse, animations stop, view transitions do not animate', () => {
  const tokens = sheets['app/styles/tokens.css']
  const rm = tokens.lastIndexOf('@media (prefers-reduced-motion: reduce)')
  assert.ok(rm > -1)
  const block = tokens.slice(rm)
  for (const d of ['--duration-1: 0ms', '--duration-2: 0ms', '--duration-3: 0ms', '--duration-4: 0ms']) {
    assert.ok(block.indexOf(d) > -1, d)
  }

  const base = sheets['app/styles/base.css']
  const blanket = ['animation-duration: 0.001ms !important', 'animation-iteration-count: 1 !important', 'transition-duration: 0.001ms !important']
  for (const rule of blanket) {
    const at = indexesOf(base, rule)
    assert.equal(at.length, 1, rule)
    assert.ok(enclosingAtRules(base, at[0]).some((g) => g === '@media (prefers-reduced-motion: reduce)'), rule + ' is gated')
  }
  assert.ok(/html \{ scroll-behavior: auto; \}/.test(base), 'smooth scrolling off')

  const enh = sheets['app/styles/enhancements.css']
  const vt = enh.indexOf('::view-transition-new(*) { animation: none !important; }')
  assert.ok(vt > -1, 'view-transition pseudo-elements get animation: none')
  assert.ok(enclosingAtRules(enh, vt).some((g) => g === '@media (prefers-reduced-motion: reduce)'))

  const reveals = indexesOf(enh, '.reveal {')
  assert.ok(reveals.length > 0)
  for (const i of reveals) {
    assert.ok(enclosingAtRules(enh, i).some((g) => g === '@media (prefers-reduced-motion: no-preference)'), 'entrances only with motion allowed')
  }
})

test('JS-driven view transitions check reduced motion and API support first', () => {
  const src = read('app/components/ui/TransitionLink.tsx')
  assert.ok(src.indexOf("typeof document.startViewTransition !== 'function'") > -1)
  assert.ok(src.indexOf("matchMedia('(prefers-reduced-motion: reduce)').matches") > -1)
  assert.ok(src.indexOf('.pathname === window.location.pathname) return') > -1, 'same-path navigations skip the transition')
})

test('no raw hex colours outside tokens.css', () => {
  for (const file of files) {
    if (file === 'app/styles/tokens.css') continue
    assert.ok(!/#[0-9a-fA-F]{6}\b/.test(sheets[file]), file + ' should use tokens, not hex literals')
  }
  assert.ok(!/#[0-9a-fA-F]{6}\b/.test(stripComments(read('app/globals.css'))))
})
