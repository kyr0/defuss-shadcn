import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from '../server.ts';

/**
 * Why: CSS-only components (no .js) have no behavior to drive — their shipped
 * contract is the stylesheet itself. This shared runner loads each component's
 * fixture (every documented variant/size instantiated) and asserts the CSS
 * actually applies: literal computed values for fixed px/keyword properties,
 * "distinct" groups for token-derived colors (theme-value-agnostic), and a
 * fn escape hatch for pseudo-state checks (hover, checked). Keeps the 29
 * pairs honest without hardcoding oklch token values that themes change.
 */

export type Check =
  /** computed style of `selector` must match each prop (string = exact, RegExp = match) */
  | { label: string; selector: string; css: Record<string, string | RegExp> }
  /** all listed (selector, prop) computed values must be pairwise distinct */
  | { label: string; distinct: { selector: string; prop: string }[] }
  /** escape hatch for interactions/pseudo-states */
  | { label: string; run: (page: Page) => Promise<void> };

/**
 * Runs the checks against tests/e2e/{component}.e2e-fixture.html served from
 * the repo root; mirrors the standalone e2e contract: prints ✓/✗ per check
 * and exits non-zero on any failure (tests/e2e/run.ts expects that).
 */
export async function cssSmoke(component: string, checks: Check[]): Promise<void> {
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
    const page = await browser.newPage();
    await page.goto(`${server.url}/tests/e2e/${component}.e2e-fixture.html`);
    // fixture files carry ids per variant/size — make sure they all rendered
    await page.waitForFunction(() => document.body.childElementCount > 0);

    for (const c of checks) {
      if ('css' in c) {
        await check(c.label, async () => {
          const props = Object.keys(c.css);
          // read camelCase OR kebab-case prop names: `cs[k]` resolves camelCase
          // directly, the getPropertyValue branch covers kebab (shared helper —
          // some fixtures declare props in either style).
          const got = await page.$eval(
            c.selector,
            (el, p) =>
              p.map((k) => {
                const cs = getComputedStyle(el);
                const v = (cs as unknown as Record<string, string>)[k] ?? cs.getPropertyValue(k);
                return String(v).trim();
              }),
            props,
          );
          props.forEach((prop, i) => {
            const want = c.css[prop];
            if (want instanceof RegExp) assert.match(got[i], want, prop);
            else assert.equal(got[i], want, prop);
          });
        });
      } else if ('distinct' in c) {
        await check(c.label, async () => {
          const vals: string[] = [];
          for (const d of c.distinct) {
            vals.push(
              await page.$eval(
                d.selector,
                (el, p) => {
                  const cs = getComputedStyle(el);
                  const v = (cs as unknown as Record<string, string>)[p] ?? cs.getPropertyValue(p);
                  return String(v).trim();
                },
                d.prop,
              ),
            );
          }
          assert.equal(new Set(vals).size, vals.length, `expected distinct values, got ${JSON.stringify(vals)}`);
        });
      } else {
        await check(c.label, () => c.run(page));
      }
    }
  } finally {
    await browser.close();
    server.stop();
  }

  if (failures) {
    console.error(`\n${component}.e2e: ${failures} check(s) failed`);
    process.exit(1);
  }
  console.log(`${component}.e2e: all checks passed`);
}
