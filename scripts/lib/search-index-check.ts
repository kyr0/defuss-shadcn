/**
 * verify's `search index ↔ docs` gate, the pure half: whether dist/documentation/search/ is the index of the docs as
 * they render now. verify (the fs half) reads the rendered pages' documents (scripts/lib/search-docs.ts), computes
 * their fingerprint, decodes the two Brotli files and hands everything here.
 * Why a gate: the index is built from the rendered pages, so a page edited after the docs build - or a model or
 * vendor pin moved by a package update - would leave the palette searching yesterday's docs, or loading files that
 * no longer match the token codes, without any test noticing. VERIFIED: (tests/search-index.test.ts) each way an
 * index can differ - another fingerprint, a moved pin, a changed column, a wrong size, a cut token file, a missing
 * file - fails with a message naming it.
 */
import { SEARCH_SCHEMA, unpackTokens, type SearchColumns, type SearchManifest } from '../../src/documentation/lib/search-format.ts';
import type { SearchDoc } from './search-docs.ts';

export interface SearchIndexInput {
  /** manifest.json, parsed - undefined when it is missing */
  manifest: SearchManifest | undefined;
  /** the fingerprint of the documents the rendered pages hold now */
  fingerprint: string;
  /** the documents the rendered pages hold now, in index order */
  docs: SearchDoc[];
  /** the model and vendor pins the build would write now (scripts/search-index.ts searchPins) */
  pins: Pick<SearchManifest, 'model' | 'assets'>;
  /** the two files as stored (compressed) and decoded - undefined when missing or undecodable */
  documents?: { stored: number; decoded: Uint8Array };
  tokens?: { stored: number; decoded: Uint8Array };
}

const COLUMNS = ['ids', 'titles', 'groups', 'types', 'texts'] as const;
const FIELD: Record<(typeof COLUMNS)[number], (d: SearchDoc) => string> = {
  ids: (d) => d.id,
  titles: (d) => d.title,
  groups: (d) => d.group,
  types: (d) => d.type ?? '',
  texts: (d) => d.text,
};

/**
 * Every way the built index differs from the docs as they render now.
 * @param input - the manifest, the decoded files and what the docs hold now
 * @returns the problems, empty when the index is current
 */
export function searchIndexProblems(input: SearchIndexInput): string[] {
  const { manifest, fingerprint, docs, pins } = input;
  if (!manifest) return ['dist/documentation/search/manifest.json is missing'];
  const problems: string[] = [];
  if (manifest.schema !== SEARCH_SCHEMA) problems.push(`manifest schema ${manifest.schema}, expected ${SEARCH_SCHEMA}`);
  if (manifest.fingerprint !== fingerprint)
    problems.push(`the index was built from other documents than the rendered pages hold now (fingerprint ${manifest.fingerprint.slice(0, 12)}, now ${fingerprint.slice(0, 12)})`);
  if (JSON.stringify(manifest.model) !== JSON.stringify(pins.model)) problems.push(`the manifest's model ${manifest.model?.fingerprint} is not the pinned ${pins.model.fingerprint}`);
  if (JSON.stringify(manifest.assets) !== JSON.stringify(pins.assets)) problems.push('the manifest names other vendor files than the installed packages (onnxruntime-web, defuss-brotli, defuss-lid)');
  if (!input.documents) problems.push(`search/${manifest.documents?.file} is missing or not Brotli`);
  else {
    const { stored, decoded } = input.documents;
    if (stored !== manifest.documents.bytes || decoded.length !== manifest.documents.rawBytes)
      problems.push(`search/${manifest.documents.file}: ${stored} / ${decoded.length} bytes, the manifest says ${manifest.documents.bytes} / ${manifest.documents.rawBytes}`);
    let columns: SearchColumns | undefined;
    try {
      columns = JSON.parse(new TextDecoder().decode(decoded)) as SearchColumns;
    } catch {
      problems.push(`search/${manifest.documents.file} is no JSON`);
    }
    if (columns) {
      if (manifest.documents.count !== docs.length) problems.push(`the manifest counts ${manifest.documents.count} documents, the pages hold ${docs.length}`);
      for (const column of COLUMNS) {
        const got = columns[column] ?? [];
        const at = docs.findIndex((d, i) => FIELD[column](d) !== got[i]);
        if (got.length !== docs.length || at !== -1)
          problems.push(`search/${manifest.documents.file}: ${column} differ from the pages${at === -1 ? ` (${got.length} of ${docs.length})` : ` from ${docs[at].id}`}`);
      }
    }
  }
  if (!input.tokens) problems.push(`search/${manifest.tokens?.file} is missing or not Brotli`);
  else {
    const { stored, decoded } = input.tokens;
    if (stored !== manifest.tokens.bytes || decoded.length !== manifest.tokens.rawBytes)
      problems.push(`search/${manifest.tokens.file}: ${stored} / ${decoded.length} bytes, the manifest says ${manifest.tokens.bytes} / ${manifest.tokens.rawBytes}`);
    try {
      unpackTokens(manifest.tokens, docs.length, decoded);
    } catch (error) {
      problems.push(`search/${manifest.tokens.file}: ${(error as Error).message}`);
    }
  }
  return problems;
}
