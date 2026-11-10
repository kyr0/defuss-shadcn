import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from '../server.ts';
import { assertRenderContract } from '../lib/render-contract.ts';
import { offlineJsdelivr } from '../lib/vendor-offline.ts';

/**
 * Why: E2E smoke test for the shipped language-switcher. The fixture holds every documented configuration (the
 * Combobox in its three displays, the Swap, dialects, names in the language shown, the flag shapes, scales, finishes,
 * overrides and none, the dark palette, a condensed footer, a defuss-i18n binding). It checks that only the
 * supported languages are listed and named in themselves and in the language shown, that a pick (click, keys,
 * choose()) changes data-value and fires language-change, that the Swap moves on with each click, that setState
 * changes the language quietly, that bind() drives and follows a defuss-i18n instance, and the render() contract.
 * flag-icons and defuss-i18n are served offline (vendor-offline.ts).
 */

const FIXTURE = '/tests/e2e/navigation/language-switcher.e2e-fixture.html';
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

/** what a switcher shows: its value, the trigger's name, the options (value + both names), the face's label */
const view = (page: Page, id: string) =>
  page.$eval(`#${id}`, (el) => ({
    value: el.getAttribute('data-value'),
    aria: el.querySelector('.combobox-trigger, .swap > input')?.getAttribute('aria-label') ?? null,
    face: el.querySelector('.combobox-value .language-switcher-label')?.textContent ?? null,
    options: [...el.querySelectorAll('.language-switcher-option')].map((o) => ({
      value: (o as HTMLElement).dataset.value,
      name: o.querySelector('.language-switcher-name')?.textContent,
      lang: o.querySelector('.language-switcher-name')?.getAttribute('lang'),
      alt: (o.querySelector('.language-switcher-alt') as HTMLElement)?.hidden ? '' : o.querySelector('.language-switcher-alt')?.textContent,
      selected: o.getAttribute('aria-selected'),
    })),
  }));
const isOpen = (page: Page, id: string) =>
  page.$eval(`#${id}`, (el) => !!el.querySelector('.combobox-content')?.matches(':popover-open'));
/** every language-change of the page, in order */
const changes = (page: Page) => page.evaluate(() => (globalThis as any).__changes as unknown[]);

