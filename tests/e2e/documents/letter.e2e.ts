import assert from 'node:assert/strict';
import type { Page } from 'playwright';
import { cssSmoke } from '../lib/css-smoke.ts';
import { pdfRuns, pdfText, perPage, runAt, type PageRun } from '../lib/pdf-text.ts';
import { pdfCssScale, UNSHRUNK } from '../lib/pdf-scale.ts';

/**
 * Why: a letter is only right when it lands where the paper and the envelope expect it - the address text in
 * the window, the information block beside it, page numbers from page 2 - and the screen sheet promises the
 * same geometry. The fixture is the docs page's three examples (form B over two pages, form A, a US letter);
 * these checks measure the screen sheet in mm and read the printed PDF's text runs and their positions.
 */
const MM = 96 / 25.4;
const close = (got: number, want: number, tol: number, what: string) =>
  assert.ok(Math.abs(got - want) <= tol, `${what}: ${got.toFixed(2)} (want ${want} ± ${tol})`);

/** the i-th letter's part box relative to the letter's padding box (its 1px border off), in mm */
const partMm = (page: Page, i: number, part: string) =>
  page.evaluate(
    ([i, part]) => {
      const letter = document.querySelectorAll<HTMLElement>('.letter')[i as number];
      const l = letter.getBoundingClientRect();
      const r = letter.querySelector(part as string)!.getBoundingClientRect();
      const mm = 96 / 25.4;
      return { left: (r.left - l.left - 1) / mm, top: (r.top - l.top - 1) / mm, position: getComputedStyle(letter.querySelector(part as string)!).position };
    },
    [i, part] as const,
  );

/** print one letter of the fixture alone (a page of its own), as a reader's Save as PDF does */
async function printLetter(page: Page, i: number, setup?: (p: Page) => Promise<void>): Promise<{ pdf: Buffer; runs: PageRun[][]; text: string[]; marks: string }> {
  const p = await page.context().browser()!.newPage();
  try {
    await p.goto(page.url());
    // the letter alone on an unpadded body, as on its full-screen page
    await p.evaluate((i) => {
      document.body.replaceChildren(document.querySelectorAll('.letter')[i]);
      document.body.style.padding = '0';
    }, i);
    if (setup) await setup(p);
    // the marks are print-only custom properties: read them under print media
    await p.emulateMedia({ media: 'print' });
    const marks = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--_letter-marks'));
    const pdf = await p.pdf({ preferCSSPageSize: true, printBackground: true });
    return { pdf, runs: pdfRuns(pdf), text: pdfText(pdf), marks };
  } finally {
    await p.close();
  }
}

