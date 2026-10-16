// Next's bundler unwraps `next/image`'s CommonJS default export; plain Node
// ESM hands back the whole exports object instead. Do what the bundler does.
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const mod = require('next/dist/shared/lib/image-external')

export default mod.default
export const getImageProps = mod.getImageProps
