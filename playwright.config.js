const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests',
    timeout: 15000,
    use: {
        baseURL: 'http://localhost:3000',
        headless: true,
    },
    webServer: {
        command: 'node server.js',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 10000,
    },
    projects: [
        { name: 'chromium', use: { browserName: 'chromium' } },
    ],
});
