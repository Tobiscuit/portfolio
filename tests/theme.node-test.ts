import { test } from 'node:test'
import assert from 'node:assert/strict'
import { read } from './helpers'
import { themeBootstrapScript, THEME_STORAGE_KEY } from '../app/components/ui/ThemeToggle'

test('theme bootstrap is tiny, guarded, and only ever sets data-theme', () => {
  assert.ok(themeBootstrapScript.length < 200, 'script is ' + themeBootstrapScript.length + ' bytes')
  assert.ok(themeBootstrapScript.indexOf("localStorage.getItem('" + THEME_STORAGE_KEY + "')") > -1)
  assert.ok(themeBootstrapScript.indexOf("t==='light'||t==='dark'") > -1, 'only known values are applied')
  assert.ok(themeBootstrapScript.indexOf('document.documentElement.dataset.theme=t') > -1)
  assert.ok(themeBootstrapScript.indexOf('try{') === 0 && /catch\(e\)\{\}$/.test(themeBootstrapScript))
  assert.ok(!/document\.write|innerHTML|eval\(/.test(themeBootstrapScript))
})

test('dark is the default scheme and light is an explicit data-theme', () => {
  const tokens = read('app/styles/tokens.css')
  assert.ok(/:root \{[\s\S]*?color-scheme: dark;/.test(tokens))
  assert.ok(/:root\[data-theme="light"\] \{\s*color-scheme: light;/.test(tokens))
  const layout = read('app/(app)/layout.tsx')
  assert.ok(layout.indexOf('themeBootstrapScript }}') > -1, 'layout injects the bootstrap')
  assert.ok(layout.indexOf('themeBootstrapScript }}') < layout.indexOf('<Header '), 'before any content')
})

test('fonts: next/font with size-adjusted fallbacks, no render-blocking stylesheet', () => {
  const globals = read('app/globals.css')
  assert.ok(globals.indexOf('fonts.googleapis.com') === -1, 'no CSS @import of Google Fonts')
  const layout = read('app/(app)/layout.tsx')
  assert.ok(layout.indexOf("from 'next/font/google'") > -1)
  assert.ok(layout.indexOf('adjustFontFallback: false') === -1, 'size-adjusted fallbacks stay on')
})
