#!/usr/bin/env bun
/**
 * Changelog data surgery for deploy.sh (the two-commit rule):
 *
 *   bun scripts/changelog-entry.ts add <version> <date> <msg1> <msg2> …
 *     → prepends { version: "vX.Y.Z", date, commits: [...] } to
 *       src/documentation/data/changelog.json
 *
 *   bun scripts/changelog-entry.ts stamp-hash <version> <shorthash>
 *     → sets the entry's hash field (second commit of the rule)
 *
 * Entries are rendered by src/documentation/lib/components/changelog-entries.tsx
 * (HTML-escaped except the gate-allowlisted inline tags — same rule the old
 * HTML entries followed).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const FILE = join(ROOT, 'src/documentation/data/changelog.json');

interface Entry {
  version: string;
  date: string;
  hash?: string;
  commits: string[];
}

function load(): Entry[] {
  return (JSON.parse(readFileSync(FILE, 'utf8')) as { entries: Entry[] }).entries;
}

function save(entries: Entry[]): void {
  writeFileSync(FILE, JSON.stringify({ entries }, null, 2) + '\n');
}

/** Commit messages are text — escape markup chars so they render as prose
 * (ChangelogEntries injects them raw; the gate allows only inline tags). */
const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const [cmd, version, ...rest] = process.argv.slice(2);

if (cmd === 'add') {
  const date = rest[0];
  const commits = rest.slice(1).filter(Boolean);
  if (!version || !date) {
    console.error('usage: changelog-entry.ts add <version> <date> <msg…>');
    process.exit(1);
  }
  const entries = load();
  if (entries.some((e) => e.version === `v${version}`)) {
    console.error(`changelog already has a v${version} entry`);
    process.exit(1);
  }
  save([{ version: `v${version}`, date, commits: (commits.length ? commits : ['Maintenance release']).map(esc) }, ...entries]);
  console.log(`changelog.json: added v${version} (${commits.length} commit messages)`);
} else if (cmd === 'stamp-hash') {
  const hash = rest[0];
  if (!version || !hash) {
    console.error('usage: changelog-entry.ts stamp-hash <version> <hash>');
    process.exit(1);
  }
  const entries = load();
  const entry = entries.find((e) => e.version === `v${version}`);
  if (!entry) {
    console.error(`changelog has no v${version} entry to stamp`);
    process.exit(1);
  }
  entry.hash = hash;
  save(entries);
  console.log(`changelog.json: stamped v${version} with hash ${hash}`);
} else {
  console.error('usage: changelog-entry.ts add|stamp-hash …');
  process.exit(1);
}
