/**
 * Why: the ONE documentation rendering mechanism for executable examples
 * (plans/cmp-schemas-and-codeexample.md §7/§22). A fenced block whose info
 * string carries the `example` directive becomes
 * `<CodeExample source={…} component=… label=… hint=… />` with the fence body
 * passed verbatim - the editor and the sandbox can never diverge because there
 * is only ever one source string. The same plugin renders the canonical
 * ```states table fence into `<StatesTable>` (plan §13: the table is the
 * machine contract verify compares against <name>.schema.json, and without
 * remark-gfm a bare table would render as pipe prose - the fence keeps the
 * authored bytes and the rendered page identical).
 *
 * The component import is injected as an `mdxjsEsm` node carrying a hand-built
 * ESTree `ImportDeclaration` (same node shape remark-mdx-frontmatter injects
 * for the `meta` export): remark-rehype passes it through (it is in @mdx-js's
 * nodeTypes list), hast-util-to-estree hoists it to the compiled module's
 * top-level imports. Pages therefore never need to import CodeExample by hand.
 */
/** Parse a States pipe table (```states fence body) into row data. Mirrors
 * scripts/lib/schema.ts findStatesTable - kept intentionally tiny; the docs
 * parity gate re-parses with the canonical script-side parser, so a drift here
 * only affects rendering, never the gate verdict. */
export function parseStatesTable(body) {
    const rows = body
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.startsWith('|'));
    if (rows.length < 2)
        return []; // header + separator = a valid empty contract
    // backticks are KEPT verbatim: the renderer (StatesTable) turns every
    // backticked span into a <code> chip - stripping outer backticks here broke
    // multi-token cells (`true`, `false` → true<code>, </code>false)
    const cells = (l) => l
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => c.trim());
    const header = cells(rows[0]);
    const at = (name) => header.indexOf(name);
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
/**
 * Parse `key="value"` attributes out of a fence meta string. CommonMark decodes
 * character references in the info string, so an authored `&quot;` reaches us
 * as a bare `"` - a value therefore ends only at a quote followed by the next
 * `key="` or the end of the meta (a `[^"]*` value cut hints off at the first
 * embedded quote: `hint="data-variant=&quot;…` rendered as "data-variant=").
 */
export function fenceAttrs(meta) {
    const out = {};
    for (const m of meta.matchAll(/([a-zA-Z-]+)="(.*?)"(?=\s+[a-zA-Z-]+="|\s*$)/g))
        out[m[1]] = m[2];
    return out;
}
const jsxAttr = (name, value) => ({
    type: 'mdxJsxAttribute',
    name,
    value: { type: 'mdxJsxAttributeValueExpression', data: { estree: { type: 'Program', body: [{ type: 'ExpressionStatement', expression: { type: 'Literal', value } }] } } },
});
/**
 * HTML void elements close themselves; for everything else self-closing syntax
 * is only valid in foreign content (inside <svg>/<math>). In HTML flow a fence
 * line like `<div class="timeline-dot" />` OPENS an unclosed element - the
 * parser ignores the slash and nests every following sibling inside the dot
 * (that is the "Activity Feed smashed" bug). Authoring JSX-style fences is
 * natural, so the plugin normalizes here instead of nagging every page: one
 * shared transform, and since CodeExample shows exactly this string, shown
 * source == executed source stays true.
 */
const NON_VOID_HTML = 'a|abbr|article|aside|b|bdi|bdo|blockquote|button|canvas|caption|cite|code|colgroup|data|datalist|dd|del|details|dfn|dialog|div|dl|dt|em|fieldset|figcaption|figure|footer|form|h[1-6]|header|i|iframe|ins|kbd|label|legend|li|main|map|mark|menu|nav|noscript|object|ol|option|output|p|picture|pre|progress|q|rp|rt|ruby|s|samp|section|select|slot|small|span|strong|summary|sup|table|tbody|td|template|textarea|tfoot|th|thead|time|tr|u|ul|var|video';
const SELF_CLOSING_RX = new RegExp(`<(${NON_VOID_HTML})\\b([^>]*?)\\s*/>`, 'g');
/** `<tag … />` → `<tag …></tag>` for non-void HTML tags (SVG children untouched). */
export function normalizeFenceHtml(src) {
    return src.replace(SELF_CLOSING_RX, '<$1$2></$1>');
}
function codeExampleNode(node, pageComponent) {
    const attrs = fenceAttrs(node.meta ?? '');
    // the ONE source (shown + executed) - normalize before it fans out
    const attributes = [jsxAttr('source', normalizeFenceHtml(node.value) + '\n')];
    // plan §23: the page's component is the default schema - an explicit
    // component="…" only overrides it when a page demonstrates another component.
    // schema="none" opts the card out entirely (guide-page utility demos have no
    // contract: no State tab, no schema binding) - verify honors the same attr.
    const component = attrs.schema === 'none' ? '' : (attrs.component ?? pageComponent);
    if (component)
        attributes.push(jsxAttr('component', component));
    if (attrs.label)
        attributes.push(jsxAttr('label', attrs.label));
    if (attrs.hint)
        attributes.push(jsxAttr('hint', attrs.hint));
    if (attrs.height)
        attributes.push(jsxAttr('height', attrs.height));
    if (attrs.mode)
        attributes.push(jsxAttr('mode', attrs.mode));
    if (attrs.previewStyle)
        attributes.push(jsxAttr('previewStyle', attrs.previewStyle));
    return { type: 'mdxJsxFlowElement', name: 'CodeExample', attributes, children: [] };
}
function statesTableNode(node) {
    return {
        type: 'mdxJsxFlowElement',
        name: 'StatesTable',
        attributes: [jsxAttr('rows', JSON.stringify(parseStatesTable(node.value)))],
        children: [],
    };
}
/** One hoisted `import { CodeExample, StatesTable } from '../lib/components/code-example'`. */
function importNode(names = ['CodeExample', 'StatesTable'], from = '../lib/components/code-example') {
    return {
        type: 'mdxjsEsm',
        value: `import { ${names.join(', ')} } from '${from}';`,
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
                        source: { type: 'Literal', value: from },
                    },
                ],
                comments: [],
            },
        },
    };
}
/**
 * A ```mermaid fence (no `example` directive) → <MermaidDiagram>: the
 * shipped Mermaid component's markup, rendered to SVG by mermaid.js at
 * runtime. Meta: label="…" (accessible name), caption="…" (figcaption).
 */
