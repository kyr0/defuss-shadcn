import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from '../server.ts';
import { assertRenderContract } from '../lib/render-contract.ts';
import { pdfRuns, pdfText, perPage, runAt } from '../lib/pdf-text.ts';
import { pdfCssScale, UNSHRUNK } from '../lib/pdf-scale.ts';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader';

/**
 * Why: an invoice is only useful when its numbers are RIGHT - every amount, every tax and the total exactly
 * what the rows say, rounded the way the maintainer decided (as usual in Germany: each line to the cent, the
 * tax once per rate on that rate's net sum, half away from zero) - and when it prints readably over pages.
 * The fixture is the docs page's four examples; the expected totals are worked out by hand (the rounding
 * invoice) or by an independent integer oracle (the 30-line invoice), never by the component's own code.
 */

const FIXTURE = '/tests/e2e/documents/invoice.e2e-fixture.html';
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

/** Intl puts (narrow) no-break spaces between number and unit - compare with plain spaces */
const plain = (s: string) => s.replace(/[  ]/g, ' ').trim();
/** the totals rows of an invoice: [label, value] */
const totalsOf = (page: Page, id: string) =>
  page.$$eval(`#${id} .invoice-totals tr`, (rows) => rows.map((r) => [r.querySelector('th')!.textContent!, r.querySelector('td')!.textContent!])).then((rows) => rows.map(([a, b]) => [plain(a), plain(b)]));
/** one column of an invoice's line rows */
const column = (page: Page, id: string, role: string) =>
  page.$$eval(`#${id} .invoice-items tbody [data-invoice="${role}"]`, (cells) => cells.map((c) => c.textContent!)).then((cells) => cells.map(plain));
