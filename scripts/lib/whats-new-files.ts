// -- what's new: the git and file half of lib/whats-new.ts ---------------------------------------
// The last release is the newest `v*` tag HEAD descends from; the pending entry is every listed page whose files
// differ from it now (the working tree, untracked files too). build.ts writes it (`write`), verify compares
// (`problems`), `bun scripts/whats-new.ts` does either by hand.
// VERIFIED: (bun scripts/whats-new.ts --write, 2026-11-09) the first record: "unreleased" - 9 pages created, 40 updated
// since v0.9.13; a page's examples are compared with `git show <tag>:<its path then>`.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { componentDirs } from '../../src/documentation/lib/component-dirs.ts';
import { exampleFences } from './schema.ts';
import { flattenNav, listed, NAV } from '../../src/documentation/lib/nav.ts';
import { pageFile } from '../../src/documentation/lib/page-dirs-files.ts';
import {
  pendingKey,
  releaseEntry,
  releaseProblems,
  whatsNewText,
  withRelease,
  type ExampleSource,
  type WhatsNewData,
  type WhatsNewRelease,
} from './whats-new.ts';

const ROOT = join(import.meta.dirname, '..', '..');
export const WHATS_NEW_FILE = join(ROOT, 'src', 'documentation', 'data', 'whats-new.json');
const WATCHED = ['src/components', 'src/documentation/pages'];

const git = (args: string[]): string => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
const lines = (text: string): string[] => text.split('\n').filter(Boolean);

/** the newest release tag HEAD descends from, null without one */
function lastTag(): string | null {
  try {
    return git(['describe', '--tags', '--abbrev=0', '--match', 'v*']);
  } catch {
    return null;
  }
}
const tagged = (version: string): boolean => {
  try {
    git(['rev-parse', '-q', '--verify', `refs/tags/v${version}`]);
    return true;
  } catch {
    return false;
  }
};

/** the pending release's entry, from git; null outside a repository or before the first tag */
export function pendingRelease(): WhatsNewRelease | null {
  const tag = lastTag();
  if (!tag) return null;
  const version = (JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { version: string }).version;
  const changed = [
    ...lines(git(['diff', '--name-only', tag, '--', ...WATCHED])),
    ...lines(git(['ls-files', '--others', '--exclude-standard', '--', ...WATCHED])),
  ];
  const pagesRoot = join(ROOT, 'src', 'documentation', 'pages');
  const pages = new Map<string, string>();
  for (const item of NAV.flatMap((s) => flattenNav(listed(s.items)))) {
    const id = item.href.replace(/\.html$/, '');
    pages.set(id, relative(ROOT, pageFile(pagesRoot, id)));
  }
  // the pages at the release, by id - a page may have moved folders since
  const pathsBefore = new Map(
    lines(git(['ls-tree', '-r', '--name-only', tag, '--', 'src/documentation/pages']))
      .filter((f) => f.endsWith('.mdx'))
      .map((f) => [basename(f, '.mdx'), f] as const),
  );
  const pagesBefore = new Set(pathsBefore.keys());
  const sources = (mdx: string): ExampleSource[] => exampleFences(mdx).map((e) => ({ label: e.label, body: e.body }));
  const examples = (id: string) => ({
    before: pathsBefore.has(id) ? sources(git(['show', `${tag}:${pathsBefore.get(id)}`])) : [],
    after: existsSync(join(ROOT, pages.get(id)!)) ? sources(readFileSync(join(ROOT, pages.get(id)!), 'utf8')) : [],
  });
  const components = new Map(
    componentDirs(join(ROOT, 'src', 'components')).map((c) => [c.name, relative(ROOT, c.dir) + '/']),
  );
  return releaseEntry(pendingKey(version, tagged(version)), { changed: [...new Set(changed)], pages, pagesBefore, components, examples });
}

export function readWhatsNew(): WhatsNewData {
  if (!existsSync(WHATS_NEW_FILE)) return { version: 1, releases: [] };
  return JSON.parse(readFileSync(WHATS_NEW_FILE, 'utf8')) as WhatsNewData;
}

/** writes the pending entry into the record; true when the file changed */
export function writeWhatsNew(): boolean {
  const entry = pendingRelease();
  if (!entry) return false;
  const text = whatsNewText(withRelease(readWhatsNew(), entry));
  if (existsSync(WHATS_NEW_FILE) && readFileSync(WHATS_NEW_FILE, 'utf8') === text) return false;
  writeFileSync(WHATS_NEW_FILE, text);
  return true;
}

/** what the record gets wrong about the pending release ([] when current, or outside a repository) */
export function whatsNewProblems(): string[] {
  const entry = pendingRelease();
  return entry ? releaseProblems(readWhatsNew(), entry) : [];
}
