import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pageSection } from './page-dirs.ts';

/**
 * Why: VERIFIED: the fs half of page-dirs.ts - what is on disk under a pages root
 * (src/documentation/pages/) or a rendered docs root (dist/documentation/),
 * so a gate can compare it with what page-dirs.ts says, and every script
 * reads a page through `pageFile` instead of joining the flat path.
 */

export interface PageDir {
  /** the page id - its file stem (`badge`) */
  slug: string;
  /** the folder it sits in ('' at the root) */
  folder: string;
  /** the absolute file */
  file: string;
}

/** Every `.mdx` (or `.html` under a rendered root) at the root or one folder down, sorted by slug. */
export function pageDirs(root: string, ext = '.mdx'): PageDir[] {
  const out: PageDir[] = [];
  if (!existsSync(root)) return out;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(ext)) out.push({ slug: entry.name.slice(0, -ext.length), folder: '', file: join(root, entry.name) });
    if (!entry.isDirectory()) continue;
    for (const f of readdirSync(join(root, entry.name), { withFileTypes: true }))
      if (f.isFile() && f.name.endsWith(ext)) out.push({ slug: f.name.slice(0, -ext.length), folder: entry.name, file: join(root, entry.name, f.name) });
  }
  out.sort((a, b) => a.slug.localeCompare(b.slug));
  return out;
}

/**
 * The file of a page where the layout says it belongs: `pageFile(pages, 'badge')`
 * → pages/data-display/badge.mdx (`.html` under a rendered root). A slug no
 * section lists maps under `.no-section/` - a path that does not exist, so
 * `existsSync(pageFile(…))` answers "is there such a page".
 */
export function pageFile(root: string, slug: string, ext = '.mdx'): string {
  const section = pageSection(slug);
  return section === null ? join(root, '.no-section', `${slug}${ext}`) : join(root, section, `${slug}${ext}`);
}
