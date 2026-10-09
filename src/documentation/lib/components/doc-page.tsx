import type { Props } from 'defuss';
import { SiteHeader } from './site-header';
import { SiteNav } from './site-nav';
import { PrevNext } from './prev-next';
import { EditPage } from './edit-page';

export interface DocPageMeta {
  title: string;
  description: string;
  /** page file name without extension - drives og:url, active nav, prev/next */
  slug: string;
  /** full <title>/og:title override when it doesn't follow the "{title} - defuss-shadcn" pattern (index) */
  fullTitle?: string;
}

export interface DocPageProps extends Props {
  meta: DocPageMeta;
  /** index.html uses a taller hero padding */
  mainStyle?: string;
  /** optional right column beside main (the Getting Started deck rail) -
   * rendered as a sticky <aside class="site-aside"> in the white space */
  aside?: unknown;
}

/**
 * The whole page shell - <html>, <head> (meta/og/twitter + the 4 synchronous
 * head scripts + the stylesheet chain in its load-bearing order), <body>
 * chrome (header, sidebar, TOC shell, footer) and the end-of-body scripts.
 * Replaces the ~40 lines of boilerplate every doc page used to repeat.
 */
export function DocPage({ meta, mainStyle, aside, children }: DocPageProps) {
  const title = meta.fullTitle ?? `${meta.title} - defuss-shadcn`;
  const url = `https://kyr0.github.io/defuss-shadcn/documentation/${meta.slug}.html`;
  // partition: <PageOverlay> children render as direct body children (demo
  // dialogs/popovers), everything else is main content
  const mainKids: unknown[] = [];
  const overlays: unknown[] = [];
  for (const k of Array.isArray(children) ? children : [children]) {
    if (k && typeof k === 'object' && 'data-page-overlay' in ((k as any).attributes ?? {})) {
      overlays.push(...((k as any).children ?? []));
    } else {
      mainKids.push(k);
    }
  }
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="light dark" />
        <link rel="icon" href="images/favicon.webp" type="image/webp" />
        <meta name="description" content={meta.description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={meta.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={url} />
        <meta property="og:site_name" content="defuss-shadcn" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={meta.description} />
        <title>{title}</title>
        {/* id="tokens-css": anchor for the runtime theme switcher (and the
            shipped theme-switcher component) - generated theme files
            (../theme/<id>.css) are inserted right after this sheet */}
        <link id="tokens-css" rel="stylesheet" href="../theme/utils/default-semantic-tokens.css" />
        {/* head scripts load AFTER the token sheet: head.js applies
            a persisted theme synchronously at eval, and its <link> must be
            inserted after the token chain to win the cascade */}
        {/* one bundle (scripts/build-docs.ts): runtime/themes.ts +
            theme-switcher.ts + layout.ts + prefs.ts (the persisted stores) */}
        <script src="js/head.js"></script>
        <script src="js/search-index.js"></script>
        <link rel="stylesheet" href="../theme/utils/sizing.css" />
        <link rel="stylesheet" href="../theme/utils/layout.css" />
        <link rel="stylesheet" href="../theme/utils/accessibility.css" />
        <link rel="stylesheet" href="../theme/utils/shapes.css" />
        <link rel="stylesheet" href="css/docs-theme.css" />
        <link rel="stylesheet" href="css/docs-utilities.css" />
        <link rel="stylesheet" href="css/layout.css" />
        <link rel="stylesheet" href="../components/all.css" />
        {/* the extra bundle (scripts/lib/bundles.ts): every live example is
            the shipped HTML Preview Editor (code-example), kept out of all.* */}
        <link rel="stylesheet" href="../components/wysiwyg.css" />
      </head>
      <body>
        <SiteHeader />
        <div class="flex" style="margin-top: 3.5rem; min-height: calc(100vh - 3.5rem);">
          <SiteNav active={`${meta.slug}.html`} />
          <main style={mainStyle ?? 'flex: 1; min-width: 0; max-width: 44rem; padding: 2rem 3.5rem 8rem;'}>
            {mainKids}
            <PrevNext active={`${meta.slug}.html`} />
            <EditPage slug={meta.slug} />
          </main>
          {aside ? <aside class="site-aside">{aside}</aside> : null}
          <aside class="site-toc">
            <div class="site-toc-content"></div>
          </aside>
        </div>
        {/* Re-apply the remembered nav state before first paint. Every page
            opens with only Introduction and the section holding the current
            page expanded (SiteNav) - with 13 sections, remembered "open"
            toggles piled up into a sidebar where everything was open. So the
            only state that survives a page load is an explicitly collapsed
            Introduction (data-nav-always-open); other sections' toggles last
            until the next navigation. The docked-sidebar state set here is
            only visible at desktop widths (CSS keys the hide there), so it
            can be restored unconditionally. The remembered values come from
            the stores (runtime/prefs.ts) - head.js mirrors them onto <html>
            as data-nav-closed / data-nav-docked before this runs. */}
        <script>{`try {
  var root = document.documentElement;
  var closed = (root.dataset.navClosed || '').split(' ');
  var d = document.querySelector('details[data-nav-always-open]');
  if (d && closed.indexOf(d.dataset.navSection) >= 0 && !d.querySelector('a.nav-link.active')) d.open = false;
  if (root.hasAttribute('data-nav-docked')) {
    var sb = document.querySelector('.site-sidebar');
    /* stateName pins it: the sidebar component's auto-collapse treats a
       set stateName as a deliberate user choice and leaves it alone */
    if (sb) { sb.dataset.state = 'collapsed'; sb.dataset.stateName = 'collapsed'; }
  }
} catch (e) {}`}</script>
        {overlays.length ? overlays : null}
        <script src="js/site.js" defer></script>
        {/* CodeExample glue: configures the shipped code-example component
            (wysiwyg.js) with the docs' preview assets - inlined sheets, the
            runtime, lucide, the theme (runtime/code-example.ts) */}
        <script src="js/code-example.js" defer></script>
        <script type="module" src="js/shiki-highlight.js"></script>
        <script type="module" src="../components/all.js"></script>
        <script type="module" src="../components/wysiwyg.js"></script>
        <script src="https://unpkg.com/lucide@1.8.0" integrity="sha384-+8nbzwDAyu5kAjqtR/XKxIgPHQD2TflvbZgeDZn5t3JP+OOogNH1jXnfel8ZAgzS" crossorigin="anonymous"></script>
        <script>{`globalThis.lucide?.createIcons();`}</script>
      </body>
    </html>
  );
}
