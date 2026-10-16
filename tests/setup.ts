/**
 * Loaded with `--import` before the tests (after tsx). Test-only module
 * resolution: makes `next/image` resolve the way Next's bundler resolves it.
 * App code is untouched.
 */
import { registerHooks } from 'node:module'

const nextImageShim = new URL('./shims/next-image.mjs', import.meta.url).href

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'next/image') return { url: nextImageShim, shortCircuit: true }
    return nextResolve(specifier, context)
  },
})
