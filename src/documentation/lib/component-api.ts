/**
 * Why: a JS component's API is what its source exposes - the State API every
 * component gets from componentState()/bindComponent(), its own namespace
 * (`df$.shadcn.<name>` - setSource, query, show …), extra registry methods,
 * an instance interface (cookie-consent's el.api) and the events it
 * dispatches. This reads all of it from the .ts so the docs can be generated
 * from the source and verify can prove they agree (AGENTS.md "API section").
 * Pure: source text in, data out (+ the markdown the skills carry).
 *
 * Descriptions come from the source: the JSDoc above a member (or above the
 * function a member refers to), and the comment directly above the line
 * that creates an event (`new CustomEvent('name', …)`).
 *
 * Types come from the source too: each argument's annotation and its
 * @param, the return type and @returns, an event's CustomEvent<Detail> and
 * the fields of every type the API names - apiGaps() lists what is missing.
 * VERIFIED: (tests/component-api.test.ts) signatures, @param / @returns,
 * typed details, declared types and the gaps are read as pinned there.
 */

/** One argument of a member: its name, TypeScript type and @param description. */
export interface ApiArg {
  /** the parameter as written without its type ("target", "{ base = {}, states }", "...rest") */
  name: string;
  /** its TypeScript annotation, '' when the source has none */
  type: string;
  optional: boolean;
  /** the default value as written, '' when none */
  default: string;
  /** the @param description at this position, '' when missing */
  doc: string;
}
/** One field of an event detail or of a declared type. */
export interface ApiField {
  name: string;
  type: string;
  optional: boolean;
  doc: string;
}
export interface ApiMember {
  name: string;
  /** the parameter list as written ("(target, rows, options = {})"), '' for a value */
  params: string;
  /** 'method' | 'value' */
  kind: 'method' | 'value';
  doc: string;
  /** the arguments, typed + described (methods) */
  args: ApiArg[];
  /** a method's return type and @returns text; a value's type (doc '') */
  returns: { type: string; doc: string };
  /** a type-body property's type as written - its fields' doc comments kept (a state's config) */
  rawType?: string;
}
export interface ApiEvent {
  name: string;
  /** top-level keys of the event's detail object (or the identifier it is) */
  detail: string[];
  doc: string;
  /** the detail's type: the CustomEvent<T> argument as written, '' when untyped */
  type: string;
  /** the fields of that type (an inline literal, or an interface / type alias in the file) */
  fields: ApiField[];
}
/** A type the API names (in a signature or an event) that the component declares. */
export interface ApiType {
  name: string;
  doc: string;
  /** its fields when it is an object type; [] for another alias */
  fields: ApiField[];
  /** the right-hand side of a non-object type alias ("'json' | 'csv'"), '' otherwise */
  alias: string;
}
export interface ApiNamespace {
  /** the key under df$.shadcn ("dataGrid", "toast", "win") */
  name: string;
  members: ApiMember[];
  /** the namespace is itself a function (chartStory) */
  callable?: ApiMember;
}
export interface ComponentApiDoc {
  component: string;
  camel: string;
  states: string[];
  namespaces: ApiNamespace[];
  /** methods merged onto the registry Api (Object.assign(componentState(…), { … })) */
  registryExtras: ApiMember[];
  /** el.api is an instance (cookie-consent's controller): its interface */
  instance: { name: string; members: ApiMember[] } | null;
  events: ApiEvent[];
  /** the types the members and events name that the component declares, alphabetical */
  types: ApiType[];
  /** the State API's type names: `OtpInput` → OtpInputState (the state union) and OtpInputStateConfigs */
  pascal: string;
  /** each state: its description and its config's fields - from `interface <Pascal>StateConfigs`; null when the component declares none */
  stateConfigs: ApiStateConfig[] | null;
  /** the State API every element has and the registry - specialized to this component's states (empty without the shared source) */
  stateApi: { element: ApiMember[]; registry: ApiMember[] };
  /** the source without comments and type declarations - where a config field must be named */
  codeOutsideConfigs?: string;
}

