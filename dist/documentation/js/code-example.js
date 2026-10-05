"use strict";
// -- code-example.js -------------------------------------------------
// Docs glue for the live examples (docs-site-only, not shipped). Every
// `.code-example` card IS the shipped HTML Preview Editor component
// (src/components/code-example, loaded from the wysiwyg bundle); this script
// only tells it what the docs' previews are built from:
//
// - styles: the docs sheets the page loaded (tokens, utility modules, docs
//   theme + utilities, all.css → its .min twin, wysiwyg.css when a source nests
//   a card), fetched ONCE and inlined - a srcdoc with N <link>s meant N
//   render-blocking requests per preview. @font-face is stripped: an opaque-
//   origin sandbox fetches fonts in CORS mode and static hosts send no ACAO
//   header (a console error storm; font-display: swap renders the fallback).
// - scripts: all.min.js (+ wysiwyg.min.js for nested cards) as text - the
//   component inlines them as classic scripts in their own function scope.
// - tail: lucide (icon examples) and the theme-switcher demo's base URL.
// - theme: the current tweakcn sheet; a theme switch pushes it into every
//   running preview (refreshTheme), no rebuild.
//
// ?raw: under the Vite dev/preview server (bun run dev, Vitest) a plain
// .js/.css fetch gets Vite's module transform; ?raw returns the bytes (wrapped
// as `export default "…"`, unwrapped below). Static hosts ignore the query.
//
// No ES module (matches the other docs runtime scripts); runs on
// DOMContentLoaded, when all.js + wysiwyg.js have installed df$ - before the
// component builds its first preview.
(function () {
    'use strict';
    /** docs stylesheets mirrored into every preview (path fragments, host order) */
    var STYLE_FRAGMENTS = [
        'default-semantic-tokens.css',
        'sizing.css',
        'layout.css',
        // .sr-only lives here - visually-hidden demo text would render otherwise
        'accessibility.css',
        'shapes.css',
        'docs-theme.css',
        'docs-utilities.css',
        'components/all.css',
    ];
    var NESTED_SHEET = 'components/wysiwyg.css';
    var FONT_FACE = /@font-face\s*\{[^}]*\}\s*/g;
    // the theme-switcher fence's placeholder, swapped for the ABSOLUTE theme
    // folder in the preview (about:srcdoc cannot resolve relative URLs)
    var THEME_BASE_PLACEHOLDER = '../theme';
    var LUCIDE = 'https://unpkg.com/lucide@1.8.0';
    /** Vite answers ?raw with `export default "<json-escaped file>"` - unwrap it */
    function unwrapRaw(t) {
        if (t.indexOf('export default') !== 0)
            return t;
        var m = /^export default ("(?:[^"\\]|\\.)*")/.exec(t);
        if (m) {
            try {
                return JSON.parse(m[1]);
            }
            catch {
                /* not the wrapper - as-is */
            }
        }
        return t;
    }
    var cache = {};
    /** one fetch per URL per page (a failure is retried next time) */
    function fetchRaw(url) {
        if (!cache[url]) {
            cache[url] = fetch(url + (url.includes('?') ? '&' : '?') + 'raw')
                .then(function (r) {
                if (!r.ok)
                    throw new Error(url + ' → HTTP ' + r.status);
                return r.text();
            })
                .then(unwrapRaw)
                .catch(function (e) {
                delete cache[url];
                throw e;
            });
        }
        return cache[url];
    }
    /** a bundle's .min twin, the readable file when a dev tree lacks it */
    function fetchMin(url, ext) {
        return fetchRaw(url.replace(new RegExp('\\.' + ext + '(\\?.*)?$'), '.min.' + ext)).catch(function () {
            return fetchRaw(url);
        });
    }
    var $ = function (sel) {
        return globalThis.df$(sel);
    };
    /** absolute URLs of the page's sheets matching the fragments, in host order */
    function sheetUrls(fragments) {
        var out = [];
        $('link[rel="stylesheet"]').each(function (_i, l) {
            var href = l.getAttribute('href') || '';
            for (var i = 0; i < fragments.length; i++)
                if (href.indexOf(fragments[i]) >= 0) {
                    out.push(l.href);
                    break;
                }
        });
        return out;
    }
    var nests = function (source) {
        return /\bcode-example\b/.test(source || '');
    };
    var stylesPromise = null;
    /** the docs sheets, inlined once per page (bundles as their .min twins) */
    function docsStyles(source) {
        if (!stylesPromise) {
            stylesPromise = Promise.all(sheetUrls(STYLE_FRAGMENTS).map(function (url) {
                return (/components\/all\.css/.test(url) ? fetchMin(url, 'css') : fetchRaw(url)).then(function (t) {
                    return t.replace(FONT_FACE, '');
                });
            })).then(function (texts) {
                return texts.join('\n');
            });
            stylesPromise.catch(function () {
                stylesPromise = null;
            });
        }
        var nested = nests(source)
            ? Promise.all(sheetUrls([NESTED_SHEET]).map(function (url) { return fetchMin(url, 'css'); }))
            : Promise.resolve([]);
        return Promise.all([stylesPromise, nested]).then(function (parts) {
            return [{ css: [parts[0]].concat(parts[1]).join('\n') }];
        });
    }
    /** the runtime bundles as text: all (+ wysiwyg for a nested card) */
    function docsScripts(source) {
        var urls = sheetUrls(['components/all.css']).map(function (u) {
            return u.replace(/\.css(\?.*)?$/, '.js');
        });
        if (nests(source))
            urls = urls.concat(sheetUrls([NESTED_SHEET]).map(function (u) {
                return u.replace(/\.css(\?.*)?$/, '.js');
            }));
        return Promise.all(urls.map(function (u) { return fetchMin(u, 'js'); })).then(function (texts) {
            return texts.map(function (js) { return { js: js }; });
        });
    }
    /** absolute URL of the theme folder, from the token sheet the page loaded */
    function themeBaseUrl() {
        var tokens = $('#tokens-css').get(0) || $('link[href*="default-semantic-tokens.css"]').get(0);
        if (!tokens)
            return '';
        try {
            return new URL('..', tokens.href).href.replace(/\/$/, '');
        }
        catch {
            return '';
        }
    }
    /** after the runtime: lucide for icon examples + the theme-switcher demo's base URL */
    function docsTail() {
        return ('<scr' + 'ipt src="' + LUCIDE + '" data-ce-chrome></scr' + 'ipt>\n' +
            '<scr' + 'ipt data-ce-chrome>globalThis.lucide && lucide.createIcons();' +
            '(function(){var b=' + JSON.stringify(themeBaseUrl()) + ';if(!b||!globalThis.df$)return;' +
            "df$('.theme-switcher[data-theme-base]').each(function(_i,el){" +
            "if(el.dataset.themeBase==='" + THEME_BASE_PLACEHOLDER + "')el.dataset.themeBase=b});})();</scr" + 'ipt>');
    }
    /** the current tweakcn theme: an inline <style> (Theme Designer) or the preset sheet */
    function docsTheme() {
        var theme = $('#theme-css').get(0);
        if (theme && theme.tagName === 'STYLE')
            return Promise.resolve(theme.textContent || '');
        if (!theme || !theme.getAttribute('href'))
            return Promise.resolve('');
        return fetchRaw(theme.href)
            .then(function (t) {
            return t.replace(FONT_FACE, '');
        })
            .catch(function () {
            return '';
        });
    }
    document.addEventListener('DOMContentLoaded', function () {
        var api = globalThis.df$ && globalThis.df$.shadcn && globalThis.df$.shadcn.codeExample;
        if (!api)
            return; // wysiwyg.js missing - the cards stay static
        api.configure({ styles: docsStyles, scripts: docsScripts, tail: docsTail, theme: docsTheme });
        // theme-switcher dispatches this on every applyTheme
        document.addEventListener('defuss-theme-change', function () {
            api.refreshTheme();
        });
    });
})();
