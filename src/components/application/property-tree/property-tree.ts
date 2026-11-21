// -- Property Tree ----------------------------------------------------------
// The Property Grid's editing for a whole linked structure: one value - an object, an array, or with DSON a Map, a
// Set, a Date, a BigInt, a RegExp, a typed array, shared nodes and cycles - as a tree of key / value rows, as deep and
// as wide as it is. Only the open branches have rows and only the rows on screen exist (the shared windowing), so a
// value of a hundred thousand nodes opens at once. A value edits in place with the shared cell editors (Input, a
// number Input, Switch, a colour / date input, Textarea for JSON), a key renames, an entry is added, removed,
// duplicated or moved, a value changes its type - every edit one undo step.
//
// The value is edited IN PLACE: a node that appears twice (a shared reference) or contains itself (a cycle) stays one
// node, so an edit shows wherever it appears. The tree marks every appearance after the first as a reference to the
// first path (a cycle never recurses). The view is the state: el.store.value.config = { expanded, selected, editing,
// editingKey, version } - version counts the edits, so store subscribers hear each one; value() is the live value.

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import {
  defussGlobals,
  defussQuery,
  componentState,
  bindComponent,
  virtualWindow,
  sizerHeight,
  scrollIntoViewTop,
  asEditor,
  builtinEditor,
  editorControl,
  editorKey,
  focusEditor,
  valueType,
} from '../../../shared/state-api.js';
import type { CellEditor } from '../../../shared/editors.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

// VERIFIED: (verify's component types ratchet - tsc -p tsconfig.components.json) every type this file's API docs state
// - arguments, return values, event details - holds against its code: a wrong one is a new type error and fails the
// build. VERIFIED: (property-tree.e2e) a DSON value with a Map, a Set, a Date, a BigInt and a cycle opens, edits and
// reads back; 100,000 nodes keep a window of rows; every edit kind undoes and redoes.

/** A path to a node: object keys and indexes (an array's, a Map's or a Set's entry), from the root. */
type PropertyTreePath = Array<string | number>;

/** The kinds of node a tree shows. */
type PropertyTreeKind =
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'undefined'
  | 'bigint'
  | 'date'
  | 'regexp'
  | 'object'
  | 'array'
  | 'map'
  | 'set'
  | 'typed'
  | 'error'
  | 'function'
  | 'symbol';

/** What the hooks receive about a node. */
interface PropertyTreeContext {
  /** the node's path */
  path: PropertyTreePath;
  /** the path as a JSON Pointer ("/owner/team", "" for the root) */
  pointer: string;
  /** its key in its parent: an object key, an index, a Map key; null for the root */
  key: unknown;
  /** what kind of node it is */
  kind: string;
  /** the container that holds it, null for the root */
  parent: unknown;
  /** the whole value */
  root: unknown;
  /** the tree element */
  tree: HTMLElement;
}

/** What configure() takes - every key optional, merged into the tree's options. */
interface PropertyTreeOptions {
  /** the value to show and edit - any structure (it is edited in place) */
  value?: unknown;
  /** an editor for a value: an element or a CellEditor; null: the built-in one; false: it does not edit */
  getEditorFn?: (
    path: PropertyTreePath,
    value: unknown,
    ctx: PropertyTreeContext,
  ) => HTMLElement | CellEditor | null | false;
  /** refuse a value (or a new key: ctx.kind is 'key'): a message, or false for a generic one; anything else accepts it */
  validateFn?: (path: PropertyTreePath, value: unknown, ctx: PropertyTreeContext) => string | false | null | undefined;
  /** draw a value yourself: fill el (true) or leave it to the tree (false / nothing) */
  renderValue?: (el: HTMLElement, value: unknown, ctx: PropertyTreeContext) => boolean | void;
  /** self-hosted vendor files: { dson } - the defuss-dson ES module */
  urls?: { dson?: string };
}

/** The view - the tree's state config (merged on every setState). */
interface PropertyTreeConfig {
  /** the JSON Pointers of the open branches */
  expanded?: string[];
  /** the selected node's pointer, null for none */
  selected?: string | null;
  /** the pointer of the node whose editor is open, null for none */
  editing?: string | null;
  /** the open editor renames the key instead of editing the value */
  editingKey?: boolean;
  /** the number of edits so far - it moves on every edit */
  version?: number;
}

/** What property-tree-beforechange and property-tree-change carry. */
interface PropertyTreeChangeDetail {
  /** what happened: 'set' (a value), 'rename' (a key), 'add', 'remove', 'move', 'type', 'undo', 'redo' */
  op: string;
  /** the node's path (for 'add': the new node's; for 'rename': the new key's) */
  path: PropertyTreePath;
  /** the path as a JSON Pointer */
  pointer: string;
  /** the new value (for 'rename': the new key) */
  value: unknown;
  /** the value before (for 'rename': the old key) */
  oldValue: unknown;
}

const propertyTreeStates = ['default', 'editing'];

/** setState() configs per state - merged into the stored view. */
export interface PropertyTreeStateConfigs {
  /** The rows of the open branches. */
  default: PropertyTreeConfig;
  /** One editor open - config.editing is its node's pointer, editingKey: true renames the key. */
  editing: PropertyTreeConfig;
}

/** the defuss-dson build the tree loads for a DSON source or dson() (pinned, never @latest) */
const DSON_URL = 'https://cdn.jsdelivr.net/npm/defuss-dson@1.1.2/dist/index.mjs';
let dsonModule: Promise<{ parse(text: string): unknown; stringify(value: unknown): string }> | null = null;
function loadDson(url = DSON_URL) {
  const vendorUrl = url;
  dsonModule ??= Promise.resolve()
    .then(() => import(/* @vite-ignore */ vendorUrl))
    .then((m) => m.DSON ?? m.default);
  return dsonModule;
}

// -- the value model ---------------------------------------------------------------

/** what kind of node a value is */
function kindOf(v: unknown): PropertyTreeKind {
  if (v === null) return 'null';
  const t = typeof v;
  if (t !== 'object') return t as PropertyTreeKind;
  if (Array.isArray(v)) return 'array';
  if (v instanceof Map) return 'map';
  if (v instanceof Set) return 'set';
  if (v instanceof Date) return 'date';
  if (v instanceof RegExp) return 'regexp';
  if (v instanceof Error) return 'error';
  if (ArrayBuffer.isView(v)) return 'typed';
  return 'object';
}
const CONTAINERS = new Set(['object', 'array', 'map', 'set']);
const isContainer = (v) => CONTAINERS.has(kindOf(v));

/** a container's children: [token, label key, value] - Map / Set entries by index */
function entries(v): Array<[string | number, unknown, unknown]> {
  const kind = kindOf(v);
  if (kind === 'array') return v.map((x, i) => [i, i, x]);
  if (kind === 'map') return [...v].map(([k, x], i) => [i, k, x]);
  if (kind === 'set') return [...v].map((x, i) => [i, i, x]);
  if (kind === 'object') return Object.keys(v).map((k) => [k, k, v[k]]);
  return [];
}
const sizeOf = (v) => {
  const kind = kindOf(v);
  return kind === 'map' || kind === 'set' ? v.size : kind === 'array' ? v.length : Object.keys(v).length;
};

/** the child of a container at a token */
function childAt(c, token) {
  const kind = kindOf(c);
  if (kind === 'map') return [...c.values()][token];
  if (kind === 'set') return [...c][token];
  return c?.[token];
}
/** the key a token names in its container (a Map key, an object key, an index) */
function keyAt(c, token) {
  return kindOf(c) === 'map' ? [...c.keys()][token] : token;
}

/** rebuild a Map / Set from entries, in place (they keep their identity) */
function refill(c, list) {
  c.clear();
  if (c instanceof Map) for (const [k, v] of list) c.set(k, v);
  else for (const v of list) c.add(v);
}

/** write a child in place */
function setChild(c, token, value) {
  const kind = kindOf(c);
  if (kind === 'map') {
    const list = [...c];
    list[token] = [list[token][0], value];
    refill(c, list);
  } else if (kind === 'set') {
    const list = [...c];
    list[token] = value;
    refill(c, list);
  } else c[token] = value;
}

