import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/playwright',
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:8081',
    viewport: { width: 390, height: 844 }, // phone-sized
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npx expo start --web',
    url: 'http://localhost:8081',
    reuseExistingServer: true,
    timeout: 180000,
  },
});