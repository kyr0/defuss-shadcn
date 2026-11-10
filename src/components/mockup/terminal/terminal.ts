// -- Terminal ----------------------------------------------------------------------------------------
// A terminal emulator over the OFFICIAL xterm.js (xtermjs/xterm.js, MIT) with its fit, clipboard, serialize and
// web-links addons - zero xterm bytes ship here. One <div class="terminal"> is the whole markup; the runtime opens
// an xterm in a .terminal-screen it adds (data-ce-chrome) and gives it a small shell: a line editor (arrows, Home /
// End, history, Tab completion, Ctrl+C, Ctrl+L, Ctrl+U), a prompt (data-prompt) and commands - built-in help, clear,
// echo and history, the page's own through df$.shadcn.terminal.commands(). A script child (script.terminal-script,
// JSON steps) replays a session: commands typed at the prompt and their output - data-autoplay plays it when the
// terminal first comes into view, a key press finishes it at once.
//
// - Lazy: a page without a terminal never requests xterm. The first terminal imports the pinned ESM builds and
//   links xterm's stylesheet ONCE (PINNED; configure({ urls }) self-hosts them).
// - Themed: xterm paints its own cells, so its theme is read from the element's --terminal-* custom properties
//   (the variants set them from the tokens or a fixed palette) through the browser's own colour conversion; a
//   theme change (dark mode, the theme switcher, defuss-theme-change) re-reads them.
// - Sized: the screen fills the element (the fit addon, on every resize); data-rows makes it that many rows high.
// - No trap: Tab completes a command, but on an empty line (and Shift+Tab always) it moves the focus on.
//
// Why xterm.js and not cells of our own: selection, scrollback, VT parsing, links and a screen-reader mode are the
// reference implementation's decade of work; what a page lacks is a shell, so that is what this file adds.
//
// The line editor counts one column per character: wide characters (CJK, emoji) in a typed line misplace the cursor.

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js -
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, defussQuery, componentState, bindComponent } from '../../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

// 'default' = a prompt that takes input, 'running' = a command or a replay runs, 'readonly' = output only
const terminalStates = ['default', 'running', 'readonly'];

/** setState() configs per state (getState() reports the prompt and, while running, the command). */
export interface TerminalStateConfigs {
  /** A prompt that takes input. */
  default: {
    /** the prompt text (written to data-prompt) */
    prompt?: string;
  };
  /** A command runs (setState runs it as if typed) - or, without one, the script replays. Lands in default. */
  running: {
    /** the command line to run */
    command?: string;
  };
  /** Output only: no prompt, no input (data-readonly). */
  readonly: {};
}

/** The pinned official xterm.js build the component loads (always this exact version). */
export const XTERM_URL = 'https://cdn.jsdelivr.net/npm/@xterm/xterm@6.0.0/lib/xterm.mjs';

/** Where the vendor files come from - the pinned jsDelivr builds, or self-hosted copies of the same versions. */
export interface TerminalUrls {
  /** the xterm.js ES module (exports Terminal) */
  xterm: string;
  /** xterm's stylesheet */
  css: string;
  /** the fit addon - sizes the terminal to its box */
  fit: string;
  /** the clipboard addon - OSC 52: programs reach the browser's clipboard */
  clipboard: string;
  /** the serialize addon - the buffer as VT sequences or HTML */
  serialize: string;
  /** the web-links addon - URLs in the output become links */
  webLinks: string;
}

const PINNED: TerminalUrls = {
  xterm: XTERM_URL,
  css: 'https://cdn.jsdelivr.net/npm/@xterm/xterm@6.0.0/css/xterm.css',
  fit: 'https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0.11.0/lib/addon-fit.mjs',
  clipboard: 'https://cdn.jsdelivr.net/npm/@xterm/addon-clipboard@0.2.0/lib/addon-clipboard.mjs',
  serialize: 'https://cdn.jsdelivr.net/npm/@xterm/addon-serialize@0.14.0/lib/addon-serialize.mjs',
  webLinks: 'https://cdn.jsdelivr.net/npm/@xterm/addon-web-links@0.12.0/lib/addon-web-links.mjs',
};
const urls: TerminalUrls = { ...PINNED };

/** A tone of the system - the same words as the Code Mockup's line tones. */
export type TerminalTone = 'success' | 'warning' | 'info' | 'destructive' | 'muted' | 'bold';

/** What a command handler gets: its words, the line, ways to write, and a signal that Ctrl+C aborts. */
export interface TerminalCommandContext {
  /** the command's name as typed (the first word) */
  name: string;
  /** the words after the name ("quoted words" stay one) */
  args: string[];
  /** the whole line as typed */
  line: string;
  /** the terminal element */
  terminal: HTMLElement;
  /** writes text - "\n" starts a new line */
  write: (text: string) => void;
  /** writes a line */
  writeln: (text?: string) => void;
  /** aborted by Ctrl+C, setState('default') or the element leaving the page */
  signal: AbortSignal;
}

/** A command: what it returns (text, lines, or a promise of them) is written after it. */
export type TerminalCommand = (
  context: TerminalCommandContext,
) => string | string[] | void | Promise<string | string[] | void>;

/** A command with a description - help lists it. */
export interface TerminalCommandSpec {
  /** runs the command */
  run: TerminalCommand;
  /** one line for help */
  description?: string;
  /** left out of help and Tab completion */
  hidden?: boolean;
}

/** One step of a replayed session (script.terminal-script holds an array of them). */
export interface TerminalStep {
  /** a command line, typed at the prompt and run - through `output` when it is given, else through the command */
  command?: string;
  /** text written (after the command, or alone); an array writes one line each */
  output?: string | string[];
  /** the output's tone */
  tone?: TerminalTone;
  /** ms to wait before the step */
  wait?: number;
  /** false: the command appears at once instead of being typed */
  typing?: boolean;
}

/** Fires when a command line is submitted, before it runs. */
export interface TerminalCommandDetail {
  /** the whole line */
  line: string;
  /** the command's name (the first word) */
  name: string;
  /** the words after it */
  args: string[];
}

/** Fires once the xterm is open and sized. */
export interface TerminalReadyDetail {
  /** columns */
  cols: number;
  /** rows */
  rows: number;
}

