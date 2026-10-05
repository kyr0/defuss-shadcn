// Single-namespace globals (AGENTS.md "No window globals"): docs data
// lives under df$.shadcn.docs - never on window. This module runs BEFORE
// all.js installs df$ (document order), so `docs` stages locally and
// merges into the live namespace on DOMContentLoaded.
var docs = {};
document.addEventListener('DOMContentLoaded', function () {
    var ns = globalThis.df$ && globalThis.df$.shadcn;
    if (!ns)
        return;
    var live = (ns.docs = ns.docs || {});
    for (var k in docs)
        if (!(k in live))
            live[k] = docs[k];
    docs = live;
});
// -- shiki-highlight.js ----------------------------------------
// Doc-site syntax highlighting via Shiki CDN.
// Loaded as <script type="module"> - highlights all <pre><code> blocks.
// Uses dual themes (github-light / github-dark) with CSS-variable output
// so dark mode toggles instantly via html.dark class.
import { codeToHtml, codeToTokens } from 'https://esm.sh/shiki@3.0.0';
var langMap = {
    'language-scss': 'css',
    'language-css': 'css',
    'language-javascript': 'javascript',
    'language-js': 'javascript',
    'language-markup': 'html',
    'language-html': 'html',
    'language-bash': 'bash',
    'language-shell': 'bash'
};
var opts = {
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: false
};
async function highlightAll() {
    var blocks = document.querySelectorAll('pre > code[class*="language-"]');
    var jobs = [];
    blocks.forEach(function (code) {
        var pre = code.parentElement;
        var lang = null;
        var classes = code.className.split(/\s+/);
        for (var i = 0; i < classes.length; i++) {
            if (langMap[classes[i]]) {
                lang = langMap[classes[i]];
                break;
            }
        }
        if (!lang)
            return;
        // Decode HTML entities back to raw text for Shiki
        var raw = code.textContent;
        jobs.push(codeToHtml(raw, Object.assign({ lang: lang }, opts)).then(function (html) {
            // Parse the generated HTML to extract the new <pre>
            var tmp = document.createElement('div');
            tmp.innerHTML = html;
            var newPre = tmp.querySelector('pre');
            if (!newPre)
                return;
            // Preserve the copy button if present (kept for reference; the button is a
            // sibling of <pre> so it survives the innerHTML swap untouched)
            var _copyBtn = pre.parentElement.querySelector('.copy-btn');
            // Replace old <pre> content with Shiki output
            pre.className = newPre.className;
            // keep the authored inline style (e.g. a code-card's
            // border-radius:0/border:none reset, which layout.css keys on) and
            // append Shiki's colour variables - replacing it made nested blocks
            // regain their own rounded, bordered box inside the card
            if (!pre.dataset.authoredStyle)
                pre.dataset.authoredStyle = pre.getAttribute('style') || ' ';
            var authored = pre.dataset.authoredStyle.trim();
            var shikiStyle = newPre.getAttribute('style') || '';
            pre.setAttribute('style', authored ? authored.replace(/;?$/, ';') + shikiStyle : shikiStyle);
            pre.innerHTML = newPre.innerHTML;
        }));
    });
    // guide code windows (the shipped mockup-code, one <pre> per line):
    // colour each line in place so the CSS line numbers and the lines stay.
    // The window is dark in both modes, so it takes the dark theme alone.
    document.querySelectorAll('.mockup-code[data-lang]:not([data-highlighted])').forEach(function (win) {
        win.setAttribute('data-highlighted', '');
        var lines = Array.from(win.querySelectorAll(':scope > pre > code'));
        var raw = lines.map(function (code) { return code.textContent; }).join('\n');
        jobs.push(codeToTokens(raw, { lang: win.getAttribute('data-lang'), theme: 'github-dark' }).then(function (res) {
            res.tokens.forEach(function (line, i) {
                if (!lines[i])
                    return;
                lines[i].replaceChildren.apply(lines[i], line.map(function (token) {
                    var span = document.createElement('span');
                    span.textContent = token.content;
                    if (token.color)
                        span.style.color = token.color;
                    return span;
                }));
            });
        }));
    });
    await Promise.all(jobs);
}
// Highlight on initial load
highlightAll();
// Expose globally for spec modal and SPA re-init
docs.__shikiHighlightAll = highlightAll;
// Re-highlight after SPA navigation. onPageReady joins the live namespace
// at DOMContentLoaded (this module runs before all.js installs df$), so
// the registration waits for it.
document.addEventListener('DOMContentLoaded', function () {
    if (docs.onPageReady) {
        docs.onPageReady(function () {
            highlightAll();
        });
    }
});
