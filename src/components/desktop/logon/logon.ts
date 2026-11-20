// -- Logon --------------------------------------------------------
// A desktop's sign-in and lock screen: the users as buttons, a password form
// for the one picked and the power buttons. It checks nothing itself - a
// submit fires logon-submit with the user and the typed password, and the
// page answers: df$.shadcn.logon.fail() shows a message, .done() signs in
// (the screen hides), .lock() brings it back. A user without a password
// (data-no-password) signs in on the pick.
// VERIFIED: (logon.e2e) a screen authored signed in starts signed in - read() derives the state from the markup,
// so render() reproduces it.

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, defussQuery, componentState, bindComponent } from '../../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

/** What logon-submit carries. */
interface LogonSubmitDetail {
  /** the picked user's data-user */
  user: string;
  /** what was typed into the password field ('' for a user without one) - the page checks it; nothing is kept */
  password: string;
}

/** What logon-power carries. */
interface LogonPowerDetail {
  /** the data-logon-power of the button: shutdown, restart, sleep ... */
  action: string;
}

const logonStates = ['default', 'signing-in', 'error', 'signed-in'];

/** setState() configs per state. */
export interface LogonStateConfigs {
  /** The users to pick from. */
  default: {};
  /** A user picked: the password form shows. */
  'signing-in': {
    /** the data-user of the picked user */
    user?: string;
  };
  /** The page refused the sign-in: the form shows its message. */
  error: {
    /** the data-user of the picked user */
    user?: string;
    /** what went wrong, shown under the field */
    message?: string;
  };
  /** Signed in: the screen hides. */
  'signed-in': {
    /** the data-user of the user signed in */
    user?: string;
  };
}

const resolve = (target) =>
  typeof target === 'string' ? (dfDollar('#' + CSS.escape(target)).get(0) ?? dfDollar(target).get(0)) : target;

const users = (el: HTMLElement): HTMLElement[] => dfDollar(el).find<HTMLElement>('.logon-user').toArray();
const nameOf = (u: HTMLElement): string =>
  (dfDollar(u).find('.logon-name').get(0)?.textContent ?? u.textContent ?? '').trim();

/**
 * The markup of a state: which user is pressed, the form and its message, the
 * screen's own data-user / data-signed-in.
 */
function applyMarkup(el, stateName, config) {
  const user = stateName === 'default' ? '' : (config.user ?? '');
  for (const u of users(el)) dfDollar(u).attr('aria-pressed', user && u.dataset.user === user ? 'true' : 'false');
  dfDollar(el).attr('data-user', user || null);
  dfDollar(el).attr('data-signed-in', stateName === 'signed-in' ? '' : null);
  const form = dfDollar(el).find('.logon-form');
  form.attr('hidden', stateName === 'signing-in' || stateName === 'error' ? null : '');
  const picked = users(el).find((u) => u.dataset.user === user);
  form.find('.logon-for').text(picked ? nameOf(picked) : '');
  const err = dfDollar(el).find('.logon-error');
  err.attr('hidden', stateName === 'error' ? null : '');
  err.text(stateName === 'error' ? (config.message ?? '') : '');
  form.find('input[type="password"]').attr('aria-invalid', stateName === 'error' ? 'true' : null);
}

function triggerStateChange(el, stateName, config) {
  applyMarkup(el, stateName, config);
  el.dataset.stateName = stateName;
  const input = dfDollar(el).find('.logon-form input[type="password"]').get(0) as HTMLInputElement | undefined;
  if (stateName === 'signing-in' || stateName === 'error') {
    if (input) {
      if (stateName === 'signing-in') input.value = '';
      requestAnimationFrame(() => input.focus());
      if (stateName === 'error') input.select();
    }
  } else if (input) input.value = '';
  if (stateName === 'default') users(el)[0]?.focus({ preventScroll: true });
}

/** Registry-level API; pass the .logon element explicitly. Unknown names throw. */
export const logonApi = componentState({
  component: 'logon',
  states: logonStates,
  apply: (el, state) => triggerStateChange(el, state.name, state.config),
  // the config is in the markup: the user picked (data-user) and the message shown
  read: (el) => {
    const name = el.dataset.stateName || 'default';
    if (name === 'default') return { name, config: {} };
    const user = el.dataset.user ?? '';
    if (name !== 'error') return { name, config: { user } };
    return { name, config: { user, message: dfDollar(el).find('.logon-error').text() } };
  },
  markup: (el, state) => applyMarkup(el, state.name, state.config),
});