// -- the part of xterm.js this component uses ---------------------------------------------------------

/** What xterm returns for a listener - disposing it removes the listener. */
interface XtermDisposable {
  /** removes the listener */
  dispose(): void;
}
/** One line of an xterm buffer. */
interface XtermBufferLine {
  /** the line as text; trimRight leaves out the cells never written at its end */
  translateToString(trimRight?: boolean): string;
}
/** An xterm buffer: the scrollback and the screen. */
interface XtermBuffer {
  /** lines in the buffer (scrollback + screen) */
  length: number;
  /** the cursor's column */
  cursorX: number;
  /** the line at y (0 = the oldest in the scrollback) */
  getLine(y: number): XtermBufferLine | undefined;
}
/** The official xterm.js Terminal - the members this component uses (the instance has every other one too). */
export interface XtermLike {
  /** columns */
  cols: number;
  /** rows */
  rows: number;
  /** live options (theme, fonts, cursor ...) */
  options: Record<string, unknown>;
  /** the screen buffer */
  buffer: { active: XtermBuffer };
  /** opens the terminal in an element */
  open(parent: HTMLElement): void;
  /** writes data (VT sequences allowed); the callback runs once it is parsed */
  write(data: string, callback?: () => void): void;
  /** clears the scrollback and the screen but the cursor line */
  clear(): void;
  /** focuses the terminal */
  focus(): void;
  /** resizes to cols x rows */
  resize(cols: number, rows: number): void;
  /** loads an addon */
  loadAddon(addon: unknown): void;
  /** listens to typed / pasted data */
  onData(listener: (data: string) => void): XtermDisposable;
  /** decides per key event whether xterm handles it (false: the browser does) */
  attachCustomKeyEventHandler(handler: (event: KeyboardEvent) => boolean): void;
  /** scrolls to the newest line */
  scrollToBottom(): void;
  /** disposes the terminal */
  dispose(): void;
}
interface FitLike {
  fit(): void;
  proposeDimensions(): { cols: number; rows: number } | undefined;
}
interface SerializeLike {
  serialize(options?: Record<string, unknown>): string;
  serializeAsHTML(options?: Record<string, unknown>): string;
}
interface Vendor {
  Terminal: new (options: Record<string, unknown>) => XtermLike;
  FitAddon: new () => FitLike;
  ClipboardAddon: new () => unknown;
  SerializeAddon: new () => SerializeLike;
  WebLinksAddon: new () => unknown;
}

// -- loading ------------------------------------------------------------------------------------------

let vendorPromise: Promise<Vendor> | null = null;
let loadedFrom = '';
const LOAD_MS = 20_000;

/** xterm's stylesheet, linked once per URL; resolves when it applied */
const sheets = new Map<string, Promise<void>>();
function sheet(url: string): Promise<void> {
  const known = sheets.get(url);
  if (known) return known;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  link.dataset.terminal = '';
  const pending = new Promise<void>((resolve, reject) => {
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`the xterm stylesheet could not be loaded from ${url}`));
  });
  pending.catch(() => {
    if (sheets.get(url) === pending) sheets.delete(url);
    link.remove();
  });
  sheets.set(url, pending);
  dfDollar(document.head).append(link);
  return pending;
}

/**
 * Import the official xterm.js build, its four addons and its stylesheet - once (configure({ urls }) first to
 * self-host them). A failed load can be retried (the next call loads again).
 * @returns the modules, once they and the stylesheet have loaded
 */
function load(): Promise<Vendor> {
  const key = JSON.stringify(urls);
  if (vendorPromise && key === loadedFrom) return vendorPromise;
  loadedFrom = key;
  const files = [urls.xterm, urls.fit, urls.clipboard, urls.serialize, urls.webLinks];
  // the ONE vendor import (verify: VENDOR_IMPORTS) - the official builds, never our code; a microtask later, so a
  // failing import is a rejection the terminal shows, never an exception out of init
  const modules = Promise.all(
    files.map((vendorUrl) => Promise.resolve().then(() => import(/* @vite-ignore */ vendorUrl))),
  );
  let timer = 0;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`xterm.js did not load within ${LOAD_MS / 1000} s`)),
      LOAD_MS,
    ) as unknown as number;
  });
  // the stylesheet loads beside the modules, but a failing module names the failure: with Promise.all whichever
  // failed first did - VERIFIED: (section-bundles.e2e, the v0.9.14 release run) offline, one run reported the
  // stylesheet, the next the module, and the two bundles' errors differed
  const css = sheet(urls.css);
  const pending = Promise.race([modules.then((loaded) => css.then(() => loaded)), deadline])
    .then(([xterm, fit, clipboard, serialize, links]) => ({
      Terminal: xterm.Terminal,
      FitAddon: fit.FitAddon,
      ClipboardAddon: clipboard.ClipboardAddon,
      SerializeAddon: serialize.SerializeAddon,
      WebLinksAddon: links.WebLinksAddon,
    }))
    .finally(() => clearTimeout(timer));
  pending.catch(() => {
    if (vendorPromise === pending) vendorPromise = null;
  });
  vendorPromise = pending;
  return pending;
}

// -- the theme: --terminal-* custom properties as xterm's colours ------------------------------------

const COLORS: [string, string][] = [
  ['background', 'background'],
  ['foreground', 'foreground'],
  ['cursor', 'cursor'],
  ['cursorAccent', 'cursor-accent'],
  ['selectionBackground', 'selection'],
  ['black', 'black'],
  ['red', 'red'],
  ['green', 'green'],
  ['yellow', 'yellow'],
  ['blue', 'blue'],
  ['magenta', 'magenta'],
  ['cyan', 'cyan'],
  ['white', 'white'],
  ['brightBlack', 'bright-black'],
  ['brightRed', 'bright-red'],
  ['brightGreen', 'bright-green'],
  ['brightYellow', 'bright-yellow'],
  ['brightBlue', 'bright-blue'],
  ['brightMagenta', 'bright-magenta'],
  ['brightCyan', 'bright-cyan'],
  ['brightWhite', 'bright-white'],
];

