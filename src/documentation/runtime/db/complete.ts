/**
 * Completion for the Database Explorer's query fields: what fits at the caret of a filter, sort or projection as the
 * shell types it ({ country: 'DE', amount: { $gt: 500 } }), or of a field name. A pure function of the text, the
 * caret and the collection's fields: the page draws the list and asks the database for a field's values.
 *
 * Why a scan of the text and not the parser: the text being typed is incomplete by definition - an open brace, a key
 * without its value - so the parser's answer is an error. A scan that only tracks braces, brackets, strings and the
 * last key knows where the caret is in a half-written document, which is all completion needs.
 *
 * VERIFIED: tests/db-complete.test.ts walks the contexts (key, operator, value, array, string, sort, projection).
 */

/** A field of the collection, with the type most of its values have (schema sample). */
export interface FieldInfo {
  path: string;
  type: string;
}
export type CompletionMode = 'filter' | 'sort' | 'project' | 'field';
export interface Suggestion {
  /** What the list shows. */
  label: string;
  /** What replaces the word at the caret. */
  insert: string;
  /** Where the caret goes, from the start of `insert` (default: its end). */
  caret?: number;
  kind: 'field' | 'operator' | 'value' | 'snippet';
  /** A type or a short explanation. */
  detail?: string;
}
export interface Completion {
  /** The range the chosen suggestion replaces. */
  from: number;
  to: number;
  /** What the caret stands on. */
  context: 'key' | 'operator' | 'value' | 'none';
  /** The field a value or an operator belongs to. */
  field?: string;
  /** For a value: the operator it is the operand of ($in: a list item). */
  operator?: string;
  /** The word typed so far (without its quote). */
  prefix: string;
  items: Suggestion[];
}

interface Frame {
  kind: 'object' | 'array';
  state: 'key' | 'value';
  key?: string;
}

/**
 * Operators by what they take: every comparison, $in / $nin on lists, $exists, $type, $regex on text, $mod and the
 * bit tests on numbers, $all / $size / $elemMatch on arrays. A field that holds arrays takes every operator: as in
 * MongoDB (defuss-db 3.1), a condition matches an array when one of its elements does.
 * VERIFIED: tests/db-query.test.ts "arrays as MongoDB matches them" runs them against defuss-db 3.1.0.
 */
export const OPERATORS: { op: string; detail: string; types?: string[]; snippet?: string }[] = [
  { op: '$eq', detail: 'equal to' },
  { op: '$ne', detail: 'not equal to' },
  { op: '$gt', detail: 'greater than', types: ['number', 'date', 'string', 'bigint'] },
  { op: '$gte', detail: 'greater than or equal', types: ['number', 'date', 'string', 'bigint'] },
  { op: '$lt', detail: 'less than', types: ['number', 'date', 'string', 'bigint'] },
  { op: '$lte', detail: 'less than or equal', types: ['number', 'date', 'string', 'bigint'] },
  { op: '$in', detail: 'one of a list', snippet: '[]' },
  { op: '$nin', detail: 'none of a list', snippet: '[]' },
  { op: '$exists', detail: 'the field is there (true) or not (false)' },
  { op: '$type', detail: "the value's type: 'string', 'number', 'date', 'array' ...", snippet: "''" },
  { op: '$regex', detail: "text: '^prefix', 'suffix$' or 'part'", types: ['string'], snippet: "''" },
  { op: '$options', detail: "beside $regex: 'i' ignores case", types: ['string'], snippet: "'i'" },
  { op: '$mod', detail: '[divisor, remainder]', types: ['number', 'bigint'], snippet: '[]' },
  { op: '$bitsAllSet', detail: 'every bit of a mask (or of bit positions) is 1', types: ['number', 'bigint'], snippet: '[]' },
  { op: '$bitsAnySet', detail: 'some bit of a mask is 1', types: ['number', 'bigint'], snippet: '[]' },
  { op: '$bitsAllClear', detail: 'every bit of a mask is 0', types: ['number', 'bigint'], snippet: '[]' },
  { op: '$bitsAnyClear', detail: 'some bit of a mask is 0', types: ['number', 'bigint'], snippet: '[]' },
  { op: '$all', detail: 'the array holds every value of a list', types: ['array'], snippet: '[]' },
  { op: '$size', detail: 'the array has this many elements', types: ['array'] },
  { op: '$elemMatch', detail: 'one element matches every condition', types: ['array'], snippet: '{  }' },
  { op: '$not', detail: 'negates an operator document', snippet: '{  }' },
];
/** The type names $type takes (defuss-db 3.1's BSON names); VERIFIED: tmp probe of every name against 3.1.0. */
export const TYPE_NAMES = ['string', 'number', 'double', 'int', 'long', 'bool', 'date', 'null', 'object', 'array', 'binData'];
/** An operator fits a field of this type: no type known, an operator for any value, its type, or a field of arrays. */
const fits = (o: { types?: string[] }, type: string | undefined) =>
  !o.types || !type || o.types.includes(type) || type === 'array';
