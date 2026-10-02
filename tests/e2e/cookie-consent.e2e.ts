import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: a consent banner is only worth its promise - nothing optional runs or
 * loads before an explicit choice, edits are a draft until saved, choices are
 * versioned and fail closed, and withdrawal really unloads. These checks drive
 * the real dist/ files (ported from the contributed standalone suite): states,
 * draft vs commit, once-only script execution, iframe grant and unload, cookie
 * removal, persistence and its failure modes, cross-tab sync, dynamic resources,
 * CSP nonce, hostile metadata, destroy - and that the dialog is built from the
 * library's components, with dialog.js leaving it to its owner.
 */

const server = startServer();
const browser = await chromium.launch();
let failures = 0;

const check = async (label: string, fn: () => Promise<void>): Promise<void> => {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
  } catch (err) {
    failures++;
    console.error(`  ✗ ${label}\n    ${err instanceof Error ? err.message : err}`);
  }
};

type Api = Record<string, (...a: unknown[]) => unknown>;
const G = globalThis as unknown as { df$: ((s: string) => Array<HTMLElement & { api: Api }>) & { shadcn: { cookieConsent: Record<string, (...a: unknown[]) => unknown> } } } & Record<string, unknown>;

try {
  const context = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const fixture = `${server.url}/tests/e2e/cookie-consent.e2e-fixture.html`;
  const consent = () => page.evaluate(() => (globalThis as any).df$('#test')[0].api.getConsent()) as Promise<Record<string, unknown> & { acceptedServices: string[]; acceptedCategories: string[] }>;
  const api = (method: string, ...args: unknown[]) => page.evaluate(({ method, args }) => (globalThis as any).df$('#test')[0].api[method](...args), { method, args });
  const open = () => page.locator('#trigger').click();
  const ready = async () => { await page.goto(fixture); await page.waitForFunction(() => (globalThis as typeof G).df$?.('#test')[0]?.api); };
  await ready();
  await page.evaluate(() => localStorage.clear());
  await ready();

  await check('built from the library: Dialog, Button, Select, Tabs, Checkbox, Badge - dialog.js leaves it to its owner', async () => {
    await api('setState', 'services');
    const r = await page.evaluate(() => {
      const d = document.querySelector('#test .cookie-consent-dialog')!;
      return {
        dialog: d.matches('dialog.dialog[data-init]') && !!d.querySelector('.dialog-content .dialog-title') && !!d.querySelector('.dialog-footer'),
        buttons: Array.from(d.querySelectorAll('.dialog-footer > .btn')).map((b) => b.getAttribute('data-variant')),
        select: d.querySelector('[data-cookie-language]')!.matches('select.select[data-size="sm"]'),
        tabs: d.querySelector('[role="tablist"]')!.matches('.tab-list[data-init]') && d.querySelectorAll('.tab-trigger[role="tab"]').length === 2,
        checkbox: d.querySelectorAll('.checkbox-item-block > input.checkbox[data-cookie-service]').length,
        badges: d.querySelectorAll('.badge').length > 0,
        close: d.querySelector('[data-cookie-action="close"]')!.matches('.btn[data-variant="ghost"][data-size="icon-sm"]'),
      };
    });
    assert.deepEqual(r, { dialog: true, buttons: ['outline', null, null], select: true, tabs: true, checkbox: 6, badges: true, close: true });
    // Accept and Reject weigh the same: identical computed look
    const look = (sel: string) => page.$eval(sel, (e) => { const s = getComputedStyle(e); return [s.backgroundColor, s.color, s.fontWeight, s.height].join(); });
    assert.equal(await look('#test [data-cookie-action="accept"]'), await look('#test [data-cookie-action="deny"]'));
    await api('setState', 'default');
  });

  await check('default: essentials only; unknown / disabled optional stay off; the essential script ran', async () => {
    assert.deepEqual((await consent()).acceptedServices, ['session']);
    assert.equal((await consent()).decisionMade, false);
    assert.equal(await page.evaluate(() => (globalThis as any).essentialRuns), 1);
    assert.equal(await page.evaluate(() => (globalThis as any).analyticsRuns ?? 0), 0);
    assert.equal(await page.evaluate(() => (globalThis as any).unknownRuns ?? 0), 0);
    assert.equal(await page.locator('iframe[title="Gated content"]').getAttribute('src'), null);
  });

  await check('every named state changes presentation, never consent; unknown throws', async () => {
    for (const name of ['open', 'preferences', 'services', 'default']) {
      await api('setState', name);
      assert.equal(((await api('getState')) as { name: string }).name, name);
      assert.equal(await page.locator('#test').getAttribute('data-state-name'), name);
      assert.deepEqual((await consent()).acceptedServices, ['session']);
    }
    assert.equal(await page.evaluate(() => { try { (globalThis as any).df$('#test')[0].api.setState('invalid'); return false; } catch { return true; } }), true);
  });

  await check('draft edits neither persist nor run; Escape discards them and focus returns to the trigger', async () => {
    await open();
    await page.locator('#test [data-cookie-category="functional"]').check();
    assert.equal(await page.evaluate(() => (globalThis as any).analyticsRuns ?? 0), 0);
    assert.deepEqual((await consent()).acceptedServices, ['session']);
    assert.equal(await page.evaluate(() => localStorage.getItem('consent:test')), null);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !(document.querySelector('#test .cookie-consent-dialog') as HTMLDialogElement).open);
    assert.deepEqual(await api('getDraft'), ['session']);
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'trigger');
  });

  await check('tab keys switch views; a partly chosen category is indeterminate; the language switches', async () => {
    await open();
    await page.locator('#test [role="tab"]').first().focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(((await api('getState')) as { name: string }).name, 'services');
    await page.locator('#test [data-cookie-service="analytics"]').check();
    assert.deepEqual(await api('getDraft'), ['analytics', 'session']);
    await api('setState', 'preferences');
    assert.equal(await page.locator('#test [data-cookie-category="functional"]').evaluate((el) => (el as HTMLInputElement).indeterminate), true);
    await page.locator('#test [data-cookie-language]').selectOption('de');
    assert.equal(await page.locator('#test .cookie-consent-title').innerText(), 'Datenschutz-Einstellungen');
    assert.deepEqual((await consent()).acceptedServices, ['session']);
  });

  await check('Save commits exactly the draft; the script runs once; categories derive from services; storage is minimal', async () => {
    await page.locator('#test [data-cookie-action="save"]').click();
    assert.deepEqual((await consent()).acceptedServices, ['analytics', 'session']);
    assert.deepEqual((await consent()).acceptedCategories, ['essential']);
    assert.equal(await page.evaluate(() => (globalThis as any).analyticsRuns), 1);
    await api('updateTagsActivation');
    await api('updateTagsActivation');
    assert.equal(await page.evaluate(() => (globalThis as any).analyticsRuns), 1);
    const stored = JSON.parse((await page.evaluate(() => localStorage.getItem('consent:test')))!);
    assert.equal(stored.schemaVersion, 1);
    assert.equal(stored.language, 'de');
    assert.equal('modalOpen' in stored, false);
  });

  await check('one-service iframe grant loads it; rejecting unloads it and removes the listed cookies', async () => {
    await page.locator('[data-cookie-allow]').click();
    assert.equal(await page.locator('iframe[title="Gated content"]').getAttribute('src'), `${server.url}/dist/components/cookie-consent/component-skill.md`);
    assert.deepEqual((await consent()).acceptedCategories, ['essential', 'functional']);
    await api('denyAll');
    assert.equal(await page.locator('iframe[title="Gated content"]').getAttribute('src'), null);
    assert.equal(await page.locator('[data-cookie-allow]').isVisible(), true);
    assert.equal(await page.evaluate(() => document.cookie.includes('test_analytics=')), false);
    assert.deepEqual((await consent()).acceptedServices, ['session']);
  });

  await check('a regrant never re-runs an executed script; acceptAll / denyAll flags stay coherent', async () => {
    await api('acceptAll');
    assert.equal(await page.evaluate(() => (globalThis as any).analyticsRuns), 1);
    assert.equal((await consent()).acceptAll, true);
    assert.equal((await consent()).denyAll, false);
    assert.equal((await consent()).acceptedServices.includes('disabled'), false);
    await api('denyAll');
    assert.equal((await consent()).acceptAll, false);
    assert.equal((await consent()).denyAll, true);
  });

  await check('a reload keeps the rejection without reopening; corrupt / old revision / expired / future records fail closed', async () => {
    await ready();
    assert.equal((await consent()).decisionMade, true);
    assert.equal(((await api('getState')) as { name: string }).name, 'default');
    const now = Date.now();
    for (const saved of [
      '{broken',
      JSON.stringify({ schemaVersion: 1, revision: 'old', decisionMade: true, language: 'en', updatedAt: now, acceptedServices: ['analytics'] }),
      JSON.stringify({ schemaVersion: 1, revision: 'r1', decisionMade: true, language: 'en', updatedAt: now - 181 * 86400000, acceptedServices: ['analytics'] }),
      JSON.stringify({ schemaVersion: 1, revision: 'r1', decisionMade: true, language: 'en', updatedAt: now + 86400000, acceptedServices: ['analytics'] }),
    ]) {
      await page.evaluate((value) => localStorage.setItem('consent:test', value), saved);
      await ready();
      assert.equal((await consent()).decisionMade, false);
      assert.deepEqual((await consent()).acceptedServices, ['session']);
    }
  });

  await check('a choice made in another tab applies here too and unloads frames', async () => {
    await api('acceptAll');
    const peer = await context.newPage();
    await peer.goto(fixture);
    await peer.waitForFunction(() => (globalThis as typeof G).df$?.('#test')[0]?.api);
    await peer.evaluate(() => (globalThis as any).df$('#test')[0].api.denyAll());
    await page.waitForFunction(() => ((globalThis as any).df$('#test')[0].api.getConsent() as { denyAll: boolean }).denyAll);
    assert.equal(await page.locator('iframe[title="Gated content"]').getAttribute('src'), null);
    await peer.close();
  });

  await check('a dynamically inserted inert resource runs only after an explicit grant; declarative hosts auto-init', async () => {
    await page.evaluate(() => {
      ((globalThis as any).df$('body') as unknown as { append: (h: string) => void }).append('<script type="text/plain" data-cookie-consent="ads">globalThis.dynamicRuns=(globalThis.dynamicRuns??0)+1;</script>');
      ((globalThis as any).df$('body') as unknown as { append: (h: string) => void }).append('<div id="dynamic" class="cookie-consent"><script type="application/json" data-cookie-consent-config>{"autoShow":false,"storage":null,"showFloatingButton":false,"cookieOrigins":[]}</script></div>');
    });
    await page.waitForFunction(() => (globalThis as any).df$('#dynamic')[0]?.api);
    assert.equal(await page.evaluate(() => (globalThis as any).dynamicRuns ?? 0), 0);
    await api('acceptService', 'ads');
    assert.equal(await page.evaluate(() => (globalThis as any).dynamicRuns), 1);
  });

  await check('an external module makes no request before consent; its CSP nonce survives; it activates once', async () => {
    let requests = 0;
    await page.route('**/unit-module.mjs', async (route) => {
      requests++;
      await route.fulfill({ contentType: 'text/javascript', body: 'globalThis.moduleRuns=(globalThis.moduleRuns??0)+1;' });
    });
    await page.evaluate(() => ((globalThis as any).df$('body') as unknown as { append: (h: string) => void }).append('<script type="text/plain" data-cookie-consent="other" data-consent-type="module" data-consent-src="/unit-module.mjs" nonce="unit-nonce"></script>'));
    await api('updateTagsActivation');
    assert.equal(requests, 0);
    await api('acceptService', 'other');
    await page.waitForFunction(() => (globalThis as any).moduleRuns === 1);
    assert.equal(requests, 1);
    assert.equal(await page.locator('script[src$="unit-module.mjs"]').evaluate((el) => (el as HTMLScriptElement).nonce), 'unit-nonce');
    await api('updateTagsActivation');
    assert.equal(requests, 1);
  });

  await check('a serialized host (the docs editor) reinitializes without duplicate dialogs', async () => {
    const result = await page.evaluate(() => {
      const original = (globalThis as any).df$('#dynamic')[0];
      const clone = original.cloneNode(true) as HTMLElement & { api?: unknown };
      clone.querySelectorAll('[data-ce-chrome]').forEach((n) => n.remove());
      original.remove();
      document.body.append(clone);
      (globalThis as any).df$.shadcn.cookieConsent.init();
      return { api: Boolean(clone.api), dialogs: clone.querySelectorAll('.cookie-consent-dialog').length };
    });
    assert.deepEqual(result, { api: true, dialogs: 1 });
  });

  await check('storage errors keep the choice in memory; hooks and events fire; hostile metadata stays text', async () => {
    const result = await page.evaluate(() => {
      const root = document.createElement('div');
      root.id = 'memory';
      document.body.append(root);
      let revokes = 0, errs = 0, changes = 0;
      root.addEventListener('cookie-consent:error', () => errs++);
      root.addEventListener('cookie-consent:change', () => changes++);
      const inst = (globalThis as any).df$.shadcn.cookieConsent.create(root, {
        autoShow: false, showFloatingButton: false, resourceRoot: root,
        storage: { getItem() { throw Error('denied'); }, setItem() { throw Error('quota'); }, removeItem() { throw Error('denied'); } },
        cookieOrigins: [{ id: 'service', name: '<img src=x onerror=alert(1)>', category: 'functional', description: '<script>alert(1)</script>', url: 'javascript:alert(1)', onRevoke() { revokes++; } }],
      }) as Api;
      inst.acceptAll(); inst.denyAll(); inst.setState('services');
      const value = { revokes, errs, changes, accepted: (inst.getConsent() as { acceptedServices: string[] }).acceptedServices, images: root.querySelectorAll('img').length, links: root.querySelectorAll('.cookie-consent-body a').length };
      inst.destroy();
      return value;
    });
    assert.equal(result.revokes, 1);
    assert.equal(result.changes, 2);
    assert.ok(result.errs >= 2);
    assert.deepEqual(result.accepted, []);
    assert.equal(result.images, 0);
    assert.equal(result.links, 0);
  });

  await check('destroy detaches listeners and observers; a removed host disposes itself', async () => {
    await page.evaluate(() => { const root = (globalThis as any).df$('#dynamic')[0]; (globalThis as any).detachedApi = root.api; root.remove(); });
    await page.waitForFunction(() => { try { ((globalThis as any).detachedApi as Api).open(); return false; } catch { return true; } });
    await api('destroy');
    assert.equal(await page.locator('#test .cookie-consent-dialog').count(), 0);
    await page.locator('#trigger').click();
    assert.equal(await page.locator('#test .cookie-consent-dialog').count(), 0);
  });

  await check('sizes 28 / 40 / 48rem with density 16 / 24 / 32px; corner + German; RTL; a long list scrolls', async () => {
    for (const [id, width, padding] of [['small', '448px', '16px'], ['medium', '640px', '24px'], ['large', '768px', '32px']]) {
      await page.evaluate((i) => (globalThis as any).df$(`#${i}`)[0].api.open(), id);
      assert.deepEqual(await page.locator(`#${id} .cookie-consent-dialog`).evaluate((el) => [getComputedStyle(el).maxWidth, getComputedStyle(el.firstElementChild!).paddingTop]), [width, padding]);
      await page.keyboard.press('Escape');
    }
    await page.locator('[data-cookie-consent-open="corner"]').click();
    await page.waitForTimeout(300); // the Dialog component's 200ms open animation (scale 0.98 → 1)
    assert.equal(await page.locator('#corner .cookie-consent-title').innerText(), 'Datenschutz-Einstellungen');
    // 1rem from the bottom-right; on the right the Dialog's scroll lock also
    // reserves the scrollbar gutter while it is modal
    const corner = await page.locator('#corner .cookie-consent-dialog').evaluate((el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return { margin: s.marginTop, right: s.right, bottom: s.bottom, gapBottom: Math.round(innerHeight - r.bottom), gapRight: Math.round(innerWidth - r.right) }; });
    assert.deepEqual([corner.margin, corner.right, corner.bottom, corner.gapBottom], ['0px', '16px', '16px', 16]);
    assert.ok(corner.gapRight >= 16 && corner.gapRight <= 32, `hugs the right edge (${corner.gapRight}px incl. the gutter)`);
    await page.keyboard.press('Escape');
    await page.locator('[data-cookie-consent-open="rtl"]').click();
    assert.equal(await page.locator('#rtl .cookie-consent-dialog').evaluate((el) => getComputedStyle(el).direction), 'rtl');
    await page.keyboard.press('Escape');
    await page.locator('[data-cookie-consent-open="long"]').click();
    await page.locator('#long [data-cookie-action="services"]').click();
    assert.equal(await page.locator('#long .cookie-consent-body').evaluate((el) => el.scrollHeight > el.clientHeight), true);
    await page.keyboard.press('Escape');
  });

  await check('texts and languages: overrides per language, French added through translations, English fallback, own-name picker', async () => {
    const i18n = (fn: string) => page.evaluate((f) => (globalThis as any).df$('#i18n')[0].api[f](), fn);
    await page.evaluate(() => (globalThis as any).df$('#i18n')[0].api.setState('open'));
    const read = () => page.evaluate(() => {
      const d = document.querySelector('#i18n .cookie-consent-dialog')!;
      return {
        lang: d.getAttribute('lang'),
        title: d.querySelector('.cookie-consent-title')!.textContent,
        accept: d.querySelector('[data-cookie-action="accept"]')!.textContent,
        deny: d.querySelector('[data-cookie-action="deny"]')!.textContent,
        options: Array.from(d.querySelectorAll('[data-cookie-language] option')).map((o) => [(o as HTMLOptionElement).value, o.textContent]),
      };
    });
    const en = await read();
    assert.deepEqual([en.lang, en.title, en.accept, en.deny], ['en', 'Cookies at Studio', 'Allow all', 'Reject optional']);
    assert.deepEqual(en.options, [['en', 'English'], ['de', 'Deutsch'], ['fr', 'Français']]);
    await page.locator('#i18n [data-cookie-language]').selectOption('de');
    const de = await read();
    assert.deepEqual([de.title, de.accept], ['Cookies bei Studio', 'Alle akzeptieren'], 'German overrides on top of the built-in German');
    await page.locator('#i18n [data-cookie-language]').selectOption('fr');
    const fr = await read();
    assert.deepEqual([fr.lang, fr.title, fr.accept, fr.deny], ['fr', 'Les cookies chez Studio', 'Tout autoriser', 'Reject optional'], 'keys French leaves out fall back to English');
    await page.evaluate(() => (globalThis as any).df$('#i18n')[0].api.setState('services'));
    const svc = await page.evaluate(() => [document.querySelector('#i18n [id$="service-support-description"]')!.textContent, document.querySelector('#i18n .cookie-consent-data')!.textContent]);
    assert.deepEqual(svc, ['Discuter avec nous.', 'Messages (fr)'], 'per-service texts by language');
    assert.equal((await i18n('getState') as { config: { language: string } }).config.language, 'fr');
    await page.keyboard.press('Escape');
    const rejected = await page.evaluate(() => {
      const root = document.createElement('div');
      document.body.append(root);
      try {
        (globalThis as any).df$.shadcn.cookieConsent.create(root, { storage: null, autoShow: false, defaultLanguage: 'it', cookieOrigins: [] });
        return false;
      } catch (err) { return String(err).includes('unsupported language it'); }
    });
    assert.equal(rejected, true, 'a default language without texts is refused');
  });

  await check('data-consent-placeholder="none": no generated placeholder - the page owns it; the frame loads once allowed', async () => {
    const before = await page.evaluate(() => {
      const f = document.getElementById('own-frame') as HTMLIFrameElement;
      return { wrapped: !!f.closest('.cookie-consent-embed'), hidden: f.hidden, src: f.getAttribute('src'), parent: f.parentElement!.id };
    });
    assert.deepEqual(before, { wrapped: false, hidden: true, src: null, parent: 'own-figure' });
    await page.evaluate(() => (globalThis as any).df$('#own-host')[0].api.acceptService('clip'));
    const after = await page.evaluate(() => { const f = document.getElementById('own-frame') as HTMLIFrameElement; return [f.hidden, f.getAttribute('src'), !!document.querySelector('#own-figure .cookie-consent-placeholder')]; });
    assert.deepEqual(after, [false, `${server.url}/dist/components/cookie-consent/component-skill.md`, false]);
    await page.evaluate(() => (globalThis as any).df$('#own-host')[0].api.denyAll());
    assert.equal(await page.$eval('#own-frame', (f) => [(f as HTMLIFrameElement).hidden, f.getAttribute('src')].join()), 'true,');
  });

  await check('reduced motion: no open transition; the page stays scroll-locked while the dialog is modal', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => (globalThis as any).df$('#small')[0].api.open());
    assert.equal(await page.locator('#small .cookie-consent-dialog').evaluate((el) => getComputedStyle(el).transitionDuration.split(',').every((d) => d.trim() === '0s')), true);
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).overflow), 'hidden', "the Dialog component's scroll lock");
    await page.keyboard.press('Escape');
  });

  await check('no page errors', async () => {
    assert.deepEqual(errors, []);
  });
  await check('banner: the first view is a non-modal bar along the bottom; Settings reopens it as the modal; a decision closes it', async () => {
    const r = await page.evaluate(async () => {
      const host = document.getElementById('banner') as any;
      host.api.setState('open');
      await new Promise((res) => setTimeout(res, 50));
      const d = host.querySelector('.cookie-consent-dialog') as HTMLDialogElement;
      const box = d.getBoundingClientRect();
      const bar = { open: d.open, modal: d.matches(':modal'), pos: getComputedStyle(d).position, bottom: Math.round(innerHeight - box.bottom), full: Math.abs(box.width - document.documentElement.clientWidth) < 2 };
      (host.querySelector('[data-cookie-action="preferences"]') as HTMLElement).click();
      await new Promise((res) => setTimeout(res, 50));
      const settings = { open: d.open, modal: d.matches(':modal'), view: host.api.getState().name };
      (host.querySelector('[data-cookie-action="deny"]') as HTMLElement).click();
      await new Promise((res) => setTimeout(res, 50));
      return { bar, settings, closed: !d.open };
    });
    assert.deepEqual(r.bar, { open: true, modal: false, pos: 'fixed', bottom: 0, full: true });
    assert.deepEqual(r.settings, { open: true, modal: true, view: 'preferences' });
    assert.equal(r.closed, true);
  });

} finally {
  await browser.close();
  server.stop?.();
}

if (failures) {
  console.error(`\ncookie-consent.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('cookie-consent.e2e: all checks passed');
