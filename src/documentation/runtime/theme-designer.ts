// -- theme-designer.js - the Theme Designer page ------------------------------
// Loaded on demand by site.js when a page holds [data-theme-designer]; it
// registers docs.initThemeDesigner(root) / docs.leaveThemeDesigner(). The
// select box picks the theme the site shows; an edit goes to a CUSTOM theme -
// the first edit of a built-in theme starts "Untitled custom theme", a custom
// theme changes in place - and every change saves as you go through
// docs.customThemes (theme-switcher.js): the same token shape as the tweakcn
// presets, kept in this browser (prefs.customThemes), listed on top of the
// header's theme menu. While you type, docs.previewTheme() shows the edit on
// the whole page at once; the save that follows applies the stored theme.
// VERIFIED: (theme-designer.e2e) every promise above, in a fresh browser.
(function () {
  'use strict';
  var ns = globalThis.df$ && globalThis.df$.shadcn;
  if (!ns || !ns.docs) return;
  var docs = ns.docs;
  // the ONE query runtime (core): markup is written through df$, never innerHTML
  var dfDollar = globalThis.df$;
  /** the first match of `sel` inside `scope` (an element or a document), via df$ */
  function one(scope, sel) { return dfDollar(scope).find(sel).get(0); }
  /** every match of `sel` inside `scope`, via df$, as an array */
  function all(scope, sel) { return dfDollar(scope).find(sel).toArray(); }

  // -- the token model ---------------------------------------------------------
  var GROUPS = [
    ['Primary', ['primary', 'primary-foreground']],
    ['Secondary', ['secondary', 'secondary-foreground']],
    ['Accent', ['accent', 'accent-foreground']],
    ['Base', ['background', 'foreground']],
    ['Card', ['card', 'card-foreground']],
    ['Popover', ['popover', 'popover-foreground']],
    ['Muted', ['muted', 'muted-foreground']],
    ['Destructive', ['destructive', 'destructive-foreground']],
    ['Border & input', ['border', 'input', 'ring']],
    ['Chart', ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5']],
    ['Sidebar', ['sidebar', 'sidebar-foreground', 'sidebar-primary', 'sidebar-primary-foreground', 'sidebar-accent', 'sidebar-accent-foreground', 'sidebar-border', 'sidebar-ring']],
  ];
  var COLORS = [];
  GROUPS.forEach(function (g) { COLORS.push.apply(COLORS, g[1]); });
  /* text token → the surface it sits on (contrast badges, WCAG) */
  var ON = {
    'primary-foreground': 'primary', 'secondary-foreground': 'secondary', 'accent-foreground': 'accent',
    foreground: 'background', 'card-foreground': 'card', 'popover-foreground': 'popover',
    'muted-foreground': 'background', 'destructive-foreground': 'destructive', 'sidebar-foreground': 'sidebar',
    'sidebar-primary-foreground': 'sidebar-primary', 'sidebar-accent-foreground': 'sidebar-accent',
  };
  var FONT_SLOTS = [['sans', 'Sans', 'sans-serif'], ['serif', 'Serif', 'serif'], ['mono', 'Mono', 'monospace']];
  var FONTS = {
    sans: ['Inter', 'Geist', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Nunito', 'Nunito Sans', 'Raleway', 'Work Sans', 'DM Sans', 'Manrope', 'Plus Jakarta Sans', 'Outfit', 'Figtree', 'Onest', 'Space Grotesk', 'IBM Plex Sans', 'Source Sans 3', 'Noto Sans', 'Rubik', 'Karla', 'Mulish', 'Lexend', 'Sora', 'Urbanist', 'Archivo', 'Barlow', 'Public Sans', 'Quicksand', 'Josefin Sans', 'Fira Sans', 'PT Sans', 'Ubuntu', 'Cabin', 'Hanken Grotesk', 'Instrument Sans', 'Albert Sans', 'Red Hat Display', 'Be Vietnam Pro', 'Atkinson Hyperlegible', 'Bricolage Grotesque', 'Oxanium', 'Comfortaa', 'Fredoka', 'Syne'],
    serif: ['Merriweather', 'Playfair Display', 'Lora', 'Source Serif 4', 'Libre Baskerville', 'EB Garamond', 'Cormorant Garamond', 'Crimson Text', 'PT Serif', 'Noto Serif', 'Roboto Serif', 'DM Serif Display', 'Fraunces', 'Spectral', 'Bitter', 'Domine', 'Literata', 'Newsreader', 'Instrument Serif', 'Young Serif', 'Zilla Slab', 'Arvo', 'Roboto Slab'],
    mono: ['JetBrains Mono', 'Fira Code', 'Geist Mono', 'IBM Plex Mono', 'Source Code Pro', 'Roboto Mono', 'Space Mono', 'Ubuntu Mono', 'Inconsolata', 'DM Mono', 'Red Hat Mono', 'Martian Mono', 'Azeret Mono', 'Victor Mono', 'Fira Mono', 'Courier Prime', 'Anonymous Pro', 'Spline Sans Mono'],
  };
  var ANY_HINT = 'Type a name to use any Google Font';
  var STACK = { sans: 'ui-sans-serif, system-ui, sans-serif', serif: 'ui-serif, Georgia, serif', mono: 'ui-monospace, SFMono-Regular, monospace' };
  /* the link tokens (Typography): not in the tweakcn export, so a theme only
     carries them when they differ from the token file's defaults */
  var LINK_LINES = [['underline', 'Underline'], ['underline dotted', 'Dotted underline'], ['underline dashed', 'Dashed underline'], ['underline wavy', 'Wavy underline'], ['underline double', 'Double underline'], ['none', 'No line']];
  var UNTITLED = 'Untitled custom theme';

  // -- colour maths: any CSS colour → sRGB via a 1px canvas ----------------------
  var cx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  function isColor(v) { return !!v && typeof CSS !== 'undefined' && CSS.supports('color', v); }
  function rgb(v) {
    if (!cx || !isColor(v)) return null;
    cx.canvas.width = cx.canvas.height = 1;
    cx.clearRect(0, 0, 1, 1);
    cx.fillStyle = '#000';
    cx.fillStyle = v;
    cx.fillRect(0, 0, 1, 1);
    var d = cx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
  }
  function hex(c) { return '#' + c.map(function (n) { return n.toString(16).padStart(2, '0'); }).join(''); }
  function lin(n) { n /= 255; return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4); }
  function luminance(c) { return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]); }
  function contrast(a, b) {
    var x = rgb(a), y = rgb(b);
    if (!x || !y) return null;
    var l1 = luminance(x), l2 = luminance(y);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }
  /** sRGB → OKLCH (Björn Ottosson's OKLab), the notation of this system's tokens */
  function oklch(c) {
    var r = lin(c[0]), g = lin(c[1]), b = lin(c[2]);
    var l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    var m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    var s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    var L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    var A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    var B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    var C = Math.sqrt(A * A + B * B);
    var H = (Math.atan2(B, A) * 180) / Math.PI;
    if (H < 0) H += 360;
    var n = function (x, d) { return String(Number(x.toFixed(d))); };
    return C < 0.0005 ? 'oklch(' + n(L, 3) + ' 0 0)' : 'oklch(' + n(L, 3) + ' ' + n(C, 3) + ' ' + n(H, 1) + ')';
  }

  // -- fonts ---------------------------------------------------------------------
  function gfHref(family, weights) {
    return 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(family.trim()).replace(/%20/g, '+') + (weights ? ':wght@400;500;600;700' : '') + '&display=swap';
  }
  var fontLoads = {};
  /** load a Google Font for the page; resolves with the stylesheet URL that
   *  worked (four weights, else the family's default - not every family has
   *  every weight, and css2 answers a missing one with an error) */
  function loadFont(family) {
    if (fontLoads[family]) return fontLoads[family];
    fontLoads[family] = new Promise(function (resolve, reject) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.dataset.tdFont = family;
      var attempt = function (weights) {
        link.href = gfHref(family, weights);
        link.onload = function () { resolve(link.href); };
        link.onerror = function () {
          if (weights) attempt(false);
          else { link.remove(); delete fontLoads[family]; reject(new Error('not a Google Font: ' + family)); }
        };
      };
      attempt(true);
      document.head.appendChild(link);
    });
    return fontLoads[family];
  }
  /** a font name rendered in itself costs one tiny request: css2 &text= */
  var previewed = {};
  function previewFont(family) {
    if (previewed[family]) return;
    previewed[family] = true;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(family).replace(/%20/g, '+') + '&text=' + encodeURIComponent(family) + '&display=swap';
    document.head.appendChild(link);
  }
  function familyOf(stack) {
    var first = String(stack || '').split(',')[0].trim().replace(/^["']|["']$/g, '');
    return first && !/^(ui-|system-ui|sans-serif|serif|monospace|-apple-system|var\()/.test(first) ? first : null;
  }

  // -- reading token values ----------------------------------------------------
  /** the token file's own values for a mode: the theme slot and the inline
   *  font mirror are switched off for one synchronous read (no paint happens
   *  in between), the mode class flipped if needed */
  function readBase(mode) {
    var html = document.documentElement;
    var slot = one(document, '#theme-css');
    var wasDark = html.classList.contains('dark');
    var inline = html.getAttribute('style');
    if (slot) slot.disabled = true;
    ['font-sans', 'font-serif', 'font-mono'].forEach(function (k) { html.style.removeProperty('--' + k); });
    html.classList.toggle('dark', mode === 'dark');
    var cs = getComputedStyle(html);
    var out = {};
    COLORS.forEach(function (k) { out[k] = cs.getPropertyValue('--' + k).trim(); });
    out.radius = cs.getPropertyValue('--radius').trim() || '0.625rem';
    out['tracking-normal'] = cs.getPropertyValue('--tracking-normal').trim() || '0em';
    out['link-text-decoration'] = cs.getPropertyValue('--link-text-decoration').trim() || 'underline';
    out['link-underline-offset'] = cs.getPropertyValue('--link-underline-offset').trim() || '4px';
    html.classList.toggle('dark', wasDark);
    if (inline === null) html.removeAttribute('style'); else html.setAttribute('style', inline);
    if (slot) slot.disabled = false;
    return out;
  }
  var BASE = null;
  function base() {
    if (!BASE) BASE = { light: readBase('light'), dark: readBase('dark') };
    return BASE;
  }
  function presetById(id) {
    if (!id || id === 'default') return { id: 'default', label: 'Default' };
    if (docs.customThemes && docs.customThemes.get(id)) return docs.customThemes.get(id);
    return (docs.THEMES || []).filter(function (t) { return t.id === id; })[0] || { id: 'default', label: 'Default' };
  }

  // -- state ---------------------------------------------------------------------
  // S, the values: { light: {token: value}, dark: {…}, radius, tracking,
  //   fonts: { sans: {family, href} | null, … }, shadow: null | {…},
  //   link: { line, offset }, extra: { light, dark } }
  // cur, the theme they belong to: { id, label, custom, from } - kept apart, so
  // Back / Next step through values and never back to a built-in theme
  var S = null, cur = null;
  var root = null;
  var history = [], at = -1, historyTimer = 0, saveTimer = 0, frame = 0, storageWarned = false;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function stateFrom(id) {
    var t = presetById(id);
    var b = clone(base());
    var st = { light: {}, dark: {}, radius: b.light.radius, tracking: b.light['tracking-normal'], fonts: { sans: null, serif: null, mono: null }, shadow: null, link: { line: b.light['link-text-decoration'], offset: b.light['link-underline-offset'] }, extra: { light: {}, dark: {} } };
    ['light', 'dark'].forEach(function (mode) {
      var own = (t.styles && t.styles[mode]) || {};
      COLORS.forEach(function (k) { st[mode][k] = own[k] || b[mode][k]; });
      // the theme's other tokens (its shadow scale, spacing) ride along as-is
      for (var k in own) if (isExtra(k)) st.extra[mode][k] = own[k];
    });
    var lt = (t.styles && t.styles.light) || {};
    if (lt.radius) st.radius = lt.radius;
    if (lt['tracking-normal']) st.tracking = lt['tracking-normal'];
    if (lt['link-text-decoration']) st.link.line = lt['link-text-decoration'];
    if (lt['link-underline-offset']) st.link.offset = lt['link-underline-offset'];
    var hrefs = (t.links || []).map(function (n) { return (n && n.attributes && n.attributes.href) || ''; });
    FONT_SLOTS.forEach(function (slot) {
      var fam = familyOf(lt['font-' + slot[0]]);
      if (!fam) return;
      var key = 'family=' + encodeURIComponent(fam).replace(/%20/g, '+');
      var href = hrefs.filter(function (h) { return h.indexOf(key + ':') >= 0 || h.indexOf(key + '&') >= 0; })[0] || null;
      st.fonts[slot[0]] = { family: fam, href: href };
    });
    if (t.designer && t.designer.shadow) st.shadow = clone(t.designer.shadow);
    return st;
  }
  /** a state from elsewhere (an old draft, history) gets the fields added since */
  function normalize(st) {
    var b = base();
    st.extra = st.extra || { light: {}, dark: {} };
    st.link = st.link || { line: b.light['link-text-decoration'], offset: b.light['link-underline-offset'] };
    return st;
  }
  function identity(id) {
    var t = presetById(id);
    return { id: t.id, label: t.label || 'Default', custom: !!t.custom, from: (t.designer && t.designer.from) || t.id };
  }

  /** a theme token the controls do not edit: shadows, spacing */
  function isExtra(k) {
    return docs.customThemes.tokenPattern.test(k) && COLORS.indexOf(k) < 0 && k !== 'radius' && k !== 'tracking-normal' && k.indexOf('font-') !== 0 && k.indexOf('link-') !== 0;
  }

  var SHADOW_DEFAULT = { color: '#000000', opacity: 0.1, blur: 3, spread: 0, x: 0, y: 1 };
  /** tweakcn's recipe: one shadow description → the whole --shadow-* scale */
  function shadowScale(sh) {
    var c = rgb(sh.color) || [0, 0, 0];
    var col = function (k) { return 'rgb(' + c.join(' ') + ' / ' + Math.min(1, sh.opacity * k).toFixed(2) + ')'; };
    var px = function (n) { return n + 'px'; };
    var one = function (k) { return px(sh.x) + ' ' + px(sh.y) + ' ' + px(sh.blur) + ' ' + px(sh.spread) + ' ' + col(k); };
    var two = function (y2, b2) { return one(1) + ', ' + px(sh.x) + ' ' + px(y2) + ' ' + px(b2) + ' ' + px(sh.spread - 1) + ' ' + col(1); };
    return { 'shadow-2xs': one(0.5), 'shadow-xs': one(0.5), 'shadow-sm': two(1, 2), shadow: two(1, 2), 'shadow-md': two(2, 4), 'shadow-lg': two(4, 6), 'shadow-xl': two(8, 10), 'shadow-2xl': one(2.5) };
  }

  /** the state as a theme object - the shape theme-switcher applies & saves */
  function themeOf(st) {
    var styles = { light: {}, dark: {} };
    var links = [];
    var b = base().light;
    ['light', 'dark'].forEach(function (mode) {
      COLORS.forEach(function (k) { styles[mode][k] = st[mode][k]; });
      var extra = (st.extra && st.extra[mode]) || {};
      for (var x in extra) styles[mode][x] = extra[x];
      styles[mode].radius = st.radius;
      if (st.tracking && st.tracking !== b['tracking-normal']) styles[mode]['tracking-normal'] = st.tracking;
      if (st.link && st.link.line !== b['link-text-decoration']) styles[mode]['link-text-decoration'] = st.link.line;
      if (st.link && st.link.offset !== b['link-underline-offset']) styles[mode]['link-underline-offset'] = st.link.offset;
      FONT_SLOTS.forEach(function (slot) {
        var f = st.fonts[slot[0]];
        if (f) styles[mode]['font-' + slot[0]] = "'" + f.family + "', " + STACK[slot[0]];
      });
      if (st.shadow) {
        var scale = shadowScale(st.shadow);
        for (var k in scale) styles[mode][k] = scale[k];
      }
    });
    FONT_SLOTS.forEach(function (slot) {
      var f = st.fonts[slot[0]];
      if (f && f.href && !links.some(function (l) { return l.attributes.href === f.href; })) links.push({ type: 'link', attributes: { rel: 'stylesheet', href: f.href } });
    });
    if (links.length) links.unshift({ type: 'link', attributes: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' } });
    return { styles: styles, links: links };
  }

  // -- applying, history, saving ---------------------------------------------------
  function mode() { return document.documentElement.classList.contains('dark') ? 'dark' : 'light'; }
  /** the edit on the whole page at once (the save that follows applies the stored theme) */
  function apply() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(function () {
      if (!S) return;
      docs.previewTheme(themeOf(S));
      paintPalette();
      syncApps();
    });
  }

  // -- the scaffold apps: same-origin pages (app-*.html) the theme is written
  //    into - an iframe per preview tab, and the full-screen windows opened
  //    from there; both follow every edit and the header's light / dark switch
  var apps = [], appObserver = null;
  function syncDoc(d) {
    if (!d || !d.head || !S) return;
    var theme = themeOf(S);
    var style = one(d, '#theme-css');
    if (!style) {
      style = d.createElement('style');
      style.id = 'theme-css';
      var tokens = one(d, '#tokens-css');
      if (tokens) tokens.after(style); else d.head.appendChild(style);
    }
    style.textContent = docs.customThemes.css(theme);
    var html = d.documentElement;
    html.classList.toggle('dark', mode() === 'dark');
    // fonts inline, like the site: the app's docs-theme.css re-declares them
    FONT_SLOTS.forEach(function (slot) {
      var v = theme.styles.light['font-' + slot[0]];
      if (v) html.style.setProperty('--font-' + slot[0], v); else html.style.removeProperty('--font-' + slot[0]);
    });
    theme.links.forEach(function (l) {
      var href = l.attributes.href;
      if (l.attributes.rel !== 'stylesheet' || one(d, 'link[data-td-font][href="' + CSS.escape(href) + '"]')) return;
      var link = d.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.dataset.tdFont = '';
      d.head.appendChild(link);
    });
  }
  function appDoc(a) {
    try { return a.frame ? a.frame.contentDocument : a.win && !a.win.closed ? a.win.document : null; } catch { return null; }
  }
  function syncApps() {
    apps = apps.filter(function (a) { return a.frame ? a.frame.isConnected : a.win && !a.win.closed; });
    apps.forEach(function (a) { syncDoc(appDoc(a)); });
  }
  /** an app tab: its iframe is made when the tab is first shown */
  function mountApp(box) {
    if (one(box, 'iframe')) return;
    var f = document.createElement('iframe');
    f.className = 'td-app-frame';
    f.src = box.dataset.tdApp;
    f.title = box.dataset.title + ' - live preview of your theme';
    f.dataset.loading = '';
    f.addEventListener('load', function () { syncDoc(f.contentDocument); delete f.dataset.loading; });
    box.appendChild(f);
    apps.push({ frame: f });
  }
  function openAppWindow(href) {
    var w = open(href, '_blank');
    if (!w) return false;
    var a = { win: w };
    apps.push(a);
    w.addEventListener('DOMContentLoaded', function () { syncDoc(appDoc(a)); });
    w.addEventListener('load', function () { syncDoc(appDoc(a)); });
    return true;
  }

  /** a name no other custom theme carries, and its id: "X", "X 2", "X 3" … */
  function freeName(label, except) {
    var mine = docs.customThemes.list();
    var taken = function (l, id) { return mine.some(function (t) { return t.id !== except && (t.id === id || t.label.toLowerCase() === l.toLowerCase()); }); };
    var name = label, n = 2;
    while (taken(name, docs.customThemes.idFor(name))) name = label + ' ' + n++;
    return { label: name, id: docs.customThemes.idFor(name) };
  }
  /** the first edit of a built-in theme starts a custom one - selected at once */
  function fork() {
    var n = freeName(UNTITLED);
    cur = { id: n.id, label: n.label, custom: true, from: cur.id };
    persist();
    toast('“' + n.label + '” started', 'Edits to a built-in theme go to a custom copy - it saves as you go.');
  }
  /** an edit: shown at once, recorded once you pause, saved as you go */
  function changed(record) {
    if (!S) return;
    if (!cur.custom) fork();
    apply();
    if (record !== false) {
      clearTimeout(historyTimer);
      historyTimer = setTimeout(remember, 350);
    }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 400);
  }
  /** store the custom theme and apply it: the site, the menu and the select follow */
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = 0;
    if (!S || !cur || !cur.custom) return;
    var t = themeOf(S);
    t.id = cur.id;
    t.label = cur.label;
    t.custom = true;
    t.updated = new Date().toISOString();
    t.designer = { from: cur.from, shadow: S.shadow };
    if (!docs.customThemes.save(t) && !storageWarned) {
      storageWarned = true;
      toast('Not kept in this browser', 'Storage is blocked here: the theme lasts while the page is open - export the CSS to keep it.');
    }
    cancelAnimationFrame(frame);
    docs.applyTheme(cur.id);
    paintBar();
  }
  function flush() { if (saveTimer) persist(); }
  function remember() {
    var snap = JSON.stringify(S);
    if (history[at] === snap) return;
    history = history.slice(0, at + 1);
    history.push(snap);
    if (history.length > 100) history.shift();
    at = history.length - 1;
    syncHistoryButtons();
  }
  function syncHistoryButtons() {
    if (!root) return;
    one(root, '[data-td-undo]').disabled = at <= 0;
    one(root, '[data-td-redo]').disabled = at >= history.length - 1;
    one(root, '[data-td-reset]').disabled = history.length < 2 || history[0] === JSON.stringify(S);
  }
  function travel(d) {
    clearTimeout(historyTimer);
    remember();
    var next = at + d;
    if (next < 0 || next >= history.length) return;
    at = next;
    S = JSON.parse(history[at]);
    syncHistoryButtons();
    paintAll();
    changed(false);
  }
  /** a theme's values into the editor: a fresh history, nothing saved */
  function load(st) {
    S = normalize(st);
    history = [];
    at = -1;
    remember();
    paintAll();
  }
  /** the select box: the site shows the theme, the editor holds it */
  function select(id) {
    flush();
    // identity first: applyTheme's defuss-theme-change then names the theme we hold
    cur = identity(id);
    docs.applyTheme(id);
    load(stateFrom(id));
    loadThemeFonts();
  }

  // -- building the controls ----------------------------------------------------
  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (html != null) dfDollar(n).html(html);
    return n;
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

  /** one editable colour: swatch picker + any-CSS-colour field (+ contrast) */
  function tokenRow(k, autofocus) {
    var row = el('div', { class: 'td-token', 'data-token': k });
    dfDollar(row).html('<span class="td-token-name"><span>--' + k + '</span>' + (ON[k] ? '<span class="td-contrast" data-contrast></span>' : '') + '</span>' +
      '<div class="color-picker"><input type="color" aria-label="Pick --' + k + '"></div>' +
      '<input class="input" type="text" spellcheck="false" autocomplete="off" aria-label="--' + k + ' value"' + (autofocus ? ' autofocus' : '') + '>');
    return row;
  }

  function slider(key, label, min, max, step, unit) {
    return '<div class="td-setting"><span class="td-setting-head"><label for="td-' + key + '">' + label + '</label><output data-td-out="' + key + '"></output></span>' +
      '<input class="slider" type="range" id="td-' + key + '" data-td-range="' + key + '" min="' + min + '" max="' + max + '" step="' + step + '" data-unit="' + unit + '"></div>';
  }

  var CHEVRON = '<svg class="combobox-chevron" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>';
  var SEARCH = '<svg class="combobox-search-icon" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>';
  function fontPicker(slot) {
    var k = slot[0];
    // first row: any Google Font - it turns into "Use “…”" as you type a
    // name the list does not have (typed-font capture listener in wire())
    var opts = ['<div role="option" id="td-f-' + k + '-any" class="combobox-item td-any-font" aria-disabled="true" aria-selected="false">' + ANY_HINT + '</div>',
      '<div role="option" id="td-f-' + k + '-none" class="combobox-item" data-value="" aria-selected="false">Theme default</div>']
      .concat(FONTS[k].map(function (f, i) {
        return '<div role="option" id="td-f-' + k + '-' + i + '" class="combobox-item" data-value="' + esc(f) + '" data-font="' + esc(f) + '" aria-selected="false" style="font-family:\'' + esc(f) + '\', ' + STACK[k] + '">' + esc(f) + '</div>';
      })).join('');
    return '<div class="td-setting" data-font-slot="' + k + '">' +
      '<span class="td-setting-head"><span id="td-fl-' + k + '">' + slot[1] + '</span><output data-td-fontstate="' + k + '"></output></span>' +
      '<div class="combobox">' +
      '<button class="btn combobox-trigger" data-variant="outline" type="button" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="td-fl-' + k + '" aria-controls="td-fp-' + k + '"><span class="combobox-value" data-placeholder="Theme default">Theme default</span>' + CHEVRON + '</button>' +
      '<div id="td-fp-' + k + '" class="combobox-content" popover><div class="combobox-search">' + SEARCH +
      '<input class="combobox-search-input" type="text" role="combobox" autocomplete="off" aria-expanded="true" aria-controls="td-fb-' + k + '" aria-activedescendant="" aria-autocomplete="list" placeholder="Search or type any Google Font…"></div>' +
      '<div id="td-fb-' + k + '" role="listbox" class="combobox-listbox" aria-label="' + slot[1] + ' fonts">' + opts + '</div></div></div></div>';
  }

  /* the settings tabs: Fonts, Shape, Shadows, Typography (Colors is the palette) */
  function buildPanes() {
    var pane = function (id) { return dfDollar(root).find('[data-td-pane="' + id + '"]'); };
    pane('fonts').html(FONT_SLOTS.map(fontPicker).join(''));
    pane('shape').html(slider('radius', 'Roundness', 0, 1.5, 0.025, 'rem') +
      '<p class="td-hint">The base radius: <code>--radius-sm</code>, <code>-md</code>, <code>-lg</code> and <code>-xl</code> follow it, in light and dark alike.</p>');
    pane('shadows').html('<div class="td-setting"><label class="td-setting-head" for="td-shadow-on">Custom shadows <input class="switch" type="checkbox" role="switch" id="td-shadow-on" data-td-shadow-on></label><p class="td-hint">Off: the theme\'s own shadow scale. On: one shadow, the whole --shadow-* scale derived from it (tweakcn\'s recipe).</p></div>' +
      '<fieldset class="td-shadow-box" data-td-shadow-box><legend class="sr-only">Shadow</legend>' +
      '<div class="td-setting"><span class="td-setting-head"><label for="td-shadow-text">Shadow colour</label></span><div class="td-token" style="padding:0"><div class="color-picker"><input type="color" data-td-shadow-color aria-label="Pick the shadow colour"></div><input class="input" type="text" id="td-shadow-text" data-td-shadow-text spellcheck="false"></div></div>' +
      '<div class="td-slider-grid">' + slider('opacity', 'Opacity', 0, 1, 0.01, '') + slider('blur', 'Blur', 0, 50, 1, 'px') + slider('spread', 'Spread', -10, 20, 1, 'px') + slider('x', 'Offset X', -20, 20, 1, 'px') + slider('y', 'Offset Y', -20, 20, 1, 'px') + '</div>' +
      '</fieldset>');
    pane('type').html(slider('tracking', 'Letter spacing', -0.05, 0.1, 0.005, 'em') +
      '<div class="td-setting"><span class="td-setting-head"><label for="td-link-line">Link line</label></span><select class="select" id="td-link-line" data-td-link-line>' +
      LINK_LINES.map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('') + '</select></div>' +
      slider('link-offset', 'Link underline offset', 0, 12, 1, 'px') +
      '<p class="td-hint">Links in running text (<code>.link</code>) read <code>--link-text-decoration</code> and <code>--link-underline-offset</code>: <a class="link" href="theming.html">a link in your theme</a>.</p>');
  }

  /* the Colors tab: every colour token as a chip, grouped - each opens one
     shared popover with that token's colour row */
  function buildPalette() {
    dfDollar(root).find('[data-td-palette]').html(GROUPS.map(function (g) {
      return '<div class="td-chip-group" role="group" aria-label="' + esc(g[0]) + '"><p class="td-chip-group-name">' + esc(g[0]) + '</p><div class="td-chips">' +
        g[1].map(function (k) { return '<button type="button" class="td-chip" data-chip="' + k + '" popovertarget="td-chip-pop" aria-label="Edit --' + k + '"><i></i><span>' + k + '</span></button>'; }).join('') + '</div></div>';
    }).join(''));
  }
  function openChip(chip) {
    var k = chip.dataset.chip;
    var pop = one(root, '#td-chip-pop');
    // one popover, many triggers: the anchor follows the chip you clicked
    all(root, '.td-chip').forEach(function (c) {
      c.style.anchorName = c === chip ? '--popover-td-chip-pop' : 'none';
      c.toggleAttribute('data-editing', c === chip);
    });
    one(pop, '.popover-title').textContent = '--' + k;
    one(pop, '.popover-description').textContent = 'The ' + mode() + ' palette - type any CSS colour, or pick one.';
    var box = one(pop, '.popover-content');
    box.replaceChildren(tokenRow(k, true));
    paintToken(box.firstChild, mode());
  }

  function paintPalette() {
    if (!root || !S) return;
    var m = mode();
    all(root, '.td-chip').forEach(function (c) {
      var v = S[m][c.dataset.chip];
      c.style.setProperty('--c', v);
      c.title = '--' + c.dataset.chip + ': ' + v + ' - click to edit';
    });
  }

  function paintToken(row, m) {
    var k = row.dataset.token;
    var v = S[m][k];
    var text = one(row, '.input');
    if (document.activeElement !== text) text.value = v;
    text.removeAttribute('aria-invalid');
    var c = rgb(v);
    if (c) one(row, 'input[type="color"]').value = hex(c);
    var badge = one(row, '[data-contrast]');
    if (badge) {
      var ratio = contrast(v, S[m][ON[k]]);
      if (ratio) {
        var level = ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA large' : 'fail';
        badge.textContent = (level === 'fail' ? 'Low ' : level + ' ') + ratio.toFixed(1);
        badge.dataset.level = level === 'fail' ? 'fail' : 'pass';
        badge.title = 'Contrast on --' + ON[k] + ': ' + ratio.toFixed(2) + ':1 (WCAG AA needs 4.5)';
      }
    }
  }
  function paintColors() {
    var m = mode();
    all(root, '.td-token[data-token]').forEach(function (row) { paintToken(row, m); });
    var desc = one(root, '#td-chip-pop .popover-description');
    if (desc && desc.textContent) desc.textContent = 'The ' + m + ' palette - type any CSS colour, or pick one.';
  }
  function setRange(key, value) {
    var input = one(root, '[data-td-range="' + key + '"]');
    if (!input) return;
    if (ns.sliderApi) ns.sliderApi.setState(input, 'default', { value: value });
    else input.value = String(value);
    one(root, '[data-td-out="' + key + '"]').textContent = (key === 'opacity' ? Math.round(value * 100) + '%' : value + input.dataset.unit);
  }
  function paintFont(k) {
    var f = S.fonts[k];
    var slotEl = one(root, '[data-font-slot="' + k + '"]');
    all(slotEl, '.combobox-item:not(.td-any-font)').forEach(function (o) { o.setAttribute('aria-selected', String((o.dataset.value || '') === (f ? f.family : ''))); });
    var value = one(slotEl, '.combobox-value');
    value.textContent = f ? f.family : 'Theme default';
    if (f) value.removeAttribute('data-placeholder'); else value.setAttribute('data-placeholder', 'Theme default');
    var state = one(slotEl, '[data-td-fontstate="' + k + '"]');
    state.textContent = f && !f.href ? 'loading…' : '';
  }
  function paintOther() {
    setRange('radius', parseFloat(S.radius) || 0);
    setRange('tracking', parseFloat(S.tracking) || 0);
    setRange('link-offset', parseFloat(S.link.offset) || 0);
    var line = one(root, '[data-td-link-line]');
    if (!LINK_LINES.some(function (o) { return o[0] === S.link.line; })) dfDollar(line).append(el('option', { value: S.link.line }, esc(S.link.line)));
    line.value = S.link.line;
    var on = !!S.shadow;
    one(root, '[data-td-shadow-on]').checked = on;
    one(root, '[data-td-shadow-box]').disabled = !on;
    var sh = S.shadow || SHADOW_DEFAULT;
    ['opacity', 'blur', 'spread', 'x', 'y'].forEach(function (k) { setRange(k, sh[k]); });
    var c = rgb(sh.color);
    if (c) one(root, '[data-td-shadow-color]').value = hex(c);
    var t = one(root, '[data-td-shadow-text]');
    if (document.activeElement !== t) t.value = sh.color;
  }
  /** the select box (built-in themes, then yours), Rename / Delete, the status */
  function paintBar() {
    if (!root || !cur) return;
    var sel = one(root, '[data-td-from]');
    var mine = docs.customThemes ? docs.customThemes.list() : [];
    dfDollar(sel).html('<optgroup label="Built-in themes">' + (docs.THEMES || []).map(function (t) { return '<option value="' + esc(t.id) + '">' + esc(t.label) + '</option>'; }).join('') + '</optgroup>' +
      (mine.length ? '<optgroup label="Your themes">' + mine.map(function (t) { return '<option value="' + esc(t.id) + '">' + esc(t.label) + '</option>'; }).join('') + '</optgroup>' : ''));
    sel.value = cur.id;
    if (sel.value !== cur.id) sel.value = 'default';
    one(root, '[data-td-rename]').disabled = !cur.custom;
    var del = one(root, '[data-td-delete]');
    del.disabled = !cur.custom;
    var status = one(root, '[data-td-status]');
    status.textContent = status.title = cur.custom ? 'Changes save as you go' : 'Built-in: your first edit starts a custom copy';
  }
  function paintAll() {
    paintColors();
    FONT_SLOTS.forEach(function (s) { paintFont(s[0]); });
    paintOther();
    paintBar();
    paintPalette();
    syncHistoryButtons();
    var names = one(root, '[data-td-fontnames]');
    if (names) names.textContent = FONT_SLOTS.map(function (s) { return S.fonts[s[0]] ? S.fonts[s[0]].family : s[1] + ' (default)'; }).join(' · ');
  }

  // -- fonts: choose, load, write ------------------------------------------------
  function chooseFont(k, family, record) {
    if (!family) {
      S.fonts[k] = null;
      paintFont(k);
      changed(record);
      return;
    }
    // the token applies at once (the stack falls back until the font arrives);
    // the stylesheet link joins the theme when it has loaded
    S.fonts[k] = { family: family, href: null };
    paintFont(k);
    changed(record);
    loadFont(family).then(function (href) {
      if (S && S.fonts[k] && S.fonts[k].family === family) {
        S.fonts[k].href = href;
        paintFont(k);
        changed(false);
      }
    }, function () {
      if (S && S.fonts[k] && S.fonts[k].family === family) {
        S.fonts[k] = null;
        paintFont(k);
        changed(false);
        toast('“' + family + '” is not on Google Fonts', 'Check the spelling - names are case-sensitive, like “Playfair Display”.');
      }
    });
  }
  /** a theme's fonts load without counting as an edit (a built-in theme stays built-in) */
  function loadThemeFonts() {
    FONT_SLOTS.forEach(function (s) {
      var f = S.fonts[s[0]];
      if (!f || f.href) return;
      loadFont(f.family).then(function (href) { if (S && S.fonts[s[0]] && S.fonts[s[0]].family === f.family) { S.fonts[s[0]].href = href; paintFont(s[0]); } }, function () {});
    });
  }

  // -- import / export -------------------------------------------------------------
  function exportCss() {
    var t = themeOf(S);
    var fonts = t.links.filter(function (l) { return l.attributes.rel === 'stylesheet'; }).map(function (l) { return "@import url('" + l.attributes.href + "');"; });
    return '/* ' + cur.label.replace(/\*\//g, '') + ' - designed with the defuss-shadcn Theme Designer. Load it after theme/utils/default-semantic-tokens.css. */\n' +
      (fonts.length ? fonts.join('\n') + '\n' : '') + '\n' + docs.customThemes.css(t);
  }
  /** a tweakcn export or our own: its tokens become the current theme's values (an edit) */
  function importCss(text) {
    var blocks = { light: null, dark: null };
    var re = /(:root|\.dark)\s*\{([^}]*)\}/g, m;
    while ((m = re.exec(text))) blocks[m[1] === ':root' ? 'light' : 'dark'] = m[2];
    if (!blocks.light && !blocks.dark) return false;
    var st = stateFrom('default');
    var found = 0;
    var pattern = docs.customThemes.tokenPattern;
    ['light', 'dark'].forEach(function (mdl) {
      var body = blocks[mdl];
      if (!body) return;
      var d = /--([a-z0-9-]+)\s*:\s*([^;]+);?/g, x;
      while ((x = d.exec(body))) {
        var k = x[1], v = x[2].trim();
        if (!pattern.test(k)) continue;
        found++;
        if (COLORS.indexOf(k) >= 0) st[mdl][k] = v;
        else if (isExtra(k)) st.extra[mdl][k] = v;
        else if (k === 'radius') st.radius = v;
        else if (k === 'tracking-normal') st.tracking = v;
        else if (k === 'link-text-decoration') st.link.line = v;
        else if (k === 'link-underline-offset') st.link.offset = v;
        else if (k.startsWith('font-') && mdl === 'light') {
          var fam = familyOf(v);
          if (fam) st.fonts[k.slice(5)] = { family: fam, href: null };
        }
      }
    });
    if (!found) return false;
    S = st;
    paintAll();
    changed();
    FONT_SLOTS.forEach(function (s) { if (S.fonts[s[0]]) chooseFont(s[0], S.fonts[s[0]].family, false); });
    return true;
  }

  // -- duplicate, rename, delete --------------------------------------------------
  function duplicate() {
    flush();
    var n = freeName(cur.label + ' copy');
    cur = { id: n.id, label: n.label, custom: true, from: cur.from };
    persist();
    load(S);
    toast('Duplicated', '“' + n.label + '” is selected - your edits go to it.');
  }
  function rename(name) {
    name = String(name || '').trim().slice(0, 40);
    if (!name || !cur.custom || name === cur.label) return;
    flush();
    var old = cur.id;
    var n = freeName(name, old);
    cur = { id: n.id, label: n.label, custom: true, from: cur.from };
    persist();
    if (n.id !== old) docs.customThemes.remove(old);
    paintBar();
    toast('Renamed', '“' + n.label + '” is on top of the theme menu.');
  }
  function remove() {
    if (!cur.custom) return;
    clearTimeout(saveTimer);
    saveTimer = 0;
    var gone = cur.label;
    docs.customThemes.remove(cur.id);
    select('default');
    toast('Theme deleted', '“' + gone + '” is gone - the site shows the default theme.');
  }

  // -- fullscreen ------------------------------------------------------------------
  function isFull() { return !!root && (document.fullscreenElement === root || root.hasAttribute('data-fullscreen')); }
  function paintFull() {
    var label = root && one(root, '[data-td-fullscreen] span');
    if (label) label.textContent = isFull() ? 'Exit fullscreen' : 'Fullscreen';
  }
  /** the designer alone on the screen: native fullscreen, a fixed overlay where refused */
  function toggleFullscreen() {
    if (document.fullscreenElement === root) { document.exitFullscreen(); return; }
    if (root.hasAttribute('data-fullscreen')) { root.removeAttribute('data-fullscreen'); paintFull(); return; }
    var overlay = function () { root.setAttribute('data-fullscreen', ''); paintFull(); };
    if (typeof root.requestFullscreen !== 'function') { overlay(); return; }
    root.requestFullscreen().then(paintFull, overlay);
  }
  function leaveFullscreen() {
    if (document.fullscreenElement === root) document.exitFullscreen();
    if (root) root.removeAttribute('data-fullscreen');
  }

  function toast(title, description) {
    var t = ns.toast;
    if (t && t.show) t.show(description ? { title: title, description: description } : { title: title });
  }

  // -- wiring --------------------------------------------------------------------
  var ac = null, modeObserver = null;
  function wire() {
    ac = new AbortController();
    var opt = { signal: ac.signal };
    root.addEventListener('input', function (e) {
      var t = e.target;
      var row = t.closest('.td-token[data-token]');
      if (row) {
        var k = row.dataset.token, m = mode();
        if (t.type === 'color') {
          var hexNotation = one(root, '[data-td-notation]').checked;
          S[m][k] = hexNotation ? t.value : oklch(rgb(t.value));
        } else {
          if (!isColor(t.value.trim())) { t.setAttribute('aria-invalid', 'true'); return; }
          S[m][k] = t.value.trim();
        }
        paintToken(row, m);
        paintPalette();
        changed();
        return;
      }
      var range = t.closest('[data-td-range]');
      if (range) {
        var key = range.dataset.tdRange, val = Number(range.value);
        if (key === 'radius') S.radius = val + 'rem';
        else if (key === 'tracking') S.tracking = val + 'em';
        else if (key === 'link-offset') S.link.offset = val + 'px';
        else { S.shadow = S.shadow || clone(SHADOW_DEFAULT); S.shadow[key] = val; }
        setRange(key, val);
        changed();
        return;
      }
      if (t.matches('[data-td-shadow-color]')) { S.shadow = S.shadow || clone(SHADOW_DEFAULT); S.shadow.color = t.value; paintOther(); changed(); return; }
      if (t.matches('[data-td-shadow-text]') && isColor(t.value.trim())) { S.shadow = S.shadow || clone(SHADOW_DEFAULT); S.shadow.color = t.value.trim(); paintOther(); changed(); }
    }, opt);
    // typing in a font search: the first row offers the typed name - before
    // the combobox filters (capture), so the row matches what it shows
    root.addEventListener('input', function (e) {
      var t = e.target;
      if (!t.matches || !t.matches('[data-font-slot] .combobox-search-input')) return;
      var slotEl = t.closest('[data-font-slot]');
      var any = one(slotEl, '.td-any-font');
      var q = t.value.trim().replace(/\s+/g, ' ');
      var known = FONTS[slotEl.dataset.fontSlot].some(function (f) { return f.toLowerCase() === q.toLowerCase(); });
      if (!q || known) {
        any.textContent = q ? '' : ANY_HINT; // empty = hidden (CSS), known names are in the list
        any.setAttribute('aria-disabled', 'true');
        any.removeAttribute('data-value');
      } else {
        any.textContent = 'Use “' + q + '” from Google Fonts';
        any.setAttribute('aria-disabled', 'false');
        any.dataset.value = q;
      }
    }, { capture: true, signal: ac.signal });
    root.addEventListener('change', function (e) {
      var t = e.target;
      if (t.matches('[data-td-from]')) { select(t.value); return; }
      if (t.matches('[data-td-shadow-on]')) { S.shadow = t.checked ? clone(SHADOW_DEFAULT) : null; paintOther(); changed(); return; }
      if (t.matches('[data-td-link-line]')) { S.link.line = t.value; changed(); }
    }, opt);
    root.addEventListener('combobox:change', function (e) {
      var slotEl = e.target.closest('[data-font-slot]');
      if (!slotEl) return;
      var v = (e.detail && e.detail.values && e.detail.values[0]) || '';
      chooseFont(slotEl.dataset.fontSlot, v);
    }, opt);
    root.addEventListener('submit', function (e) {
      var f = e.target;
      if (f.matches('[data-td-rename-form]')) { rename(f.elements.name.value); return; }
      if (f.matches('[data-td-import-form]')) {
        if (!importCss(f.elements.css.value)) { e.preventDefault(); one(root, '[data-td-import-error]').hidden = false; return; }
        one(root, '[data-td-import-error]').hidden = true;
        toast('Theme imported', 'Every token from the CSS is in the editor now.');
      }
    }, opt);
    root.addEventListener('click', function (e) {
      var t = e.target;
      var full = t.closest('.td-app > a');
      if (full) { if (openAppWindow(full.getAttribute('href'))) e.preventDefault(); return; }
      var chip = t.closest('.td-chip');
      if (chip) { openChip(chip); return; }
      if (t.closest('[data-td-undo]')) return travel(-1);
      if (t.closest('[data-td-redo]')) return travel(1);
      if (t.closest('[data-td-reset]')) {
        if (history.length < 2) return;
        clearTimeout(historyTimer);
        S = JSON.parse(history[0]);
        remember();
        paintAll();
        changed(false);
        return;
      }
      if (t.closest('[data-td-duplicate]')) { duplicate(); return; }
      if (t.closest('[data-td-fullscreen]')) { toggleFullscreen(); return; }
      if (t.closest('[data-td-mode-toggle]')) {
        // the header's switch: one source of the site's light / dark
        var sw = one(document, '#theme-toggle');
        if (sw) sw.click(); else document.documentElement.classList.toggle('dark');
        return;
      }
      if (t.closest('[data-td-rename]')) {
        var input = one(root, '#td-rename-name');
        input.value = cur.label;
        one(root, '#td-rename').showModal();
        input.select();
        return;
      }
      var del = t.closest('[data-td-delete]');
      if (del) {
        // two steps instead of a modal: the first click asks
        if (del.dataset.confirm) { delete del.dataset.confirm; dfDollar(del).html('<i data-lucide="trash-2"></i> Delete'); del.setAttribute('data-variant', 'ghost'); remove(); }
        else {
          del.dataset.confirm = '1';
          del.textContent = 'Really delete?';
          del.setAttribute('data-variant', 'destructive');
          setTimeout(function () { if (del.isConnected && del.dataset.confirm) { delete del.dataset.confirm; dfDollar(del).html('<i data-lucide="trash-2"></i> Delete'); del.setAttribute('data-variant', 'ghost'); if (globalThis.lucide) globalThis.lucide.createIcons(); } }, 3000);
        }
        if (globalThis.lucide) globalThis.lucide.createIcons();
        return;
      }
      if (t.closest('[data-td-export]')) {
        one(root, '[data-td-css]').value = exportCss();
        one(root, '#td-export').showModal();
        return;
      }
      if (t.closest('[data-td-import]')) { one(root, '[data-td-import-error]').hidden = true; one(root, '#td-import').showModal(); return; }
      if (t.closest('[data-td-copy]')) {
        var css = one(root, '[data-td-css]').value;
        (navigator.clipboard ? navigator.clipboard.writeText(css) : Promise.reject()).then(function () { toast('Copied', 'Paste it after the token file.'); }, function () { one(root, '[data-td-css]').select(); toast('Select and copy', 'The clipboard is not available here - the CSS is selected.'); });
        return;
      }
      if (t.closest('[data-td-download]')) {
        var a = document.createElement('a');
        var slug = cur.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'theme';
        a.href = URL.createObjectURL(new Blob([one(root, '[data-td-css]').value], { type: 'text/css' }));
        a.download = slug + '.css';
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
        return;
      }
      if (t.closest('[data-td-toast]')) { toast('Theme saved', 'Toasts use the popover colours and the shadow scale.'); }
    }, opt);
    // the colour popover closes: no chip is being edited any more
    // (beforetoggle: synchronous - toggle is a later task)
    root.addEventListener('beforetoggle', function (e) {
      if (e.target.id === 'td-chip-pop' && e.newState === 'closed') all(root, '.td-chip[data-editing]').forEach(function (c) { c.removeAttribute('data-editing'); });
    }, { capture: true, signal: ac.signal });
    // a font list opens: the search starts empty again, so does the
    // typed-font row (before it shows - beforetoggle is synchronous)
    root.addEventListener('beforetoggle', function (e) {
      var pop = e.target;
      if (!pop.matches || !pop.matches('.combobox-content') || e.newState !== 'open') return;
      var any = one(pop, '.td-any-font');
      if (!any) return;
      any.textContent = ANY_HINT;
      any.setAttribute('aria-disabled', 'true');
      any.setAttribute('aria-selected', 'false');
      any.removeAttribute('data-value');
    }, { capture: true, signal: ac.signal });
    // font names render in their own font as the list scrolls into view
    root.addEventListener('toggle', function (e) {
      var pop = e.target;
      if (!pop.matches || !pop.matches('.combobox-content') || e.newState !== 'open') return;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting && en.target.dataset.font) { previewFont(en.target.dataset.font); io.unobserve(en.target); } });
      }, { root: pop });
      all(pop, '[data-font]').forEach(function (o) { io.observe(o); });
    }, { capture: true, signal: ac.signal });
    document.addEventListener('keydown', function (e) {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
      if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
      e.preventDefault();
      travel(e.shiftKey ? 1 : -1);
    }, opt);
    document.addEventListener('defuss-custom-themes-change', function () { paintBar(); }, opt);
    document.addEventListener('fullscreenchange', paintFull, opt);
    // the overlay fallback closes with Escape too - unless a popover or dialog inside takes it
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.hasAttribute('data-fullscreen') && !one(root, ':popover-open, dialog[open]')) { root.removeAttribute('data-fullscreen'); paintFull(); }
    }, opt);
    // a theme picked from the header's menu: the designer holds it now
    document.addEventListener('defuss-theme-change', function (e) {
      var id = e.detail && e.detail.id;
      if (!id || id === '__preview' || !cur || id === cur.id) return;
      flush();
      cur = identity(id);
      load(stateFrom(id));
      loadThemeFonts();
    }, opt);
    // the header's light / dark switch: the palette being edited follows
    modeObserver = new MutationObserver(function () { if (S) { paintColors(); paintPalette(); syncApps(); } });
    modeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }

  // -- lifecycle -----------------------------------------------------------------
  docs.initThemeDesigner = function (el) {
    if (root === el) return;
    if (root) docs.leaveThemeDesigner();
    root = el;
    BASE = null;
    buildPanes();
    buildPalette();
    // app tabs load their scaffold once shown (a hidden panel never intersects) - also
    // just below the fold: the settings above keep their full height, so a shown tab's
    // app can start under the viewport's edge
    appObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { mountApp(en.target); appObserver.unobserve(en.target); } });
    }, { rootMargin: '0px 0px 100% 0px' });
    all(root, '[data-td-app]').forEach(function (b) { appObserver.observe(b); });
    if (globalThis.lucide) globalThis.lucide.createIcons();
    wire();
    var active = docs.__activeColorTheme || 'default';
    cur = identity(active);
    // an unsaved draft of the earlier designer becomes a custom theme: nothing is lost
    var draft = docs.themeDraft && docs.themeDraft.get();
    var st = draft && draft.state;
    if (st && st.light && st.dark && st.fonts) {
      load(st);
      fork();
      docs.themeDraft.clear();
    } else load(stateFrom(active));
    loadThemeFonts();
  };
  docs.leaveThemeDesigner = function () {
    if (!root) return;
    flush();
    leaveFullscreen();
    if (ac) ac.abort();
    if (modeObserver) modeObserver.disconnect();
    if (appObserver) appObserver.disconnect();
    apps = apps.filter(function (a) { return a.win; }); // full-screen windows keep their last theme
    cancelAnimationFrame(frame);
    clearTimeout(historyTimer);
    root = null;
    S = null;
    cur = null;
    if (docs.endThemePreview) docs.endThemePreview();
  };
  docs.themeDesignerState = function () { return S && clone(S); };
})();
