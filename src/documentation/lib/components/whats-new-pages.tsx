import type { Props } from 'defuss';
import { labelOf } from '../nav';
import { whatsNewExamples, type WhatsNewRelease } from '../whats-new-data';

/**
 * One release's pages for a reader: the pages it added, the pages it changed and, under each changed page, the
 * examples it added and changed - each a link to its label on the page (`<page>.html#toc-<label>`). The front page's
 * "What's new" dialog and the changelog show the same list; runtime/whats-new.ts marks the pages and examples this
 * browser has not seen (data-unseen) and, on the changelog, gathers them into "New for you" at the top.
 * VERIFIED: (documentation.e2e "What's new") an example link lands on its label, which carries the release's mark.
 */
export function WhatsNewPages({ release }: Props & { release: WhatsNewRelease }) {
  const page = (id: string, nested: boolean) => {
    const examples = nested ? whatsNewExamples(release, id) : [];
    return (
      <li data-whats-new-page={id}>
        <a class="link" href={`${id}.html`} data-whats-new-item={id}>
          {labelOf(`${id}.html`) ?? id}
        </a>
        {examples.length ? (
          <ul class="whats-new-examples">
            {examples.map((e) => (
              <li>
                <a class="link" href={e.href} data-whats-new-example-link={id} data-kind={e.kind}>
                  {e.label}
                </a>{' '}
                <span class="whats-new-kind-tag">{e.kind === 'created' ? 'new' : 'changed'}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </li>
    );
  };
  return (
    <div class="whats-new-pages" data-whats-new-pages={release.version}>
      {release.created.length ? (
        <>
          <h4 class="whats-new-kind">New pages</h4>
          <ul class="whats-new-list">{release.created.map((id) => page(id, false))}</ul>
        </>
      ) : null}
      {release.updated.length ? (
        <>
          <h4 class="whats-new-kind">Updated pages</h4>
          <ul class="whats-new-list whats-new-tree">{release.updated.map((id) => page(id, true))}</ul>
        </>
      ) : null}
    </div>
  );
}
