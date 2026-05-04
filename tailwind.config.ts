import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: [
    './app/**/*.{vue,ts,tsx,js,jsx}',
    './app/**/*.css',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config
