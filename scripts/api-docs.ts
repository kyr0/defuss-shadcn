#!/usr/bin/env bun
/**
 * Why: every JS component's skill carries a `## API` section below
 * `## States` - the State API every element gets, the registry, the
 * component's own df$.shadcn namespace, an instance interface, the events -
 * generated from the source (src/documentation/lib/component-api.ts) so it can never
 * describe a method that is not there or miss one that is. The descriptions
 * are the JSDoc in the .ts. verify's `API docs` gate fails when a section
 * lags; run `bun run api-docs` to rewrite them.
 *
 *   bun scripts/api-docs.ts           write every skill's ## API section
 *   bun scripts/api-docs.ts --check   list the stale ones (exit 1)
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { apiMarkdown, apiSectionOf, readComponentApi, withApiSection } from '../src/documentation/lib/component-api.ts';

const ROOT = join(import.meta.dirname, '..');
const COMPONENTS = join(ROOT, 'src', 'components');
const check = process.argv.includes('--check');
const stale: string[] = [];

for (const name of readdirSync(COMPONENTS).sort()) {
  const ts = join(COMPONENTS, name, `${name}.ts`);
  const md = join(COMPONENTS, name, 'component-skill.md');
  if (!existsSync(ts) || !existsSync(md)) continue;
  const section = apiMarkdown(readComponentApi(name, readFileSync(ts, 'utf8')));
  const skill = readFileSync(md, 'utf8');
  if (apiSectionOf(skill) === section) continue;
  stale.push(name);
  if (!check) writeFileSync(md, withApiSection(skill, section));
}

if (check) {
  if (stale.length) {
    console.log(`stale ## API sections: ${stale.join(', ')}`);
    process.exit(1);
  }
  console.log('every ## API section is current');
} else {
  console.log(stale.length ? `## API written: ${stale.join(', ')}` : 'every ## API section is current');
}
