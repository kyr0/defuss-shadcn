/**
 * A MongoDB aggregation pipeline → the Database Explorer's aggregation (filter, keys, measures, order, limit): what a
 * reader pastes from MongoDB Compass, a driver or a Stack Overflow answer becomes the builder's rows, run by
 * defuss-db. The pipeline is read and planned by defuss-db/mongo's translatePipeline; this adapter writes the plan as
 * the builder's rows and refuses what the builder has no row for.
 *
 * Why a translation into the builder instead of running the pipeline: the builder is what the reader edits next, and
 * a pipeline maps onto it exactly or not at all - a stage that has no place in it is named instead of being run
 * differently.
 *
 * VERIFIED: tests/db-pipeline.test.ts converts each shape and names what it refuses.
 */
import { literal } from './complete.ts';
import { QueryError, translatePipeline } from 'defuss-db/mongo';
import type { GroupBy, KeySpec, MeasureOp, MeasureSpec, Weekday } from './ops.ts';

export { parsePipeline } from 'defuss-db/mongo';

/** The builder's state a pipeline becomes. */
export interface PipelineSpec {
  filter: string;
  groupBy: KeySpec[];
  measures: MeasureSpec[];
  order: 'measure' | 'key';
  limit: number;
  /** The time zone of the calendar keys; absent: UTC. */
  timeZone?: string;
}

type Doc = Record<string, unknown>;
const isDoc = (v: unknown): v is Doc => !!v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date);

