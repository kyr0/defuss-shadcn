/**
 * The id of a page section or an example label: `toc-` + its text in lowercase, every run of other characters one
 * dash. One owner: the toc plugin (lib/plugins.ts) gives headings these ids, and the "What's new" record links its
 * examples by them (lib/whats-new-data.ts) - the changelog's links cannot point at an id the page does not carry.
 * VERIFIED: (verify doc code-block integrity, documentation.e2e What's new) every id is unique on its page and the
 * record's example links land on their label.
 */
export const tocId = (text: string): string =>
  'toc-' + text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
