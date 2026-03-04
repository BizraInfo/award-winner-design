import { defineConfig, devices } from '@playwright/test';

// Use a dedicated port for Playwright to avoid clashing with other local services (e.g., Grafana)
const E2E_PORT = Number(process.env.E2E_PORT || 3100);
const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;
const E2E_COMMAND = `npm run build && node scripts/serve-standalone.js`;

/**
 * Playwright configuration for BIZRA E2E tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  // Run tests in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI for stability
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-results.json' }],
    process.env.CI ? ['github'] : ['list'],
  ],
  
  // Shared settings for all tests
  use: {
    // Base URL for navigation
    baseURL: E2E_BASE_URL,
    
    // Collect trace when retrying failed test
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on first retry
    video: 'on-first-retry',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Firefox for cross-browser testing
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    // WebKit/Safari
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
    
    // Mobile viewport
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // Run local dev server before tests
  webServer: {
    command: E2E_COMMAND,
    env: {
      ...process.env,
      PORT: String(E2E_PORT),
      E2E_PORT: String(E2E_PORT),
      HOSTNAME: 'localhost',
    },
    url: E2E_BASE_URL,
    // Always start fresh server to avoid port conflicts with other services (e.g., Grafana on 3000)
    reuseExistingServer: false,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
