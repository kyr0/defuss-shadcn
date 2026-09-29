import { afterEach, describe, expect, it } from 'vitest';
import { bindGlobalKeys, isEditableTarget } from '../src/shared/keys.js';

/**
 * Why: the shared global-key listener is typing-safe by default (keys aimed
 * at fields never reach handlers) and lets a handler opt in per registration
 * with { editable: true } - the Global Key Commands page's "?" / "/" example
 * depends on exactly this split.
 */
const unbinds: (() => void)[] = [];
afterEach(() => {
  unbinds.splice(0).forEach((u) => u());
  document.body.innerHTML = '';
});
const press = (target: EventTarget, key: string) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

describe('bindGlobalKeys', () => {
  it('dispatches keys from the page, never from a field by default', () => {
    document.body.innerHTML = '<input id="f"><textarea id="t"></textarea><div id="ce" contenteditable="true"></div><p id="p">x</p>';
    const seen: string[] = [];
    unbinds.push(bindGlobalKeys((e) => { seen.push(e.key); }));
    press(document.getElementById('p')!, '?');
    press(document.getElementById('f')!, '/');
    press(document.getElementById('t')!, 'a');
    press(document.getElementById('ce')!, 'b');
    expect(seen).toEqual(['?']);
  });

  it('{ editable: true } also receives keys typed into fields - and isEditableTarget tells them apart', () => {
    document.body.innerHTML = '<input id="f"><p id="p">x</p>';
    const seen: [string, boolean][] = [];
    const safe: string[] = [];
    unbinds.push(bindGlobalKeys((e) => { seen.push([e.key, isEditableTarget(e)]); }, { editable: true }));
    unbinds.push(bindGlobalKeys((e) => { safe.push(e.key); }));
    press(document.getElementById('f')!, '?');
    press(document.getElementById('p')!, '/');
    expect(seen).toEqual([['?', true], ['/', false]]);
    // the default handler stays typing-safe
    expect(safe).toEqual(['/']);
  });

  it('return true stops later handlers; unbind removes a handler', () => {
    document.body.innerHTML = '<p id="p">x</p>';
    const order: string[] = [];
    const u1 = bindGlobalKeys(() => { order.push('first'); return true; });
    unbinds.push(bindGlobalKeys(() => { order.push('second'); }));
    press(document.getElementById('p')!, 'k');
    u1();
    press(document.getElementById('p')!, 'k');
    expect(order).toEqual(['first', 'second']);
  });
});
