import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'packages/web/test',
  testMatch: '*.spec.ts',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'npm run build -w packages/game && USE_PGLITE=1 npm run dev -w packages/web',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: { USE_PGLITE: '1' },
  },
});
