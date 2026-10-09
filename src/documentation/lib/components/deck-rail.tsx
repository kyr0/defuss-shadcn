import type { Props } from 'defuss';

interface DeckRailProps extends Props {
  /** deck page slug - the iframe loads the generated deck-<slug>.html */
  slug: string;
  /** accessible name of the embedded deck */
  title: string;
}

/**
 * The Getting Started right rail: the flagship deck in the white space beside
 * the intro. Why an iframe of a generated page: the deck's markup, scoped
 * styles and script live ONCE - in pages/<slug>.mdx's example fence;
 * scripts/build-docs.ts renders that fence as deck-<slug>.html (no chrome, no
 * second copy to drift) and the rail frames it. Why a Teaser around it: the
 * deck and its ECharts are the heaviest thing on the page, so the iframe waits
 * in the teaser's inert <template> until the play button (or a click on the
 * card) morphs it in; data-ratio 16/9 is the deck's shape, so the swap does
 * not move the page, and the aura draws the eye until then.
 * VERIFIED: (documentation.e2e) Fullscreen (runtime/site.ts) plays the teaser
 * if needed and puts the iframe into native fullscreen - the deck page centres
 * the full-width deck, edge to edge - or, where refused, opens the page in a
 * new tab.
 */
export function DeckRail({ slug, title, children }: DeckRailProps) {
  return (
    <div class="deck-rail">
      <div class="aura" style="--shape-round: var(--radius-xl)">
        <section class="teaser" data-ratio="16/9" aria-label={`${title} - a presentation`}>
          <button class="play-button" type="button" data-size="lg" data-pulse aria-label={`Start the presentation: ${title}`}></button>
          <p class="teaser-title">Click here to start the presentation!</p>
          <p class="teaser-text">{title} - every feature of defuss-shadcn, slide by slide.</p>
          <template class="teaser-content">
            <div class="deck-rail-frame">
              <iframe src={`deck-${slug}.html`} title={title}></iframe>
            </div>
          </template>
        </section>
      </div>
      <p class="deck-rail-caption">
        <span>
          Click the deck and use ← / →, or{' '}
          <a class="link" href={`${slug}.html`}>open it with its source</a>.
        </span>
        <button type="button" class="btn" data-variant="outline" data-size="sm" data-deck-fullscreen aria-label={`${title}: fullscreen`}>
          <i data-lucide="maximize"></i> Fullscreen
        </button>
      </p>
      {children ? <div class="deck-rail-extra">{children}</div> : null}
    </div>
  );
}
