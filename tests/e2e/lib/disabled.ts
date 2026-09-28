import assert from 'node:assert/strict';
import type { Page } from 'playwright';

/**
 * Why: disabled form controls must stay LEGIBLE - "a choice that exists but
 * is unavailable right now". The old opacity fade (0.5, compounded to 0.25
 * inside item rows) left a ghost outline on light themes. The contract:
 * nothing on the path to the control is faded, its edge keeps the full token
 * colour, the surface / label turn muted, and every part of it (control AND
 * its label text) shows the not-allowed cursor - never the hand pointer.
 */
export type DisabledSpec = {
  /** the disabled control */
  control: string;
  /** its label text, if any: must be muted + not-allowed */
  label?: string;
  /** computed-style props of the control that must equal a token colour */
  tokens?: Record<string, string>;
};

export async function assertLegibleDisabled(page: Page, spec: DisabledSpec): Promise<void> {
  const r = await page.evaluate(({ control, label, tokens }) => {
    const token = (name: string) => {
      const probe = document.createElement('i');
      probe.style.color = `var(${name})`;
      document.body.append(probe);
      const c = getComputedStyle(probe).color;
      probe.remove();
      return c;
    };
    const effective = (el: Element | null) => {
      let o = 1;
      for (; el; el = el.parentElement) o *= Number(getComputedStyle(el).opacity);
      return o;
    };
    const el = document.querySelector(control)!;
    const cs = getComputedStyle(el);
    const lab = label ? document.querySelector(label) : null;
    return {
      opacity: effective(el),
      cursor: cs.cursor,
      tokens: Object.fromEntries(Object.entries(tokens ?? {}).map(([prop, t]) => [prop, [cs.getPropertyValue(prop), token(t)]])),
      label: lab && { opacity: effective(lab), cursor: getComputedStyle(lab).cursor, color: getComputedStyle(lab).color, muted: token('--muted-foreground') },
    };
  }, spec);
  assert.equal(r.opacity, 1, `${spec.control}: no opacity fade on the control (effective ${r.opacity})`);
  assert.equal(r.cursor, 'not-allowed', `${spec.control}: not-allowed cursor`);
  for (const [prop, [got, want]] of Object.entries(r.tokens)) assert.equal(got, want, `${spec.control}: ${prop}`);
  if (r.label) {
    assert.equal(r.label.opacity, 1, `${spec.label}: no opacity fade on the label`);
    assert.equal(r.label.cursor, 'not-allowed', `${spec.label}: no hand pointer over the text`);
    assert.equal(r.label.color, r.label.muted, `${spec.label}: muted text`);
  }
}
