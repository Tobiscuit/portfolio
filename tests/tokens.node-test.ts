/**
 * design-system.json v2 and tokens.css describe the same system: the fixed
 * palette is unchanged and every documented text/background pair meets its
 * WCAG 2.2 minimum.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { contrast, read } from './helpers'

type Swatch = { hex: string }
type Pair = { foreground: string; background: string; minimum: number; use: string }
type DesignSystem = {
  version: string
  colors: { [group: string]: { [name: string]: Swatch } }
  accessibility: { contrastPairs: Pair[]; avoid: Pair[] }
}

const ds = JSON.parse(read('design-system.json')) as DesignSystem
const tokens = read('app/styles/tokens.css').toUpperCase()

const palette: { [name: string]: string } = {}
for (const group of ['primary', 'neutral', 'functional']) {
  Object.keys(ds.colors[group]).forEach((name) => {
    palette[name] = ds.colors[group][name].hex
  })
}
const resolve = (ref: string) => (ref.charAt(0) === '#' ? ref : palette[ref])

test('design-system.json is v2 and keeps the fixed palette', () => {
  assert.equal(ds.version, '2.0')
  assert.deepEqual(Object.keys(palette).sort(), [
    'arcane-gold-500',
    'error-500',
    'ink-500',
    'ink-700',
    'ink-900',
    'parchment-100',
    'parchment-200',
    'parchment-300',
    'sage-blue-900',
    'success-500',
    'warning-500',
  ])
  const original: { [name: string]: string } = {
    'sage-blue-900': '#0D1B2A',
    'ink-900': '#1B263B',
    'ink-700': '#415A77',
    'ink-500': '#778DA9',
    'parchment-300': '#E0E1DD',
    'parchment-200': '#F0F2F5',
    'parchment-100': '#FFFFFF',
    'arcane-gold-500': '#FFC300',
    'success-500': '#2ECC71',
    'warning-500': '#F39C12',
    'error-500': '#E74C3C',
  }
  Object.keys(original).forEach((name) => assert.equal(palette[name], original[name], name))
})

test('every palette hex is defined in tokens.css under its own name', () => {
  Object.keys(palette).forEach((name) => {
    const decl = '--' + name.toUpperCase() + ': ' + palette[name].toUpperCase()
    assert.ok(tokens.indexOf(decl) > -1, decl)
  })
})

test('documented contrast pairs meet their minimums', () => {
  assert.ok(ds.accessibility.contrastPairs.length >= 15)
  for (const pair of ds.accessibility.contrastPairs) {
    const fg = resolve(pair.foreground)
    const bg = resolve(pair.background)
    assert.ok(fg && bg, 'unknown colour in ' + JSON.stringify(pair))
    const ratio = contrast(fg, bg)
    assert.ok(ratio >= pair.minimum, pair.foreground + ' on ' + pair.background + ' (' + pair.use + '): ' + ratio + ':1 < ' + pair.minimum + ':1')
  }
})

test('the documented "avoid" pairs really fail, so the list stays honest', () => {
  assert.ok(ds.accessibility.avoid.length >= 3)
  for (const pair of ds.accessibility.avoid) {
    const ratio = contrast(resolve(pair.foreground), resolve(pair.background))
    assert.ok(ratio < pair.minimum, pair.foreground + ' on ' + pair.background + ' is ' + ratio + ':1; remove it from "avoid"')
  }
})

test('derived colours used as static fallbacks are present in tokens.css', () => {
  for (const hex of ['#0E592E', '#6C4303', '#8F2C21', '#F37F6E', '#FFCB49', '#152234', '#E6EAEA']) {
    assert.ok(tokens.indexOf(hex) > -1, hex + ' present as a static fallback')
  }
})
