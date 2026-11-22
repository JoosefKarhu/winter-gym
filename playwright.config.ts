import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:5199',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    hasTouch: true,
    serviceWorkers: 'block',
  },
  webServer: [
    {
      command: 'npx vite --port 5199 --strictPort',
      url: 'http://localhost:5199',
      reuseExistingServer: true,
    },
    {
      // Production build with the real service worker, for the PWA spec.
      command: 'npx vite build && npx vite preview --port 5198 --strictPort',
      url: 'http://localhost:5198',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
})
