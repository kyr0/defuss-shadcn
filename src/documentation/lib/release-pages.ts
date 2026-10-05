import type { Plugin, ViteDevServer } from 'vite';
import type { SsgPlugin } from 'defuss-ssg';

/**
 * Why: defuss-ssg renders every page through ONE Vite dev server
 * (ssrLoadModule), and Vite keeps each evaluated page module - the compiled
 * MDX, its source map, its exports - for the whole run. With 360+ pages (the
 * scaffolds alone are 100-200 KB of markup each) the heap grew past 4 GB in
 * 17 s and needed a 14 GB allowance - enough to push a 24 GB machine into
 * swap and freeze it. Two things held every page: defuss/server renders each
 * page into a NEW happy-dom Window that is never closed (happy-dom keeps open
 * windows alive - the whole page DOM stays reachable), and Vite's runner
 * cache. After a page is written nothing needs either: these plugins close
 * the page's window and forget its *.mdx module, so memory stays flat and
 * build-docs runs under a small, fail-fast heap cap. Shared components
 * (lib/components/*.tsx) stay cached.
 *
 * The SSG reads config.ts more than once, so the server is handed over
 * through a registry symbol, not module state.
 */
const SERVER = Symbol.for('defuss-shadcn.docs.vite-server');
const WINDOW = Symbol.for('defuss-shadcn.docs.page-window');
type PageWindow = { happyDOM?: { close(): Promise<void> } };
type Registry = { [SERVER]?: ViteDevServer; [WINDOW]?: PageWindow };

/** Vite plugin: remembers the page-rendering dev server. */
export const captureViteServer: Plugin = {
  name: 'defuss-shadcn-capture-vite-server',
  configureServer(server) {
    (globalThis as Registry)[SERVER] = server;
  },
};

type RunnerNode = { file: string };
type Runner = {
  evaluatedModules: {
    idToModuleMap: Map<string, RunnerNode>;
    urlToIdModuleMap: Map<string, RunnerNode>;
    fileToModulesMap: Map<string, Set<RunnerNode>>;
    invalidateModule(node: RunnerNode): void;
  };
};

/** Forget every evaluated page module (*.mdx); returns how many. */
export function releasePageModules(): number {
  const server = (globalThis as Registry)[SERVER];
  const runner = (server as unknown as { _ssrCompatModuleRunner?: Runner } | undefined)?._ssrCompatModuleRunner;
  const graph = server?.environments?.ssr?.moduleGraph;
  if (!runner || !graph) return 0;
  const cache = runner.evaluatedModules;
  let released = 0;
  for (const [id, node] of cache.idToModuleMap) {
    if (!/\.mdx(?:$|\?)/.test(id)) continue;
    cache.invalidateModule(node);
    cache.idToModuleMap.delete(id);
    for (const [url, n] of cache.urlToIdModuleMap) if (n === node) cache.urlToIdModuleMap.delete(url);
    cache.fileToModulesMap.get(node.file)?.delete(node);
    const mod = graph.getModuleById(id);
    if (mod) graph.invalidateModule(mod);
    released++;
  }
  return released;
}

/** SSG plugin (last page-dom step): remember the page's happy-dom window. */
export const capturePageWindowPlugin: SsgPlugin = {
  name: 'capture-page-window',
  mode: 'build',
  phase: 'page-dom',
  fn: (el: unknown) => {
    (globalThis as Registry)[WINDOW] = (el as { ownerDocument?: { defaultView?: PageWindow } }).ownerDocument?.defaultView;
    return el;
  },
};

let pages = 0;
/** SSG plugin (last page-html step): close the page's window and release its module - the HTML is final.
 *  DOCS_MEM_LOG=1 prints the heap every 25 pages. */
export const releasePagesPlugin: SsgPlugin = {
  name: 'release-page-modules',
  mode: 'build',
  phase: 'page-html',
  fn: async (html: string) => {
    const win = (globalThis as Registry)[WINDOW];
    (globalThis as Registry)[WINDOW] = undefined;
    await win?.happyDOM?.close();
    const released = releasePageModules();
    if (process.env.DOCS_MEM_LOG && ++pages % 25 === 0) {
      (globalThis as { gc?: () => void }).gc?.();
      const s = (globalThis as Registry)[SERVER] as unknown as { _ssrCompatModuleRunner?: Runner; environments: { ssr: { moduleGraph: { idToModuleMap: Map<string, unknown> } } } } | undefined;
      console.log(`build-docs: ${pages} pages · heap ${(process.memoryUsage().heapUsed / 1024 ** 2).toFixed(0)} MB · released ${released} · runner ${s?._ssrCompatModuleRunner?.evaluatedModules.idToModuleMap.size} · graph ${s?.environments.ssr.moduleGraph.idToModuleMap.size}`);
    }
    return html;
  },
};
