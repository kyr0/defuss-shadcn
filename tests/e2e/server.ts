import { serve } from 'bun';
import { resolve } from 'node:path';

/**
 * Why: fixtures reference component files by absolute path (/dist/...) exactly
 * like the real site, so E2E tests need an HTTP origin - ES modules are blocked
 * over file://. A static server rooted at the repo root serves both the
 * fixtures (tests/e2e/) and the components (dist/) with zero extra deps.
 */

/** Repo root - server serves everything under it. */
const ROOT = resolve(import.meta.dirname, '../..');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
};

/** Starts the fixture server on a random port; resolves to { url, stop }. */
export function startServer(): { url: string; stop: () => void } {
  const server = serve({
    port: 0,
    async fetch(req) {
      const path = decodeURIComponent(new URL(req.url).pathname);
      // only expose the two trees tests need - nothing else from the repo
      if (!path.startsWith('/tests/e2e/') && !path.startsWith('/dist/')) {
        return new Response('Forbidden', { status: 403 });
      }
      const file = Bun.file(resolve(ROOT, `.${path}`));
      if (!(await file.exists())) return new Response('Not found', { status: 404 });
      return new Response(file, {
        headers: { 'Content-Type': MIME[path.slice(path.lastIndexOf('.'))] ?? 'application/octet-stream' },
      });
    },
  });
  return { url: `http://localhost:${server.port}`, stop: () => server.stop() };
}