let probe: CanvasRenderingContext2D | null = null;
/** any CSS colour (oklch, color-mix, a system colour) as rgba() - the browser's own conversion, one pixel */
function rgba(css: string): string {
  if (!css) return '';
  probe ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!probe) return '';
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = 'rgba(1, 2, 3, 0.5)';
  probe.fillStyle = css;
  if (probe.fillStyle === 'rgba(1, 2, 3, 0.5)') return '';
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
  return `rgba(${r}, ${g}, ${b}, ${Math.round((a / 255) * 100) / 100})`;
}

/**
 * The xterm theme the element's --terminal-* custom properties describe (colours as rgba()).
 * @param el - the .terminal element
 * @returns xterm's ITheme: background, foreground, cursor, selection and the sixteen ANSI colours
 */
function themeOf(el: HTMLElement): Record<string, string> {
  const cs = getComputedStyle(el);
  const theme: Record<string, string> = {};
  for (const [key, prop] of COLORS) {
    const value = rgba(cs.getPropertyValue(`--terminal-${prop}`).trim());
    if (value) theme[key] = value;
  }
  // the scrollbar of xterm 6 follows the text, faintly
  if (theme.foreground) {
    const fg = theme.foreground.replace(/[\d.]+\)$/, '');
    theme.scrollbarSliderBackground = `${fg}0.2)`;
    theme.scrollbarSliderHoverBackground = `${fg}0.35)`;
    theme.scrollbarSliderActiveBackground = `${fg}0.5)`;
  }
  return theme;
}

const reducedMotion = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** the options the element's attributes and computed style ask for */
function optionsOf(el: HTMLElement, host: HTMLElement): Record<string, unknown> {
  const cs = getComputedStyle(host);
  const ecs = getComputedStyle(el);
  const style = (el.dataset.cursor || ecs.getPropertyValue('--terminal-cursor-style').trim() || 'block') as string;
  return {
    theme: themeOf(el),
    fontFamily: cs.fontFamily,
    fontSize: parseFloat(cs.fontSize) || 14,
    lineHeight: parseFloat(ecs.getPropertyValue('--terminal-line-height')) || 1.2,
    cursorStyle: ['block', 'bar', 'underline'].includes(style) ? style : 'block',
    cursorBlink: !reducedMotion() && el.dataset.blink !== 'false',
    scrollback: Math.max(0, Number(el.dataset.scrollback) || 1000),
    convertEol: true,
    allowProposedApi: true,
    screenReaderMode: el.hasAttribute('data-screen-reader'),
    disableStdin: el.hasAttribute('data-readonly'),
  };
}

// -- tones and text -----------------------------------------------------------------------------------

const SGR: Record<TerminalTone, string> = {
  success: '32',
  warning: '33',
  info: '34',
  destructive: '31',
  muted: '90',
  bold: '1',
};

/**
 * Text in a tone, as the VT sequences xterm draws in the theme's colours.
 * @param text - the text
 * @param tone - success, warning, info, destructive, muted or bold
 * @returns the text wrapped in the tone's SGR sequence (unchanged for an unknown tone)
 */
function tone(text: string, tone: TerminalTone): string {
  const code = SGR[tone];
  return code ? `\x1b[${code}m${text}\x1b[0m` : text;
}

const ESC = '\x1b';
/** a CSI sequence (SGR colours, cursor moves) at any place in a text */
const CSI = new RegExp(`${ESC}\\[[0-9;]*[A-Za-z]`, 'g');
/** a key's sequence at the start of the input: CSI (arrows, Delete, Home / End) or SS3 */
const KEY_SEQ = new RegExp(`^${ESC}(?:\\[[0-9;]*[A-Za-z~]|O[A-Za-z])`);

/** the visible length of text with SGR sequences */
const visible = (text: string): number => text.replace(CSI, '').length;

/** the words of a line: spaces split, "double" or 'single' quotes keep a word together */
function words(line: string): string[] {
  const out: string[] = [];
  for (const m of line.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)) out.push(m[1] ?? m[2] ?? m[3] ?? '');
  return out;
}

const resolve = (t: string | HTMLElement): HTMLElement | null =>
  typeof t === 'string'
    ? ((dfDollar('#' + CSS.escape(t)).get(0) ?? dfDollar(t).get(0) ?? null) as HTMLElement | null)
    : t;

// -- the session: one per terminal element (el._terminal) ----------------------------------------------

interface Session {
  el: HTMLElement;
  term: XtermLike;
  fit: FitLike;
  serialize: SerializeLike;
  /** the input line and the cursor in it */
  line: string;
  cursor: number;
  /** the cursor as last drawn (the input block's geometry follows from it) */
  shown: number;
  /** a prompt with the input line is on screen */
  prompted: boolean;
  history: string[];
  /** where Up / Down are in the history (history.length = the line being written) */
  at: number;
  draft: string;
  /** the running command (aborts it) and its line */
  busy: AbortController | null;
  running: string;
  /** a replay in progress, and whether a key asked to finish it */
  playing: Promise<void> | null;
  skip: boolean;
  /** typed while no prompt took it - fed once one does */
  queue: string;
  /** writes in order */
  chain: Promise<void>;
  theme: string;
  observer: ResizeObserver;
}

const live = new Set<HTMLElement>();

/** writes data and resolves once xterm has parsed it (in order with every other write) */
function put(s: Session, data: string): Promise<void> {
  s.chain = s.chain.then(() => new Promise<void>((done) => s.term.write(data, done)));
  return s.chain;
}

const promptOf = (s: Session): string => {
  const text = s.el.dataset.prompt ?? '$ ';
  const t = s.el.dataset.promptTone as TerminalTone | undefined;
  return t ? tone(text, t) : text;
};

/** the input block: the prompt and the line, the cursor placed - drawn again from its first row */
function draw(s: Session): Promise<void> {
  const cols = Math.max(1, s.term.cols);
  const prompt = promptOf(s);
  const p = visible(prompt);
  const up = Math.floor((p + s.shown) / cols);
  let out = (up ? `\x1b[${up}A` : '') + '\r\x1b[J' + prompt + s.line;
  const end = p + s.line.length;
  // a full last row leaves xterm's cursor waiting to wrap: write past it, so the cursor stands on the next row
  if (end > 0 && end % cols === 0) out += ' \b';
  const target = p + s.cursor;
  const back = Math.floor(end / cols) - Math.floor(target / cols);
  out += (back ? `\x1b[${back}A` : '') + '\r' + (target % cols ? `\x1b[${target % cols}C` : '');
  s.shown = s.cursor;
  return put(s, out);
}

