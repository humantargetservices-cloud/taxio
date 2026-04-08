import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { taxioApiPlugin } from './taxio-vite-api-plugin.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_API_PROXY_TARGET?.trim()

  return {
    plugins: [tailwindcss(), ...(proxyTarget ? [] : [taxioApiPlugin()])],
    server: proxyTarget
      ? {
          proxy: {
            '/api': {
              target: proxyTarget.replace(/\/$/, ''),
              changeOrigin: true,
            },
          },
        }
      : {},
  }
})