/** the source without comments, interface bodies and object type aliases: the code that runs */
function runningCode(src: string): string {
  let out = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
  for (;;) {
    const m = /(^|\n)\s*(export\s+)?(interface\s+\w+[^{]*|type\s+\w+[^=]*=\s*)\{/.exec(out);
    if (!m) return out;
    const open = m.index + m[0].length - 1;
    const close = matchBracket(out, open);
    if (close < 0) return out;
    out = out.slice(0, m.index) + out.slice(close + 1);
  }
}

/** One state of a component: what it means, and the config setState() takes for it. */
export interface ApiStateConfig {
  name: string;
  doc: string;
  /** the config type as written (`{ value?: string }`, `{}`) */
  type: string;
  fields: ApiField[];
}

/**
 * The shared State API (src/shared/component-state.ts): `ElementStateApi`
 * (el.api) and `ComponentApi` (the registry), as documented there - one
 * description for every component.
 */
export function sharedStateApi(sharedSrc: string): { element: ApiMember[]; registry: ApiMember[] } {
  const body = (name: string): string => {
    const m = new RegExp(`(^|\\n)\\s*export\\s+interface\\s+${name}\\b[^{]*\\{`).exec(sharedSrc);
    if (!m) return '';
    const open = m.index + m[0].length - 1;
    return sharedSrc.slice(open + 1, matchBracket(sharedSrc, open));
  };
  return { element: typeMembers(body('ElementStateApi')), registry: typeMembers(body('ComponentApi')) };
}

/** the shared members with this component's state union and config map in place of string / Record */
function specialize(members: ApiMember[], pascal: string): ApiMember[] {
  const S = `${pascal}State`;
  const C = `${pascal}StateConfigs`;
  const stateOf = `{ name: ${S}; config: ${C}[${S}] }`;
  const swap = (t: string): string =>
    t.replace(/ComponentState & \{ model\?: ElementModel \}/g, `{ name: ${S}; config: ${C}[${S}]; model?: ElementModel }`)
      .replace(/Store<ComponentState>/g, `Store<${stateOf}>`)
      .replace(/\bE\b/g, 'HTMLElement');
  return members.map((m) => {
    const named = m.args.some((a) => a.name === 'name');
    const args = m.args.map((a) => ({
      ...a,
      type: a.name === 'name' ? 'S' : a.name === 'config' ? `${C}[S]` : swap(a.type),
    }));
    return { ...m, name: named ? `${m.name}<S extends ${S}>` : m.name, args, returns: { ...m.returns, type: swap(m.returns.type) } };
  });
}



export const camelOf = (name: string): string => name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

// -- a tiny scanner: skip strings, templates, comments, regex literals -------------------

/** index of the bracket that closes the one at `open` ({, ( or [) */
export function matchBracket(src: string, open: number): number {
  const pairs: Record<string, string> = { '{': '}', '(': ')', '[': ']' };
  const stack: string[] = [];
  let prev = '';
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (ch === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); if (i < 0) return -1; continue; }
    if (ch === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i + 2) + 1; if (i <= 0) return -1; continue; }
    if (ch === "'" || ch === '"') {
      for (i++; i < src.length && src[i] !== ch; i++) if (src[i] === '\\') i++;
      prev = ch;
      continue;
    }
    if (ch === '`') {
      i = skipTemplate(src, i);
      prev = '`';
      continue;
    }
    if (ch === '/' && /[(,=:[!&|?{};+\-*%<>~^]|^$/.test(prev)) {
      // a regex literal
      let inClass = false;
      for (i++; i < src.length; i++) {
        if (src[i] === '\\') { i++; continue; }
        if (src[i] === '[') inClass = true;
        else if (src[i] === ']') inClass = false;
        else if (src[i] === '/' && !inClass) break;
      }
      prev = '/';
      continue;
    }
    if (pairs[ch]) stack.push(pairs[ch]);
    else if (ch === '}' || ch === ')' || ch === ']') {
      if (stack.pop() !== ch) return -1;
      if (!stack.length) return i;
    }
    if (!/\s/.test(ch)) prev = ch;
  }
  return -1;
}
function skipTemplate(src: string, start: number): number {
  for (let i = start + 1; i < src.length; i++) {
    if (src[i] === '\\') { i++; continue; }
    if (src[i] === '`') return i;
    if (src[i] === '$' && src[i + 1] === '{') {
      const end = matchBracket(src, i + 1);
      if (end < 0) return src.length;
      i = end;
    }
  }
  return src.length;
}

/** split an object literal's body into its top-level entries (each with leading comments) */
function entriesOf(body: string): string[] {
  const out: string[] = [];
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '/' && body[i + 1] === '/') { i = body.indexOf('\n', i); if (i < 0) break; continue; }
    if (ch === '/' && body[i + 1] === '*') { i = body.indexOf('*/', i + 2) + 1; continue; }
    if (ch === "'" || ch === '"') { for (i++; i < body.length && body[i] !== ch; i++) if (body[i] === '\\') i++; continue; }
    if (ch === '`') { i = skipTemplate(body, i); continue; }
    // a bracketed group is skipped whole: a comma inside is not an entry's end
    if (ch === '{' || ch === '(' || ch === '[') {
      const end = matchBracket(body, i);
      if (end > 0) { i = end; continue; }
    }
    // so is a generic's argument list in a type annotation (Record<K, V>)
    if (ch === '<' && /[\w$]/.test(body[i - 1] ?? '') && /[\w${([' "]/.test(body[i + 1] ?? '')) {
      let depth = 1;
      let j = i + 1;
      for (; j < body.length && depth; j++) {
        // a type literal / tuple / function type inside the generic is one unit
        if (body[j] === '{' || body[j] === '(' || body[j] === '[') { const end = matchBracket(body, j); if (end < 0) break; j = end; continue; }
        if (body[j] === '<') depth++;
        else if (body[j] === '>' && body[j - 1] !== '=') depth--;
        else if (body[j] === ';' || body[j] === '\n') break; // a comparison, not a generic
      }
      if (!depth) { i = j - 1; continue; }
    }
    if (ch === ',') {
      out.push(body.slice(start, i));
      start = i + 1;
    }
  }
  if (body.slice(start).trim()) out.push(body.slice(start));
  return out;
}

/** a JSDoc block as one line of prose (tags dropped) */
export function cleanDoc(raw: string): string {
  return raw
    .replace(/^\/\*\*?|\*\/$/g, '')
    .split('\n')
    .map((l) => l.replace(/^\s*\*\s?/, '').trim())
    .filter((l) => !l.startsWith('@'))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** the JSDoc (or // lines) directly above position `at` in `src`, as prose */
function docAbove(src: string, at: number): string {
  return parseDoc(docAboveRaw(src, at)).text;
}

/** the JSDoc block (or // lines) directly above position `at`, raw - tags kept */
function docAboveRaw(src: string, at: number): string {
  const before = src.slice(0, at).replace(/[ \t]*$/, '');
  const lines = before.split('\n');
  // drop the (possibly partial) line holding `at`
  lines.pop();
  // modifiers on the line itself ("export", "async") are fine
  const tail = [];
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i].trim();
    if (l.endsWith('*/')) {
      const block = [];
      for (; i >= 0; i--) {
        block.unshift(lines[i]);
        if (lines[i].trim().startsWith('/*')) break;
      }
      return block.join('\n');
    }
    if (l.startsWith('//')) { tail.unshift(l); continue; }
    break;
  }
  return tail.join('\n');
}

/** an entry's leading JSDoc / comment (prose, and raw with its tags) and the rest */
function splitLeading(entry: string): { doc: string; raw: string; code: string } {
  let code = entry;
  let raw = '';
  for (;;) {
    const t = code.trimStart();
    if (t.startsWith('/*')) {
      const end = t.indexOf('*/');
      raw = t.slice(0, end + 2);
      code = t.slice(end + 2);
    } else if (t.startsWith('//')) {
      const nl = t.indexOf('\n');
      const line = t.slice(0, nl < 0 ? undefined : nl);
      raw = raw && !raw.trimEnd().endsWith('*/') ? `${raw}\n${line}` : line;
      code = nl < 0 ? '' : t.slice(nl + 1);
    } else return { doc: parseDoc(raw).text, raw, code: t };
  }
}

/**
 * "(root: HTMLElement, { base = {}, states }: { base?: Option }, n?: number)"
 * → "(root, { base = {}, states }, n?)" - per parameter, the top-level type
 * annotation goes (types are noise in a table), patterns and defaults stay.
 */
function stripTypes(params: string): string {
  const inner = params.trim().replace(/^\(|\)$/g, '');
  const parts: string[] = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i <= inner.length; i++) {
    const ch = inner[i];
    if (ch === "'" || ch === '"' || ch === '`') { const q = ch; for (i++; i < inner.length && inner[i] !== q; i++) if (inner[i] === '\\') i++; continue; }
    if (ch === '(' || ch === '[' || ch === '{' || (ch === '<' && depth >= 0 && /\w/.test(inner[i - 1] ?? ''))) depth++;
    else if (ch === ')' || ch === ']' || ch === '}' || (ch === '>' && inner[i - 1] !== '=' && depth > 0)) depth--;
    if ((ch === ',' && depth === 0) || i === inner.length) {
      parts.push(inner.slice(from, i));
      from = i + 1;
    }
  }
  const one = (p: string): string => {
    let d = 0;
    for (let i = 0; i < p.length; i++) {
      const ch = p[i];
      if (ch === '(' || ch === '[' || ch === '{') d++;
      else if (ch === ')' || ch === ']' || ch === '}') d--;
      else if (ch === ':' && d === 0) {
        // the type runs to a top-level default (=), else to the end
        let e = i + 1;
        let td = 0;
        for (; e < p.length; e++) {
          const c = p[e];
          if (c === '(' || c === '[' || c === '{' || c === '<') td++;
          else if (c === ')' || c === ']' || c === '}' || (c === '>' && p[e - 1] !== '=')) td--;
          else if (c === '=' && td === 0 && p[e + 1] !== '>') break;
        }
        return (p.slice(0, i) + (e < p.length ? ' ' + p.slice(e) : '')).replace(/\s+/g, ' ').trim();
      }
    }
    return p.replace(/\s+/g, ' ').trim();
  };
  return `(${parts.map(one).filter(Boolean).join(', ')})`;
}

/**
 * Split a list at its top-level separators - not inside (), [], {}, a
 * generic's <> or a string; `=>` never closes a <>.
 */
export function splitTop(list: string, seps = ','): string[] {
  const parts: string[] = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < list.length; i++) {
    const ch = list[i];
    if (ch === "'" || ch === '"' || ch === '`') { for (i++; i < list.length && list[i] !== ch; i++) if (list[i] === '\\') i++; continue; }
    if (ch === '/' && list[i + 1] === '*') { i = list.indexOf('*/', i + 2) + 1; if (i <= 0) break; continue; }
    if (ch === '/' && list[i + 1] === '/') { const nl = list.indexOf('\n', i); if (nl < 0) break; i = nl - 1; continue; }
    if (ch === '(' || ch === '[' || ch === '{' || (ch === '<' && /[\w$\s]/.test(list[i - 1] ?? ''))) depth++;
    else if (ch === ')' || ch === ']' || ch === '}' || (ch === '>' && list[i - 1] !== '=' && depth > 0)) depth--;
    else if (depth === 0 && seps.includes(ch)) {
      parts.push(list.slice(from, i));
      from = i + 1;
    }
  }
  parts.push(list.slice(from));
  return parts.filter((p) => p.trim());
}

/** the index of the top-level `ch` in `s` (outside brackets and strings), -1 when none; `=` never matches `=>` */
function topIndex(s: string, ch: string): number {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "'" || c === '"' || c === '`') { for (i++; i < s.length && s[i] !== c; i++) if (s[i] === '\\') i++; continue; }
    if (c === '(' || c === '[' || c === '{' || (c === '<' && /[\w$\s]/.test(s[i - 1] ?? ''))) depth++;
    else if (c === ')' || c === ']' || c === '}' || (c === '>' && s[i - 1] !== '=' && depth > 0)) depth--;
    else if (depth === 0 && c === ch && !(ch === '=' && (s[i + 1] === '>' || s[i + 1] === '=' || s[i - 1] === '!' || s[i - 1] === '<' || s[i - 1] === '>'))) return i;
  }
  return -1;
}

