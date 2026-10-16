import { defineConfig } from '@playwright/test';
export default defineConfig({
    testDir: './tests', testMatch: '**/browser.spec.mjs', workers: 1,
    use: { channel: 'chrome', baseURL: 'http://127.0.0.1:8786', headless: true },
    webServer: { command: 'python3 -m http.server 8786 --bind 127.0.0.1', url: 'http://127.0.0.1:8786', reuseExistingServer: false },
});