try {
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await offlineJsdelivr(page);
  await page.addInitScript(() => {
    (globalThis as any).__changes = [];
    addEventListener('language-change', (e) => (globalThis as any).__changes.push({ id: (e.target as HTMLElement).id, ...(e as CustomEvent).detail }));
  });
  await page.goto(`${server.url}${FIXTURE}`);

  await check('every switcher initialized and drew its face (data-init, one data-ce-chrome child)', async () => {
    await page.waitForFunction(() => {
      const all = [...document.querySelectorAll('.language-switcher')];
      return all.length === 18 && all.every((el) => el.hasAttribute('data-init') && el.querySelectorAll(':scope > [data-ce-chrome]').length === 1);
    });
    // the Combobox's own runtime claimed the faces it was given
    await page.waitForFunction(() => [...document.querySelectorAll('.language-switcher-combobox')].every((c) => c.hasAttribute('data-init')));
    await page.waitForFunction(() => document.querySelector('#card')?.getAttribute('lang') === 'en');
  });

  await check('the Combobox lists only the supported languages, each in itself and in the language shown', async () => {
    const v = await view(page, 'ls1');
    assert.deepEqual(v.options.map((o) => o.value), ['en', 'de', 'fr', 'es', 'it', 'nl', 'pl', 'pt']);
    assert.deepEqual(v.options.find((o) => o.value === 'de'), { value: 'de', name: 'Deutsch', lang: 'de', alt: 'German', selected: 'false' });
    assert.deepEqual(v.options.find((o) => o.value === 'en'), { value: 'en', name: 'English', lang: 'en', alt: '', selected: 'true' });
    assert.equal(v.options.find((o) => o.value === 'fr')?.name, 'Français');
    assert.equal(v.aria, 'Language: English');
    assert.equal(v.face, 'English');
    // eight languages show the search field, four keep it quiet (still focusable for the keys)
    assert.equal(await page.$eval('#ls1 .combobox-search', (s) => s.hasAttribute('data-quiet')), false);
    assert.equal(await page.$eval('#ls2 .combobox-search', (s) => s.hasAttribute('data-quiet')), true);
    // a language is always chosen: no clear button, the chevron stays
    assert.equal(await page.$eval('#ls1 .combobox-clear', (b) => getComputedStyle(b).display), 'none');
    assert.notEqual(await page.$eval('#ls1 .combobox-chevron', (c) => getComputedStyle(c).display), 'none');
  });

  await check('a click picks a language: data-value, language-change, the names follow, focus stays on the trigger', async () => {
    await page.click('#ls1 .combobox-trigger');
    await page.waitForFunction(() => document.querySelector('#ls1 .combobox-content')?.matches(':popover-open'));
    await page.click('#ls1 .language-switcher-option[data-value="de"]');
    await page.waitForFunction(() => !document.querySelector('#ls1 .combobox-content')?.matches(':popover-open'));
    const v = await view(page, 'ls1');
    assert.equal(v.value, 'de');
    assert.equal(v.aria, 'Language: Deutsch');
    assert.equal(v.face, 'Deutsch');
    assert.deepEqual(v.options.find((o) => o.value === 'en'), { value: 'en', name: 'English', lang: 'en', alt: 'Englisch', selected: 'false' });
    assert.equal(v.options.find((o) => o.value === 'de')?.selected, 'true');
    assert.deepEqual((await changes(page)).at(-1), { id: 'ls1', value: 'de', previous: 'en', name: 'Deutsch', dir: 'ltr' });
    assert.equal(await page.evaluate(() => document.activeElement?.matches('#ls1 .combobox-trigger')), true);
    assert.equal(await page.$eval('#ls1', (el) => el.getAttribute('data-state-name')), 'default');
  });

  await check('the keys: Enter opens, typing filters by any name, Enter picks', async () => {
    // the list from the last pick has finished closing (the Combobox reopens only after its exit transition)
    await page.waitForFunction(() => getComputedStyle(document.querySelector('#ls1 .combobox-content')!).display === 'none');
    await page.focus('#ls1 .combobox-trigger');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.activeElement?.matches('#ls1 .combobox-search-input'));
    assert.equal(await page.$eval('#ls1', (el) => el.getAttribute('data-state-name')), 'open');
    await page.keyboard.type('Polnisch'); // Polish, named in the language shown (German)
    const shown = await page.$$eval('#ls1 .language-switcher-option:not([hidden])', (o) => o.map((x) => (x as HTMLElement).dataset.value));
    assert.deepEqual(shown, ['pl']);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('#ls1')?.getAttribute('data-value') === 'pl');
    assert.equal((await view(page, 'ls1')).aria, 'Language: Polski');
    assert.equal(await isOpen(page, 'ls1'), false);
  });

  await check('icon only: the flag alone, the name in the accessible name', async () => {
    const v = await view(page, 'ls2');
    assert.equal(v.face, null);
    assert.equal(v.aria, 'Language: Deutsch');
    assert.equal(await page.$$eval('#ls2 .combobox-value > .language-switcher-flag', (f) => f.length), 1);
    assert.equal(await page.$$eval('#ls2 .combobox-chevron', (c) => c.length), 0);
  });

  await check('code: the code beside a round flag (the 1:1 drawing)', async () => {
    assert.equal((await view(page, 'ls3')).face, 'FR');
    const flag = await page.$eval('#ls3 .combobox-value .language-switcher-flag', (f) => ({
      url: (f as HTMLElement).style.getPropertyValue('--language-switcher-flag'),
      radius: getComputedStyle(f).borderRadius,
      w: f.getBoundingClientRect().width,
      h: f.getBoundingClientRect().height,
    }));
    assert.match(flag.url, /flag-icons@7\.2\.3\/flags\/1x1\/fr\.svg/);
    assert.equal(flag.radius, '50%');
    assert.equal(flag.w, flag.h);
  });

  await check('the Swap moves on with each click (en, de, fr, en) and fires language-change each time', async () => {
    const swap = '#ls4 .swap > input';
    const visible = () =>
      page.$eval('#ls4 .swap', (s) => {
        const on = (s.querySelector(':scope > input') as HTMLInputElement).checked;
        return s.querySelector(on ? '.swap-on .language-switcher-label' : '.swap-off .language-switcher-label')?.textContent;
      });
    assert.equal(await visible(), 'English');
    assert.equal(await page.$eval(swap, (i) => i.getAttribute('aria-label')), 'Language: English - next: Deutsch');
    assert.equal(await page.$eval(swap, (i) => i.getAttribute('role')), 'button');
    const before = (await changes(page)).length;
    for (const [value, name] of [['de', 'Deutsch'], ['fr', 'Français'], ['en', 'English']]) {
      await page.click('#ls4 .swap');
      assert.equal(await page.$eval('#ls4', (el) => el.getAttribute('data-value')), value);
      assert.equal(await visible(), name);
    }
    const fired = (await changes(page)).slice(before) as { id: string; value: string }[];
    assert.deepEqual(fired.map((c) => `${c.id}:${c.value}`), ['ls4:de', 'ls4:fr', 'ls4:en']);
    // a checkbox in the role of a button: Enter turns it over too
    await page.focus(swap);
    await page.keyboard.press('Enter');
    assert.equal(await page.$eval('#ls4', (el) => el.getAttribute('data-value')), 'de');
    await page.keyboard.press('Space');
    assert.equal(await page.$eval('#ls4', (el) => el.getAttribute('data-value')), 'fr');
  });

  await check('the Menu: radio items in a Dropdown Menu - the arrows reach them, a click or Enter picks, the check moves, the menu stays open', async () => {
    const items = () =>
      page.$$eval('#ls17 .language-switcher-item', (els: Element[]) =>
        els.map((e) => `${(e as HTMLElement).dataset.value}:${e.getAttribute('role')}:${e.getAttribute('aria-checked')}:${e.querySelector('.language-switcher-name')?.textContent}`),
      );
    assert.deepEqual(await items(), ['en:menuitemradio:true:English', 'de:menuitemradio:false:Deutsch', 'fr:menuitemradio:false:Français']);
    const before = (await changes(page)).length;
    await page.click('#me');
    await page.waitForFunction(() => document.getElementById('me-menu')!.matches(':popover-open'));
    await page.click('#ls17 [data-value="de"]');
    assert.equal(await page.$eval('#ls17', (el) => el.getAttribute('data-value')), 'de');
    assert.equal(await page.$eval('#me-menu', (m) => m.matches(':popover-open')), true, 'the menu stays open');
    // the names follow the language shown: English is now named in German beside its own name
    assert.deepEqual((await items()).map((i: string) => i.split(':').slice(0, 3).join(':')), ['en:menuitemradio:false', 'de:menuitemradio:true', 'fr:menuitemradio:false']);
    // the keys: down from the checked item to Français, Enter picks it
    await page.focus('#ls17 [data-value="de"]');
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(() => (document.activeElement as HTMLElement).dataset.value), 'fr');
    await page.keyboard.press('Enter');
    assert.equal(await page.$eval('#ls17', (el) => el.getAttribute('data-value')), 'fr');
    const fired = (await changes(page)).slice(before) as { id: string; value: string }[];
    assert.deepEqual(fired.map((c) => `${c.id}:${c.value}`), ['ls17:de', 'ls17:fr']);
    await page.keyboard.press('Escape');
    // setState quietly checks another item
    await page.evaluate(() => (document.getElementById('ls17') as any).api.setState('default', { value: 'en' }));
    assert.equal(await page.$eval('#ls17 [aria-checked="true"]', (e) => (e as HTMLElement).dataset.value), 'en');
  });

  await check('the Swap, icon only: the faces hold flags only (round, large)', async () => {
    const faces = await page.$eval('#ls5 .swap', (s) => ({
      variant: s.getAttribute('data-variant'),
      labels: s.querySelectorAll('.language-switcher-label').length,
      flags: [...s.querySelectorAll('.language-switcher-flag')].map((f) => (f as HTMLElement).dataset.region),
      h: s.querySelector('.language-switcher-flag')!.getBoundingClientRect().height,
    }));
    assert.deepEqual(faces, { variant: 'flip', labels: 0, flags: ['gb', 'de'], h: 20 });
    // the plain (fade) Swap carries no variant
    assert.equal(await page.$eval('#ls15 .swap', (s) => s.hasAttribute('data-variant')), false);
  });

  await check('dialects: their CLDR names and their regions’ flags', async () => {
    const v = await view(page, 'ls6');
    const byValue = Object.fromEntries(v.options.map((o) => [o.value, o.name]));
    assert.equal(byValue['de-AT'], 'Österreichisches Deutsch');
    assert.equal(byValue['en-GB'], 'British English');
    assert.equal(byValue['pt-BR'], 'Português (Brasil)');
    assert.equal(byValue['fr-CA'], 'Français canadien');
    // the second name is the browser's (CLDR) - its wording varies between versions, its language does not
    assert.match(String(v.options.find((o) => o.value === 'en-US')?.alt), /Englisch/);
    const regions = await page.$$eval('#ls6 .language-switcher-option .language-switcher-flag', (f) => f.map((x) => (x as HTMLElement).dataset.region));
    assert.deepEqual(regions, ['gb', 'us', 'de', 'at', 'ch', 'pt', 'br', 'es', 'mx', 'fr', 'ca']);
  });

  await check('names in the language shown (data-names="ui"), each name in its own language and direction', async () => {
    const v = await view(page, 'ls7');
    const ja = v.options.find((o) => o.value === 'ja')!;
    assert.deepEqual(ja, { value: 'ja', name: 'Japanisch', lang: 'de', alt: '日本語', selected: 'false' });
    const ar = await page.$eval('#ls7 .language-switcher-option[data-value="ar"] .language-switcher-alt', (a) => [a.textContent, a.getAttribute('lang'), a.getAttribute('dir')]);
    assert.deepEqual(ar, ['العربية', 'ar', 'rtl']);
    await page.evaluate(() => (document.querySelector('#ls7') as any).api.setState('default', { value: 'fr' }));
    assert.equal((await view(page, 'ls7')).options.find((o) => o.value === 'ja')?.name, 'Japonais');
  });

  await check('flags: override, scale, shapes, finishes, none, a language without one, the dark palette', async () => {
    const flag = (id: string) =>
      page.$eval(`#${id} .combobox-value .language-switcher-flag`, (f) => {
        const cs = getComputedStyle(f);
        return {
          region: (f as HTMLElement).dataset.region ?? '',
          url: (f as HTMLElement).style.getPropertyValue('--language-switcher-flag'),
          w: f.getBoundingClientRect().width,
          h: f.getBoundingClientRect().height,
          outline: cs.outlineStyle,
          shadow: cs.boxShadow,
          gloss: getComputedStyle(f, '::after').backgroundImage,
          code: getComputedStyle(f, '::before').content,
          filter: getComputedStyle(f, '::after').filter,
        };
      });
    const us = await flag('ls8');
    assert.equal(us.region, 'us');
    assert.match(us.url, /\/1x1\/us\.svg/);
    assert.deepEqual([us.w, us.h, us.outline], [28, 28, 'solid']);
    const glossy = await flag('ls9');
    assert.match(glossy.gloss, /^linear-gradient.*url\(/);
    const shadow = await flag('ls10');
    assert.equal(shadow.h, 14);
    assert.ok(Math.abs(shadow.w - 14 * (4 / 3)) < 0.1, `4:3 (${shadow.w})`);
    assert.notEqual(shadow.shadow, 'none');
    assert.equal(await page.$$eval('#ls11 .language-switcher-flag', (f) => f.length), 0);
    const eo = await flag('ls12');
    assert.deepEqual([eo.region, eo.url, eo.code, eo.h], ['', '', '"EO"', 12]);
    assert.equal((await flag('ls13')).filter, 'brightness(0.92) saturate(0.95)');
    assert.equal((await flag('ls1')).filter, 'none');
    // a flag that fails to load leaves its code readable: ::before carries it under the image
    assert.equal((await flag('ls1')).code, '"PL"');
  });

  await check('the condensed footer: xs trigger, the list opens toward the start edge', async () => {
    assert.equal(await page.$eval('#ls14 .combobox-trigger', (t) => getComputedStyle(t).height), '28px');
    await page.click('#ls14 .combobox-trigger');
    await page.waitForFunction(() => document.querySelector('#ls14 .combobox-content')?.matches(':popover-open'));
    // measured after the opening scale settles
    await page.waitForFunction(() => document.querySelector('#ls14 .combobox-content')!.getAnimations().length === 0);
    const box = await page.$eval('#ls14', (el) => ({
      trigger: el.querySelector('.combobox-trigger')!.getBoundingClientRect().right,
      list: el.querySelector('.combobox-content')!.getBoundingClientRect().right,
    }));
    assert.ok(Math.abs(box.trigger - box.list) < 1, `the list ends where the trigger ends (${box.list} vs ${box.trigger})`);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#ls14 .combobox-content')?.matches(':popover-open'));
  });

  await check('a malformed tag (en_US) draws with the names it can find; the switchers after it initialize', async () => {
    assert.equal((await view(page, 'ls0')).face, 'English (US)');
    assert.equal(await page.$eval('#ls16', (el) => el.hasAttribute('data-init')), true);
  });

  await check('the State API: setState changes the language quietly, opens and closes the list, rejects unknown states', async () => {
    const before = (await changes(page)).length;
    await page.evaluate(() => (document.querySelector('#ls2') as any).api.setState('default', { value: 'es' }));
    assert.equal((await view(page, 'ls2')).aria, 'Language: Español');
    assert.deepEqual(await page.evaluate(() => (document.querySelector('#ls2') as any).api.getState().config), { value: 'es' });
    assert.equal((await changes(page)).length, before, 'no language-change from setState');
    await page.evaluate(() => (document.querySelector('#ls2') as any).api.setState('open'));
    await page.waitForFunction(() => document.querySelector('#ls2 .combobox-content')?.matches(':popover-open'));
    assert.equal(await page.$eval('#ls2', (el) => el.getAttribute('data-state-name')), 'open');
    await page.evaluate(() => (document.querySelector('#ls2') as any).api.setState('default'));
    assert.equal(await isOpen(page, 'ls2'), false);
    // a language the switcher does not offer changes nothing
    await page.evaluate(() => (document.querySelector('#ls2') as any).api.setState('default', { value: 'ja' }));
    assert.equal(await page.$eval('#ls2', (el) => el.getAttribute('data-value')), 'es');
    assert.equal(
      await page.evaluate(() => {
        try {
          (document.querySelector('#ls2') as any).api.setState('nope');
          return false;
        } catch {
          return true;
        }
      }),
      true,
    );
  });

  await check('the namespace: 107 CLD3 languages, names in any language, regions, choose()', async () => {
    const r = await page.evaluate(() => {
      const ls = (globalThis as any).df$.shadcn.languageSwitcher;
      const all = ls.languages();
      return {
        count: all.length,
        hebrew: all.find((l: { code: string }) => l.code === 'iw'),
        names: [ls.name('de-AT'), ls.name('ja', 'de'), ls.name('he'), ls.name('zh-Latn', 'en'), ls.name('haw')],
        regions: [ls.region('pt-BR'), ls.region('ca'), ls.region('eo'), ls.region('cy')],
        refused: ls.choose('ls3', 'ja'),
        chosen: ls.choose('ls3', 'de'),
      };
    });
    assert.equal(r.count, 107);
    assert.deepEqual(r.hebrew, { code: 'iw', english: 'Hebrew', native: 'עברית', region: 'il', dir: 'rtl' });
    assert.deepEqual(r.names, ['Österreichisches Deutsch', 'Japanisch', 'עברית', 'Chinese (Pinyin)', 'ʻŌlelo Hawaiʻi']);
    assert.deepEqual(r.regions, ['br', 'es-ct', '', 'gb-wls']);
    assert.deepEqual([r.refused, r.chosen], [false, true]);
    assert.deepEqual((await changes(page)).at(-1), { id: 'ls3', value: 'de', previous: 'fr', name: 'Deutsch', dir: 'ltr' });
  });

  await check('bind() with defuss-i18n: a pick sets the locale, a locale set elsewhere moves the switcher quietly', async () => {
    await page.click('#ls16 .combobox-trigger');
    await page.click('#ls16 .language-switcher-option[data-value="ar"]');
    await page.waitForFunction(() => document.querySelector('#card')?.getAttribute('lang') === 'ar');
    assert.equal(await page.$eval('#card', (c) => c.getAttribute('dir')), 'rtl');
    assert.equal(await page.textContent('#card-title'), 'مرحبًا بعودتك');
    // defuss-i18n translated the root's aria-label; the trigger's name follows
    await page.waitForFunction(() => document.querySelector('#ls16 .combobox-trigger')?.getAttribute('aria-label') === 'اللغة: العربية');
    const before = (await changes(page)).length;
    await page.click('#set-de');
    await page.waitForFunction(() => document.querySelector('#ls16')?.getAttribute('data-value') === 'de');
    assert.equal(await page.textContent('#card-title'), 'Willkommen zurück');
    await page.waitForFunction(() => document.querySelector('#ls16 .combobox-trigger')?.getAttribute('aria-label') === 'Sprache: Deutsch');
    assert.equal((await changes(page)).length, before, 'a locale set elsewhere fires no language-change');
    assert.equal(await page.evaluate(() => (globalThis as any).fixtureLocale.locale), 'de');
  });

  await check('no page errors', async () => {
    assert.deepEqual(errors, []);
  });

  // LAST: reloads the page (render contract - AGENTS.md "State API" step 8)
  await check('render() contract: the Combobox (default, open), the Swap and the Menu (default)', async () => {
    await assertRenderContract(page, '#ls1', ['default', 'open'], { runtimeOwned: '[data-ce-chrome]' });
    await assertRenderContract(page, '#ls4', ['default'], { runtimeOwned: '[data-ce-chrome]' });
    await assertRenderContract(page, '#ls17', ['default'], { runtimeOwned: '[data-ce-chrome]' });
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nlanguage-switcher e2e: all checks passed');
