import { copyFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'
import type { Plugin } from 'vite'

function copySpaFallback(): Plugin {
  return {
    name: 'spa-fallback-404',
    apply: 'build',
    closeBundle() {
      copyFileSync('dist/index.html', 'dist/404.html')
    },
  }
}

export default defineConfig(({ command }) => {
  // Sito di progetto: https://raffaelejband-svg.github.io/Grok-Bot/
  const base = command === 'build' ? '/Grok-Bot/' : '/'
  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'],
        manifest: {
          id: base,
          name: 'Armadio Outfit',
          short_name: 'Armadio Outfit',
          description: 'Crea outfit con i vestiti che hai già. Capi e look restano su questo dispositivo.',
          lang: 'it',
          dir: 'ltr',
          start_url: base,
          scope: base,
          display: 'standalone',
          background_color: '#f3eee6',
          theme_color: '#f3eee6',
          icons: [
            {
              src: 'icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icons/icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          navigateFallback: `${base}index.html`,
          globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/(tfhub\.dev|storage\.googleapis\.com)\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'modello-categorie',
                expiration: {
                  maxEntries: 16,
                  maxAgeSeconds: 60 * 60 * 24 * 180,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      }),
      copySpaFallback(),
    ],
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
    },
  }
})