/** takes the input block off the screen (output goes where it stood, the block comes back after it) */
function erase(s: Session): Promise<void> {
  const cols = Math.max(1, s.term.cols);
  const up = Math.floor((visible(promptOf(s)) + s.shown) / cols);
  s.shown = 0;
  return put(s, (up ? `\x1b[${up}A` : '') + '\r\x1b[J');
}

/** a fresh prompt on a line of its own; then whatever was typed meanwhile */
async function showPrompt(s: Session): Promise<void> {
  if (s.el.hasAttribute('data-readonly') || !s.el.isConnected) return;
  await s.chain;
  if (s.term.buffer.active.cursorX !== 0) await put(s, '\r\n');
  s.line = '';
  s.cursor = 0;
  s.shown = 0;
  s.at = s.history.length;
  s.prompted = true;
  await draw(s);
  drain(s);
}

/** feeds what was typed while no prompt took it */
function drain(s: Session): void {
  if (!s.queue) return;
  const queued = s.queue;
  s.queue = '';
  feed(s, queued);
}

/** text as the terminal shows it: an array is one line each, "\n" a new line */
const asText = (value: string | string[] | void | undefined): string =>
  value == null ? '' : Array.isArray(value) ? value.join('\n') : String(value);

/**
 * Writes output: above the prompt while one waits (the input line comes back below it), else where the cursor is.
 * @returns once it is on screen
 */
async function output(s: Session, text: string, newline = false): Promise<void> {
  const data = text.replace(/\r?\n/g, '\r\n') + (newline ? '\r\n' : '');
  if (!s.prompted) return put(s, data);
  await erase(s);
  await put(s, data);
  if (s.term.buffer.active.cursorX !== 0) await put(s, '\r\n');
  await draw(s);
}

// -- commands -----------------------------------------------------------------------------------------

const globalCommands = new Map<string, TerminalCommandSpec>();
const asSpec = (c: TerminalCommand | TerminalCommandSpec): TerminalCommandSpec =>
  typeof c === 'function' ? { run: c } : c;

/** every command the terminal knows: its own, then the global ones, then the built-ins */
function commandsOf(s: Session): Map<string, TerminalCommandSpec> {
  const all = new Map<string, TerminalCommandSpec>(BUILTINS);
  for (const [k, v] of globalCommands) all.set(k, v);
  for (const [k, v] of (s.el._terminalCommands as Map<string, TerminalCommandSpec> | undefined) ?? []) all.set(k, v);
  return all;
}
/** a command by name: as written, else in lower case (DOS commands are typed in either) */
function lookup(s: Session, name: string): TerminalCommandSpec | undefined {
  const all = commandsOf(s);
  return all.get(name) ?? all.get(name.toLowerCase());
}

const BUILTINS = new Map<string, TerminalCommandSpec>([
  [
    'help',
    {
      description: 'lists the commands (help <name>: one of them)',
      run: (c) => {
        const s = c.terminal._terminal as Session;
        const all = [...commandsOf(s)].filter(([, v]) => !v.hidden).sort(([a], [b]) => a.localeCompare(b));
        if (c.args[0]) {
          const one = lookup(s, c.args[0]);
          return one ? `${c.args[0]} - ${one.description || 'no description'}` : `help: no command ${c.args[0]}`;
        }
        const width = Math.max(...all.map(([k]) => k.length));
        return all.map(([k, v]) => `${tone(k.padEnd(width), 'bold')}  ${v.description ?? ''}`.trimEnd());
      },
    },
  ],
  [
    'clear',
    {
      description: 'clears the screen',
      run: (c) => {
        const s = c.terminal._terminal as Session;
        return put(s, '\x1b[H\x1b[2J').then(() => s.term.clear());
      },
    },
  ],
  ['echo', { description: 'writes its words', run: (c) => c.args.join(' ') }],
  [
    'history',
    {
      description: 'lists the commands typed so far',
      run: (c) => {
        const s = c.terminal._terminal as Session;
        return s.history.map((h, i) => `${String(i + 1).padStart(4)}  ${h}`);
      },
    },
  ],
]);

/** the state the terminal is in now, recorded (it moved there by itself) */
const settle = (s: Session): void => {
  const name = s.el.hasAttribute('data-readonly') ? 'readonly' : s.busy || s.playing ? 'running' : 'default';
  dfDollar(s.el).attr('aria-busy', name === 'running' ? 'true' : null);
  const config = name === 'running' && s.running ? { command: s.running } : { prompt: s.el.dataset.prompt ?? '$ ' };
  if (s.el.store) terminalApi.commit(s.el, name, config);
};

/** runs a submitted line: the event, the command (Ctrl+C aborts it), its output - then a prompt */
async function execute(s: Session, line: string, fixed?: { output?: string | string[]; tone?: TerminalTone }) {
  const [name = '', ...args] = words(line);
  const el = s.el;
  if (line.trim()) {
    // Fires when a command line is submitted, before it runs - preventDefault() keeps the terminal from running
    // it (the page answers through write()).
    const go = el.dispatchEvent(
      new CustomEvent<TerminalCommandDetail>('terminal-command', {
        bubbles: true,
        cancelable: true,
        detail: { line, name, args },
      }),
    );
    if (go || fixed) {
      const ac = new AbortController();
      s.busy = ac;
      s.running = line;
      settle(s);
      const ctx: TerminalCommandContext = {
        name,
        args,
        line,
        terminal: el,
        write: (text) => void put(s, String(text).replace(/\r?\n/g, '\r\n')),
        writeln: (text = '') => void put(s, String(text).replace(/\r?\n/g, '\r\n') + '\r\n'),
        signal: ac.signal,
      };
      try {
        let result: string | string[] | void;
        if (fixed && 'output' in fixed) {
          const text = asText(fixed.output);
          result = fixed.tone ? text.split('\n').map((l) => tone(l, fixed.tone as TerminalTone)) : text;
        } else {
          const spec = lookup(s, name);
          if (!spec) result = tone(notFound(el, name), 'destructive');
          else {
            const aborted = new Promise<void>((done) =>
              ac.signal.addEventListener('abort', () => done(), { once: true }),
            );
            result = await Promise.race([Promise.resolve(spec.run(ctx)), aborted]);
          }
        }
        if (!ac.signal.aborted) {
          let text = asText(result);
          // a replayed step without output of its own: the command answers, in the step's tone
          if (text && fixed?.tone && !('output' in fixed))
            text = text
              .split('\n')
              .map((l) => tone(l, fixed.tone as TerminalTone))
              .join('\n');
          if (text) await put(s, text.replace(/\r?\n/g, '\r\n') + '\r\n');
        }
      } catch (err) {
        await put(s, tone(`${name}: ${err instanceof Error ? err.message : String(err)}`, 'destructive') + '\r\n');
      } finally {
        if (s.busy === ac) {
          s.busy = null;
          s.running = '';
        }
      }
    }
  }
  if (!s.playing) {
    await showPrompt(s);
    settle(s);
  }
}

