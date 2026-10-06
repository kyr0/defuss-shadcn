import { afterEach, describe, expect, it } from 'vitest';
import motionCss from '../src/components/guides/motion/motion.css?raw';
import { draw, entrance, ENTRANCES } from '../src/shared/motion.js';

/**
 * Why: pins the shared motion contract - CSS (src/components/motion/motion.css)
 * owns the keyframes, the controller (src/shared/motion.ts) owns lifecycle.
 * The suite injects the REAL stylesheet (same ?raw pattern as
 * sizing-layout.test.ts) so "entrance() works" and "the CSS applies it" are
 * verified against each other, not against mocks.
 */

let cleanup: (() => void) | null = null;
function injectCss(): void {
  cleanup?.();
  const style = document.createElement('style');
  style.textContent = motionCss;
  document.head.append(style);
  cleanup = () => style.remove();
}

afterEach(() => {
  document.body.innerHTML = '';
  cleanup?.();
  cleanup = null;
});

describe('ENTRANCES', () => {
  it('is the full fifteen-direction vocabulary', () => {
    expect(ENTRANCES).toHaveLength(15);
    expect([...ENTRANCES]).toEqual([
      'up', 'down', 'left', 'right', 'zoom', 'zoom-out', 'pop',
      'spin', 'flip', 'skew', 'blur', 'wipe', 'wipe-up', 'iris', 'fade',
    ]);
  });

  it('every direction ships a CSS rule (source-file twin of the e2e sync check)', () => {
    for (const dir of ENTRANCES) expect(motionCss).toContain(`[data-df-entrance="${dir}"]`);
  });
});

describe('entrance()', () => {
  it('sets the attribute, the platform starts the animation, finished resolves', async () => {
    injectCss();
    const el = document.createElement('div');
    document.body.append(el);

    const motion = entrance(el, 'up', { duration: 60 });
    expect(el.getAttribute('data-df-entrance')).toBe('up');
    expect(el.getAnimations().length, 'CSS created the animation pair').toBeGreaterThan(0);

    await motion.finished; // 60ms + no delay
    // fill:both KEEPS the finished animations as filling entries (that's what
    // holds the settled state) - settled means every entry reports finished
    expect(el.getAnimations().every((a) => a.playState === 'finished')).toBe(true);
    // lifecycle is done - a second trigger starts from a clean registry entry
    expect(el.getAttribute('data-df-entrance'), 'the marker STAYS for query-replay hosts').toBe('up');
  });

  it('per-call options land as the shared custom properties', () => {
    injectCss();
    const el = document.createElement('div');
    document.body.append(el);
    entrance(el, 'wipe', { duration: 300, delay: 50, easing: 'linear', distance: '1rem' });
    expect(el.style.getPropertyValue('--df-motion-duration')).toBe('300ms');
    expect(el.style.getPropertyValue('--df-motion-delay')).toBe('50ms');
    expect(el.style.getPropertyValue('--df-motion-ease')).toBe('linear');
    expect(el.style.getPropertyValue('--df-motion-distance')).toBe('1rem');
  });

  it('unknown effects throw (fail loud at the call site)', () => {
    const el = document.createElement('div');
    expect(() => entrance(el, 'teleport')).toThrow(/unknown entrance "teleport"/);
  });

  it('replays without an effect argument (reuses the authored attribute)', async () => {
    injectCss();
    const el = document.createElement('div');
    el.setAttribute('data-df-entrance', 'fade');
    document.body.append(el);

    await entrance(el, undefined, { duration: 40 }).finished;
    const again = entrance(el, undefined, { duration: 40 }); // same effect, twice
    expect(again).toBeTruthy();
    await again.finished;
    expect(el.getAttribute('data-df-entrance')).toBe('fade');
  });

  it('a superseding trigger wins: the first handle resolves but the element keeps the latest effect', async () => {
    injectCss();
    const el = document.createElement('div');
    document.body.append(el);
    const first = entrance(el, 'up', { duration: 200 });
    const second = entrance(el, 'zoom', { duration: 40 });
    await first.finished; // cancelled by the supersede → resolves via the catch
    await second.finished;
    expect(el.getAttribute('data-df-entrance')).toBe('zoom');
  });

  it('cancel() unwinds immediately and removes the attribute', () => {
    injectCss();
    const el = document.createElement('div');
    document.body.append(el);
    const motion = entrance(el, 'iris', { duration: 5000 });
    motion.cancel();
    expect(el.hasAttribute('data-df-entrance'), 'cancel is a true unwind').toBe(false);
    expect(el.getAnimations().length).toBe(0);
  });

  it('fade ends at the element\'s authored opacity, never 1', async () => {
    injectCss();
    const el = document.createElement('div');
    el.style.opacity = '0.6';
    document.body.append(el);
    await entrance(el, 'fade', { duration: 40 }).finished;
    expect(getComputedStyle(el).opacity, 'dimmed content stays dimmed').toBe('0.6');
  });

  it('stagger: container children get graded animation delays', () => {
    injectCss();
    const host = document.createElement('ul');
    host.setAttribute('data-df-stagger', '');
    for (let i = 0; i < 3; i++) {
      const li = document.createElement('li');
      li.setAttribute('data-df-entrance', 'up');
      host.append(li);
    }
    document.body.append(host);
    const delays = [...host.children].map((c) => parseFloat(getComputedStyle(c).animationDelay) * 1000);
    expect(delays, '0 / 120 / 240ms by default step').toEqual([0, 120, 240]);
  });
});

describe('draw()', () => {
  it('replays the dash animation on a pathLength="1" path', async () => {
    injectCss();
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path') as SVGPathElement;
    path.setAttribute('pathLength', '1');
    path.setAttribute('d', 'M0 0 L10 10');
    path.setAttribute('data-df-draw', '');
    svg.append(path);
    document.body.append(svg);

    expect(parseFloat(getComputedStyle(path).strokeDashoffset), 'authored hidden state').toBeCloseTo(1);
    const handle = draw(path as unknown as SVGElement, { duration: 50 });
    expect(path.getAnimations().length).toBe(1);
    await handle.finished;
    expect(parseFloat(getComputedStyle(path).strokeDashoffset), 'settled visible state').toBeCloseTo(0);
  });
});
