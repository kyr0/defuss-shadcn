import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: the component's whole bet is that one real <input> under a row of slots
 * beats a box per digit — paste, autofill, selection and form submission stay
 * native, and a screen reader hears one field rather than six. These checks
 * type, paste, backspace and submit through the real control and assert the
 * slots follow, so a regression in the mirror shows up as a failure rather
 * than as boxes that quietly stop matching what the form will send.
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

try {
  const page = await browser.newPage({ viewport: { width: 900, height: 800 } });
  page.on('pageerror', (e) => {
    failures++;
    console.error(`  ✗ page error: ${e.message}`);
  });
  await page.goto(`${server.url}/tests/e2e/otp-input.e2e-fixture.html`);
  await page.waitForSelector('#otp-wrap-default .otp-input-slot');

  const slots = (wrap: string) =>
    page.evaluate(
      (w) =>
        Array.from(document.querySelectorAll(`${w} .otp-input-slot`)).map((s) => ({
          text: (s as HTMLElement).textContent ?? '',
          filled: s.hasAttribute('data-filled'),
          caret: s.hasAttribute('data-caret'),
        })),
      wrap,
    );
  const valueOf = (id: string) => page.evaluate((i) => (document.querySelector(i) as HTMLInputElement).value, id);

  await check('otp-input.js initialized the field (data-init, slots, input attributes)', async () => {
    const s = await page.evaluate(() => {
      const wrap = document.querySelector('#otp-wrap-default') as HTMLElement;
      const field = wrap.querySelector('input') as HTMLInputElement;
      return {
        init: wrap.dataset.init === '',
        slots: wrap.querySelectorAll('.otp-input-slot').length,
        inputmode: field.getAttribute('inputmode'),
        autocomplete: field.getAttribute('autocomplete'),
        maxlength: field.maxLength,
        slotsHidden: wrap.querySelector('.otp-input-slots')!.getAttribute('aria-hidden'),
      };
    });
    assert.equal(s.init, true, 'data-init not set');
    assert.equal(s.slots, 6, `default length is six slots, got ${s.slots}`);
    assert.equal(s.inputmode, 'numeric', 'digits should ask for the numeric keypad');
    assert.equal(s.autocomplete, 'one-time-code', 'SMS autofill needs one-time-code');
    assert.equal(s.maxlength, 6);
    assert.equal(s.slotsHidden, 'true', 'slots must be hidden from the a11y tree — the input is the control');
  });

  await check('the slots are a mirror: typing fills them left to right', async () => {
    await page.click('#otp-default');
    await page.keyboard.type('123');
    const s = await slots('#otp-wrap-default');
    assert.deepEqual(
      s.map((x) => x.text),
      ['1', '2', '3', '', '', ''],
      'slots must show what was typed',
    );
    assert.deepEqual(s.map((x) => x.filled), [true, true, true, false, false, false]);
    assert.equal(await valueOf('#otp-default'), '123', 'the field holds the whole value');
  });

  await check('the caret marks the next empty slot', async () => {
    const s = await slots('#otp-wrap-default');
    assert.equal(s[3].caret, true, 'the fourth slot should carry the caret');
    assert.equal(s.filter((x) => x.caret).length, 1, 'exactly one caret');
  });

  await check('backspace removes the last character', async () => {
    await page.keyboard.press('Backspace');
    assert.equal(await valueOf('#otp-default'), '12');
    const s = await slots('#otp-wrap-default');
    assert.deepEqual(s.map((x) => x.text), ['1', '2', '', '', '', '']);
  });

  await check('non-matching characters are rejected by the pattern', async () => {
    await page.keyboard.type('ab7');
    assert.equal(await valueOf('#otp-default'), '127', 'letters must not enter a digits field');
  });

  await check('a pasted code lands in one action', async () => {
    await page.evaluate(() => {
      const f = document.querySelector('#otp-default') as HTMLInputElement;
      f.value = '';
      f.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.click('#otp-default');
    // paste is a single input event carrying the whole string
    await page.evaluate(() => {
      const f = document.querySelector('#otp-default') as HTMLInputElement;
      f.value = '482913';
      f.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const s = await slots('#otp-wrap-default');
    assert.deepEqual(s.map((x) => x.text), ['4', '8', '2', '9', '1', '3'], 'a paste must fill every slot');
  });

  await check('reaching full length switches to the filled state and fires otp-complete', async () => {
    const fired = await page.evaluate(() => {
      const wrap = document.querySelector('#otp-wrap-alpha') as HTMLElement;
      return new Promise<string>((resolve) => {
        wrap.addEventListener('otp-complete', (e) => resolve((e as CustomEvent).detail.value), { once: true });
        const f = wrap.querySelector('input') as HTMLInputElement;
        f.value = 'A1B2';
        f.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
    assert.equal(fired, 'A1B2', 'otp-complete must carry the value');
    const state = await page.evaluate(() => (document.querySelector('#otp-wrap-alpha') as any).api.getState());
    assert.equal(state.name, 'filled');
  });

  await check('alphanumeric fields accept letters, digit fields do not', async () => {
    assert.equal(await valueOf('#otp-alpha'), 'A1B2');
  });

  await check('masked fields hide the characters but keep the value', async () => {
    await page.evaluate(() => {
      const f = document.querySelector('#otp-mask') as HTMLInputElement;
      f.value = '1234';
      f.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const s = await slots('#otp-wrap-mask');
    assert.deepEqual(s.map((x) => x.text), ['•', '•', '•', '•'], 'a masked slot shows a dot');
    assert.equal(await valueOf('#otp-mask'), '1234', 'the value itself is not masked');
  });

  await check('grouped fields draw a separator between groups', async () => {
    const n = await page.evaluate(
      () => document.querySelectorAll('#otp-wrap-grouped .otp-input-separator').length,
    );
    assert.equal(n, 1, `six digits in groups of three needs one separator, got ${n}`);
  });

  await check('state API: setState("invalid") marks the field', async () => {
    await page.evaluate(() => (document.querySelector('#otp-wrap-default') as any).api.setState('invalid'));
    const s = await page.evaluate(() => {
      const wrap = document.querySelector('#otp-wrap-default') as HTMLElement;
      return {
        flag: wrap.hasAttribute('data-invalid'),
        aria: wrap.querySelector('input')!.getAttribute('aria-invalid'),
      };
    });
    assert.equal(s.flag, true);
    assert.equal(s.aria, 'true', 'invalid must reach assistive technology, not just the border');
  });

  await check('state API: setState("default") clears the invalid marking', async () => {
    await page.evaluate(() => (document.querySelector('#otp-wrap-default') as any).api.setState('default'));
    const s = await page.evaluate(() => {
      const wrap = document.querySelector('#otp-wrap-default') as HTMLElement;
      return { flag: wrap.hasAttribute('data-invalid'), aria: wrap.querySelector('input')!.getAttribute('aria-invalid') };
    });
    assert.equal(s.flag, false);
    assert.equal(s.aria, null);
  });

  await check('state API: setState takes a value', async () => {
    await page.evaluate(() =>
      (document.querySelector('#otp-wrap-default') as any).api.setState('filled', { value: '246810' }),
    );
    assert.equal(await valueOf('#otp-default'), '246810');
    const s = await slots('#otp-wrap-default');
    assert.deepEqual(s.map((x) => x.text), ['2', '4', '6', '8', '1', '0']);
  });

  await check('state API: getState reflects the current state', async () => {
    const state = await page.evaluate(() => (document.querySelector('#otp-wrap-default') as any).api.getState());
    assert.equal(state.name, 'filled');
    assert.equal(state.config.value, '246810');
  });

  await check('state API: unknown state names throw', async () => {
    const threw = await page.evaluate(() => {
      try {
        (document.querySelector('#otp-wrap-default') as any).api.setState('sideways');
        return false;
      } catch {
        return true;
      }
    });
    assert.equal(threw, true);
  });

  await check('state API: registry globals expose api + declared states', async () => {
    const g = await page.evaluate(() => {
      const ns = (globalThis as any)._defussShadcn;
      return { hasApi: typeof ns.otpInputApi?.setState === 'function', states: ns.otpInputStates };
    });
    assert.equal(g.hasApi, true);
    assert.deepEqual(g.states, ['default', 'filled', 'invalid']);
  });

  await check('a disabled field cannot be typed into', async () => {
    const before = await valueOf('#otp-disabled');
    await page.click('#otp-wrap-disabled', { force: true });
    await page.keyboard.type('99');
    assert.equal(await valueOf('#otp-disabled'), before, 'a disabled field must reject input');
  });

  await check('the form submits one value, not one per digit', async () => {
    await page.evaluate(() => {
      const f = document.querySelector('#otp-form-field') as HTMLInputElement;
      f.value = '5678';
      f.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const entries = await page.evaluate(() =>
      Array.from(new FormData(document.querySelector('#otp-form') as HTMLFormElement).entries()).map(
        ([k, v]) => [k, String(v)],
      ),
    );
    assert.deepEqual(entries, [['otp', '5678']], `expected a single otp field, got ${JSON.stringify(entries)}`);
  });
} finally {
  await browser.close();
  server.stop?.();
}

if (failures) {
  console.error(`\notp-input.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('otp-input.e2e: all checks passed');
