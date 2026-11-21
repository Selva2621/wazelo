// Must load before 'playwright': it resolves the browser folder once, at import time.
// '0' = node_modules/playwright-core/.local-browsers, where scripts/install-browsers.js puts it.
// The default (~/.cache/ms-playwright) is dropped after build on Render, so launch fails there.
process.env.PLAYWRIGHT_BROWSERS_PATH ||= '0';
