// -- Typewriter -------------------------------------------------
// Types a list of strings character by character, holds, deletes and
// cycles, behind a cursor. The strings are authored as child elements, so
// the markup is readable without script and a screen reader hears the whole
// list once (the moving copy is aria-hidden) - never a live region churning
// through every keystroke. Plus the named-state API (AGENTS.md "State API").

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, defussQuery, componentState, bindComponent } from '../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

// VERIFIED: (verify's component types ratchet - tsc -p tsconfig.components.json) every type
// this file's API docs state - arguments, return values, event details - holds
// against its code: a wrong one is a new type error and fails the build.

/** What typewriter-typed carries. */
interface TypewriterTypedDetail {
  /** the index of the string just completed */
  index: number;
  /** that string */
  text: string;
}

/** What typewriter-done carries. */
interface TypewriterDoneDetail {
  /** the index of the last string - the run ends on it */
  index: number;
}

const typewriterStates = ['default', 'paused', 'done'];

/** setState() configs per state. */
export interface TypewriterStateConfigs {
  /** Running - typing, holding, deleting. Setting it restarts (from paused without an index it resumes). */
  default: {
    /** the string to start from, 0-based */
    index?: number;
    /** true: start without the data-start-delay */
    immediate?: boolean;
  };
  /** Frozen where it is; the cursor blinks. */
  paused: {};
  /** Stopped with a string in full - entered at the end of a run without data-loop. */
  done: {
    /** the string to show, 0-based (default: the current one) */
    index?: number;
  };
}

const num = (el, key, fallback) => {
  const v = parseFloat(el.dataset[key]);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
};

const reducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Characters as the reader sees them (an emoji or accented letter is one). */
const graphemes = (text) =>
  globalThis.Intl?.Segmenter
    ? Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text), (s) => s.segment)
    : Array.from(text);

/** Paints `count` characters of string `index`, with that string's colour. */
function paint(tw, index, count) {
  const src = tw._sources[index];
  tw._text.textContent = src.chars.slice(0, count).join('');
  // colour cycling: each string may carry its own class / style
  tw._text.className = `typewriter-text${src.className ? ` ${src.className}` : ''}`;
  tw._text.setAttribute('style', src.style);
  tw.dataset.index = String(index);
  tw._index = index;
  tw._count = count;
}

/** Sets the phase CSS keys on (the cursor is solid while typing, blinks idle). */
const phase = (tw, name) => { tw.dataset.phase = name; };

function stop(tw) {
  clearTimeout(tw._timer);
  tw._timer = 0;
}

/** Delay for the next keystroke; data-variable jitters it for a human rhythm. */
function keyDelay(tw, base) {
  if (!tw.hasAttribute('data-variable')) return base;
  return base * (0.5 + Math.random());
}

/**
 * One step of the loop: type the current string, hold, delete, move on.
 * Each step schedules the next; stop() cancels the chain.
 */
function step(tw) {
  if (!tw.isConnected) return stop(tw);
  const src = tw._sources[tw._index];
  const last = tw._index === tw._sources.length - 1;
  const loop = tw.hasAttribute('data-loop');
  const next = (fn, ms) => { tw._timer = setTimeout(() => fn(tw), ms); };

  if (tw._deleting) {
    if (tw._count > 0) {
      phase(tw, 'deleting');
      paint(tw, tw._index, tw._count - 1);
      return next(step, keyDelay(tw, num(tw, 'deleteSpeed', 35)));
    }
    tw._deleting = false;
    paint(tw, (tw._index + 1) % tw._sources.length, 0);
    return next(step, num(tw, 'speed', 70));
  }

  if (tw._count < src.chars.length) {
    phase(tw, 'typing');
    paint(tw, tw._index, tw._count + 1);
    return next(step, keyDelay(tw, num(tw, 'speed', 70)));
  }

  // the string is complete
  tw.dispatchEvent(new CustomEvent<TypewriterTypedDetail>('typewriter-typed', { bubbles: true, detail: { index: tw._index, text: src.text } }));
  if (last && !loop) return finish(tw);
  phase(tw, 'holding');
  tw._deleting = true;
  return next(step, num(tw, 'pause', 1500));
}

/** Stops on the current string, complete - the natural end of a run. */
function finish(tw) {
  typewriterApi.setState(tw, 'done', { index: tw._index });
  // Fires when a run ends on its last string - that string's index.
  tw.dispatchEvent(new CustomEvent<TypewriterDoneDetail>('typewriter-done', { bubbles: true, detail: { index: tw._index } }));
}

