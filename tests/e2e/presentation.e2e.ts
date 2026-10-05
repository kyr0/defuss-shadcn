import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from './server.ts';
import { assertRenderContract } from './lib/render-contract.ts';

/**
 * Why: E2E smoke test for the shipped presentation component. Loads the
 * fixture (every documented configuration: default deck, slide chrome,
 * art-direction overrides, data-loop ring) over HTTP in a real browser and
 * verifies the CSS applied, the entrance REPLAY through the shared motion
 * vocabulary, the runtime wiring (keyboard/click/hash/state API), the counter
 * and the ddf$ alias - the same files consumers copy from dist/, unmodified.
 * The full entrance vocabulary itself is pinned by motion.e2e.ts; this file
 * only pins what the DECK must do with it (settle on load, replay on activate).
 */

const FIXTURE = '/tests/e2e/presentation.e2e-fixture.html';
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
  const page = await browser.newPage();
  await page.goto(`${server.url}${FIXTURE}`);

  await check('presentation.js initialized every deck (data-init)', async () => {
    await page.waitForFunction(
      () => document.querySelectorAll('.presentation:not([data-init])').length === 0,
    );
  });

  await check('presentation.css applied (relative mount, absolute fixed-size slides)', async () => {
    const deckPos = await page.$eval('#deck', (el) => getComputedStyle(el).position);
    assert.equal(deckPos, 'relative');
    const slide = await page.$eval('#deck .slide', (el) => {
      const cs = getComputedStyle(el);
      return { pos: cs.position, w: cs.width, h: cs.height };
    });
    assert.equal(slide.pos, 'absolute');
    assert.equal(slide.w, '1600px');
    assert.equal(slide.h, '900px');
  });

  await check('artboard scale computed uniformly into the mount', async () => {
    const scale = await page.$eval('#custom', (el) => {
      const rect = el.getBoundingClientRect();
      const declared = parseFloat(el.style.getPropertyValue('--presentation-scale'));
      const expected = Math.min(rect.width / 1024, rect.height / 768);
      return { declared, expected };
    });
    assert.ok(
      Math.abs(scale.declared - scale.expected) < 0.01,
      `--presentation-scale ${scale.declared} ≠ expected ${scale.expected}`,
    );
  });

  await check('initial activation: first slide visible, rest inert + aria-hidden', async () => {
    const state = await page.evaluate(() => {
      const slides = Array.from(document.querySelectorAll<HTMLElement>('#deck [data-slide]'));
      return slides.map((s) => ({
        active: s.hasAttribute('data-active'),
        inert: s.inert,
        hidden: s.getAttribute('aria-hidden'),
      }));
    });
    assert.deepEqual(state, [
      { active: true, inert: false, hidden: 'false' },
      { active: false, inert: true, hidden: 'true' },
      { active: false, inert: true, hidden: 'true' },
    ]);
  });

  await check('authored start slide wins for the loop deck', async () => {
    const idx = await page.$eval('#loopy', (el) => el.dataset.currentSlide);
    assert.equal(idx, '1');
  });

  // entrances are the SHARED motion vocabulary (motion.e2e.ts pins the full
  // fifteen); here only the deck's obligations: settle on load, replay on
  // activation, hide inactive slides via visibility (not entrance state).
  await check('entrances settle on load: clip channel opens, opacity channel reaches authored value', async () => {
    // wipe animates ONLY clip-path (the eyebrow's authored opacity:0.7 stays
    // untouched); the title's up+fade composite settles opacity to its
    // authored 1 - fill:both holds both without touching un-animated channels
    await page.waitForFunction(
      () => {
        const eyebrow = getComputedStyle(document.querySelector('#s1 [data-df-entrance="wipe"]')!);
        const title = getComputedStyle(document.querySelector('#s1 [data-df-entrance="up"]')!);
        return /^inset\(0px 0% 0px 0px\)$/.test(eyebrow.clipPath) && title.opacity === '1';
      },
      undefined,
      { timeout: 4000 },
    );
  });

  await check('inactive slides are hidden by the slide itself (visibility)', async () => {
    const v = await page.$eval('#s3', (el) => getComputedStyle(el).visibility);
    assert.equal(v, 'hidden');
  });

  await check('slide chrome: slash counter filled per activation, header line styled', async () => {
    const text = await page.$eval('#s1 .presentation-slide-number', (el) => el.textContent);
    assert.equal(text, '01⁄03', 'NN⁄NN with the fraction slash');
    const header = await page.$eval('#s2 .presentation-header', (el) => {
      const cs = getComputedStyle(el);
      const scale = parseFloat(getComputedStyle(el.closest('.presentation')!).getPropertyValue('--presentation-scale')) || 1;
      return { pos: cs.position, rule: parseFloat(cs.borderBottomWidth), scale };
    });
    assert.equal(header.pos, 'absolute');
    // slides scale via CSS zoom: the 1px hairline snaps to whole DEVICE
    // pixels, so read it back in device px (rule × scale) - one pixel, at most
    const device = header.rule * header.scale;
    assert.ok(device > 0 && device <= Math.max(1, header.scale) + 0.01, `hairline under the section label (got ${header.rule}px at scale ${header.scale})`);
  });

  await check('stagger under the runtime: activation replays graded delays', async () => {
    await page.evaluate(() => (document.querySelector('#deck') as HTMLElement).api!.setState('default', { index: 2 }));
    const ms = await page.evaluate(() =>
      Array.from(document.querySelectorAll('#vocab > li')).map(
        (el) => Math.round(parseFloat(getComputedStyle(el).animationDelay) * 1000),
      ),
    );
    assert.deepEqual(ms, [0, 120, 240, 360, 480]);
  });

  await check('entrances replay on activation: draw-in restarts and settles to 0', async () => {
    await page.evaluate(() => (document.querySelector('#deck') as HTMLElement).api!.setState('default', { index: 1 }));
    // the replay (cancel → play) restarted the dash animation - in flight…
    const inFlight = await page.$eval('#s2 [data-df-draw]', (el) =>
      el.getAnimations().some((a) => a.playState === 'running'),
    );
    assert.ok(inFlight, 'draw animation should be running right after activation');
    // …and it settles to the visible state
    await page.waitForFunction(
      () => getComputedStyle(document.querySelector('#s2 [data-df-draw]')!).strokeDashoffset === '0px',
      undefined,
      { timeout: 6000 },
    );
  });

  await check('counter animates to its target on activation', async () => {
    await page.evaluate(() => (document.querySelector('#deck') as HTMLElement).api!.setState('default', { index: 0 }));
    await page.waitForFunction(
      () => document.querySelector('#s1 [data-count]')!.textContent === '42',
      undefined,
      { timeout: 4000 },
    );
  });

  await check('chrome mirrors the live index (counter text + progress value + disabled bounds)', async () => {
    const chrome = await page.evaluate(() => {
      const deck = document.querySelector('#deck')!;
      return {
        counter: deck.querySelector('.presentation-counter')!.textContent,
        progress: deck.querySelector('progress.presentation-progress')!.getAttribute('value'),
        prevDisabled: (deck.querySelector('[data-presentation-action="prev"]') as HTMLButtonElement).disabled,
      };
    });
    assert.equal(chrome.counter, '1 / 3');
    assert.equal(chrome.progress, '1');
    assert.equal(chrome.prevDisabled, true, 'prev disabled at the first slide (no data-loop)');
  });

  // -- keyboard (the deck's primary surface) --------------------------------
  await check('keyboard: ArrowRight / ArrowLeft / Home / End drive the focused deck', async () => {
    await page.focus('#deck');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.$eval('#deck', (el) => el.dataset.currentSlide), '1');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft'); // already at 0 - clamped, not wrapped
    assert.equal(await page.$eval('#deck', (el) => el.dataset.currentSlide), '0');
    await page.keyboard.press('End');
    assert.equal(await page.$eval('#deck', (el) => el.dataset.currentSlide), '2');
    await page.keyboard.press('Home');
    assert.equal(await page.$eval('#deck', (el) => el.dataset.currentSlide), '0');
  });

  await check('keyboard: keys typed into a field never drive the deck', async () => {
    await page.focus('#deck');
    await page.keyboard.press('Home');
    await page.focus('#typing-field');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.type('n f');
    assert.equal(await page.$eval('#deck', (el) => el.dataset.currentSlide), '0', 'no slide change');
    assert.equal(await page.$eval('#deck', (el) => el.hasAttribute('data-notes')), false, 'no notes toggle');
    assert.equal(await page.$eval('#typing-field', (el: any) => el.value), 'n f', 'the letters were typed');
  });

  await check('keyboard: Space advances, N toggles notes, F toggles fullscreen', async () => {
    await page.focus('#deck');
    await page.keyboard.press('Space');
    assert.equal(await page.$eval('#deck', (el) => el.dataset.currentSlide), '1');
    await page.keyboard.press('n');
    assert.ok(await page.$eval('#deck', (el) => el.hasAttribute('data-notes')));
    await page.keyboard.press('n');
    assert.ok(!(await page.$eval('#deck', (el) => el.hasAttribute('data-notes'))));
    await page.keyboard.press('f');
    // either the native request resolved or the sandbox/denial fallback set it
    await page.waitForFunction(() => document.querySelector('#deck')!.hasAttribute('data-fullscreen'));
    await page.keyboard.press('f');
    await page.waitForFunction(() => !document.querySelector('#deck')!.hasAttribute('data-fullscreen'));
  });

  await check('keyboard: form fields and focused controls keep their keys', async () => {
    // focus the next-button inside #deck: Space on a focused control belongs to
    // the button, while arrows still drive the deck
    await page.focus('#deck [data-presentation-action="prev"]');
    await page.keyboard.press('ArrowRight'); // arrows still belong to the deck
    assert.equal(await page.$eval('#deck', (el) => el.dataset.currentSlide), '2');
  });

  await check('controls: next/prev buttons move the deck', async () => {
    // start mid-deck - next/prev are both enabled there (bounds are pinned
    // by the chrome check's disabled assertions instead)
    await page.evaluate(() => (document.querySelector('#deck') as HTMLElement).api!.setState('default', { index: 1 }));
    await page.click('#deck [data-presentation-action="next"]');
    assert.equal(await page.$eval('#deck', (el) => el.dataset.currentSlide), '2');
    await page.click('#deck [data-presentation-action="prev"]');
    assert.equal(await page.$eval('#deck', (el) => el.dataset.currentSlide), '1');
  });

  await check('data-loop wraps both directions on the ring deck', async () => {
    await page.focus('#loopy');
    await page.keyboard.press('ArrowRight'); // 1 → 2
    assert.equal(await page.$eval('#loopy', (el) => el.dataset.currentSlide), '2');
    await page.keyboard.press('ArrowRight'); // 2 → wrap → 0
    assert.equal(await page.$eval('#loopy', (el) => el.dataset.currentSlide), '0');
    await page.keyboard.press('ArrowLeft'); // 0 → wrap → 2
    assert.equal(await page.$eval('#loopy', (el) => el.dataset.currentSlide), '2');
  });

  await check('hash navigation activates the linked slide', async () => {
    await page.evaluate(() => {
      location.hash = 's1';
    });
    await page.waitForFunction(
      () => (document.querySelector('#deck') as HTMLElement).dataset.currentSlide === '0',
    );
    await page.evaluate(() => {
      location.hash = 's3';
    });
    await page.waitForFunction(
      () => (document.querySelector('#deck') as HTMLElement).dataset.currentSlide === '2',
    );
    await page.evaluate(() => {
      location.hash = '';
    });
  });

  // -- State API (AGENTS.md "State API"): agents drive states by name --------
  const setState = (id: string, state: string, config?: Record<string, unknown>) =>
    page.$eval(
      `#${id}`,
      (el, args) => (el as HTMLElement).api!.setState(args[0], args[1]),
      [state, config] as [string, Record<string, unknown> | undefined],
    );

  await check('state API: default state reported, config reflects the live slide', async () => {
    const state = await page.$eval('#deck', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'default');
    assert.equal(state.config.slide, 2, 'reflects the live index, not just setState');
  });

  await check('state API: setState("default", { index }) activates a slide', async () => {
    await setState('deck', 'default', { index: 0 });
    assert.equal(await page.$eval('#deck', (el) => el.dataset.currentSlide), '0');
    const state = await page.$eval('#deck', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.config.slide, 0);
  });

  await check('state API: setState("notes") / setState("fullscreen") set their attributes', async () => {
    await setState('deck', 'notes');
    assert.ok(await page.$eval('#deck', (el) => el.hasAttribute('data-notes')));
    await setState('deck', 'fullscreen');
    await page.waitForFunction(() => document.querySelector('#deck')!.hasAttribute('data-fullscreen'), undefined, { timeout: 4000 });
    const state = await page.$eval('#deck', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'fullscreen');
    assert.equal(state.config.notes, true);
  });

  await check('state API: bare setState("default") drops the modes', async () => {
    await setState('deck', 'default');
    assert.ok(!(await page.$eval('#deck', (el) => el.hasAttribute('data-notes'))));
    await page.waitForFunction(() => !document.querySelector('#deck')!.hasAttribute('data-fullscreen'));
  });

  await check('state API: unknown state names throw', async () => {
    const err = await page.evaluate(() => {
      try {
        (document.querySelector('#deck') as HTMLElement).api!.setState('nope');
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    });
    assert.ok(err && err.includes('unknown state'), `expected throw, got ${err}`);
  });

  // -- ddf$ shared-library alias (installed by core.js) ----------------------
  await check('ddf$: shared library alias installed by core', async () => {
    const ok = await page.evaluate(() => {
      const d = (globalThis as unknown as { ddf$?: Record<string, unknown> }).ddf$;
      return (
        !!d &&
        typeof d.abi === 'string' &&
        typeof d.presentation === 'function' &&
        typeof d.animateCount === 'function' &&
        typeof d.revealAttr === 'function' &&
        typeof d.clampIndex === 'function'
      );
    });
    assert.ok(ok, 'ddf$ missing or incomplete');
  });

  await check('ddf$.presentation(el) scope navigates through the bound api', async () => {
    const idx = await page.evaluate(() => {
      const scope = (globalThis as unknown as { ddf$: { presentation: (el: Element) => { first(): number; next(): number; index(): number } } })
        .ddf$;
      const s = scope.presentation(document.querySelector('#deck')!);
      s.first();
      s.next();
      return s.index();
    });
    assert.equal(idx, 1);
  });

  await check('ddf$.revealAttr matches the authored attribute contract (shared motion vars)', async () => {
    const attr = await page.evaluate(() =>
      (globalThis as unknown as { ddf$: { revealAttr: (d: string, ms?: number) => Record<string, string> } }).ddf$.revealAttr('wipe', 300),
    );
    assert.deepEqual(attr, { 'data-df-entrance': 'wipe', style: '--df-motion-delay:300ms' });
  });

  await check('ddf$ exposes the motion controller (entrance/draw)', async () => {
    const ok = await page.evaluate(() => {
      const d = (globalThis as unknown as { ddf$?: Record<string, unknown> }).ddf$;
      return typeof d?.entrance === 'function' && typeof d?.draw === 'function';
    });
    assert.ok(ok, 'ddf$.entrance / ddf$.draw missing');
  });

  await check('df$.shadcn registry carries presentationApi + presentationStates', async () => {
    const ok = await page.evaluate(() => {
      const ns = (globalThis as unknown as { df$: { shadcn: Record<string, unknown> } }).df$.shadcn;
      return (
        !!ns.presentationApi &&
        Array.isArray(ns.presentationStates) &&
        (ns.presentationStates as string[]).join(',') === 'default,notes,fullscreen'
      );
    });
    assert.ok(ok, 'presentation registry globals missing');
  });

  await check('MutationObserver auto-initializes a deck added dynamically', async () => {
    await page.evaluate(() => {
      const el = document.createElement('section');
      el.className = 'presentation';
      el.id = 'dynamic';
      el.innerHTML = '<section class="slide" data-slide data-theme="ink"><h1>Later</h1></section>';
      document.body.append(el);
    });
    await page.waitForFunction(
      () => !!(document.querySelector('#dynamic') as HTMLElement | null)?.api,
      undefined,
      { timeout: 4000 },
    );
  });
  await check('slide transitions: leaving slide plays its out-animation, arriving slide its in-animation', async () => {
    const t = await page.evaluate(() => {
      const deck = document.querySelector('#anim-deck') as HTMLElement;
      deck.api!.setState('default', { index: 1 });
      const a1 = document.querySelector('#a1') as HTMLElement;
      const a2 = document.querySelector('#a2') as HTMLElement;
      return {
        leaving: a1.hasAttribute('data-leaving'),
        leavingVisible: getComputedStyle(a1).visibility,
        arriving: a2.hasAttribute('data-active'),
        inAnims: a2.getAnimations().length,
        outAnims: a1.getAnimations().length,
      };
    });
    assert.ok(t.leaving && t.leavingVisible === 'visible', 'the leaving slide stays visible (data-leaving) during its out-animation');
    assert.ok(t.arriving, 'the arriving slide is active at once');
    assert.ok(t.inAnims > 0 && t.outAnims > 0, `both slides animate (in ${t.inAnims}, out ${t.outAnims})`);
    await page.waitForFunction(() => !document.querySelector('#a1')!.hasAttribute('data-leaving'), undefined, { timeout: 3000 });
    assert.equal(await page.$eval('#a1', (el) => getComputedStyle(el).visibility), 'hidden');
  });

  await check('components on a slide use the slide surface (tokens re-pointed per data-theme)', async () => {
    const c = await page.$eval('#a2-cell', (el) => {
      const cs = getComputedStyle(el);
      return { fg: cs.color, slideFg: getComputedStyle(el.closest('[data-slide]')!).color };
    });
    assert.equal(c.fg, c.slideFg, '--foreground on a paper slide is the paper foreground');
  });

  await check('curtain (blocksIn): colour contrasts with both slides, flip under the cover', async () => {
    const c = await page.evaluate(async () => {
      const deck = document.querySelector('#anim-deck') as HTMLElement;
      deck.api!.setState('default', { index: 2 });
      await new Promise((r) => setTimeout(r, 150));
      const overlay = document.querySelector('#a2 [data-df-anim-blocks]') as HTMLElement | null;
      const block = overlay?.firstElementChild as HTMLElement | undefined;
      return {
        covered: !!overlay,
        stillActive: document.querySelector('#a2')!.hasAttribute('data-active'),
        block: block ? getComputedStyle(block).backgroundColor : '',
        ink: getComputedStyle(document.querySelector('#a1')!).backgroundColor,
        paper: getComputedStyle(document.querySelector('#a2')!).backgroundColor,
      };
    });
    assert.ok(c.covered, 'blocksIn covers the LEAVING slide');
    assert.ok(c.stillActive, 'the flip waits under the cover');
    assert.notEqual(c.block, c.ink, 'the declared ink-coloured curtain was replaced (it would vanish on the ink slide)');
    assert.notEqual(c.block, c.paper, 'the curtain differs from the paper slide too');
    await page.waitForFunction(() => document.querySelector('#a3')!.hasAttribute('data-active')
      && !document.querySelector('#a2 [data-df-anim-blocks]'), undefined, { timeout: 4000 });
  });

  await check('autoplay video runs only while its slide is on stage', async () => {
    await page.waitForFunction(() => !(document.querySelector('#a3-video') as HTMLVideoElement).paused, undefined, { timeout: 4000 });
    await page.evaluate(() => (document.querySelector('#anim-deck') as HTMLElement).api!.setState('default', { index: 0 }));
    await page.waitForFunction(() => (document.querySelector('#a3-video') as HTMLVideoElement).paused, undefined, { timeout: 4000 });
  });

  await check('render(): reproduces the authored markup 1:1 and every state', async () => {
    await assertRenderContract(page, '.presentation[id]', ['default','notes','fullscreen'], { runtimeAttrs: ['style','data-fullscreen','data-leaving','data-curtain'] });
  });

} finally {
  await browser.close();
  await server.stop();
}

if (failures) {
  console.error(`presentation.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('presentation.e2e: all checks passed');
