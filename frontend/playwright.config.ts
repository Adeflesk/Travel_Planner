import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Travel Planner E2E tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Keep false due to shared database state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0, // Reduced from 2 to 1
  workers: 1, // Keep 1 due to shared database state
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'html',
  timeout: 30000, // 30 second test timeout
  expect: {
    timeout: 10000, // 10 second expect timeout
  },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure', // Only keep trace for failures
    screenshot: 'only-on-failure',
    video: 'off', // Disable video recording
    actionTimeout: 15000, // 15 second action timeout
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run local dev server before starting the tests */
  webServer: [
    {
      command: process.env.CI
        ? 'sh -c "cd .. && RATE_LIMIT_ENABLED=false ./.venv312/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"'
        : 'sh -c "cd .. && RATE_LIMIT_ENABLED=false ./.venv312/bin/python -m uvicorn app.main:app --reload --port 8000"',
      url: 'http://localhost:8000/health',
      reuseExistingServer: false,
      timeout: 60000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: false,
      timeout: 60000,
    },
  ],
});