/**
 * A JSDoc block (or // lines) read with its tags: the prose, every `@param`
 * in order (`@param name - text`, `@param {T} name text`, continued on the
 * following lines) and the `@returns` text.
 */
export function parseDoc(raw: string): { text: string; params: { name: string; doc: string }[]; returns: string } {
  const lines = raw
    .replace(/^\s*\/\*\*?|\*\/\s*$/g, '')
    .split('\n')
    .map((l) => l.replace(/^\s*(\*|\/\/)\s?/, '').trim());
  const text: string[] = [];
  const params: { name: string; doc: string }[] = [];
  let returns = '';
  let into: 'text' | 'param' | 'returns' | 'other' = 'text';
  for (const l of lines) {
    const param = /^@param\s+(?:\{[^}]*\}\s+)?(\[[^\]]*\]|[^\s]+)\s*(?:-\s*)?(.*)$/.exec(l);
    if (param) { params.push({ name: param[1].replace(/^\[|\]$/g, '').replace(/=.*$/, ''), doc: param[2] }); into = 'param'; continue; }
    const ret = /^@returns?\s+(?:\{[^}]*\}\s*)?(?:-\s*)?(.*)$/.exec(l);
    if (ret) { returns = ret[1]; into = 'returns'; continue; }
    if (l.startsWith('@')) { into = 'other'; continue; }
    if (into === 'text') text.push(l);
    else if (into === 'param' && l) params[params.length - 1].doc += ` ${l}`;
    else if (into === 'returns' && l) returns += ` ${l}`;
  }
  const tidy = (s: string) => s.replace(/\s+/g, ' ').trim();
  return { text: tidy(text.join(' ')), params: params.map((p) => ({ name: p.name, doc: tidy(p.doc) })), returns: tidy(returns) };
}

