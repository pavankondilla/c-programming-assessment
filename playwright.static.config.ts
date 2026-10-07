import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/static', workers: 1, timeout: 120000,
  use: { baseURL: 'http://127.0.0.1:4173/c-exam/', channel: process.env.PW_CHANNEL ?? 'msedge', headless: true, viewport: { width: 1440, height: 1000 }, trace: 'retain-on-failure' },
  webServer: { command: `${process.platform === 'win32' ? 'npm.cmd' : 'npm'} run preview -- --port 4173 --base /c-exam/`, url: 'http://127.0.0.1:4173/c-exam/', reuseExistingServer: true, timeout: 30000 },
});
