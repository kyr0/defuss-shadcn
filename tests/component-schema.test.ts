import { describe, expect, it } from 'vitest';
// ?raw imports (browser-mode tests have no fs) - the REAL shipped contracts, so
// these tests pin the actual files, not fixtures (plans/cmp-schemas-and-codeexample.md §27).
import inputSchemaJson from '../src/components/input/input.schema.json?raw';
import dialogSchemaJson from '../src/components/dialog/dialog.schema.json?raw';
import inputMdx from '../src/documentation/pages/input.mdx?raw';
import dialogMdx from '../src/documentation/pages/dialog.mdx?raw';
import {
  codeExampleProblems,
  EDITOR_COMPONENTS,
  editorFor,
  exampleFences, exampleFragment, examplePlaceholders,
  findStatesTable,
  FORBIDDEN_CODE_EXAMPLE_PROPS,
  isSchemaArtifact,
  parseComponentSchema,
  parseComponentSchemaText,
  schemaManifestText,
  schemaStatesProblems,
  type ComponentSchema,
} from '../scripts/lib/schema.ts';

const parsed = (text: string): ComponentSchema => {
  const { schema, problems } = parseComponentSchemaText(text, 'test');
  if (!schema) throw new Error('fixture must parse: ' + problems.join('; '));
  return schema;
};
const inputSchema = parsed(inputSchemaJson);
const dialogSchema = parsed(dialogSchemaJson);

describe('component schemas: real files validate', () => {
  it('input.schema.json parses clean', () => {
    expect(parseComponentSchemaText(inputSchemaJson, 'input').problems).toEqual([]);
    expect(inputSchema.name).toBe('input');
    expect(Object.keys(inputSchema.states).sort()).toEqual(['disabled', 'invalid', 'readonly', 'required', 'size', 'type', 'value']);
  });

  it('dialog.schema.json parses clean', () => {
    expect(parseComponentSchemaText(dialogSchemaJson, 'dialog').problems).toEqual([]);
    expect(dialogSchema.name).toBe('dialog');
    expect(Object.keys(dialogSchema.actions).sort()).toEqual(['close', 'showModal']);
  });
});

describe('schema validator (§14): failure modes', () => {
  const base = { schemaVersion: 1, name: 'x', states: {}, actions: {} };
  const problemsOf = (raw: unknown) => parseComponentSchema(raw, 't').problems;

  it('rejects wrong schemaVersion', () => {
    expect(problemsOf({ ...base, schemaVersion: 2 }).join()).toContain('schemaVersion');
  });
  it('rejects non-object root / missing states', () => {
    expect(problemsOf('nope').join()).toContain('root must be an object');
    expect(problemsOf({ ...base, states: null }).join()).toContain('states');
  });
  it('rejects unknown state type', () => {
    expect(problemsOf({ ...base, states: { a: { type: 'color' } } }).join()).toContain('type');
  });
  it('rejects non-enum state declaring values', () => {
    expect(problemsOf({ ...base, states: { a: { type: 'string', values: ['x'] } } }).join()).toContain('only enum');
  });
  it('rejects enum without values + default outside values + duplicate values', () => {
    expect(problemsOf({ ...base, states: { a: { type: 'enum' } } }).join()).toContain('values');
    expect(problemsOf({ ...base, states: { a: { type: 'enum', values: ['x'], default: 'y' } } }).join()).toContain('default');
    expect(problemsOf({ ...base, states: { a: { type: 'enum', values: ['x', 'x'] } } }).join()).toContain('duplicate');
  });
  it('rejects non-scalar / non-finite defaults and boolean default type drift', () => {
    expect(problemsOf({ ...base, states: { a: { type: 'string', default: { o: 1 } } } }).join()).toContain('scalar');
    expect(problemsOf({ ...base, states: { a: { type: 'number', default: '1' } } }).join()).toContain('number');
    expect(problemsOf({ ...base, states: { a: { type: 'boolean', default: 'true' } } }).join()).toContain('boolean');
  });
  it('rejects malformed targets and mutations (states AND actions)', () => {
    expect(problemsOf({ ...base, states: { a: { type: 'string', target: { kind: 'document' } } } }).join()).toContain('target');
    expect(problemsOf({ ...base, states: { a: { type: 'string', target: { kind: 'selector' } } } }).join()).toContain('selector');
    expect(problemsOf({ ...base, states: { a: { type: 'string', mutation: { kind: 'voodoo', name: 'x' } } } }).join()).toContain('kind');
    expect(problemsOf({ ...base, states: { a: { type: 'string', observation: { kind: 'property' } } } }).join()).toContain('name');
    expect(
      problemsOf({
        ...base,
        actions: { oops: { target: { kind: 'nope' }, operation: { kind: 'method', name: 'click' } } },
      }).join(),
    ).toContain('target');
  });
  it('rejects unknown action methods, bad kinds, bad keys', () => {
    const act = (name: string) => ({ ...base, actions: { run: { operation: { kind: 'method', name } } } });
    expect(problemsOf(act('teleport')).join()).toContain('click');
    expect(problemsOf({ ...base, actions: { run: { operation: { kind: 'wave' } } } }).join()).toContain('method');
    expect(problemsOf({ ...base, actions: { 'Bad-Key': { operation: { kind: 'event', name: 'x' } } } }).join()).toContain('lowerCamelCase');
    expect(problemsOf({ ...base, actions: { run: {} } }).join()).toContain('operation');
  });
  it('accepts event-kind actions and selector targets (dialog/input shapes included)', () => {
    expect(
      problemsOf({ ...base, actions: { toggle: { operation: { kind: 'event', name: 'toggle' } } } }),
    ).toEqual([]);
    expect(problemsOf({ ...base, states: { a: { type: 'string', target: { kind: 'selector', selector: '.a' } } } })).toEqual([]);
  });
  it('JSON.parse failure surfaces as a problem, never a throw', () => {
    const r = parseComponentSchemaText('{ nope', 'broken');
    expect(r.schema).toBeUndefined();
    expect(r.problems.join()).toContain('broken');
  });
});

