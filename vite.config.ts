import { defineConfig } from 'vite';

export default defineConfig({
  root: 'dist',
  server: {
    port: 3000,
    open: '/documentation/index.html',
    // the docs examples run in opaque-origin sandboxes: a Geo Map in one fetches its data (dist/components/geo-map/
    // data/) cross-origin, as the published site does from jsDelivr and GitHub Pages - VERIFIED: both send
    // Access-Control-Allow-Origin: * (curl, 2026-11-01)
    cors: true,
  },
  preview: { cors: true },
  plugins: [
    {
      // the server's root is dist/, whose site lives in documentation/: the bare address answered an empty 404, which
      // looked like a server that never started
      name: 'docs-index',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url !== '/' && req.url !== '/documentation' && req.url !== '/documentation/') return next();
          res.statusCode = 302;
          res.setHeader('Location', '/documentation/index.html');
          res.end();
        });
      },
    },
    {
      name: 'md-plain-text',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.endsWith('.md')) {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          }
          next();
        });
      },
    },
  ],
});
