import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { AppRouterContext, type AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { PathnameContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime'

// Written for the repo's tsconfig (target es5, lib es6): no Object.entries,
// matchAll or Array#includes, so `tsc --noEmit` checks these files too.

export const root = join(import.meta.dirname, '..')

export function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

const router: AppRouterInstance = {
  back() {},
  forward() {},
  refresh() {},
  push() {},
  replace() {},
  prefetch() {},
}

/** Server-render a component the way the App Router would, at a given pathname. */
export function render(element: ReactElement, pathname = '/'): string {
  return renderToStaticMarkup(
    createElement(
      AppRouterContext.Provider,
      { value: router },
      createElement(PathnameContext.Provider, { value: pathname }, element),
    ),
  )
}

/** Attribute maps for every opening tag of the given name in an HTML string. */
export function tags(html: string, tagName: string): Record<string, string>[] {
  const tagRe = new RegExp('<' + tagName + '\\b([^>]*)>', 'g')
  const out: Record<string, string>[] = []
  let m: RegExpExecArray | null
  while ((m = tagRe.exec(html)) !== null) {
    const attrs: Record<string, string> = {}
    const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:="([^"]*)")?/g
    let a: RegExpExecArray | null
    while ((a = attrRe.exec(m[1])) !== null) attrs[a[1].toLowerCase()] = a[2] === undefined ? '' : a[2]
    out.push(attrs)
  }
  return out
}

/** Occurrences of a literal substring. */
export function count(html: string, needle: string): number {
  return html.split(needle).length - 1
}

/** Deepest nesting of an element in serialized HTML (e.g. 2 means an <a> inside an <a>). */
export function maxNesting(html: string, tagName: string): number {
  const re = new RegExp('<(/?)' + tagName + '\\b[^>]*>', 'g')
  let depth = 0
  let max = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    depth += m[1] ? -1 : 1
    if (depth > max) max = depth
  }
  return max
}

export function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

/**
 * The at-rule preludes enclosing a character index, outermost first.
 * Good enough for our own stylesheets (no braces inside strings).
 */
export function enclosingAtRules(css: string, index: number): string[] {
  const stack: string[] = []
  let buffer = ''
  for (let i = 0; i < index; i++) {
    const c = css.charAt(i)
    if (c === '{') {
      stack.push(buffer.trim())
      buffer = ''
    } else if (c === '}') {
      stack.pop()
      buffer = ''
    } else if (c === ';') {
      buffer = ''
    } else {
      buffer += c
    }
  }
  return stack.filter((prelude) => prelude.indexOf('@') === 0)
}

/** True when index sits inside an at-rule prelude, e.g. the condition of `@supports (x: y) {`. */
export function inPrelude(css: string, index: number): boolean {
  let i = index
  while (i > 0) {
    const c = css.charAt(i - 1)
    if (c === '{' || c === '}' || c === ';') break
    i--
  }
  return css.slice(i, index).trim().charAt(0) === '@'
}

/** Every index at which `needle` occurs in `haystack`. */
export function indexesOf(haystack: string, needle: string): number[] {
  const out: number[] = []
  let i = haystack.indexOf(needle)
  while (i !== -1) {
    out.push(i)
    i = haystack.indexOf(needle, i + needle.length)
  }
  return out
}

/** WCAG 2.x contrast ratio for two #rrggbb colours, rounded to 2 places. */
export function contrast(hexA: string, hexB: string): number {
  const lum = (hex: string) => {
    const channels = hex
      .replace('#', '')
      .match(/../g)!
      .map((x) => parseInt(x, 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
  }
  const values = [lum(hexA), lum(hexB)].sort((x, y) => y - x)
  return Math.round(((values[0] + 0.05) / (values[1] + 0.05)) * 100) / 100
}