await cssSmoke('letter', [
  { label: 'the body is 11pt, the return line 7pt', selector: '.letter .letter-return', css: { fontSize: '9.33333px' } },
  { label: 'the letter text is 11pt', selector: '.letter .letter-body', css: { fontSize: '14.6667px' } },
  {
    label: 'the screen sheet is A4 at paper scale: 210mm wide, at least 297mm tall',
    run: async (page) => {
      const r = await page.evaluate(() => document.querySelector('.letter')!.getBoundingClientRect());
      close(r.width / MM, 210, 0.3, 'width');
      assert.ok(r.height / MM >= 296.5, `height ${(r.height / MM).toFixed(1)}mm`);
    },
  },
  {
    label: 'form B on a full sheet: the address field from 45mm on the 25mm line, the information block from 125mm and 50mm, the subject below the head',
    run: async (page) => {
      const address = await partMm(page, 0, '.letter-address');
      close(address.left, 25, 0.3, 'address left');
      close(address.top, 45, 0.3, 'address top');
      const info = await partMm(page, 0, '.letter-info');
      close(info.left, 125, 0.3, 'info left');
      close(info.top, 50, 0.3, 'info top');
      const subject = await partMm(page, 0, '.letter-subject');
      close(subject.top, 98.46, 0.5, 'subject top');
    },
  },
  {
    label: 'form A sits 18mm higher: the address field from 27mm, the information block from 32mm',
    run: async (page) => {
      close((await partMm(page, 1, '.letter-address')).top, 27, 0.3, 'address top');
      close((await partMm(page, 1, '.letter-info')).top, 32, 0.3, 'info top');
    },
  },
  {
    label: 'the fold and hole marks: drawn at the sheet edge for DIN forms, none with data-marks="none" or for a US letter',
    run: async (page) => {
      const marks = await page.evaluate(() => [...document.querySelectorAll('.letter .letter-head')].map((h) => getComputedStyle(h, '::before').content));
      assert.deepEqual(marks, ['""', '""', 'none']);
      const off = await page.evaluate(() => {
        const l = document.querySelector('.letter')!;
        l.setAttribute('data-marks', 'none');
        const c = getComputedStyle(l.querySelector('.letter-head')!, '::before').content;
        l.removeAttribute('data-marks');
        return c;
      });
      assert.equal(off, 'none');
    },
  },
  {
    label: 'the root rules (page labels, marks) exist in print only - on screen no :has() on the root is evaluated for them',
    run: async (page) => {
      const read = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--_letter-page').trim());
      assert.equal(await read(), '');
      await page.emulateMedia({ media: 'print' });
      try {
        assert.equal(await read(), '"Seite"', 'a German letter in the document');
      } finally {
        await page.emulateMedia({ media: null });
      }
    },
  },
  {
    label: 'a narrow sheet (under 174mm of text width) stacks its parts in reading order',
    run: async (page) => {
      await page.evaluate(() => ((document.querySelector('.letter')!.parentElement as HTMLElement).style.width = '480px'));
      try {
        const r = await partMm(page, 0, '.letter-address');
        assert.equal(r.position, 'static');
        const order = await page.evaluate(() => ['.letter-brand', '.letter-address', '.letter-info'].map((s) => document.querySelector(`.letter ${s}`)!.getBoundingClientRect().top));
        assert.ok(order[0] < order[1] && order[1] < order[2], JSON.stringify(order));
      } finally {
        await page.evaluate(() => ((document.querySelector('.letter')!.parentElement as HTMLElement).style.width = ''));
      }
    },
  },
  {
    label: 'a US letter: US Letter wide (8.5in), block format - the date above the inside address',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const l = document.querySelectorAll('.letter')[2];
        const top = (s: string) => l.querySelector(s)!.getBoundingClientRect().top;
        return { width: l.getBoundingClientRect().width, info: top('.letter-info'), address: top('.letter-address') };
      });
      close(r.width, 816, 1, 'width px');
      assert.ok(r.info < r.address, JSON.stringify(r));
    },
  },
  {
    label: 'printed, form B is measured from the top edge: two A4 pages, the return line and the recipient in the address field on the 25mm line, the information block at 125mm, "Seite 2 von 2" on page 2 only, nothing shrunk, the form B marks',
    run: async (page) => {
      const { pdf, runs, text, marks } = await printLetter(page, 0);
      assert.equal(runs.length, 2, `${runs.length} pages`);
      assert.equal(pdfCssScale(pdf), UNSHRUNK, 'printed at full scale');
      const ret = runAt(runs[0], 'Beispiel GmbH · Musterstraße 12 · 10115 Berlin');
      const recipient = runAt(runs[0], 'Frau');
      const info = runAt(runs[0], 'Ihr Zeichen');
      assert.ok(ret && recipient && info, JSON.stringify(runs[0].slice(0, 12)));
      close(ret.x, 25, 0.3, 'return line x');
      assert.ok(ret.y > 45 && ret.y < 62.7, `return line baseline ${ret.y.toFixed(1)}mm - in the 17.7mm notice zone from 45mm`);
      close(recipient.x, 25, 0.3, 'recipient x');
      assert.ok(recipient.y > 62.7 && recipient.y < 90, `recipient baseline ${recipient.y.toFixed(1)}mm - in the address zone 62.7-90mm`);
      close(info.x, 125, 0.3, 'info x');
      assert.ok(info.y > 50 && info.y < 56, `info baseline ${info.y.toFixed(1)}mm`);
      assert.deepEqual(perPage(text, 'Seite 2 von 2'), [0, 1]);
      assert.match(marks, /y1='105'.*y1='210'/);
    },
  },
  {
    label: 'printed, form A puts the address field 18mm higher and its marks at 87 / 192mm',
    run: async (page) => {
      const { runs, marks } = await printLetter(page, 1);
      const recipient = runAt(runs[0], 'Stadtverwaltung Musterstadt');
      const info = runAt(runs[0], 'Aktenzeichen');
      assert.ok(recipient && info);
      assert.ok(recipient.y > 39.7 && recipient.y < 67, `recipient baseline ${recipient.y.toFixed(1)}mm - in the address zone 39.7-67mm`);
      assert.ok(info.y > 32 && info.y < 38, `info baseline ${info.y.toFixed(1)}mm`);
      assert.match(marks, /y1='87'.*y1='192'/);
    },
  },
  {
    label: 'printed, a US letter is US Letter with 1in margins and no marks',
    run: async (page) => {
      const { pdf, runs, marks } = await printLetter(page, 2);
      assert.match(pdf.toString('latin1'), /\/MediaBox \[0 0 61\d(\.\d+)? 79\d(\.\d+)?\]/);
      const first = runAt(runs[0], 'Example Studio LLC');
      assert.ok(first);
      close(first.x, 25.4, 0.3, 'left margin');
      assert.ok(marks.includes('svg'), 'the marks variable stays the A4 default - unused by @page letter-us');
    },
  },
  {
    label: 'in a dark theme the letter still prints black on white, its page too',
    run: async (page) => {
      const p = await page.context().browser()!.newPage();
      try {
        await p.goto(page.url());
        // a dark page as the full-screen page makes one: the class and an unlayered background
        await p.evaluate(() => {
          document.documentElement.classList.add('dark');
          document.head.append(Object.assign(document.createElement('style'), { textContent: 'html, body { background: #111; }' }));
        });
        await p.emulateMedia({ media: 'print' });
        const c = await p.evaluate(() => [
          getComputedStyle(document.querySelector('.letter')!).color,
          getComputedStyle(document.querySelector('.letter')!).backgroundColor,
          getComputedStyle(document.documentElement).backgroundColor,
          getComputedStyle(document.body).backgroundColor,
        ]);
        assert.deepEqual(c, ['rgb(0, 0, 0)', 'rgb(255, 255, 255)', 'rgb(255, 255, 255)', 'rgb(255, 255, 255)']);
      } finally {
        await p.close();
      }
    },
  },
]);
