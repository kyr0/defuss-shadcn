/**
 * The absolute URL a stylesheet `<link>` was loaded from.
 *
 * Why: a page that changes its address without reloading - an SPA router such as the docs' layout.ts - keeps
 * its `<head>`, and `link.href` resolves the authored relative href against the NEW address: the docs index's
 * `../theme/utils/default-semantic-tokens.css`, read again on a section page, names
 * `/documentation/theme/...`, which does not exist. The sheet keeps the URL it was fetched from. Writing the
 * absolute URL back into the href instead fetches the sheet again and replaces it.
 * Falls back to `href` while the sheet has not loaded (then no navigation has happened yet either).
 * VERIFIED: (tmp/spa-sheet-probe.ts, Chromium 153) after a router navigation from index.html into a section page,
 * `.href` named the 404 URL and `.sheet.href` the loaded one; setting the href to the loaded URL made a new
 * request and a new sheet. (code-example-docs.e2e) a card previews after the same navigation.
 */
export function sheetUrl(link: HTMLLinkElement): string {
  return link.sheet?.href ?? link.href;
}
