import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'favicon.svg'],
      manifest: {
        name: 'Training Tracker',
        short_name: 'Training',
        description: 'Log workouts, rest between sets, and track progress.',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest,woff2}'],
        // The pixel theme's CJK glyphs are 400-600 KB per language, so only readers who show them
        // download their file, and the service worker keeps it for offline use from then on.
        globIgnores: ['**/dotgothic16-japanese-*', '**/fusion-pixel-*'],
        runtimeCaching: [
          {
            urlPattern: /(dotgothic16-japanese|fusion-pixel)-[^/]*\.woff2$/,
            handler: 'CacheFirst',
            options: { cacheName: 'pixel-cjk-fonts' },
          },
        ],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    environment: 'node',
  },
});
