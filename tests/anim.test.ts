import { afterEach, describe, expect, it } from 'vitest';
import {
  anim,
  animChannel,
  animKeyframes,
  ANIM_NAMES,
} from '../src/shared/anim.js';

/**
 * Why: pins the df$.anim engine contract - the pure keyframe generator
 * (direction math, in/out pairing, unknown-name throws) and the runtime
 * lifecycle (play/pause/resume/finish/reset/state, composite overlay
 * scaffolding, scroll scrubbing). Runs in Vitest browser mode against the
 * real Web Animations API - no mocks.
 */

afterEach(() => {
  document.body.innerHTML = '';
});

const el = (html = '<div>target</div>'): HTMLElement => {
  document.body.innerHTML = html;
  return document.body.firstElementChild as HTMLElement;
};

describe('ANIM_NAMES', () => {
  it('is the full paired in/out vocabulary plus the blocks composite', () => {
    expect([...ANIM_NAMES]).toEqual([
      'fadeIn', 'fadeOut',
      'slideIn', 'slideOut',
      'zoomIn', 'zoomOut',
      'popIn', 'popOut',
      'spinIn', 'spinOut',
      'flipIn', 'flipOut',
      'skewIn', 'skewOut',
      'blurIn', 'blurOut',
      'wipeIn', 'wipeOut',
      'irisIn', 'irisOut',
      'blocksIn', 'blocksOut',
    ]);
    expect(anim.names).toBe(ANIM_NAMES);
  });

  it('every name ships a registry channel with the full lifecycle surface', () => {
    for (const name of ANIM_NAMES) {
      const channel = anim[name];
      for (const method of ['play', 'pause', 'resume', 'finish', 'reset', 'state'] as const) {
        expect(typeof channel[method], `${name}.${method}`).toBe('function');
      }
    }
  });
});

describe('animKeyframes (pure)', () => {
  it('fadeIn ends at the authored opacity, fadeOut starts there', () => {
    const ctx = { baseOpacity: 0.4 };
    expect(animKeyframes('fadeIn', {}, ctx).at(-1)).toMatchObject({ opacity: 0.4 });
    expect(animKeyframes('fadeOut', {}, ctx)[0]).toMatchObject({ opacity: 0.4 });
    expect(animKeyframes('fadeIn', {}, ctx)[0]).toMatchObject({ opacity: 0 });
  });

  it('slideIn starts at the named edge, slideOut exits toward it', () => {
    expect(animKeyframes('slideIn', { direction: 'north' })[0].transform).toContain('calc(-1 * 24px)');
    expect(animKeyframes('slideIn', { direction: 'south' })[0].transform).toContain('translate(0px, 24px)');
    expect(animKeyframes('slideIn', { direction: 'west' })[0].transform).toContain('translate(calc(-1 * 24px), 0px)');
    expect(animKeyframes('slideIn', { direction: 'east' })[0].transform).toContain('translate(24px, 0px)');
    expect(animKeyframes('slideOut', { direction: 'east' }).at(-1)?.transform).toContain('translate(24px, 0px)');
    expect(animKeyframes('slideIn', { distance: '100px' })[0].transform).toContain('100px');
  });

  it('wipe reveals from the named edge and collapses back toward it', () => {
    expect(animKeyframes('wipeIn', { direction: 'west' })[0].clipPath).toBe('inset(0px 100% 0px 0px)');
    expect(animKeyframes('wipeIn', { direction: 'east' })[0].clipPath).toBe('inset(0px 0px 0px 100%)');
    expect(animKeyframes('wipeIn', { direction: 'north' })[0].clipPath).toBe('inset(0px 0px 100% 0px)');
    expect(animKeyframes('wipeIn', { direction: 'south' })[0].clipPath).toBe('inset(100% 0px 0px 0px)');
    expect(animKeyframes('wipeOut', { direction: 'east' }).at(-1)?.clipPath).toBe('inset(0px 0px 0px 100%)');
  });

  it('iris opens/closes from the configured origin', () => {
    expect(animKeyframes('irisIn', { origin: '20% 80%' })[0].clipPath).toBe('circle(0% at 20% 80%)');
    expect(animKeyframes('irisIn', { origin: '20% 80%' }).at(-1)?.clipPath).toBe('circle(150% at 20% 80%)');
    expect(animKeyframes('irisOut', { origin: '20% 80%' }).at(-1)?.clipPath).toBe('circle(0% at 20% 80%)');
  });

  it('zoom honors the origin option on every keyframe', () => {
    for (const frame of animKeyframes('zoomIn', { origin: '10% 10%' })) {
      expect(frame.transformOrigin).toBe('10% 10%');
    }
  });

  it('zoom honors the scale option (1.1 = the shrink-in entrance)', () => {
    expect(animKeyframes('zoomIn', { scale: 1.1 })[0].transform).toBe('scale(1.1)');
    expect(animKeyframes('zoomOut', { scale: 1.1 }).at(-1)?.transform).toBe('scale(1.1)');
  });

  it('throws for composite names (overlay-driven, no element keyframes)', () => {
    expect(() => animKeyframes('blocksIn')).toThrow(/composite/);
  });
});