const notFound = (el: HTMLElement, name: string): string =>
  (el.dataset.notFound ?? '{name}: command not found').replace('{name}', name);

/** Tab: completes the command's name - one match is written out, several are listed */
async function complete(s: Session): Promise<void> {
  const before = s.line.slice(0, s.cursor);
  if (/\s/.test(before)) return;
  const names = [...commandsOf(s)].filter(([k, v]) => !v.hidden && k.startsWith(before)).map(([k]) => k);
  if (!names.length) return;
  if (names.length === 1) return insert(s, names[0].slice(before.length) + ' ');
  let common = names[0];
  for (const n of names) while (!n.startsWith(common)) common = common.slice(0, -1);
  if (common.length > before.length) return insert(s, common.slice(before.length));
  await output(s, names.sort().join('  '));
}

function insert(s: Session, text: string): Promise<void> {
  s.line = s.line.slice(0, s.cursor) + text + s.line.slice(s.cursor);
  s.cursor += text.length;
  return draw(s);
}

/** keys and typed text, in order; a submitted line waits for its command, the rest after it */
function feed(s: Session, data: string): void {
  for (let i = 0; i < data.length;) {
    if (!s.prompted) {
      s.queue += data.slice(i);
      return;
    }
    const rest = data.slice(i);
    const seq = KEY_SEQ.exec(rest)?.[0];
    const key = seq ?? rest[0];
    i += key.length;
    switch (key) {
      case '\r':
      case '\n': {
        const line = s.line;
        s.cursor = s.line.length;
        void draw(s);
        void put(s, '\r\n');
        s.prompted = false;
        if (line.trim() && line !== s.history[s.history.length - 1]) s.history.push(line);
        void execute(s, line);
        if (data[i - 1] === '\r' && data[i] === '\n') i++;
        continue;
      }
      case '\x7f':
      case '\b':
        if (s.cursor > 0) {
          s.line = s.line.slice(0, s.cursor - 1) + s.line.slice(s.cursor);
          s.cursor--;
          void draw(s);
        }
        continue;
      case '\x1b[3~':
        if (s.cursor < s.line.length) {
          s.line = s.line.slice(0, s.cursor) + s.line.slice(s.cursor + 1);
          void draw(s);
        }
        continue;
      case '\x1b[D':
        if (s.cursor > 0) {
          s.cursor--;
          void draw(s);
        }
        continue;
      case '\x1b[C':
        if (s.cursor < s.line.length) {
          s.cursor++;
          void draw(s);
        }
        continue;
      case '\x1b[H':
      case '\x1bOH':
      case '\x01':
        s.cursor = 0;
        void draw(s);
        continue;
      case '\x1b[F':
      case '\x1bOF':
      case '\x05':
        s.cursor = s.line.length;
        void draw(s);
        continue;
      case '\x1b[A':
      case '\x1b[B': {
        if (!s.history.length) continue;
        if (s.at === s.history.length) s.draft = s.line;
        s.at = Math.max(0, Math.min(s.history.length, s.at + (key === '\x1b[A' ? -1 : 1)));
        s.line = s.at === s.history.length ? s.draft : s.history[s.at];
        s.cursor = s.line.length;
        void draw(s);
        continue;
      }
      case '\x15':
        s.line = s.line.slice(s.cursor);
        s.cursor = 0;
        void draw(s);
        continue;
      case '\x03':
        s.cursor = s.line.length;
        void draw(s);
        void put(s, '^C');
        s.prompted = false;
        void showPrompt(s);
        continue;
      case '\x0c':
        s.prompted = false;
        // the line stays; what follows Ctrl+L in the same input waits for the redraw
        void put(s, '\x1b[H\x1b[2J')
          .then(() => {
            s.term.clear();
            s.prompted = true;
            s.shown = 0;
            return draw(s);
          })
          .then(() => drain(s));
        continue;
      case '\t':
        void complete(s);
        continue;
      default:
        if (key.length === 1 && key >= ' ' && key !== '\x7f') {
          // a run of plain characters goes in at once (a paste)
          let end = 0;
          while (end < rest.length && rest.charCodeAt(end) >= 32 && rest.charCodeAt(end) !== 127) end++;
          const run = rest.slice(0, end) || key;
          i += run.length - 1;
          void insert(s, run);
        }
    }
  }
}

/** what a key does while no prompt waits: Ctrl+C aborts the command; any key finishes a replay */
function onData(s: Session, data: string): void {
  if (s.el.hasAttribute('data-readonly')) return;
  if (s.playing) {
    s.skip = true;
    return;
  }
  if (s.busy) {
    if (data.includes('\x03')) {
      s.busy.abort();
      s.queue = '';
      void put(s, '^C\r\n');
    } else s.queue += data;
    return;
  }
  feed(s, data);
}

// -- replay ---------------------------------------------------------------------------------------------

const sleep = (s: Session, ms: number): Promise<void> =>
  s.skip || ms <= 0 ? Promise.resolve() : new Promise((done) => setTimeout(done, ms));

/** the session of the element's script.terminal-script (an empty list without one, or with invalid JSON) */
function scriptOf(el: HTMLElement): TerminalStep[] {
  const script = dfDollar(el).children('script.terminal-script').get(0);
  if (!script) return [];
  try {
    const steps = JSON.parse(script.textContent || '[]');
    return Array.isArray(steps) ? steps : [];
  } catch (err) {
    console.error('[terminal] the script is not valid JSON:', err instanceof Error ? err.message : String(err));
    return [];
  }
}

