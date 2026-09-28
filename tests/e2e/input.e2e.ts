import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';
import { assertLegibleDisabled } from './lib/disabled.ts';

/**
 * Why: input is CSS-only - verify the control box geometry (unsized default =
 * the ladder's md step, 36px) plus the
 * four native pseudo-states the sheet styles: disabled (0.5), readonly
 * (muted bg), aria-invalid (destructive border), focus (ring border).
 */
await cssSmoke('input', [
  {
    label: '.input is the md step by default (36px, 12px inline padding, 14px text)',
    selector: '#in-default',
    css: { height: '36px', padding: '0px 12px', 'font-size': '14px', 'border-top-width': '1px' },
  },
  {
    label: 'data-size="sm" shrinks to 32px/10px/13px',
    selector: '#in-sm',
    css: { height: '32px', padding: '0px 10px', 'font-size': '13px' },
  },
  {
    label: 'data-size="xs" shrinks to 28px/8px/12px',
    selector: '#in-xs',
    css: { height: '28px', padding: '0px 8px', 'font-size': '12px' },
  },
  {
    label: 'data-size="md" is the explicit 36px step',
    selector: '#in-md',
    css: { height: '36px', padding: '0px 12px', 'font-size': '14px' },
  },
  {
    label: 'data-size="lg" grows to 44px/16px/16px',
    selector: '#in-lg',
    css: { height: '44px', padding: '0px 16px', 'font-size': '16px' },
  },
  {
    label: 'data-size="xl" grows to 52px/20px/18px',
    selector: '#in-xl',
    css: { height: '52px', padding: '0px 20px', 'font-size': '18px' },
  },
  {
    label: 'disabled input stays legible: full --input border, muted surface + text, not-allowed',
    run: (page) => assertLegibleDisabled(page, { control: '#in-disabled', tokens: { 'border-top-color': '--input', 'background-color': '--muted', color: '--muted-foreground' } }),
  },
  {
    label: ':read-only renders the muted surface',
    run: async (page) => {
      const [def, ro] = await page.evaluate(() => [
        getComputedStyle(document.querySelector('#in-default')!).backgroundColor,
        getComputedStyle(document.querySelector('#in-readonly')!).backgroundColor,
      ]);
      assert.notEqual(def, ro, 'readonly uses a distinct (--muted) surface');
    },
  },
  {
    label: 'aria-invalid recolors the border to destructive',
    distinct: [
      { selector: '#in-default', prop: 'border-top-color' },
      { selector: '#in-invalid', prop: 'border-top-color' },
    ],
  },
  {
    label: ':focus draws the ring border (trusted click-focus)',
    run: async (page) => {
      await page.click('#in-default');
      await page.waitForTimeout(200); // border-color transitions 150ms
      const [blurred, focused] = await page.evaluate(() => {
        const def = document.querySelector<HTMLInputElement>('#in-default')!;
        const focusedBorder = getComputedStyle(def).borderTopColor;
        def.blur();
        return [getComputedStyle(def).borderTopColor, focusedBorder];
      });
      assert.notEqual(blurred, focused, 'focused border uses --ring, distinct from --input');
    },
  },
  {
    label: 'native in-field buttons (search "×", date/time picker icon) show the pointer cursor',
    run: async (page) => {
      const r = await page.evaluate(() => {
        // the pseudo-elements are not reachable through getComputedStyle -
        // assert the LOADED rule instead (CSSOM, nested rules walked), and
        // that the engine accepted both selectors (an unknown one would drop
        // the whole rule silently)
        const pseudos = ['::-webkit-search-cancel-button', '::-webkit-calendar-picker-indicator'];
        const found: Record<string, string> = {};
        const walk = (rules: CSSRuleList, parent = '') => {
          for (const rule of Array.from(rules)) {
            const style = (rule as CSSStyleRule).style;
            const sel = (rule as CSSStyleRule).selectorText ?? '';
            const full = sel.includes('&') ? sel.replaceAll('&', parent) : sel;
            if (style) for (const p of pseudos) if (full.includes(p)) found[p] = style.cursor;
            if ((rule as CSSGroupingRule).cssRules) walk((rule as CSSGroupingRule).cssRules, full || parent);
          }
        };
        for (const sheet of Array.from(document.styleSheets)) {
          try { walk(sheet.cssRules); } catch { /* cross-origin sheet */ }
        }
        const accepted = pseudos.map((p) => { try { document.querySelector('#in-search' + p); return true; } catch { return false; } });
        return { found, accepted };
      });
      assert.deepEqual(r.accepted, [true, true], 'engine understands both pseudo-elements');
      assert.equal(r.found['::-webkit-search-cancel-button'], 'pointer');
      assert.equal(r.found['::-webkit-calendar-picker-indicator'], 'pointer');
    },
  },
  {
    label: 'input group: the group draws the frame, the input inside is frameless and fills it',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const g = getComputedStyle(document.getElementById('ig-lead')!);
        const i = getComputedStyle(document.getElementById('ig-lead-input')!);
        return { gBorder: g.borderTopWidth, gHeight: g.height, iBorder: i.borderTopWidth, iShadow: i.boxShadow, iBg: i.backgroundColor };
      });
      assert.deepEqual(r, { gBorder: '1px', gHeight: '36px', iBorder: '0px', iShadow: 'none', iBg: 'rgba(0, 0, 0, 0)' });
    },
  },
  {
    label: 'input group: DOM order places addons - before the input = start, after = end',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const box = (id: string) => document.getElementById(id)!.getBoundingClientRect();
        const lead = box('ig-lead'), icon = box('ig-lead-icon'), input = box('ig-lead-input');
        const trail = box('ig-trail'), btn = box('ig-trail-btn'), tinput = box('ig-trail-input');
        return {
          iconAtStart: Math.round(icon.left - lead.left), iconBeforeInput: icon.right <= input.left,
          btnAtEnd: Math.round(trail.right - btn.right), btnAfterInput: btn.left >= tinput.right,
          btnSquare: Math.round(btn.width) === Math.round(btn.height), btnHeight: Math.round(btn.height),
        };
      });
      // icon margin 0.75rem (+1px border); button margin 0.25rem (+1px border); 36px - 2px border - 0.5rem = 26px
      assert.deepEqual(r, { iconAtStart: 13, iconBeforeInput: true, btnAtEnd: 5, btnAfterInput: true, btnSquare: true, btnHeight: 26 });
    },
  },
  {
    label: 'input group: text addons sit at both ends, muted',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const box = (id: string) => document.getElementById(id)!.getBoundingClientRect();
        const g = box('ig-text');
        return { start: box('ig-text-start').left - g.left > 0 && box('ig-text-start').right <= box('ig-text-input').left, end: box('ig-text-end').left >= box('ig-text-input').right && box('ig-text-end').right < g.right };
      });
      assert.deepEqual(r, { start: true, end: true });
    },
  },
  {
    label: 'input group: focusing the inner input rings the GROUP',
    run: async (page) => {
      const before = await page.$eval('#ig-lead', (g) => getComputedStyle(g).boxShadow);
      await page.focus('#ig-lead-input');
      await page.waitForTimeout(200);
      const after = await page.$eval('#ig-lead', (g) => getComputedStyle(g).boxShadow);
      assert.notEqual(after, before);
      assert.equal(await page.$eval('#ig-lead-input', (i) => getComputedStyle(i).boxShadow), 'none');
    },
  },
  {
    label: 'input group: invalid / readonly / disabled show on the group',
    distinct: [
      { selector: '#ig-lead', prop: 'border-top-color' },
      { selector: '#ig-invalid', prop: 'border-top-color' },
    ],
  },
  {
    label: 'input group: readonly and disabled groups carry the muted surface; disabled shows not-allowed',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const probe = document.createElement('i');
        probe.style.color = 'var(--muted)';
        document.body.append(probe);
        const muted = getComputedStyle(probe).color;
        probe.remove();
        return {
          readonly: getComputedStyle(document.getElementById('ig-trail')!).backgroundColor === muted,
          disabled: getComputedStyle(document.getElementById('ig-disabled')!).backgroundColor === muted,
          cursor: getComputedStyle(document.getElementById('ig-disabled')!).cursor,
        };
      });
      assert.deepEqual(r, { readonly: true, disabled: true, cursor: 'not-allowed' });
    },
  },
  {
    label: 'input group: data-size on the group follows the ladder (lg = 44px) and the button scales with it',
    run: async (page) => {
      const r = await page.evaluate(() => [getComputedStyle(document.getElementById('ig-lg')!).height, Math.round(document.getElementById('ig-lg-btn')!.getBoundingClientRect().height)]);
      assert.deepEqual(r, ['44px', 34]);
    },
  },
  {
    label: 'input group: the trailing button is a real focusable button with a pointer cursor',
    run: async (page) => {
      await page.focus('#ig-trail-btn');
      const r = await page.evaluate(() => ({ focused: document.activeElement?.id, cursor: getComputedStyle(document.getElementById('ig-trail-btn')!).cursor }));
      assert.deepEqual(r, { focused: 'ig-trail-btn', cursor: 'pointer' });
    },
  },
  {
    label: 'input group: a hidden <svg> in a button is really hidden (icon swaps: copy -> check, eye -> eye-off)',
    selector: '#ig-trail-hidden',
    css: { display: 'none' },
  },
  {
    label: 'validation timing: a half-typed email outside any form is NOT marked when left',
    run: async (page) => {
      const border = (id: string) => page.$eval('#' + id, (el) => getComputedStyle(el).borderTopColor);
      const calm = await border('in-default');
      await page.fill('#vt-alone', 'john@');
      await page.click('#vt-elsewhere');
      await page.waitForTimeout(250);
      assert.equal(await page.$eval('#vt-alone', (el) => el.matches(':user-invalid')), true, 'the browser does consider it invalid');
      assert.equal(await border('vt-alone'), calm, 'but a standalone text box is never painted red automatically');
    },
  },
  {
    label: 'validation timing: inside a plain form, leaving a changed invalid field turns it red (native)',
    run: async (page) => {
      const calm = await page.$eval('#in-default', (el) => getComputedStyle(el).borderTopColor);
      await page.fill('#vt-native-in', 'john@');
      await page.click('#vt-elsewhere');
      await page.waitForTimeout(250);
      assert.notEqual(await page.$eval('#vt-native-in', (el) => getComputedStyle(el).borderTopColor), calm);
    },
  },
  {
    label: 'validation timing: form[data-validate="submit"] waits for the submit attempt (data-submitted)',
    run: async (page) => {
      const border = () => page.$eval('#vt-submit-in', (el) => getComputedStyle(el).borderTopColor);
      const calm = await page.$eval('#in-default', (el) => getComputedStyle(el).borderTopColor);
      await page.fill('#vt-submit-in', 'john@');
      await page.click('#vt-elsewhere');
      await page.waitForTimeout(250);
      assert.equal(await border(), calm, 'left half-typed: still calm');
      await page.$eval('#vt-submit', (f) => f.toggleAttribute('data-submitted', true));
      await page.waitForTimeout(250);
      assert.notEqual(await border(), calm, 'after the submit attempt: red');
      await page.fill('#vt-submit-in', 'john@example.com');
      await page.click('#vt-elsewhere');
      await page.waitForTimeout(250);
      assert.equal(await border(), calm, 'fixed: calm again');
    },
  },
  {
    label: 'validation timing: aria-invalid always shows, form or not',
    distinct: [
      { selector: '#in-default', prop: 'border-top-color' },
      { selector: '#in-invalid', prop: 'border-top-color' },
    ],
  },
]);