const lib = (page: Page) => page.evaluateHandle(() => (globalThis as any).df$.shadcn.invoice);

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${server.url}${FIXTURE}`);
  await page.waitForFunction(() => document.querySelectorAll('.invoice:not([data-init])').length === 0 && !!(globalThis as any).df$?.shadcn?.invoice);

  await check('every invoice initializes: its locale and currency written, every line numbered and formatted', async () => {
    const r = await page.$$eval('.invoice', (els) => els.map((el) => [el.id, el.getAttribute('data-locale'), el.getAttribute('data-currency')]));
    assert.deepEqual(r, [
      ['inv-de', 'de', 'EUR'],
      ['inv-round', 'de', 'EUR'],
      ['inv-us', 'en-US', 'USD'],
      ['inv-live', 'en', 'EUR'],
    ]);
    assert.deepEqual(await column(page, 'inv-de', 'position'), Array.from({ length: 30 }, (_, i) => String(i + 1)));
  });

  await check('every invoice spaces its parts 1rem apart - inside a letter too; the first part starts flush, the last ends flush', async () => {
    const r = await page.$$eval('.invoice', (invoices) =>
      invoices.map((inv) => {
        const parts = [...inv.children].filter((el) => getComputedStyle(el).display !== 'none');
        return [inv.id, getComputedStyle(parts[0]).marginTop, [...new Set(parts.slice(1).map((el) => getComputedStyle(el).marginTop))].join(), getComputedStyle(parts.at(-1)!).marginBottom];
      }),
    );
    for (const [id, first, between, last] of r) assert.deepEqual([first, between, last], ['0px', '16px', '0px'], id);
  });

  await check('German formatting: 18,5 hours, 0,335 € keeps its third decimal, 19 %, 1.757,50 €', async () => {
    assert.deepEqual(await column(page, 'inv-round', 'quantity'), ['12', '18,5', '3', '1']);
    assert.deepEqual(await column(page, 'inv-round', 'price'), ['95,00 €', '95,00 €', '0,335 €', '49,90 €']);
    assert.deepEqual(await column(page, 'inv-round', 'vat'), ['19 %', '19 %', '19 %', '7 %']);
    assert.deepEqual(await column(page, 'inv-round', 'amount'), ['1.140,00 €', '1.757,50 €', '1,01 €', '49,90 €']);
  });

  await check('rounded the German way (worked out by hand): 3 x 0,335 € = 1,01 €; 19 % on the 19 % lines\' sum 2.898,51 € = 550,72 €; 7 % on 49,90 € = 3,49 €; due 3.502,62 €', async () => {
    assert.deepEqual(await totalsOf(page, 'inv-round'), [
      ['Summe netto', '2.948,41 €'],
      ['zzgl. 19 % USt auf 2.898,51 €', '550,72 €'],
      ['zzgl. 7 % USt auf 49,90 €', '3,49 €'],
      ['Rechnungsbetrag', '3.502,62 €'],
    ]);
    const t = await page.evaluate(() => (globalThis as any).df$.shadcn.invoice.totals('#inv-round'));
    assert.deepEqual(t, {
      currency: 'EUR',
      digits: 2,
      lines: ['1140.00', '1757.50', '1.01', '49.90'],
      net: '2948.41',
      taxes: [
        { rate: '19', base: '2898.51', tax: '550.72' },
        { rate: '7', base: '49.90', tax: '3.49' },
      ],
      total: '3502.62',
    });
  });

  await check('compute(): the tax once per rate (3 x 0,03 € → 0,02 €, not 3 x 0,01 €), half away from zero (0,095 → 0,10; a credit -0,095 → -0,10), the currency\'s minor unit (JPY: none)', async () => {
    const r = await (await lib(page)).evaluate((invoice: any) => ({
      perRate: invoice.compute(Array.from({ length: 3 }, () => ({ quantity: 1, price: '0.03', vat: 19 }))).taxes[0].tax,
      half: invoice.compute([{ quantity: 1, price: '0.50', vat: 19 }]).taxes[0].tax,
      credit: invoice.compute([{ quantity: -1, price: '0.50', vat: 19 }]),
      yen: invoice.compute([{ quantity: 3, price: '333.5', vat: 10 }], 'JPY'),
      zero: invoice.compute([{ quantity: 2, price: '150', vat: 0 }]),
    }));
    assert.equal(r.perRate, '0.02');
    assert.equal(r.half, '0.10');
    assert.deepEqual([r.credit.lines, r.credit.taxes[0].tax, r.credit.total], [['-0.50'], '-0.10', '-0.60']);
    assert.deepEqual([r.yen.digits, r.yen.lines, r.yen.taxes[0].tax, r.yen.total], [0, ['1001'], '100', '1101']);
    assert.deepEqual([r.zero.taxes, r.zero.total], [[], '300.00']);
  });

  await check('a US invoice: $1,200.00, 8.875%, the English totals; the 0 % line counts toward the subtotal and gets no tax row', async () => {
    assert.deepEqual(await column(page, 'inv-us', 'price'), ['$120.00', '$19.99', '$150.00']);
    assert.deepEqual(await column(page, 'inv-us', 'vat'), ['8.875%', '8.875%', '0%']);
    assert.deepEqual(await totalsOf(page, 'inv-us'), [
      ['Subtotal', '$1,739.88'],
      ['Tax 8.875% on $1,439.88', '$127.79'],
      ['Total', '$1,867.67'],
    ]);
  });

  await check('the 30-line invoice adds up to what an independent integer oracle computes', async () => {
    const rows = await page.$$eval('#inv-de .invoice-items tbody tr', (trs) => trs.map((tr) => [tr.getAttribute('data-quantity')!, tr.getAttribute('data-price')!, tr.getAttribute('data-vat')!]));
    // the oracle: quantities in hundredths, prices in thousandths, amounts rounded half up to cents (all positive)
    const cents = rows.map(([q, p]) => Math.floor((Math.round(Number(q) * 100) * Math.round(Number(p) * 1000) + 500) / 1000));
    const bases = new Map<string, number>();
    rows.forEach(([, , v], i) => bases.set(v, (bases.get(v) ?? 0) + cents[i]));
    const taxes = [...bases].map(([v, base]) => Math.floor((base * Number(v) + 50) / 100));
    const net = cents.reduce((a, b) => a + b, 0);
    const total = net + taxes.reduce((a, b) => a + b, 0);
    const t = await page.evaluate(() => (globalThis as any).df$.shadcn.invoice.totals('#inv-de'));
    assert.deepEqual(t.lines, cents.map((c) => (c / 100).toFixed(2)));
    assert.equal(t.net, (net / 100).toFixed(2));
    assert.equal(t.total, (total / 100).toFixed(2));
    const due = (await totalsOf(page, 'inv-de')).at(-1)!;
    assert.deepEqual(due, ['Rechnungsbetrag', `${new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2 }).format(total / 100).replace(/[  ]/g, ' ')} €`]);
  });

  await check('the totals follow the lines: a row added, a price changed, a row removed - each fires invoice-totals with the new total', async () => {
    const r = await page.evaluate(async () => {
      const el = document.getElementById('inv-live')!;
      const seen: string[] = [];
      el.addEventListener('invoice-totals', (e: any) => seen.push(e.detail.totals.total));
      const settle = () => new Promise((r) => setTimeout(r, 30));
      document.getElementById('inv-live-add')!.click();
      await settle();
      const added = (globalThis as any).df$.shadcn.invoice.totals(el).total;
      const row = el.querySelectorAll('tbody tr')[1] as HTMLElement;
      row.dataset.price = '200.00';
      await settle();
      const changed = (globalThis as any).df$.shadcn.invoice.totals(el).total;
      row.remove();
      await settle();
      return { added, changed, back: (globalThis as any).df$.shadcn.invoice.totals(el).total, seen, log: document.getElementById('inv-live-log')!.textContent };
    });
    // 1,200.00 + 2.5 x 180.00 = 1,650.00 net, 19 % → 313.50; with 200.00: 1,700.00 + 323.00; back to 1,200 + 228
    assert.deepEqual([r.added, r.changed, r.back], ['1963.50', '2023.00', '1428.00']);
    assert.deepEqual(r.seen, ['1963.50', '2023.00', '1428.00']);
    assert.equal(r.log, 'invoice-totals: 1428.00 EUR');
  });

  await check('setState: the locale switches numbers and words, a locale alone keeps the currency (merged config), getState reports both, an unknown state throws', async () => {
    const r = await page.evaluate(() => {
      const el = document.getElementById('inv-live') as any;
      el.api.setState('default', { locale: 'de-DE' });
      const de = [el.querySelector('.invoice-total th').textContent, el.querySelector('.invoice-total td').textContent];
      el.api.setState('default', { currency: 'USD' });
      const usd = [el.getAttribute('data-locale'), el.querySelector('.invoice-total td').textContent];
      const state = el.api.getState();
      el.api.setState('default', state.config);
      const same = el.querySelector('.invoice-total td').textContent;
      let threw = false;
      try {
        el.api.setState('nope');
      } catch {
        threw = true;
      }
      el.api.setState('default', { locale: 'en', currency: 'EUR' });
      return { de, usd, config: { locale: state.config.locale, currency: state.config.currency }, same, threw };
    });
    assert.deepEqual(r.de.map(plain), ['Rechnungsbetrag', '1.428,00 €']);
    assert.deepEqual(r.usd.map(plain), ['de-DE', '1.428,00 $']);
    assert.deepEqual(r.config, { locale: 'de-DE', currency: 'USD' });
    assert.equal(plain(r.same), '1.428,00 $');
    assert.equal(r.threw, true);
  });

  await check('a value that is no number never counts as 0: the row is marked, the reason replaces the totals, totals() is null, the event says why; fixed, the totals return', async () => {
    const r = await page.evaluate(async () => {
      const el = document.getElementById('inv-round') as any;
      const lib = (globalThis as any).df$.shadcn.invoice;
      const events: { total: string | null; error: string }[] = [];
      el.addEventListener('invoice-totals', (e: any) => events.push({ total: e.detail.totals?.total ?? null, error: e.detail.error }));
      const row = el.querySelectorAll('tbody tr')[2] as HTMLElement;
      row.dataset.price = '0,335';
      await new Promise((r) => setTimeout(r, 30));
      const broken = {
        invalid: row.hasAttribute('data-invalid'),
        amount: row.querySelector('[data-invoice="amount"]')!.textContent,
        totals: [...el.querySelectorAll('.invoice-totals tr')].map((tr: Element) => [tr.className, tr.querySelector('th')!.textContent]),
        api: lib.totals(el),
      };
      let threw = '';
      try {
        lib.compute([{ quantity: 1, price: '12,50', vat: 19 }]);
      } catch (e) {
        threw = `${(e as Error).name}: ${(e as Error).message}`;
      }
      row.dataset.price = '0.335';
      await new Promise((r) => setTimeout(r, 30));
      return { broken, threw, fixed: [row.hasAttribute('data-invalid'), lib.totals(el).total], events };
    });
    assert.deepEqual(r.broken.totals, [['invoice-error', 'line 3: price "0,335" is no number (write a decimal with a dot)']]);
    assert.deepEqual([r.broken.invalid, r.broken.amount, r.broken.api], [true, '', null]);
    assert.equal(r.threw, 'RangeError: line 1: price "12,50" is no number (write a decimal with a dot)');
    assert.deepEqual(r.fixed, [false, '3502.62']);
    assert.deepEqual(r.events, [
      { total: null, error: 'line 3: price "0,335" is no number (write a decimal with a dot)' },
      { total: '3502.62', error: '' },
    ]);
  });

  await check('labels(): a language added - its invoices take the words', async () => {
    const words = await page.evaluate(() => {
      const el = document.getElementById('inv-live') as any;
      (globalThis as any).df$.shadcn.invoice.labels('fr', { net: 'Total HT', tax: 'TVA {rate} sur {base}', total: 'Total TTC' });
      el.api.setState('default', { locale: 'fr-FR' });
      const rows = [...el.querySelectorAll('.invoice-totals th')].map((th: Element) => th.textContent);
      el.api.setState('default', { locale: 'en' });
      return rows;
    });
    assert.deepEqual(words.map(plain), ['Total HT', 'TVA 19 % sur 1 200,00 €', 'Total TTC']);
  });

  await check('printed in its letter: the header row on every page, the totals once - on the last page with the last three lines -, "Seite n von n" on the last, nothing shrunk', async () => {
    const p = await browser.newPage();
    try {
      await p.goto(page.url());
      await p.waitForFunction(() => !!document.querySelector('#inv-de[data-init]'));
      await p.evaluate(() => {
        document.body.replaceChildren(document.getElementById('inv-de')!.closest('.letter')!);
        document.body.style.padding = '0';
      });
      const pdf = await p.pdf({ preferCSSPageSize: true, printBackground: true });
      const pages = pdfText(pdf);
      const n = pages.length;
      const onLast = pages.map((_, i) => (i === n - 1 ? 1 : 0));
      assert.ok(n >= 2, `${n} pages`);
      assert.equal(pdfCssScale(pdf), UNSHRUNK, 'printed at full scale');
      assert.deepEqual(perPage(pages, 'Einzelpreis'), pages.map(() => 1), 'the header row on every page');
      assert.deepEqual(perPage(pages, 'Rechnungsbetrag'), onLast, 'the amount due once, on the last page');
      for (const last of ['Barrierefreiheit: Alternativtexte ergänzt', 'Karte auf der Anfahrtsseite erneuert', 'Suchindex neu aufgebaut'])
        assert.deepEqual(perPage(pages, last), onLast, `${last} with the totals`);
      assert.deepEqual(perPage(pages, `Seite ${n} von ${n}`), onLast);
      assert.deepEqual(perPage(pages, 'Seite 1 von'), pages.map(() => 0), 'no number on page 1');
      // below the last line, not over it: a grid container sized before pagination once put the totals two
      // repeated header rows too high, over the last lines (the text was still on the right page)
      const last = pdfRuns(pdf).at(-1)!;
      const line = runAt(last, 'Suchindex neu aufgebaut');
      const net = runAt(last, 'Summe netto');
      assert.ok(line && net && net.y > line.y + 4, `the totals start below the last line: ${net?.y.toFixed(1)}mm vs ${line?.y.toFixed(1)}mm`);
    } finally {
      await p.close();
    }
  });

  await check('the payment code: the QR Code carries the EPC transfer of the amount due (EPC069-12: BCD, 002, UTF-8, SCT, BIC, name, IBAN, EUR amount, remittance) - read back from the drawn symbol by an independent decoder, error level M, version 13 or below', async () => {
    const total = await page.evaluate(() => (globalThis as any).df$.shadcn.invoice.totals('#inv-de').total as string);
    assert.deepEqual((await totalsOf(page, 'inv-de')).at(-1), ['Rechnungsbetrag', `${total.replace('.', ',').replace(/\B(?=(\d{3})+,)/g, '.')} €`]);
    const expected = `BCD\n002\n1\nSCT\nBYLADEM1001\nBeispiel GmbH\nDE02120300000000202051\nEUR${total}\n\n\nRechnung 2026-0142`;
    const code = page.locator('#inv-de .invoice-payment > .qr-code');
    const shown = await code.evaluate((el: any) => ({ value: el.dataset.value, ecc: el.dataset.ecc, hidden: el.hidden, state: el.api.getState() }));
    assert.equal(shown.value, expected);
    assert.equal(shown.ecc, 'M');
    assert.equal(shown.hidden, false, 'shown');
    assert.equal(shown.state.name, 'default', 'the QR Code drew it');
    // the symbol at 4 px per module, as the QR Code's own e2e reads it
    await code.evaluate((el: any, n: number) => el.style.setProperty('--qr-code-size', `${(n + 8) * 4}px`), shown.state.config.moduleCount);
    const wasm = readFileSync(fileURLToPath(import.meta.resolve('zxing-wasm/reader/zxing_reader.wasm')));
    await prepareZXingModule({ overrides: { wasmBinary: new Uint8Array(wasm).buffer }, fireImmediately: true });
    const png = await page.locator('#inv-de .qr-code-symbol svg').screenshot({ animations: 'disabled' });
    const [read] = await readBarcodes(png, { formats: ['QRCode'], tryHarder: true, maxNumberOfSymbols: 1, textMode: 'Plain' });
    assert.ok(read?.isValid, `the decoder reads the symbol: ${read?.error ?? 'nothing found'}`);
    assert.equal(read.text, expected, 'the decoded text is the transfer');
    const meta = JSON.parse(read.extra) as { ECLevel: string; Version: string | number };
    assert.equal(meta.ECLevel, 'M');
    assert.ok(Number(meta.Version) <= 13, `version ${meta.Version}`);
    await code.evaluate((el: any) => el.style.removeProperty('--qr-code-size'));
  });

  await check('the payment code follows the invoice: a changed line changes its amount, a changed data-iban updates it by itself; another currency, nothing due or wrong bank data hide it - only the wrong bank data is named, under the totals and as paymentError', async () => {
    const run = (fn: string) =>
      page.evaluate(async (body) => {
        const el = document.getElementById('inv-de') as any;
        const heard = new Promise<any>((done) => el.addEventListener('invoice-totals', (e: any) => done(e.detail), { once: true }));
        new Function('el', body)(el);
        const detail = await heard;
        const code = el.querySelector('.invoice-payment > .qr-code');
        return { payment: detail.payment, paymentError: detail.paymentError, total: detail.totals?.total, value: code.dataset.value, hidden: code.hidden, last: el.querySelector('.invoice-totals tr:last-child').className };
      }, fn);
    const first = await run("el.querySelector('tbody tr').dataset.quantity = '2'");
    assert.ok(first.value.endsWith(`\nEUR${first.total}\n\n\nRechnung 2026-0142`), first.value);
    assert.equal(first.payment, first.value);
    await run("el.querySelector('tbody tr').dataset.quantity = '1'");
    const usd = await run("el.api.setState('default', { currency: 'USD' })");
    assert.deepEqual([usd.hidden, usd.value, usd.payment, usd.last], [true, '', '', 'invoice-total']);
    assert.match(usd.paymentError, /in euro, the invoice in USD/);
    const eur = await run("el.api.setState('default', { currency: 'EUR' })");
    assert.equal(eur.hidden, false);
    const credit = await run("const r = el.querySelector('tbody tr'); r.dataset.price = '-99999.00'");
    assert.deepEqual([credit.hidden, credit.paymentError, credit.last], [true, 'payment code: nothing is due', 'invoice-total']);
    await run("el.querySelector('tbody tr').dataset.price = '240.00'");
    // the attribute alone: the invoice observes its bank data
    const wrong = await run("el.dataset.iban = 'DE02 1203 0000 0000 2020 52'");
    assert.deepEqual([wrong.hidden, wrong.last], [true, 'invoice-error']);
    assert.match(wrong.paymentError, /IBAN "DE02 1203 0000 0000 2020 52" is no IBAN/);
    assert.equal(await page.textContent('#inv-de .invoice-totals tr:last-child th'), wrong.paymentError, 'named under the totals');
    const fixed = await run("el.dataset.iban = 'DE02 1203 0000 0000 2020 51'");
    assert.deepEqual([fixed.hidden, fixed.last, fixed.paymentError], [false, 'invoice-total', '']);
    assert.equal(fixed.value, first.value.replace(/EUR[\d.]+/, `EUR${fixed.total}`), 'the same code as before the changes');
  });

  await check('epc(): the guideline\'s own example (EPC069-12 2.3, V2); IBAN check digits; BIC 8 or 11; the amount 0.01 to 999999999.99 with two decimals at most; 70 / 140 characters; no line break; 331 bytes - a value the code cannot carry throws', async () => {
    const r = await page.evaluate(() => {
      const epc = (globalThis as any).df$.shadcn.invoice.epc as (t: Record<string, unknown>) => string;
      const t = (x: Record<string, unknown>) => {
        try {
          return epc({ iban: 'DE02120300000000202051', name: 'Beispiel GmbH', amount: '1.00', ...x });
        } catch (e) {
          return `throws: ${(e as Error).message}`;
        }
      };
      return {
        guideline: t({ name: "François D'Alsace S.A.", iban: 'FR1420041010050500013M02606', amount: '12.3', remittance: 'Client:Marie Louise La Lune' }),
        spaced: t({ iban: 'de02 1203 0000 0000 2020 51', bic: 'byladem1' }),
        bare: t({}),
        checkDigits: t({ iban: 'DE03120300000000202051' }),
        bic9: t({ bic: 'BYLADEM10' }),
        min: t({ amount: '0.01' }),
        zero: t({ amount: '0.00' }),
        max: t({ amount: 999999999.99 }),
        over: t({ amount: '1000000000.00' }),
        threeZeros: t({ amount: '12.300' }),
        threeDigits: t({ amount: '12.345' }),
        comma: t({ amount: '12,30' }),
        name70: t({ name: 'n'.repeat(70) }).split('\n')[5].length,
        name71: t({ name: 'n'.repeat(71) }),
        noName: t({ name: '  ' }),
        text141: t({ remittance: 'r'.repeat(141) }),
        newline: t({ remittance: 'a\nb' }),
        bytes: t({ name: '😀'.repeat(70), remittance: '€'.repeat(140) }),
      };
    });
    assert.equal(r.guideline, "BCD\n002\n1\nSCT\n\nFrançois D'Alsace S.A.\nFR1420041010050500013M02606\nEUR12.30\n\n\nClient:Marie Louise La Lune");
    assert.equal(r.spaced, 'BCD\n002\n1\nSCT\nBYLADEM1\nBeispiel GmbH\nDE02120300000000202051\nEUR1.00', 'normalized; the last filled element ends the text');
    assert.equal(r.bare, 'BCD\n002\n1\nSCT\n\nBeispiel GmbH\nDE02120300000000202051\nEUR1.00', 'no BIC: an empty line');
    assert.match(r.checkDigits, /^throws: payment code: IBAN "DE03120300000000202051" is no IBAN/);
    assert.match(r.bic9, /^throws: payment code: BIC "BYLADEM10" is no BIC/);
    assert.ok(r.min.endsWith('\nEUR0.01'));
    assert.match(r.zero, /^throws: payment code: amount 0.00 is outside 0.01 to 999999999.99 euro/);
    assert.ok(r.max.endsWith('\nEUR999999999.99'));
    assert.match(r.over, /^throws: .*outside/);
    assert.ok(r.threeZeros.endsWith('\nEUR12.30'));
    assert.match(r.threeDigits, /^throws: .*two decimals at most/);
    assert.match(r.comma, /^throws: .*no amount in euro/);
    assert.equal(r.name70, 70);
    assert.match(r.name71, /^throws: payment code: the name has 71 characters, at most 70/);
    assert.match(r.noName, /^throws: payment code: the beneficiary name is missing/);
    assert.match(r.text141, /^throws: payment code: the remittance has 141 characters, at most 140/);
    assert.match(r.newline, /^throws: payment code: the remittance holds a line break/);
    assert.match(r.bytes, /^throws: payment code: \d+ bytes, at most 331/);
  });

  await check('no page errors', async () => {
    assert.deepEqual(errors, []);
  });

  await check('render(): the markup of the state, 1:1', async () => {
    await assertRenderContract(page, '.invoice[id]', ['default']);
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`invoice.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('invoice.e2e: all checks passed');
