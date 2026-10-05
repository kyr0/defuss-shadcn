import assert from 'node:assert/strict';
import type { Page } from 'playwright';

/**
 * Why: the render() contract (AGENTS.md "State API" → render), proven the
 * same way for every JS component: on every initialized instance `selector`
 * matches in a freshly loaded fixture,
 *  1. authored: the instance's model - its markup as authored (core's
 *     as-parsed capture) - rendered with no state applied equals the
 *     instance's markup in the fixture FILE, byte for byte: the HTML "as it
 *     was before" the runtime ran;
 *  2. a function of state: render({ ...initialState, name: s }) - computed
 *     while the element is still in its initial state - equals render()
 *     after api.setState(s, initialState.config) (s = the state it LANDED in:
 *     a state machine may move on by itself - a timer past its deadline goes
 *     from 'default' straight to 'finished') (same config, other state:
 *     getState() reports the live values a state depends on - a field's
 *     value - and setState(getState()) changes nothing);
 *  3. the state's markup: what render() changes from the initial state to s
 *     equals what setState(s) changes on the live element - attribute by
 *     attribute, text by text, element by element. Markup the runtime adds
 *     at init and keeps in every state (ARIA wiring, anchor styles, a nested
 *     component's own enhancements) is the same on both sides of the live
 *     delta and drops out; a missing, extra or wrong state change does not.
 * `runtimeAttrs`: attributes that CHANGE at runtime without being the state's
 * markup (a roving tabindex, a trigger's aria-expanded, a context menu's
 * position) - ignored in (3). data-init / data-api / data-state-name always
 * are. `runtimeOwned`: a selector for elements the runtime creates or
 * rewrites over time - a ticking timer's digits, a typewriter's typed line,
 * a chart's canvas, a rendered diagram - which (with everything inside them)
 * are not compared in (3). `settled`: a selector that must stop matching
 * before the check starts (an async first render still pending). Instances must carry an id (the authored copy is found by it); each is
 * put back into its initial state afterwards.
 * It proves the store contract too (AGENTS.md "State through stores"): every
 * instance has `el.store`, whose value is getState()'s { name, config }; a
 * subscriber hears every setState; an outside `el.store.set(state)` applies
 * the state like setState (getState() and the markup follow); the element's
 * data-state-name mirrors the store.
 * verify's `render() contract` / `store contract` gates require a call of
 * this helper in every JS component's e2e.
 */
