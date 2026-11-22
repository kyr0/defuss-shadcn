import { describe, expect, it } from 'vitest';
import { fromPipeline, parsePipeline, toShell } from '../src/documentation/runtime/db/pipeline.ts';
import { parseDocument } from '../src/documentation/runtime/db/query.ts';

/**
 * Why: a pasted MongoDB pipeline becomes the Aggregations builder's rows; a stage read wrongly runs a different
 * aggregation than the one pasted, so every shape maps exactly or is refused by name.
 */
const convert = (text: string) => fromPipeline(parsePipeline(text));

describe('MongoDB pipeline → builder', () => {
  it('a $match, a $group by a field with count, sum and average, $sort and $limit', () => {
    expect(
      convert(`[
        { $match: { status: 'paid', amount: { $gt: 100 } } },
        { $group: { _id: '$country', orders: { $sum: 1 }, revenue: { $sum: '$amount' }, mean: { $avg: '$amount' } } },
        { $sort: { revenue: -1 } },
        { $limit: 10 }
      ]`),
    ).toEqual({
      filter: "{ status: 'paid', amount: { $gt: 100 } }",
      groupBy: [{ field: 'country', by: 'value' }],
      measures: [{ op: 'sum', field: 'amount' }, { op: 'count' }, { op: 'avg', field: 'amount' }],
      order: 'measure',
      limit: 10,
    });
  });

  it('keys: a document of fields, case-folded text, date units, $dateToString, each element after $unwind', () => {
    const spec = convert(`[
      { $unwind: '$tags' },
      { $group: { _id: { t: '$tags', c: { $toLower: '$country' }, m: { $dateTrunc: { date: '$createdAt', unit: 'month' } } }, n: { $count: {} } } },
      { $sort: { '_id.m': 1 } }
    ]`);
    expect(spec.groupBy).toEqual([
      { field: 'tags', by: 'each' },
      { field: 'country', by: 'lower' },
      { field: 'createdAt', by: 'month' },
    ]);
    expect(spec.order).toBe('key');
    expect(
      convert(`[{ $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$at' } }, n: { $sum: 1 } } }]`).groupBy,
    ).toEqual([{ field: 'at', by: 'day' }]);
    expect(convert(`{ $group: { _id: { $toUpper: '$name' }, n: { $sum: 1 } } }`).groupBy).toEqual([
      { field: 'name', by: 'upper' },
    ]);
  });

  it('$addToSet is the distinct values, with $size the distinct count; _id null and $count measure everything', () => {
    const spec = convert(`[
      { $group: { _id: null, customers: { $addToSet: '$customer' }, statuses: { $addToSet: '$status' }, first: { $min: '$createdAt' } } },
      { $set: { customers: { $size: '$customers' } } }
    ]`);
    expect(spec.groupBy).toEqual([]);
    expect(spec.measures).toEqual([
      { op: 'countDistinct', field: 'customer' },
      { op: 'distinct', field: 'status' },
      { op: 'min', field: 'createdAt' },
    ]);
    expect(convert(`[{ $match: { paid: true } }, { $count: 'n' }]`)).toEqual({
      filter: '{ paid: true }',
      groupBy: [],
      measures: [{ op: 'count' }],
      order: 'measure',
      limit: 50,
    });
  });

  it('two $match stages are one filter; dates and long numbers keep their types', () => {
    const spec = convert(
      `[{ $match: { at: { $gte: ISODate('2026-01-01T00:00:00.000Z') } } }, { $match: { n: NumberLong('9') } }, { $count: 'n' }]`,
    );
    expect(spec.filter).toBe(
      "{ $and: [{ at: { $gte: ISODate('2026-01-01T00:00:00.000Z') } }, { n: NumberLong('9') }] }",
    );
    // what the builder's filter reads back is the pasted filter
    expect(parseDocument(spec.filter)).toEqual({
      $and: [{ at: { $gte: new Date('2026-01-01T00:00:00Z') } }, { n: 9n }],
    });
    expect(toShell({ 'a b': "it's" })).toBe("{ 'a b': 'it\\'s' }");
  });

  it("reads back what the builder's own pipeline (the dialog's starting text) writes", () => {
    const spec = convert(`[
      { $match: { status: 'paid' } },
      { $unwind: '$tags' },
      { $group: { _id: { tags: '$tags', createdAt: { $dateTrunc: { date: '$createdAt', unit: 'week', startOfWeek: 'monday' } } }, count_email: { $sum: { $cond: [{ $gt: ['$email', null] }, 1, 0] } }, distinct_status: { $addToSet: '$status' } } },
      { $set: { distinct_status: { $sortArray: { input: '$distinct_status', sortBy: 1 } } } },
      { $sort: { '_id.tags': 1 } },
      { $limit: 200 }
    ]`);
    expect(spec).toEqual({
      filter: "{ status: 'paid' }",
      groupBy: [
        { field: 'tags', by: 'each' },
        { field: 'createdAt', by: 'week' },
      ],
      measures: [
        { op: 'count', field: 'email' },
        { op: 'distinct', field: 'status' },
      ],
      order: 'key',
      limit: 200,
    });
  });

  it('names what has no place in the builder', () => {
    expect(() => convert('[{ $lookup: { from: "x" } }]')).toThrow(/stage 1: \$lookup is not supported/);
    expect(() => convert(`[{ $group: { _id: '$a', n: { $sum: 1 } } }, { $match: { n: { $gt: 2 } } }]`)).toThrow(
      /stage 2: \$match after \$group/,
    );
    expect(() => convert(`[{ $group: { _id: '$a', f: { $first: '$b' } } }]`)).toThrow(/\$first is not supported/);
    expect(() => convert(`[{ $unwind: '$tags' }, { $group: { _id: '$a', n: { $sum: 1 } } }]`)).toThrow(
      /\$unwind '\$tags' only as a group key/,
    );
    expect(() => convert(`[{ $group: { _id: '$a', n: { $sum: 1 } } }, { $sort: { n: 1 } }]`)).toThrow(/largest first/);
    expect(() => convert(`[{ $match: { a: 1 } }]`)).toThrow(/a \$group \(or \$count\)/);
    expect(() => convert('')).toThrow(/paste a list of stages/);
    // defuss-db plans seconds too; the builder's finest date row is the minute
    expect(() =>
      convert(`[{ $group: { _id: { $dateTrunc: { date: '$createdAt', unit: 'second' } }, n: { $sum: 1 } } }]`),
    ).toThrow(/per second: the builder groups dates by minute at the finest/);
    expect(() =>
      convert(`[{ $group: { _id: { a: { $dateTrunc: { date: '$a', unit: 'day', timezone: 'Asia/Tokyo' } }, b: { $dateTrunc: { date: '$b', unit: 'day' } } }, n: { $sum: 1 } } }]`),
    ).toThrow(/one time zone for every date key, not Asia\/Tokyo and UTC/);
    expect(() =>
      convert(`[{ $group: { _id: null, p: { $percentile: { input: '$n', p: [0.42], method: 'approximate' } } } }]`),
    ).toThrow(/stage 1: p: the builder measures the median and the 90th, 95th and 99th percentile/);
  });

  it('defuss-db 3.1: a time zone, bins, MongoDB\'s Sunday weeks, deviations, $median and $percentile', () => {
    const spec = convert(`[
      { $group: {
        _id: {
          at: { $dateTrunc: { date: '$at', unit: 'minute', binSize: 15, timezone: 'Europe/Berlin' } },
          week: { $dateTrunc: { date: '$week', unit: 'week', timezone: 'Europe/Berlin' } }
        },
        mid: { $median: { input: '$amount', method: 'approximate' } },
        top: { $percentile: { input: '$amount', p: [0.9], method: 'approximate' } },
        sd: { $stdDevSamp: '$amount' },
        sdp: { $stdDevPop: '$amount' }
      } },
      { $sort: { mid: -1 } }
    ]`);
    expect(spec).toEqual({
      filter: '',
      groupBy: [
        { field: 'at', by: 'minute', bin: 15 },
        // MongoDB's weeks start on Sunday unless startOfWeek says otherwise
        { field: 'week', by: 'week', weekStart: 'sunday' },
      ],
      measures: [
        { op: 'median', field: 'amount' },
        { op: 'p90', field: 'amount' },
        { op: 'stdDevSamp', field: 'amount' },
        { op: 'stdDevPop', field: 'amount' },
      ],
      order: 'measure',
      limit: 50,
      timeZone: 'Europe/Berlin',
    });
    // date parts, which the planner does not group by: hour of day and ISO weekday in the builder's one zone
    expect(
      convert(`[{ $group: { _id: { h: { $hour: { date: '$at', timezone: 'Asia/Tokyo' } }, d: { $isoDayOfWeek: { date: '$at', timezone: 'Asia/Tokyo' } } }, n: { $sum: 1 } } }]`),
    ).toMatchObject({
      groupBy: [
        { field: 'at', by: 'hourOfDay' },
        { field: 'at', by: 'weekday' },
      ],
      timeZone: 'Asia/Tokyo',
    });
    expect(convert(`[{ $group: { _id: { $month: '$at' }, n: { $sum: 1 } } }]`).groupBy).toEqual([
      { field: 'at', by: 'monthOfYear' },
    ]);
    // the builder's own week (startOfWeek monday) stays the ISO week
    expect(
      convert(`[{ $group: { _id: { $dateTrunc: { date: '$a', unit: 'week', startOfWeek: 'monday' } }, n: { $sum: 1 } } }]`)
        .groupBy,
    ).toEqual([{ field: 'a', by: 'week' }]);
  });
});
