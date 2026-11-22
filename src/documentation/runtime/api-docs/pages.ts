/**
 * Every page of the API Documentation scaffold as Markdown and as JSON - the REST reference of its data block and the
 * defuss-rpc reference of rpc.docs.json. scripts/build-docs.ts writes them to dist/documentation/api-docs/ (with an
 * index and an llms.txt), and the scaffold's bundle uses the same code samples for Try it.
 *
 * VERIFIED: (tests/api-docs-pages.test.ts, scaffold-api-docs.e2e) why static files beside the app - the app writes its pages in the browser, so a crawler or an agent that does not run
 * JavaScript sees nothing of the reference. One Markdown file and one JSON file per page, linked from the page and
 * listed in api-docs/llms.txt, make every page readable as text and as data.
 */

/** A JSON Schema as rpc.docs.json carries it. */
export type JsonSchema = { [key: string]: unknown };
/** One documented value. */
export interface ValueDoc {
  type?: string;
  schema?: JsonSchema;
  description?: string;
}
/** One documented parameter. */
export interface ParamDoc extends ValueDoc {
  name: string;
  optional?: boolean;
  rest?: boolean;
}
/** One method of the documented defuss-rpc schema. */
export interface MethodDoc {
  async: boolean;
  generator: boolean;
  description?: string;
  params?: ParamDoc[];
  returns?: ValueDoc;
  yields?: ValueDoc;
  deprecated?: true | string;
  throws?: string[];
  examples?: string[];
}
/** One namespace of the documented defuss-rpc schema. */
export type NamespaceDoc = { description?: string; methods: Record<string, MethodDoc> } & (
  | { kind: 'class'; className: string }
  | { kind: 'module'; moduleName: string }
);

/** The REST reference's data block (the scaffold's #ad-data), as far as the pages read it. */
export interface RestData {
  base: string;
  words: { en: { codes: Record<string, string> } };
  guides: { id: string; en: { title: string; lead: string; body: string[] } }[];
  resources: { id: string; object: string; fields: [string, string, string, string][]; en: { title: string; lead: string } }[];
  endpoints: {
    id: string;
    resource: string;
    method: string;
    path: string;
    codes: string[];
    en: { title: string; lead: string };
    params: { name: string; in: string; type: string; required?: boolean; example?: string; values?: string[]; en: string }[];
  }[];
}

/** One page: its file path under api-docs/ (without extension), its route in the app, its Markdown and its JSON. */
export interface DocPage {
  path: string;
  route: string;
  title: string;
  kind: 'guide' | 'resource' | 'endpoint' | 'rpc' | 'namespace' | 'method';
  markdown: string;
  json: Record<string, unknown>;
}

/** The name the client calls a namespace by. */
export const namespaceName = (ns: NamespaceDoc): string => (ns.kind === 'class' ? ns.className : ns.moduleName);

/** Where the example server listens by default (defuss-rpc's DEFAULT_PORT). */
export const RPC_SERVER = 'http://localhost:63920';