describe('animChannel', () => {
  it('resolves registered names and throws on unknown ones', () => {
    expect(animChannel('fadeIn')).toBe(anim.fadeIn);
    expect(() => animChannel('nope')).toThrow(/unknown animation "nope"/);
  });
});

describe('lifecycle', () => {
  it('play → running, pause → paused, resume → running, finish → finished', async () => {
    const target = el();
    expect(anim.fadeIn.state(target)).toBe('idle');
    anim.fadeIn.play(target, { duration: 60000 });
    expect(anim.fadeIn.state(target)).toBe('running');
    anim.fadeIn.pause(target);
    expect(anim.fadeIn.state(target)).toBe('paused');
    anim.fadeIn.resume(target);
    expect(anim.fadeIn.state(target)).toBe('running');
    anim.fadeIn.finish(target);
    expect(anim.fadeIn.state(target)).toBe('finished');
    // fill: both - the end state holds
    expect(Number(getComputedStyle(target).opacity)).toBe(1);
  });

  it('reset() unwinds to the authored style and idle state', async () => {
    const target = el('<div style="opacity: 0.5">target</div>');
    anim.fadeOut.play(target, { duration: 60000 });
    expect(anim.fadeOut.state(target)).toBe('running');
    anim.fadeOut.reset(target);
    expect(anim.fadeOut.state(target)).toBe('idle');
    expect(getComputedStyle(target).opacity).toBe('0.5');
  });

  it('play() deterministically supersedes a running instance', async () => {
    const target = el();
    const first = anim.slideIn.play(target, { duration: 60000 });
    const second = anim.slideIn.play(target, { duration: 60000 });
    expect(anim.slideIn.state(target)).toBe('running');
    await expect(first.finished).resolves.toBeUndefined();
    second.finish();
    expect(anim.slideIn.state(target)).toBe('finished');
  });

  it('finished resolves on settle', async () => {
    const target = el();
    const handle = anim.fadeIn.play(target, { duration: 5 });
    await expect(handle.finished).resolves.toBeUndefined();
  });
});

describe('blocks composite', () => {
  it('blocksIn covers the element with N panels and keeps the overlay', async () => {
    const target = el('<div style="width: 100px; height: 100px">target</div>');
    const handle = anim.blocksIn.play(target, { blocks: 5, duration: 5, stagger: 1 });
    const overlay = target.querySelector('[data-df-anim-blocks]');
    expect(overlay).not.toBeNull();
    expect(overlay!.children).toHaveLength(5);
    await handle.finished;
    // a settled cover-up IS the end state - the overlay stays until reset/roll-out
    expect(target.querySelector('[data-df-anim-blocks]')).not.toBeNull();
    expect(anim.blocksIn.state(target)).toBe('finished');
  });

  it('blocksOut starts covered and removes the overlay after settling', async () => {
    const target = el('<div style="width: 100px; height: 100px">target</div>');
    const handle = anim.blocksOut.play(target, { blocks: 3, duration: 5, stagger: 1 });
    expect(target.querySelector('[data-df-anim-blocks]')).not.toBeNull();
    await handle.finished;
    await new Promise((r) => setTimeout(r, 30));
    expect(target.querySelector('[data-df-anim-blocks]')).toBeNull();
  });

  it('the configured cover color lands on every block (blend-over visibility)', () => {
    const target = el('<div style="width: 100px; height: 100px">target</div>');
    anim.blocksIn.play(target, { blocks: 3, duration: 60000, color: 'rgb(14, 165, 233)' });
    const blocks = target.querySelectorAll('[data-df-anim-blocks] > div');
    expect(blocks).toHaveLength(3);
    for (const block of blocks) {
      expect(getComputedStyle(block as HTMLElement).backgroundColor).toBe('rgb(14, 165, 233)');
    }
    anim.blocksIn.reset(target);
  });

  it('reset() removes the overlay and restores the authored position', () => {
    const target = el('<div style="width: 100px; height: 100px">target</div>');
    anim.blocksIn.play(target, { duration: 60000 });
    expect(target.style.position).toBe('relative');
    anim.blocksIn.reset(target);
    expect(target.querySelector('[data-df-anim-blocks]')).toBeNull();
    expect(target.style.position).toBe('');
  });
});

describe('scroll binding (listener fallback)', () => {
  it('scrubs animation progress from the target element scroll position', async () => {
    document.body.innerHTML = `
      <div id="scroller" style="height: 100px; overflow-y: scroll">
        <div style="height: 1100px">tall</div>
      </div>
      <div id="target">target</div>`;
    const scroller = document.getElementById('scroller')!;
    const target = document.getElementById('target')!;
    anim.fadeIn.play(target, {
      duration: 1000,
      scroll: { target: scroller, axis: 'y', forceFallback: true },
    });
    expect(anim.fadeIn.state(target)).toBe('paused');
    scroller.scrollTop = 500; // 500 / (1100 - 100) = 0.5
    scroller.dispatchEvent(new Event('scroll'));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const animation = target.getAnimations()[0];
    expect(Math.round(Number(animation.currentTime))).toBe(500);
    anim.fadeIn.reset(target);
    expect(target.getAnimations()).toHaveLength(0);
  });
});
