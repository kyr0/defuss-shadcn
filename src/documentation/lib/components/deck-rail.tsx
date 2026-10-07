import type { Props } from 'defuss';

interface DeckRailProps extends Props {
  /** deck page slug - the iframe loads the generated deck-<slug>.html */
  slug: string;
  /** accessible name of the embedded deck */
  title: string;
}

/**
 * The Getting Started right rail: the flagship deck, live, in the white space
 * beside the intro. Why an iframe of a generated page: the deck's markup,
 * scoped styles and script live ONCE - in pages/<slug>.mdx's example fence;
 * scripts/build-docs.ts renders that fence as deck-<slug>.html (no chrome, no
 * second copy to drift) and the rail frames it. loading="lazy": the deck and
 * its ECharts load only once the rail is actually shown (wide viewports).
 */
export function DeckRail({ slug, title, children }: DeckRailProps) {
  return (
    <div class="deck-rail">
      <div class="deck-rail-frame">
        <iframe src={`deck-${slug}.html`} title={title} loading="lazy"></iframe>
      </div>
      <p class="deck-rail-caption">
        Click the deck and use ← / →, or{' '}
        <a href={`${slug}.html`}>open it with its source</a>.
      </p>
      {children ? <div class="deck-rail-extra">{children}</div> : null}
    </div>
  );
}
