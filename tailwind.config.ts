import type { Config } from 'tailwindcss'
import aspectRatio from '@tailwindcss/aspect-ratio'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'sage-blue': {
          900: '#0D1B2A',
        },
        'ink': {
          900: '#1B263B',
          700: '#415A77',
          500: '#778DA9',
        },
        'parchment': {
          300: '#E0E1DD',
          200: '#F0F2F5',
          100: '#FFFFFF',
        },
        'arcane-gold': {
          500: '#FFC300',
        },
        'success': {
          500: '#2ECC71',
        },
        'warning': {
          500: '#F39C12',
        },
        'error': {
          500: '#E74C3C',
        },
      },
      fontFamily: {
        'serif': ['Source Serif Pro', 'serif'],
        'sans': ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [
    aspectRatio,
  ],
}
export default config