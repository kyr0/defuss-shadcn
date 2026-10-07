/* -- Iframe component ---------------------------------------- */
/* An embedded page that fits where it lives: the width of its    */
/* container, a height from an aspect ratio, the container's      */
/* height or the framed page's own content - and a message bridge */
/* in both directions over postMessage, checked by origin and by  */
/* window. Named-state API bound per figure (AGENTS.md "State     */
/* API").                                                         */
/* VERIFIED: (iframe.e2e) fits, both message directions, origin  */
/* rejection, the hello handshake and the render contract.       */

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, defussQuery, componentState, bindComponent } from '../../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

const iframeStates = ['default', 'loaded'];

// VERIFIED: (verify's API docs gate) the states below are exactly the declared ones, each
// described, and every config field typed, described and named in the code.
/** setState() configs per state - the iframe's states take none. */
export interface IframeStateConfigs {
  /** Not loaded yet - the frame shows its placeholder shimmer. */
  default: {};
  /** The framed page loaded (set by the frame's load event, or by setState). */
  loaded: {};
}

/** What an iframe-message event carries. */
export interface IframeMessageDetail {
  /** the message name the sender chose */
  name: string;
  /** its payload, structured-cloned across the frame boundary */
  detail: unknown;
  /** the origin it came from ('null' for a sandboxed srcdoc frame) */
  origin: string;
}

/** What an iframe-resize event carries. */
export interface IframeResizeDetail {
  /** the framed page's content height in CSS pixels */
  height: number;
}

/** The wire format both sides post - one shape, so a page without defuss-shadcn can speak it. */
interface IframeWire {
  /** always 'defuss:iframe' - anything else on the channel is not ours */
  type: 'defuss:iframe';
  /** 'size' reports a content height, 'message' carries a named message, 'hello' (host to frame) asks for the height */
  kind: 'size' | 'message' | 'hello';
  /** the content height (kind 'size') */
  height?: number;
  /** the message name (kind 'message') */
  name?: string;
  /** the message payload (kind 'message') */
  detail?: unknown;
}

const PROTOCOL = 'defuss:iframe';
/** true inside a frame: this window has a parent of its own */
const framed = (): boolean => (globalThis.parent as unknown) !== (globalThis as unknown);

/** The markup of a state: 'loaded' marks the figure, 'default' clears the mark. */
function applyMarkup(el, stateName) {
  dfDollar(el).attr('data-loaded', stateName === 'loaded' ? '' : null);
}

/** UI side of setState: the only function that writes a state onto the figure. */
function triggerStateChange(el, stateName) {
  applyMarkup(el, stateName);
}

/** Registry-level API; pass the figure explicitly. Unknown names throw. */
export const iframeApi = componentState({
  component: 'iframe',
  states: iframeStates,
  apply: (el, state) => triggerStateChange(el, state.name),
  // the frame's own load event marks the figure - read the mark back
  read: (el, state) => ({ name: el.hasAttribute('data-loaded') ? 'loaded' : 'default', config: state.config }),
  markup: (el, state) => applyMarkup(el, state.name),
});

df$.iframeApi = iframeApi;
df$.iframeStates = iframeStates;

const frameOf = (el: HTMLElement): HTMLIFrameElement | undefined => dfDollar(el).children<HTMLIFrameElement>('iframe.iframe-frame').get(0);

/** The origins a figure accepts messages from: its own page's, plus data-origins. */
function accepts(el: HTMLElement, origin: string): boolean {
  if (origin === globalThis.location.origin) return true;
  return (dfDollar(el).attr('data-origins') ?? '').split(/\s+/).includes(origin);
}

/** The origin to post into a frame with: the frame's own when readable, else the first allowed one, else '*' for an opaque (sandboxed) frame. */
function targetOrigin(el: HTMLElement, frame: HTMLIFrameElement): string {
  const listed = (dfDollar(el).attr('data-origins') ?? '').split(/\s+/).filter(Boolean);
  try {
    const own = frame.contentWindow?.location.origin;
    if (own && own !== 'null') return own;
  } catch {
    // cross-origin: the location is not readable
  }
  const named = listed.find((o) => o !== 'null');
  return named ?? '*';
}

/** A content height arrived (measured or reported): store it as --iframe-height. */
function setHeight(el: HTMLElement, height: number): void {
  const h = Math.ceil(height);
  if (!(h > 0) || el._iframeHeight === h) return;
  el._iframeHeight = h;
  el.style.setProperty('--iframe-height', `${h}px`);
  // Fires when the framed page's content height changes (data-fit="content") - the new height.
  el.dispatchEvent(new CustomEvent<IframeResizeDetail>('iframe-resize', { bubbles: true, detail: { height: h } }));
}

/** Measure a same-origin frame's document and follow it; false when it is not readable. */
function followContent(el: HTMLElement, frame: HTMLIFrameElement): boolean {
  let doc: Document | null = null;
  try {
    doc = frame.contentDocument;
  } catch {
    doc = null;
  }
  if (!doc?.documentElement) return false;
  el._iframeObserver?.disconnect();
  // the root element's box is the content: body margins cannot collapse through it
  const measure = () => setHeight(el, doc.documentElement.getBoundingClientRect().height);
  const ro = new ResizeObserver(measure);
  ro.observe(doc.documentElement);
  if (doc.body) ro.observe(doc.body);
  el._iframeObserver = ro;
  measure();
  return true;
}

/** Follow a content-fit frame: measure it when same-origin, else ask it for its height - a first report
 *  sent before this script ran would be lost, so the host greets and the framed page answers. */