function mermaidNode(node) {
    const attrs = fenceAttrs(node.meta ?? '');
    const attributes = [jsxAttr('source', node.value)];
    if (attrs.label)
        attributes.push(jsxAttr('label', attrs.label));
    if (attrs.caption)
        attributes.push(jsxAttr('caption', attrs.caption));
    return { type: 'mdxJsxFlowElement', name: 'MermaidDiagram', attributes, children: [] };
}
/**
 * A plain code fence (```html / ```css / ```js … - no `example`) → the docs'
 * <CodeWindow>: the shipped mockup-code window, numbered, Shiki-coloured,
 * with a Copy button. Meta: title="…" names the window (default: the
 * language). Imported under an alias, so a page's own CodeWindow import
 * never collides with the injected one.
 */
const FENCE_WINDOW = 'FenceCodeWindow';
function codeWindowNode(node) {
    const attrs = fenceAttrs(node.meta ?? '');
    const attributes = [jsxAttr('code', node.value)];
    if (node.lang)
        attributes.push(jsxAttr('lang', node.lang));
    if (attrs.title)
        attributes.push(jsxAttr('title', attrs.title));
    return { type: 'mdxJsxFlowElement', name: FENCE_WINDOW, attributes, children: [] };
}
function fenceWindowImport() {
    const from = '../lib/components/copy-button';
    return {
        type: 'mdxjsEsm',
        value: `import { CodeWindow as ${FENCE_WINDOW} } from '${from}';`,
        data: {
            estree: {
                type: 'Program',
                sourceType: 'module',
                body: [{
                        type: 'ImportDeclaration',
                        specifiers: [{ type: 'ImportSpecifier', imported: { type: 'Identifier', name: 'CodeWindow' }, local: { type: 'Identifier', name: FENCE_WINDOW } }],
                        source: { type: 'Literal', value: from },
                    }],
                comments: [],
            },
        },
    };
}
/** True once the page contains at least one transformed fence (import injected once). */
function transform(tree, pageComponent) {
    let used = false;
    let mermaid = false;
    let windows = false;
    const visit = (node) => {
        if (!Array.isArray(node.children))
            return;
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
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
                if (lang === 'mermaid') {
                    node.children[i] = mermaidNode(child);
                    mermaid = true;
                    continue;
                }
                node.children[i] = codeWindowNode(child);
                windows = true;
                continue;
            }
            else if (child.children) {
                visit(child);
            }
        }
    };
    visit(tree);
    if (used)
        tree.children.unshift(importNode());
    if (mermaid)
        tree.children.unshift(importNode(['MermaidDiagram'], '../lib/components/mermaid-diagram'));
    if (windows)
        tree.children.unshift(fenceWindowImport());
    return used || mermaid || windows;
}
/** remark plugin: ```… example / ```states / ```mermaid / plain fences → CodeExample / StatesTable / MermaidDiagram / CodeWindow. */
export function remarkDocExamples() {
    return (tree, file) => {
        // pages/{name}.mdx → the page's own component (plan §23)
        const pageComponent = String(file?.basename ?? '').replace(/\.mdx$/, '');
        transform(tree, /^[a-z0-9-]+$/.test(pageComponent) ? pageComponent : '');
    };
}
//# sourceMappingURL=mdx-example.js.map