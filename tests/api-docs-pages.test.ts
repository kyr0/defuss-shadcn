import { describe, expect, it } from 'vitest';
import schema from '../src/documentation/runtime/api-docs/rpc.docs.json';
import mdx from '../src/documentation/pages/application/scaffold-api-docs.mdx?raw';
import {
  apiDocsFiles,
  exampleArgs,
  exampleValue,
  rpcSamples,
  signature,
  type MethodDoc,
  type NamespaceDoc,
} from '../src/documentation/runtime/api-docs/pages.ts';

/**
 * The API Documentation scaffold's pages as Markdown and JSON (runtime/api-docs/pages.ts), from the real data block
 * and the real rpc.docs.json that defuss-rpc schema wrote from runtime/api-docs/api.ts.
 */
const data = JSON.parse(mdx.match(/<script type="application\/json" id="ad-data">([\s\S]*?)<\/script>/)![1]!);
const rpc = schema as unknown as NamespaceDoc[];
const APP = '../application/app-api-docs.html';
const files = apiDocsFiles(data, rpc, APP);
const method = (ns: string, m: string) => rpc.find((e) => (e.kind === 'class' ? e.className : e.moduleName) === ns)!.methods[m]!;

describe('api docs pages', () => {
  it('writes a Markdown and a JSON file per page, an index of them and an llms.txt', () => {
    const index = JSON.parse(files.get('index.json')!);
    expect(index).toHaveLength(data.guides.length + data.resources.length + data.endpoints.length + 1 + rpc.length + 9);
    for (const entry of index) {
      expect(files.has(entry.markdown), entry.markdown).toBe(true);
      expect(JSON.parse(files.get(entry.json)!).route).toBe(entry.route);
    }
    expect(files.get('llms.txt')).toContain('- [Tasks.create](rpc/Tasks/create.md) - `async create(input: NewTask): Promise<Task>`');
    expect(files.get('index.md')).toContain('- [Create a task](ref/tasks/create.md)');
    expect(JSON.parse(files.get('rpc/Tasks.json')!)).toMatchObject({ kind: 'namespace', namespaceKind: 'class', className: 'Tasks' });
  });

  it('a method page: signature, parameters, the return schema, @throws, @example and the calls, linked to the app', () => {
    const page = files.get('rpc/Tasks/create.md')!;
    expect(page.split('\n').slice(0, 4)).toEqual(['# Tasks.create', '', '```ts', 'async create(input: NewTask): Promise<Task>']);
    expect(page).toContain('| `input` | `NewTask` | yes | Its title and, optionally, who does it, when it is due and its labels. |');
    expect(page).toContain('`Task` - The new task, with its id.');
    expect(page).toContain('"x-dson": "set"');
    expect(page).toContain('- RpcError when the title is empty');
    expect(page).toContain('await rpc.Tasks.create({ title: "Write the release notes", labels: ["release"] })');
    // three folders below api-docs/: the app link climbs to the docs root first
    expect(page).toContain('](../../../application/app-api-docs.html#/rpc/Tasks/create)');
    expect(page).toContain(`-d '{"className":"Tasks","methodName":"create","args":[{"title":"Write the release notes"}]}'`);
  });

  it('a stream documents what it yields and what it returns', () => {
    const page = files.get('rpc/Activity/recent.md')!;
    expect(page).toContain('Streams: every `yield` arrives as one NDJSON frame');
    expect(page).toContain('## Yields\n\n`ActivityEvent` - One change to a task.');
    expect(page).toContain('## Returns\n\n`number` - How many events were sent.');
    expect(signature('recent', method('Activity', 'recent'))).toBe('async *recent(count?: number): AsyncGenerator<ActivityEvent, number>');
    expect(rpcSamples('Activity', 'recent', method('Activity', 'recent'), []).ts).toContain('for await (const value of rpc.Activity.recent())');
  });

  it('example arguments: required ones from their schema, optional ones at the end left out', () => {
    expect(exampleArgs(method('Members', 'invite'))).toEqual(['lin@acme.example']);
    expect(exampleArgs(method('Tasks', 'move'))).toEqual(['t_101', 'todo']);
    expect(exampleArgs(method('Tasks', 'list'))).toEqual([]);
    expect(exampleValue({ type: 'string', format: 'date-time', 'x-dson': 'date' })).toBe('2026-12-01T09:00:00.000Z');
    expect(exampleValue({ anyOf: [{ type: 'integer' }, { type: 'null' }] })).toBe(3);
  });

  it('a REST endpoint page: its URL, its parameters by place and its responses', () => {
    const page = files.get('ref/tasks/create.md')!;
    expect(page).toContain('`POST https://api.acme.example/v4/');
    expect(page).toContain('| Status | Meaning |');
    const json = JSON.parse(files.get('ref/tasks/create.json')!);
    expect(json).toMatchObject({ kind: 'endpoint', method: 'POST', markdown: 'create.md' });
    expect(json.responses[0]).toEqual({ status: 201, description: 'Created - the new object' });
  });

  it('every page of rpc.docs.json is there: the namespaces and the methods the example registers', () => {
    expect(rpc.map((ns) => [ns.kind === 'class' ? ns.className : ns.moduleName, Object.keys(ns.methods)])).toEqual([
      ['Tasks', ['list', 'get', 'create', 'move', 'remove']],
      ['Members', ['list', 'invite']],
      ['Activity', ['recent']],
      ['Stats', ['summary']],
    ]);
    const unknown: MethodDoc = { async: true, generator: false };
    expect(signature('x', unknown)).toBe('async x(): Promise<void>');
  });
});
