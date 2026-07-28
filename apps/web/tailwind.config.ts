import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        forgex: {
          50: '#f0f7ff',
          100: '#e0efef',
          200: '#b8dfe0',
          300: '#7cc7c8',
          400: '#4aa8aa',
          500: '#2e8c8e',
          600: '#237072',
          700: '#1f5b5d',
          800: '#1d4b4d',
          900: '#1b4041',
        },
      },
    },
  },
  plugins: [],
}

export default config