describe('States table (§13–§18): real docs match the real schemas', () => {
  for (const [name, mdx, schema] of [
    ['input', inputMdx, inputSchema],
    ['dialog', dialogMdx, dialogSchema],
  ] as const) {
    it(`${name}.mdx ## States table matches ${name}.schema.json exactly`, () => {
      const t = findStatesTable(mdx);
      expect(t.found).toBe(true);
      expect(t.problems).toEqual([]);
      expect(schemaStatesProblems(`pages/${name}.mdx`, schema, t.rows, t.problems)).toEqual([]);
    });
  }

  it('findStatesTable quotes inside fences never match', () => {
    // a page that merely QUOTES another skill's ## States (inside a fence) has no contract
    const quoted = 'text\n````md\n## States\n\n| State | Type |\n| --- | --- |\n| `x` | `string` |\n````\n';
    expect(findStatesTable(quoted).found).toBe(false);
  });

  it('a ## States heading without a ```states fence fails clearly', () => {
    const t = findStatesTable('## States\n\n| State | Type |\n| --- | --- |\n| `x` | `string` |\n');
    expect(t.found).toBe(true);
    expect(t.problems.join()).toContain('```states');
  });

  it('missing State/Type columns fail with the column name', () => {
    const t = findStatesTable('## States\n\n```states\n| Name | Type |\n| --- | --- |\n| x | string |\n```\n');
    expect(t.problems.join()).toContain('State');
  });

  it('every mismatch direction reports (missing/phantom/type/values/default/duplicate)', () => {
    const schema = {
      name: 'x',
      states: {
        a: { type: 'string', default: 'A' },
        b: { type: 'boolean', default: false },
        c: { type: 'enum', values: ['one', 'two'], default: 'one' },
      },
      actions: {},
    } as unknown as ComponentSchema;
    const good = '## States\n\n```states\n| State | Type | Values | Default | Description |\n| --- | --- | --- | --- | --- |\n';
    const problems = (rows: string) => {
      const t = findStatesTable(good + rows + '```\n');
      return schemaStatesProblems('x.mdx', schema, t.rows, t.problems);
    };
    expect(problems('| `a` | `string` | - | `"A"` | d |\n').join()).toContain('MISSING STATE `b`');
    expect(
      problems(
        '| `a` | `string` | - | `"A"` | d |\n| `b` | `boolean` | `true`, `false` | `false` | d |\n' +
          '| `c` | `enum` | `one`, `two` | `one` | d |\n| `ghost` | `string` | - | - | d |\n',
      ).join(),
    ).toContain('PHANTOM STATE `ghost`');
    expect(
      problems(
        '| `a` | `number` | - | `"A"` | d |\n| `b` | `boolean` | `true`, `false` | `false` | d |\n' +
          '| `c` | `enum` | `one`, `two` | `one` | d |\n',
      ).join(),
    ).toContain('type mismatch');
    expect(
      problems(
        '| `a` | `string` | `x` | `"A"` | d |\n| `b` | `boolean` | `true` | `false` | d |\n' +
          '| `c` | `enum` | `one`, `three` | `one` | d |\n',
      ).join(),
    ).toMatch(/missing values|unexpected values/);
    expect(
      problems(
        '| `a` | `string` | - | `"B"` | d |\n| `b` | `boolean` | `true`, `false` | `false` | d |\n' +
          '| `c` | `enum` | `one`, `two` | `one` | d |\n',
      ).join(),
    ).toContain('default mismatch');
    expect(
      problems(
        '| `a` | `string` | - | `"A"` | d |\n| `a` | `string` | - | `"A"` | d |\n' +
          '| `b` | `boolean` | `true`, `false` | `false` | d |\n| `c` | `enum` | `one`, `two` | `one` | d |\n',
      ).join(),
    ).toContain('duplicate state row');
  });
});

