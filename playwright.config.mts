import { defineConfig, devices } from '@playwright/test';
import { e2eEnv } from './server/scripts/e2e-env.js';

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/test-results',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm run db:setup:e2e -w server && npm run start:e2e -w server',
      url: 'http://localhost:3100/api/health/database',
      env: e2eEnv,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'npm run dev -w client -- --host localhost --port 5174',
      url: 'http://localhost:5174',
      env: { E2E_API_PROXY_TARGET: 'http://localhost:3100' },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
