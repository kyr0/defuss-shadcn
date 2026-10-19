import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { bundlesUsedIn } from './extra-bundles';
import { flattenNav, listed, NAV } from './nav';
import { pageRel, resolvePageRefs } from './page-dirs';
import { readSkillMeta } from './repo';
import { capturePageWindowPlugin, releasePagesPlugin } from './release-pages';
/**
 * The docs build plugins. They replace what used to be runtime DOM injection
 * (layout.ts buildToc/buildPrevNext/footer) and build-time generation living
 * in scripts/ (search-index.ts): the chrome now lands statically in the
 * rendered pages.
 */
/** `<!DOCTYPE html>` - MDX/JSX cannot express it, so it is prepended here.
 *  Also strips the `xmlns` the happy-dom serializer adds to inline <svg>
 *  roots (browsers infer it in HTML parsing; the hand-written docs never
 *  carried it), and unescapes entity-escaped text inside <script>/<style>
 *  (the XML serializer escapes < > & there too, but browsers treat both as
 *  raw-text elements - a `i < n` in an inline script must survive). */
export const doctypePlugin = {
    name: 'doctype',
    phase: 'page-html',
    mode: 'build',
    fn: (html) => {
        const cleaned = html
            .replaceAll('<svg xmlns="http://www.w3.org/2000/svg"', '<svg')
            .replace(/<(script|style)([^>]*)>([\s\S]*?)<\/\1>/g, (_m, tag, attrs, body) => {
            const raw = body.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
            return `<${tag}${attrs}>${raw}</${tag}>`;
        });
        return cleaned.startsWith('<!DOCTYPE') ? cleaned : `<!DOCTYPE html>\n${cleaned}`;
    },
};
/**
 * page-html: a page whose OWN markup uses an extra bundle's components (Mermaid's in-page diagrams) loads that
 * bundle - its sheet after the last bundle sheet, its module after the last bundle script, each tag marked
 * `data-extra-bundle` so the SPA router (runtime/layout.ts) adopts it when it swaps this page in. Examples load
 * their bundles inside their sandbox (runtime/code-example.ts), so a page with math only in examples loads none.
 * The href follows all.css's, before or after page-refs resolved it. VERIFIED: (verify `cross-page imports`)
 * every rendered page loads exactly the extra bundles its markup uses.
 */
export const extraBundlesPlugin = {
    name: 'extra-bundles',
    phase: 'page-html',
    mode: 'build',
    fn: (html) => {
        let out = String(html);
        const all = /<link rel="stylesheet" href="([^"]*)components\/all\.css"/.exec(out);
        if (!all)
            return out;
        for (const name of bundlesUsedIn(out)) {
            // a real tag - a code sample's text (`&lt;link ...`) may name the same file
            if (new RegExp(`<link rel="stylesheet" href="[^"]*components/${name}\\.css"`).test(out))
                continue;
            const sheets = [...out.matchAll(/<link rel="stylesheet" href="[^"]*components\/[a-z0-9-]+\.css"[^>]*>/g)].at(-1);
            const at = sheets.index + sheets[0].length;
            out = `${out.slice(0, at)}<link rel="stylesheet" href="${all[1]}components/${name}.css" data-extra-bundle="${name}" />${out.slice(at)}`;
            const scripts = [...out.matchAll(/<script type="module" src="[^"]*components\/[a-z0-9-]+\.js"><\/script>/g)].at(-1);
            if (!scripts)
                throw new Error(`extra-bundles: the page uses the ${name} bundle but loads no bundle script to place it after`);
            const end = scripts.index + scripts[0].length;
            out = `${out.slice(0, end)}<script type="module" src="${all[1]}components/${name}.js" data-extra-bundle="${name}"></script>${out.slice(end)}`;
        }
        return out;
    },
};
/** VERIFIED: page-html: pages render into section folders (page-dirs.ts), so every link
 *  and asset reference is resolved from the page's own folder - the owner's
 *  resolvePageRefs, run here on every rendered page. */
