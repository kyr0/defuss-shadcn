import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

/**
 * Why: GitHub's runners are a fraction of this machine's speed, and these tests load full doc pages.
 * VERIFIED: (actions run 37476334763) the second CI run timed out twice in 564 tests - a sandbox
 * round-trip and a 10 s page test - both green on this machine. The timeouts are hang
 * guards, not assertions about speed (speed has its own checks, e.g. the forced-recalc e2e), so on CI they
 * scale: testTimeout here, every waitFor through __TIMEOUT_SCALE__ (tests/helpers.ts).
 */
const TIMEOUT_SCALE = process.env.CI ? 3 : 1;

/**
 * Why: a separate config (Vitest prefers vitest.config.* over vite.config.*)
 * so `vitest` does not inherit the doc-server `root: 'dist'`. Here root = repo
 * root, so the Vite server can serve both `tests/` and the real documentation
 * pages under `dist/documentation/` to the browser.
 */
export default defineConfig({
  define: { __TIMEOUT_SCALE__: String(TIMEOUT_SCALE) },
  test: {
    include: ['tests/**/*.test.ts'],
    browser: {
      enabled: true,
      headless: true,
      // full desktop width so the doc-site sidebar is visible (not collapsed)
      viewport: { width: 1280, height: 900 },
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
    testTimeout: 10000 * TIMEOUT_SCALE, // 10 seconds; 30 on CI
  },
});
