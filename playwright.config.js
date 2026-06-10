const { defineConfig } = require('@playwright/test');
const path = require('path');

const INDEX_HTML = path.resolve(__dirname, 'index.html');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  use: {
    locale: 'zh-CN',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'pure-frontend',
      testMatch: '**/pure-frontend.spec.js',
      use: {
        baseURL: `file://${INDEX_HTML}`,
      },
    },
    {
      name: 'quiz-app',
      testMatch: '**/quiz-app.spec.js',
      use: { baseURL: 'http://localhost:3000' },
      webServer: {
        command: 'node server.js',
        port: 3000,
        cwd: './quiz-app',
        reuseExistingServer: true,
      },
    },
  ],
});
