/* -- Editor.js integration -------------------------------------------- */
/* A thin adapter around the OFFICIAL Editor.js block editor (codex-team,  */
/* Apache-2.0) and its official tools - zero editor bytes ship here. The   */
/* element authors its document as Markdown or as Editor.js block JSON in  */
/* a <script class="editorjs-source">; the runtime loads the pinned ESM    */
/* builds on the first editor, converts Markdown to blocks with marked     */
/* (pinned too), mounts the editor, and serializes blocks back to Markdown.*/
/* A Toolbar with data-editor-command buttons drives the formatting; the   */
/* document DOM stays Editor.js's (block ids on .ce-block[data-id]), so a  */
/* comment column (doc-comments) can anchor spans in it.                   */
/* VERIFIED: (editorjs.e2e, the pinned builds served from node_modules)    */
/* Markdown round trip, the toolbar commands, readonly, the render contract.*/

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, defussQuery, componentState, bindComponent } from '../../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

const editorjsStates = ['default', 'readonly'];

// VERIFIED: (verify's API docs gate) the states below are exactly the declared ones, each
// described, and every config field typed, described and named in the code.
/** setState() configs per state - the editor's states take none. */
export interface EditorjsStateConfigs {
  /** Editable: the editor accepts input, the toolbar commands apply. */
  default: {};
  /** Read only: the document shows, nothing edits it (data-readonly on the element). */
  readonly: {};
}

/** What editorjs-change carries. */
export interface EditorjsChangeDetail {
  /** how many blocks the document has after the change */
  blocks: number;
}

/** What editorjs-ready carries. */
export interface EditorjsReadyDetail {
  /** how many blocks the document started with */
  blocks: number;
}

/** One Editor.js block, as the editor saves it. */
export interface EditorjsBlock {
  /** the block's id (Editor.js writes it on .ce-block[data-id]) */
  id?: string;
  /** the tool: paragraph, header, list, quote, code, delimiter, table */
  type: string;
  /** the tool's data */
  data: Record<string, unknown>;
}

/** Where one block of a Markdown document comes from. */
export interface EditorjsSourceRange {
  /** the block's id (b1, b2, ... - the id setMarkdown() renders it with) */
  block: string;
  /** the tool that renders it: header, paragraph, list, quote, code, delimiter, table */
  type: string;
  /** the heading level, for a header block */
  level?: number;
  /** where the block starts in the Markdown (UTF-16 offset) */
  start: number;
  /** where it ends, exclusive (the blank lines after it belong to the gap, not the block) */
  end: number;
}

/** A span of the Markdown source as the editor shows it - the shape a Document Comments span takes. */
export interface EditorjsLocation {
  /** the id of the block that renders the span */
  block: string;
  /** the span's text as rendered in that block: no heading marks, list markers or inline Markdown */
  text: string;
  /** which occurrence of that text in the block it is (0 = the first) */
  occurrence: number;
}

/** The saved document: Editor.js output data. */
export interface EditorjsDocument {
  /** the blocks, in order */
  blocks: EditorjsBlock[];
  /** the editor's version, when saved by it */
  version?: string;
  /** when it was saved, ms since the epoch */
  time?: number;
}

/** The pinned official builds the component loads (never @latest) - jsDelivr ESM files. */
export const EDITORJS_URL = 'https://cdn.jsdelivr.net/npm/@editorjs/editorjs@2.31.7/dist/editorjs.mjs';
/** The official tools, pinned, keyed by the Editor.js tool name they register as. */
export const EDITORJS_TOOLS: Readonly<Record<string, string>> = {
  header: 'https://cdn.jsdelivr.net/npm/@editorjs/header@2.8.9/dist/header.mjs',
  list: 'https://cdn.jsdelivr.net/npm/@editorjs/list@2.0.9/dist/editorjs-list.mjs',
  quote: 'https://cdn.jsdelivr.net/npm/@editorjs/quote@2.7.6/dist/quote.mjs',
  code: 'https://cdn.jsdelivr.net/npm/@editorjs/code@2.9.4/dist/code.mjs',
  delimiter: 'https://cdn.jsdelivr.net/npm/@editorjs/delimiter@1.4.2/dist/delimiter.mjs',
  marker: 'https://cdn.jsdelivr.net/npm/@editorjs/marker@1.4.0/dist/marker.mjs',
  inlineCode: 'https://cdn.jsdelivr.net/npm/@editorjs/inline-code@1.5.2/dist/inline-code.mjs',
  table: 'https://cdn.jsdelivr.net/npm/@editorjs/table@2.4.6/dist/table.mjs',
};
/** The pinned Markdown parser (marked, MIT) the Markdown source goes through. */
export const MARKED_URL = 'https://cdn.jsdelivr.net/npm/marked@18.1.0/lib/marked.esm.js';

