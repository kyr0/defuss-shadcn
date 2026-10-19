import type { Props } from 'defuss';
import { Icon } from './code-example';
import { CodeWindow } from './copy-button';

/**
 * Why: an individual example - one component alone, the parts a composite example is made of (AGENTS.md "Individual
 * examples") - is a ` ```html example part ` fence, and a page holds dozens of them ahead of its composite examples.
 * An HTML Preview Editor each would start dozens of sandboxes; the maintainer chose compact cards with no HTML
 * Preview Editor (2026-10-16). A part card is the component as it renders, its label, the Studio link and its code:
 * - the source lives once, as the lines of the code window (CodeWindow: Shiki-coloured, its own Copy button);
 * - runtime/code-example.ts renders it into a shadow root on the `.part-card-view`, with the docs' sheets the live
 *   examples get - nothing of the part (its <style>, its ids, a heading) reaches the page: no TOC or search entry, no
 *   id clash. No script runs: a component with one shows the markup its render() writes, as the Studio's canvas;
 * - "Studio" opens it as a new Studio project (the same handler as the full cards' link).
 * A run of consecutive part fences is one grid (PartCards); lib/mdx-example.ts builds both. VERIFIED:
 * (tests/e2e/site/part-cards.e2e.ts) on the Typography pilot the parts render styled by all.css, reach neither the TOC
 * nor the search index, follow dark mode and render again after an SPA navigation.
 */
export function PartCards({ children }: Props) {
  return (
    <div class="part-cards" role="list" aria-label="Components alone">
      {children}
    </div>
  );
}

export function PartCard({ source, label }: Props & { source: string; label: string }) {
  return (
    <figure class="part-card" role="listitem" data-part-card>
      <div class="part-card-view" aria-label={label}></div>
      <figcaption class="part-card-bar">
        <span class="part-card-label" title={label}>
          {label}
        </span>
        <a class="part-card-studio" href="full-studio.html" target="_blank" rel="noopener" data-open-studio title={`Open ${label} in the Studio`}>
          <Icon name="app-window" />
          <span>Studio</span>
        </a>
      </figcaption>
      <details class="part-card-code">
        <summary>Code</summary>
        <CodeWindow code={source} lang="html" numbers={false} />
      </details>
    </figure>
  );
}