const cell = (text: string | undefined) => (text ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const code = (text: string) => '`' + text.replace(/`/g, "'") + '`';
const fence = (lang: string, body: string) => '```' + lang + '\n' + body + '\n```';

/** Example strings by parameter name, so a sample reads like a call someone would make. */
const STRINGS: Record<string, string> = { id: 't_101', email: 'lin@acme.example', title: 'Write the release notes', assignee: 'm_2' };

/**
 * A value for a parameter, from its JSON Schema: what Try it and the samples start from - the first enum value, a
 * number, a string, the required fields of an object, an empty list, a date as an ISO string.
 */
export function exampleValue(schema: JsonSchema | undefined, name = 'value'): unknown {
  if (!schema) return null;
  if ('const' in schema) return schema.const;
  if (Array.isArray(schema.enum)) return schema.enum[0];
  if (Array.isArray(schema.anyOf)) return exampleValue(schema.anyOf[0] as JsonSchema, name);
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  if (schema['x-dson'] === 'date') return '2026-12-01T09:00:00.000Z';
  if (type === 'string') return STRINGS[name] ?? name;
  if (type === 'number' || type === 'integer') return 3;
  if (type === 'boolean') return true;
  if (type === 'array') return [];
  if (type === 'object') {
    const properties = (schema.properties ?? {}) as Record<string, JsonSchema>;
    const required = (schema.required ?? []) as string[];
    return Object.fromEntries(required.map((key) => [key, exampleValue(properties[key], key)]));
  }
  return null;
}

/** The arguments a method's samples show: one example value per parameter; optional ones are left out at the end. */
export function exampleArgs(method: MethodDoc): unknown[] {
  const params = method.params ?? [];
  let last = params.length;
  while (last > 0 && params[last - 1]!.optional) last--;
  return params.slice(0, last).map((p) => exampleValue(p.schema, p.name));
}

/** The method's signature as TypeScript: `async create(input: NewTask): Promise<Task>`. */
export function signature(name: string, method: MethodDoc): string {
  const params = (method.params ?? [])
    .map((p) => `${p.rest ? '...' : ''}${p.name}${p.optional && !p.rest ? '?' : ''}: ${p.type ?? 'unknown'}`)
    .join(', ');
  const result = method.returns?.type ?? 'void';
  const returns = method.generator
    ? `${method.async ? 'AsyncGenerator' : 'Generator'}<${method.yields?.type ?? 'unknown'}, ${result}>`
    : method.async
      ? `Promise<${result}>`
      : result;
  return `${method.async ? 'async ' : ''}${method.generator ? '*' : ''}${name}(${params}): ${returns}`;
}

/** The code samples of a call: the typed client, curl and fetch - from the arguments given. */
export function rpcSamples(className: string, methodName: string, method: MethodDoc, args: unknown[], server = RPC_SERVER) {
  const list = args.map((a) => JSON.stringify(a)).join(', ');
  const body = JSON.stringify({ className, methodName, args });
  const ts = method.generator
    ? `import { getRpcClient } from "defuss-rpc/client";\nimport type { RpcApi } from "./api";\n\nconst rpc = await getRpcClient<RpcApi>("${server}");\nfor await (const value of rpc.${className}.${methodName}(${list})) console.log(value);`
    : `import { getRpcClient } from "defuss-rpc/client";\nimport type { RpcApi } from "./api";\n\nconst rpc = await getRpcClient<RpcApi>("${server}");\nconst result = await rpc.${className}.${methodName}(${list});`;
  const curl = `curl ${server}/rpc \\\n  -H "Content-Type: application/json" \\\n  -d '${body.replace(/'/g, "'\\''")}'`;
  const js = `const response = await fetch("${server}/rpc", {\n  method: "POST",\n  headers: { "Content-Type": "application/json" },\n  body: JSON.stringify(${JSON.stringify({ className, methodName, args }, null, 2).replace(/\n/g, '\n  ')}),\n});\n${method.generator ? '// application/x-ndjson: one { type: "yield" | "return" | "error" } frame per line\nconsole.log(await response.text());' : 'console.log(await response.json()); // DSON: a Date or a Map arrives as a tagged record'}`;
  return { ts, curl, js };
}

const valueSection = (heading: string, value: ValueDoc | undefined) =>
  value
    ? [
        `## ${heading}`,
        '',
        `${code(value.type ?? 'unknown')}${value.description ? ' - ' + value.description : ''}`,
        '',
        ...(value.schema ? [fence('json', JSON.stringify(value.schema, null, 2)), ''] : []),
      ]
    : [];

/** The pages of a documented defuss-rpc schema: an overview, one page per namespace, one per method. */
export function rpcPages(schema: NamespaceDoc[], app: string): DocPage[] {
  const pages: DocPage[] = [];
  const link = (route: string) => `${app}${route}`;
  const overview = [
    '# defuss-rpc API',
    '',
    'The Acme workspace as a [defuss-rpc](https://github.com/kyr0/defuss-rpc) API. Every call is one `POST /rpc` with `{ className, methodName, args }`; arguments and results travel as DSON, so a `Date`, a `Map` or a `Set` arrives as itself, and an async generator streams one NDJSON frame per value. This reference was written by `defuss-rpc schema` from the API\'s source and its JSDoc.',
    '',
    `Interactive: [the API Documentation app](${link('#/rpc')}).`,
    '',
    '| Namespace | Kind | Methods | Description |',
    '| --- | --- | --- | --- |',
    ...schema.map(
      (ns) =>
        `| [${namespaceName(ns)}](${namespaceName(ns)}.md) | ${ns.kind} | ${Object.keys(ns.methods).length} | ${cell(ns.description)} |`,
    ),
    '',
  ];
  pages.push({
    path: 'rpc/index',
    route: '#/rpc',
    title: 'defuss-rpc API',
    kind: 'rpc',
    markdown: overview.join('\n'),
    json: { kind: 'rpc', route: '#/rpc', title: 'defuss-rpc API', endpoint: '/rpc', schema },
  });
  for (const ns of schema) {
    const name = namespaceName(ns);
    const methods = Object.entries(ns.methods);
    pages.push({
      path: `rpc/${name}`,
      route: `#/rpc/${name}`,
      title: name,
      kind: 'namespace',
      markdown: [
        `# ${name}`,
        '',
        ...(ns.description ? [ns.description, ''] : []),
        `A ${ns.kind === 'class' ? 'class: the server makes a fresh instance for every call' : 'module: one object, shared by every call'}. Interactive: [${name} in the app](${link('#/rpc/' + name)}).`,
        '',
        '| Method | Signature | Description |',
        '| --- | --- | --- |',
        ...methods.map(
          ([m, doc]) => `| [${m}](${name}/${m}.md) | ${code(signature(m, doc))} | ${cell(doc.description)} |`,
        ),
        '',
      ].join('\n'),
      json: { ...ns, kind: 'namespace', namespaceKind: ns.kind, route: `#/rpc/${name}`, methods: Object.keys(ns.methods) },
    });
    for (const [m, doc] of methods) {
      const args = exampleArgs(doc);
      const samples = rpcSamples(name, m, doc, args);
      const params = doc.params ?? [];
      const markdown = [
        `# ${name}.${m}`,
        '',
        fence('ts', signature(m, doc)),
        '',
        ...(doc.deprecated ? [`> **Deprecated.** ${doc.deprecated === true ? '' : doc.deprecated}`.trimEnd(), ''] : []),
        ...(doc.description ? [doc.description, ''] : []),
        `${doc.generator ? 'Streams: every `yield` arrives as one NDJSON frame, then the return value.' : 'Answers once.'} Interactive: [${name}.${m} in the app](${link('#/rpc/' + name + '/' + m)}).`,
        '',
        ...(params.length
          ? [
              '## Parameters',
              '',
              '| Name | Type | Required | Description |',
              '| --- | --- | --- | --- |',
              ...params.map(
                (p) =>
                  `| ${code((p.rest ? '...' : '') + p.name)} | ${code(p.type ?? 'unknown')} | ${p.optional ? 'no' : 'yes'} | ${cell(p.description)} |`,
              ),
              '',
            ]
          : ['This method takes no parameters.', '']),
        ...valueSection(doc.generator ? 'Yields' : 'Returns', doc.generator ? doc.yields : doc.returns),
        ...(doc.generator ? valueSection('Returns', doc.returns) : []),
        ...(doc.throws?.length ? ['## Throws', '', ...doc.throws.map((t) => `- ${t}`), ''] : []),
        ...(doc.examples?.length ? ['## Examples', '', ...doc.examples.map((e) => fence('ts', e) + '\n')] : []),
        '## Call it',
        '',
        fence('ts', samples.ts),
        '',
        fence('bash', samples.curl),
        '',
      ].join('\n');
      pages.push({
        path: `rpc/${name}/${m}`,
        route: `#/rpc/${name}/${m}`,
        title: `${name}.${m}`,
        kind: 'method',
        markdown,
        json: {
          kind: 'method',
          route: `#/rpc/${name}/${m}`,
          namespace: name,
          name: m,
          signature: signature(m, doc),
          ...doc,
          call: { endpoint: '/rpc', body: { className: name, methodName: m, args } },
        },
      });
    }
  }
  return pages;
}

/** The pages of the REST reference: every guide, resource and endpoint of the data block, in English. */
export function restPages(data: RestData, app: string): DocPage[] {
  const pages: DocPage[] = [];
  const link = (route: string) => `${app}${route}`;
  for (const g of data.guides) {
    const route = g.id === 'introduction' ? '#/' : `#/guides/${g.id}`;
    // the body's own markup: "## " a heading and "> " a note are Markdown already, "$ " a command or JSON
    const body = g.en.body.map((line) => (line.startsWith('$ ') ? fence(line.startsWith('$ {') ? 'json' : 'bash', line.slice(2)) : line));
    pages.push({
      path: `guides/${g.id}`,
      route,
      title: g.en.title,
      kind: 'guide',
      markdown: [`# ${g.en.title}`, '', g.en.lead, '', ...body.flatMap((b) => [b, '']), `Interactive: [${g.en.title} in the app](${link(route)}).`, ''].join('\n'),
      json: { kind: 'guide', route, id: g.id, title: g.en.title, lead: g.en.lead, body: g.en.body },
    });
  }
  for (const r of data.resources) {
    const route = `#/ref/${r.id}`;
    const endpoints = data.endpoints.filter((e) => e.resource === r.id);
    pages.push({
      path: `ref/${r.id}`,
      route,
      title: r.en.title,
      kind: 'resource',
      markdown: [
        `# ${r.en.title}`,
        '',
        r.en.lead,
        '',
        '## Endpoints',
        '',
        ...endpoints.map((e) => `- [${e.en.title}](${r.id}/${e.id}.md) - ${code(e.method + ' ' + e.path)}`),
        '',
        `## The ${r.object} object`,
        '',
        '| Field | Type | Description |',
        '| --- | --- | --- |',
        ...r.fields.map(([name, type, en]) => `| ${code(name)} | ${code(type)} | ${cell(en)} |`),
        '',
        `Interactive: [${r.en.title} in the app](${link(route)}).`,
        '',
      ].join('\n'),
      json: { kind: 'resource', route, id: r.id, title: r.en.title, lead: r.en.lead, object: r.object, fields: r.fields.map(([name, type, description]) => ({ name, type, description })), endpoints: endpoints.map((e) => e.id) },
    });
    for (const e of endpoints) {
      const eroute = `#/ref/${r.id}/${e.id}`;
      const url = data.base + '/v4' + e.path;
      const groups = ['path', 'query', 'body']
        .map((where) => [where, e.params.filter((p) => p.in === where)] as const)
        .filter(([, list]) => list.length);
      pages.push({
        path: `ref/${r.id}/${e.id}`,
        route: eroute,
        title: e.en.title,
        kind: 'endpoint',
        markdown: [
          `# ${e.en.title}`,
          '',
          code(`${e.method} ${url}`),
          '',
          e.en.lead,
          '',
          ...groups.flatMap(([where, list]) => [
            `## ${where[0]!.toUpperCase() + where.slice(1)} parameters`,
            '',
            '| Name | Type | Required | Description |',
            '| --- | --- | --- | --- |',
            ...list.map((p) => `| ${code(p.name)} | ${code(p.values ? p.values.join(' \\| ') : p.type)} | ${p.required ? 'yes' : 'no'} | ${cell(p.en)} |`),
            '',
          ]),
          '## Responses',
          '',
          '| Status | Meaning |',
          '| --- | --- |',
          ...e.codes.map((c) => `| ${c} | ${cell(data.words.en.codes[c])} |`),
          '',
          fence('bash', `curl -X ${e.method} ${url} \\\n  -H "Authorization: Bearer $ACME_API_KEY"`),
          '',
          `Interactive: [${e.en.title} in the app](${link(eroute)}).`,
          '',
        ].join('\n'),
        json: { kind: 'endpoint', route: eroute, id: e.id, resource: r.id, title: e.en.title, lead: e.en.lead, method: e.method, url, params: e.params.map(({ name, in: where, type, required, values, example, en }) => ({ name, in: where, type, required: !!required, ...(values ? { values } : {}), ...(example ? { example } : {}), description: en })), responses: e.codes.map((c) => ({ status: Number(c), description: data.words.en.codes[c] })) },
      });
    }
  }
  return pages;
}

/**
 * Every file of api-docs/: each page's `.md` and `.json`, an `index.md` / `index.json` that lists them, and an
 * `llms.txt` (the llmstxt.org shape: a title, a summary, then the pages as Markdown links).
 *
 * @param app - the app's path from api-docs/ (each page's "Interactive" link prefixes its route with it)
 */
export function apiDocsFiles(data: RestData, schema: NamespaceDoc[], app: string): Map<string, string> {
  const files = new Map<string, string>();
  const rest = restPages(data, app);
  const rpc = rpcPages(schema, app);
  for (const page of [...rest, ...rpc]) {
    const up = '../'.repeat(page.path.split('/').length - 1);
    // a page's own links are relative to its folder; the app link climbs out of api-docs/ first
    files.set(page.path + '.md', page.markdown.replaceAll(`](${app}`, `](${up}${app}`));
    files.set(page.path + '.json', JSON.stringify({ ...page.json, markdown: `${page.path.split('/').pop()}.md` }, null, 2) + '\n');
  }
  const entry = (p: DocPage) => `- [${p.title}](${p.path}.md)${p.kind === 'method' ? ' - ' + code(String(p.json.signature)) : ''}`;
  const index = [
    '# Acme API reference',
    '',
    'Every page of the API Documentation scaffold as Markdown (and as JSON beside it): the REST reference, then the defuss-rpc reference generated from the API\'s source.',
    '',
    '## REST API',
    '',
    ...rest.map(entry),
    '',
    '## defuss-rpc API',
    '',
    ...rpc.map(entry),
    '',
  ].join('\n');
  files.set('index.md', index);
  files.set('index.json', JSON.stringify([...rest, ...rpc].map((p) => ({ path: p.path, route: p.route, title: p.title, kind: p.kind, markdown: p.path + '.md', json: p.path + '.json' })), null, 2) + '\n');
  files.set(
    'llms.txt',
    [
      '# Acme API',
      '',
      '> The API reference of the defuss-shadcn API Documentation scaffold: a REST API (guides, resources, endpoints) and the same workspace as a defuss-rpc API (namespaces and methods with typed, JSDoc-documented parameters). Each link is a Markdown page; the same path with .json is its data.',
      '',
      '## REST API',
      '',
      ...rest.map(entry),
      '',
      '## defuss-rpc API',
      '',
      ...rpc.map(entry),
      '',
    ].join('\n'),
  );
  return files;
}