const LOGICAL = [
  { op: '$or', detail: 'any of a list of filters' },
  { op: '$and', detail: 'all of a list of filters' },
  { op: '$nor', detail: 'none of a list of filters' },
];

/** The context at `caret` and what fits there. `values` are the field's known values (for a value context). */
export function complete(
  text: string,
  caret: number,
  mode: CompletionMode,
  fields: FieldInfo[],
  values: unknown[] = [],
): Completion {
  const before = text.slice(0, caret);
  if (mode === 'field') {
    const w = /[\w$.]*$/.exec(before)![0];
    const after = /^[\w$.]*/.exec(text.slice(caret))![0];
    return {
      from: caret - w.length,
      to: caret + after.length,
      context: 'key',
      prefix: w,
      items: fieldItems(fields, w, ''),
    };
  }
  // scan: frames for braces / brackets, the state of each object (key or value) and its last key
  const stack: Frame[] = [];
  let lastKey = '';
  let inString: string | null = null;
  let stringStart = 0;
  let word = '';
  for (let i = 0; i < before.length; i++) {
    const c = before[i]!;
    if (inString) {
      if (c === '\\') i++;
      else if (c === inString) {
        inString = null;
        // a quoted key (or a quoted value - a ':' after it decides)
        word = lastKey = before.slice(stringStart + 1, i);
      }
      continue;
    }
    if (c === '"' || c === "'") {
      inString = c;
      stringStart = i;
      continue;
    }
    const top = stack.at(-1);
    if (c === '{') {
      stack.push({ kind: 'object', state: 'key' });
      lastKey = word = '';
    } else if (c === '[') stack.push({ kind: 'array', state: 'value' });
    else if (c === '}' || c === ']') {
      stack.pop();
      word = '';
    } else if (c === ':' && top?.kind === 'object') {
      top.state = 'value';
      top.key = lastKey || word;
      word = '';
    } else if (c === ',' && top?.kind === 'object') {
      top.state = 'key';
      top.key = undefined;
      lastKey = '';
      word = '';
    } else if (/[\w$.]/.test(c)) {
      // a word: a key (unquoted) or a bare value
      const m = /^[\w$.]+/.exec(before.slice(i))!;
      lastKey = m[0];
      word = m[0];
      i += m[0].length - 1;
    } else if (!/\s/.test(c)) word = '';
  }
  const quoted = inString !== null;
  const typed = quoted ? before.slice(stringStart + 1) : /[\w$.]*$/.exec(before)![0];
  const from = quoted ? stringStart : caret - typed.length;
  const rest = text.slice(caret);
  // inside a string: up to its closing quote, never past the end of the value
  const to =
    caret +
    (quoted
      ? (new RegExp(`^[^${inString}\\n,}\\]]*${inString}`).exec(rest) ?? /^[^\s'",}\]]*/.exec(rest)!)[0].length
      : /^[\w$.]*/.exec(rest)![0].length);
  const top = stack.at(-1);
  const base = { from, to, prefix: typed };
  // what stands before the word: a key follows { or ',', a value ':' '[' or ',' - after a finished value nothing fits
  const prev = before.slice(0, from).trimEnd().at(-1) ?? '';

  // outside any document: start one with a field
  if (!top) {
    if (before.trim() && !/^\s*$/.test(before.slice(0, from))) return { ...base, context: 'none', items: [] };
    return {
      ...base,
      context: 'key',
      items: fieldItems(fields, typed, mode).map((s) => ({
        ...s,
        insert: `{ ${s.insert} }`,
        caret: 2 + (s.caret ?? s.insert.length),
      })),
    };
  }
  const parent = stack.at(-2);
  // the key of the object around `top` (for an object inside an array: the array's key)
  const owner = parent?.kind === 'object' ? parent.key : parent?.kind === 'array' ? stack.at(-3)?.key : undefined;

  if (top.kind === 'object' && top.state === 'key') {
    if (prev !== '{' && prev !== ',') return { ...base, context: 'none', items: [] };
    if (mode !== 'filter' || stack.length === 1 || (owner && /^\$(or|and|nor)$/.test(owner)))
      return {
        ...base,
        context: 'key',
        items: [
          ...fieldItems(fields, typed, mode),
          ...(mode === 'filter'
            ? LOGICAL.filter((l) => l.op.startsWith(typed)).map((l): Suggestion => ({
                label: l.op,
                insert: `${l.op}: [{  }]`,
                caret: l.op.length + 5,
                kind: 'operator',
                detail: l.detail,
              }))
            : []),
        ],
      };
    // inside { field: { | } }: the field's operators
    const field = owner === '$not' ? stack.at(-3)?.key : owner;
    const type = fields.find((f) => f.path === field)?.type;
    return {
      ...base,
      context: 'operator',
      field,
      items: OPERATORS.filter((o) => o.op.startsWith(typed) && fits(o, type)).map(
        (o) => ({
          label: o.op,
          insert: `${o.op}: ${o.snippet ?? ''}`,
          caret: o.op.length + 2 + (o.snippet ? Math.ceil(o.snippet.length / 2) : 0),
          kind: 'operator',
          detail: o.detail,
        }),
      ),
    };
  }

  // a value
  if (prev !== ':' && prev !== '[' && prev !== ',') return { ...base, context: 'none', items: [] };
  if (mode === 'sort')
    return {
      ...base,
      context: 'value',
      field: top.key,
      items: [
        { label: '1', insert: '1', kind: 'value', detail: 'ascending' },
        { label: '-1', insert: '-1', kind: 'value', detail: 'descending' },
      ],
    };
  if (mode === 'project')
    return {
      ...base,
      context: 'value',
      field: top.key,
      items: [
        { label: '1', insert: '1', kind: 'value', detail: 'include' },
        { label: '0', insert: '0', kind: 'value', detail: 'exclude' },
      ],
    };
  const key = top.kind === 'array' ? owner : top.key;
  if (key && /^\$(or|and|nor)$/.test(key))
    return {
      ...base,
      context: 'value',
      items: [{ label: '{ }', insert: '{  }', caret: 2, kind: 'snippet', detail: 'a filter' }],
    };
  const isOp = !!key?.startsWith('$');
  const field = isOp ? (top.kind === 'array' ? stack.at(-3)?.key : owner) : key;
  const operator = isOp ? key : undefined;
  const type = fields.find((f) => f.path === field)?.type;
  if (operator === '$exists')
    return {
      ...base,
      context: 'value',
      field,
      operator,
      items: ['true', 'false'].map((v) => ({ label: v, insert: v, kind: 'value' as const })),
    };
  if (operator === '$type')
    return {
      ...base,
      context: 'value',
      field,
      operator,
      items: TYPE_NAMES.filter((t) => t.toLowerCase().startsWith(typed.toLowerCase())).map((t) => ({
        label: t,
        insert: quoted ? t : `'${t}'`,
        kind: 'value' as const,
      })),
    };
  const items: Suggestion[] = [];
  // a field's value may also be an operator document
  if (!isOp && top.kind === 'object' && !quoted && !typed)
    items.push({ label: '{ $… }', insert: '{ $ }', caret: 3, kind: 'snippet', detail: 'compare with an operator' });
  const lower = typed.toLowerCase();
  const seen = new Set<string>();
  for (const v of values) {
    const lit = literal(v);
    if (!lit || seen.has(lit)) continue;
    const plain = typeof v === 'string' ? v : lit;
    if (lower && !plain.toLowerCase().startsWith(lower)) continue;
    seen.add(lit);
    items.push({ label: lit, insert: lit, kind: 'value', detail: type });
    if (items.length >= 40) break;
  }
  if (type === 'date' && !quoted && !typed)
    items.push({
      label: "ISODate('…')",
      insert: `ISODate('${new Date().toISOString().slice(0, 10)}')`,
      kind: 'snippet',
      detail: 'a date',
    });
  if (type === 'boolean' && !values.length)
    for (const v of ['true', 'false']) items.push({ label: v, insert: v, kind: 'value' });
  return { ...base, context: 'value', field, operator, items };
}

/** A value as the shell writes it: 'text', 12.5, true, ISODate('2025-01-02T00:00:00.000Z'), NumberLong('9'). */
export function literal(v: unknown): string {
  if (typeof v === 'string') return `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'bigint') return `NumberLong('${v}')`;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : `ISODate('${v.toISOString()}')`;
  if (v === null) return 'null';
  return '';
}

function fieldItems(fields: FieldInfo[], typed: string, mode: CompletionMode | ''): Suggestion[] {
  const t = typed.toLowerCase();
  // fields that start with the word first, then fields that contain it
  const starts = fields.filter((f) => f.path.toLowerCase().startsWith(t));
  const contains = t
    ? fields.filter((f) => !f.path.toLowerCase().startsWith(t) && f.path.toLowerCase().includes(t))
    : [];
  return [...starts, ...contains].slice(0, 60).map((f) => {
    const key = /^[A-Za-z_$][\w$.]*$/.test(f.path) ? f.path : `'${f.path}'`;
    const insert = mode === '' ? f.path : `${key}: `;
    return { label: f.path, insert, kind: 'field', detail: f.type };
  });
}
