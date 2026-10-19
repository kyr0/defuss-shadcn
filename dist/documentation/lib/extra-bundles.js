/**
 * Why: a few components are too heavy, or too specialised, to ride in the
 * all.css / all.js bundle every page pays for. They ship in an EXTRA bundle
 * instead - dist/components/{bundle}.css + .js (+ the min twins and maps
 * minify.ts derives) - which a page includes AFTER all.* (or core + its
 * components) when it uses them. The extra bundle carries only its
 * components: it binds to the df$ runtime all.js / core.js installed, like a
 * per-component .js does.
 *
 * One pure module (no fs, no DOM), read by the build (scripts/lib/bundles.ts
 * re-exports it: bundle.ts, verify.ts, stats-files.ts, sections.ts), and by
 * the docs SSG, which loads a bundle on a page whose own markup uses it
 * (lib/plugins.ts) - inside the docs SSG project, so defuss-ssg's .ssg-temp
 * copy carries it, like code-example-contract.ts.
 */
export const EXTRA_BUNDLES = {
    // the HTML Preview Editor (editor + sandboxed live preview + device toolbar) and the Editor.js integration (the
    // official block editor, loaded from its pinned build on demand) - the WYSIWYG Editors section.
    // VERIFIED: (tests/sections.test.ts; bundle.ts prints "wysiwyg.js (code-example, editorjs)") a section that IS an
    // extra bundle must list exactly its members.
    wysiwyg: ['code-example', 'editorjs'],
    // Mermaid - text diagrams through the official renderer; a part of the Diagrams section (Illustrative Diagrams,
    // used by decks, papers and apps, stays in all.*)
    mermaid: ['mermaid'],
    // the Math section: formulas typeset (KaTeX), edited (MathLive), computed (Cortex Compute Engine)
    math: ['math-renderer', 'math-editor', 'math-compute'],
    // the Visual Editor - GrapesJS over the system's markup; a part of the WYSIWYG Editors section, kept out of
    // wysiwyg.* (which every docs page loads) like Mermaid and math
    'visual-editor': ['visual-editor'],
};
/** The extra bundle a component ships in, or null when it rides in all.*. */
export function extraBundleOf(component) {
    for (const [bundle, members] of Object.entries(EXTRA_BUNDLES))
        if (members.includes(component))
            return bundle;
    return null;
}
/** True when the component is part of the all.css / all.js bundle. */
export const inAllBundle = (component) => extraBundleOf(component) === null;
/**
 * The extra bundles a rendered page's OWN markup uses, in EXTRA_BUNDLES order: a real tag (an example's escaped
 * source reads `&lt;…` and runs in its sandbox, which loads its bundles itself) whose class is a member's name or
 * starts with `<member>-` - the class naming every component follows (`.mermaid-diagram`, a bare `pre.mermaid`).
 */
export function bundlesUsedIn(html) {
    const classes = new Set();
    for (const m of html.matchAll(/<[a-z][a-z0-9-]*\s[^<>]*?\bclass="([^"]*)"/g))
        for (const c of m[1].split(/\s+/))
            if (c)
                classes.add(c);
    const uses = (member) => [...classes].some((c) => c === member || c.startsWith(`${member}-`));
    return Object.entries(EXTRA_BUNDLES)
        .filter(([, members]) => members.some(uses))
        .map(([bundle]) => bundle);
}
//# sourceMappingURL=extra-bundles.js.map