function follow(el: HTMLElement, frame: HTMLIFrameElement): void {
  if (dfDollar(el).attr('data-fit') !== 'content' || followContent(el, frame)) return;
  frame.contentWindow?.postMessage({ type: PROTOCOL, kind: 'hello' } satisfies IframeWire, targetOrigin(el, frame));
}

function onLoad(el: HTMLElement, frame: HTMLIFrameElement): void {
  applyMarkup(el, 'loaded');
  follow(el, frame);
}

function init() {
  dfDollar('.iframe:not([data-init])').toArray().forEach((el: HTMLElement) => {
    el.dataset.init = '';
    // el.store + el.api (AGENTS.md "State through stores")
    bindComponent(el, iframeApi);
    const frame = frameOf(el);
    if (!frame) return;
    dfDollar(frame).on('load', () => onLoad(el, frame));
    follow(el, frame);
    // a page that finished before this script ran fired its load event unheard; the
    // document's own load event waits for every frame in it, so a frame present while
    // the document still loads is loaded when that event fires (a frame added later
    // fires its own load event, heard above)
    if (document.readyState !== 'complete') globalThis.addEventListener('load', () => onLoad(el, frame), { once: true });
  });
}

// one listener for every framed page's messages: from a frame we host, from an allowed origin
if (!document.__iframeInit) {
  document.__iframeInit = true;
  globalThis.addEventListener('message', (e: MessageEvent) => {
    const data = e.data as IframeWire;
    if (!data || data.type !== PROTOCOL) return;
    // the parent page's messages to this (framed) page
    if (e.source === globalThis.parent && framed()) {
      const parentOrigin = dfDollar(document.documentElement).attr('data-iframe-parent');
      if (parentOrigin && parentOrigin !== e.origin) return;
      // the host asks for the height (it may have missed the first report)
      if (data.kind === 'hello') {
        if (document.documentElement.hasAttribute('data-iframe-child')) sendToParent({ type: PROTOCOL, kind: 'size', height: Math.ceil(document.documentElement.getBoundingClientRect().height) });
        return;
      }
      if (data.kind !== 'message') return;
      // Fires on the framed page's document when its host page posts a message (df$.shadcn.iframe.post) - the name, the payload and the host's origin.
      document.dispatchEvent(new CustomEvent<IframeMessageDetail>('iframe-message', { detail: { name: String(data.name ?? ''), detail: data.detail, origin: e.origin } }));
      return;
    }
    const el = dfDollar('.iframe[data-init]').toArray().find((f: HTMLElement) => frameOf(f)?.contentWindow === e.source) as HTMLElement | undefined;
    if (!el || !accepts(el, e.origin)) return;
    if (data.kind === 'size' && dfDollar(el).attr('data-fit') === 'content' && typeof data.height === 'number') setHeight(el, data.height);
    if (data.kind === 'message') {
      // Fires on the .iframe element when its framed page posts a message (df$.shadcn.iframe.send) - the name, the payload and the origin it came from.
      el.dispatchEvent(new CustomEvent<IframeMessageDetail>('iframe-message', { bubbles: true, detail: { name: String(data.name ?? ''), detail: data.detail, origin: e.origin } }));
    }
  });
}

/** Post one message to the host page - from a page that runs inside a frame. */
function sendToParent(wire: IframeWire): boolean {
  if (!framed()) return false;
  const origin = dfDollar(document.documentElement).attr('data-iframe-parent') || '*';
  globalThis.parent.postMessage(wire, origin);
  return true;
}

// a framed page that opts in (<html data-iframe-child>) reports its height while it changes
if (framed() && document.documentElement.hasAttribute('data-iframe-child') && !document.__iframeChildInit) {
  document.__iframeChildInit = true;
  let last = 0;
  new ResizeObserver(() => {
    const height = Math.ceil(document.documentElement.getBoundingClientRect().height);
    if (height !== last) {
      last = height;
      sendToParent({ type: PROTOCOL, kind: 'size', height });
    }
  }).observe(document.documentElement);
}

const resolve = (target: string | HTMLElement): HTMLElement | undefined => (typeof target === 'string' ? dfDollar(target).get(0) : target);

df$.iframe = {
  /**
   * Post a named message into a framed page; it arrives there as an iframe-message event on the document (or as a plain message event carrying { type: 'defuss:iframe', kind: 'message', name, detail }).
   * @param target - the .iframe element or its selector
   * @param name - the message name
   * @param detail - the payload, structured-cloned
   * @returns false when the frame has no window yet
   */
  post: (target: string | HTMLElement, name: string, detail?: unknown): boolean => {
    const el = resolve(target);
    const frame = el && frameOf(el);
    if (!el || !frame?.contentWindow) return false;
    frame.contentWindow.postMessage({ type: PROTOCOL, kind: 'message', name, detail } satisfies IframeWire, targetOrigin(el, frame));
    return true;
  },
  /**
   * Post a named message to the host page - called from inside a framed page; the host's .iframe element fires iframe-message. Set data-iframe-parent on the framed page's html element to the host origin to post to it only.
   * @param name - the message name
   * @param detail - the payload, structured-cloned
   * @returns false when this page is not framed
   */
  send: (name: string, detail?: unknown): boolean => sendToParent({ type: PROTOCOL, kind: 'message', name, detail }),
  /**
   * Measure a same-origin frame's content again (data-fit="content").
   * @param target - the .iframe element or its selector
   * @returns false when the framed document is not readable (cross-origin: it reports its own height)
   */
  resize: (target: string | HTMLElement): boolean => {
    const el = resolve(target);
    const frame = el && frameOf(el);
    return !!el && !!frame && followContent(el, frame);
  },
};

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
