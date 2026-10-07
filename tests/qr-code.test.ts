import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { waitFor } from './helpers';

/** The browser suite exercises the built HTML component and its real store.
 * Independent decoding of rendered pixels lives in qr-code.e2e.ts. */
interface QrState {
  name: string;
  config: Record<string, unknown>;
  model?: DefussShadcnComponentState['model'];
}
interface QrElement extends HTMLElement {
  api: {
    setState(name: string, config?: Record<string, unknown>): void;
    getState(): QrState;
    render(state?: QrState): string;
    settled(): Promise<void>;
  };
}

let frame: HTMLIFrameElement;
let doc: Document;
const qr = (id = 'qr-basic'): QrElement => doc.getElementById(id) as QrElement;
const path = (el: Element): string | null => el.querySelector('svg path')?.getAttribute('d') ?? null;

beforeEach(async () => {
  frame = document.createElement('iframe');
  frame.src = '/tests/e2e/qr-code.e2e-fixture.html';
  document.body.append(frame);
  await waitFor(() => frame.contentWindow?.location.pathname === frame.getAttribute('src')
    && frame.contentDocument?.readyState === 'complete'
    && !!(frame.contentDocument.getElementById('qr-basic') as QrElement)?.api, 'QR fixture to initialize');
  doc = frame.contentDocument!;
});

afterEach(() => frame?.remove());

