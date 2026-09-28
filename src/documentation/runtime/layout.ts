// -- layout.js - docs chrome runtime --------------------------------------
// Pre-paint dark-mode init, SPA router, search palette, theme popover, nav
// collapse + scroll persistence, TOC active tracking, GitHub stars.
//
// The chrome MARKUP (header, sidebar, TOC, prev/next, footer) is static —
// rendered into every page at build time by defuss-ssg (lib/components/*).
// This file only wires behavior. Loaded synchronously in <head>.
// No ES modules - works with file:// protocol.

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

  /* -- Dark mode (must run before first paint) ----------------- */
  var saved = localStorage.getItem('defuss-shadcn-theme');
  var darkMQ = window.matchMedia('(prefers-color-scheme: dark)');
  var prefersDark = darkMQ.matches;
  if (saved === 'dark' || (!saved && prefersDark)) {
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
  }

  /* React to OS theme changes in real time (only if user hasn't set a manual preference) */
  darkMQ.addEventListener('change', function (e) {
    if (localStorage.getItem('defuss-shadcn-theme')) return;   // user chose manually - respect it
    document.documentElement.classList.toggle('dark', e.matches);
    document.documentElement.style.colorScheme = e.matches ? 'dark' : 'light';
    var sun = document.getElementById('icon-sun');
    var moon = document.getElementById('icon-moon');
    if (sun) sun.style.display = e.matches ? 'none' : 'block';
    if (moon) moon.style.display = e.matches ? 'block' : 'none';
    /* theme files carry :root + .dark - the class switch re-themes by
       itself; only the favicon derives from live tokens */
    if (docs.updateFavicon) docs.updateFavicon();
  });

  /* -- SPA page-ready helper ----------------------------------- */
  /* Doc-site scripts (site.js) call docs.onPageReady(fn)      */
  /* to register functions that run on initial load AND after     */
  /* each SPA navigation. Component modules auto-reinitialize    */
  /* via MutationObserver when the DOM changes.                  */
  var domReady = false;
  document.addEventListener('DOMContentLoaded', function () { domReady = true; });

  docs.onPageReady = function (fn) {
    if (domReady) {
      fn();
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
    (docs.__spaInits = docs.__spaInits || []).push(fn);
  };

  /* Detect current filename */
  var currentPage = location.pathname.split('/').pop() || 'index.html';

  /* -- Component type badges -----------------------------------
     The palette's nav hits render the same badge the sidebar and doc pages
     show (taxonomy: ATM/MOL/ORG/BLK/TPL - see AGENTS.md). */
  function typeBadge(type) {
    return ' <span class="type-badge" data-type="' + type + '" title="' + type + '">' + type + '</span>';
  }

  /* The SPA swap is async; poll briefly for the target heading.
     ponytail: 100ms × 20 - swap normally lands <200ms; upgrade path is a
     hook on navigateTo's completion, not needed while the docs stay static. */
  function scrollToWhenReady(id, attempt) {
    var el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ block: 'start' });
      // SPA swap + shiki re-highlight reflow async → the landed offset goes
      // stale (issue #2); re-align once the scroll settles.
      if (docs.realignWhenSettled) docs.realignWhenSettled(id);
      return;
    }
    if (attempt > 20) return;
    setTimeout(function () { scrollToWhenReady(id, attempt + 1); }, 100);
  }

  /* -- One-time chrome init -------------------------------------
     Header + sidebar are static markup now and never swapped by the router,
     so these bindings happen exactly once (DOMContentLoaded). */
  function initChrome() {
    /* -- Theme swatch grid (data lives in themes.js - building the grid at
          runtime keeps ~40 theme definitions out of every page's HTML) -- */
    var grid = document.getElementById('theme-grid');
    if (grid && docs.THEMES && !grid.hasChildNodes()) {
      var activeId = docs.__activeColorTheme || 'default';
      docs.THEMES.forEach(function (t) {
        var btn = document.createElement('button');
        btn.className = 'theme-swatch' + (t.id === activeId ? ' active' : '');
        btn.setAttribute('data-theme-id', t.id);

        var label = document.createElement('span');
        label.className = 'theme-swatch-label';
        label.textContent = t.label;
        btn.appendChild(label);

        var colors = document.createElement('div');
        colors.className = 'theme-swatch-colors';

        // Show 5 color dots: primary, secondary, accent, destructive, muted
        var dotKeys = ['primary', 'secondary', 'accent', 'destructive', 'muted'];
        var isDark = document.documentElement.classList.contains('dark');
        var mode = isDark ? 'dark' : 'light';
        dotKeys.forEach(function (key) {
          var dot = document.createElement('span');
          dot.className = 'theme-swatch-dot';
          var color = null;
          if (t.styles && t.styles[mode]) {
            color = t.styles[mode][key];
          }
          if (!color && t.id === 'default') {
            // Default theme colors from default-semantic-tokens.css
            var defaults = {
              light: { primary: 'oklch(0.205 0.005 285)', secondary: 'oklch(0.94 0.003 247)', accent: 'oklch(0.94 0.003 247)', destructive: 'oklch(0.577 0.245 27.325)', muted: 'oklch(0.94 0.003 247)' },
              dark: { primary: 'oklch(0.985 0.002 247)', secondary: 'oklch(0.22 0.006 285)', accent: 'oklch(0.22 0.006 285)', destructive: 'oklch(0.396 0.141 25.723)', muted: 'oklch(0.22 0.006 285)' }
            };
            color = defaults[mode][key];
          }
          if (color) dot.style.background = color;
          colors.appendChild(dot);
        });
        btn.appendChild(colors);

        btn.addEventListener('click', function () {
          if (docs.applyTheme) docs.applyTheme(t.id);
          var popover = document.getElementById('theme-popover');
          if (popover) popover.hidePopover();
        });

        grid.appendChild(btn);
      });
    }

    /* Theme reset button */
    var resetBtn = document.getElementById('theme-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        if (docs.applyTheme) docs.applyTheme('default');
      });
    }

    /* -- Search palette ----------------------------------------
       The header input is a trigger, not a field: clicking it (or Enter/
       Space while focused) opens the <dialog class="command"> palette,
       whose own input receives the query (the command component
       filters/highlights/keys natively). Deliberately NOT a focus trigger:
       dialog.close() restores focus to the opener synchronously, so a
       focus handler would bounce the palette open on every close.
       Items come from the build-time search index (js/search-index.js). */
    var list = document.getElementById('docs-palette-list');
    var dialog = document.getElementById('docs-palette');
    var trigger = document.querySelector('.header-search-input');
    var searchWrap = document.querySelector('.header-search');
    if (list && dialog && trigger && searchWrap && !list.hasChildNodes()) {
      // build lazily on first open: search-index.js (a later head script)
      // merges its staged data into df$.shadcn.docs on DOMContentLoaded —
      // after this file's own DCL listeners - so reading it here at
      // initChrome time would see an empty index
      var esc = function (s) { return s.replace(/&/g, '&').replace(/</g, '<').replace(/"/g, '"'); };
      var buildList = function () {
        if (list.hasChildNodes()) return;
        var index = docs.searchIndex || [];
        var html = '';
        var group = null;
        index.forEach(function (e) {
          if (e.s !== group) {
            if (group !== null) html += '</div>';
            group = e.s;
            html += '<div class="command-group"><p class="command-group-heading">' + esc(group) + '</p>';
          }
          // e.d = the component's taxonomy type (page entries only)
          html += '<button class="command-item" type="button" data-href="' + esc(e.h) + '">' + esc(e.t) +
            (e.d ? typeBadge(e.d) : '') + '</button>';
        });
        if (group !== null) html += '</div>';
        list.innerHTML = html;
      };

      var openPalette = function () {
        if (dialog.open) return;
        buildList();
        dialog.showModal();
        var cmdInput = dialog.querySelector('.command-input');
        if (cmdInput) cmdInput.focus();
      };
      searchWrap.addEventListener('click', openPalette);
      trigger.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault(); // Space would otherwise do nothing on a readonly input
          openPalette();
        }
      });

      /* Navigate after the command component closes the dialog on item
         click (its own Enter handler synthesizes this same click). */
      dialog.addEventListener('click', function (e) {
        var item = e.target.closest('.command-item');
        if (!item) return;
        var href = item.getAttribute('data-href') || '';
        var hashAt = href.indexOf('#');
        var page = hashAt === -1 ? href : href.slice(0, hashAt);
        var id = hashAt === -1 ? '' : href.slice(hashAt + 1);
        if (page === currentPage) {
          if (id) { var el = document.getElementById(id); if (el) { el.scrollIntoView({ block: 'start' }); if (docs.realignWhenSettled) docs.realignWhenSettled(id); } }
          else window.scrollTo(0, 0);
        } else {
          navigateTo(page, true);
          if (id) scrollToWhenReady(id, 0);
        }
      });
    }

    /* -- Sidebar dock persistence ----------------------------------
       Persists the sidebar component's dock state (data-state="collapsed")
       for DocPage's pre-paint restore and keeps the header toggle's
       aria-label honest. Every path that flips it - the header toggle and
       ⌘B/Ctrl+B (sidebar.js's shortcut, which toggles the first .app-sidebar
       directly) - funnels through this one sync. */
    var NAV_DOCK_KEY = 'defuss-shadcn-nav-docked';
    var syncDockState = function () {
      var sidebar = document.querySelector('.site-sidebar');
      var toggle = document.getElementById('sidebar-toggle');
      if (!sidebar || !toggle) return;
      var collapsed = sidebar.dataset.state === 'collapsed';
      toggle.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
      try { localStorage.setItem(NAV_DOCK_KEY, collapsed ? '1' : '0'); } catch { /* private mode */ }
    };
    /* label must reflect a pre-paint restored dock (DocPage inline script) */
    syncDockState();

    /* -- Header sidebar toggle (#sidebar-toggle) --------------------
       The panel-left button next to the brand (site-header.tsx) is the
       single sidebar collapse control (it replaced both the component's
       footer dock trigger and the old hamburger). Mode-aware:

       - desktop: click docks/undoes the sidebar - the same data-state +
         data-stateName flip sidebar.js applies on ⌘B/Ctrl+B (the stateName
         pins the choice against the component's auto-collapse), persisted
         via syncDockState for DocPage's pre-paint restore;
       - drawer mode (<64rem): click opens/closes the off-canvas drawer,
         undoing any desktop dock (the drawer owns open/close there). */
    (function initSidebarToggle() {
      var toggle = document.getElementById('sidebar-toggle');
      var sidebar = document.querySelector('.site-sidebar');
      if (!toggle || !sidebar) return;

      var isDrawerMode = function () {
        return window.matchMedia('(max-width: 64rem)').matches;
      };

      /* Create backdrop element if not already present - directly after the
         sidebar (the old custom-element wrapper held it inside <site-nav>) */
      var backdrop = document.querySelector('.sidebar-backdrop');
      if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'sidebar-backdrop';
        sidebar.insertAdjacentElement('afterend', backdrop);
      }

      function closeSidebar() {
        sidebar.classList.remove('open');
        backdrop.classList.remove('open');
      }

      function openSidebar() {
        sidebar.classList.add('open');
        backdrop.classList.add('open');
        /* opening the drawer undoes a desktop dock and its persisted choice */
        sidebar.removeAttribute('data-state');
        syncDockState();
      }

      toggle.addEventListener('click', function () {
        if (!isDrawerMode()) {
          var collapsed = sidebar.dataset.state !== 'collapsed';
          sidebar.dataset.state = collapsed ? 'collapsed' : 'expanded';
          sidebar.dataset.stateName = collapsed ? 'collapsed' : 'default';
          syncDockState();
          return;
        }
        if (sidebar.classList.contains('open')) {
          closeSidebar();
        } else {
          openSidebar();
        }
      });

      backdrop.addEventListener('click', closeSidebar);

      /* Close sidebar when a nav link is clicked (mobile) */
      sidebar.addEventListener('click', function (e) {
        if (e.target.closest('a.nav-link')) {
          closeSidebar();
        }
      });

      /* Close sidebar on Escape key */
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && sidebar.classList.contains('open')) {
          closeSidebar();
        }
      });
    })();

    /* -- Nav collapse persistence --------------------------------
       Every page opens with only Introduction and the section holding the
       current page expanded (SiteNav). Only Introduction remembers a toggle
       across loads (the pre-paint script in DocPage re-applies a collapsed
       Introduction); other sections' toggles last until the next navigation,
       so 13 sections never pile up open. Saving rewrites the map with that
       one key, which also drops the per-section entries older builds kept. */
    var NAV_COLLAPSE_KEY = 'defuss-shadcn-nav-collapsed';
    document.querySelectorAll('details[data-nav-always-open]').forEach(function (d) {
      d.addEventListener('toggle', function () {
        var map: Record<string, string> = {};
        map[d.dataset.navSection] = d.open ? '1' : '0';
        try { localStorage.setItem(NAV_COLLAPSE_KEY, JSON.stringify(map)); } catch { /* private mode */ }
      });
    });

    /* -- GitHub star count (cached in sessionStorage) ------------ */
    /* ⌘B flips data-state through sidebar.js; #sidebar-toggle's own click
       handler funnels through syncDockState, but the shortcut bypasses it —
       re-sync on that keystroke so the persisted dock + aria-label stay right. */
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') setTimeout(syncDockState, 0);
    });

    /* -- GitHub star count (cached in sessionStorage) ------------ */
    var updateStarCount = function (count) {
      var el = document.querySelector('.github-stars');
      if (el) el.textContent = count;
    };
    var cachedStars = sessionStorage.getItem('gh-stars');
    if (cachedStars) {
      updateStarCount(cachedStars);
    } else {
      fetch('https://api.github.com/repos/kyr0/defuss-shadcn')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.stargazers_count != null) {
            var count = String(data.stargazers_count);
            sessionStorage.setItem('gh-stars', count);
            updateStarCount(count);
          }
        })
        .catch(function () { /* silent fail - star count is non-essential */ });
    }
  }

  document.addEventListener('DOMContentLoaded', initChrome);

  /* -- Sidebar scroll persistence ----------------------------- */
  /* Save scroll position before navigating, restore on load.   */
  /* (With SPA router, sidebar persists - this handles fallback */
  /* cases: first load, hard refresh, external navigation.)     */
  var SCROLL_KEY = 'shadcn-nav-scroll';

  document.addEventListener('click', function (e) {
    var link = e.target.closest('a.nav-link, .site-header a[href="index.html"]');
    if (!link) return;
    var sidebar = document.querySelector('.site-sidebar .sidebar-content');
    if (sidebar) sessionStorage.setItem(SCROLL_KEY, sidebar.scrollTop);
  });

  /* Restore sidebar scroll & scroll active link into view */
  document.addEventListener('DOMContentLoaded', function () {
    var sidebar = document.querySelector('.site-sidebar .sidebar-content');
    if (!sidebar) return;
    var saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved) {
      sidebar.scrollTop = parseInt(saved, 10);
      sessionStorage.removeItem(SCROLL_KEY);
    } else {
      /* First visit - scroll active link into view */
      var active = sidebar.querySelector('.nav-link.active');
      if (active) active.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  });

  /* -- Hover prefetch ----------------------------------------- */
  var prefetched = {};
  document.addEventListener('mouseover', function (e) {
    var link = e.target.closest('a.nav-link:not(.disabled)');
    if (!link) return;
    var href = link.getAttribute('href');
    if (href && !prefetched[href] && href !== currentPage && !href.startsWith('http')) {
      prefetched[href] = true;
      var l = document.createElement('link');
      l.rel = 'prefetch';
      l.href = href;
      document.head.appendChild(l);
    }
  });

  /* -- SPA Client-Side Router --------------------------------- */
  /* Intercepts nav link clicks and swaps <main> content         */
  /* without full-page reloads. Sidebar & header persist.        */

  var navigating = false;

  function navigateTo(href, pushState) {
    if (navigating) return;
    if (href === currentPage && pushState !== false) return;
    navigating = true;

    fetch(href)
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.text();
      })
      .then(function (html) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');
        var newMain = doc.querySelector('main');
        var oldMain = document.querySelector('main');

        if (!newMain || !oldMain) {
          location.href = href;
          return;
        }

        var swap = function () {
          /* Swap main content (incl. the static prev/next pager) */
          oldMain.innerHTML = newMain.innerHTML;
          /* per-page main geometry (DocPage mainStyle - the Getting Started
             column) must not leak onto the next page */
          var newMainStyle = newMain.getAttribute('style');
          if (newMainStyle) oldMain.setAttribute('style', newMainStyle);
          else oldMain.removeAttribute('style');

          /* The static TOC is per-page - swap it alongside main */
          var oldToc = document.querySelector('.site-toc');
          var newToc = doc.querySelector('.site-toc');
          if (oldToc && newToc) oldToc.replaceWith(document.importNode(newToc, true));

          /* The right rail (DocPage `aside`) exists only on pages that
             declare one (Getting Started) - drop ours, adopt theirs */
          var oldAside = document.querySelector('.site-aside');
          var newAside = doc.querySelector('.site-aside');
          if (oldAside) oldAside.remove();
          if (newAside) {
            var toc = document.querySelector('.site-toc');
            if (toc) toc.before(document.importNode(newAside, true));
          }

          /* Migrate body-level overlays: page demos author dialogs/popovers
             as direct body children (dialog.html, sheet.html), so a main
             swap alone leaves their triggers dead. The chrome overlays
             (#docs-palette, #theme-popover) are identical on every page —
             keep ours so palette state survives navigation. */
          document.querySelectorAll('body > dialog, body > [popover]').forEach(function (el) {
            if (el.id === 'docs-palette' || el.id === 'theme-popover') return;
            el.remove();
          });
          doc.querySelectorAll('body > dialog, body > [popover]').forEach(function (el) {
            if (el.id === 'docs-palette' || el.id === 'theme-popover') return;
            document.body.appendChild(document.importNode(el, true));
          });

          /* Update document title */
          document.title = doc.title;

          /* Update current page tracker */
          currentPage = href;

          /* Update active nav link - `.active` for tests/hooks, aria-current
             for the look: the sidebar component styles [aria-current="page"]
             (unlayered .nav-link.active would override component CSS). */
          document.querySelectorAll('.nav-link').forEach(function (link) {
            var isActive = link.getAttribute('href') === currentPage;
            link.classList.toggle('active', isActive);
            if (isActive) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
          });

          /* Reveal every <details> ancestor of the active link - the nav
             section and, for submenu pages (Width & Height under Sizing),
             the submenu too. A collapsed group must never hide the page you
             just opened; the section's toggle listener persists it. */
          var active = document.querySelector('.nav-link.active');
          for (var d = active && active.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) {
            if (!d.open) d.open = true;
          }
          /* ...and close every other section (Introduction keeps its own
             state): a sidebar of 13 sections stays tidy instead of
             accumulating every group the reader ever passed through. */
          document.querySelectorAll('details[data-nav-section]:not([data-nav-always-open])').forEach(function (s) {
            if (s.open && !(active && s.contains(active))) s.open = false;
          });

          /* Push browser history */
          if (pushState !== false) {
            history.pushState({ page: href }, '', href);
          }

          /* Scroll main to top */
          window.scrollTo(0, 0);

          /* Re-initialize all page-ready handlers */
          /* (doc tabs, highlighting, copy buttons, lucide, TOC tracking…) */
          (docs.__spaInits || []).forEach(function (fn) { fn(); });

          /* Component ES modules auto-reinitialize via MutationObserver */
          /* when the DOM changes - no script re-import needed.         */

          navigating = false;
        };

        /* Use View Transitions API if available. Chromium throws a
           "Transition was skipped. New ViewTransition started" error when two
           transitions overlap - the `navigating` flag only guards the fetch,
           not the async VT, so rapid navs (Enter key + section click) can
           stack them. Track the active transition and swap immediately
           (exactly what a skipped VT does anyway) while one is in flight. */
        if (document.startViewTransition && !docs.__vtActive) {
          var vt = document.startViewTransition(swap);
          docs.__vtActive = true;
          vt.finished.finally(function () { docs.__vtActive = false; });
        } else {
          swap();
        }
      })
      .catch(function () {
        location.href = href;
        navigating = false;
      });
  }

  /* Intercept nav clicks (sidebar links, header logo, prev/next) */
  document.addEventListener('click', function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (e.defaultPrevented) return;
    var link = e.target.closest('a.nav-link:not(.disabled), .site-header a[href="index.html"], a.page-nav-link');
    if (!link) return;
    var href = link.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) return;
    e.preventDefault();
    navigateTo(href, true);
  });

  /* Handle browser back/forward */
  window.addEventListener('popstate', function () {
    var page = location.pathname.split('/').pop() || 'index.html';
    navigateTo(page, false);
  });

  /* -- Anchor clearance (--anchor-pad) --------------------------
     .page-header is `position: sticky` pinned right under the fixed site
     header, so anything scrolled to the plain 4rem scroll-padding-top lands
     under the page-header bar (issue #2 follow-up). The true clearance is
     site-header + page-header height + a little breathing room - both
     content-dependent, so the browser measures it and publishes the value
     as --anchor-pad, which layout.css wires into scroll-padding-top.
     The measurement goes stale whenever the header RE-FLOWS after init —
     the Fraunces web font swapping in grows the .page-header h1 by ~50px,
     skill <details> toggles, breakpoint padding changes. One-shot resize/
     toggle listeners missed exactly that (regression: every anchor
     overscrolled by the font-swap delta), so a ResizeObserver on the stack
     re-measures on any size change (it also fires on init and on window
     resize-driven width changes, replacing both listeners). */
  function updateAnchorPad() {
    var hdr = document.querySelector('.site-header');
    var ph = document.querySelector('.page-header');
    var h = (hdr ? hdr.getBoundingClientRect().height : 0) +
      (ph ? ph.getBoundingClientRect().height : 0) + 8;
    document.documentElement.style.setProperty('--anchor-pad', Math.round(h) + 'px');
  }
  /* Re-created per SPA navigation: .page-header is a fresh element per page. */
  var padObserver = null;
  function observeAnchorPad() {
    if (padObserver) padObserver.disconnect();
    padObserver = new ResizeObserver(updateAnchorPad);
    ['.site-header', '.page-header'].forEach(function (sel) {
      var el = document.querySelector(sel);
      if (el) padObserver.observe(el);
    });
  }

  /* -- TOC active tracking ---------------------------------------
     The TOC markup is static (build-time); runtime only highlights the
     active section via IntersectionObserver. */
  var tocObserver = null;
  function initTocTracking() {
    var tocContent = document.querySelector('.site-toc-content');
    if (!tocContent) return;
    if (tocObserver) { tocObserver.disconnect(); tocObserver = null; }
    var tocLinks = tocContent.querySelectorAll('.toc-link');
    if (!tocLinks.length) return;
    var headings = [];
    tocLinks.forEach(function (l) {
      var id = (l.getAttribute('href') || '').slice(1);
      var el = document.getElementById(id);
      if (el) headings.push(el);
    });
    tocObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          tocLinks.forEach(function (l) { l.removeAttribute('aria-current'); });
          var active = tocContent.querySelector('.toc-link[href="#' + entry.target.id + '"]');
          if (active) active.setAttribute('aria-current', 'location');
        }
      });
    }, {
      /* Active heading = first one crossing the bottom edge of the header
         stack; reuse the measured --anchor-pad so the band starts below it. */
      rootMargin: '-' + (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 80) + 'px 0px -60% 0px',
    });
    headings.forEach(function (el) { tocObserver.observe(el); });
  }

  /* Per-page init (runs on DOMContentLoaded + after each SPA navigation) */
  docs.onPageReady(function () {
    initTocTracking();
    updateAnchorPad(); // page header height differs per page - remeasure
    observeAnchorPad(); // re-attach to this page's .page-header element
    /* A fresh load landed with the 4rem fallback padding (this script measured
       the real clearance only now) - re-align the initial fragment once. */
    if (location.hash.length > 1 && docs.realignWhenSettled) {
      docs.realignWhenSettled(decodeURIComponent(location.hash.slice(1)));
    }
  });
})();
