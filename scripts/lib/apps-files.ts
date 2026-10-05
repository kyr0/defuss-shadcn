import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { appResolver, type AppComponentSource } from './apps.ts';
import { appName, exampleFence, STANDALONE_APPS } from './docs-ssg.ts';

/**
 * Why: the file-system half of the per-app build (./apps.ts is the pure
 * resolver): the component sources and each scaffold's example fence, read
 * from src/ - bundle.ts builds dist/apps/ from it, stats-files.ts measures
 * it, verify compares the full-screen pages against it. One answer for all.
 */

const ROOT = join(import.meta.dirname, '..', '..');
const SRC_COMPONENTS = join(ROOT, 'src', 'components');
const PAGES = join(ROOT, 'src', 'documentation', 'pages');

const read = (file: string): string => (existsSync(file) ? readFileSync(file, 'utf8') : '');

/** Every component's stylesheet + script source, alphabetical. */
export function componentSources(): AppComponentSource[] {
  return readdirSync(SRC_COMPONENTS, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
    .map((name) => ({ name, css: read(join(SRC_COMPONENTS, name, `${name}.css`)), ts: read(join(SRC_COMPONENTS, name, `${name}.ts`)) }));
}

export type AppPlan = { slug: string; name: string; components: string[] };

/** Each standalone scaffold with the components its markup needs. */
export function appPlans(): AppPlan[] {
  const resolve = appResolver(componentSources());
  return STANDALONE_APPS.map((slug) => {
    const fence = exampleFence(read(join(PAGES, `${slug}.mdx`)));
    if (fence === null) throw new Error(`apps: pages/${slug}.mdx has no \`\`\`html example fence`);
    return { slug, name: appName(slug), components: resolve(fence) };
  });
}
