import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { startServer } from '../server.ts';
import { pdfCssScale, UNSHRUNK } from '../lib/pdf-scale.ts';
import { pdfOutline, pdfTagged, pdfText, perPage } from '../lib/pdf-text.ts';

/**
 * Why: the paper page's "Open full screen" button opens a generated page
 * (dist/documentation/full-paper.html, built by scripts/build-docs.ts from the
 * page's own example fence - one source, no copy to drift). Unlike a scaffold
 * app it is a document: it must scroll, and its live parts (the teaser
 * diagram, the charts, the BibTeX, the icons) must work outside the docs
 * sandbox, in both color schemes.
 */
const PAGE = '/dist/documentation/papers/full-paper.html';
const server = startServer();
const browser = await chromium.launch();
let failures = 0;
async function check(label: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
  } catch (err) {
    failures++;
    console.error(`  ✗ ${label}\n    ${err instanceof Error ? err.message : err}`);
  }
}

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await check('the docs page links its full-screen view', async () => {
    await page.goto(`${server.url}/dist/documentation/papers/paper.html`, { waitUntil: 'domcontentloaded' });
    const link = page.locator('main a.btn[href="full-paper.html"]');
    assert.equal(await link.count(), 1, 'one "Open full screen" button');
    assert.equal(await link.getAttribute('target'), '_blank');
    assert.match((await link.textContent()) ?? '', /Open full screen/);
  });

  await check('the docs page links the two PDF prints (justified, flush left), and both are served as PDF', async () => {
    const hrefs = await page.$$eval('main a.btn[href$=".pdf"]', (as) => as.map((a) => a.getAttribute('href')));
    assert.deepEqual(hrefs, ['../files/verified-agentic-engineering.pdf', '../files/verified-agentic-engineering-flush-left.pdf']);
    for (const href of hrefs) {
      const res = await page.request.get(new URL(href!, page.url()).href);
      assert.equal(res.status(), 200, href!);
      assert.equal((await res.body()).subarray(0, 5).toString(), '%PDF-', `${href} is a PDF`);
    }
  });

  await page.goto(`${server.url}${PAGE}`, { waitUntil: 'load' });

  await check('both PDF prints are tagged and list every numbered section as a bookmark, its number apart from its title ("1 Contribution and scope", not "1Contribution and scope")', async () => {
    // the headings as the page shows them; a wrapped heading's lines join without a space in a bookmark
    // (Chromium), so the titles are compared without whitespace - the space after the number is checked as written
    const headings = await page.$$eval('.paper-section > h2:has(> .paper-num)', (hs) =>
      hs.map((h) => [h.querySelector('.paper-num')!.textContent!.trim(), h.textContent!.replace(/\s+/g, ' ').trim()]),
    );
    assert.ok(headings.length >= 8, `${headings.length} numbered sections`);
    for (const file of ['verified-agentic-engineering.pdf', 'verified-agentic-engineering-flush-left.pdf']) {
      const pdf = Buffer.from(await (await page.request.get(`${server.url}/dist/documentation/files/${file}`)).body());
      assert.ok(pdfTagged(pdf), `${file} is tagged (a structure tree)`);
      // the title page holds the title block and the whole abstract, section 1 opens page 2: an abstract two lines
      // longer once spilled onto a page 2 that held nothing else (section 1 starts a page)
      const pages = pdfText(pdf);
      const on = (text: string) => perPage(pages, text).flatMap((n, i) => (n ? [i + 1] : []));
      assert.deepEqual(on('cost or human review effort.'), [1], `${file}: the abstract ends on page(s) ${on('cost or human review effort.')}`);
      assert.deepEqual(on('Contribution and scope'), [2], `${file}: section 1 on page(s) ${on('Contribution and scope')}`);
      const titles = pdfOutline(pdf).map((o) => o.title);
      for (const [num, text] of headings) {
        const mark = titles.find((t) => t.replace(/\s+/g, '') === text.replace(/\s+/g, ''));
        assert.ok(mark, `${file}: no bookmark for "${text}" - print-pdf prints with { outline: true }`);
        // the number ends in a no-break space (paper.css) - any space counts
        assert.ok(mark.startsWith(num) && /\s/.test(mark[num.length]), `${file}: bookmark "${mark}" - the number touches the title`);
      }
    }
  });

  await check('chrome-free: the paper is the page, on the whole system bundle', async () => {
    assert.equal(await page.locator('body > article.paper').count(), 1);
    assert.equal(await page.locator('.site-header, .app-sidebar, .code-example').count(), 0, 'no docs chrome, no example card');
    // the page sits in papers/: two levels up to dist/ (page-dirs.ts)
    assert.equal(await page.locator('link[href="../../components/all.css"]').count(), 1);
    assert.equal(await page.locator('script[type="module"][src="../../components/all.js"]').count(), 1);
  });

  await check('a document scrolls, and nothing overflows sideways', async () => {
    const m = await page.evaluate(() => ({ h: document.documentElement.scrollHeight, vh: innerHeight, w: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth }));
    assert.ok(m.h > m.vh * 3, `page height ${m.h} for a ${m.vh}px viewport`);
    assert.ok(m.w <= m.vw + 1, `scrollWidth ${m.w} > ${m.vw}`);
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    assert.ok((await page.evaluate(() => scrollY)) > 0, 'the window scrolls');
    await page.evaluate(() => scrollTo(0, 0));
  });

  await check('its live parts initialize: the Figure 1 diagram, the BibTeX blocks, the icons, the charts', async () => {
    await page.waitForFunction(() => !!document.querySelector('#paper-loop svg path'), undefined, { timeout: 10_000 });
    await page.waitForFunction(() => document.querySelectorAll('.bibtex[data-init]').length === 2, undefined, { timeout: 10_000 });
    await page.waitForFunction(() => document.querySelectorAll('.paper-links svg.lucide').length >= 5, undefined, { timeout: 10_000 });
    // the charts draw when they come into view
    await page.$eval('.paper-chart', (c) => c.scrollIntoView());
    await page.waitForFunction(() => !!document.querySelector('.paper-chart svg, .paper-chart canvas'), undefined, { timeout: 15_000 });
    await page.evaluate(() => scrollTo(0, 0));
  });

  await check('the in-page table of contents jumps within the page', async () => {
    await page.click('.paper-toc a[href="#paper-s5-6"]');
    await page.waitForFunction(() => scrollY > 0);
    const top = await page.$eval('#paper-s5-6', (h) => h.getBoundingClientRect().top);
    assert.ok(top >= -2 && top < 200, `5.6 heading at ${top}px after the jump`);
  });

  await check('it prints as an A4 document (data-print="a4") at its own scale, the chart and the diagram redrawn at the print width; the contents stay on screen; breaks before section 1, sections 3 and 8 and the citations; its colors print', async () => {
    // a headless print takes the CSS page size only when asked to (Letter otherwise)
    const buf = await page.pdf({ preferCSSPageSize: true });
    const pdf = buf.toString('latin1');
    const boxes = [...pdf.matchAll(/\/MediaBox\s*\[([^\]]+)\]/g)].map((m) => m[1].trim().split(/\s+/).map(Number));
    const pages = (pdf.match(/\/Type\s*\/Page(?!s)/g) ?? []).length;
    assert.ok(boxes.length > 0 && boxes.every((b) => Math.abs(b[2] - 595.28) < 1.5 && Math.abs(b[3] - 841.89) < 1.5), `page boxes ${JSON.stringify([...new Set(boxes.map(String))])}`);
    // nothing is wider than the page, so nothing shrinks the print: no section overflows into clipped columns,
    // and the chart and the teaser diagram take the print width (they redraw when the print layout applies)
    assert.ok(Math.abs((pdfCssScale(buf) ?? 0) - UNSHRUNK) < 0.01, `print scale ${pdfCssScale(buf)} (300/96 = unshrunk)`);
    // the breaks chosen from the printed pages: the title block and the abstract share the first page, section 1
    // starts the second, sections 3 and 8 (their headings fell to a page foot) and the citations a page each - the
    // rest runs on; the contents list stays on screen (its links do nothing on paper)
    await page.emulateMedia({ media: 'print' });
    try {
      const blocks = await page.evaluate(() =>
        [...document.querySelectorAll('.paper > :is(.paper-abstract, .paper-toc, .paper-section, .paper-bibtex)')].map((b) => {
          const marker = b.previousElementSibling;
          const name = b.querySelector(':scope > h2 .paper-num')?.textContent?.trim() ?? b.getAttribute('aria-labelledby');
          return `${name}:${marker?.classList.contains('typeset-break') ? getComputedStyle(marker).breakBefore : 'flow'}`;
        }),
      );
      assert.deepEqual(blocks, ['paper-abstract:flow', 'paper-toc:flow', '1:page', '2:flow', '3:page', '4:flow', '5:flow', '6:flow', '7:flow', '8:page', 'paper-bibtex:page']);
      assert.equal(await page.$eval('.paper-toc', (t) => getComputedStyle(t).display), 'none');
      assert.ok(pages >= 5, `${pages} pages for 4 page breaks`);
      // a print dialog drops background graphics by default: the paper prints its colors as designed, so the text
      // set for a fill (the agent's bubble and its code, a tag, a code window) keeps its fill
      const adjust = await page.$$eval('.paper, .paper .bubble-content code, .paper .paper-tag, .paper .mockup-code', (els) => [...new Set(els.map((e) => getComputedStyle(e).printColorAdjust))]);
      assert.deepEqual(adjust, ['exact']);
    } finally {
      await page.emulateMedia({ media: null });
    }
  });

  await check('a caption never stands alone: every figure caption sits in the column of the last piece of what it captions (a caption above: of the first) - on screen at two widths and in print', async () => {
    try {
      for (const [media, width] of [['screen', 1280], ['screen', 900], ['print', 1280]] as const) {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ media });
        await page.waitForTimeout(300);
        const alone = await page.evaluate(() => {
          const out: string[] = [];
          for (const cap of document.querySelectorAll('.paper figure > figcaption')) {
            const above = cap === cap.parentElement!.firstElementChild;
            const other = above ? cap.nextElementSibling : cap.previousElementSibling;
            const rects = other ? [...other.getClientRects()].filter((r) => r.width && r.height) : [];
            if (!rects.length) continue;
            const piece = above ? rects[0] : rects[rects.length - 1];
            const c = cap.getBoundingClientRect();
            const column = c.left < piece.right && c.right > piece.left;
            const order = above ? c.bottom <= piece.top + 2 : c.top >= piece.bottom - 2;
            if (!column || !order) out.push((cap.textContent ?? '').trim().slice(0, 40));
          }
          return out;
        });
        assert.deepEqual(alone, [], `${media} ${width}px`);
      }
    } finally {
      await page.emulateMedia({ media: null });
      await page.setViewportSize({ width: 1280, height: 900 });
    }
  });

  await check('the alignment swap sets the whole text flush left without hyphenation (the abstract and nested text too) - on screen and in print; a second click restores the justified setting', async () => {
    // what still computes justify / automatic hyphenation inside the settings the swap covers
    const justified = () =>
      page.evaluate(() => {
        const out = new Set<string>();
        for (const el of document.querySelectorAll<HTMLElement>('.paper :is(.paper-section, .paper-abstract) :is(p, li)')) {
          const s = getComputedStyle(el);
          if (s.textAlign === 'justify' || s.hyphens === 'auto') out.add(`${el.parentElement!.className || el.parentElement!.tagName} > ${el.tagName}`);
        }
        return [...out];
      });
    try {
      assert.notDeepEqual(await justified(), [], 'the authored setting is justified');
      await page.click('#paper-align');
      for (const media of ['screen', 'print'] as const) {
        await page.emulateMedia({ media });
        assert.deepEqual(await justified(), [], `${media}: flush left`);
      }
      await page.emulateMedia({ media: null });
      await page.click('#paper-align');
      assert.notDeepEqual(await justified(), [], 'justified again');
    } finally {
      await page.emulateMedia({ media: null });
      await page.evaluate(() => document.documentElement.classList.remove('paper-align-left'));
    }
  });

  await check('it follows the OS color scheme', async () => {
    const dark = await browser.newPage({ colorScheme: 'dark', viewport: { width: 1280, height: 900 } });
    await dark.goto(`${server.url}${PAGE}`, { waitUntil: 'domcontentloaded' });
    assert.equal(await dark.evaluate(() => document.documentElement.classList.contains('dark')), true);
    const [bg, fg] = await dark.evaluate(() => [getComputedStyle(document.body).backgroundColor, getComputedStyle(document.body).color]);
    assert.notEqual(bg, fg);
    // the light/dark swap starts in the mode the page is in: it showed light on a dark
    // page, so the first click did nothing visible
    await dark.waitForLoadState('load');
    assert.equal(await dark.$eval('#paper-mode input', (i) => (i as HTMLInputElement).checked), true, 'the swap shows dark');
    await dark.click('#paper-mode');
    assert.equal(await dark.evaluate(() => document.documentElement.classList.contains('dark')), false, 'one click switches to light');
    await dark.close();
  });

  await check('no page errors', async () => {
    assert.deepEqual(errors, []);
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`paper-fullscreen.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('paper-fullscreen.e2e: all checks passed');
