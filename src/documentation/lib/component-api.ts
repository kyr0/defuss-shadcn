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
 */

export interface ApiMember {
  name: string;
  /** the parameter list as written ("(target, rows, options = {})"), '' for a value */
  params: string;
  /** 'method' | 'value' */
  kind: 'method' | 'value';
  doc: string;
}
export interface ApiEvent {
  name: string;
  /** top-level keys of the event's detail object (or the identifier it is) */
  detail: string[];
  doc: string;
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

/** the JSDoc (or // lines) directly above position `at` in `src` */
function docAbove(src: string, at: number): string {
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
      return cleanDoc(block.join('\n'));
    }
    if (l.startsWith('//')) { tail.unshift(l.replace(/^\/\/\s?/, '')); continue; }
    break;
  }
  return tail.join(' ').replace(/\s+/g, ' ').trim();
}

/** an entry's leading JSDoc / comment and the rest */
function splitLeading(entry: string): { doc: string; code: string } {
  let code = entry;
  let doc = '';
  for (;;) {
    const t = code.trimStart();
    if (t.startsWith('/*')) {
      const end = t.indexOf('*/');
      doc = cleanDoc(t.slice(0, end + 2));
      code = t.slice(end + 2);
    } else if (t.startsWith('//')) {
      const nl = t.indexOf('\n');
      const line = t.slice(2, nl < 0 ? undefined : nl).trim();
      doc = doc && !doc.endsWith('*/') ? `${doc} ${line}` : line;
      code = nl < 0 ? '' : t.slice(nl + 1);
    } else return { doc, code: t };
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

/** where a top-level identifier is declared: a function, an arrow const, an object const */
function declarationOf(src: string, id: string): { kind: 'function' | 'object' | 'value'; params: string; doc: string; body?: string } | null {
  const fn = new RegExp(`(^|\\n)\\s*(export\\s+)?(async\\s+)?function\\s+${id}\\s*(<[^>]*>)?\\s*\\(`).exec(src);
  if (fn) {
    const open = src.indexOf('(', fn.index + fn[0].length - 1);
    const close = matchBracket(src, open);
    return { kind: 'function', params: stripTypes(src.slice(open, close + 1)), doc: docAbove(src, fn.index + fn[1].length) };
  }
  const arrow = new RegExp(`(^|\\n)\\s*(export\\s+)?const\\s+${id}\\s*(:[^=]+)?=\\s*(async\\s*)?\\(`).exec(src);
  if (arrow) {
    const open = src.indexOf('(', arrow.index + arrow[0].length - 1);
    const close = matchBracket(src, open);
    const rest = src.slice(close + 1, close + 40);
    if (/^\s*(:[^=]+)?=>/.test(rest)) return { kind: 'function', params: stripTypes(src.slice(open, close + 1)), doc: docAbove(src, arrow.index + arrow[1].length) };
  }
  const obj = new RegExp(`(^|\\n)\\s*(export\\s+)?const\\s+${id}\\s*(:[^=]+)?=\\s*\\{`).exec(src);
  if (obj) {
    const open = obj.index + obj[0].length - 1;
    const close = matchBracket(src, open);
    return { kind: 'object', params: '', doc: docAbove(src, obj.index + obj[1].length), body: src.slice(open + 1, close) };
  }
  const value = new RegExp(`(^|\\n)\\s*(export\\s+)?(const|let)\\s+${id}\\b`).exec(src);
  if (value) return { kind: 'value', params: '', doc: docAbove(src, value.index + value[1].length) };
  return null;
}

/** the members of an object literal body */
function membersOf(src: string, body: string): ApiMember[] {
  const out: ApiMember[] = [];
  for (const entry of entriesOf(body)) {
    const { doc, code } = splitLeading(entry);
    if (!code.trim() || code.startsWith('...')) continue;
    // name(params) {   |   async name(params) {   |   get name() {
    let m = /^(async\s+)?(get\s+|set\s+)?([A-Za-z_$][\w$]*)\s*(<[^>]*>)?\s*\(/.exec(code);
    if (m) {
      const open = code.indexOf('(', m[0].length - 1);
      const close = matchBracket(code, open);
      out.push({ name: m[3], params: m[2]?.trim() === 'get' ? '' : stripTypes(code.slice(open, close + 1)), kind: m[2]?.trim() === 'get' ? 'value' : 'method', doc });
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
        if (/^\s*(:[^=]+)?=>/.test(value.slice(close + 1, close + 60))) {
          out.push({ name: m[1], params: stripTypes(value.slice(open, close + 1)), kind: 'method', doc });
          continue;
        }
      }
      const single = /^(async\s+)?([A-Za-z_$][\w$]*)\s*=>/.exec(value);
      if (single) { out.push({ name: m[1], params: `(${single[2]})`, kind: 'method', doc }); continue; }
      const fnExpr = /^(async\s+)?function\s*[\w$]*\s*\(/.exec(value);
      if (fnExpr) {
        const open = value.indexOf('(');
        out.push({ name: m[1], params: stripTypes(value.slice(open, matchBracket(value, open) + 1)), kind: 'method', doc });
        continue;
      }
      const ref = /^([A-Za-z_$][\w$]*)\s*$/.exec(value);
      const decl = ref ? declarationOf(src, ref[1]) : null;
      if (decl?.kind === 'function') { out.push({ name: m[1], params: decl.params, kind: 'method', doc: doc || decl.doc }); continue; }
      out.push({ name: m[1], params: '', kind: 'value', doc: doc || decl?.doc || '' });
      continue;
    }
    // shorthand: name
    m = /^([A-Za-z_$][\w$]*)\s*$/.exec(code);
    if (m) {
      const decl = declarationOf(src, m[1]);
      out.push({ name: m[1], params: decl?.kind === 'function' ? decl.params : '', kind: decl?.kind === 'function' ? 'method' : 'value', doc: doc || decl?.doc || '' });
    }
  }
  return out;
}

/** Read a component's API from its source. */
export function readComponentApi(component: string, src: string): ComponentApiDoc {
  const camel = camelOf(component);
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
    else if (decl?.kind === 'function') namespaces.push({ name, members: [], callable: { name, params: decl.params, kind: 'method', doc: decl.doc } });
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
      const members: ApiMember[] = [];
      for (const line of body.split(/;\s*\n|\n/)) {
        const { doc, code } = splitLeading(line);
        const mm = /^([A-Za-z_$][\w$]*)\s*(\(([^)]*)\))?/.exec(code.trim());
        if (mm) members.push({ name: mm[1], params: mm[2] ? stripTypes(mm[2]) : '', kind: mm[2] ? 'method' : 'value', doc });
      }
      // a doc comment on its own line belongs to the next member
      const docs = [...body.matchAll(/\/\*\*([\s\S]*?)\*\/\s*([A-Za-z_$][\w$]*)/g)];
      for (const d of docs) {
        const member = members.find((x) => x.name === d[2]);
        if (member && !member.doc) member.doc = cleanDoc(`/**${d[1]}*/`);
      }
      instance = { name: iface[3], members: members.filter((x) => x.name) };
    }
  }

  // events: new CustomEvent('name', { … detail: { a, b } … })
  const events: ApiEvent[] = [];
  for (const m of src.matchAll(/new\s+CustomEvent(<[^>]*>)?\(\s*(['"`])([^'"`$]+)\2/g)) {
    const name = m[3];
    let ev = events.find((e) => e.name === name);
    const detail: string[] = [];
    const callOpen = src.indexOf('(', m.index!);
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
      ev = { name, detail: [], doc: '' };
      events.push(ev);
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
  return { component, camel, states, namespaces, registryExtras, instance, events };
}

/** what a component's API lacks: members and events without a description */
export function apiGaps(api: ComponentApiDoc): string[] {
  const gaps: string[] = [];
  for (const ns of api.namespaces) {
    if (ns.callable && !ns.callable.doc) gaps.push(`df$.shadcn.${ns.name}(): no JSDoc on its function`);
    for (const m of ns.members) if (!m.doc) gaps.push(`df$.shadcn.${ns.name}.${m.name}: no JSDoc`);
  }
  for (const m of api.registryExtras) if (!m.doc) gaps.push(`df$.shadcn.${api.camel}Api.${m.name}: no JSDoc`);
  for (const m of api.instance?.members ?? []) if (!m.doc) gaps.push(`${api.instance!.name}.${m.name}: no JSDoc`);
  for (const e of api.events) if (!e.doc) gaps.push(`event "${e.name}": no comment above the line that creates it`);
  return gaps;
}

const esc = (s: string): string => s.replace(/\|/g, '\\|');

/** the `## API` section of a component skill - generated (scripts/api-docs.ts) */
export function apiMarkdown(api: ComponentApiDoc): string {
  const lines: string[] = ['## API', '', '<!-- generated from the source by `bun run api-docs` - edit the JSDoc in the .ts, not this section -->', ''];
  const el = api.instance
    ? `\`el.api\` is the instance (\`${api.instance.name}\`, below) - its \`setState(name, config?)\` / \`getState()\` / \`render(state?)\` run through \`el.store\``
    : '`el.api.setState(name, config?)` · `el.api.getState()` · `el.api.render(state?)` · `el.api.settled()`';
  lines.push(`**Every element:** ${el}; \`el.store\` - a defuss-store store of \`{ name, config }\` (subscribe to follow, set to drive).`);
  lines.push('');
  lines.push(`**Registry:** \`df$.shadcn.${api.camel}Api\` - \`setState(el, name, config?)\`, \`getState(el)\`, \`render(state)\`, \`store(el)\`, \`commit(el, name, config?)\`${api.registryExtras.length ? ', ' + api.registryExtras.map((m) => `\`${m.name}${m.params}\``).join(', ') : ''}; \`df$.shadcn.${api.camel}States\` = ${api.states.map((s) => `\`${s}\``).join(', ')}.`);
  if (api.registryExtras.length) {
    lines.push('', `| \`df$.shadcn.${api.camel}Api\` | Description |`, '|---|---|');
    for (const m of api.registryExtras) lines.push(`| \`${m.name}${m.params}\` | ${esc(m.doc)} |`);
  }
  for (const ns of api.namespaces) {
    lines.push('', `### \`df$.shadcn.${ns.name}\``, '');
    if (ns.callable) lines.push(`\`df$.shadcn.${ns.name}${ns.callable.params}\` - ${ns.callable.doc}`, '');
    if (ns.members.length) {
      lines.push('| Member | Description |', '|---|---|');
      for (const m of ns.members) lines.push(`| \`${m.name}${m.kind === 'method' ? m.params || '()' : ''}\` | ${esc(m.doc)} |`);
    }
  }
  if (api.instance) {
    lines.push('', `### The instance (\`${api.instance.name}\`)`, '', '| Member | Description |', '|---|---|');
    for (const m of api.instance.members) lines.push(`| \`${m.name}${m.kind === 'method' ? m.params || '()' : ''}\` | ${esc(m.doc)} |`);
  }
  if (api.events.length) {
    lines.push('', '### Events', '', '| Event | `detail` | Description |', '|---|---|---|');
    for (const e of api.events) lines.push(`| \`${e.name}\` | ${e.detail.length ? e.detail.map((k) => `\`${k}\``).join(', ') : '-'} | ${esc(e.doc)} |`);
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