describe('schema publication (§24)', () => {
  it('isSchemaArtifact allow-lists exactly the published files', () => {
    expect(isSchemaArtifact('schemas/input.schema.json')).toBe(true);
    expect(isSchemaArtifact('schemas/manifest.json')).toBe(true);
    expect(isSchemaArtifact('components/input/input.schema.json')).toBe(false);
    expect(isSchemaArtifact('schemas/evil.txt')).toBe(false);
  });
  it('manifest is sorted + deterministic', () => {
    const text = schemaManifestText(['zulu', 'input']);
    expect(text).toContain('"input": "./input.schema.json"');
    expect(text.indexOf('"input"')).toBeLessThan(text.indexOf('"zulu"'));
    expect(text).toBe(schemaManifestText(['input', 'zulu']));
  });
});

describe('CodeExample contract (§5/§10/§27)', () => {
  it('forbids the dual-source props that caused the original divergence', () => {
    expect(FORBIDDEN_CODE_EXAMPLE_PROPS).toEqual(['children', 'code', 'preview', 'previewSource']);
    for (const prop of FORBIDDEN_CODE_EXAMPLE_PROPS) {
      expect(codeExampleProblems({ source: '<input>', [prop]: '<anything/>' }).join()).toContain(prop);
    }
  });
  it('the JSX-runtime empty children default is NOT a violation', () => {
    expect(codeExampleProblems({ source: '<input>', children: [] })).toEqual([]);
    expect(codeExampleProblems({ source: '<input>', children: undefined, code: null })).toEqual([]);
  });
  it('requires a non-empty source', () => {
    expect(codeExampleProblems({ source: '   ' }).join()).toContain('source');
    expect(codeExampleProblems({}).join()).toContain('source');
  });
  it('editorFor: generic fallback by type', () => {
    expect(editorFor({ type: 'string' }).kind).toBe('text');
    expect(editorFor({ type: 'number' }).kind).toBe('number');
    expect(editorFor({ type: 'boolean' }).kind).toBe('checkbox');
    expect(editorFor({ type: 'enum' }).kind).toBe('radio');
    expect(editorFor({ type: 'enum', editor: { component: 'select' } }).kind).toBe('select'); // hint wins
  });
  it('editorFor: recognized hints win, unknown hints fall back', () => {
    expect(editorFor({ type: 'enum', editor: { component: 'radio' } }).kind).toBe('radio');
    expect(editorFor({ type: 'number', editor: { component: 'text' } }).kind).toBe('text');
    expect(editorFor({ type: 'string', editor: { component: 'holo' } }).kind).toBe('text');
    expect(editorFor({ type: 'number', editor: { component: 'number', props: { step: 0.5 } } }).props).toEqual({ step: 0.5 });
    for (const c of EDITOR_COMPONENTS) expect(editorFor({ type: 'string', editor: { component: c } }).kind).toBe(c);
  });
});

describe('example fences (§7/§21)', () => {
  it('input.mdx fences carry verbatim bodies + attrs', () => {
    const fences = exampleFences(inputMdx);
    expect(fences.length).toBeGreaterThanOrEqual(10);
    const withScript = fences.find((f) => f.body.includes('df$('));
    expect(withScript, 'the df$ example fence exists').toBeTruthy();
    // verbatim: the fence body bytes reach the parser untouched (§4 one source)
    expect(withScript!.body).toContain('console.log("search term:", event.target.value);');
    expect(fences.every((f) => f.body.trim() !== '')).toBe(true);
    expect(fences.every((f) => f.label)).toBe(true);
  });
  it('plain code fences are not examples', () => {
    expect(exampleFences('```ts\nconst a = 1;\n```\n')).toEqual([]);
    expect(exampleFences('```states\n| State | Type |\n| --- | --- |\n| a | string |\n```\n')).toEqual([]);
  });
  it('component override attribute parses (plan §23)', () => {
    const f = exampleFences('```html example component="dialog" label="X"\n<d></d>\n```')[0];
    expect(f.component).toBe('dialog');
    expect(f.label).toBe('X');
  });
});

describe('examplePlaceholders (executed fences never abbreviate)', () => {
  it('flags an element whose whole content is "..."', () => {
    expect(examplePlaceholders('<svg class="spinner" data-size="xs">...</svg>\n<thead> ... </thead>')).toEqual([
      '<svg class="spinner" data-size="xs">...</svg>',
      '<thead> ... </thead>',
    ]);
  });
  it('allows real content, a real ellipsis and text that merely contains dots', () => {
    expect(examplePlaceholders('<a aria-disabled="true">…</a><p>Loading...</p><svg><path d="M1 1"></path></svg>')).toEqual([]);
  });
});

describe('exampleFragment (executed fences carry their container)', () => {
  it('flags an example that starts with an element needing a parent', () => {
    expect(exampleFragment('\n<li class="step" data-status="error">\n  …\n</li>')).toBe('<li class="step" data-status="error">');
    expect(exampleFragment('<!-- a row -->\n<tr class="table-row"><td>1</td></tr>')).toBe('<tr class="table-row">');
  });
  it('accepts an example that brings its own list / table', () => {
    expect(exampleFragment('<ol class="steps">\n  <li class="step"></li>\n</ol>')).toBeNull();
    expect(exampleFragment('<table class="table"><tr><td>1</td></tr></table>')).toBeNull();
  });
});
