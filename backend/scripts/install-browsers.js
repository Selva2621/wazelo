// Installs Playwright's headless Chromium inside node_modules (PLAYWRIGHT_BROWSERS_PATH=0), so the
// browser ships with the app on hosts that only keep the project folder after build (e.g. Render).
// Runtime reads the same location — see src/modules/lead-scraper/domain/scrapers/playwright-env.ts.
const { execFileSync } = require('child_process');
const path = require('path');

const cli = path.join(path.dirname(require.resolve('playwright/package.json')), 'cli.js');

execFileSync(process.execPath, [cli, 'install', 'chromium', '--only-shell'], {
  stdio: 'inherit',
  env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || '0' },
});
