import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { apiPlugin } from './vite-api-plugin'

export default defineConfig(({ mode }) => {
  // Charge TOUTES les variables d'environnement (pas seulement VITE_*)
  // afin que le plugin API ait accès à MISTRAL_API_KEY, ANTHROPIC_API_KEY, etc.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      apiPlugin(env),
    ],
    server: {
      port: 5177,
    },
  }
})