describe('QR Code state and encoding boundaries', () => {
  it('initializes a valid symbol, empty state and capacity failure independently', () => {
    expect(qr().api.getState()).toMatchObject({ name: 'default', config: { value: 'https://example.com/project', ecc: 'M', version: 'auto', size: 'md', variant: 'outline' } });
    expect(path(qr())).toBeTruthy();
    expect(qr('qr-empty').api.getState().name).toBe('empty');
    expect(qr('qr-capacity').api.getState()).toMatchObject({ name: 'error', config: { errorCode: 'capacity-exceeded' } });
    expect(qr('qr-capacity').querySelector('svg')).toBeNull();
  });

  it('keeps partial updates and retains exact whitespace/Unicode content', () => {
    const value = ' \tGrüße\nМир e\u0301 😀\r\n ';
    qr().api.setState('default', { value, ecc: 'Q' });
    qr().api.setState('default', { size: 'lg', label: 'Multilingual data' });
    expect(qr().api.getState()).toMatchObject({ name: 'default', config: { value, ecc: 'Q', size: 'lg', label: 'Multilingual data', variant: 'outline' } });
    expect(qr().dataset.value).toBe(value);
    expect(qr().querySelector('.qr-code-symbol')?.getAttribute('aria-label')).toBe('Multilingual data');
  });

  it('explicit undefined resets authored inputs while omitted options preserve current values', () => {
    qr().api.setState('default', { value: 'Overridden 😀', ecc: 'H', version: 7, label: 'Overridden label', size: 'lg', variant: 'plain' });
    qr().api.setState('default', { size: undefined, variant: undefined });
    expect(qr().api.getState()).toMatchObject({ name: 'default', config: { value: 'Overridden 😀', ecc: 'H', version: 7, label: 'Overridden label', size: 'md', variant: 'outline' } });
    qr().api.setState('error', { message: 'Temporary feedback' });
    qr().api.setState('error', { message: undefined });
    expect(qr().querySelector('.qr-code-status')?.textContent).toBe('QR code unavailable.');
    qr().api.setState('default', { value: undefined, ecc: undefined, version: undefined, label: undefined });
    const state = qr().api.getState();
    expect(state).toMatchObject({ name: 'default', config: { value: 'https://example.com/project', ecc: 'M', version: 'auto', label: 'QR code for the project', size: 'md', variant: 'outline' } });
    expect(state.config.errorCode).toBeUndefined();
    expect(state.config.message).toBeUndefined();
    expect(state.config.actualVersion).toBeLessThan(7);
    expect(qr().querySelector('.qr-code-symbol')?.getAttribute('aria-label')).toBe('QR code for the project');
    expect(path(qr())).toBeTruthy();
  });

  it('uses exact version-1 numeric, alphanumeric and byte capacities', () => {
    for (const [unit, maximum, ecc] of [['1', 41, 'L'], ['A', 25, 'L'], ['a', 17, 'L'], ['a', 7, 'H']] as const) {
      qr().api.setState('default', { value: unit.repeat(maximum), version: 1, ecc });
      expect(qr().api.getState()).toMatchObject({ name: 'default', config: { actualVersion: 1, moduleCount: 21, ecc } });
      qr().api.setState('default', { value: unit.repeat(maximum + 1) });
      expect(qr().api.getState()).toMatchObject({ name: 'error', config: { value: unit.repeat(maximum + 1), errorCode: 'capacity-exceeded', version: 1, ecc } });
      expect(path(qr())).toBeNull();
    }
  });

  it('rejects malformed UTF-16 and oversized input without stale symbols; valid input recovers', () => {
    for (const [value, errorCode] of [['\ud800', 'invalid-text'], ['\udfff', 'invalid-text'], ['x\ud800y', 'invalid-text'], ['1'.repeat(7090), 'capacity-exceeded']]) {
      qr().api.setState('default', { value: 'valid', version: 'auto' });
      qr().api.setState('default', { value });
      expect(qr().api.getState()).toMatchObject({ name: 'error', config: { value, errorCode } });
      expect(qr().querySelector('svg')).toBeNull();
      expect(qr().querySelector<HTMLElement>('.qr-code-symbol')!.hidden).toBe(true);
    }
    qr().api.setState('default', { value: 'Recovered 😀' });
    expect(qr().api.getState().name).toBe('default');
    expect(qr().api.getState().config.errorCode).toBeUndefined();
    expect(qr().querySelector<HTMLElement>('.qr-code-status')!.hidden).toBe(true);
  });

  it('fails invalid API arguments before changing the DOM or normalized state', () => {
    const original = qr().api.getState();
    const originalHtml = qr().outerHTML;
    for (const config of [{ value: 42 }, { value: {} }, { ecc: 'X' }, { version: 0 }, { version: 41 }, { version: 1.5 }, { version: '1' }, { size: 'xl' }, { variant: 'round' }, { label: null }, { message: 7 }, { unknownOption: 'x' }]) {
      expect(() => qr().api.setState('default', config)).toThrow();
      expect(qr().api.getState()).toEqual(original);
      expect(qr().outerHTML).toBe(originalHtml);
    }
    expect(() => qr().api.setState('unknown')).toThrow(/unknown state/);
  });

  it('clears explicit empty/error states and restores the retained data with state-specific messages', () => {
    const initial = qr().api.getState();
    qr().api.setState('empty');
    expect(qr().api.getState().name).toBe('empty');
    expect(qr().querySelector('.qr-code-status')?.textContent).toBe('No QR code data.');
    expect(path(qr())).toBeNull();
    qr().api.setState('error');
    expect(qr().api.getState().name).toBe('error');
    expect(qr().querySelector('.qr-code-status')?.textContent).toBe('QR code unavailable.');
    expect(path(qr())).toBeNull();
    qr().api.setState('default');
    expect(qr().api.getState().name).toBe('default');
    expect(qr().api.getState().config.value).toBe(initial.config.value);
    expect(path(qr())).toBeTruthy();
  });

  it('JSON snapshots replay owned markup, and detached render never mutates the live instance', () => {
    qr().api.setState('default', { value: 'Snapshot: e\u0301 😀', ecc: 'H', version: 7, label: 'Saved content' });
    const saved = JSON.parse(JSON.stringify(qr().api.getState())) as QrState;
    const rendered = qr().api.render(saved);
    const live = qr().outerHTML;
    const empty = qr().api.render({ ...saved, name: 'empty' });
    expect(empty).toContain('No QR code data.');
    expect(empty).not.toContain('<svg');
    expect(qr().outerHTML).toBe(live);
    qr().api.setState('error', { message: 'Temporary error' });
    qr().api.setState(saved.name, saved.config);
    expect(qr().api.render()).toBe(rendered);
    const current = qr().api.getState();
    const before = qr().outerHTML;
    qr().api.setState(current.name, current.config);
    expect(qr().outerHTML).toBe(before);
  });

  it('keeps labels and error messages as text, preserving caller-owned caption markup', () => {
    const hostile = '"><img src=x onerror="throw 42"><script>throw 43</script>';
    const caption = qr().querySelector('.qr-code-caption')!.outerHTML;
    qr().api.setState('default', { value: hostile, label: hostile });
    expect(qr().querySelector('.qr-code-symbol')?.getAttribute('aria-label')).toBe(hostile);
    expect(qr().querySelectorAll('img,script').length).toBe(0);
    qr().api.setState('error', { message: hostile });
    expect(qr().querySelector('.qr-code-status')?.textContent).toBe(hostile);
    expect(qr().querySelectorAll('img,script').length).toBe(0);
    expect(qr().querySelector('.qr-code-caption')!.outerHTML).toBe(caption);
  });

  it('reflects declarative changes and isolates malformed markup from valid sibling roots', async () => {
    const sibling = path(qr('qr-lg'));
    qr().setAttribute('data-value', 'Attribute update');
    qr().setAttribute('data-ecc', 'H');
    qr().setAttribute('data-version', '7');
    await waitFor(() => qr().api.getState().config.actualVersion === 7, 'attribute update');
    expect(qr().api.getState()).toMatchObject({ name: 'default', config: { value: 'Attribute update', ecc: 'H', version: 7, actualVersion: 7 } });
    expect(path(qr('qr-lg'))).toBe(sibling);
    qr().setAttribute('data-version', '01');
    await waitFor(() => qr().api.getState().name === 'error', 'invalid-markup feedback');
    expect(qr().api.getState().config.errorCode).toBe('invalid-markup');
    expect(path(qr())).toBeNull();
    qr().setAttribute('data-version', 'auto');
    await waitFor(() => qr().api.getState().name === 'default', 'corrected attributes');
    expect(qr().api.getState().config.value).toBe('Attribute update');
  });

  it('recovers an invalid size or variant when corrected to the already-normalized default', async () => {
    for (const [attribute, invalid, valid] of [['data-size', 'xl', 'md'], ['data-variant', 'rounded', 'plain']]) {
      qr().setAttribute(attribute, invalid);
      await waitFor(() => qr().api.getState().config.errorCode === 'invalid-markup', `${attribute} invalid feedback`);
      expect(path(qr())).toBeNull();
      qr().setAttribute(attribute, valid);
      await waitFor(() => qr().api.getState().name === 'default', `${attribute} same-value correction`);
      expect(path(qr())).toBeTruthy();
    }
  });

  it('recovers invalid presentation attributes corrected while the root is truly disconnected', async () => {
    const el = qr();
    for (const [attribute, field, invalid, valid] of [['data-size', 'size', 'xl', 'lg'], ['data-variant', 'variant', 'rounded', 'outline']]) {
      el.setAttribute(attribute, invalid);
      await waitFor(() => el.api.getState().config.errorCode === 'invalid-markup', `${attribute} invalid feedback`);
      expect(path(el)).toBeNull();
      el.remove();
      await waitFor(() => !el.api, `${attribute} root to unbind`);
      el.setAttribute(attribute, valid);
      doc.body.append(el);
      await waitFor(() => el.api?.getState().name === 'default', `${attribute} detached correction to recover`);
      expect(el.api.getState().config[field]).toBe(valid);
      expect(el.api.getState().config.errorCode).toBeUndefined();
      expect(path(el)).toBeTruthy();
      expect(el.querySelector<HTMLElement>('.qr-code-symbol')!.hidden).toBe(false);
    }
    el.api.setState('error', { message: 'Intentionally unavailable' });
    el.remove();
    await waitFor(() => !el.api, 'explicit error root to unbind');
    el.setAttribute('data-size', 'sm');
    doc.body.append(el);
    await waitFor(() => !!el.api, 'explicit error root to rebind');
    expect(el.api.getState()).toMatchObject({ name: 'error', config: { errorCode: 'unavailable', message: 'Intentionally unavailable', size: 'sm' } });
    expect(path(el)).toBeNull();
  });

  it('API value roundtrips and earlier native writes cannot undo the final explicit empty/error state', async () => {
    for (const name of ['empty', 'error']) {
      qr().api.setState('default', { value: 'A' });
      qr().api.setState('default', { value: 'B' });
      qr().api.setState('default', { value: 'A' });
      qr().api.setState(name, { value: 'A' });
      // Let every MutationObserver record from A -> B -> A drain before reading.
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(qr().api.getState().name).toBe(name);
      expect(path(qr())).toBeNull();
      expect(qr().querySelector<HTMLElement>('.qr-code-symbol')!.hidden).toBe(true);
      qr().api.setState('default', { value: 'A' });
      qr().setAttribute('data-value', 'A');
      qr().api.setState(name);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(qr().api.getState().name).toBe(name);
      expect(path(qr())).toBeNull();
    }
  });
});
