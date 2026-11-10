/**
 * The fs half of the docs search's documents (scripts/lib/search-docs.ts is the pure one): every page the sidebar
 * lists, in sidebar order, read from the rendered site. The build (scripts/search-index.ts) and verify's
 * `search index ↔ docs` gate both call it, so the index and its check see one list.
 * Why the rendered pages and not the MDX: the TOC ids, the example labels and the header's lead exist only after the
 * SSG build - the old search index once deep-linked ids the build never kept (lib/plugins.ts says so too).
 * VERIFIED: (2026-11-10, verify's `search index ↔ docs`) the documents verify reads in its own parse of the pages
 * equal the ones the build indexed from these files.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseHTML } from 'linkedom';
import { flattenNav, listed, NAV } from '../../src/documentation/lib/nav.ts';
import { pageRel } from '../../src/documentation/lib/page-dirs.ts';
import { readSkillMeta } from '../../src/documentation/lib/repo.ts';
import { pageSearchDocs, SEARCH_DOCS_VERSION, type SearchDoc, type SearchPage } from './search-docs.ts';

/** the pages the docs search covers: every listed sidebar page, in sidebar order */
export function searchPages(): SearchPage[] {
  const pages: SearchPage[] = [];
  for (const section of NAV)
    for (const item of flattenNav(listed(section.items))) {
      const slug = item.href.replace(/\.html$/, '');
      const type = item.type ?? readSkillMeta(slug)?.type;
      pages.push({ rel: pageRel(slug), title: item.label, group: section.heading, ...(type ? { type } : {}) });
    }
  return pages;
}

/**
 * The documents of every listed page, parsed from the rendered site.
 * @param docsDir - the rendered documentation (dist/documentation)
 * @returns the documents, pages in sidebar order, each followed by its sections
 */
export function collectSearchDocs(docsDir: string): SearchDoc[] {
  const docs: SearchDoc[] = [];
  for (const page of searchPages()) {
    const file = join(docsDir, page.rel);
    if (!existsSync(file)) throw new Error(`search index: ${page.rel} is not rendered - build the docs first`);
    const { document } = parseHTML(readFileSync(file, 'utf8'));
    docs.push(...pageSearchDocs(document as unknown as Document, page));
  }
  return docs;
}

/**
 * The fingerprint of a document list under one model: the build writes it into the index's manifest, verify
 * recomputes it from the rendered pages - a docs change without a rebuilt index differs.
 * @param docs - the documents, in index order
 * @param model - the ColBERT model's fingerprint (id@revision:graph hash)
 * @returns a SHA-256 hex digest
 */
export function searchFingerprint(docs: SearchDoc[], model: string): string {
  return createHash('sha256')
    .update(JSON.stringify({ v: SEARCH_DOCS_VERSION, model, docs }))
    .digest('hex');
}