export const pageRefsPlugin = {
    name: 'page-refs',
    phase: 'page-html',
    mode: 'build',
    fn: (html, relativeOutputHtmlFilePath) => resolvePageRefs(String(html), String(relativeOutputHtmlFilePath)),
};
/** TOC-compatible id, same slug rule as the old runtime buildToc. */
const tocId = (text) => 'toc-' + text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
/** Mirrors the old getHeadingText(): anchors, badge spans and svgs are chrome,
 * not heading text. */
function headingText(el) {
    const clone = el.cloneNode(true);
    for (const c of Array.from(clone.querySelectorAll('a, span.badge, svg')))
        c.remove();
    return (clone.textContent ?? '').trim();
}
/** page path → h2 sections, filled by the toc plugin, read by the
 * search-index plugin. Module scope is safe: one config instance per build. */
const collected = new Map();
/**
 * Static TOC: replicates the old runtime buildToc() - candidates are
 * `main h2, main p.text-sm.font-medium` (excluding `.page-header details`
 * subtrees), headings without an id get `toc-{slug}`, every candidate outside
 * `.preview` gets a § permalink, and the `.site-toc` aside (rendered empty by
 * DocPage) is filled. With fewer than two headings the aside is hidden —
 * exactly the old behavior, just at build time.
 *
 * Also collects every h2 of the page (document order, like the old
 * source-regex scan) for the search index.
 */
export const tocPlugin = {
    name: 'toc',
    phase: 'page-dom',
    mode: 'build',
    fn: (dom, relativeOutputHtmlFilePath) => {
        const page = String(relativeOutputHtmlFilePath);
        const doc = dom.ownerDocument;
        const main = dom.querySelector('main');
        const tocAside = dom.querySelector('.site-toc');
        const tocContent = dom.querySelector('.site-toc-content');
        if (main && tocAside && tocContent) {
            const candidates = Array.from(main.querySelectorAll('h2, p.text-sm.font-medium')).filter((el) => !el.closest('.page-header details'));
            const headings = candidates
                .map((el) => ({ el, text: headingText(el) }))
                .filter(({ text }) => text.length > 0);
            if (headings.length < 2) {
                tocAside.setAttribute('style', 'display:none');
            }
            else {
                const title = doc.createElement('p');
                title.setAttribute('class', 'toc-title');
                title.textContent = 'On This Page';
                tocContent.appendChild(title);
                // the same links inline, right after the page header: layout.css shows
                // this copy only while the right-hand aside is hidden (< 72rem), open
                // and collapsible. It lives INSIDE <main>, so the SPA router's main
                // swap carries it along.
                const pageHeader = main.querySelector('.page-header');
                const inline = pageHeader ? doc.createElement('details') : null;
                const inlineLinks = doc.createElement('nav');
                if (inline) {
                    inline.setAttribute('class', 'page-toc');
                    inline.setAttribute('open', '');
                    const summary = doc.createElement('summary');
                    summary.textContent = `On this page (${headings.length})`;
                    inline.appendChild(summary);
                    inlineLinks.setAttribute('class', 'page-toc-links');
                    inlineLinks.setAttribute('aria-label', 'On this page');
                    inline.appendChild(inlineLinks);
                    pageHeader.after(inline);
                }
                for (const { el, text } of headings) {
                    const id = el.getAttribute('id') || tocId(text);
                    if (!el.getAttribute('id'))
                        el.setAttribute('id', id);
                    if (!el.querySelector('.heading-anchor') && !el.closest('.preview')) {
                        const anchor = doc.createElement('a');
                        anchor.setAttribute('class', 'heading-anchor');
                        anchor.setAttribute('href', `#${id}`);
                        anchor.setAttribute('aria-label', `Link to section: ${text}`);
                        anchor.textContent = '§';
                        el.insertBefore(anchor, el.firstChild);
                    }
                    const link = doc.createElement('a');
                    link.setAttribute('class', 'toc-link');
                    link.setAttribute('href', `#${id}`);
                    link.textContent = text;
                    tocContent.appendChild(link);
                    if (inline)
                        inlineLinks.appendChild(link.cloneNode(true));
                }
            }
        }
        // search-index sections: every h2 in document order (the old generator
        // regex-scanned the whole page source, including demo dialogs)
        const sections = [];
        for (const h2 of Array.from(dom.querySelectorAll('h2'))) {
            const text = headingText(h2);
            if (!text)
                continue;
            sections.push({ text, id: h2.getAttribute('id') || tocId(text) });
        }
        collected.set(page, sections);
        return dom;
    },
};
/**
 * Writes js/search-index.js into the output - same runtime contract as the
 * old scripts/lib/search-index.ts (`globalThis.df$.docs.searchIndex
 * = [{t,h,s,d?}, …]`), but sourced from the rendered pages, so section ids
 * always match the static TOC (the old index deep-linked some ids that only
 * ever existed transiently).
 */
