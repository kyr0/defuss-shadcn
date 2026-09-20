/**
 * Why: the ONE documentation rendering mechanism for executable examples
 * (plans/cmp-schemas-and-codeexample.md §7/§22). A fenced block whose info
 * string carries the `example` directive becomes
 * `<CodeExample source={…} component=… label=… hint=… />` with the fence body
 * passed verbatim — the editor and the sandbox can never diverge because there
 * is only ever one source string. The same plugin renders the canonical
 * ```states table fence into `<StatesTable>` (plan §13: the table is the
 * machine contract verify compares against <name>.schema.json, and without
 * remark-gfm a bare table would render as pipe prose — the fence keeps the
 * authored bytes and the rendered page identical).
 *
 * The component import is injected as an `mdxjsEsm` node carrying a hand-built
 * ESTree `ImportDeclaration` (same node shape remark-mdx-frontmatter injects
 * for the `meta` export): remark-rehype passes it through (it is in @mdx-js's
 * nodeTypes list), hast-util-to-estree hoists it to the compiled module's
 * top-level imports. Pages therefore never need to import CodeExample by hand.
 */

/** mdast `code` node (only the fields the plugin touches). */
interface CodeNode {
  type: 'code';
  lang: string | null;
  meta: string | null;
  value: string;
  position?: unknown;
}

interface MdastParent {
  type: string;
  children: unknown[];
}

/** Parse a States pipe table (```states fence body) into row data. Mirrors
 * scripts/lib/schema.ts findStatesTable — kept intentionally tiny; the docs
 * parity gate re-parses with the canonical script-side parser, so a drift here
 * only affects rendering, never the gate verdict. */
export function parseStatesTable(body: string): Array<{ name: string; type: string; values: string; def: string; desc: string }> {
  const rows = body
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|'));
  if (rows.length < 2) return []; // header + separator = a valid empty contract
  const cells = (l: string) =>
    l
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim().replace(/^`+|`+$/g, ''));
  const header = cells(rows[0]);
  const at = (name: string) => header.indexOf(name);
  return rows.slice(2).map((r) => {
    const c = cells(r);
    return {
      name: c[at('State')] ?? '',
      type: c[at('Type')] ?? '',
      values: c[at('Values')] ?? '—',
      def: c[at('Default')] ?? '—',
      desc: c[at('Description')] ?? '',
    };
  });
}

/** Parse `key="value"` attributes out of a fence meta string. */
function fenceAttrs(meta: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of meta.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

const jsxAttr = (name: string, value: string) => ({
  type: 'mdxJsxAttribute',
  name,
  value: { type: 'mdxJsxAttributeValueExpression', data: { estree: { type: 'Program', body: [{ type: 'ExpressionStatement', expression: { type: 'Literal', value } }] } } },
});

function codeExampleNode(node: CodeNode, pageComponent: string): unknown {
  const attrs = fenceAttrs(node.meta ?? '');
  const attributes = [jsxAttr('source', node.value + '\n')];
  // plan §23: the page's component is the default schema — an explicit
  // component="…" only overrides it when a page demonstrates another component
  const component = attrs.component ?? pageComponent;
  if (component) attributes.push(jsxAttr('component', component));
  if (attrs.label) attributes.push(jsxAttr('label', attrs.label));
  if (attrs.hint) attributes.push(jsxAttr('hint', attrs.hint));
  if (attrs.height) attributes.push(jsxAttr('height', attrs.height));
  if (attrs.previewStyle) attributes.push(jsxAttr('previewStyle', attrs.previewStyle));
  return { type: 'mdxJsxFlowElement', name: 'CodeExample', attributes, children: [] };
}

function statesTableNode(node: CodeNode): unknown {
  return {
    type: 'mdxJsxFlowElement',
    name: 'StatesTable',
    attributes: [jsxAttr('rows', JSON.stringify(parseStatesTable(node.value)))],
    children: [],
  };
}

/** One hoisted `import { CodeExample, StatesTable } from '../lib/components/code-example'`. */
function importNode(): unknown {
  const names = ['CodeExample', 'StatesTable'];
  return {
    type: 'mdxjsEsm',
    value: `import { ${names.join(', ')} } from '../lib/components/code-example';`,
    data: {
      estree: {
        type: 'Program',
        sourceType: 'module',
        body: [
          {
            type: 'ImportDeclaration',
            specifiers: names.map((n) => ({
              type: 'ImportSpecifier',
              imported: { type: 'Identifier', name: n },
              local: { type: 'Identifier', name: n },
            })),
            source: { type: 'Literal', value: '../lib/components/code-example' },
          },
        ],
        comments: [],
      },
    },
  };
}

/** True once the page contains at least one transformed fence (import injected once). */
function transform(tree: MdastParent, pageComponent: string): boolean {
  let used = false;
  const visit = (node: MdastParent) => {
    if (!Array.isArray(node.children)) return;
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i] as CodeNode & MdastParent;
      if (child.type === 'code') {
        const meta = (child.meta ?? '').trim();
        const lang = (child.lang ?? '').toLowerCase();
        if (/(^|\s)example(\s|$)/.test(meta) || lang === 'example') {
          node.children[i] = codeExampleNode(child, pageComponent);
          used = true;
          continue;
        }
        if (lang === 'states') {
          node.children[i] = statesTableNode(child);
          used = true;
          continue;
        }
      } else if (child.children) {
        visit(child);
      }
    }
  };
  visit(tree);
  if (used) tree.children.unshift(importNode());
  return used;
}

/** remark plugin: ```… example / ```states fences → CodeExample / StatesTable. */
export function remarkDocExamples() {
  return (tree: MdastParent, file: { basename?: string }) => {
    // pages/{name}.mdx → the page's own component (plan §23)
    const pageComponent = String(file?.basename ?? '').replace(/\.mdx$/, '');
    transform(tree, /^[a-z0-9-]+$/.test(pageComponent) ? pageComponent : '');
  };
}