/** "(target: Element, rows?: Row[], { idField = 'id' }: Opts = {})" → the typed arguments (docs empty) */
export function parseArgs(params: string): ApiArg[] {
  const inner = params.trim().replace(/^\(/, '').replace(/\)$/, '');
  return splitTop(inner).map((raw) => {
    const p = raw.replace(/\/\*[\s\S]*?\*\//g, '').trim();
    const colon = topIndex(p, ':');
    let left = colon < 0 ? p : p.slice(0, colon);
    let right = colon < 0 ? '' : p.slice(colon + 1);
    let def = '';
    const eqR = topIndex(right, '=');
    if (eqR >= 0) { def = right.slice(eqR + 1).trim(); right = right.slice(0, eqR); }
    const eqL = topIndex(left, '=');
    if (eqL >= 0) { def = left.slice(eqL + 1).trim(); left = left.slice(0, eqL); }
    left = left.trim();
    const optional = left.endsWith('?') || def !== '';
    return { name: left.replace(/\?$/, '').replace(/\s+/g, ' '), type: right.replace(/\s+/g, ' ').trim(), optional, default: def.replace(/\s+/g, ' '), doc: '' };
  });
}

/**
 * The return type written after a parameter list (the `)` at `close`):
 * `): T {`, `): T =>`, `): T;` - '' when there is none. A `{` ends the type
 * unless the type still expects one (`): { a: T }`, `): A | {`).
 */
export function returnTypeAfter(src: string, close: number): string {
  let i = close + 1;
  while (/\s/.test(src[i] ?? '')) i++;
  if (src[i] !== ':') return '';
  let depth = 0;
  let text = '';
  for (i++; i < src.length; i++) {
    const ch = src[i];
    if (depth === 0) {
      if (ch === '=' && src[i + 1] === '>') break;
      if (ch === ';' || ch === ',' || (ch === '\n' && text.trim() && !/[|&,<(:]$/.test(text.trim()))) break;
      if (ch === '{' && text.trim() && !/[|&,<(:]$/.test(text.trim())) break;
    }
    if (ch === '(' || ch === '[' || ch === '{' || (ch === '<' && /[\w$\s]/.test(src[i - 1] ?? ''))) depth++;
    else if (ch === ')' || ch === ']' || ch === '}' || (ch === '>' && src[i - 1] !== '=' && depth > 0)) depth--;
    if (depth < 0) break;
    text += ch;
  }
  return text.replace(/\s+/g, ' ').trim();
}

/** the type a literal initializer has ("'x'" → string), '' when it is not a plain literal */
function literalType(init: string): string {
  const v = init.trim().replace(/;$/, '').trim();
  if (/^(['"`])[\s\S]*\1$/.test(v)) return 'string';
  if (/^-?\d[\d_]*(\.\d+)?(e-?\d+)?$/i.test(v)) return 'number';
  if (v === 'true' || v === 'false') return 'boolean';
  return '';
}

/** one member: its arguments typed + described from the raw JSDoc above it */
function withDocs(name: string, kind: 'method' | 'value', params: string, rawDoc: string, returnType: string): ApiMember {
  const doc = parseDoc(rawDoc);
  const args = kind === 'method' ? parseArgs(params) : [];
  args.forEach((a, i) => (a.doc = doc.params[i]?.doc ?? ''));
  return { name, params: kind === 'method' ? stripTypes(params) : '', kind, doc: doc.text, args, returns: { type: returnType, doc: doc.returns } };
}

/** A top-level declaration the API refers to: its kind, raw parameters, raw JSDoc and type. */
type Declaration = { kind: 'function' | 'object' | 'value'; params: string; raw: string; returns: string; body?: string };

/** where a top-level identifier is declared: a function, an arrow const, an object const, a value */
function declarationOf(src: string, id: string): Declaration | null {
  const fn = new RegExp(`(^|\\n)\\s*(export\\s+)?(async\\s+)?function\\s+${id}\\s*(<[^>]*>)?\\s*\\(`).exec(src);
  if (fn) {
    const open = src.indexOf('(', fn.index + fn[0].length - 1);
    const close = matchBracket(src, open);
    return { kind: 'function', params: src.slice(open, close + 1), raw: docAboveRaw(src, fn.index + fn[1].length), returns: returnTypeAfter(src, close) };
  }
  const arrow = new RegExp(`(^|\\n)\\s*(export\\s+)?const\\s+${id}\\s*(:[^=]+)?=\\s*(async\\s*)?\\(`).exec(src);
  if (arrow) {
    const open = src.indexOf('(', arrow.index + arrow[0].length - 1);
    const close = matchBracket(src, open);
    const rest = src.slice(close + 1, close + 200);
    if (/^\s*(:[^=]+)?=>/.test(rest)) return { kind: 'function', params: src.slice(open, close + 1), raw: docAboveRaw(src, arrow.index + arrow[1].length), returns: returnTypeAfter(src, close) };
  }
  const obj = new RegExp(`(^|\\n)\\s*(export\\s+)?const\\s+${id}\\s*(:[^=]+)?=\\s*\\{`).exec(src);
  if (obj) {
    const open = obj.index + obj[0].length - 1;
    const close = matchBracket(src, open);
    return { kind: 'object', params: '', raw: docAboveRaw(src, obj.index + obj[1].length), returns: (obj[3] ?? '').replace(/^:/, '').trim(), body: src.slice(open + 1, close) };
  }
  const value = new RegExp(`(^|\\n)\\s*(export\\s+)?(const|let)\\s+${id}\\s*(:([^=]+))?=\\s*([^\\n]*)`).exec(src);
  if (value) return { kind: 'value', params: '', raw: docAboveRaw(src, value.index + value[1].length), returns: (value[5] ?? '').trim() || literalType(value[6]) };
  return null;
}

/** a member's raw JSDoc merged with the raw JSDoc of the declaration it names: prose from the member, tags from whichever has them */
const mergeRaw = (own: string, decl: string): string => (!own ? decl : !decl || /@(param|returns?)\b/.test(own) ? own : `${own}\n${decl.split('\n').filter((l) => /@(param|returns?)\b|^\s*\*?\s{2,}/.test(l)).join('\n')}`);

/** the type a member value expression carries: `x as T`, a literal, a declaration it names */
function valueType(src: string, value: string): string {
  const as = /\sas\s+([^;]+)$/.exec(value);
  if (as) return as[1].replace(/\s+/g, ' ').trim();
  const lit = literalType(value);
  if (lit) return lit;
  const ref = /^([A-Za-z_$][\w$]*)\s*$/.exec(value);
  return ref ? declarationOf(src, ref[1])?.returns ?? '' : '';
}

/** the members of an object literal body */
function membersOf(src: string, body: string): ApiMember[] {
  const out: ApiMember[] = [];
  for (const entry of entriesOf(body)) {
    const { raw, code } = splitLeading(entry);
    if (!code.trim() || code.startsWith('...')) continue;
    // name(params) {   |   async name(params) {   |   get name() {
    let m = /^(async\s+)?(get\s+|set\s+)?([A-Za-z_$][\w$]*)\s*(<[^>]*>)?\s*\(/.exec(code);
    if (m) {
      const open = code.indexOf('(', m[0].length - 1);
      const close = matchBracket(code, open);
      const getter = m[2]?.trim() === 'get';
      out.push(withDocs(m[3], getter ? 'value' : 'method', code.slice(open, close + 1), raw, returnTypeAfter(code, close)));
      continue;
    }
    // name: <value>
    m = /^([A-Za-z_$][\w$]*)\s*:\s*/.exec(code);
    if (m) {
      const value = code.slice(m[0].length).trim();
      const arrow = /^(async\s*)?\(/.exec(value);
      if (arrow) {
        const open = value.indexOf('(');
        const close = matchBracket(value, open);
        if (/^\s*(:[^=]+)?=>/.test(value.slice(close + 1, close + 200))) {
          out.push(withDocs(m[1], 'method', value.slice(open, close + 1), raw, returnTypeAfter(value, close)));
          continue;
        }
      }
      const single = /^(async\s+)?([A-Za-z_$][\w$]*)\s*=>/.exec(value);
      if (single) { out.push(withDocs(m[1], 'method', `(${single[2]})`, raw, '')); continue; }
      const fnExpr = /^(async\s+)?function\s*[\w$]*\s*\(/.exec(value);
      if (fnExpr) {
        const open = value.indexOf('(');
        const close = matchBracket(value, open);
        out.push(withDocs(m[1], 'method', value.slice(open, close + 1), raw, returnTypeAfter(value, close)));
        continue;
      }
      const ref = /^([A-Za-z_$][\w$]*)\s*$/.exec(value);
      const decl = ref ? declarationOf(src, ref[1]) : null;
      if (decl?.kind === 'function') { out.push(withDocs(m[1], 'method', decl.params, mergeRaw(raw, decl.raw), decl.returns)); continue; }
      out.push(withDocs(m[1], 'value', '', raw || decl?.raw || '', valueType(src, value)));
      continue;
    }
    // shorthand: name
    m = /^([A-Za-z_$][\w$]*)\s*$/.exec(code);
    if (m) {
      const decl = declarationOf(src, m[1]);
      out.push(decl?.kind === 'function'
        ? withDocs(m[1], 'method', decl.params, mergeRaw(raw, decl.raw), decl.returns)
        : withDocs(m[1], 'value', '', raw || decl?.raw || '', decl?.returns ?? ''));
    }
  }
  return out;
}

/** the members of a type literal / interface body: `/** doc *\/ name?: T;` and `name(a: T): R;` */
function typeMembers(body: string): ApiMember[] {
  const out: ApiMember[] = [];
  for (const entry of typeEntries(body)) {
    const { raw, code } = splitLeading(entry);
    const c = code.trim();
    if (!c) continue;
    const method = /^([A-Za-z_$][\w$]*)\??\s*\(/.exec(c);
    if (method) {
      const open = c.indexOf('(');
      const close = matchBracket(c, open);
      out.push(withDocs(method[1], 'method', c.slice(open, close + 1), raw, returnTypeAfter(c, close)));
      continue;
    }
    // a key may be quoted ('all-open': {} - a state name with a dash)
    const prop = /^(readonly\s+)?(?:(['"])([\w$-]+)\2|([A-Za-z_$][\w$]*))\??\s*:\s*([\s\S]+)$/.exec(c);
    if (!prop) continue;
    const name = prop[3] ?? prop[4];
    // the type as shown: without its fields' doc comments (those become the field table)
    const type = prop[5].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();
    // a property typed as a function (`setState: (name: string) => void`) is a method: its arguments are documented
    const fnClose = type.startsWith('(') ? matchBracket(type, 0) : -1;
    if (fnClose > 0 && /^\s*=>/.test(type.slice(fnClose + 1))) {
      out.push(withDocs(name, 'method', type.slice(0, fnClose + 1), raw, type.slice(fnClose + 1).replace(/^\s*=>\s*/, '').trim()));
      continue;
    }
    out.push({ ...withDocs(name, 'value', '', raw, type), rawType: prop[5] });
  }
  return out;
}

/**
 * The entries of a type literal / interface body: split at top-level ; and ,
 * and between two lines of code - a comment line stays with the member under
 * it, a line opening with | or & continues the type above.
 */
function typeEntries(body: string): string[] {
  const out: string[] = [];
  for (const part of splitTop(body, ';,')) {
    let buf = '';
    let hasCode = false;
    // bracket depth at the start of a line: inside a nested { … } a line never starts a member
    let depth = 0;
    for (const line of part.split('\n')) {
      const t = line.trim();
      const comment = t.startsWith('/*') || t.startsWith('*') || t.startsWith('//');
      const code = !!t && !comment;
      if (code && hasCode && depth === 0 && !/^[|&]/.test(t)) { out.push(buf); buf = ''; hasCode = false; }
      buf += `${line}\n`;
      if (code) {
        hasCode = true;
        const bare = t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '');
        depth += (bare.match(/[{([]/g) ?? []).length - (bare.match(/[})\]]/g) ?? []).length;
      }
    }
    if (buf.trim()) out.push(buf);
  }
  return out;
}

/** the fields of a type: an inline `{ … }` literal, or an interface / type alias the file declares */
function fieldsOfType(src: string, type: string): ApiField[] {
  const literal = type.trim().startsWith('{') ? type.trim() : null;
  const body = literal ? literal.slice(1, matchBracket(literal, 0)) : declaredType(src, type.trim())?.body;
  if (body === undefined || body === null) return [];
  return typeMembers(body).map((m) => ({
    name: m.name,
    type: m.kind === 'method' ? `(${m.args.map((a) => `${a.name}${a.optional ? '?' : ''}: ${a.type}`).join(', ')}) => ${m.returns.type}` : m.returns.type,
    optional: new RegExp(`(^|[\\s;{,])${m.name}\\?\\s*[:(]`).test(body),
    doc: m.doc,
  }));
}

/** an `interface Name { … }` or `type Name = …` the file declares: its raw doc and body (object types) or alias text */
function declaredType(src: string, name: string): { raw: string; body: string | null; alias: string } | null {
  if (!/^[A-Za-z_$][\w$]*$/.test(name)) return null;
  const iface = new RegExp(`(^|\\n)\\s*(export\\s+)?interface\\s+${name}\\b[^{]*\\{`).exec(src);
  if (iface) {
    const open = iface.index + iface[0].length - 1;
    return { raw: docAboveRaw(src, iface.index + iface[1].length), body: src.slice(open + 1, matchBracket(src, open)), alias: '' };
  }
  const alias = new RegExp(`(^|\\n)\\s*(export\\s+)?type\\s+${name}\\b[^=]*=\\s*`).exec(src);
  if (alias) {
    const at = alias.index + alias[0].length;
    if (src[at] === '{') return { raw: docAboveRaw(src, alias.index + alias[1].length), body: src.slice(at + 1, matchBracket(src, at)), alias: '' };
    const end = src.indexOf(';', at);
    return { raw: docAboveRaw(src, alias.index + alias[1].length), body: null, alias: src.slice(at, end < 0 ? undefined : end).replace(/\s+/g, ' ').trim() };
  }
  return null;
}

/** every type the API's type texts name that the file declares - and the ones those name, alphabetical */
function declaredTypes(src: string, texts: string[]): ApiType[] {
  const out = new Map<string, ApiType>();
  const queue = [...texts];
  while (queue.length) {
    for (const id of (queue.pop() ?? '').match(/[A-Za-z_$][\w$]*/g) ?? []) {
      if (out.has(id)) continue;
      const d = declaredType(src, id);
      if (!d) continue;
      const fields = d.body !== null ? fieldsOfType(src, id) : [];
      out.set(id, { name: id, doc: parseDoc(d.raw).text, fields, alias: d.alias });
      queue.push(d.alias, ...fields.map((f) => f.type));
    }
  }
  return [...out.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Read a component's API from its source. */
export function readComponentApi(component: string, src: string, sharedSrc = ''): ComponentApiDoc {
  const camel = camelOf(component);
  const pascal = camel[0].toUpperCase() + camel.slice(1);
  const statesMatch = new RegExp(`const\\s+${camel}States\\s*=\\s*\\[([^\\]]*)\\]`).exec(src);
  const states = statesMatch ? [...statesMatch[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]) : [];

  // df$.<ns> = { … } | identifier
  const namespaces: ApiNamespace[] = [];
  for (const m of src.matchAll(/(^|\n)df\$\.([A-Za-z_$][\w$]*)\s*=\s*/g)) {
    const name = m[2];
    if (name.endsWith('Api') || name.endsWith('States')) continue;
    const at = m.index! + m[0].length;
    if (src[at] === '{') {
      const close = matchBracket(src, at);
      namespaces.push({ name, members: membersOf(src, src.slice(at + 1, close)) });
      continue;
    }
    const ref = /^([A-Za-z_$][\w$]*)\s*;/.exec(src.slice(at));
    const decl = ref ? declarationOf(src, ref[1]) : null;
    if (decl?.kind === 'object') namespaces.push({ name, members: membersOf(src, decl.body!) });
    else if (decl?.kind === 'function') namespaces.push({ name, members: [], callable: withDocs(name, 'method', decl.params, decl.raw, decl.returns) });
  }

  // Object.assign(componentState({…}), { extras })
  const registryExtras: ApiMember[] = [];
  const assign = new RegExp(`${camel}Api\\s*=\\s*Object\\.assign\\(\\s*componentState`).exec(src);
  if (assign) {
    const open = src.indexOf('(', assign.index + assign[0].indexOf('Object.assign') + 'Object.assign'.length);
    const close = matchBracket(src, open);
    const inner = src.slice(open + 1, close);
    const cs = inner.indexOf('componentState');
    const csOpen = inner.indexOf('(', cs);
    const csClose = matchBracket(inner, csOpen);
    const rest = inner.slice(csClose + 1);
    const objOpen = rest.indexOf('{');
    if (objOpen >= 0) registryExtras.push(...membersOf(src, rest.slice(objOpen + 1, matchBracket(rest, objOpen))));
  }

  // el.api replaced by an instance with a declared interface
  let instance: ComponentApiDoc['instance'] = null;
  if (/\.api\s*=\s*(this|controller|instance)\b/.test(src)) {
    const iface = /(^|\n)\s*(export\s+)?interface\s+(\w+Instance)\s*\{/.exec(src);
    if (iface) {
      const open = iface.index + iface[0].length - 1;
      const body = src.slice(open + 1, matchBracket(src, open));
      instance = { name: iface[3], members: typeMembers(body) };
    }
  }

  // events: new CustomEvent('name', { … detail: { a, b } … })
  const events: ApiEvent[] = [];
  for (const m of src.matchAll(/new\s+CustomEvent\s*(<)?/g)) {
    // the CustomEvent<T> argument, which may itself hold <> and {}
    let at = m.index! + m[0].length;
    let type = '';
    if (m[1]) {
      let depth = 1;
      const from = at;
      for (; at < src.length && depth; at++) {
        const ch = src[at];
        if (ch === '<' || ch === '{' || ch === '(' || ch === '[') depth++;
        else if ((ch === '>' && src[at - 1] !== '=') || ch === '}' || ch === ')' || ch === ']') depth--;
      }
      type = src.slice(from, at - 1).replace(/\s+/g, ' ').trim();
    }
    const nameMatch = /^\s*\(\s*(['"`])([^'"`$]+)\1/.exec(src.slice(at));
    if (!nameMatch) continue;
    const name = nameMatch[2];
    let ev = events.find((e) => e.name === name);
    const detail: string[] = [];
    const callOpen = src.indexOf('(', at);
    const call = src.slice(callOpen, matchBracket(src, callOpen) + 1);
    // the init object (the 2nd argument) and its detail entry
    const initOpen = call.indexOf('{');
    if (initOpen > 0) {
      const init = call.slice(initOpen + 1, matchBracket(call, initOpen));
      for (const entry of entriesOf(init)) {
        const e = /^\s*detail\s*(:\s*)?/.exec(splitLeading(entry).code);
        if (!e) continue;
        const value = splitLeading(entry).code.slice(e[0].length).trim();
        if (!e[1]) detail.push('detail'); // shorthand { detail }
        else if (value.startsWith('{')) {
          for (const de of entriesOf(value.slice(1, matchBracket(value, 0)))) {
            const k = /^\s*(\.\.\.)?([A-Za-z_$][\w$]*)/.exec(splitLeading(de).code);
            if (k && !k[1]) detail.push(k[2]);
          }
        } else detail.push(value.replace(/\s+/g, ' '));
      }
    }
    if (!ev) {
      ev = { name, detail: [], doc: '', type: '', fields: [] };
      events.push(ev);
    }
    if (type && !ev.type) {
      ev.type = type;
      ev.fields = fieldsOfType(src, type);
    }
    for (const k of detail) if (!ev.detail.includes(k)) ev.detail.push(k);
    if (!ev.doc) {
      // the comment above the statement that dispatches it
      // (or above the statement, when the call opens on the line before:
      // `el.dispatchEvent(` ⏎ `new CustomEvent('x', …)`)
      let lineStart = src.lastIndexOf('\n', m.index!) + 1;
      ev.doc = docAbove(src, lineStart);
      const prevStart = src.lastIndexOf('\n', lineStart - 2) + 1;
      if (!ev.doc && /\(\s*$/.test(src.slice(prevStart, lineStart - 1))) {
        lineStart = prevStart;
        ev.doc = docAbove(src, lineStart);
      }
    }
  }
  events.sort((a, b) => a.name.localeCompare(b.name));
  const members = [...namespaces.flatMap((n) => [...n.members, ...(n.callable ? [n.callable] : [])]), ...registryExtras, ...(instance?.members ?? [])];
  const typeTexts = [...members.flatMap((m) => [...m.args.map((a) => a.type), m.returns.type]), ...events.flatMap((e) => [e.type, ...e.fields.map((x) => x.type)])];
  // the state → config map: interface <Pascal>StateConfigs { /** meaning *\/ state: { /** field *\/ key?: T } }
  const configs = declaredType(src, `${pascal}StateConfigs`);
  const stateConfigs = configs?.body != null
    ? typeMembers(configs.body).map((m) => ({ name: m.name, doc: m.doc, type: m.returns.type, fields: fieldsOfType(src, (m.rawType ?? m.returns.type).trim()) }))
    : null;
  const shared = sharedSrc ? sharedStateApi(sharedSrc) : { element: [], registry: [] };
  const stateTypes = stateConfigs ? stateConfigs.map((c) => c.type) : [];
  return {
    component, camel, states, namespaces, registryExtras, instance, events,
    types: declaredTypes(src, [...typeTexts, ...stateTypes]).filter((t) => t.name !== `${pascal}StateConfigs`),
    pascal, stateConfigs,
    codeOutsideConfigs: runningCode(src),
    stateApi: { element: specialize(shared.element, pascal), registry: specialize(shared.registry, pascal) },
  };
}

/** `name(a: T, b?: U = 1): R` - a member's TypeScript signature; `name: T` for a value */
export function signatureOf(m: ApiMember): string {
  if (m.kind === 'value') return `${m.name}: ${m.returns.type || '?'}`;
  const args = m.args.map((a) => `${a.name}${a.optional && !a.default ? '?' : ''}: ${a.type || '?'}${a.default ? ` = ${a.default}` : ''}`);
  return `${m.name}(${args.join(', ')}): ${m.returns.type || '?'}`;
}

/** `(a: T) => R` / `any` say nothing about a value - a documented type must */
const vague = (type: string): boolean => /^(any|any\[\]|Function|object|Object)$/.test(type.trim());

/** what one member lacks: a description, a typed + described argument, a return type + description */
function memberGaps(where: string, m: ApiMember): string[] {
  const gaps: string[] = [];
  if (!m.doc) gaps.push(`${where}: no JSDoc`);
  if (m.kind === 'value') {
    if (!m.returns.type) gaps.push(`${where}: no type (annotate the value or its declaration)`);
    else if (vague(m.returns.type)) gaps.push(`${where}: type \`${m.returns.type}\` says nothing - name the real type`);
    return gaps;
  }
  m.args.forEach((a, i) => {
    if (!a.type) gaps.push(`${where}: argument \`${a.name}\` has no TypeScript type`);
    else if (vague(a.type)) gaps.push(`${where}: argument \`${a.name}\` is typed \`${a.type}\` - name the real type`);
    if (!a.doc) gaps.push(`${where}: argument \`${a.name}\` has no @param description (position ${i + 1})`);
  });
  if (!m.returns.type) gaps.push(`${where}: no return type`);
  else if (vague(m.returns.type)) gaps.push(`${where}: return type \`${m.returns.type}\` says nothing - name the real type`);
  else if (!/^(void|Promise<void>|undefined)$/.test(m.returns.type) && !m.returns.doc) gaps.push(`${where}: returns \`${m.returns.type}\` without an @returns description`);
  return gaps;
}

/** what a component's API lacks: descriptions, argument / return / detail types and their descriptions */
export function apiGaps(api: ComponentApiDoc): string[] {
  const gaps: string[] = [];
  for (const ns of api.namespaces) {
    if (ns.callable) gaps.push(...memberGaps(`df$.shadcn.${ns.name}()`, ns.callable));
    for (const m of ns.members) gaps.push(...memberGaps(`df$.shadcn.${ns.name}.${m.name}`, m));
  }
  for (const m of api.registryExtras) gaps.push(...memberGaps(`df$.shadcn.${api.camel}Api.${m.name}`, m));
  for (const m of api.instance?.members ?? []) gaps.push(...memberGaps(`${api.instance!.name}.${m.name}`, m));
  for (const e of api.events) {
    if (!e.doc) gaps.push(`event "${e.name}": no comment above the line that creates it`);
    if (!e.detail.length) continue;
    if (!e.type) { gaps.push(`event "${e.name}": its detail is untyped - new CustomEvent<Detail>('${e.name}', …) with a declared Detail type`); continue; }
    const keys = e.detail.filter((k) => /^[A-Za-z_$][\w$]*$/.test(k) && k !== 'detail');
    const declared = new Set(e.fields.map((x) => x.name));
    if (e.fields.length || keys.length) for (const k of keys) if (!declared.has(k)) gaps.push(`event "${e.name}": detail key \`${k}\` is not a field of \`${e.type}\``);
    for (const x of e.fields) if (!x.doc) gaps.push(`event "${e.name}": detail field \`${x.name}\` has no description (/** … */ on the field)`);
    for (const x of e.fields) if (vague(x.type)) gaps.push(`event "${e.name}": detail field \`${x.name}\` is typed \`${x.type}\` - name the real type`);
  }
  // the state contract: every state described, every config field typed and described
  if (!api.stateConfigs) gaps.push(`no interface ${api.pascal}StateConfigs - declare each state (its JSDoc: what it means) with the config setState() takes for it ({} for none)`);
  else {
    const declared = api.stateConfigs.map((c) => c.name);
    const missing = api.states.filter((n) => !declared.includes(n));
    const extra = declared.filter((n) => !api.states.includes(n));
    if (missing.length) gaps.push(`${api.pascal}StateConfigs lacks the state(s) ${missing.join(', ')}`);
    if (extra.length) gaps.push(`${api.pascal}StateConfigs declares ${extra.join(', ')}, which ${api.camel}States does not`);
    for (const c of api.stateConfigs) {
      // a declared field the code never names is stale or a typo (the reverse - a key read but not
      // declared - cannot be told apart by pattern from other "config" objects; review covers it)
      for (const x of c.fields) if (!new RegExp(`(\\.|\\b|['"])${x.name}\\b`).test(api.codeOutsideConfigs ?? '')) gaps.push(`state "${c.name}": config field \`${x.name}\` is never named in the code`);
      if (!c.doc) gaps.push(`state "${c.name}": no description (/** … */ on its key in ${api.pascal}StateConfigs)`);
      if (!c.type) gaps.push(`state "${c.name}": no config type ({} when it takes none)`);
      for (const x of c.fields) {
        if (!x.doc) gaps.push(`state "${c.name}": config field \`${x.name}\` has no description`);
        if (vague(x.type)) gaps.push(`state "${c.name}": config field \`${x.name}\` is typed \`${x.type}\` - name the real type`);
      }
    }
  }
  for (const m of [...api.stateApi.element, ...api.stateApi.registry]) gaps.push(...memberGaps(`State API ${m.name.replace(/<.*/, '')}`, m).map((g) => `${g} (src/shared/component-state.ts)`));
  for (const t of api.types) {
    if (!t.doc) gaps.push(`type \`${t.name}\`: no JSDoc on its declaration`);
    for (const x of t.fields) if (!x.doc) gaps.push(`type \`${t.name}\`: field \`${x.name}\` has no description`);
  }
  return gaps;
}

const esc = (s: string): string => s.replace(/\|/g, '\\|');
const html = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** inline code inside an HTML cell (the markdown cell holds HTML: backticks would not render) */
const hcode = (s: string): string => `<code>${html(s)}</code>`;

/** an HTML table on one line - it sits inside a markdown table cell */
function innerTable(head: string[], rows: string[][]): string {
  return `<table><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;
}

/** a member's Description cell: the prose, the argument table, the return value */
function memberCell(m: ApiMember): string {
  const parts = [html(m.doc)];
  if (m.kind === 'method' && m.args.length)
    parts.push(innerTable(['Argument', 'Type', 'Description'], m.args.map((a) => [hcode(`${a.name}${a.optional && !a.default ? '?' : ''}`), hcode(a.type) + (a.default ? ` = ${hcode(a.default)}` : ''), html(a.doc)])));
  if (m.kind === 'method' && m.returns.type && !/^(void|undefined)$/.test(m.returns.type))
    parts.push(`<b>Returns</b> ${hcode(m.returns.type)}${m.returns.doc ? ` - ${html(m.returns.doc)}` : ''}`);
  return esc(parts.join(' '));
}

/** a fields table (event detail, declared type) */
const fieldsTable = (fields: ApiField[]): string =>
  innerTable(['Field', 'Type', 'Description'], fields.map((x) => [hcode(`${x.name}${x.optional ? '?' : ''}`), hcode(x.type), html(x.doc)]));

/** the `## API` section of a component skill - generated (scripts/api-docs.ts) */
export function apiMarkdown(api: ComponentApiDoc): string {
  const lines: string[] = ['## API', '', '<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->', ''];
  const memberRows = (members: ApiMember[], prefix = '') => members.map((m) => `| ${esc(hcode(prefix + signatureOf(m)))} | ${memberCell(m)} |`);
  const S = `${api.pascal}State`;
  const stateValue = `{ name: ${S}; config: ${api.pascal}StateConfigs[${S}] }`;
  // the states and their configs - what every State API member below takes
  lines.push('### States', '', `${hcode(`type ${S} = ${api.states.map((n) => `'${n}'`).join(' | ')}`)} - \`setState(name, config)\` takes the config of the state it names (\`${api.pascal}StateConfigs[name]\`).`, '');
  lines.push('| State | Description |', '|---|---|');
  for (const c of api.stateConfigs ?? []) lines.push(`| \`${c.name}\` | ${esc(`${html(c.doc)} ${c.fields.length ? `<b>config</b> ${fieldsTable(c.fields)}` : 'No config.'}`)} |`);
  lines.push('', '### Every element', '');
  if (api.instance) lines.push(`\`el.api\` is the instance (\`${api.instance.name}\`, below) - its setState / getState / render run through \`el.store\`.`, '');
  lines.push('| Member | Description |', '|---|---|');
  if (!api.instance) lines.push(...memberRows(api.stateApi.element, 'el.api.'));
  lines.push(`| ${esc(hcode(`el.store: Store<${stateValue}>`))} | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |`);
  lines.push('', '### Registry', '', '| Member | Description |', '|---|---|', ...memberRows([...api.stateApi.registry, ...api.registryExtras], `df$.shadcn.${api.camel}Api.`));
  lines.push(`| ${esc(hcode(`df$.shadcn.${api.camel}States: ${S}[]`))} | The declared states, 'default' first: ${api.states.map((n) => `<code>${n}</code>`).join(', ')}. |`);
  for (const ns of api.namespaces) {
    lines.push('', `### \`df$.shadcn.${ns.name}\``, '');
    if (ns.callable) lines.push('| Member | Description |', '|---|---|', ...memberRows([ns.callable], 'df$.shadcn.'), '');
    if (ns.members.length) lines.push('| Member | Description |', '|---|---|', ...memberRows(ns.members));
  }
  if (api.instance) lines.push('', `### The instance (\`${api.instance.name}\`)`, '', '| Member | Description |', '|---|---|', ...memberRows(api.instance.members));
  if (api.events.length) {
    lines.push('', '### Events', '', '| Event | Description |', '|---|---|');
    for (const e of api.events) {
      const detail = !e.detail.length ? 'No <code>detail</code>.' : e.fields.length ? `<code>detail</code>: ${hcode(e.type)} ${fieldsTable(e.fields)}` : `<code>detail</code>: ${hcode(e.type || e.detail.join(', '))}`;
      lines.push(`| \`${e.name}\` | ${esc(`${html(e.doc)} ${detail}`)} |`);
    }
  }
  if (api.types.length) {
    lines.push('', '### Types', '', '| Type | Description |', '|---|---|');
    for (const t of api.types) lines.push(`| \`${t.name}\` | ${esc(`${html(t.doc)} ${t.fields.length ? fieldsTable(t.fields) : t.alias ? `= ${hcode(t.alias)}` : ''}`)} |`);
  }
  return lines.join('\n').trimEnd() + '\n';
}

/**
 * Put the `## API` section into a skill: replace the existing one, else
 * insert it right after `## States` (before the next `## `).
 */
export function withApiSection(skill: string, section: string): string {
  const lines = skill.split('\n');
  const at = lines.findIndex((l) => l.trim() === '## API');
  const nextH2 = (from: number) => {
    for (let i = from + 1; i < lines.length; i++) if (lines[i].startsWith('## ')) return i;
    return lines.length;
  };
  const block = section.trimEnd().split('\n');
  if (at >= 0) {
    let end = nextH2(at);
    // keep a "---" rule that separates sections
    while (end > at && /^(---)?\s*$/.test(lines[end - 1])) end--;
    lines.splice(at, end - at, ...block);
    return lines.join('\n');
  }
  const states = lines.findIndex((l) => /^## States\b/.test(l));
  if (states < 0) return skill;
  let end = nextH2(states);
  // insert before the separator that precedes the next section
  let insert = end;
  while (insert > states && /^(---)?\s*$/.test(lines[insert - 1])) insert--;
  const sep = lines.slice(insert, end).some((l) => l.trim() === '---');
  lines.splice(insert, 0, '', ...(sep ? ['---', ''] : []), ...block);
  return lines.join('\n');
}

/** the `## API` section a skill carries now ('' when none) */
export function apiSectionOf(skill: string): string {
  const lines = skill.split('\n');
  const at = lines.findIndex((l) => l.trim() === '## API');
  if (at < 0) return '';
  let end = lines.length;
  for (let i = at + 1; i < lines.length; i++) if (lines[i].startsWith('## ')) { end = i; break; }
  while (end > at && /^(---)?\s*$/.test(lines[end - 1])) end--;
  return lines.slice(at, end).join('\n') + '\n';
}