export const searchIndexPlugin = {
    name: 'search-index',
    phase: 'post',
    mode: 'build',
    fn: (projectDir, config) => {
        const entries = [];
        for (const section of NAV) {
            // submenu children (e.g. Width & Height under Sizing) are first-class pages
            for (const item of flattenNav(listed(section.items))) {
                const meta = readSkillMeta(item.href.replace(/\.html$/, ''));
                // h: the page from the docs root (`data-display/badge.html`) - the palette
                // joins it with <html data-docs-root> (layout.ts), whatever page is open
                entries.push({
                    t: item.label,
                    h: pageRel(item.href.replace(/\.html$/, '')),
                    s: section.heading,
                    // explicit page-level type (sub-pages) wins over the component skill
                    ...(item.type ? { d: item.type } : meta ? { d: meta.type } : {}),
                });
                for (const sec of collected.get(pageRel(item.href.replace(/\.html$/, ''))) ?? collected.get(item.href) ?? []) {
                    entries.push({ t: sec.text, h: `${pageRel(item.href.replace(/\.html$/, ''))}#${sec.id}`, s: item.label });
                }
            }
        }
        const text = '// GENERATED by src/documentation/lib/plugins.ts (defuss-ssg post hook) —\n' +
            '// do not edit by hand; the docs build rewrites it on every run.\n' +
            '// Docs search index: t = title, h = href (page or page#section), s = group\n' +
            '// (nav section for pages, page label for sections). Under df$.shadcn.docs —\n' +
            '// doc-site data, not a shipped component contract (AGENTS.md "No window globals").\n' +
            '// Classic head script: stages locally, merges into the live namespace on\n' +
            '// DOMContentLoaded, after the library runtime (all.js) installed df$.\n' +
            '(function () {\n' +
            '  var staged = { searchIndex: ' + JSON.stringify(entries) + ' };\n' +
            "  document.addEventListener('DOMContentLoaded', function () {\n" +
            '    var ns = globalThis.df$ && globalThis.df$.shadcn;\n' +
            '    if (!ns) return;\n' +
            '    var live = (ns.docs = ns.docs || {});\n' +
            '    for (var k in staged) if (!(k in live)) live[k] = staged[k];\n' +
            '  });\n' +
            '})();\n';
        const out = join(resolve(String(projectDir), String(config.output ?? 'dist')), 'js', 'search-index.js');
        mkdirSync(dirname(out), { recursive: true });
        writeFileSync(out, text);
    },
};
/** defuss-ssg always emits a hydration runtime ({output}/{components}/) even
 * with zero hydrated components (all docs components live in lib/ on
 * purpose). The docs tree is verified 1:1 - remove the stub. */
export const cleanHydrationRuntimePlugin = {
    name: 'clean-hydration-runtime',
    phase: 'post',
    mode: 'build',
    fn: (projectDir, config) => {
        const dir = join(resolve(String(projectDir), String(config.output ?? 'dist')), String(config.components ?? 'components'));
        rmSync(dir, { recursive: true, force: true });
    },
};
export const docsPlugins = [
    pageRefsPlugin,
    extraBundlesPlugin,
    doctypePlugin,
    tocPlugin,
    searchIndexPlugin,
    cleanHydrationRuntimePlugin,
    // last of their phases: the page's window, then (HTML final) close it and
    // forget its module - flat memory (release-pages.ts)
    capturePageWindowPlugin,
    releasePagesPlugin,
];
//# sourceMappingURL=plugins.js.map