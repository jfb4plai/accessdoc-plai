import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    join(__dirname, "index.html"),
    join(__dirname, "src/**/*.{js,ts,jsx,tsx}"),
  ],
  theme: {
    extend: {
      colors: {
        plai: {
          blue: '#1e40af',
          green: '#15803d',
          orange: '#ea580c',
        }
      }
    },
  },
  plugins: [],
}
