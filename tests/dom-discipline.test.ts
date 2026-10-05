import { describe, expect, it } from 'vitest';
import { QUERY_RE, SINK_RE, apiName, hasRender, ratchet, scan } from '../scripts/lib/dom-discipline.ts';

/**
 * Why: verify's df$ gates (28d) are only as good as this scanner and the
 * ratchet arithmetic - a regex that misses `querySelectorAll(` or a ratchet
 * that lets a count grow would turn the gates into decoration.
 */
describe('dom-discipline: scan', () => {
  it('counts every native query form, several per line', () => {
    const src = [
      "const a = document.getElementById('x');",
      "el.querySelector('.a'); el.querySelectorAll('.b');",
      "root.getElementsByClassName('c'); root.getElementsByTagName('p');",
      "root.querySelectorAll<HTMLElement>('.x'); root.querySelector<HTMLInputElement>('input');",
    ].join('\n');
    expect(scan(src, QUERY_RE).map((h) => h.line)).toEqual([1, 2, 2, 3, 3, 4, 4]);
  });
  it('counts HTML sinks - reads and writes', () => {
    const src = ['el.innerHTML = s;', 'const t = el.innerText;', "el.insertAdjacentHTML('beforeend', s);", 'x = el.outerHTML;', 'document.write(s);'].join('\n');
    expect(scan(src, SINK_RE).length).toBe(5);
  });
  it('skips comment lines (they document the rule) and df$ calls', () => {
    const src = ['// never use innerHTML or querySelector(', ' * el.querySelector(".x")', "df$(el).find('.x').html(markup);"].join('\n');
    expect(scan(src, QUERY_RE)).toEqual([]);
    expect(scan(src, SINK_RE)).toEqual([]);
  });
});

describe('dom-discipline: ratchet', () => {
  it('fails new debt, fails a baseline left too high, lists the rest', () => {
    const { problems, debt } = ratchet({ 'a.ts': 3, 'b.ts': 1, 'c.ts': 2 }, { 'a.ts': 2, 'b.ts': 4, 'c.ts': 2, 'gone.ts': 1 }, 'native DOM queries');
    expect(problems).toEqual([
      'a.ts: 3 native DOM queries (baseline 2) - 1 new',
      'b.ts: 1 native DOM queries but the baseline says 4 - lower it to 1 (the ratchet only goes down)',
      'gone.ts: baseline entry for a file that no longer exists - remove it',
    ]);
    expect(debt).toEqual([['a.ts', 3], ['c.ts', 2], ['b.ts', 1]]);
  });
  it('a file without a baseline entry starts at zero', () => {
    expect(ratchet({ 'new.ts': 1 }, {}, 'x').problems).toEqual(['new.ts: 1 x (baseline 0) - 1 new']);
  });
});

describe('dom-discipline: render() detection', () => {
  it('names the registry api and finds render( inside it', () => {
    expect(apiName('tree-view')).toBe('treeViewApi');
    expect(hasRender('toggle', 'export const toggleApi = {\n  getState(t) {},\n  render(state) { return ""; },\n};')).toBe(true);
    expect(hasRender('toggle', 'export const toggleApi = { getState(t) {} };\nfunction render() {}')).toBe(false);
    expect(hasRender('steps', "export const stepsApi = {\n  render(state: { model: import('x').M }): string { return ''; },\n};")).toBe(true);
    expect(hasRender('toggle', 'export const toggleApi = { getState(t) { return this.render(t); } };')).toBe(false);
    // componentState() builds render() from the markup function
    expect(hasRender('toggle', "export const toggleApi = componentState({ component: 'toggle' });")).toBe(true);
    expect(hasRender('calendar', 'export const calendarApi = Object.assign(componentState({}), { setDays() {} });')).toBe(true);
    expect(hasRender('cookie-consent', 'export const cookieConsentApi = componentState<HTMLElement>({});')).toBe(true);
  });
});
