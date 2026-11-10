import type { Props } from 'defuss';
import { whatsNewReleases } from '../whats-new-data';
import { loadChangelog, releaseKey } from './changelog-entries';
import { WhatsNewPages } from './whats-new-pages';

/**
 * The front page's "What's new": a Dialog (the shipped component) with the pages each release added and changed,
 * newest first - a changed page with the examples it added and changed (WhatsNewPages) - and a released version's
 * commit messages from the changelog. runtime/whats-new.ts marks the
 * releases and pages this browser has not seen yet (data-fresh, data-unseen) and counts them on the trigger.
 * VERIFIED: (documentation.e2e "What's new") the trigger opens it and its unseen pages carry data-unseen.
 */
export function WhatsNewDialog(_props: Props) {
  const changelog = new Map(loadChangelog().map((e) => [releaseKey(e.version), e]));
  return (
    <dialog id="whats-new" class="dialog whats-new" role="dialog" aria-modal="true" aria-labelledby="whats-new-title">
      <div class="dialog-content">
        <div class="dialog-header">
          <h2 class="dialog-title" id="whats-new-title">
            What's new
          </h2>
          <p class="dialog-description">
            The pages each release added and changed, newest first, with the examples that changed on them. A dot marks
            the ones you have not opened since; the sidebar marks them too.
          </p>
        </div>
        <div class="dialog-body whats-new-body">
          {whatsNewReleases().map((r) => {
            const log = changelog.get(r.version);
            return (
              <section class="whats-new-release" data-whats-new-release={r.version}>
                <h3 class="whats-new-version">
                  <span>{r.version === 'unreleased' ? 'In the works' : `v${r.version}`}</span>
                  {log ? (
                    <span class="badge" data-variant="outline">
                      {log.date}
                    </span>
                  ) : null}
                  <span class="badge" data-variant="secondary" data-whats-new-fresh hidden>
                    New for you
                  </span>
                </h3>
                {r.version === 'unreleased' ? (
                  <p class="text-sm text-muted-foreground m-0">Not released yet - what the next release brings so far.</p>
                ) : null}
                <WhatsNewPages release={r} />
                {log ? (
                  <details class="whats-new-commits">
                    <summary>{log.commits.length} commit messages</summary>
                    <ul class="text-sm text-muted-foreground">
                      {log.commits.map((c) => (
                        <li dangerouslySetInnerHTML={{ __html: c }}></li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </section>
            );
          })}
        </div>
        <div class="dialog-footer">
          <a class="btn" data-variant="ghost" href="changelog.html">
            The full changelog
          </a>
          <button class="btn" data-variant="outline" type="button" data-dialog-close>
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
}