df$.logonApi = logonApi;
df$.logonStates = logonStates;

function pickUser(el: HTMLElement, u: HTMLElement) {
  const user = u.dataset.user ?? nameOf(u);
  if (u.hasAttribute('data-no-password')) {
    logonApi.setState(el, 'signing-in', { user });
    submit(el, user, '');
  } else logonApi.setState(el, 'signing-in', { user });
}

function submit(el: HTMLElement, user: string, password: string) {
  // Fires when the reader signs in - the user and what they typed; the page answers with done() or fail().
  el.dispatchEvent(new CustomEvent<LogonSubmitDetail>('logon-submit', { bubbles: true, detail: { user, password } }));
}

function bind(el: HTMLElement) {
  el.addEventListener('click', (e) => {
    const u = (e.target as Element).closest('.logon-user') as HTMLElement | null;
    if (u) pickUser(el, u);
    const p = (e.target as Element).closest('[data-logon-power]') as HTMLElement | null;
    // Fires when a power button is pressed - the page shuts down, restarts or sleeps.
    if (p)
      el.dispatchEvent(
        new CustomEvent<LogonPowerDetail>('logon-power', {
          bubbles: true,
          detail: { action: p.dataset.logonPower ?? '' },
        }),
      );
  });
  dfDollar(el)
    .find('.logon-form')
    .on('submit', (e) => {
      e.preventDefault();
      const input = dfDollar(el).find('.logon-form input[type="password"]').get(0) as HTMLInputElement | undefined;
      submit(el, el.dataset.user ?? '', input?.value ?? '');
    });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && (e.target as Element).closest('.logon-form')) {
      e.preventDefault();
      logonApi.setState(el, 'default', {});
    }
    // arrows between the users
    const u = (e.target as Element).closest('.logon-user');
    if (!u || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    const all = users(el);
    const next =
      all[
        (all.indexOf(u as HTMLElement) + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + all.length) %
          all.length
      ];
    e.preventDefault();
    next.focus();
  });
}

/**
 * Refuse the sign-in: the form shows the message and keeps the user.
 * @param target - the .logon element, its id or a selector
 * @param message - what went wrong
 * @returns the screen, null when the target matches none
 */
const fail = (target: string | HTMLElement, message: string): HTMLElement | null => {
  const el = resolve(target);
  if (el) logonApi.setState(el, 'error', { user: el.dataset.user ?? '', message });
  return el;
};

/**
 * Sign in: the screen hides.
 * @param target - the .logon element, its id or a selector
 * @returns the screen, null when the target matches none
 */
const done = (target: string | HTMLElement): HTMLElement | null => {
  const el = resolve(target);
  if (el) logonApi.setState(el, 'signed-in', { user: el.dataset.user ?? '' });
  return el;
};

/**
 * Lock: the screen shows again, with the users to pick from.
 * @param target - the .logon element, its id or a selector
 * @returns the screen, null when the target matches none
 */
const lock = (target: string | HTMLElement): HTMLElement | null => {
  const el = resolve(target);
  if (el) logonApi.setState(el, 'default', {});
  return el;
};

/** df$.shadcn.logon - answer a sign-in, lock the screen. */
export const logonActions = { fail, done, lock };
df$.logon = logonActions;

function init() {
  dfDollar('.logon:not([data-init])')
    .toArray()
    .forEach((el) => {
      el.dataset.init = '';
      for (const u of users(el)) if (!u.hasAttribute('aria-pressed')) u.setAttribute('aria-pressed', 'false');
      el.dataset.stateName = el.hasAttribute('data-signed-in') ? 'signed-in' : 'default';
      // the markup the authored state implies (its user pressed and named) is written at init, not on the first change
      if (el.dataset.stateName === 'signed-in') applyMarkup(el, 'signed-in', { user: el.dataset.user ?? '' });
      bind(el);
      // el.store + el.api (AGENTS.md "State through stores")
      bindComponent(el, logonApi);
    });
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
