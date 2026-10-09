/**
 * Why: the render() half of the State API (AGENTS.md "State API" → render):
 * every JS component reproduces its markup from state, 1:1. At init an
 * instance snapshots its AUTHORED markup as a model - tag, attributes in
 * their order, inner HTML (read through df$, never innerHTML) - before the
 * runtime touches it. render(state) rebuilds that element detached, lets the
 * component apply the state's markup with the SAME function setState uses,
 * and serializes it through df$: escaping and attribute form are the
 * browser's own, so in the default state the output equals the authored
 * markup byte for byte. Emitted once inside core (df$.shadcn.shared).
 * Limits: needs a DOM (render builds detached nodes); the model is the
 * markup as authored - content a page adds later is not in it.
 */
import { defussQuery } from './query.js';

/** An element's authored markup: what render() starts from. */
export type ElementModel = { tag: string; attrs: Array<[string, string]>; html: string };

/** Attributes the runtime stamps on an instance - never part of its markup. */
export const RUNTIME_ATTRS: readonly string[] = ['data-init', 'data-api', 'data-state-name'];

/**
 * Live element → its twin in a copy taken as the markup was parsed, before
 * any component ran. A component snapshotting its own markup at init is too
 * late for a composite: components nested inside it may have initialized
 * first (a toolbar's toggle group stamps data-init and a roving tabindex on
 * its buttons). Core captures the page at bootstrap and every subtree added
 * later from its MutationObserver - created before any component's, so it is
 * notified first.
 */
const AUTHORED = new WeakMap<Element, Element>();

/** The capture lives in a document without a browsing context: its <video
 *  autoplay> never plays, its <img> never loads (a plain cloneNode() would
 *  stay owned by the page - and load and play). */
let inert: Document | null = null;

/** Remember `root` and every element under it as it is NOW (core calls this). */
export function captureAuthored(root: Element): void {
  inert ??= document.implementation.createHTMLDocument('');
  const copy = inert.importNode(root, true) as Element;
  const live = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  const twin = document.createTreeWalker(copy, NodeFilter.SHOW_ELEMENT);
  for (let a: Node | null = live.currentNode, b: Node | null = twin.currentNode; a && b; a = live.nextNode(), b = twin.nextNode())
    if (!AUTHORED.has(a as Element)) AUTHORED.set(a as Element, b as Element);
}

/** Snapshot `el`'s authored markup - from core's capture when the element was
 *  there to capture, else as it is now (call at init, before changing it). */
export function elementModel(el: Element, runtimeAttrs: readonly string[] = []): ElementModel {
  const skip = new Set([...RUNTIME_ATTRS, ...runtimeAttrs]);
  const src = AUTHORED.get(el) ?? el;
  return {
    tag: src.localName,
    attrs: Array.from(src.attributes)
      .filter((a) => !skip.has(a.name))
      .map((a): [string, string] => [a.name, a.value]),
    html: defussQuery()(src).html() ?? '',
  };
}

/** VERIFIED: (probe in the teaser fixture) defuss-morph drops a <template>'s
 *  content - `.html('<template><p>x</p></template>')` leaves the template
 *  empty, as children and as .content - so markup written through df$ lost
 *  every template in it. After `markup` was written into `root`, this gives
 *  each template under `root` the content the HTML parser gives it - the
 *  templates of the markup, in order (morph writes the markup's structure).
 *  The content stays inert: nothing in it loads. */
export function settleTemplates(root: Element, markup: string): void {
  if (!markup.includes('<template')) return;
  const $ = defussQuery();
  const parsed = $(new DOMParser().parseFromString(markup, 'text/html').body).find('template').toArray() as HTMLTemplateElement[];
  ($(root).find('template').toArray() as HTMLTemplateElement[]).forEach((t, i) => {
    if (parsed[i]) t.content.replaceChildren(document.importNode(parsed[i].content, true));
  });
}

/** The model as markup, the state applied by `apply` (the component's own
 *  markup function, run on the detached copy). */
export function renderModel(model: ElementModel, apply?: (el: Element) => void): string {
  const $ = defussQuery();
  // the tag comes from Element.localName, never from page text
  const node = $(`<${model.tag}></${model.tag}>`);
  for (const [name, value] of model.attrs) node.attr(name, value);
  node.html(model.html);
  const host = $('<div></div>').append(node);
  const el = node.get(0) as Element | undefined;
  if (el) settleTemplates(el, model.html);
  if (el && apply) apply(el);
  return host.html() ?? '';
}