export async function assertRenderContract(page: Page, selector: string, states: string[], opts: { runtimeAttrs?: string[]; runtimeOwned?: string; settled?: string } = {}): Promise<number> {
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction((sel) => [...document.querySelectorAll(sel)].some((el) => (el as any).api?.render), selector, { timeout: 10_000 });
  // async first renders (a diagram) finish before the initial state is read
  if (opts.settled) await page.waitForFunction((sel) => !document.querySelector(sel), opts.settled, { timeout: 15_000 });
  const result = await page.evaluate(
    async ({ selector, states, runtimeAttrs, runtimeOwned }) => {
      const IGNORE = new Set(['data-init', 'data-api', 'data-state-name', ...runtimeAttrs]);
      const renderModel = (globalThis as any).df$.shadcn.shared.renderModel;
      const authoredDoc = new DOMParser().parseFromString(await (await fetch(location.href)).text(), 'text/html');
      const parse = (html: string): Element => new DOMParser().parseFromString(`<template>${html}</template>`, 'text/html').querySelector('template')!.content.firstElementChild!;
      type Node1 = { tag: string; attrs: Map<string, string>; text: string };
      type Snap = Map<string, Node1>;
      // inline style compared as the browser reads it (`--value:100` and
      // `--value: 100;` are one style; an emptied style="" is no style;
      // declarations in name order - a property removed and set again lands last)
      const styleBox = document.createElement('div');
      const css = (v: string): string => {
        styleBox.setAttribute('style', v);
        const st = styleBox.style;
        return Array.from({ length: st.length }, (_, i) => st[i]).sort().map((p) => `${p}: ${st.getPropertyValue(p)}`).join('; ');
      };
      const owned = (n: Element, root: Element): boolean => !!runtimeOwned && n !== root && !!n.closest(runtimeOwned);
      /** an element's identity: its id, else tag + nth-of-type below the
       *  nearest identified ancestor - an element the runtime injects
       *  elsewhere shifts no one's key */
      const keyOf = (n: Element, root: Element): string => {
        if (n === root) return 'root';
        if (n.id && !IGNORE.has('id')) return '#' + n.id; // a runtime-assigned id is no identity
        const p = n.parentElement!;
        const same = [...p.children].filter((c) => c.localName === n.localName && !owned(c, root));
        return `${keyOf(p, root)} > ${n.localName}:${same.indexOf(n)}`;
      };
      const snap = (root: Element): Snap =>
        new Map(
          [root, ...root.querySelectorAll('*')].filter((n) => !owned(n, root)).map((n): [string, Node1] => [
            keyOf(n, root),
            {
              tag: n.localName,
              attrs: new Map(
                n.getAttributeNames()
                  .filter((a) => !IGNORE.has(a))
                  .map((a): [string, string] => [a, a === 'style' ? css(n.getAttribute(a)!) : n.getAttribute(a)!])
                  .filter(([a, v]) => !(a === 'style' && v === '')),
              ),
              text: [...n.childNodes].filter((c) => c.nodeType === Node.TEXT_NODE).map((c) => c.textContent).join(''),
            },
          ]),
        );
      /** the changes from a to b, as comparable lines (element by identity) */
      const delta = (a: Snap, b: Snap): string[] => {
        const out: string[] = [];
        for (const key of [...new Set([...a.keys(), ...b.keys()])].sort()) {
          const x = a.get(key), y = b.get(key);
          if (!x) { out.push(`${key} added <${y!.tag}>`); continue; }
          if (!y) { out.push(`${key} removed <${x.tag}>`); continue; }
          if (x.tag !== y.tag) { out.push(`${key} <${x.tag}> → <${y.tag}>`); continue; }
          for (const name of [...new Set([...x.attrs.keys(), ...y.attrs.keys()])].sort())
            if (x.attrs.get(name) !== y.attrs.get(name)) out.push(`${key} [${name}] ${JSON.stringify(x.attrs.get(name) ?? null)} → ${JSON.stringify(y.attrs.get(name) ?? null)}`);
          if (x.text !== y.text) out.push(`${key} text ${JSON.stringify(x.text)} → ${JSON.stringify(y.text)}`);
        }
        return out;
      };
      const failures: string[] = [];
      const instances = [...document.querySelectorAll(selector)].filter((el) => (el as any).api?.render);
      for (const el of instances as any[]) {
        const id = el.id;
        if (!id) { failures.push(`${selector}: an instance has no id`); continue; }
        const initial = el.api.getState();
        const authored = authoredDoc.getElementById(id);
        const modelHtml = renderModel(initial.model);
        if (!authored) failures.push(`#${id}: not in the fixture file`);
        else if (modelHtml !== authored.outerHTML) failures.push(`#${id} model: rendered\n      ${modelHtml}\n    authored\n      ${authored.outerHTML}`);
        const liveInitial = snap(el);
        const renderInitial = snap(parse(el.api.render(initial)));
        const fromInitial = new Map(states.map((s) => [s, el.api.render({ ...initial, name: s })]));
        for (const s of states) {
          // an async state (a diagram renders) settles before it is compared
          const done = el.api.setState(s, initial.config);
          if (done && typeof done.then === 'function') await done;
          // the state it landed in: a state machine may move on by itself (a
          // timer past its deadline goes from 'default' straight to 'finished')
          const landed = el.api.getState().name;
          const now = el.api.render();
          const before = fromInitial.get(landed) ?? el.api.render({ ...initial, name: landed });
          if (now !== before) failures.push(`#${id} ${s}${landed !== s ? ' (landed in ' + landed + ')' : ''}: render() after setState differs from render() of the state\n      ${now}\n    vs\n      ${before}`);
          const live = delta(liveInitial, snap(el)).join('\n      ');
          const rendered = delta(renderInitial, snap(parse(before))).join('\n      ');
          if (live !== rendered) failures.push(`#${id} ${initial.name} → ${s}: render() changes\n      ${rendered || '(nothing)'}\n    live changes\n      ${live || '(nothing)'}`);
        }
        const back = el.api.setState(initial.name, initial.config);
        if (back && typeof back.then === 'function') await back;

        // -- the store contract ------------------------------------------------
        const store = el.store;
        if (!store || typeof store.subscribe !== 'function' || typeof store.set !== 'function') {
          failures.push(`#${id}: no el.store (a defuss-store store) bound`);
          continue;
        }
        const plain = (st: { name: string; config: unknown }) => JSON.stringify({ name: st.name, config: st.config });
        const stated = el.api.getState();
        if (plain(store.value) !== plain(stated)) failures.push(`#${id} store: value ${plain(store.value)} but getState() ${plain(stated)}`);
        if (el.dataset.stateName !== store.value.name) failures.push(`#${id} store: data-state-name "${el.dataset.stateName}" but the store says "${store.value.name}"`);
        const heard: string[] = [];
        const off = store.subscribe((next: { name: string }) => heard.push(next.name));
        for (const st of states) {
          if (st === store.value.name) continue;
          heard.length = 0;
          const done = el.api.setState(st, initial.config);
          if (done && typeof done.then === 'function') await done;
          const landed = el.api.getState().name;
          if (landed !== initial.name && !heard.includes(landed)) failures.push(`#${id} store: setState('${st}') landed in "${landed}" but subscribers heard [${heard.join(', ')}]`);
          // an outside write applies like setState
          const reset = el.api.setState(initial.name, initial.config);
          if (reset && typeof reset.then === 'function') await reset;
          store.set({ name: st, config: initial.config });
          // an async state settles (api.settled); the read-back runs in a
          // microtask - never a timer: a page may run on Playwright's fake
          // clock (countdown), where setTimeout never fires
          await el.api.settled?.();
          await new Promise((r) => queueMicrotask(() => r(undefined)));
          const viaStore = el.api.getState().name;
          if (viaStore !== landed) failures.push(`#${id} store: store.set({ name: '${st}' }) left the element in "${viaStore}" (setState('${st}') lands in "${landed}")`);
          const again = el.api.setState(initial.name, initial.config);
          if (again && typeof again.then === 'function') await again;
        }
        off();
        heard.length = 0;
        el.api.setState(initial.name, initial.config);
        if (heard.length) failures.push(`#${id} store: an unsubscribed listener still heard [${heard.join(', ')}]`);
      }
      return { count: instances.length, failures };
    },
    { selector, states, runtimeAttrs: opts.runtimeAttrs ?? [], runtimeOwned: opts.runtimeOwned ?? '' },
  );
  assert.ok(result.count > 0, `no instance of ${selector} exposes api.render()`);
  assert.deepEqual(result.failures, [], result.failures.join('\n    '));
  return result.count;
}