/** a command typed at the prompt (instantly when skipping, without typing or with reduced motion) */
async function typeCommand(s: Session, text: string, typing: boolean): Promise<void> {
  const delay = Math.max(0, Number(s.el.dataset.speed ?? 45));
  if (s.el.hasAttribute('data-readonly')) {
    await put(s, (s.term.buffer.active.cursorX ? '\r\n' : '') + promptOf(s));
    for (let i = 0; i < text.length; i++) {
      await put(s, text[i]);
      if (typing && !s.skip && !reducedMotion()) await sleep(s, delay * (0.6 + ((i * 7) % 5) / 10));
    }
    return put(s, '\r\n');
  }
  if (!s.prompted) await showPrompt(s);
  if (s.line) {
    s.line = '';
    s.cursor = 0;
    await draw(s);
  }
  for (let i = 0; i < text.length; i++) {
    if (s.skip || !typing || reducedMotion()) {
      await insert(s, text.slice(i));
      break;
    }
    await insert(s, text[i]);
    await sleep(s, delay * (0.6 + ((i * 7) % 5) / 10));
  }
  s.cursor = s.line.length;
  await draw(s);
  await put(s, '\r\n');
  s.prompted = false;
}

async function play(s: Session, steps: TerminalStep[]): Promise<void> {
  if (s.playing) return s.playing;
  s.playing = (async () => {
    settle(s);
    for (const step of steps) {
      if (!s.el.isConnected) break;
      await sleep(s, Number(step.wait) || 0);
      if (typeof step.command === 'string') {
        await typeCommand(s, step.command, step.typing !== false);
        if (step.command.trim() && step.command !== s.history[s.history.length - 1]) s.history.push(step.command);
        await execute(
          s,
          step.command,
          'output' in step ? { output: step.output, tone: step.tone } : step.tone ? { tone: step.tone } : undefined,
        );
      } else if (step.output != null) {
        const text = asText(step.output);
        await output(
          s,
          step.tone
            ? text
                .split('\n')
                .map((l) => tone(l, step.tone as TerminalTone))
                .join('\n')
            : text,
          true,
        );
      }
    }
  })().finally(() => {
    s.playing = null;
    s.skip = false;
    void showPrompt(s).then(() => settle(s));
  });
  return s.playing;
}

// -- opening ---------------------------------------------------------------------------------------------

async function open(el: HTMLElement): Promise<Session> {
  const host = document.createElement('div');
  host.className = 'terminal-screen';
  host.setAttribute('data-ce-chrome', '');
  dfDollar(el).append(host);
  let vendor: Vendor;
  try {
    vendor = await load();
  } catch (err) {
    dfDollar(el).attr('data-error', '');
    const out = document.createElement('output');
    out.className = 'terminal-error';
    out.setAttribute('role', 'alert');
    dfDollar(out).text(`The terminal could not start: ${err instanceof Error ? err.message : String(err)}`);
    dfDollar(host).append(out);
    throw err;
  }
  await document.fonts?.ready;
  await sized(host);
  const term = new vendor.Terminal(optionsOf(el, host));
  const fit = new vendor.FitAddon();
  const serialize = new vendor.SerializeAddon();
  term.loadAddon(fit);
  term.loadAddon(serialize);
  term.loadAddon(new vendor.ClipboardAddon());
  term.loadAddon(new vendor.WebLinksAddon());
  term.open(host);
  const s: Session = {
    el,
    term,
    fit,
    serialize,
    line: '',
    cursor: 0,
    shown: 0,
    prompted: false,
    history: [],
    at: 0,
    draft: '',
    busy: null,
    running: '',
    playing: null,
    skip: false,
    queue: '',
    chain: Promise.resolve(),
    theme: '',
    observer: new ResizeObserver(() => resize(s)),
  };
  s.theme = JSON.stringify(term.options.theme);
  el._terminal = s;
  live.add(el);
  resize(s, true);
  s.observer.observe(host);
  term.onData((data) => onData(s, data));
  // Tab completes - but on an empty line, while nothing takes input, and with Shift it moves the focus on (no trap)
  term.attachCustomKeyEventHandler(
    (e) => !(e.key === 'Tab' && (e.shiftKey || !s.prompted || !s.line || el.hasAttribute('data-readonly'))),
  );
  const label = el.getAttribute('aria-label');
  const textarea = dfDollar(host).find('textarea').get(0) as HTMLTextAreaElement | undefined;
  if (textarea && label) textarea.setAttribute('aria-label', label);
  // Fires once the xterm is open and sized - its columns and rows.
  el.dispatchEvent(
    new CustomEvent<TerminalReadyDetail>('terminal-ready', {
      bubbles: true,
      detail: { cols: term.cols, rows: term.rows },
    }),
  );
  dfDollar(el).attr('data-ready', '');
  if (el.hasAttribute('data-autoplay') && scriptOf(el).length) autoplay(el, s);
  else await showPrompt(s);
  settle(s);
  return s;
}

/** resolves once the element has a width (at once when it has one) */
function sized(host: HTMLElement): Promise<void> {
  if (host.clientWidth > 0) return Promise.resolve();
  return new Promise((done) => {
    const ro = new ResizeObserver(() => {
      if (host.clientWidth <= 0) return;
      ro.disconnect();
      done();
    });
    ro.observe(host);
  });
}

/** data-autoplay: the script plays when the terminal first shows (after data-autoplay ms) - no prompt until then,
 *  keys typed meanwhile wait in the queue */
function autoplay(el: HTMLElement, s: Session): void {
  const delay = Math.max(0, Number(el.getAttribute('data-autoplay')) || 0);
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      s.playing = new Promise((done) => setTimeout(done, delay));
      void s.playing.then(() => {
        s.playing = null;
        return play(s, scriptOf(el));
      });
    },
    { threshold: 0.35 },
  );
  io.observe(el);
}