/** The part of Editor.js this component uses. */
interface EditorLike {
  isReady: Promise<void>;
  readOnly: { toggle(state?: boolean): Promise<boolean>; isEnabled: boolean };
  blocks: {
    getCurrentBlockIndex(): number;
    getBlockByIndex(i: number): { id: string; name: string } | undefined;
    getBlockByElement(element: HTMLElement): { id: string; name: string } | undefined;
    getById(id: string): { id: string; name: string } | null;
    getBlockIndex(id: string): number;
    convert(id: string, type: string, data?: Record<string, unknown>): Promise<unknown>;
    update(id: string, data: Record<string, unknown>): Promise<unknown>;
    insert(
      type?: string,
      data?: Record<string, unknown>,
      config?: Record<string, unknown>,
      index?: number,
      needToFocus?: boolean,
    ): unknown;
    render(data: EditorjsDocument): Promise<void>;
    getBlocksCount(): number;
  };
  save(): Promise<EditorjsDocument>;
  destroy(): void;
}
/** The part of marked this component uses. */
interface MarkedLike {
  lexer(md: string): MarkedToken[];
  parseInline(md: string): string;
}
interface MarkedToken {
  type: string;
  depth?: number;
  text?: string;
  raw?: string;
  tokens?: MarkedToken[];
  items?: MarkedToken[];
  ordered?: boolean;
  task?: boolean;
  checked?: boolean;
  lang?: string;
  header?: { text: string }[];
  rows?: { text: string }[][];
}

const modules = new Map<string, Promise<unknown>>();
/** import one pinned vendor module once (the only dynamic import shipped code may contain - verify's vendor gate) */
function loadModule(vendorUrl: string): Promise<unknown> {
  let pending = modules.get(vendorUrl);
  if (!pending) {
    pending = import(/* @vite-ignore */ vendorUrl).then((m) => (m as { default?: unknown }).default ?? m);
    modules.set(vendorUrl, pending);
  }
  return pending;
}

/** every vendor module: the editor, the tools an element uses, the Markdown parser */
async function loadVendor(
  toolNames: string[],
): Promise<{ EditorJS: unknown; tools: Record<string, unknown>; marked: MarkedLike }> {
  const [EditorJS, marked, ...tools] = await Promise.all([
    loadModule(EDITORJS_URL),
    loadModule(MARKED_URL),
    ...toolNames.map((n) => loadModule(EDITORJS_TOOLS[n])),
  ]);
  return { EditorJS, marked: marked as MarkedLike, tools: Object.fromEntries(toolNames.map((n, i) => [n, tools[i]])) };
}

/** a heading's trailing attribute block - `{#id}` / `{.class}` (Pandoc, kramdown, a Google Docs export): an id,
 * not text, so it is neither shown nor part of a located span's text */
