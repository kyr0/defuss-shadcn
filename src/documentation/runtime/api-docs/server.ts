/**
 * The API Documentation scaffold's example as a real defuss-rpc server: `bun src/documentation/runtime/api-docs/server.ts`
 * (PORT, default 63920). tests/e2e/site/scaffold-api-docs.e2e.ts starts it and calls it from the page's Try it form.
 *
 * VERIFIED: (scaffold-api-docs.e2e calls it cross-origin) why CORS here - the documentation page and the server have different origins, and a browser sends a cross-origin
 * call with `Content-Type: application/json` only after a preflight. defuss-rpc's ExpressRpcServer allows any origin
 * by default; this one wraps rpcRoute in Bun.serve, so it answers the preflight itself.
 */
import { createRpcServer, rpcRoute } from 'defuss-rpc/server.js';
import api from './api.ts';
import docs from './rpc.docs.json' with { type: 'json' };

// VERIFIED: (scaffold-api-docs.e2e reads /rpc/schema) defuss-rpc 3.0.0 merges the documentation into /rpc/schema, so
// a client of this server reads the same descriptions and parameter schemas the reference shows
createRpcServer(api, { docs });

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const server = Bun.serve({
  port: Number(process.env.PORT ?? 63920),
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const response = await rpcRoute({ request });
    const headers = new Headers(response.headers);
    for (const [k, v] of Object.entries(CORS)) headers.set(k, v);
    return new Response(response.body, { status: response.status, headers });
  },
});
console.log(`${new Date().toISOString()} INFO rpc server listening url=http://localhost:${server.port}`);
process.on('SIGTERM', () => {
  server.stop();
  process.exit(0);
});