/** the screen fits its box (data-rows: that many rows, as wide as the box) - the input line drawn again */
function resize(s: Session, first = false): void {
  if (!s.el.isConnected) return;
  const dims = s.fit.proposeDimensions();
  if (!dims || !Number.isFinite(dims.cols) || dims.cols < 2) return;
  const rows = Number(s.el.dataset.rows) || dims.rows;
  if (dims.cols === s.term.cols && rows === s.term.rows && !first) return;
  s.term.resize(dims.cols, Math.max(1, rows));
  if (s.prompted) void draw(s);
}

/** a session once the terminal is open (the element initialized first) */
function session(target: string | HTMLElement): Promise<Session> {
  const el = resolve(target);
  if (!el) return Promise.reject(new Error('no terminal'));
  init();
  return (el._terminalReady as Promise<Session> | undefined) ?? Promise.reject(new Error('not a .terminal'));
}

// -- the State API -----------------------------------------------------------------------------------

/** The markup of a state: data-readonly in readonly, aria-busy while running, the prompt as data-prompt. */
function applyMarkup(el: HTMLElement, name: string, config: Record<string, unknown> = {}): void {
  dfDollar(el).attr('data-readonly', name === 'readonly' ? '' : null);
  dfDollar(el).attr('aria-busy', name === 'running' ? 'true' : null);
  // only a prompt other than the one in effect is written (no data-prompt means "$ ")
  if (name === 'default' && typeof config.prompt === 'string' && config.prompt !== (el.dataset.prompt ?? '$ '))
    dfDollar(el).attr('data-prompt', config.prompt);
}

async function triggerStateChange(el: HTMLElement, name: string, config: Record<string, unknown> = {}) {
  if (!el.hasAttribute('data-ready')) {
    // not open yet (a closed window, a hidden tab, the vendor still loading): the markup now - open() reads it -
    // and a command once the terminal has opened; the state change never waits for a box to show
    if (name !== 'running') applyMarkup(el, name, config);
    else
      void (el._terminalReady as Promise<Session>).then(
        () => triggerStateChange(el, name, config),
        () => {},
      );
    return;
  }
  const s = await (el._terminalReady as Promise<Session>);
  if (name === 'running') {
    const command = typeof config.command === 'string' ? config.command : '';
    if (s.busy && s.running === command) return;
    if (!command) return play(s, scriptOf(el));
    if (el.hasAttribute('data-readonly')) applyMarkup(el, 'default', {});
    s.term.options.disableStdin = false;
    await typeCommand(s, command, false);
    s.history.push(command);
    return execute(s, command);
  }
  s.busy?.abort();
  if (s.playing) s.skip = true;
  const was = el.hasAttribute('data-readonly');
  const prompt = el.dataset.prompt;
  applyMarkup(el, name, config);
  s.term.options.disableStdin = name === 'readonly';
  if (name === 'readonly') {
    if (s.prompted) await erase(s);
    s.prompted = false;
  } else if (was || !s.prompted) {
    s.prompted = false;
    if (!s.playing) await showPrompt(s);
  } else if (prompt !== el.dataset.prompt) await draw(s);
  settle(s);
}

/** Registry-level API; pass the element explicitly. Unknown names throw. */
export const terminalApi = componentState({
  component: 'terminal',
  states: terminalStates,
  apply: (el, state) => triggerStateChange(el as HTMLElement, state.name, state.config),
  // the state the terminal is in - a command typed, a replay playing, a prompt set by write
  read: (el) => {
    const s = (el as HTMLElement)._terminal as Session | undefined;
    const name = el.hasAttribute('data-readonly') ? 'readonly' : s?.busy || s?.playing ? 'running' : 'default';
    const prompt = (el as HTMLElement).dataset.prompt ?? '$ ';
    return { name, config: name === 'running' && s?.running ? { command: s.running } : { prompt } };
  },
  markup: (el, state) => applyMarkup(el as HTMLElement, state.name, state.config),
});

df$.terminalApi = terminalApi;
df$.terminalStates = terminalStates;

// -- df$.shadcn.terminal: the imperative surface ---------------------------------------------------

