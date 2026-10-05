// -- theme-switcher.js ----------------------------------------
// Applies tweakcn color themes by swapping a <link id="theme-css"> that
// loads the matching generated stylesheet (dist/theme/<id>.css, built from
// themes.ts by scripts/build.ts). The dogfood of the shipped theme-switcher
// component's mechanism: tokens stay static, the theme rides on top, dark
// mode needs no re-apply because each file carries :root + .dark blocks.
// Loaded synchronously so a persisted theme applies before first paint
// (bundled into js/head.js with prefs.ts - the remembered choices).
import { prefs, saveCustomThemes } from './prefs.js';

(function () {
  'use strict';

  // Single-namespace globals (AGENTS.md "No window globals"): docs data
  // lives under df$.shadcn.docs - never on window. This classic script runs
  // BEFORE the library runtime (all.js, a deferred module, installs the
  // callable df$), so `docs` stages locally here and merges into the live
  // namespace on DOMContentLoaded - after every module has executed.
  var docs = {};
  document.addEventListener('DOMContentLoaded', function () {
    var ns = globalThis.df$ && globalThis.df$.shadcn;
    if (!ns) return; // library failed to load - docs chrome degrades
    var live = (ns.docs = ns.docs || {});
    for (var k in docs) if (!(k in live)) live[k] = docs[k];
    docs = live;
  });

  var THEME_LINK_ID = 'theme-css';
  // same marker shared/theme-links.ts uses, so a page whose theme switch went
  // through the loader and one that fell back to the shim stay compatible
  var THEME_LINKS_ATTR = 'data-df-theme-link';

  /* -- Custom themes (the Theme Designer) ----------------------
     A theme someone designed lives in THIS browser only: prefs.customThemes
     (a persisted store) holds an array of { id: 'custom-<slug>', label, custom: true,
     styles: { light, dark }, links: [<link> VNodes], updated }. Same token
     shape as the presets (tweakcn), applied the same way - a stylesheet in
     the theme slot right after the token file - only it is a <style> we
     write instead of a generated file we fetch. Storage can be missing or
     blocked (private mode, sandboxed frames): the store then keeps the list
     for this page only and saving reports it. */
  var CUSTOM_PREFIX = 'custom-';
  /* the only properties a custom theme may set - the tweakcn token shape */
  var TOKEN_RE = /^(background|foreground|card|card-foreground|popover|popover-foreground|primary|primary-foreground|secondary|secondary-foreground|muted|muted-foreground|accent|accent-foreground|destructive|destructive-foreground|border|input|ring|chart-[1-5]|sidebar|sidebar-foreground|sidebar-primary|sidebar-primary-foreground|sidebar-accent|sidebar-accent-foreground|sidebar-border|sidebar-ring|font-sans|font-serif|font-mono|radius|shadow-2xs|shadow-xs|shadow-sm|shadow|shadow-md|shadow-lg|shadow-xl|shadow-2xl|spacing|tracking-normal)$/;

  function isCustomId(id) {
    return typeof id === 'string' && id.indexOf(CUSTOM_PREFIX) === 0;
  }

  function readCustomThemes() {
    return prefs.customThemes.value.filter(function (t: any) {
      return t && isCustomId(t.id) && typeof t.label === 'string' && t.styles && typeof t.styles === 'object';
    }) as any[];
  }

  function writeCustomThemes(list) {
    var kept = saveCustomThemes(list);
    document.dispatchEvent(new CustomEvent('defuss-custom-themes-change'));
    return kept;
  }

  function getThemeById(id) {
    if (isCustomId(id)) {
      var custom = readCustomThemes();
      for (var c = 0; c < custom.length; c++) if (custom[c].id === id) return custom[c];
      return null;
    }
    if (!docs.THEMES) return null;
    for (var i = 0; i < docs.THEMES.length; i++) {
      if (docs.THEMES[i].id === id) return docs.THEMES[i];
    }
    return null;
  }

  /** A token value goes into a <style>: nothing may close the declaration,
   *  the block or the element. */
  function cleanValue(v) {
    return String(v).replace(/[;{}<>]/g, '').trim();
  }

  /** :root { light } + .dark { dark } - the shape build.ts writes for presets */
  function themeCss(theme) {
    var out = [];
    [[':root', 'light'], ['.dark', 'dark']].forEach(function (pair) {
      var tokens = theme.styles && theme.styles[pair[1]];
      if (!tokens) return;
      var lines = [];
      for (var k in tokens) {
        if (TOKEN_RE.test(k) && tokens[k] != null && cleanValue(tokens[k])) lines.push('  --' + k + ': ' + cleanValue(tokens[k]) + ';');
      }
      if (lines.length) out.push(pair[0] + ' {\n' + lines.join('\n') + '\n}');
    });
    return out.join('\n\n') + '\n';
  }

  /** a custom theme's font <link>s: same marker as the shipped loader, so a
   *  later preset switch clears them like any other theme's */
  function mountCustomLinks(theme) {
    // keep a link that is already there: the designer re-applies on every
    // edit, and dropping + re-adding a font sheet would flash the type
    var wanted = {};
    (theme.links || []).forEach(function (node) {
      if (!node || node.type !== 'link' || !node.attributes) return;
      var href = String(node.attributes.href || '');
      if (!/^https:\/\/fonts\.(googleapis|gstatic)\.com(\/|$)/.test(href)) return; // Google Fonts only
      wanted[(node.attributes.rel || '') + ' ' + href] = node;
    });
    var mounted = document.querySelectorAll('link[' + THEME_LINKS_ATTR + ']');
    for (var i = 0; i < mounted.length; i++) {
      var key = mounted[i].getAttribute('rel') + ' ' + mounted[i].getAttribute('href');
      if (wanted[key]) { mounted[i].setAttribute(THEME_LINKS_ATTR, theme.id); delete wanted[key]; }
      else mounted[i].remove();
    }
    for (var k in wanted) {
      var link = document.createElement('link');
      for (var name in wanted[k].attributes) link.setAttribute(name, String(wanted[k].attributes[name]));
      link.setAttribute(THEME_LINKS_ATTR, theme.id);
      document.head.appendChild(link);
    }
  }

  /** put a <style> with the theme's tokens into the theme slot */
  function mountThemeStyle(theme, slotId) {
    var old = document.getElementById(THEME_LINK_ID);
    if (old) old.remove();
    var style = document.createElement('style');
    style.id = THEME_LINK_ID;
    style.dataset.themeId = slotId;
    style.textContent = themeCss(theme);
    var tokens = document.getElementById('tokens-css');
    if (tokens) tokens.insertAdjacentElement('afterend', style);
    else document.head.appendChild(style);
    mountCustomLinks(theme);
  }

  function clearThemeLinks() {
    var stale = document.querySelectorAll('link[' + THEME_LINKS_ATTR + ']');
    for (var i = 0; i < stale.length; i++) stale[i].remove();
  }

  /**
   * Why: a theme can declare runtime resources (Google-Fonts <link>s) in its
   * theme/<id>.json sidecar (schema v1, defuss-JSX-as-JSON). The shipped
   * loader (df$.shadcn.shared.loadTheme) owns that job; this classic head
   * script runs BEFORE all.js installs it, so an early persisted-theme apply
   * uses this byte-compatible shim instead, and once core is loaded every
   * path defers to the loader (single owner, one marker attribute).
   */
  function mountThemeLinks(id) {
    var shared = globalThis.df$ && globalThis.df$.shadcn && globalThis.df$.shadcn.shared;
    if (shared && typeof shared.loadTheme === 'function') {
      Promise.resolve(shared.loadTheme(id)).catch(function (e) {
        console.warn('theme-switcher: theme resources failed —', e);
      });
      return;
    }
    if (!id || id === 'default') {
      clearThemeLinks();
      return;
    }
    var tokens = document.getElementById('tokens-css');
    var url = tokens ? new URL('../' + id + '.json', tokens.href).href : id + '.json';
    fetch(url)
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .then(function (file) {
        // re-check ownership: the loader may have booted mid-fetch (all.js is
        // a deferred module) - then it owns the links, we stand down
        var ns = globalThis.df$ && globalThis.df$.shadcn && globalThis.df$.shadcn.shared;
        if (ns && typeof ns.loadTheme === 'function') return;
        clearThemeLinks();
        if (!file || file.schema !== 'v1' || !file.links) return; // no sidecar = no resources
        file.links.forEach(function (node) {
          if (!node || node.type !== 'link' || !node.attributes) return;
          var link = document.createElement('link');
          for (var name in node.attributes) link.setAttribute(name, String(node.attributes[name]));
          link.setAttribute(THEME_LINKS_ATTR, id);
          document.head.appendChild(link);
        });
      })
      .catch(function () {
        /* offline/404 = nothing to mount - colors work without fonts */
      });
  }

  /**
   * Why: the base path must survive the docs/ mirror (where ../theme/ is
   * rewritten to the jsDelivr CDN at build time) - deriving it from the
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
    // to the fetch - a 404 leaves the base tokens untouched)
    if (!themeId || themeId === 'default' || (docs.THEMES && !getThemeById(themeId))) {
      if (link) link.remove();
      prefs.colorTheme.set('default');
      docs.__activeColorTheme = 'default';
      mountThemeLinks('default'); // drop any font links the previous theme mounted
      updateActiveState();
      updateFavicon();
      document.dispatchEvent(new CustomEvent('defuss-theme-change', { detail: { id: 'default' } }));
      return;
    }

    prefs.colorTheme.set(themeId);
    docs.__activeColorTheme = themeId;

    // a designed theme: its tokens come from storage, not from a file
    if (isCustomId(themeId)) {
      var custom = getThemeById(themeId);
      if (!custom) return applyTheme('default');
      mountThemeStyle(custom, themeId);
      mirrorThemeFonts(themeId);
      updateActiveState();
      updateFavicon();
      document.dispatchEvent(new CustomEvent('defuss-theme-change', { detail: { id: themeId } }));
      return;
    }
    // idempotent: header popover and the shipped theme-switcher component
    // share this link - re-applying the active theme must not re-fetch it
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
    // position - the theme only overrides the token file (same specificity,
    // later in source order wins). No token sheet ⇒ append: lastElementChild
    // would INSERT BEFORE the token file (afterend of the last element = the
    // very end of <head>) and the theme would lose the cascade.
    var tokens = document.getElementById('tokens-css');
    if (tokens) tokens.insertAdjacentElement('afterend', link);
    else document.head.appendChild(link);

    // theme resources (font <link>s from theme/<id>.json) ride with the sheet
    mountThemeLinks(themeId);

    updateActiveState();
    updateFavicon();
    document.dispatchEvent(new CustomEvent('defuss-theme-change', { detail: { id: themeId } }));
  }

  function updateActiveState(activeId) {
    var swatches = document.querySelectorAll('.theme-swatch');
    // a live draft is what the page shows - its swatch is the active one
    var active = document.documentElement.hasAttribute('data-theme-draft') ? '__draft' : activeId || docs.__activeColorTheme || 'default';
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
    // the theme sheet may still be loading - read it next tick so the
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
     fetch (theme files exist 1:1 for every THEMES id - verify's
     `theme files fresh` gate). `default` never persists. */
  var saved = prefs.colorTheme.value;
  if (saved && saved !== 'default') {
    applyTheme(saved);
  } else {
    docs.__activeColorTheme = 'default';
  }

  /**
   * Why: docs-theme.css re-declares --font-sans/serif/mono in a :root block
   * that comes AFTER the injected theme sheet in <head> - later source order
   * would keep Geist no matter what the theme file says. Mirroring the active
   * theme's font tokens INLINE on <html> beats every stylesheet (inline style
   * wins the cascade), so a font-bearing theme like kodama-grove actually
   * retypes the site; 'default' clears the overrides and Geist returns.
   */
  function mirrorThemeFonts(themeId, themeObject) {
    var theme = themeObject || getThemeById(themeId);
    var tokens = (theme && theme.styles && theme.styles.light) || null;
    ['font-sans', 'font-serif', 'font-mono'].forEach(function (token) {
      var value = tokens && tokens[token];
      if (value) document.documentElement.style.setProperty('--' + token, value);
      else document.documentElement.style.removeProperty('--' + token);
    });
  }

  /* The shipped theme-switcher component owns its own link; when a demo
     on a doc page changes the theme it dispatches defuss-theme-change so
     the header swatch grid + storage stay in sync (one page, one truth). */
  document.addEventListener('defuss-theme-change', function (e) {
    var id = (e.detail && e.detail.id) || 'default';
    // the component persists under the same key - its store's write reached
    // ours (same-tab peers, src/shared/store.ts)
    var stored = prefs.colorTheme.value || 'default';
    docs.__activeColorTheme = stored === id ? id : stored;
    if (!isPreviewing()) mirrorThemeFonts(docs.__activeColorTheme); // a preview keeps its own fonts
    updateActiveState(docs.__activeColorTheme);
    updateFavicon();
  });

  /* -- The designer's API --------------------------------------
     previewTheme() shows an unsaved theme on the whole page (nothing
     persisted); endThemePreview() puts the saved choice back. */
  function previewTheme(theme) {
    mountThemeStyle({ id: '__preview', styles: theme.styles, links: theme.links }, '__preview');
    mirrorThemeFonts('__preview', theme);
    updateActiveState();
    updateFavicon();
  }
  function isPreviewing() {
    var slot = document.getElementById(THEME_LINK_ID);
    return !!slot && slot.dataset.themeId === '__preview';
  }
  function endThemePreview() {
    if (!isPreviewing()) return;
    document.getElementById(THEME_LINK_ID).remove();
    applyTheme(prefs.colorTheme.value || 'default');
  }

  /* -- The live draft --------------------------------------------
     Edits made in the Theme Designer stay on while you browse: the draft
     ({ state, theme, live }) is kept in prefs.themeDraft and applied to every
     page, before first paint, until it is saved or discarded - so the new
     design can be checked on every component first. Picking a theme from
     the menu pauses it (live: false - the designer still has it); the
     draft's own swatch in the menu resumes it. <html data-theme-draft>
     marks a live draft (the menu button shows a dot). */
  function readDraft() {
    // a copy: callers flip .live and write it back
    var r = prefs.themeDraft.value;
    return r && r.theme && r.theme.styles && r.state ? structuredClone(r) : null;
  }
  function liveDraft() {
    var r = readDraft();
    return r && r.live !== false ? r : null;
  }
  function writeDraft(r) {
    // storage blocked: the store keeps the draft as long as the page
    prefs.themeDraft.set(r || null);
    document.documentElement.toggleAttribute('data-theme-draft', !!(r && r.live !== false));
    updateActiveState();
    document.dispatchEvent(new CustomEvent('defuss-theme-draft-change'));
  }
  function pauseDraft() {
    var r = liveDraft();
    if (!r) return;
    r.live = false;
    writeDraft(r);
  }
  docs.themeDraft = {
    get: readDraft,
    isLive: function () { return !!liveDraft(); },
    /** the designer: this state, as this theme, is the live draft now */
    set: function (state, theme) {
      writeDraft({ state: state, theme: { styles: theme.styles, links: theme.links }, live: true, updated: new Date().toISOString() });
    },
    /** forget the draft; what the page shows is left alone */
    clear: function () { if (readDraft()) writeDraft(null); },
    /** show a paused draft again */
    resume: function () {
      var r = readDraft();
      if (!r) return;
      r.live = true;
      writeDraft(r);
      previewTheme(r.theme);
      document.dispatchEvent(new CustomEvent('defuss-theme-change', { detail: { id: '__preview' } }));
    },
    /** throw the draft away and show the saved theme again */
    discard: function () {
      writeDraft(null);
      endThemePreview();
    },
  };
  (function () {
    var r = liveDraft();
    if (r) previewTheme(r.theme);
    document.documentElement.toggleAttribute('data-theme-draft', !!r);
  })();
  function slugify(label) {
    return String(label).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'theme';
  }
  docs.customThemes = {
    list: readCustomThemes,
    get: function (id) { return isCustomId(id) ? getThemeById(id) : null; },
    idFor: function (label) { return CUSTOM_PREFIX + slugify(label); },
    /** add or replace by id; returns false when storage refused it */
    save: function (theme) {
      var list = readCustomThemes().filter(function (t) { return t.id !== theme.id; });
      list.unshift(theme);
      return writeCustomThemes(list);
    },
    remove: function (id) {
      var ok = writeCustomThemes(readCustomThemes().filter(function (t) { return t.id !== id; }));
      if (ok && docs.__activeColorTheme === id) {
        applyTheme('default');
        var r = liveDraft();
        if (r) previewTheme(r.theme); // a live draft stays on top
      }
      return ok;
    },
    css: themeCss,
    tokenPattern: TOKEN_RE,
  };
  docs.previewTheme = previewTheme;
  docs.endThemePreview = endThemePreview;

  // Expose globally for the UI - picking a theme is a choice over the draft:
  // a live one pauses (the designer keeps it)
  docs.applyTheme = function (themeId) {
    pauseDraft();
    applyTheme(themeId);
  };
  docs.updateThemeActiveState = updateActiveState;
  docs.updateFavicon = updateFavicon;
})();
