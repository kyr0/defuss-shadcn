import { describe, expect, it } from 'vitest';
import { complete, literal, type FieldInfo } from '../src/documentation/runtime/db/complete.ts';

/**
 * Why: the Database Explorer's query fields complete what fits at the caret - a field where a key goes, the field's
 * operators inside its operator document, its values where a value goes. A wrong context offers operators as values
 * or inserts a key where a value belongs; these walk each context of a half-written document.
 */
const fields: FieldInfo[] = [
  { path: 'country', type: 'string' },
  { path: 'customer', type: 'string' },
  { path: 'amount', type: 'number' },
  { path: 'createdAt', type: 'date' },
  { path: 'paid', type: 'boolean' },
  { path: 'address.city', type: 'string' },
];
/** completes at the | */
const at = (text: string, mode: 'filter' | 'sort' | 'project' | 'field' = 'filter', values: unknown[] = []) => {
  const caret = text.indexOf('|');
  return complete(text.replace('|', ''), caret, mode, fields, values);
};
const labels = (c: ReturnType<typeof complete>) => c.items.map((i) => i.label);
/** the text after accepting the first suggestion (and where the caret lands) */
const accept = (text: string, mode: Parameters<typeof at>[1] = 'filter', values: unknown[] = [], pick = 0) => {
  const caret = text.indexOf('|');
  const src = text.replace('|', '');
  const c = complete(src, caret, mode, fields, values);
  const s = c.items[pick]!;
  const out = src.slice(0, c.from) + s.insert + src.slice(c.to);
  const pos = c.from + (s.caret ?? s.insert.length);
  return out.slice(0, pos) + '|' + out.slice(pos);
};

describe('query completion', () => {
  it('an empty filter starts a document with a field', () => {
    expect(labels(at('|'))).toContain('country');
    expect(accept('|')).toBe('{ country: | }');
    expect(accept('cu|')).toBe('{ customer: | }');
  });

  it('a key: the fields that start with the word, then those containing it; logical operators at the top', () => {
    const c = at('{ c| }');
    expect(c.context).toBe('key');
    expect(labels(c).slice(0, 3)).toEqual(['country', 'customer', 'createdAt']);
    expect(labels(at('{ city| }'))).toEqual(['address.city']);
    expect(labels(at('{ $| }'))).toEqual(['$or', '$and', '$nor']);
    expect(accept('{ $o| }')).toBe('{ $or: [{ | }] }');
    expect(accept("{ country: 'DE', am| }")).toBe("{ country: 'DE', amount: | }");
    // inside $or's list a filter's keys are fields again
    expect(at('{ $or: [{ a| }] }').context).toBe('key');
    expect(labels(at('{ $or: [{ a| }] }'))).toContain('amount');
  });

  it("an operator document: the field's operators, by its type", () => {
    const c = at('{ amount: { $| } }');
    expect(c.context).toBe('operator');
    expect(c.field).toBe('amount');
    expect(labels(c)).toContain('$gte');
    expect(labels(c)).not.toContain('$regex');
    expect(labels(at('{ country: { $| } }'))).toContain('$regex');
    expect(accept('{ amount: { $gt| } }')).toBe('{ amount: { $gt: | } }');
    expect(accept('{ amount: { $i| } }')).toBe('{ amount: { $in: [|] } }');
    // a quoted key names the field too
    expect(at("{ 'amount': { $| } }").field).toBe('amount');
  });

  it('defuss-db 3.1 operators: arrays take every operator and their own, numbers $mod and bits, $type its names', () => {
    const withTags = [...fields, { path: 'tags', type: 'array' }];
    const ops = (text: string) => labels(complete(text.replace('|', ''), text.indexOf('|'), 'filter', withTags, []));
    expect(ops('{ tags: { $| } }')).toEqual(expect.arrayContaining(['$all', '$size', '$elemMatch', '$regex', '$gt']));
    expect(ops('{ amount: { $| } }')).toEqual(expect.arrayContaining(['$mod', '$bitsAllSet', '$type']));
    expect(ops('{ amount: { $| } }')).not.toContain('$size');
    expect(ops('{ country: { $| } }')).toContain('$options');
    expect(accept('{ tags: { $el| } }')).toBe('{ tags: { $elemMatch: { | } } }');
    expect(labels(at('{ amount: { $type: | } }'))).toEqual(expect.arrayContaining(["string", 'date', 'binData']));
    expect(accept('{ amount: { $type: da| } }')).toBe("{ amount: { $type: 'date'| } }");
  });

  it("a value: the field's known values as the shell writes them; an operator's operand belongs to its field", () => {
    const c = at('{ country: | }', 'filter', ['DE', 'FR', 'AT']);
    expect(c.context).toBe('value');
    expect(c.field).toBe('country');
    expect(labels(c)).toEqual(['{ $… }', "'DE'", "'FR'", "'AT'"]);
    expect(labels(at("{ country: 'F| }", 'filter', ['DE', 'FR']))).toEqual(["'FR'"]);
    expect(accept("{ country: 'F| }", 'filter', ['DE', 'FR'])).toBe("{ country: 'FR'| }");
    const op = at('{ amount: { $gt: | } }', 'filter', [12, 99]);
    expect([op.field, op.operator]).toEqual(['amount', '$gt']);
    expect(labels(op)).toEqual(['12', '99']);
    const list = at("{ country: { $in: ['DE', | ] } }", 'filter', ['DE', 'FR']);
    expect([list.field, list.operator]).toEqual(['country', '$in']);
    expect(labels(at('{ paid: { $exists: | } }'))).toEqual(['true', 'false']);
    expect(labels(at('{ createdAt: | }'))).toContain("ISODate('…')");
  });

  it('sort and projection take 1 / -1 and 1 / 0; the field mode completes a bare name', () => {
    expect(labels(at('{ amount: | }', 'sort'))).toEqual(['1', '-1']);
    expect(labels(at('{ amount: | }', 'project'))).toEqual(['1', '0']);
    expect(accept('{ am|', 'sort')).toBe('{ amount: |');
    expect(accept('cou|', 'field')).toBe('country|');
    expect(accept('address.c|ity', 'field')).toBe('address.city|');
  });

  it('writes values as the shell does', () => {
    expect(literal("it's")).toBe("'it\\'s'");
    expect(literal(new Date('2025-01-02T00:00:00Z'))).toBe("ISODate('2025-01-02T00:00:00.000Z')");
    expect(literal(9007199254740993n)).toBe("NumberLong('9007199254740993')");
    expect(literal({ a: 1 })).toBe('');
  });
});

describe('after a finished value', () => {
  it('offers nothing (Enter then submits instead of taking another suggestion)', () => {
    expect(at("{ country: 'DE'| }", 'filter', ['DE']).items).toEqual([]);
    expect(at('{ amount: 5 | }').items).toEqual([]);
    expect(at('{ amount: { $gt: 5 }| }').items).toEqual([]);
  });
});