df$.terminal = {
  /**
   * Imports the official xterm.js build, its addons and its stylesheet (the first terminal does it by itself).
   * @returns once they have loaded
   */
  load: (): Promise<void> => load().then(() => undefined),
  /**
   * Where the vendor files come from - call it before the first terminal opens to self-host them.
   * @param options - the URLs to use instead of the pinned jsDelivr ones (any subset)
   */
  configure: (options: { urls?: Partial<TerminalUrls> }): void => {
    Object.assign(urls, options?.urls ?? {});
  },
  /**
   * Writes text: above the prompt while one waits (the line being typed stays), else where the cursor is.
   * @param target - the .terminal element, its id or a selector
   * @param text - the text ("\n" starts a new line; VT sequences and tone() work)
   * @returns once it is on screen
   */
  write: (target: string | HTMLElement, text: string): Promise<void> =>
    session(target).then((s) => output(s, String(text))),
  /**
   * Writes a line - write() with a new line after it.
   * @param target - the .terminal element, its id or a selector
   * @param text - the line
   * @returns once it is on screen
   */
  writeln: (target: string | HTMLElement, text: string = ''): Promise<void> =>
    session(target).then((s) => output(s, String(text), true)),
  /**
   * Clears the screen and the scrollback; a waiting prompt is drawn again at the top.
   * @param target - the .terminal element, its id or a selector
   * @returns once it is clear
   */
  clear: (target: string | HTMLElement): Promise<void> =>
    session(target).then(async (s) => {
      await put(s, '\x1b[H\x1b[2J');
      s.term.clear();
      if (s.prompted) {
        s.shown = 0;
        await draw(s);
      }
    }),
  /**
   * Runs a command line as if it were typed at the prompt (the State API's running state does the same).
   * @param target - the .terminal element, its id or a selector
   * @param line - the command line
   * @returns once the command has run and a prompt waits again
   */
  run: (target: string | HTMLElement, line: string): Promise<void> => {
    const el = resolve(target);
    if (!el?.api) return Promise.reject(new Error('no terminal'));
    el.api.setState('running', { command: String(line) });
    return el.api.settled();
  },
  /**
   * Replays a session: commands typed at the prompt and their output (a key finishes it at once).
   * @param target - the .terminal element, its id or a selector
   * @param steps - the steps (default: the element's script.terminal-script)
   * @returns once the session has played
   */
  play: (target: string | HTMLElement, steps?: TerminalStep[]): Promise<void> =>
    session(target).then((s) => play(s, steps ?? scriptOf(s.el))),
  /**
   * Adds commands - to one terminal, or to every terminal on the page with 'global'. A name the terminal knows
   * already (a built-in too) takes the new command.
   * @param target - 'global', or the .terminal element, its id or a selector
   * @param commands - each name with its handler, or with { run, description, hidden }
   * @returns a function that removes them again
   */
  commands: (
    target: 'global' | string | HTMLElement,
    commands: Record<string, TerminalCommand | TerminalCommandSpec>,
  ): (() => void) => {
    const el = target === 'global' ? null : resolve(target);
    if (target !== 'global' && !el) return () => {};
    const map: Map<string, TerminalCommandSpec> = el
      ? (el._terminalCommands ??= new Map<string, TerminalCommandSpec>())
      : globalCommands;
    const added = Object.entries(commands ?? {}).map(([k, v]): [string, TerminalCommandSpec] => [k, asSpec(v)]);
    for (const [k, v] of added) map.set(k, v);
    return () => {
      for (const [k, v] of added) if (map.get(k) === v) map.delete(k);
    };
  },
  /**
   * Sets the prompt (data-prompt) - a waiting prompt changes at once.
   * @param target - the .terminal element, its id or a selector
   * @param text - the prompt text
   */
  prompt: (target: string | HTMLElement, text: string): void => {
    const el = resolve(target);
    if (el?.api && el.api.getState().name === 'default') el.api.setState('default', { prompt: String(text) });
    else if (el) dfDollar(el).attr('data-prompt', String(text));
  },
  /**
   * The screen and the scrollback as plain text (lines trimmed at the end, trailing empty lines left out).
   * @param target - the .terminal element, its id or a selector
   * @returns the text ('' before the terminal has opened)
   */
  text: (target: string | HTMLElement): string => {
    const s = resolve(target)?._terminal as Session | undefined;
    if (!s) return '';
    const buf = s.term.buffer.active;
    const lines: string[] = [];
    // VERIFIED: translateToString(true) trims only cells never written - a written space (after a prompt) stayed
    // ("$ " in tmp/probe-term.ts), so each line is trimmed here
    for (let y = 0; y < buf.length; y++) lines.push((buf.getLine(y)?.translateToString(true) ?? '').trimEnd());
    while (lines.length && !lines[lines.length - 1]) lines.pop();
    return lines.join('\n');
  },
  /**
   * The screen and the scrollback serialized by the serialize addon - as HTML (colours inline) or as VT sequences.
   * @param target - the .terminal element, its id or a selector
   * @param format - 'html' (default) or 'vt'
   * @returns the serialized buffer ('' before the terminal has opened)
   */
  serialize: (target: string | HTMLElement, format: 'html' | 'vt' = 'html'): string => {
    const s = resolve(target)?._terminal as Session | undefined;
    if (!s) return '';
    return format === 'vt' ? s.serialize.serialize() : s.serialize.serializeAsHTML({ includeGlobalBackground: true });
  },
  /**
   * Focuses the terminal's input.
   * @param target - the .terminal element, its id or a selector
   */
  focus: (target: string | HTMLElement): void => {
    void session(target).then((s) => s.term.focus());
  },
  tone,
  /**
   * The xterm.js Terminal behind the element - for what this API does not cover.
   * @param target - the .terminal element, its id or a selector
   * @returns the instance, once the terminal has opened
   */
  xterm: (target: string | HTMLElement): Promise<XtermLike> => session(target).then((s) => s.term),
  /**
   * The xterm theme the element's --terminal-* custom properties describe.
   * @param target - the .terminal element, its id or a selector
   * @returns xterm's theme (colours as rgba()), {} for no terminal
   */
  theme: (target: string | HTMLElement): Record<string, string> => {
    const el = resolve(target);
    return el ? themeOf(el) : {};
  },
  url: XTERM_URL,
};

// -- live re-theming ---------------------------------------------------------------------------------

let themeWatched = false;
function watchTheme(): void {
  if (themeWatched) return;
  themeWatched = true;
  let timer = 0;
  const schedule = (): void => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      for (const el of live) {
        const s = el._terminal as Session | undefined;
        if (!s) continue;
        const theme = themeOf(el);
        const json = JSON.stringify(theme);
        if (json === s.theme) continue;
        s.theme = json;
        s.term.options.theme = theme;
      }
    }, 60) as unknown as number;
  };
  const mo = new MutationObserver(schedule);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
  if (document.head) mo.observe(document.head, { childList: true, subtree: true, characterData: true });
  for (const q of ['(prefers-color-scheme: dark)', '(prefers-contrast: more)', '(forced-colors: active)'])
    matchMedia(q).addEventListener('change', schedule);
  document.addEventListener('defuss-theme-change', schedule);
}

// -- init ----------------------------------------------------------------------------------------------

/** terminals that left the page: their xterm, observer and running command go too */
function sweep(): void {
  for (const el of live) {
    if (el.isConnected) continue;
    const s = el._terminal as Session;
    live.delete(el);
    s.busy?.abort();
    s.observer.disconnect();
    s.term.dispose();
  }
}

function init() {
  sweep();
  // VERIFIED: xterm.js 6 adds the classes "terminal" and "xterm" to the element it draws in (lib/xterm.mjs) - it is
  // no terminal of ours (terminal.e2e: no .xterm carries data-init)
  (dfDollar('.terminal:not([data-init]):not(.xterm)').toArray() as HTMLElement[]).forEach((el) => {
    el.dataset.init = '';
    // el.store + el.api (AGENTS.md "State through stores")
    bindComponent(el, terminalApi, {
      name: el.hasAttribute('data-readonly') ? 'readonly' : 'default',
      config: el.hasAttribute('data-readonly') ? {} : { prompt: el.dataset.prompt ?? '$ ' },
    });
    watchTheme();
    const ready = open(el);
    // the message only: a stack names the file's URL, which differs between copies of the same build
    ready.catch((err) => console.error('[terminal]', err instanceof Error ? err.message : String(err)));
    el._terminalReady = ready;
  });
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