/** a JSON Pointer of a path (RFC 6901) */
const pointerOf = (path: PropertyTreePath): string =>
  path.map((t) => '/' + String(t).replace(/~/g, '~0').replace(/\//g, '~1')).join('');
/** a path from a pointer or a path */
function toPath(p: string | PropertyTreePath): PropertyTreePath {
  if (Array.isArray(p)) return p;
  if (!p) return [];
  return p
    .split('/')
    .slice(1)
    .map((t) => t.replace(/~1/g, '/').replace(/~0/g, '~'))
    .map((t) => (/^\d+$/.test(t) ? Number(t) : t));
}

/** the node at a path and the container that holds it (the holder for the root) */
function locate(tree, path: PropertyTreePath) {
  let parent = tree._holder;
  let token: string | number = 'value';
  let node = tree._holder.value;
  for (const t of path) {
    if (!isContainer(node)) return null;
    // an object key may look like a number: tokens are read as the container needs them
    const tok = kindOf(node) === 'object' ? String(t) : Number(t);
    parent = node;
    token = tok;
    node = childAt(node, tok);
  }
  return { parent, token, node };
}

/** a shallow copy of a container's contents - an undo step restores it (children keep their identity) */
function snapshot(c) {
  const kind = kindOf(c);
  if (kind === 'map') return { kind, list: [...c] };
  if (kind === 'set') return { kind, list: [...c] };
  if (kind === 'array') return { kind, list: c.slice() };
  return { kind, list: Object.keys(c).map((k) => [k, c[k]]) };
}
function restore(c, snap) {
  if (snap.kind === 'map' || snap.kind === 'set') refill(c, snap.list);
  else if (snap.kind === 'array') c.splice(0, c.length, ...snap.list);
  else {
    for (const k of Object.keys(c)) delete c[k];
    for (const [k, v] of snap.list) c[k] = v;
  }
}

/**
 * every container's first path - the shallowest appearance, in key order (breadth first): /services/1 owns a service
 * that /services/0/dependsOn/0 also names. Later appearances are references to it.
 */
function firstPaths(root) {
  const first = new Map<object, string>();
  let level: Array<[unknown, PropertyTreePath]> = [[root, []]];
  while (level.length) {
    const next: Array<[unknown, PropertyTreePath]> = [];
    for (const [v, path] of level) {
      if (!isContainer(v) || first.has(v as object)) continue;
      first.set(v as object, pointerOf(path));
      for (const [token, , child] of entries(v)) if (isContainer(child)) next.push([child, [...path, token]]);
    }
    level = next;
  }
  return first;
}

// -- display -----------------------------------------------------------------------

/** a value's one-line text */
function summary(v, kind = kindOf(v)) {
  switch (kind) {
    case 'string':
      return JSON.stringify(v);
    case 'bigint':
      return `${v}n`;
    case 'date':
      return Number.isNaN(v.getTime()) ? 'Invalid Date' : v.toISOString();
    case 'regexp':
    case 'symbol':
      return String(v);
    case 'function':
      return `ƒ ${v.name || 'anonymous'}()`;
    case 'error':
      return `${v.name}: ${v.message}`;
    case 'typed':
      return `${v.constructor.name}(${v.length ?? v.byteLength}) [${Array.from(v.slice?.(0, 8) ?? []).join(', ')}${(v.length ?? 0) > 8 ? ', ...' : ''}]`;
    case 'array': {
      const n = v.length;
      return `[${n} ${n === 1 ? 'item' : 'items'}]`;
    }
    case 'map':
      return `Map(${v.size})`;
    case 'set':
      return `Set(${v.size})`;
    case 'object': {
      const n = Object.keys(v).length;
      return `{${n} ${n === 1 ? 'key' : 'keys'}}`;
    }
    default:
      return String(v);
  }
}

/** the label of a key */
const keyLabel = (key, parentKind) =>
  parentKind === 'map' ? (typeof key === 'string' ? JSON.stringify(key) : summary(key)) : String(key);

/** the rows of the open branches: one per node below every open container */
function buildRows(tree) {
  const root = tree._holder.value;
  const open = new Set(configOf(tree).expanded ?? []);
  const first = tree._first;
  const rows = [];
  const walk = (v, path, depth, key, parentKind) => {
    const pointer = pointerOf(path);
    const kind = kindOf(v);
    const row: any = { path, pointer, depth, key, parentKind, value: v, kind };
    if (CONTAINERS.has(kind)) {
      const at = first.get(v);
      if (at !== pointer) {
        row.isRef = true;
        row.ref = at;
        row.cycle = pointer.startsWith(at + '/') || at === '';
      } else {
        row.container = true;
        row.count = sizeOf(v);
        row.open = open.has(pointer);
      }
    }
    rows.push(row);
    if (row.container && row.open)
      for (const [token, k, child] of entries(v)) walk(child, [...path, token], depth + 1, k, kind);
  };
  walk(root, [], 0, null, null);
  if (tree.hasAttribute('data-hide-root') && rows[0]?.container) {
    rows.shift();
    for (const r of rows) r.depth--;
  }
  tree._rows = rows;
}

const configOf = (tree) => tree._config ?? tree.store?.value.config ?? {};
const optionsOf = (tree) => tree._options ?? {};
const contextOf = (tree, row): PropertyTreeContext => {
  const at = locate(tree, row.path);
  return {
    path: [...row.path],
    pointer: row.pointer,
    key: row.key,
    kind: row.kind,
    parent: row.path.length ? at?.parent : null,
    root: tree._holder.value,
    tree,
  };
};

/** write a row element from its row */
function fillRow(tree, el, row, index) {
  el._row = row;
  el._index = index;
  el.dataset.kind = row.kind;
  el.style.setProperty('--depth', String(row.depth));
  el.setAttribute('aria-level', String(row.depth + 1));
  if (row.container) el.setAttribute('aria-expanded', String(row.open));
  else el.removeAttribute('aria-expanded');
  el.toggleAttribute('data-ref', !!row.isRef);
  delete el.dataset.editing;
  const [toggle, key, value, type, actions] = el.children;
  toggle.toggleAttribute('data-leaf', !row.container);
  key.textContent = row.key === null ? (tree.dataset.rootLabel ?? 'root') : keyLabel(row.key, row.parentKind);
  key.dataset.keyKind =
    row.key === null ? 'root' : row.parentKind === 'object' ? 'key' : row.parentKind === 'map' ? 'map' : 'index';
  value.textContent = '';
  value.dataset.kind = row.kind;
  const custom = !row.isRef && optionsOf(tree).renderValue?.(value, row.value, contextOf(tree, row));
  if (!custom) {
    if (row.isRef) {
      const link = document.createElement('button');
      link.type = 'button';
      link.className = 'property-tree-ref';
      link.tabIndex = -1;
      link.dataset.pointer = row.ref;
      link.textContent = `${row.cycle ? 'cycle' : 'ref'} ${row.ref || '/'}`;
      value.append(link);
    } else if (row.kind === 'string' && /^#[0-9a-f]{6}$/i.test(row.value)) {
      const swatch = document.createElement('i');
      swatch.className = 'property-tree-swatch';
      swatch.style.background = row.value;
      swatch.setAttribute('aria-hidden', 'true');
      value.append(swatch, document.createTextNode(summary(row.value)));
    } else value.textContent = summary(row.value, row.kind);
  }
  type.textContent = row.isRef ? 'ref' : row.kind === 'typed' ? row.value.constructor.name : row.kind;
  actions.setAttribute('aria-label', `Actions for ${key.textContent}`);
  const label =
    key.textContent + ': ' + (row.isRef ? `reference to ${row.ref || 'the root'}` : summary(row.value, row.kind));
  el.setAttribute('aria-label', label);
}

/** writes the window of rows that belongs at the current scroll position */
function renderRows(tree) {
  const pool = tree._pool;
  if (!pool || !tree._rows) return;
  const rows = tree._rows;
  const h = tree._rowHeight;
  const win = virtualWindow(tree._viewport.scrollTop, tree._viewport.clientHeight, h, rows.length);
  tree._sizer.style.height = `${sizerHeight(rows.length, h)}px`;
  while (pool.children.length < win.count) {
    const el = document.createElement('div');
    el.className = 'property-tree-row';
    el.setAttribute('role', 'treeitem');
    el.id = `${tree._uid}-row-${pool.children.length}`;
    for (const part of ['toggle', 'key', 'value', 'type']) {
      const span = document.createElement('span');
      span.className = `property-tree-${part}`;
      if (part === 'toggle' || part === 'type') span.setAttribute('aria-hidden', 'true');
      el.append(span);
    }
    const actions = document.createElement('button');
    actions.type = 'button';
    actions.className = 'property-tree-actions';
    actions.tabIndex = -1;
    actions.setAttribute('aria-haspopup', 'menu');
    el.append(actions);
    pool.append(el);
  }
  while (pool.children.length > win.count) pool.lastElementChild.remove();
  pool.style.translate = `0 ${win.shift}px`;
  const selected = configOf(tree).selected ?? null;
  let active = null;
  let edShown = false;
  for (let i = 0; i < pool.children.length; i++) {
    const el = pool.children[i];
    const index = win.first + i;
    const row = rows[index];
    const key = `${tree._gen}:${index}`;
    if (el._key !== key) {
      el._key = key;
      fillRow(tree, el, row, index);
    }
    const ed = tree._editor;
    if (ed && ed.pointer === row.pointer) {
      edShown = true;
      if (!el.contains(ed.wrap)) {
        const focused = ed.wrap.contains(document.activeElement) || document.activeElement === document.body;
        placeEditor(el, ed);
        if (focused) (editorControl(ed.editor) as HTMLElement).focus({ preventScroll: true });
      }
    }
    el.setAttribute('aria-selected', String(row.pointer === selected));
    el.toggleAttribute('data-active', index === tree._active);
    if (index === tree._active) active = el;
  }
  if (active) tree._viewport.setAttribute('aria-activedescendant', active.id);
  else tree._viewport.removeAttribute('aria-activedescendant');
  if (tree._editor && !edShown && !tree._writing)
    queueMicrotask(() => {
      if (tree._editor && !commit(tree, false)) cancel(tree, false);
    });
}

/** the rows again (a new view or a new value), then the window */
function refresh(tree, structural = true) {
  if (structural) tree._first = firstPaths(tree._holder.value);
  buildRows(tree);
  tree._gen = (tree._gen || 0) + 1;
  tree._active = Math.max(0, Math.min(tree._rows.length - 1, tree._active ?? 0));
  renderRows(tree);
}

/** move the active row (and scroll it into view) */
function activate(tree, index) {
  const total = tree._rows?.length ?? 0;
  if (!total) return;
  tree._active = Math.max(0, Math.min(total - 1, index));
  const vp = tree._viewport;
  vp.scrollTop = scrollIntoViewTop(tree._active, vp.scrollTop, vp.clientHeight, tree._rowHeight, total);
  renderRows(tree);
}
const indexOf = (tree, pointer) => tree._rows.findIndex((r) => r.pointer === pointer);

// -- edits -------------------------------------------------------------------------

/**
 * Run one edit: snapshot the containers it changes, ask property-tree-beforechange (cancelable), apply it, record
 * the undo step, draw again and fire property-tree-change.
 */
function change(tree, detail: PropertyTreeChangeDetail, containers: unknown[], apply: () => void) {
  if (tree.hasAttribute('data-readonly')) return false;
  // Fires before an edit is applied - cancelable: preventDefault() keeps the value as it is.
  const before = new CustomEvent<PropertyTreeChangeDetail>('property-tree-beforechange', {
    bubbles: true,
    cancelable: true,
    detail,
  });
  if (!tree.dispatchEvent(before)) {
    tree._viewPatch = null;
    return false;
  }
  const unique = [...new Set(containers)];
  const was = unique.map((c) => [c, snapshot(c)]);
  apply();
  const now = unique.map((c) => [c, snapshot(c)]);
  tree._undo.push({ was, now, detail });
  tree._redo = [];
  done(tree, detail);
  return true;
}
/** after an edit (or an undo): count it, draw, tell */
function done(tree, detail) {
  tree._writing = true;
  // an edit may move the open branches (a renamed key, a container that got its first child)
  const view = tree._viewPatch ?? {};
  tree._viewPatch = null;
  propertyTreeApi.setState(tree, 'default', {
    ...view,
    version: (configOf(tree).version ?? 0) + 1,
    editing: null,
    editingKey: false,
  });
  refresh(tree);
  tree._writing = false;
  // Fires after an edit was applied (or undone / redone) - what happened, where, the new and the old value.
  tree.dispatchEvent(new CustomEvent<PropertyTreeChangeDetail>('property-tree-change', { bubbles: true, detail }));
}

function undoStep(tree, back: boolean) {
  const from = back ? tree._undo : tree._redo;
  const step = from.pop();
  if (!step) return false;
  for (const [c, snap] of back ? step.was : step.now) restore(c, snap);
  (back ? tree._redo : tree._undo).push(step);
  done(tree, { ...step.detail, op: back ? 'undo' : 'redo' });
  return true;
}

/** a value of another type, made from the one it had */
function convert(value, kind) {
  const from = kindOf(value);
  const text = from === 'string' ? value : CONTAINERS.has(from) ? '' : summary(value, from);
  switch (kind) {
    case 'string':
      return from === 'string' ? value : text;
    case 'number': {
      const n = Number(from === 'bigint' ? Number(value) : value);
      return Number.isFinite(n) ? n : 0;
    }
    case 'boolean':
      return from === 'string' ? value === 'true' : !!value;
    case 'null':
      return null;
    case 'object':
      return from === 'array' ? Object.assign({}, value) : from === 'map' ? Object.fromEntries(value) : {};
    case 'array':
      return from === 'object' ? Object.values(value) : from === 'set' || from === 'map' ? [...value.values()] : [];
    case 'map':
      return from === 'object' ? new Map(Object.entries(value)) : new Map();
    case 'set':
      return from === 'array' ? new Set(value) : new Set();
    case 'date':
      return new Date(from === 'string' || from === 'number' ? value : Date.now());
    case 'bigint':
      try {
        return BigInt(from === 'number' ? Math.trunc(value) : from === 'string' ? value : 0);
      } catch {
        return 0n;
      }
    default:
      return value;
  }
}

/** a free key in an object / Map: name, name 2, name 3 ... */
function freeKey(c, name) {
  const has = (k) => (c instanceof Map ? c.has(k) : Object.prototype.hasOwnProperty.call(c, k));
  if (!has(name)) return name;
  let n = 2;
  while (has(`${name} ${n}`)) n++;
  return `${name} ${n}`;
}

const ops = {
  /** write a node's value */
  set(tree, path: PropertyTreePath, value) {
    const at = locate(tree, path);
    if (!at) return false;
    return change(tree, { op: 'set', path, pointer: pointerOf(path), value, oldValue: at.node }, [at.parent], () =>
      setChild(at.parent, at.token, value),
    );
  },
  /** change a node's type */
  type(tree, path: PropertyTreePath, kind: string) {
    const at = locate(tree, path);
    if (!at || kindOf(at.node) === kind) return false;
    const value = convert(at.node, kind);
    return change(tree, { op: 'type', path, pointer: pointerOf(path), value, oldValue: at.node }, [at.parent], () =>
      setChild(at.parent, at.token, value),
    );
  },
  /** rename an object key or a Map key (its place stays) */
  rename(tree, path: PropertyTreePath, key) {
    const at = locate(tree, path);
    if (!at || !path.length) return false;
    const c = at.parent;
    const kind = kindOf(c);
    const old = keyAt(c, at.token);
    if (old === key || (kind !== 'object' && kind !== 'map')) return false;
    const newPath = kind === 'object' ? [...path.slice(0, -1), String(key)] : path;
    return change(
      tree,
      { op: 'rename', path: newPath, pointer: pointerOf(newPath), value: key, oldValue: old },
      [c],
      () => {
        if (kind === 'map')
          refill(
            c,
            [...c].map(([k, v]) => [k === old ? key : k, v]),
          );
        else {
          const list = Object.keys(c).map((k) => [k === old ? String(key) : k, c[k]]);
          for (const k of Object.keys(c)) delete c[k];
          for (const [k, v] of list) c[k] = v;
        }
        // the open branches below follow the key
        const before = pointerOf(path);
        const after = pointerOf(newPath);
        if (before !== after)
          tree._viewPatch = {
            expanded: (configOf(tree).expanded ?? []).map((p) =>
              p === before || p.startsWith(before + '/') ? after + p.slice(before.length) : p,
            ),
          };
      },
    );
  },
  /** add a child to a container (at an index for arrays, after the others otherwise) */
  add(tree, path: PropertyTreePath, key?: unknown, value: unknown = '', index?: number) {
    const at = locate(tree, path);
    if (!at || !isContainer(at.node)) return null;
    const c = at.node;
    const kind = kindOf(c);
    let token: string | number;
    if (kind === 'array') token = index ?? c.length;
    else if (kind === 'set') token = c.size;
    else if (kind === 'map') token = c.size;
    else token = freeKey(c, key == null ? 'key' : String(key));
    const newPath = [...path, token];
    const ok = change(
      tree,
      { op: 'add', path: newPath, pointer: pointerOf(newPath), value, oldValue: undefined },
      [c],
      () => {
        if (kind === 'array') c.splice(token as number, 0, value);
        else if (kind === 'set') c.add(value);
        else if (kind === 'map') c.set(freeKey(c, key == null ? 'key' : key), value);
        else c[token] = value;
        const open = new Set(configOf(tree).expanded ?? []);
        open.add(pointerOf(path));
        tree._viewPatch = { expanded: [...open] };
      },
    );
    return ok ? newPath : null;
  },
  /** remove a node from its container */
  remove(tree, path: PropertyTreePath) {
    const at = locate(tree, path);
    if (!at || !path.length) return false;
    const c = at.parent;
    const kind = kindOf(c);
    return change(
      tree,
      { op: 'remove', path, pointer: pointerOf(path), value: undefined, oldValue: at.node },
      [c],
      () => {
        if (kind === 'array') c.splice(at.token, 1);
        else if (kind === 'map' || kind === 'set')
          refill(
            c,
            [...c].filter((_, i) => i !== at.token),
          );
        else delete c[at.token];
      },
    );
  },
  /** a copy after the node (an array item, an entry, or a key "<name> copy") - a deep copy, shared nodes inside stay shared */
  duplicate(tree, path: PropertyTreePath) {
    const at = locate(tree, path);
    if (!at || !path.length) return null;
    const c = at.parent;
    const kind = kindOf(c);
    let copy;
    try {
      copy = structuredClone(at.node);
    } catch {
      copy = at.node;
    }
    let newPath: PropertyTreePath = path;
    const ok = change(
      tree,
      { op: 'add', path, pointer: pointerOf(path), value: copy, oldValue: undefined },
      [c],
      () => {
        if (kind === 'array') {
          c.splice((at.token as number) + 1, 0, copy);
          newPath = [...path.slice(0, -1), (at.token as number) + 1];
        } else if (kind === 'set') {
          const list = [...c];
          list.splice((at.token as number) + 1, 0, copy);
          refill(c, list);
        } else if (kind === 'map') {
          const list = [...c];
          const k = keyAt(c, at.token);
          list.splice((at.token as number) + 1, 0, [
            freeKey(c, typeof k === 'string' ? `${k} copy` : `${String(k)} copy`),
            copy,
          ]);
          refill(c, list);
          newPath = [...path.slice(0, -1), (at.token as number) + 1];
        } else {
          const name = freeKey(c, `${at.token} copy`);
          const list = Object.keys(c).flatMap((k) =>
            k === at.token
              ? [
                  [k, c[k]],
                  [name, copy],
                ]
              : [[k, c[k]]],
          );
          for (const k of Object.keys(c)) delete c[k];
          for (const [k, v] of list) c[k] = v;
          newPath = [...path.slice(0, -1), name];
        }
      },
    );
    return ok ? newPath : null;
  },
  /** move an array item, a Map / Set entry or an object key one place up (-1) or down (1) */
  move(tree, path: PropertyTreePath, by: number) {
    const at = locate(tree, path);
    if (!at || !path.length) return null;
    const c = at.parent;
    const kind = kindOf(c);
    const keys = kind === 'object' ? Object.keys(c) : null;
    const from = keys ? keys.indexOf(at.token as string) : (at.token as number);
    const to = from + by;
    const size = keys ? keys.length : sizeOf(c);
    if (to < 0 || to >= size) return null;
    const newPath = [...path.slice(0, -1), keys ? at.token : to];
    const ok = change(
      tree,
      { op: 'move', path: newPath, pointer: pointerOf(newPath), value: to, oldValue: from },
      [c],
      () => {
        const list = keys ? keys.map((k) => [k, c[k]]) : kind === 'array' ? c.slice() : [...c];
        const [item] = list.splice(from, 1);
        list.splice(to, 0, item);
        if (kind === 'array') c.splice(0, c.length, ...list);
        else if (kind === 'map' || kind === 'set') refill(c, list);
        else {
          for (const k of Object.keys(c)) delete c[k];
          for (const [k, v] of list) c[k] = v;
        }
      },
    );
    return ok ? newPath : null;
  },
};

// -- editing -----------------------------------------------------------------------

/** a JSON-safe container (no cycle, no shared node, only JSON values) edits as JSON text */
function jsonSafe(v, seen = new Set()) {
  const kind = kindOf(v);
  if (kind === 'object' || kind === 'array') {
    if (seen.has(v)) return false;
    seen.add(v);
    return entries(v).every(([, , x]) => jsonSafe(x, seen));
  }
  return kind === 'string' || kind === 'boolean' || kind === 'null' || (kind === 'number' && Number.isFinite(v));
}

/** the built-in editor of a value, by its kind (null: it does not edit as a value) */
function defaultEditor(row): CellEditor | null {
  const v = row.value;
  const input = (text: string, read: (s: string) => unknown, check: (s: string) => string) => {
    const el = document.createElement('input');
    el.className = 'input';
    el.dataset.size = 'xs';
    el.value = text;
    return { el, getValue: () => read(el.value), validate: () => check(el.value) };
  };
  switch (row.kind) {
    case 'string':
    case 'number':
    case 'boolean':
      return builtinEditor(valueType(v), v, null, { colorClass: 'property-tree-color-input' });
    case 'null':
    case 'undefined':
      // a literal: JSON (a number, true, "text", {} ...) or plain text
      return input(
        '',
        (s) => {
          if (s.trim() === '') return row.kind === 'null' ? null : undefined;
          try {
            return JSON.parse(s);
          } catch {
            return s;
          }
        },
        () => '',
      );
    case 'bigint':
      return input(
        String(v),
        (s) => BigInt(s.trim()),
        (s) => (/^\s*-?\d+\s*$/.test(s) ? '' : 'A whole number'),
      );
    case 'date': {
      const local = Number.isNaN(v.getTime())
        ? ''
        : new Date(v.getTime() - v.getTimezoneOffset() * 60000).toISOString().slice(0, 23);
      const el = document.createElement('input');
      el.type = 'datetime-local';
      el.step = '0.001';
      el.className = 'input';
      el.dataset.size = 'xs';
      el.value = local;
      return { el, getValue: () => new Date(el.value), validate: () => (el.value ? '' : 'A date and time') };
    }
    case 'regexp':
      return input(
        String(v),
        (s) => {
          const m = /^\/(.*)\/([dgimsuvy]*)$/s.exec(s.trim());
          return m ? new RegExp(m[1], m[2]) : new RegExp(s);
        },
        (s) => {
          try {
            const m = /^\/(.*)\/([dgimsuvy]*)$/s.exec(s.trim());
            if (m) new RegExp(m[1], m[2]);
            else new RegExp(s);
            return '';
          } catch (e) {
            return String((e as Error).message);
          }
        },
      );
    case 'object':
    case 'array':
      return jsonSafe(v) ? builtinEditor('json', v) : null;
    default:
      return null;
  }
}

/** put the open editor into its row */
function placeEditor(el, ed) {
  ed.el = el;
  el.dataset.editing = ed.key ? 'key' : 'value';
  const cell = el.children[ed.key ? 1 : 2];
  cell.textContent = '';
  cell.append(ed.wrap);
}

/** open the value editor (or the key editor) of the node at a pointer */
function openEditor(tree, pointer: string, key = false) {
  if (tree.hasAttribute('data-readonly')) return false;
  if (tree._editor && !commit(tree, false)) return false;
  // the way to it opens
  const path = toPath(pointer);
  if (indexOf(tree, pointer) < 0) reveal(tree, path);
  const index = indexOf(tree, pointer);
  const row = tree._rows[index];
  if (!row || row.isRef) return false;
  const ctx = contextOf(tree, row);
  let editor: CellEditor | null;
  if (key) {
    if (row.key === null || (row.parentKind !== 'object' && !(row.parentKind === 'map' && typeof row.key === 'string')))
      return false;
    const el = document.createElement('input');
    el.className = 'input';
    el.dataset.size = 'xs';
    el.value = String(row.key);
    editor = { el, getValue: () => el.value, validate: () => (el.value === '' ? 'A key' : '') };
  } else {
    const custom = optionsOf(tree).getEditorFn?.([...row.path], row.value, ctx);
    if (custom === false) return false;
    editor = asEditor(custom) ?? defaultEditor(row);
  }
  if (!editor) return false;
  activate(tree, index);
  const wrap = document.createElement('span');
  wrap.className = 'property-tree-editor';
  wrap.append(editor.el);
  const ed = { pointer, path: row.path, row, key, editor, wrap, el: null };
  tree._editor = ed;
  const el = dfDollar(tree._pool)
    .children('.property-tree-row')
    .toArray()
    .find((r) => r._index === index);
  if (el) placeEditor(el, ed);
  wrap.addEventListener('keydown', (e) => {
    e.stopPropagation();
    const act = editorKey(e, editor);
    if (!act) return;
    e.preventDefault();
    if (act === 'cancel') cancel(tree);
    else if (commit(tree) && (act === 'next' || act === 'prev'))
      activate(tree, (tree._active ?? 0) + (act === 'next' ? 1 : -1));
  });
  for (const type of ['click', 'dblclick', 'pointerdown']) wrap.addEventListener(type, (e) => e.stopPropagation());
  wrap.addEventListener('change', () => {
    if (editor.immediate) commit(tree);
  });
  wrap.addEventListener('focusout', (e) => {
    if (wrap.contains(e.relatedTarget as Node)) return;
    setTimeout(() => {
      if (tree._editor === ed && !wrap.contains(document.activeElement)) commit(tree, false);
    }, 0);
  });
  tree._writing = true;
  propertyTreeApi.setState(tree, 'editing', { editing: pointer, editingKey: key });
  tree._writing = false;
  focusEditor(editor);
  return true;
}

/** close the editor without writing */
function cancel(tree, focus = true) {
  if (!tree._editor) return;
  tree._editor = null;
  closeEditor(tree, focus);
}

/** the editing state ends and the rows draw again (the editor's row shows its value) */
function closeEditor(tree, focus) {
  tree._writing = true;
  propertyTreeApi.setState(tree, 'default', { editing: null, editingKey: false });
  tree._writing = false;
  tree._gen++;
  renderRows(tree);
  if (focus) tree._viewport.focus({ preventScroll: true });
}

/** commit the open editor: validate, then write (a value, or a key). False while refused. */
function commit(tree, focus = true) {
  const ed = tree._editor;
  if (!ed) return true;
  let problem = ed.editor.validate?.() ?? '';
  let value;
  if (!problem) {
    try {
      value = ed.editor.getValue();
    } catch (error) {
      problem = String((error as Error).message ?? error);
    }
  }
  const ctx = { ...contextOf(tree, ed.row), kind: ed.key ? 'key' : ed.row.kind };
  if (!problem && ed.key) {
    const at = locate(tree, ed.path);
    const c = at?.parent;
    const taken = c instanceof Map ? c.has(value) : Object.prototype.hasOwnProperty.call(c ?? {}, value);
    if (value !== ed.row.key && taken) problem = `"${value}" is already a key here`;
  }
  if (!problem) {
    const answer = optionsOf(tree).validateFn?.([...ed.path], value, ctx);
    if (typeof answer === 'string' && answer) problem = answer;
    else if (answer === false) problem = 'Invalid value';
  }
  if (problem) {
    const control = editorControl(ed.editor);
    control.setAttribute('aria-invalid', 'true');
    let note = dfDollar(ed.wrap).children('.property-tree-error').get(0);
    if (!note) {
      note = document.createElement('span');
      note.className = 'property-tree-error';
      note.setAttribute('role', 'alert');
      note.id = `pt-error-${Math.random().toString(36).slice(2, 8)}`;
      ed.wrap.append(note);
      control.setAttribute('aria-describedby', note.id);
    }
    dfDollar(note).text(problem);
    return false;
  }
  tree._editor = null;
  let changed;
  if (ed.key) changed = value !== ed.row.key && ops.rename(tree, ed.path, value);
  else {
    const same = value === ed.row.value || (typeof value !== 'object' && Object.is(value, ed.row.value));
    changed = !same && ops.set(tree, ed.path, value);
  }
  if (!changed) closeEditor(tree, false);
  else if (ed.key) {
    // the renamed node stays the active row
    const at = indexOf(
      tree,
      pointerOf(ed.row.parentKind === 'object' ? [...ed.path.slice(0, -1), String(value)] : ed.path),
    );
    if (at >= 0) activate(tree, at);
  }
  if (focus) tree._viewport.focus({ preventScroll: true });
  return true;
}

// -- the actions menu --------------------------------------------------------------

const TYPES = ['string', 'number', 'boolean', 'null', 'object', 'array', 'map', 'set', 'date', 'bigint'];

/** the menu items a row offers */
function menuFor(tree, row) {
  const readonly = tree.hasAttribute('data-readonly');
  const items: Array<{ action: string; label: string; disabled?: boolean; checked?: boolean; sep?: boolean }> = [];
  const isRoot = row.key === null;
  if (row.container)
    items.push({
      action: 'add',
      label: row.kind === 'object' || row.kind === 'map' ? 'Add property' : 'Add item',
      disabled: readonly,
    });
  if (row.container) items.push({ action: 'toggle', label: row.open ? 'Collapse' : 'Expand' });
  if (row.isRef) items.push({ action: 'follow', label: 'Go to the first appearance' });
  if (!row.isRef) items.push({ action: 'edit', label: 'Edit value', disabled: readonly || !defaultEditor(row) });
  if (!isRoot && (row.parentKind === 'object' || row.parentKind === 'map'))
    items.push({
      action: 'rename',
      label: 'Rename key',
      disabled: readonly || (row.parentKind === 'map' && typeof row.key !== 'string'),
    });
  if (!isRoot) {
    items.push({ action: 'duplicate', label: 'Duplicate', disabled: readonly, sep: true });
    items.push({ action: 'up', label: 'Move up', disabled: readonly });
    items.push({ action: 'down', label: 'Move down', disabled: readonly });
  }
  if (!row.isRef)
    TYPES.forEach((t, i) =>
      items.push({ action: `type:${t}`, label: `As ${t}`, checked: row.kind === t, disabled: readonly, sep: i === 0 }),
    );
  items.push({ action: 'copy-path', label: 'Copy path', sep: true });
  items.push({ action: 'copy-json', label: 'Copy as JSON' });
  if (!isRoot) items.push({ action: 'remove', label: 'Delete', disabled: readonly, sep: true });
  return items;
}

function openMenu(tree, index, anchor?: HTMLElement) {
  const row = tree._rows[index];
  if (!row) return;
  activate(tree, index);
  const menu = tree._menu;
  menu.textContent = '';
  for (const item of menuFor(tree, row)) {
    if (item.sep && menu.children.length) {
      const sep = document.createElement('div');
      sep.className = 'property-tree-menu-separator';
      sep.setAttribute('role', 'separator');
      menu.append(sep);
    }
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'property-tree-menu-item';
    b.dataset.action = item.action;
    b.setAttribute('role', item.checked !== undefined ? 'menuitemradio' : 'menuitem');
    if (item.checked !== undefined) b.setAttribute('aria-checked', String(item.checked));
    b.disabled = !!item.disabled;
    b.tabIndex = -1;
    b.textContent = item.label;
    menu.append(b);
  }
  menu._pointer = row.pointer;
  const el = (anchor ??
    dfDollar(tree._pool)
      .children('.property-tree-row')
      .toArray()
      .find((r) => r._index === index)?.lastElementChild) as HTMLElement | undefined;
  if (el) {
    for (const r of dfDollar(tree._pool).find('.property-tree-actions').toArray())
      (r as HTMLElement).style.removeProperty('anchor-name');
    el.style.setProperty('anchor-name', `--${tree._uid}-menu`);
    el.setAttribute('aria-expanded', 'true');
    menu._anchor = el;
  }
  menu.style.setProperty('position-anchor', `--${tree._uid}-menu`);
  if (!menu.matches(':popover-open')) menu.showPopover();
  (dfDollar(menu).children('button:not(:disabled)').get(0) as HTMLElement | undefined)?.focus();
}

async function runAction(tree, pointer, action) {
  const index = indexOf(tree, pointer);
  const row = tree._rows[index];
  if (!row) return;
  const path = row.path;
  if (action === 'add') {
    const added = ops.add(tree, path, row.kind === 'map' ? 'key' : 'key', '');
    if (added) {
      const p = pointerOf(added);
      openEditor(tree, p, row.kind === 'object' || row.kind === 'map');
    }
  } else if (action === 'toggle') toggle(tree, pointer);
  else if (action === 'follow') reveal(tree, toPath(row.ref), true);
  else if (action === 'edit') openEditor(tree, pointer);
  else if (action === 'rename') openEditor(tree, pointer, true);
  else if (action === 'duplicate') {
    const p = ops.duplicate(tree, path);
    if (p) activate(tree, indexOf(tree, pointerOf(p)));
  } else if (action === 'up' || action === 'down') {
    const p = ops.move(tree, path, action === 'up' ? -1 : 1);
    if (p) activate(tree, indexOf(tree, pointerOf(p)));
  } else if (action.startsWith('type:')) ops.type(tree, path, action.slice(5));
  else if (action === 'remove') ops.remove(tree, path);
  else if (action === 'copy-path') await navigator.clipboard?.writeText(pointer || '/').catch(() => {});
  else if (action === 'copy-json') await navigator.clipboard?.writeText(toJson(row.value, 2)).catch(() => {});
  if (!tree._editor) tree._viewport.focus({ preventScroll: true });
}

// -- reading out -------------------------------------------------------------------

/** JSON of a value: a shared node again and a cycle become { "$ref": pointer }; Map, Set, Date, BigInt as JSON can */
function toJson(value, space?: number | string) {
  const first = firstPaths(value);
  const seen = new Set();
  const plain = (v, pointer) => {
    const kind = kindOf(v);
    if (CONTAINERS.has(kind)) {
      if (seen.has(v) || first.get(v) !== pointer) return { $ref: first.get(v) || '#' };
      seen.add(v);
    }
    switch (kind) {
      case 'array':
        return v.map((x, i) => plain(x, `${pointer}/${i}`));
      case 'set':
        return [...v].map((x, i) => plain(x, `${pointer}/${i}`));
      case 'map':
        return Object.fromEntries([...v].map(([k, x], i) => [String(k), plain(x, `${pointer}/${i}`)]));
      case 'object':
        return Object.fromEntries(
          Object.keys(v).map((k) => [k, plain(v[k], `${pointer}/${k.replace(/~/g, '~0').replace(/\//g, '~1')}`)]),
        );
      case 'bigint':
        return String(v);
      case 'date':
        return Number.isNaN(v.getTime()) ? null : v.toISOString();
      case 'regexp':
        return String(v);
      case 'typed':
        return Array.from(v);
      case 'undefined':
      case 'function':
      case 'symbol':
        return null;
      case 'error':
        return { name: v.name, message: v.message };
      default:
        return v;
    }
  };
  return JSON.stringify(plain(value, ''), null, space);
}

// -- view --------------------------------------------------------------------------

function setOpen(tree, pointers: string[]) {
  tree._writing = true;
  propertyTreeApi.setState(tree, tree.store.value.name, { expanded: pointers });
  tree._writing = false;
  refresh(tree, false);
}
function toggle(tree, pointer, open?: boolean) {
  const set = new Set<string>(configOf(tree).expanded ?? []);
  const now = open ?? !set.has(pointer);
  if (now) set.add(pointer);
  else for (const p of [...set]) if (p === pointer || p.startsWith(pointer + '/')) set.delete(p);
  setOpen(tree, [...set]);
}
/** open the way to a node, make it the active row and select it */
function reveal(tree, path: PropertyTreePath, select = false) {
  const set = new Set<string>(configOf(tree).expanded ?? []);
  for (let i = 0; i < path.length; i++) set.add(pointerOf(path.slice(0, i)));
  setOpen(tree, [...set]);
  const index = indexOf(tree, pointerOf(path));
  if (index < 0) return false;
  activate(tree, index);
  if (select) selectRow(tree, index);
  return true;
}
function selectRow(tree, index) {
  const row = tree._rows[index];
  if (!row) return;
  tree._writing = true;
  propertyTreeApi.setState(tree, tree.store.value.name, { selected: row.pointer });
  tree._writing = false;
  renderRows(tree);
}

// -- State API -------------------------------------------------------------------------

/** The markup of a state, for render() AND the live element: the node being edited. */
function applyMarkup(el, state) {
  dfDollar(el).attr(
    'data-editing',
    state.name === 'editing' && state.config?.editing != null ? String(state.config.editing) : null,
  );
}

/** UI side of setState: the view (open branches, selection) and the editor */
function triggerStateChange(tree, state, incoming) {
  tree._config = state.config ?? {};
  applyMarkup(tree, state);
  if (tree._writing || !tree._holder) return;
  if ('expanded' in (incoming ?? {}) || 'version' in (incoming ?? {})) refresh(tree, 'version' in (incoming ?? {}));
  else renderRows(tree);
  if (state.name === 'editing' && state.config?.editing != null) {
    if (tree._editor?.pointer !== state.config.editing || tree._editor?.key !== !!state.config.editingKey)
      if (!openEditor(tree, state.config.editing, !!state.config.editingKey))
        queueMicrotask(() => propertyTreeApi.setState(tree, 'default', { editing: null, editingKey: false }));
  } else if (tree._editor) cancel(tree, false);
}

/** Registry-level API; pass the tree explicitly. Unknown names throw. */
export const propertyTreeApi = componentState({
  component: 'property-tree',
  states: propertyTreeStates,
  // the config is the view: { expanded, selected, editing, editingKey, version } - each setState merges into it
  mergeConfig: true,
  apply: (tree, state, _previous, incoming) => triggerStateChange(tree, state, incoming),
  markup: (el, state) => applyMarkup(el, state),
});

df$.propertyTreeApi = propertyTreeApi;
df$.propertyTreeStates = propertyTreeStates;

// -- df$.shadcn.propertyTree: the imperative surface -------------------------------------

const resolve = (target) => (typeof target === 'string' ? dfDollar(target).get(0) : target);

/** show a value: the root opens, the undo history starts again */
function setValue(tree, value) {
  tree._holder = { value };
  tree._undo = [];
  tree._redo = [];
  tree._active = 0;
  tree._editor = null;
  const open = isContainer(value) ? [''] : [];
  tree._writing = true;
  propertyTreeApi.setState(tree, 'default', {
    expanded: open,
    selected: null,
    editing: null,
    editingKey: false,
    version: 0,
  });
  tree._writing = false;
  refresh(tree);
}

df$.propertyTree = {
  /**
   * Configure a tree. value: the structure to show and edit (edited in place). getEditorFn(path, value, ctx) returns
   * an editor - an element or { el, getValue(), validate?(), focus?(), immediate?, multiline?, ownsEnter? } - null for
   * the built-in one, false when the value does not edit. validateFn(path, value, ctx) returns a message (or false) to
   * refuse a value - a new key too (ctx.kind is 'key'). renderValue(el, value, ctx) fills a value's cell (return true).
   * urls: { dson } self-hosts the defuss-dson module.
   * @param target - the .property-tree element or its selector
   * @param options - the value and the hooks to set (merged into the current options)
   * @returns the tree, null when the target matches none
   */
  configure(target: string | HTMLElement, options: PropertyTreeOptions = {}): HTMLElement | null {
    const tree = resolve(target);
    if (!tree) return null;
    const { value, ...rest } = options;
    tree._options = { ...tree._options, ...rest };
    if ('value' in options) {
      if (!tree.store) tree._pendingValue = { value };
      else setValue(tree, value);
    } else if (tree._holder) refresh(tree);
    return tree;
  },
  /**
   * Show another value (the history of edits starts again). Edits change it in place.
   * @param target - the .property-tree element or its selector
   * @param value - any value: an object, an array, a Map ...
   */
  setValue(target: string | HTMLElement, value: unknown): void {
    const tree = resolve(target);
    if (!tree.store) tree._pendingValue = { value };
    else setValue(tree, value);
  },
  /**
   * The value the tree shows - the live structure, every edit applied.
   * @param target - the .property-tree element or its selector
   * @returns the root value
   */
  value: (target: string | HTMLElement): unknown => resolve(target)._holder?.value,
  /**
   * The value as JSON: a node that appears again (a shared node, a cycle) becomes { "$ref": "<its first pointer>" };
   * a Map becomes an object, a Set an array, a Date its ISO string, a BigInt its digits.
   * @param target - the .property-tree element or its selector
   * @param space - indentation, as JSON.stringify takes it
   * @returns the JSON text
   */
  json: (target: string | HTMLElement, space?: number | string): string =>
    toJson(resolve(target)._holder?.value, space),
  /**
   * The value as DSON (defuss-dson: Map, Set, Date, BigInt, RegExp and references kept) - loads the module first.
   * @param target - the .property-tree element or its selector
   * @returns the DSON text
   */
  async dson(target: string | HTMLElement): Promise<string> {
    const tree = resolve(target);
    const DSON = await loadDson(optionsOf(tree).urls?.dson);
    return DSON.stringify(tree._holder?.value);
  },
  /**
   * The value at a path.
   * @param target - the .property-tree element or its selector
   * @param path - a JSON Pointer ("/owner/team") or the keys and indexes
   * @returns the node there (the live one), undefined when there is none
   */
  get: (target: string | HTMLElement, path: string | PropertyTreePath): unknown =>
    locate(resolve(target), toPath(path))?.node,
  /**
   * Write a value at a path - one edit (property-tree-change, one undo step).
   * @param target - the .property-tree element or its selector
   * @param path - a JSON Pointer or the keys and indexes
   * @param value - the new value
   * @returns false when there is no such node or the edit was cancelled
   */
  set: (target: string | HTMLElement, path: string | PropertyTreePath, value: unknown): boolean =>
    ops.set(resolve(target), toPath(path), value),
  /**
   * Add a child to a container: an object or a Map gets the key (made free: "key 2"), an array the item at index (default:
   * the end), a Set the value.
   * @param target - the .property-tree element or its selector
   * @param path - the container's pointer or path
   * @param key - the new key (objects and Maps)
   * @param value - the new value (default '')
   * @param index - arrays: where it goes
   * @returns the new node's path, null when nothing was added
   */
  add: (
    target: string | HTMLElement,
    path: string | PropertyTreePath,
    key?: unknown,
    value?: unknown,
    index?: number,
  ): PropertyTreePath | null => ops.add(resolve(target), toPath(path), key, value === undefined ? '' : value, index),
  /**
   * Remove a node - one edit.
   * @param target - the .property-tree element or its selector
   * @param path - its pointer or path
   * @returns false when there is no such node (or it is the root)
   */
  remove: (target: string | HTMLElement, path: string | PropertyTreePath): boolean =>
    ops.remove(resolve(target), toPath(path)),
  /**
   * Rename an object key or a Map key - one edit, the node keeps its place.
   * @param target - the .property-tree element or its selector
   * @param path - the node's pointer or path
   * @param key - the new key
   * @returns false when it cannot be renamed (an array item, the root, the same key)
   */
  rename: (target: string | HTMLElement, path: string | PropertyTreePath, key: unknown): boolean =>
    ops.rename(resolve(target), toPath(path), key),
  /**
   * Change a node's type ('string', 'number', 'boolean', 'null', 'object', 'array', 'map', 'set', 'date', 'bigint') - the
   * value is converted where it can be (an array to an object of its indexes, a string to a number ...).
   * @param target - the .property-tree element or its selector
   * @param path - the node's pointer or path
   * @param kind - the new type
   * @returns false when it already has that type
   */
  setType: (target: string | HTMLElement, path: string | PropertyTreePath, kind: string): boolean =>
    ops.type(resolve(target), toPath(path), kind),
  /**
   * Undo the last edit.
   * @param target - the .property-tree element or its selector
   * @returns false when there is nothing to undo
   */
  undo: (target: string | HTMLElement): boolean => undoStep(resolve(target), true),
  /**
   * Redo the last undone edit.
   * @param target - the .property-tree element or its selector
   * @returns false when there is nothing to redo
   */
  redo: (target: string | HTMLElement): boolean => undoStep(resolve(target), false),
  /**
   * Open a value's editor (state 'editing') - the way to it opens first.
   * @param target - the .property-tree element or its selector
   * @param path - the node's pointer or path
   * @param key - true: rename its key instead
   * @returns false when it does not edit (a reference, a Map, a value getEditorFn refuses)
   */
  edit: (target: string | HTMLElement, path: string | PropertyTreePath, key: boolean = false): boolean =>
    openEditor(resolve(target), pointerOf(toPath(path)), key),
  /**
   * Commit the open editor.
   * @param target - the .property-tree element or its selector
   * @returns false when its value is refused (the editor stays open with the message); true otherwise
   */
  commit: (target: string | HTMLElement): boolean => commit(resolve(target)),
  /**
   * Close the open editor without writing.
   * @param target - the .property-tree element or its selector
   */
  cancel: (target: string | HTMLElement): void => cancel(resolve(target)),
  /**
   * Open the way to a node, make it the active row and select it.
   * @param target - the .property-tree element or its selector
   * @param path - the node's pointer or path
   * @returns false when there is no such node
   */
  reveal: (target: string | HTMLElement, path: string | PropertyTreePath): boolean =>
    reveal(resolve(target), toPath(path), true),
  /**
   * Open every container down to a depth (default: all of them - mind a large value).
   * @param target - the .property-tree element or its selector
   * @param depth - how many levels below the root open
   */
  expandAll(target: string | HTMLElement, depth: number = Infinity): void {
    const tree = resolve(target);
    const out: string[] = [];
    const first = tree._first;
    const walk = (v, path) => {
      const pointer = pointerOf(path);
      if (!isContainer(v) || first.get(v) !== pointer || path.length > depth - 1) return;
      out.push(pointer);
      for (const [t, , x] of entries(v)) walk(x, [...path, t]);
    };
    walk(tree._holder.value, []);
    setOpen(tree, out);
  },
  /**
   * Close every container but the root.
   * @param target - the .property-tree element or its selector
   */
  collapseAll(target: string | HTMLElement): void {
    setOpen(resolve(target), ['']);
  },
};

// -- init --------------------------------------------------------------------------

let uid = 0;

function onKeydown(tree, e) {
  if (e.target.closest?.('.property-tree-editor, .property-tree-menu')) return;
  const index = tree._active ?? 0;
  const row = tree._rows?.[index];
  if (!row) return;
  const page = Math.max(1, Math.floor(tree._viewport.clientHeight / tree._rowHeight) - 1);
  const mod = e.ctrlKey || e.metaKey;
  if (mod && (e.key === 'z' || e.key === 'Z')) {
    e.preventDefault();
    undoStep(tree, !e.shiftKey);
    return;
  }
  if (mod && (e.key === 'y' || e.key === 'Y')) {
    e.preventDefault();
    undoStep(tree, false);
    return;
  }
  switch (e.key) {
    case 'ArrowDown':
      if (e.altKey) {
        const p = ops.move(tree, row.path, 1);
        if (p) activate(tree, indexOf(tree, pointerOf(p)));
      } else activate(tree, index + 1);
      break;
    case 'ArrowUp':
      if (e.altKey) {
        const p = ops.move(tree, row.path, -1);
        if (p) activate(tree, indexOf(tree, pointerOf(p)));
      } else activate(tree, index - 1);
      break;
    case 'ArrowRight':
      if (row.container && !row.open) toggle(tree, row.pointer, true);
      else if (row.container) activate(tree, index + 1);
      break;
    case 'ArrowLeft':
      if (row.container && row.open) toggle(tree, row.pointer, false);
      else if (row.path.length) {
        const parent = indexOf(tree, pointerOf(row.path.slice(0, -1)));
        if (parent >= 0) activate(tree, parent);
      }
      break;
    case 'Home':
      activate(tree, 0);
      break;
    case 'End':
      activate(tree, tree._rows.length - 1);
      break;
    case 'PageDown':
      activate(tree, index + page);
      break;
    case 'PageUp':
      activate(tree, index - page);
      break;
    case ' ':
      selectRow(tree, index);
      break;
    case 'Enter':
      if (row.isRef) reveal(tree, toPath(row.ref), true);
      else if (row.container && !mod && !e.shiftKey) toggle(tree, row.pointer);
      else if (mod && row.container) runAction(tree, row.pointer, 'add');
      else openEditor(tree, row.pointer, e.shiftKey);
      break;
    case 'F2':
      if (!openEditor(tree, row.pointer, e.shiftKey)) return;
      break;
    case 'Insert':
      runAction(tree, row.container ? row.pointer : pointerOf(row.path.slice(0, -1)), 'add');
      break;
    case 'Delete':
      ops.remove(tree, row.path);
      break;
    case 'Backspace':
      if (!mod) return;
      ops.remove(tree, row.path);
      break;
    case 'd':
    case 'D':
      if (!mod) return;
      runAction(tree, row.pointer, 'duplicate');
      break;
    case 'ContextMenu':
      openMenu(tree, index);
      break;
    case 'F10':
      if (!e.shiftKey) return;
      openMenu(tree, index);
      break;
    default:
      return;
  }
  e.preventDefault();
}

function onMenuKey(tree, e) {
  const items = dfDollar(tree._menu).children('button:not(:disabled)').toArray() as HTMLElement[];
  const at = items.indexOf(document.activeElement as HTMLElement);
  const go = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: items.length - 1 }[e.key];
  if (go !== undefined) {
    e.preventDefault();
    items[(go + items.length) % items.length]?.focus();
  } else if (e.key === 'Escape' || e.key === 'Tab') {
    e.preventDefault();
    tree._menu.hidePopover();
    tree._viewport.focus({ preventScroll: true });
  }
}

function init() {
  dfDollar('.property-tree:not([data-init])')
    .toArray()
    .forEach((tree) => {
      tree.dataset.init = '';
      tree._uid = tree.id || `property-tree-${++uid}`;
      const viewport = document.createElement('div');
      viewport.className = 'property-tree-viewport';
      viewport.setAttribute('role', 'tree');
      viewport.tabIndex = 0;
      viewport.setAttribute('aria-label', tree.getAttribute('aria-label') || 'Value');
      if (tree.hasAttribute('data-readonly')) viewport.setAttribute('aria-readonly', 'true');
      const sizer = document.createElement('div');
      sizer.className = 'property-tree-sizer';
      const pool = document.createElement('div');
      pool.className = 'property-tree-rows';
      pool.setAttribute('role', 'presentation');
      sizer.append(pool);
      viewport.append(sizer);
      const menu = document.createElement('div');
      menu.className = 'property-tree-menu';
      menu.setAttribute('popover', '');
      menu.setAttribute('role', 'menu');
      menu.setAttribute('aria-label', 'Node actions');
      dfDollar(tree).append(viewport).append(menu);
      tree._viewport = viewport;
      tree._sizer = sizer;
      tree._pool = pool;
      tree._menu = menu;
      tree._rowHeight = parseFloat(getComputedStyle(tree).getPropertyValue('--property-tree-row-height')) || 28;
      tree._undo = [];
      tree._redo = [];

      let queued = false;
      viewport.addEventListener(
        'scroll',
        () => {
          if (queued) return;
          queued = true;
          requestAnimationFrame(() => {
            queued = false;
            renderRows(tree);
          });
        },
        { passive: true },
      );
      new ResizeObserver(() => renderRows(tree)).observe(viewport);
      viewport.addEventListener('keydown', (e) => onKeydown(tree, e));
      viewport.addEventListener('click', (e) => {
        const t = e.target as HTMLElement;
        const el = t.closest?.<HTMLElement & { _index?: number; _row?: any }>('.property-tree-row');
        if (!el || !pool.contains(el)) return;
        tree._active = el._index;
        if (t.closest('.property-tree-actions')) return openMenu(tree, el._index, t.closest('.property-tree-actions'));
        if (t.closest('.property-tree-ref')) return reveal(tree, toPath(el._row.ref), true);
        if (t.closest('.property-tree-toggle') && el._row.container) return toggle(tree, el._row.pointer);
        selectRow(tree, el._index);
      });
      viewport.addEventListener('dblclick', (e) => {
        const t = e.target as HTMLElement;
        const el = t.closest?.<HTMLElement & { _row?: any }>('.property-tree-row');
        if (!el || !pool.contains(el) || t.closest('.property-tree-toggle, .property-tree-actions')) return;
        const onKey = !!t.closest('.property-tree-key');
        if (openEditor(tree, el._row.pointer, onKey && el._row.key !== null)) e.preventDefault();
        else if (el._row.container) toggle(tree, el._row.pointer);
      });
      menu.addEventListener('click', (e) => {
        const b = (e.target as HTMLElement).closest?.<HTMLButtonElement>('.property-tree-menu-item');
        if (!b || b.disabled) return;
        menu.hidePopover();
        runAction(tree, menu._pointer, b.dataset.action);
      });
      menu.addEventListener('keydown', (e) => onMenuKey(tree, e));
      menu.addEventListener('toggle', (e) => {
        if ((e as ToggleEvent).newState === 'closed') menu._anchor?.setAttribute('aria-expanded', 'false');
      });

      // the value: configure() before init, else the authored source (JSON, or DSON - loaded first)
      const script = dfDollar(tree).children('script.property-tree-source').get(0);
      const config = { expanded: [], selected: null, editing: null, editingKey: false, version: 0 };
      bindComponent(tree, propertyTreeApi, { name: 'default', config });
      if (tree._pendingValue) {
        setValue(tree, tree._pendingValue.value);
        delete tree._pendingValue;
      } else if (script && (script as HTMLScriptElement).type === 'application/dson') {
        tree.dataset.loading = '';
        setValue(tree, undefined);
        loadDson(optionsOf(tree).urls?.dson)
          .then((DSON) => {
            if (tree._holder.value === undefined) setValue(tree, DSON.parse(script.textContent || 'null'));
          })
          .catch((error) => console.error('[property-tree] DSON source', error))
          .finally(() => delete tree.dataset.loading);
      } else {
        let value: unknown = {};
        try {
          if (script) value = JSON.parse(script.textContent || 'null');
        } catch (error) {
          console.error('[property-tree] invalid source JSON', error);
        }
        setValue(tree, value);
      }
    });
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
