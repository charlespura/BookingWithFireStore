import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/connected',
  workers: 1,
  timeout: 60000,
  use: { baseURL: 'http://127.0.0.1:5174', headless: true, channel: 'chrome' },
  webServer: {
    command: 'npm run dev -- --port 5174',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: false,
    env: {
      VITE_FIREBASE_API_KEY: 'demo-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'demo-victorina.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'demo-victorina',
      VITE_FIREBASE_APP_ID: 'demo-app',
      VITE_USE_EMULATORS: 'true',
    },
  },
  reporter: 'list',
});
