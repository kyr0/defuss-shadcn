import type { Props } from 'defuss';
import { SiteHeader } from './site-header';
import { SiteNav } from './site-nav';
import { PrevNext } from './prev-next';
import { SiteFooter } from './site-footer';

export interface DocPageMeta {
  title: string;
  description: string;
  /** page file name without extension — drives og:url, active nav, prev/next */
  slug: string;
  /** full <title>/og:title override when it doesn't follow the "{title} — defuss-shadcn" pattern (index) */
  fullTitle?: string;
}

export interface DocPageProps extends Props {
  meta: DocPageMeta;
  /** index.html uses a taller hero padding */
  mainStyle?: string;
  /** architecture.html historically ships without the opt-in sizing/layout
   *  utility layers — false drops those two <link>s */
  themeExtras?: boolean;
}

/**
 * The whole page shell — <html>, <head> (meta/og/twitter + the 4 synchronous
 * head scripts + the stylesheet chain in its load-bearing order), <body>
 * chrome (header, sidebar, TOC shell, footer) and the end-of-body scripts.
 * Replaces the ~40 lines of boilerplate every doc page used to repeat.
 */
export function DocPage({ meta, mainStyle, themeExtras, children }: DocPageProps) {
  const title = meta.fullTitle ?? `${meta.title} — defuss-shadcn`;
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
        <script src="js/themes.js"></script>
        <script src="js/theme-switcher.js"></script>
        <script src="js/layout.js"></script>
        <script src="js/search-index.js"></script>
        <link rel="stylesheet" href="../theme/default-semantic-tokens.css" />
        {themeExtras !== false ? <link rel="stylesheet" href="../theme/sizing.css" /> : null}
        {themeExtras !== false ? <link rel="stylesheet" href="../theme/layout.css" /> : null}
        <link rel="stylesheet" href="css/docs-theme.css" />
        <link rel="stylesheet" href="css/docs-utilities.css" />
        <link rel="stylesheet" href="css/layout.css" />
        <link rel="stylesheet" href="../components/all.css" />
      </head>
      <body>
        <SiteHeader />
        <div class="flex" style="margin-top: 3.5rem; min-height: calc(100vh - 3.5rem);">
          <SiteNav active={`${meta.slug}.html`} />
          <main style={mainStyle ?? 'flex: 1; min-width: 0; max-width: 44rem; padding: 2rem 3.5rem 8rem;'}>
            {mainKids}
            <PrevNext active={`${meta.slug}.html`} />
          </main>
          <aside class="site-toc">
            <div class="site-toc-content"></div>
          </aside>
        </div>
        {/* Re-apply remembered nav collapses before first paint (the section
            of the current page is never collapsed — same rule as the old
            runtime enforced, just statically rendered). */}
        <script>{`try {
  var c = JSON.parse(localStorage.getItem('defuss-shadcn-nav-collapsed') || '[]');
  for (var i = 0; i < c.length; i++) {
    if (c[i] === 'Overview') continue;
    var d = document.querySelector('details[data-nav-section="' + c[i] + '"]');
    if (d && !d.querySelector('a.nav-link.active')) d.open = false;
  }
} catch (e) {}`}</script>
        <SiteFooter />
        {overlays.length ? overlays : null}
        <script src="js/site.js" defer></script>
        <script type="module" src="js/shiki-highlight.js"></script>
        <script type="module" src="../components/all.js"></script>
        <script src="https://unpkg.com/lucide@1.8.0" integrity="sha384-+8nbzwDAyu5kAjqtR/XKxIgPHQD2TflvbZgeDZn5t3JP+OOogNH1jXnfel8ZAgzS" crossorigin="anonymous"></script>
        <script>{`globalThis.lucide?.createIcons();`}</script>
      </body>
    </html>
  );
}
