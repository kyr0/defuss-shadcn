#!/usr/bin/env bun
import { chromium } from 'playwright';
import { join } from 'node:path';
import { startServer } from '../tests/e2e/server.ts';

/**
 * Why: the documents the docs show print by themselves, and their PDFs ship beside the pages as the print
 * layout a reader can open without printing - prints of the BUILT full-screen pages, exactly as a reader's
 * "Save as PDF" makes them: print media, each page's own @page profile (A4, margins, page numbers, a letter's
 * first page without a top margin), backgrounds printed, light colour scheme - plus a bookmark per heading and a
 * structure tree (`outline`, `tagged`: a reader's sidebar lists the sections, a screen reader follows headings,
 * paragraphs and tables; the layout stays the same). `paper` is the technical report
 * as authored (Blocksatz); `paper-left` the same page after its alignment Swap (html.paper-align-left: flush
 * left, no automatic hyphenation), both in two columns; `letter` and `invoice` the first example of the
 * Letter and the Invoice page (a two-page DIN 5008 letter, a 30-line invoice in a letter). The files land in
 * src/documentation/public/files/, which the docs build copies to dist/documentation/files/ - so rerun this
 * after an edit and a docs build, then build the docs again. Not part of build or verify: it starts Chromium
 * on purpose.
 * VERIFIED: (paper-fullscreen.e2e, letter.e2e, invoice.e2e) the pages link the files and they are served as PDFs;
 * paper-fullscreen.e2e reads the paper PDFs' bookmarks and structure tree. (tmp/tagged-pdf-probe.ts) a tagged print
 * has the same text runs at the same positions as an untagged one, on all three documents.
 *
 * Usage: bun run print-pdf [paper] [paper-left] [letter] [invoice]   (no argument: all)
 */

const ROOT = join(import.meta.dirname, '..');
const OUT = join(ROOT, 'src/documentation/public/files');
const DOCUMENTS = {
  paper: { page: 'papers/full-paper.html', file: 'verified-agentic-engineering.pdf' },
  'paper-left': { page: 'papers/full-paper.html', file: 'verified-agentic-engineering-flush-left.pdf', align: 'left' },
  letter: { page: 'documents/full-letter.html', file: 'letter-din-5008.pdf' },
  invoice: { page: 'documents/full-invoice.html', file: 'invoice-din-5008.pdf' },
} as const;
type Name = keyof typeof DOCUMENTS;

const asked = process.argv.slice(2);
const unknown = asked.filter((a) => !(a in DOCUMENTS));
if (unknown.length) {
  console.error(`print-pdf: unknown document ${unknown.join(', ')} - use ${Object.keys(DOCUMENTS).join(' / ')}`);
  process.exit(1);
}
const names = (asked.length ? asked : Object.keys(DOCUMENTS)) as Name[];

const server = startServer();
const browser = await chromium.launch();
try {
  for (const name of names) {
    const doc = DOCUMENTS[name];
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: 'light' });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${server.url}/dist/documentation/${doc.page}`, { waitUntil: 'networkidle', timeout: 60_000 });
    // charts and diagrams draw after load; print redraws them at the sheet width
    await page.waitForTimeout(1500);
    if ('align' in doc) await page.evaluate(() => document.documentElement.classList.add('paper-align-left'));
    if (errors.length) throw new Error(`${doc.page}: ${errors.join('; ')}`);
    const path = join(OUT, doc.file);
    await page.pdf({ path, preferCSSPageSize: true, printBackground: true, outline: true, tagged: true });
    console.log(`print-pdf: ${name} → ${path.slice(ROOT.length + 1)} (${Math.round(Bun.file(path).size / 1024)} KiB)`);
    await page.close();
  }
} finally {
  await browser.close();
  server.stop();
}
