import assert from 'node:assert/strict';
import type { Page } from 'playwright';

/**
 * Why: every Website site has a light and a dark mode - a Swap (`.site-mode` holding `[data-site-mode]`) toggles
 * `<html class="dark">`, and every look carries both palettes (AGENTS.md, Website). A look whose other mode was
 * forgotten keeps its palette when the class flips; one derived carelessly turns its text unreadable (the Midnight
 * menu once read at 1.9:1 in dark mode). Per mode this reads the root's tokens AS PAINTED (a 1x1 canvas resolves any
 * colour syntax and composites a translucent one over the ground): the ground, the text on it, and the hover pair
 * (`--accent` / `--accent-foreground`, the surface the navigation menu and the selects light up with).
 * `--accent` is a surface, a soft tint of the ground - text painted in it reads at about 1.2:1 (the Media template's
 * eyebrows and section numbers once did, after the modes pass turned its vermilion accent into a tint), so the shown
 * elements whose own text has the --accent colour are listed too.
 */
export interface ModeReading {
  dark: boolean;
  /** the --background as painted, rgb 0..255 */
  ground: [number, number, number];
  /** WCAG contrast of --foreground on --background */
  text: number;
  /** WCAG contrast of --accent-foreground on --accent */
  accent: number;
  /** shown elements whose own text is painted in --accent (tag.class: text), at most five */
  accentText: string[];
}

export async function readMode(p: Page, root: string): Promise<ModeReading> {
  return p.$eval(root, (el) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    /** paints the colours one over the other and reads the pixel */
    const paint = (...colors: string[]): [number, number, number] => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 1, 1);
      for (const c of colors) {
        ctx.fillStyle = c;
        ctx.fillRect(0, 0, 1, 1);
      }
      const [r = 0, g = 0, b = 0] = ctx.getImageData(0, 0, 1, 1).data;
      return [r, g, b];
    };
    const token = (name: string) => {
      const probe = document.createElement('span');
      probe.style.color = `var(${name})`;
      el.append(probe);
      const c = getComputedStyle(probe).color;
      probe.remove();
      return c;
    };
    const lum = ([r, g, b]: number[]) => {
      const f = (v: number) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      return 0.2126 * f(r!) + 0.7152 * f(g!) + 0.0722 * f(b!);
    };
    const ratio = (a: number[], b: number[]) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (hi! + 0.05) / (lo! + 0.05);
    };
    const bg = token('--background');
    const ground = paint(bg);
    const accent = paint(bg, token('--accent'));
    const tint = token('--accent');
    const accentText: string[] = [];
    for (const node of el.querySelectorAll<HTMLElement>('*')) {
      if (accentText.length >= 5) break;
      const own = [...node.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim());
      if (!own || getComputedStyle(node).color !== tint || !node.checkVisibility({ visibilityProperty: true }))
        continue;
      accentText.push(`${node.tagName.toLowerCase()}.${node.className}: ${node.textContent!.trim().slice(0, 30)}`);
    }
    return {
      dark: document.documentElement.classList.contains('dark'),
      ground,
      text: ratio(paint(bg, token('--foreground')), ground),
      accent: ratio(paint(bg, token('--accent'), token('--accent-foreground')), accent),
      accentText,
    };
  });
}

/** clicks the site's light / dark switch; returns the mode it landed in */
export async function toggleMode(p: Page, root: string): Promise<boolean> {
  const before = await p.evaluate(() => document.documentElement.classList.contains('dark'));
  await p.click(`${root} .site-mode`);
  await p.waitForFunction((b) => document.documentElement.classList.contains('dark') !== b, before);
  const after = await p.evaluate(() => document.documentElement.classList.contains('dark'));
  assert.equal(await p.isChecked(`${root} [data-site-mode]`), after, 'the switch shows the mode');
  return after;
}

/** the current look in both modes: the switch flips the page, the ground turns, both pairs stay readable (4.5:1) */
export async function assertBothModes(p: Page, root: string, label: string): Promise<void> {
  const lightness = (c: number[]) => (0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!) / 255;
  const first = await readMode(p, root);
  await toggleMode(p, root);
  const second = await readMode(p, root);
  await toggleMode(p, root);
  const [light, dark] = first.dark ? [second, first] : [first, second];
  assert.ok(
    lightness(dark.ground) < lightness(light.ground),
    `${label}: the dark mode's ground is darker (${dark.ground} vs ${light.ground})`,
  );
  for (const [mode, r] of [
    ['light', light],
    ['dark', dark],
  ] as const) {
    assert.ok(r.text >= 4.5, `${label} ${mode}: text on the ground ${r.text.toFixed(2)}:1`);
    assert.ok(r.accent >= 4.5, `${label} ${mode}: the hover pair ${r.accent.toFixed(2)}:1`);
    assert.deepEqual(r.accentText, [], `${label} ${mode}: text painted in --accent (a hover surface, not an ink)`);
  }
}