/** A value as the shell writes it: { status: 'paid', at: { $gte: ISODate('...') } }. */
export function toShell(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(toShell).join(', ')}]`;
  if (isDoc(v)) {
    const entries = Object.entries(v);
    if (!entries.length) return '{}';
    return `{ ${entries.map(([k, x]) => `${/^[A-Za-z_$][\w$.]*$/.test(k) ? k : literal(k)}: ${toShell(x)}`).join(', ')} }`;
  }
  return literal(v) || String(v);
}

// VERIFIED: (defuss-db 3.1.0's GroupUnit type) the planner also truncates dates to seconds and milliseconds, which
// the builder's key rows do not offer - named instead of grouped differently
const BUILDER_UNITS: readonly GroupBy[] = [
  'value',
  'lower',
  'upper',
  'each',
  'year',
  'quarter',
  'month',
  'week',
  'day',
  'hour',
  'minute',
];
function builderUnit(by: string, field: string): GroupBy {
  if ((BUILDER_UNITS as readonly string[]).includes(by)) return by as GroupBy;
  throw new QueryError(`$group by '${field}' per ${by}: the builder groups dates by minute at the finest`);
}

/** The percentiles the builder measures, by MongoDB's `p`. */
const PERCENTILES: Record<string, MeasureOp> = { '0.5': 'median', '0.9': 'p90', '0.95': 'p95', '0.99': 'p99' };
/**
 * MongoDB 7's $median and $percentile accumulators, which defuss-db's planner does not take: each is swapped for a
 * $max of its input before planning - so the planner keeps its place, its alias and a $sort that names it - and put
 * back as the builder's measure afterwards. A percentile the builder has no row for is named.
 * VERIFIED: tests/db-pipeline.test.ts round-trips the builder's median and p90 through its own pipeline.
 */
/** MongoDB's date part operators and the builder's part keys (ISO weekdays: Monday 1 ... Sunday 7). */
export const PART_OPERATORS: Record<string, GroupBy> = {
  $hour: 'hourOfDay',
  $isoDayOfWeek: 'weekday',
  $dayOfMonth: 'dayOfMonth',
  $month: 'monthOfYear',
  $dayOfYear: 'dayOfYear',
  $isoWeek: 'isoWeek',
};
/**
 * A group key that is a date part ($hour: '$at', or { $hour: { date: '$at', timezone } }) - which defuss-db's
 * planner does not group by - becomes a $dateTrunc of the same date and zone for the planner (so the zone check and
 * the key's place hold), and the builder's part key afterwards, by the key's name ('' for a whole _id).
 */
function liftPart(expr: unknown, parts: Map<string, GroupBy>, name: string): unknown {
  if (!isDoc(expr)) return expr;
  const [op, operand] = Object.entries(expr)[0] ?? [];
  const part = op ? PART_OPERATORS[op] : undefined;
  if (!part || Object.keys(expr).length !== 1) return expr;
  const date = isDoc(operand) ? operand.date : operand;
  const zone = isDoc(operand) && typeof operand.timezone === 'string' ? { timezone: operand.timezone } : {};
  parts.set(name, part);
  return { $dateTrunc: { date, unit: 'day', ...zone } };
}

function liftPercentiles(stages: Doc[]): { stages: Doc[]; lifted: Map<string, MeasureOp>; parts: Map<string, GroupBy> } {
  const lifted = new Map<string, MeasureOp>();
  const parts = new Map<string, GroupBy>();
  const out = stages.map((stage, i) => {
    const group = stage.$group;
    if (!isDoc(group)) return stage;
    const next: Doc = {};
    for (const [alias, acc] of Object.entries(group)) {
      if (alias === '_id') {
        next._id = isDoc(acc)
          ? Object.keys(acc).some((k) => k.startsWith('$'))
            ? liftPart(acc, parts, '')
            : Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, liftPart(v, parts, k)]))
          : acc;
        continue;
      }
      const spec = isDoc(acc) ? (acc.$median ?? acc.$percentile) : undefined;
      if (!isDoc(spec)) {
        next[alias] = acc;
        continue;
      }
      const ps = isDoc(acc) && acc.$median !== undefined ? [0.5] : spec.p;
      const op = Array.isArray(ps) && ps.length === 1 ? PERCENTILES[String(ps[0])] : undefined;
      if (!op)
        throw new QueryError(
          `stage ${i + 1}: ${alias}: the builder measures the median and the 90th, 95th and 99th percentile, one per measure`,
        );
      lifted.set(alias, op);
      next[alias] = { $max: spec.input };
    }
    return { ...stage, $group: next };
  });
  return { stages: out, lifted, parts };
}

/** The builder's state of a pipeline; a stage or an expression the builder has no place for throws, naming it. */
export function fromPipeline(pasted: Doc[]): PipelineSpec {
  const { stages, lifted, parts } = liftPercentiles(pasted);
  const plan = translatePipeline(stages);
  // one time zone for all calendar keys - the builder has one field for it
  const zones = new Set(
    plan.keys.filter((k) => !['value', 'lower', 'upper', 'each'].includes(k.by)).map((k) => k.zone ?? 'UTC'),
  );
  if (zones.size > 1)
    throw new QueryError(`$group: one time zone for every date key, not ${[...zones].join(' and ')}`);
  const timeZone = [...zones][0];
  // the builder orders by the first measure, largest first - an ascending order only for distinct values
  if (plan.sort.by === 'measure' && plan.sort.direction === 'asc' && plan.measures[0]?.op !== 'distinct')
    throw new QueryError(`$sort by '${plan.measures[0]!.alias}': measures sort largest first (-1) in the builder`);
  return {
    filter: plan.match ? toShell(plan.match) : '',
    groupBy: plan.keys.map((k) => ({
      field: k.field,
      by: parts.get(k.name ?? '') ?? builderUnit(k.by, k.field),
      ...(k.bin && k.bin > 1 ? { bin: k.bin } : {}),
      ...(k.by === 'week' && k.weekStart && k.weekStart !== 'monday' ? { weekStart: k.weekStart as Weekday } : {}),
    })),
    measures: plan.measures.map(({ alias, op, field }) => {
      const m = lifted.get(alias) ?? op;
      return field ? { op: m, field } : { op: m };
    }) as MeasureSpec[],
    order: plan.sort.by === 'key' ? 'key' : 'measure',
    limit: plan.limit ?? 50,
    ...(timeZone && timeZone !== 'UTC' ? { timeZone } : {}),
  };
}