const HEADING_ATTRS = /[ \t]*\{[#.][^{}]*\}[ \t]*$/;

/** Markdown → Editor.js blocks (marked's tokens, inline Markdown as the tools' HTML). Block ids are
 * deterministic (b1, b2, ... in document order), so comments and links can address a Markdown document. */
function markdownToBlocks(md: string, marked: MarkedLike): EditorjsBlock[] {
  return parseMarkdown(md, marked).blocks;
}

/** The blocks and, from the same loop, each block's range in the source - marked's top-level token raws
 * rebuild the source exactly (VERIFIED: marked@18.1.0 on a 96 KB Google Docs export, 2026-10-11), so the
 * running sum of their lengths is the offset. */
function parseMarkdown(md: string, marked: MarkedLike): { blocks: EditorjsBlock[]; ranges: EditorjsSourceRange[] } {
  // the tools' sanitizer keeps <b> / <i> (the inline tools' tags), not <strong> / <em>
  const inline = (t: string) =>
    marked
      .parseInline(t)
      .replace(/<code>/g, '<code class="inline-code">')
      .replace(/<(\/?)strong>/g, '<$1b>')
      .replace(/<(\/?)em>/g, '<$1i>');
  const items = (list: MarkedToken): { content: string; meta: Record<string, unknown>; items: unknown[] }[] =>
    (list.items ?? []).map((it) => {
      // a task item's `[x] ` is a token of its own (VERIFIED: marked@18.1.0) - the checklist's meta, not text
      const own = (it.tokens ?? []).filter((t) => t.type !== 'list' && t.type !== 'checkbox');
      const sub = (it.tokens ?? []).find((t) => t.type === 'list');
      return {
        content: inline(
          own
            .map((t) => t.text ?? t.raw ?? '')
            .join(' ')
            .trim(),
        ),
        meta: it.task ? { checked: !!it.checked } : {},
        items: sub ? items(sub) : [],
      };
    });
  const blocks: EditorjsBlock[] = [];
  const ranges: EditorjsSourceRange[] = [];
  let offset = 0;
  for (const t of marked.lexer(md)) {
    const raw = t.raw ?? '';
    const start = offset;
    const count = blocks.length;
    offset += raw.length;
    switch (t.type) {
      case 'heading':
        blocks.push({
          type: 'header',
          data: {
            text: inline((t.text ?? '').replace(HEADING_ATTRS, '')),
            level: Math.min(6, Math.max(1, t.depth ?? 2)),
          },
        });
        break;
      case 'paragraph':
        blocks.push({ type: 'paragraph', data: { text: inline(t.text ?? '') } });
        break;
      case 'list':
        blocks.push({
          type: 'list',
          data: {
            style: t.items?.some((i) => i.task) ? 'checklist' : t.ordered ? 'ordered' : 'unordered',
            meta: {},
            items: items(t),
          },
        });
        break;
      case 'blockquote':
        blocks.push({
          type: 'quote',
          data: { text: inline((t.tokens ?? []).map((x) => x.text ?? '').join('\n')), caption: '', alignment: 'left' },
        });
        break;
      case 'code':
        blocks.push({ type: 'code', data: { code: t.text ?? '' } });
        break;
      case 'hr':
        blocks.push({ type: 'delimiter', data: {} });
        break;
      case 'table':
        blocks.push({
          type: 'table',
          data: {
            withHeadings: true,
            content: [
              (t.header ?? []).map((c) => inline(c.text)),
              ...(t.rows ?? []).map((r) => r.map((c) => inline(c.text))),
            ],
          },
        });
        break;
      case 'html':
        blocks.push({ type: 'paragraph', data: { text: t.raw ?? '' } });
        break;
      default:
        break; // space
    }
    const block = blocks[count];
    if (block) {
      const level = block.type === 'header' ? (block.data.level as number) : undefined;
      ranges.push({
        block: '',
        type: block.type,
        ...(level ? { level } : {}),
        start,
        end: start + raw.trimEnd().length,
      });
    }
  }
  blocks.forEach((b, i) => {
    b.id = `b${i + 1}`;
    ranges[i]!.block = b.id;
  });
  return { blocks, ranges };
}

/** the text a slice of a block's Markdown renders as - the block syntax and the inline Markdown removed,
 * entities decoded - so it can be found in the block's DOM text */
function renderedText(slice: string, type: string, marked: MarkedLike): string {
  if (type === 'delimiter') return '';
  if (type === 'code')
    return slice.replace(/^[ \t]*(`{3,}|~{3,}).*\n?/, '').replace(/\n?[ \t]*(`{3,}|~{3,})[ \t]*$/, '');
  let s = slice;
  if (type === 'header')
    s = s
      .replace(/^[ \t]{0,3}#{1,6}(?:[ \t]+|$)/, '')
      .replace(HEADING_ATTRS, '')
      .replace(/[ \t]+#+[ \t]*$/, '');
  else if (type === 'list') s = s.replace(/^[ \t]*(?:[*+-]|\d+[.)])[ \t]+(?:\[[ xX]\][ \t]+)?/gm, '');
  else if (type === 'quote') s = s.replace(/^[ \t]*>[ \t]?/gm, '');
  else if (type === 'table') s = s.replace(/^[\s|]+|[\s|]+$/g, '');
  return new DOMParser().parseFromString(marked.parseInline(s), 'text/html').body.textContent ?? '';
}

/** the ranges of the last document asked for: an annotation file locates many spans in one document */
let lastRanges: { md: string; ranges: EditorjsSourceRange[] } | null = null;
function sourceRanges(md: string, marked: MarkedLike): EditorjsSourceRange[] {
  if (lastRanges?.md !== md) lastRanges = { md, ranges: parseMarkdown(md, marked).ranges };
  return lastRanges.ranges;
}

/** a span of the source → the block that renders it, its rendered text and that text's occurrence there */
function locate(md: string, marked: MarkedLike, start: number, end: number): EditorjsLocation | null {
  const range = sourceRanges(md, marked).find((r) => start >= r.start && start < r.end);
  if (!range) return null;
  const stop = Math.min(Math.max(end, start), range.end);
  const text = renderedText(md.slice(start, stop), range.type, marked).trim();
  if (!text) return null;
  // the occurrences of the text in what the block renders up to the span's end - the last one is the span
  const upTo = renderedText(md.slice(range.start, stop), range.type, marked);
  let occurrence = -1;
  for (let at = upTo.indexOf(text); at >= 0; at = upTo.indexOf(text, at + 1)) occurrence++;
  return { block: range.block, text, occurrence: Math.max(0, occurrence) };
}

/** the tools' inline HTML back to Markdown (marks for comments drop to their text) */
function inlineToMarkdown(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '  \n')
    .replace(/<(b|strong)>([\s\S]*?)<\/\1>/gi, '**$2**')
    .replace(/<(i|em)>([\s\S]*?)<\/\1>/gi, '*$2*')
    .replace(/<u>([\s\S]*?)<\/u>/gi, '$1')
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
    .replace(/<mark[^>]*>([\s\S]*?)<\/mark>/gi, '$1')
    .replace(/<a [^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .trim();
}

/** Editor.js blocks → Markdown. */
function blocksToMarkdown(blocks: EditorjsBlock[]): string {
  const list = (
    items: { content: string; meta?: { checked?: boolean }; items?: unknown[] }[],
    style: string,
    depth: number,
  ): string =>
    items
      .map((it, i) => {
        const bullet =
          style === 'ordered' ? `${i + 1}.` : style === 'checklist' ? `- [${it.meta?.checked ? 'x' : ' '}]` : '-';
        const sub = it.items?.length ? '\n' + list(it.items as typeof items, style, depth + 1) : '';
        return `${'  '.repeat(depth)}${bullet} ${inlineToMarkdown(it.content)}${sub}`;
      })
      .join('\n');
  return (
    blocks
      .map((b) => {
        const d = b.data as Record<string, any>;
        switch (b.type) {
          case 'header':
            return `${'#'.repeat(Number(d.level) || 2)} ${inlineToMarkdown(String(d.text ?? ''))}`;
          case 'paragraph':
            return inlineToMarkdown(String(d.text ?? ''));
          case 'list':
            return list(d.items ?? [], String(d.style ?? 'unordered'), 0);
          case 'quote':
            return (
              inlineToMarkdown(String(d.text ?? ''))
                .split('\n')
                .map((l) => `> ${l}`)
                .join('\n') + (d.caption ? `\n> - ${inlineToMarkdown(String(d.caption))}` : '')
            );
          case 'code':
            return '```\n' + String(d.code ?? '') + '\n```';
          case 'delimiter':
            return '---';
          case 'table': {
            const rows = (d.content ?? []) as string[][];
            if (!rows.length) return '';
            const line = (r: string[]) => `| ${r.map(inlineToMarkdown).join(' | ')} |`;
            const [head, ...body] = rows;
            return d.withHeadings === false
              ? rows.map(line).join('\n')
              : [line(head), `| ${head.map(() => '---').join(' | ')} |`, ...body.map(line)].join('\n');
          }
          default:
            return '';
        }
      })
      .filter(Boolean)
      .join('\n\n') + '\n'
  );
}

/** The markup of a state: readonly marks the element; the editor itself follows in apply. */
function applyMarkup(el: HTMLElement, stateName: string): void {
  dfDollar(el).attr('data-readonly', stateName === 'readonly' ? '' : null);
}

/** The DOM side of a state: the markup, then the editor's own read-only mode (once it is ready). */
function triggerStateChange(el: HTMLElement, stateName: string): void {
  applyMarkup(el, stateName);
  const editor = el._editorjs as EditorLike | undefined;
  if (editor) editor.isReady.then(() => editor.readOnly.toggle(stateName === 'readonly')).catch(() => undefined);
}

/** Registry-level API; pass the element explicitly. Unknown names throw. */
export const editorjsApi = componentState({
  component: 'editorjs',
  states: editorjsStates,
  apply: (el, state) => triggerStateChange(el, state.name),
  read: (el, state) => ({ name: el.hasAttribute('data-readonly') ? 'readonly' : 'default', config: state.config }),
  markup: (el, state) => applyMarkup(el, state.name),
});

df$.editorjsApi = editorjsApi;
df$.editorjsStates = editorjsStates;

const DEFAULT_TOOLS = Object.keys(EDITORJS_TOOLS);

/** the source the element authors: Markdown (type text/markdown) or Editor.js JSON */
function sourceOf(el: HTMLElement): { markdown?: string; data?: EditorjsDocument } {
  const script = dfDollar(el).children<HTMLScriptElement>('script.editorjs-source').get(0);
  const text = script?.textContent ?? '';
  if (!script || !text.trim()) return { markdown: '' };
  if (/json/i.test(script.type)) {
    try {
      return { data: JSON.parse(text) as EditorjsDocument };
    } catch {
      return { markdown: text };
    }
  }
  return { markdown: text.replace(/^\n/, '') };
}

/** the inline commands: what a toolbar button applies to the selection */
function inlineCommand(name: string): boolean {
  if (name === 'bold' || name === 'italic' || name === 'underline') return document.execCommand(name);
  const sel = globalThis.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
  const range = sel.getRangeAt(0);
  const tag = name === 'marker' ? 'mark' : name === 'inline-code' ? 'code' : null;
  if (!tag) return false;
  const wrapper = document.createElement(tag);
  if (name === 'marker') wrapper.className = 'cdx-marker';
  if (name === 'inline-code') wrapper.className = 'inline-code';
  try {
    range.surroundContents(wrapper);
  } catch {
    wrapper.append(range.extractContents());
    range.insertNode(wrapper);
  }
  return true;
}

/** the block the selection is in (a toolbar command targets the caret's block, which Editor.js's own
 * current-block tracking only follows after a click or a key inside the editor), else Editor.js's current block */
function currentBlock(el: HTMLElement, editor: EditorLike): { id: string; name: string } | undefined {
  const anchor = globalThis.getSelection()?.anchorNode;
  const node = anchor && (anchor.nodeType === Node.ELEMENT_NODE ? (anchor as HTMLElement) : anchor.parentElement);
  const holder = node && el.contains(node) ? node.closest<HTMLElement>('.ce-block') : null;
  if (holder) return editor.blocks.getBlockByElement(holder);
  const index = editor.blocks.getCurrentBlockIndex();
  return index >= 0 ? editor.blocks.getBlockByIndex(index) : undefined;
}

/** run one command on an element's editor: inline formatting or a block change */
async function runCommand(el: HTMLElement, name: string): Promise<boolean> {
  const editor = el._editorjs as EditorLike | undefined;
  if (!editor) return false;
  await editor.isReady;
  if (['bold', 'italic', 'underline', 'marker', 'inline-code'].includes(name)) return inlineCommand(name);
  const [kind, arg] = name.split(':');
  const current = currentBlock(el, editor);
  if (kind === 'delimiter' || kind === 'table') {
    const index = current ? editor.blocks.getBlockIndex(current.id) : editor.blocks.getBlocksCount() - 1;
    editor.blocks.insert(
      kind,
      kind === 'table'
        ? {
            withHeadings: true,
            content: [
              ['', ''],
              ['', ''],
            ],
          }
        : {},
      {},
      index + 1,
      true,
    );
    return true;
  }
  if (!current) return false;
  if (kind === 'paragraph') {
    await editor.blocks.convert(current.id, 'paragraph');
    return true;
  }
  if (kind === 'header') {
    const level = Math.min(6, Math.max(1, Number(arg) || 2));
    if (current.name !== 'header') await editor.blocks.convert(current.id, 'header', { level });
    const block = editor.blocks.getById(current.id);
    if (block) await editor.blocks.update(block.id, { level });
    return true;
  }
  if (kind === 'list') {
    const style = arg === 'ordered' ? 'ordered' : arg === 'checklist' ? 'checklist' : 'unordered';
    if (current.name !== 'list') await editor.blocks.convert(current.id, 'list', { style });
    else await editor.blocks.update(current.id, { style });
    return true;
  }
  if (kind === 'quote' || kind === 'code') {
    await editor.blocks.convert(current.id, kind);
    return true;
  }
  return false;
}

/** mirror the selection's formatting onto the toolbar's toggles (aria-pressed) */
function syncToolbar(el: HTMLElement): void {
  const bar = el._toolbar as HTMLElement | undefined;
  if (!bar || !el.contains(document.activeElement)) return;
  const editor = el._editorjs as EditorLike | undefined;
  const current = editor ? currentBlock(el, editor) : undefined;
  // the caret's inline formatting is an ancestor of the selection (queryCommandState('bold') reports
  // the computed weight - true inside any heading); a heading's level is its tag, a list's style its class
  const anchor = globalThis.getSelection()?.anchorNode;
  const node = anchor && (anchor.nodeType === Node.ELEMENT_NODE ? (anchor as HTMLElement) : anchor.parentElement);
  const holder = node && el.contains(node) ? node.closest<HTMLElement>('.ce-block') : null;
  const level = holder ? (dfDollar(holder).find('.ce-header').get(0)?.tagName.replace(/^H/i, '') ?? '') : '';
  const listStyle =
    holder && dfDollar(holder).find('.cdx-list').length
      ? dfDollar(holder).find('.cdx-list-checklist').length
        ? 'checklist'
        : dfDollar(holder).find('.cdx-list-ordered').length
          ? 'ordered'
          : 'unordered'
      : '';
  dfDollar(bar)
    .find('[data-editor-command]')
    .toArray()
    .forEach((b: HTMLElement) => {
      const name = b.dataset.editorCommand ?? '';
      const [kind, arg] = name.split(':');
      let on: boolean | null = null;
      if (kind === 'bold') on = !!node?.closest('b, strong');
      else if (kind === 'italic') on = !!node?.closest('i, em');
      else if (kind === 'underline') on = !!node?.closest('u');
      else if (kind === 'paragraph') on = current?.name === 'paragraph';
      else if (kind === 'header') on = current?.name === 'header' && (!arg || arg === level);
      else if (kind === 'list') on = current?.name === 'list' && (!arg || arg === listStyle);
      else if (kind === 'quote' || kind === 'code') on = current?.name === kind;
      if (on !== null && b.hasAttribute('aria-pressed')) dfDollar(b).attr('aria-pressed', String(on));
    });
}

async function mount(el: HTMLElement): Promise<void> {
  const toolNames = (dfDollar(el).attr('data-tools') ?? '').split(/\s+/).filter((n) => EDITORJS_TOOLS[n]);
  const tools = toolNames.length ? toolNames : DEFAULT_TOOLS;
  const { EditorJS, tools: loaded, marked } = await loadVendor(tools);
  if (!el.isConnected) return;
  el._marked = marked;
  const source = sourceOf(el);
  const data: EditorjsDocument = source.data ?? { blocks: markdownToBlocks(source.markdown ?? '', marked) };
  let holder = dfDollar(el).children<HTMLElement>('.editorjs-holder').get(0);
  if (!holder) {
    holder = document.createElement('div');
    holder.className = 'editorjs-holder';
    dfDollar(el).append(holder);
  }
  const config: Record<string, unknown> = {};
  for (const name of tools) {
    const cls = loaded[name];
    config[name] =
      name === 'list'
        ? { class: cls, inlineToolbar: true, config: { defaultStyle: 'unordered' } }
        : name === 'header'
          ? { class: cls, inlineToolbar: true, config: { levels: [1, 2, 3, 4], defaultLevel: 2 } }
          : name === 'quote' || name === 'table'
            ? { class: cls, inlineToolbar: true }
            : cls;
  }
  const Ctor = EditorJS as new (opts: Record<string, unknown>) => EditorLike;
  const editor = new Ctor({
    holder,
    data,
    tools: config,
    readOnly: el.hasAttribute('data-readonly'),
    placeholder: dfDollar(el).attr('data-placeholder') ?? 'Write...',
    minHeight: 0,
    onChange: async () => {
      // Fires after the document changed (typing, a block added or converted, a toolbar command) - how many blocks it has now.
      el.dispatchEvent(
        new CustomEvent<EditorjsChangeDetail>('editorjs-change', {
          bubbles: true,
          detail: { blocks: editor.blocks.getBlocksCount() },
        }),
      );
    },
  });
  el._editorjs = editor;
  await editor.isReady;
  if (!el.isConnected) return;
  dfDollar(el).attr('data-ready', '');
  // Fires once the editor mounted its blocks - the count it started with.
  el.dispatchEvent(
    new CustomEvent<EditorjsReadyDetail>('editorjs-ready', { bubbles: true, detail: { blocks: data.blocks.length } }),
  );
}

function init() {
  dfDollar('.editorjs:not([data-init])')
    .toArray()
    .forEach((el: HTMLElement) => {
      el.dataset.init = '';
      // el.store + el.api (AGENTS.md "State through stores")
      bindComponent(el, editorjsApi);
      const barId = dfDollar(el).attr('data-toolbar');
      const bar = barId ? dfDollar<HTMLElement>('#' + CSS.escape(barId)).get(0) : undefined;
      if (bar) {
        el._toolbar = bar;
        // a toolbar button must not take the selection from the editor
        dfDollar(bar).on('mousedown', (e: Event) => {
          if ((e.target as HTMLElement).closest('[data-editor-command]')) e.preventDefault();
        });
        dfDollar(bar).on('click', (e: Event) => {
          const button = (e.target as HTMLElement).closest<HTMLElement>('[data-editor-command]');
          if (!button) return;
          runCommand(el, button.dataset.editorCommand ?? '').then(() => syncToolbar(el));
        });
      }
      mount(el).catch(() => {
        dfDollar(el).attr('data-error', '');
      });
    });
}

if (!document.__editorjsInit) {
  document.__editorjsInit = true;
  document.addEventListener('selectionchange', () => {
    for (const el of dfDollar('.editorjs[data-ready]').toArray() as HTMLElement[]) syncToolbar(el);
  });
}

const resolve = (target: string | HTMLElement): HTMLElement | undefined =>
  typeof target === 'string' ? dfDollar(target).get(0) : target;
const editorOf = (target: string | HTMLElement): EditorLike | undefined =>
  resolve(target)?._editorjs as EditorLike | undefined;

df$.editorjs = {
  /**
   * Load the pinned editor build ahead of the first element (or a self-hosted copy).
   * @param url - the Editor.js ESM module to load instead of the pinned one
   * @returns resolves when the module is loaded
   */
  load: (url?: string): Promise<unknown> => loadModule(url || EDITORJS_URL),
  /** The pinned Editor.js build the component loads. */
  url: EDITORJS_URL,
  /**
   * The document as Markdown - headings, paragraphs, lists (nested, checklists), quotes, code, rules, tables; inline bold, italic, code and links.
   * @param target - the .editorjs element or its selector
   * @returns the Markdown, '' before the editor is ready
   */
  markdown: async (target: string | HTMLElement): Promise<string> => {
    const editor = editorOf(target);
    if (!editor) return '';
    await editor.isReady;
    return blocksToMarkdown((await editor.save()).blocks);
  },
  /**
   * Replace the document with Markdown.
   * @param target - the .editorjs element or its selector
   * @param markdown - the new document
   * @returns resolves once the blocks are rendered
   */
  setMarkdown: async (target: string | HTMLElement, markdown: string): Promise<void> => {
    const el = resolve(target);
    const editor = el?._editorjs as EditorLike | undefined;
    if (!el || !editor) return;
    await editor.isReady;
    await editor.blocks.render({ blocks: markdownToBlocks(markdown, el._marked as MarkedLike) });
  },
  /**
   * The document as Editor.js data (blocks with their ids).
   * @param target - the .editorjs element or its selector
   * @returns the saved document, or null before the editor is ready
   */
  blocks: async (target: string | HTMLElement): Promise<EditorjsDocument | null> => {
    const editor = editorOf(target);
    if (!editor) return null;
    await editor.isReady;
    return editor.save();
  },
  /**
   * Replace the document with Editor.js data.
   * @param target - the .editorjs element or its selector
   * @param data - the blocks to render
   * @returns resolves once the blocks are rendered
   */
  setBlocks: async (target: string | HTMLElement, data: EditorjsDocument): Promise<void> => {
    const editor = editorOf(target);
    if (!editor) return;
    await editor.isReady;
    await editor.blocks.render(data);
  },
  /**
   * Run a formatting command on the current selection or block - what a toolbar button with data-editor-command sends.
   * @param target - the .editorjs element or its selector
   * @param name - bold, italic, underline, marker, inline-code, paragraph, header:1-6, list:unordered|ordered|checklist, quote, code, delimiter, table
   * @returns true when the command applied
   */
  command: (target: string | HTMLElement, name: string): Promise<boolean> => {
    const el = resolve(target);
    return el ? runCommand(el, name) : Promise.resolve(false);
  },
  /**
   * The Editor.js instance behind an element, for anything this API does not cover.
   * @param target - the .editorjs element or its selector
   * @returns the editor, or undefined before it mounted
   */
  editor: (target: string | HTMLElement): unknown => editorOf(target),
  /**
   * Markdown → Editor.js blocks, with the parser the component loaded (after the first editor is ready).
   * @param target - any mounted .editorjs element or its selector (its parser is used)
   * @param markdown - the Markdown to convert
   * @returns the blocks, [] before a parser is loaded
   */
  toBlocks: (target: string | HTMLElement, markdown: string): EditorjsBlock[] => {
    const marked = resolve(target)?._marked as MarkedLike | undefined;
    return marked ? markdownToBlocks(markdown, marked) : [];
  },
  /**
   * Where each block of a Markdown document comes from - its id, its tool and its range in the source, the
   * blocks setMarkdown() renders from the same Markdown.
   * @param target - any mounted .editorjs element or its selector (its parser is used)
   * @param markdown - the Markdown the blocks are rendered from
   * @returns one range per block, in document order; [] before a parser is loaded
   */
  sourceMap: (target: string | HTMLElement, markdown: string): EditorjsSourceRange[] => {
    const marked = resolve(target)?._marked as MarkedLike | undefined;
    return marked ? structuredClone(sourceRanges(markdown, marked)) : [];
  },
  /**
   * A span of the Markdown source as the editor shows it: the block that renders it, its text there and which
   * occurrence of that text it is - the anchor an annotation made against the Markdown needs (a Document
   * Comments span). A span that runs past its block is cut at the block's end.
   * @param target - any mounted .editorjs element or its selector (its parser is used)
   * @param markdown - the Markdown the editor rendered (setMarkdown() or the element's source)
   * @param start - where the span starts in the source (UTF-16 offset)
   * @param end - where it ends, exclusive
   * @returns the block, the rendered text and its occurrence (0 = the first); null when the span holds no text of a block
   */
  locate: (target: string | HTMLElement, markdown: string, start: number, end: number): EditorjsLocation | null => {
    const marked = resolve(target)?._marked as MarkedLike | undefined;
    return marked ? locate(markdown, marked, start, end) : null;
  },
  /**
   * Editor.js blocks → Markdown.
   * @param blocks - the blocks to serialize
   * @returns the Markdown
   */
  toMarkdown: (blocks: EditorjsBlock[]): string => blocksToMarkdown(blocks),
};

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
