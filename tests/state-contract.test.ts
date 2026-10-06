import { describe, expect, test } from 'vitest';
import { waitFor } from './helpers';

/**
 * Why: every interactive component promises the same State API - every declared state can be
 * entered by name, getState() reports where the element landed, render() reproduces markup for
 * it, the store follows, and an undeclared name throws. The e2e suite proves it per component in
 * plain Playwright; this runs the same contract over every element of every interactive
 * component's e2e fixture (each fixture instantiates every documented configuration) inside the
 * unit suite, so a component whose state code throws, or which lands outside its own states,
 * fails here too.
 */

// the interactive fixtures: an e2e fixture that loads a component script, by <script src> or a module
// import (CSS-only components' fixtures load none). Eager raw, as theme-css.test.ts reads the themes.
const RAW = import.meta.glob('/tests/e2e/*.e2e-fixture.html', { query: '?raw', import: 'default', eager: true });
const FIXTURES = Object.entries(RAW)
  .filter(([, html]) => /\/dist\/components\/[\w./-]+\.js\b/.test(String(html)))
  .map(([p]) => ({ path: p, name: /([^/]+)\.e2e-fixture\.html$/.exec(p)![1] }))
  // core-*: the runtime bootstrap's own fixtures (no core, a conflicting df$) - no component state to drive
  .filter((f) => !f.name.startsWith('core-'))
  .sort((a, b) => a.name.localeCompare(b.name));

type Bound = HTMLElement & {
  api: {
    setState(name: string, config?: Record<string, unknown>): unknown;
    getState(): { name: string; config: Record<string, unknown> };
    render(state?: unknown): string;
    settled(): Promise<void>;
  };
  store: { value: { name: string } };
};

async function openFixture(path: string): Promise<Window> {
  document.body.innerHTML = '';
  const el = document.createElement('iframe');
  el.setAttribute('style', 'position:fixed;inset:0;width:100%;height:100%;border:0;background:#fff');
  el.src = path;
  document.body.appendChild(el);
  await waitFor(() => el.contentWindow?.location.pathname === path && el.contentWindow.document.readyState === 'complete', `${path} to load`, 15000);
  const win = el.contentWindow as Window & { df$?: { shadcn?: Record<string, unknown> } };
  await waitFor(() => !!win.df$?.shadcn, `${path}: the runtime`, 10000);
  await new Promise((r) => setTimeout(r, 150)); // components initialize on load and in a microtask after
  return win;
}

const camel = (kebab: string) => kebab.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());

