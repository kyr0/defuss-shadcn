import remarkFrontmatter from 'remark-frontmatter';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import { docsPlugins } from './lib/plugins.js';
export default {
    pages: 'pages',
    // DOCS_OUTPUT lets scripts/build-docs.ts redirect the build (pilot/diff runs)
    output: process.env.DOCS_OUTPUT ?? '../../dist/documentation',
    // hydration is opt-in per directory; all docs components live in lib/ (static).
    // The dir is never populated — lib/plugins.ts removes the runtime stub.
    components: 'components',
    rpc: false,
    plugins: docsPlugins,
    // Minimal remark set: frontmatter only. remark-gfm is deliberately absent —
    // its autolink-literal would turn bare URLs inside code samples and prose
    // into <a> elements (docs pages are JSX-authored; tables/tasklists are not
    // used). KaTeX math from the defuss-ssg defaults is dropped too ($ appears
    // in shell/JS prose).
    remarkPlugins: [
        [remarkFrontmatter, ['yaml', 'toml']],
        [remarkMdxFrontmatter, { name: 'meta' }],
    ],
    rehypePlugins: [],
};
//# sourceMappingURL=config.js.map