/** Reduced motion: whole strings swap in place on the pause rhythm - no typing. */
function stepInstant(tw) {
  if (!tw.isConnected) return stop(tw);
  const last = tw._index === tw._sources.length - 1;
  paint(tw, tw._index, tw._sources[tw._index].chars.length);
  phase(tw, 'idle');
  if (last && !tw.hasAttribute('data-loop')) return finish(tw);
  tw._timer = setTimeout(() => {
    paint(tw, (tw._index + 1) % tw._sources.length, 0);
    stepInstant(tw);
  }, num(tw, 'pause', 1500) + 1000);
}

function run(tw, delay = 0) {
  stop(tw);
  const go = () => (reducedMotion() ? stepInstant(tw) : step(tw));
  if (delay) tw._timer = setTimeout(go, delay);
  else go();
}

/**
 * The markup of a state, for render(): the attributes a state writes, applied
 * to a detached copy of the authored markup ('default' IS the authored
 * markup). The live element gets the same markup from triggerStateChange -
 * the e2e render round trip proves they agree.
 */
function applyMarkup(_el, _stateName) {
  // typing is time, not state: the typed line, the string index and the
  // phase are written by the clock (runtime-owned, see the e2e) - every
  // state renders the authored strings
}

/**
 * UI side of setState. 'default' (re)starts the cycle - from string
 * `{ index }` when given; coming from 'paused' without an index it resumes
 * where it stopped; otherwise from the first string. 'paused' freezes it where it
 * is (the cursor blinks); 'done' stops with a string shown in full
 * (`{ index }`, default the current one).
 */
function triggerStateChange(tw, stateName, config, previous) {
  const count = tw._sources.length;
  // an editor may hand the index over as a string
  const asked = config.index === undefined || config.index === '' ? NaN : Number(config.index);
  const pick = Number.isInteger(asked) ? Math.min(Math.max(asked, 0), count - 1) : undefined;
  switch (stateName) {
    case 'default':
      if (pick === undefined && previous === 'paused') {
        run(tw);
        break;
      }
      tw._deleting = false;
      paint(tw, pick ?? 0, 0);
      phase(tw, 'idle');
      run(tw, config.immediate ? 0 : num(tw, 'startDelay', 0));
      break;
    case 'paused':
      stop(tw);
      phase(tw, 'idle');
      break;
    case 'done': {
      stop(tw);
      const index = pick ?? tw._index ?? 0;
      paint(tw, index, tw._sources[index].chars.length);
      phase(tw, 'idle');
      break;
    }
  }
}

/** Registry-level API; pass the .typewriter element explicitly. Unknown names throw. */
export const typewriterApi = componentState({
  component: 'typewriter',
  states: typewriterStates,
  apply: (tw, state, previous) => {
    tw.dataset.stateName = state.name;
    triggerStateChange(tw, state.name, state.config, previous.name);
  },
  markup: (el, state) => applyMarkup(el, state.name),
});

df$.typewriterApi = typewriterApi;
df$.typewriterStates = typewriterStates;

function init() {
  dfDollar('.typewriter:not([data-init])').toArray().forEach((tw) => {
    tw.dataset.init = '';

    const children = Array.from(tw.children);
    if (!children.length) return; // no strings authored - nothing to type
    tw._sources = children.map((c) => ({
      text: c.textContent ?? '',
      chars: graphemes(c.textContent ?? ''),
      className: c.getAttribute('class') ?? '',
      style: c.getAttribute('style') ?? '',
    }));
    // the authored strings stay in the DOM for assistive tech (visually
    // hidden by CSS); the typed copy and the cursor are presentation only
    children.forEach((c) => c.classList.add('typewriter-source'));

    // the visible line: the typed text + the cursor, one unit
    const line = document.createElement('span');
    line.className = 'typewriter-line';
    line.setAttribute('aria-hidden', 'true');
    tw._text = document.createElement('span');
    tw._text.className = 'typewriter-text';
    const cursor = document.createElement('span');
    cursor.className = 'typewriter-cursor';
    line.append(tw._text, cursor);
    tw.append(line);

    // data-reserve: the box is as wide as the longest string from the
    // start, so the sentence around it never shifts
    if (tw.hasAttribute('data-reserve')) {
      const ghost = document.createElement('span');
      ghost.className = 'typewriter-ghost';
      ghost.setAttribute('aria-hidden', 'true');
      tw._sources.forEach((s) => {
        const g = document.createElement('span');
        g.textContent = s.text;
        dfDollar(ghost).append(g);
      });
      tw.append(ghost);
    }

    // el.store + el.api (AGENTS.md "State through stores")

    bindComponent(tw, typewriterApi);

    paint(tw, 0, 0);
    phase(tw, 'idle');
    tw.dataset.stateName = 'default';

    // data-trigger="visible": start the first time it scrolls into view
    if (tw.dataset.trigger === 'visible' && globalThis.IntersectionObserver) {
      const io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          typewriterApi.setState(tw, 'default', {});
        }
      });
      io.observe(tw);
    } else {
      typewriterApi.setState(tw, 'default', {});
    }
  });
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