describe('State API contract over every interactive component fixture', () => {
  test('there is a fixture for every interactive component', () => {
    expect(FIXTURES.length).toBeGreaterThanOrEqual(55);
  });

  test.each(FIXTURES)('$name: every element enters every declared state; unknown names throw', async ({ path }) => {
    const win = await openFixture(path);
    const shadcn = (win as unknown as { df$: { shadcn: Record<string, unknown> } }).df$.shadcn;
    const bound = [...win.document.querySelectorAll<HTMLElement>('*')].filter((e): e is Bound => typeof (e as Bound).api?.setState === 'function' && !!(e as Bound).store);
    expect(bound.length, 'the fixture binds at least one element').toBeGreaterThan(0);
    const problems: string[] = [];
    for (const el of bound) {
      const id = el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}.${el.classList[0] ?? ''}`;
      // the main error path - and it names the component
      let component = '';
      try {
        el.api.setState('__not_a_state__');
        problems.push(`${id}: an undeclared state did not throw`);
        continue;
      } catch (err) {
        component = /^([\w-]+): unknown state/.exec(String((err as Error).message ?? err))?.[1] ?? '';
      }
      const states = shadcn[`${camel(component)}States`] as string[] | undefined;
      if (!component || !Array.isArray(states)) { problems.push(`${id}: no declared states for "${component}"`); continue; }
      const initial = el.api.getState();
      for (const state of states) {
        try {
          el.api.setState(state, {});
          await el.api.settled();
          const now = el.api.getState();
          if (!states.includes(now.name)) problems.push(`${id} ${component}: setState("${state}") landed in "${now.name}", not a declared state`);
          if (el.store.value.name !== now.name && el.store.value.name !== state) problems.push(`${id} ${component}: the store says "${el.store.value.name}", getState "${now.name}"`);
          const markup = el.api.render();
          if (typeof markup !== 'string' || !markup.length) problems.push(`${id} ${component}: render() in "${state}" returned no markup`);
        } catch (err) {
          problems.push(`${id} ${component}: setState("${state}") threw ${String((err as Error).message ?? err).slice(0, 120)}`);
        }
      }
      try {
        el.api.setState(initial.name, initial.config);
        await el.api.settled();
      } catch (err) {
        problems.push(`${id} ${component}: restoring "${initial.name}" threw ${String((err as Error).message ?? err).slice(0, 120)}`);
      }
    }
    expect(problems).toEqual([]);
  }, 30000);
});

/**
 * Why: a state reached by name is half the surface - people reach states through controls. This
 * operates every control of every interactive fixture the way a mouse and keyboard user would and
 * holds each component to its main error path: no handler throws, no promise rejects unhandled.
 * Links that leave the page and file pickers are skipped; a form submit is cancelled after the
 * components' own handlers ran, so the frame stays on the fixture.
 */
const CONTROLS = 'button, summary, a[href^="#"], [role="button"], [role="tab"], [role="menuitem"], [role="option"], [role="switch"], [role="checkbox"], [role="radio"], [role="treeitem"], [role="gridcell"], [role="slider"], input:not([type="file"]):not([type="hidden"]), select, textarea, [tabindex]';
const KEYS = ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End', 'Enter', ' ', 'Escape', 'Tab'];

describe('every control of every interactive fixture can be operated without an uncaught error', () => {
  test.each(FIXTURES)('$name', async ({ path }) => {
    // the frame's own constructors (instanceof and events must come from its realm)
    const win = (await openFixture(path)) as Window & typeof globalThis;
    const errors: string[] = [];
    win.addEventListener('error', (e) => errors.push(`error: ${e.message}`));
    win.addEventListener('unhandledrejection', (e) => errors.push(`unhandled rejection: ${String((e.reason as Error)?.message ?? e.reason)}`));
    win.addEventListener('submit', (e) => e.preventDefault()); // bubbles last: the components' handlers ran
    const doc = win.document;
    const controls = [...doc.querySelectorAll<HTMLElement>(CONTROLS)].slice(0, 200);
    for (const el of controls) {
      if (!el.isConnected) continue;
      try {
        el.focus();
        if (el instanceof win.HTMLInputElement && /^(text|search|email|url|tel|number|range|date|time|color|password)$/.test(el.type)) {
          el.value = el.type === 'range' || el.type === 'number' ? String(Number(el.min || 0) + 1) : el.type === 'color' ? '#336699' : el.type === 'date' ? '2026-10-06' : el.type === 'time' ? '12:30' : 'ab';
          el.dispatchEvent(new win.Event('input', { bubbles: true }));
          el.dispatchEvent(new win.Event('change', { bubbles: true }));
        } else if (el instanceof win.HTMLSelectElement) {
          el.selectedIndex = el.options.length > 1 ? 1 : 0;
          el.dispatchEvent(new win.Event('change', { bubbles: true }));
        } else if (el instanceof win.HTMLTextAreaElement) {
          el.value = 'ab';
          el.dispatchEvent(new win.Event('input', { bubbles: true }));
        } else {
          el.click();
        }
        for (const key of KEYS) {
          el.dispatchEvent(new win.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
          el.dispatchEvent(new win.KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }));
        }
      } catch (err) {
        errors.push(`${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}: ${String((err as Error).message ?? err).slice(0, 120)}`);
      }
    }
    await new Promise((r) => setTimeout(r, 300)); // async handlers (timers, fetches, animations) report here
    expect(win.location.pathname, 'the frame stayed on the fixture').toBe(path);
    expect([...new Set(errors)]).toEqual([]);
  }, 30000);
});
