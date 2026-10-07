// shadcn-theme's checker: `node theme-check.mjs <theme.css> [--json]`.
// Bundled with its data into skills/shadcn-theme/scripts/theme-check.mjs by scripts/lib/agent-skills.ts;
// the rules live in scripts/lib/theme-check.ts. Exit 1 when the theme has an error.
// VERIFIED: (agent-skills.e2e: exit 0 on fjord, exit 1 naming every planted mistake)
import { readFileSync } from 'node:fs';
import data from 'skill-data';
import { checkTheme } from '../lib/theme-check.ts';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
if (!file) {
  console.error('usage: node theme-check.mjs <theme.css> [--json]');
  process.exit(2);
}
const findings = checkTheme(readFileSync(file, 'utf8'), data.defaults!);
const errors = findings.filter((f) => f.level === 'error').length;
if (args.includes('--json')) console.log(JSON.stringify({ file, version: data.version, findings }, null, 2));
else {
  for (const f of findings) console.log(`${file}${f.line ? `:${f.line}` : ''} ${f.level} ${f.rule} ${f.message}${f.fix ? `\n  fix: ${f.fix}` : ''}`);
  console.log(`${errors ? 'FAILED' : 'VERIFIED'}[theme-check]=${!errors} BC errors=${errors} warnings=${findings.length - errors} defuss-shadcn=${data.version}`);
}
process.exit(errors ? 1 : 0);
