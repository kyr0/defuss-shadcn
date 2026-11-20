import assert from 'node:assert/strict';
import { cssSmoke } from '../lib/css-smoke.ts';

/**
 * Why: Desktop is CSS-only - its looks are the shipped contract. These checks read the computed chrome of the same
 * markup in every look: the modern default follows the tokens, 7 frames windows in glass with the round orb, XP has
 * the blue title bar and the green start, 98 a gradient title and 95 a solid navy one over bevelled grey in the pixel
 * font; a bar on the left puts the window area beside it; glyphs draw their art inside and outside a desktop and the
 * art changes with the look.
 */
const title = (look: string) => `#look-${look} .window-title`;
const bar = (look: string) => `#look-${look} .window > .window-titlebar`;
await cssSmoke('desktop', [
  { label: 'the modern look keeps the theme radius and a rounded window', selector: '#look-modern .window', css: { 'border-top-left-radius': /^(?!0px)/ } },
  { label: '7: a glass window (translucent, blurred) and the round orb', selector: '#look-win7 .window', css: { 'backdrop-filter': /blur/, 'border-top-left-radius': '7px' } },
  { label: '7: the orb is a circle', selector: '#look-win7 .start-button', css: { 'border-top-left-radius': '50%', width: '46px' } },
  { label: 'XP: the blue title bar in Trebuchet, rounded at the top', selector: bar('winxp'), css: { 'background-image': /linear-gradient/, height: '28px' } },
  { label: 'XP: the green start button', selector: '#look-winxp .start-button', css: { 'background-image': /rgb\(60, 143, 60\)/, 'font-style': 'italic', 'text-transform': 'lowercase' } },
  { label: '98: a gradient navy title bar', selector: bar('win98'), css: { 'background-image': /linear-gradient\(90deg, rgb\(0, 0, 128\), rgb\(16, 132, 208\)\)/ } },
  { label: '95: a solid navy title bar', selector: bar('win95'), css: { 'background-color': 'rgb(0, 0, 128)', 'background-image': 'none' } },
  { label: '98: bevelled grey, square corners, the pixel font at 11px', selector: '#look-win98 .window', css: { 'background-color': 'rgb(192, 192, 192)', 'border-top-left-radius': '0px', 'font-size': '11px', 'font-family': /Desktop Pixel Sans/ } },
  { label: '98: a raised Button inside', selector: '#b98', css: { 'background-color': 'rgb(192, 192, 192)', 'box-shadow': /inset/, 'border-top-left-radius': '0px' } },
  { label: '95: the teal desktop', selector: '#look-win95 > .window-manager', css: { 'background-color': 'rgb(0, 128, 128)' } },
  {
    label: 'the titles differ by look (one markup, five looks)',
    distinct: ['modern', 'win7', 'winxp', 'win98'].map((l) => ({ selector: title(l), prop: 'font-family' })),
  },
  {
    label: 'a bar on the left: the window area beside it',
    run: async (page) => {
      const d = (await page.locator('#look-win95').boundingBox())!;
      const b = (await page.locator('#look-win95 .taskbar').boundingBox())!;
      const w = (await page.locator('#look-win95 > .window-manager').boundingBox())!;
      assert.ok(Math.abs(b.x - d.x) < 1 && w.x >= b.x + b.width - 1, `bar ${b.x}, windows from ${w.x}`);
    },
  },
  {
    label: 'glyphs draw art inside and outside a desktop, and the art follows the look',
    run: async (page) => {
      const art = (sel: string) => page.$eval(sel, (e) => getComputedStyle(e).backgroundImage);
      assert.match(await art('#lone-glyph'), /^url\("data:image\/svg\+xml/);
      const modern = await art('#look-modern .start-button-icon');
      const classic = await art('#look-win98 .start-button-icon');
      const glossy = await art('#look-winxp .start-button-icon');
      assert.match(modern, /^url\(/);
      assert.notEqual(modern, classic);
      assert.notEqual(classic, glossy);
      assert.equal(await art('#look-win7 .start-button-icon'), glossy, '7 and XP share the glossy art');
    },
  },
  {
    label: 'the pixel font loads',
    run: async (page) => {
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.evaluate(() => document.fonts.check('11px "Desktop Pixel Sans"')), true);
    },
  },
]);
