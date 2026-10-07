// shadcn-review's checker: `node markup-check.mjs <file|dir>... [--json]`.
// Bundled with the release vocabulary into skills/shadcn-review/scripts/markup-check.mjs by
// scripts/lib/agent-skills.ts; the rules live in scripts/lib/markup-check.ts. Exit 1 on an error.
// VERIFIED: (agent-skills.e2e: all 10 planted mistakes named, exit 1; a clean page exits 0)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import data from 'skill-data';
import { checkMarkup } from '../lib/markup-check.ts';

const EXT = /\.(html?|css|m?[jt]sx?|vue|svelte|astro|mdx)$/i;
// dependencies, VCS state, minified output and a vendored copy of defuss-shadcn are not the project's code
const SKIP_DIR = /^(node_modules|\.git|defuss-shadcn)$/;

function collect(path: string, out: string[]): void {
  if (statSync(path).isDirectory()) {
    for (const name of readdirSync(path)) if (!SKIP_DIR.test(name)) collect(join(path, name), out);
  } else if (EXT.test(path) && !/\.min\./.test(path)) out.push(path);
}

const args = process.argv.slice(2);
const targets = args.filter((a) => !a.startsWith('--'));
if (!targets.length) {
  console.error('usage: node markup-check.mjs <file|dir>... [--json]');
  process.exit(2);
}
const paths: string[] = [];
for (const t of targets) collect(t, paths);
const findings = checkMarkup(paths.map((path) => ({ path, text: readFileSync(path, 'utf8') })), data.vocab!);
const errors = findings.filter((f) => f.level === 'error').length;
if (args.includes('--json')) console.log(JSON.stringify({ files: paths.length, version: data.version, findings }, null, 2));
else {
  for (const f of findings) console.log(`${f.path}:${f.line} ${f.level} ${f.rule} ${f.message}\n  fix: ${f.fix}`);
  console.log(`${errors ? 'FAILED' : 'VERIFIED'}[markup-check]=${!errors} BC files=${paths.length} errors=${errors} warnings=${findings.length - errors} defuss-shadcn=${data.version}`);
}
process.exit(errors ? 1 : 0);
