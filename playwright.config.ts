import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

const chromeExecutable = [
  process.env.PLAYWRIGHT_CHROME_PATH,
  process.env.PLAYWRIGHT_CHROMIUM_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  '/usr/local/bin/chromium',
].find((candidate): candidate is string => Boolean(candidate) && existsSync(candidate));

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4275',
    browserName: 'chromium',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    launchOptions: chromeExecutable ? { executablePath: chromeExecutable } : undefined,
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4275',
    port: 4275,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
