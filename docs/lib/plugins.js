import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { NAV } from './nav';
import { readSkillMeta } from './repo';
/**
 * The docs build plugins. They replace what used to be runtime DOM injection
 * (layout.ts buildToc/buildPrevNext/footer) and build-time generation living
 * in scripts/ (search-index.ts): the chrome now lands statically in the
 * rendered pages.
 */
/** `<!DOCTYPE html>` — MDX/JSX cannot express it, so it is prepended here.
 *  Also strips the `xmlns` the happy-dom serializer adds to inline <svg>
 *  roots (browsers infer it in HTML parsing; the hand-written docs never
 *  carried it), and unescapes entity-escaped text inside <script>/<style>
 *  (the XML serializer escapes < > & there too, but browsers treat both as
 *  raw-text elements — a `i < n` in an inline script must survive). */
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
 * Static TOC: replicates the old runtime buildToc() — candidates are
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
 * Writes js/search-index.js into the output — same runtime contract as the
 * old scripts/lib/search-index.ts (`globalThis._defussShadcn.docs.searchIndex
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
            for (const item of section.items) {
                const meta = readSkillMeta(item.href.replace(/\.html$/, ''));
                entries.push({
                    t: item.label,
                    h: item.href,
                    s: section.heading,
                    ...(meta ? { d: meta.type } : {}),
                });
                for (const sec of collected.get(item.href) ?? []) {
                    entries.push({ t: sec.text, h: `${item.href}#${sec.id}`, s: item.label });
                }
            }
        }
        const text = '// GENERATED by src/documentation/lib/plugins.ts (defuss-ssg post hook) —\n' +
            '// do not edit by hand; the docs build rewrites it on every run.\n' +
            '// Docs search index: t = title, h = href (page or page#section), s = group\n' +
            '// (nav section for pages, page label for sections). Under .docs — this is\n' +
            '// doc-site data, not a shipped component contract (AGENTS.md "No window globals").\n' +
            'globalThis._defussShadcn = globalThis._defussShadcn || {};\n' +
            'globalThis._defussShadcn.docs = globalThis._defussShadcn.docs || {};\n' +
            `globalThis._defussShadcn.docs.searchIndex = ${JSON.stringify(entries)};\n`;
        const out = join(resolve(String(projectDir), String(config.output ?? 'dist')), 'js', 'search-index.js');
        mkdirSync(dirname(out), { recursive: true });
        writeFileSync(out, text);
    },
};
/** defuss-ssg always emits a hydration runtime ({output}/{components}/) even
 * with zero hydrated components (all docs components live in lib/ on
 * purpose). The docs tree is verified 1:1 — remove the stub. */
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
    doctypePlugin,
    tocPlugin,
    searchIndexPlugin,
    cleanHydrationRuntimePlugin,
];
//# sourceMappingURL=plugins.js.map