// -- theme-switcher.js ----------------------------------------
// Applies tweakcn color themes by swapping a <link id="theme-css"> that
// loads the matching generated stylesheet (dist/theme/<id>.css, built from
// themes.ts by scripts/build.ts). The dogfood of the shipped theme-switcher
// component's mechanism: tokens stay static, the theme rides on top, dark
// mode needs no re-apply because each file carries :root + .dark blocks.
// Loaded synchronously so a persisted theme applies before first paint.

(function () {
  'use strict';

  // Single-namespace globals (AGENTS.md "No window globals"): this file's
  // globals live under globalThis._defussShadcn — never on window.
  globalThis._defussShadcn = globalThis._defussShadcn || {};
  const docs = (globalThis._defussShadcn.docs = globalThis._defussShadcn.docs || {});

  var STORAGE_KEY = 'defuss-shadcn-color-theme';
  var THEME_LINK_ID = 'theme-css';

  function getThemeById(id) {
    if (!docs.THEMES) return null;
    for (var i = 0; i < docs.THEMES.length; i++) {
      if (docs.THEMES[i].id === id) return docs.THEMES[i];
    }
    return null;
  }

  /**
   * Why: the base path must survive the docs/ mirror (where ../theme/ is
   * rewritten to the jsDelivr CDN at build time) — deriving it from the
   * token link's ABSOLUTE href keeps theme links valid on the local site,
   * GitHub Pages and any consumer layout. Theme files sit one folder ABOVE
   * the token file (dist/theme/<id>.css beside dist/theme/utils/*.css).
   */
  function themeHref(id) {
    var tokens = document.getElementById('tokens-css');
    if (!tokens) return id + '.css';
    return new URL('../' + id + '.css', tokens.href).href;
  }

  function applyTheme(themeId) {
    var link = document.getElementById(THEME_LINK_ID);

    // 'default' == the token file itself: no extra sheet, nothing persisted
    // validate against THEMES only once themes.js has evaluated (it loads
    // first, but be robust: an unvalidatable id just keeps the file's fate
    // to the fetch — a 404 leaves the base tokens untouched)
    if (!themeId || themeId === 'default' || (docs.THEMES && !getThemeById(themeId))) {
      if (link) link.remove();
      localStorage.removeItem(STORAGE_KEY);
      docs.__activeColorTheme = 'default';
      updateActiveState();
      updateFavicon();
      document.dispatchEvent(new CustomEvent('defuss-theme-change', { detail: { id: 'default' } }));
      return;
    }

    localStorage.setItem(STORAGE_KEY, themeId);
    docs.__activeColorTheme = themeId;
    // idempotent: header popover and the shipped theme-switcher component
    // share this link — re-applying the active theme must not re-fetch it
    if (link && link.dataset.themeId === themeId) {
      updateActiveState();
      return;
    }
    if (link) link.remove();

    link = document.createElement('link');
    link.id = THEME_LINK_ID;
    link.rel = 'stylesheet';
    link.dataset.themeId = themeId;
    link.href = themeHref(themeId);
    // insert right after the token sheet so component/docs sheets keep their
    // position — the theme only overrides the token file (same specificity,
    // later in source order wins)
    var tokens = document.getElementById('tokens-css');
    (tokens || document.head.lastElementChild).insertAdjacentElement('afterend', link);

    updateActiveState();
    updateFavicon();
    document.dispatchEvent(new CustomEvent('defuss-theme-change', { detail: { id: themeId } }));
  }

  function updateActiveState(activeId) {
    var swatches = document.querySelectorAll('.theme-swatch');
    var active = activeId || docs.__activeColorTheme || 'default';
    for (var i = 0; i < swatches.length; i++) {
      var id = swatches[i].getAttribute('data-theme-id');
      swatches[i].classList.toggle('active', id === active);
    }
  }

  /* -- Dynamic favicon --------------------------------------- */
  /* Reads --primary / --primary-foreground from live CSS and   */
  /* generates an SVG favicon as a data URI so the tab icon     */
  /* updates when the color theme or dark mode changes.         */
  var FAVICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
    '<rect width="32" height="32" rx="6" fill="{{BG}}"/>' +
    '<path fill="{{FG}}" d="M11 8h2.8v7.1c.5-.7 1.1-1.2 1.8-1.5.7-.3 1.4-.5 2.1-.5 1.2 0 2.1.4 2.8 1.1.7.8 1 1.8 1 3.1V24h-2.8v-6.3c0-.8-.2-1.4-.6-1.8-.4-.4-.9-.6-1.6-.6-.8 0-1.4.3-1.9.8-.5.5-.8 1.2-.8 2V24H11V8z"/>' +
    '</svg>';

  function updateFavicon() {
    // the theme sheet may still be loading — read it next tick so the
    // favicon reflects the new --primary rather than the old one
    setTimeout(function () {
      var style = getComputedStyle(document.documentElement);
      var bg = style.getPropertyValue('--primary').trim();
      var fg = style.getPropertyValue('--primary-foreground').trim();
      if (!bg || !fg) return;
      var svg = FAVICON_SVG.replace('{{BG}}', bg).replace('{{FG}}', fg);
      var link = document.querySelector('link[rel="icon"]');
      if (link) link.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
    }, 0);
  }

  /* -- Apply persisted theme on load (before first paint) ------
     No themes.js dependency anymore: validity is checked against
     THEMES when available, and an unknown/missing id just fails the
     fetch (theme files exist 1:1 for every THEMES id — verify's
     `theme files fresh` gate). `default` never persists. */
  var saved = localStorage.getItem(STORAGE_KEY);
  if (saved && saved !== 'default') {
    applyTheme(saved);
  } else {
    docs.__activeColorTheme = 'default';
  }

  /* The shipped theme-switcher component owns its own link; when a demo
     on a doc page changes the theme it dispatches defuss-theme-change so
     the header swatch grid + storage stay in sync (one page, one truth). */
  document.addEventListener('defuss-theme-change', function (e) {
    var id = (e.detail && e.detail.id) || 'default';
    // re-read storage: the component persists under the same key
    var stored = localStorage.getItem(STORAGE_KEY) || 'default';
    docs.__activeColorTheme = stored === id ? id : stored;
    updateActiveState(docs.__activeColorTheme);
    updateFavicon();
  });

  // Expose globally for the UI
  docs.applyTheme = applyTheme;
  docs.updateThemeActiveState = updateActiveState;
  docs.updateFavicon = updateFavicon;
})();
