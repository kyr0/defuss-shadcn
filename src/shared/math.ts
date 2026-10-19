/**
 * Why: the Math components (math-renderer, math-editor, math-compute) keep their
 * state as plain JSON - the store, getState(), render() and a page that saves a
 * derivation all need it serializable, and a config from setState() or a script
 * tag is untrusted input. One owner validates that input: bounded, acyclic,
 * plain JSON (no prototype keys) and TeX within a byte limit. The vendor objects
 * (KaTeX, a MathLive field, a Compute Engine expression) never enter state.
 * The types are the shapes the three components exchange.
 * VERIFIED: (tests/math.test.ts) cycles, class instances, prototype keys, non-finite numbers, oversized data and
 * TeX past 65,536 bytes throw; plain JSON comes back as a separate, equal copy.
 */

/** A JSON value - the only kind of data a math state holds (MathJSON included). */
export type MathJson = null | boolean | number | string | MathJson[] | { [key: string]: MathJson };

/** One visible term of an annotated formula; `id` names this occurrence, `semanticId` what it stands for. */
export type MathNotation = {
  id: string;
  semanticId?: string;
  description?: string;
} & (
  | { kind: 'symbol'; value: string }
  | { kind: 'number'; value: string }
  | { kind: 'text'; value: string }
  | { kind: 'operator'; value: '+' | '-' | '=' | '<' | '>' | 'times' | 'le' | 'ge' | 'pm' }
  | { kind: 'sequence'; children: MathNotation[] }
  | { kind: 'fraction'; numerator: MathNotation; denominator: MathNotation }
  | { kind: 'power'; base: MathNotation; exponent: MathNotation }
  | { kind: 'subscript'; base: MathNotation; subscript: MathNotation }
  | { kind: 'root'; radicand: MathNotation }
  | { kind: 'group'; delimiter: 'parentheses' | 'brackets' | 'absolute'; child: MathNotation }
);

/** What a formula renders: raw TeX (selectable as a whole) or a notation tree (selectable per term). */
export type MathSource = { format: 'latex'; text: string } | { format: 'notation'; tree: MathNotation };

/** The operations math-compute runs. */
export type MathOperation =
  | 'inspect'
  | 'canonicalize'
  | 'simplify'
  | 'evaluate'
  | 'approximate'
  | 'compare'
  | 'solve'
  | 'differentiate';

/** An expression in both notations: TeX for display, MathJSON for the engine. */
export interface MathExpression {
  latex: string;
  json: MathJson;
}

/** The assumptions one computation runs under - JSON, never code. */
export interface MathContext {
  /** the number domain undeclared variables live in */
  domain: 'real' | 'complex';
  /** declared variables and their types */
  variables: Record<string, 'real' | 'complex' | 'integer'>;
  /** MathJSON predicates the engine assumes (comparisons or membership) */
  assumptions: MathJson[];
  /** significant digits of a numerical approximation (15..100) */
  precision: number;
}

/** A condition a result holds under: required by the original input (a denominator), or assumed. */
export interface MathCondition {
  id: string;
  latex: string;
  json: MathJson;
  origin: 'input' | 'assumption';
}

/** One step of the engine's own explanation, reported as it came - not a proof. */
export interface MathStep {
  before: MathExpression;
  after: MathExpression;
  /** the engine's rule id */
  rule: string;
  /** the engine's description of the rule */
  description: string;
  /** how the two sides relate: an equivalence the engine claims, a consequence, or a candidate check */
  relation: 'transform' | 'implies' | 'candidate' | 'check';
}

/** A computation's whole record: input, result, conditions, steps and what is not covered. */
export interface MathResult {
  schemaVersion: 1;
  /** the Compute Engine version that produced it */
  engine: string;
  operation: MathOperation;
  /** the input as written */
  input: MathExpression;
  /** the input after the engine's canonical form (not traced - it happens before the steps) */
  canonical: MathExpression;
  result: MathExpression;
  /** compare: the engine's answer - 'unknown' stays unknown */
  comparison: 'true' | 'false' | 'unknown' | null;
  conditions: MathCondition[];
  /** 'complete' only for the documented real-arithmetic grammar */
  coverage: 'complete' | 'partial';
  steps: MathStep[];
  /** solve: every candidate root and what substitution said */
  candidates: { value: MathExpression; status: 'accepted' | 'rejected' | 'unknown' }[];
  notices: string[];
}

/** Largest JSON a math state may hold (UTF-8 bytes). */
const MAX_BYTES = 2_097_152;
/** Largest TeX source (UTF-8 bytes). */
const MAX_TEX = 65_536;

/**
 * A validated deep copy of JSON math data: plain objects and arrays, finite
 * numbers, no prototype keys, no cycles, within a node, depth and byte limit.
 * Throws on anything else - a rejected config changes nothing.
 * @param value - the data to copy
 * @param maxBytes - the largest JSON size accepted
 * @returns a structural copy of the value
 */
export function mathClone<T>(value: T, maxBytes = MAX_BYTES): T {
  let nodes = 0;
  const path = new Set<object>();
  const visit = (v: unknown, depth: number): void => {
    if (++nodes > 20_000 || depth > 96) throw new Error('math data exceeds the node or depth limit');
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return;
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) throw new Error('math data holds a non-finite number');
      return;
    }
    if (typeof v !== 'object' || path.has(v)) throw new Error('math data must be acyclic JSON');
    const proto = Object.getPrototypeOf(v);
    if (!Array.isArray(v) && proto !== Object.prototype && proto !== null)
      throw new Error('math data must hold plain objects');
    path.add(v);
    for (const [k, x] of Object.entries(v)) {
      if (k === '__proto__' || k === 'prototype' || k === 'constructor') throw new Error(`math data key "${k}"`);
      visit(x, depth + 1);
    }
    path.delete(v);
  };
  visit(value, 0);
  if (new TextEncoder().encode(JSON.stringify(value)).length > maxBytes)
    throw new Error('math data exceeds the size limit');
  return structuredClone(value);
}

/**
 * A TeX string within the size limit (bytes, not UTF-16 units).
 * @param value - the candidate source
 * @returns the same string
 */
export function mathText(value: unknown): string {
  if (typeof value !== 'string' || new TextEncoder().encode(value).length > MAX_TEX)
    throw new Error('TeX must be a string of at most 65,536 bytes');
  return value;
}
