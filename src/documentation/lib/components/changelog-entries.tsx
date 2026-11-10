import type { Props } from 'defuss';
import { readFileSync } from 'node:fs';
import { repoFile } from '../repo';
import { allWhatsNewReleases, UNRELEASED_KEY } from '../whats-new-data';
import { WhatsNewPages } from './whats-new-pages';

/**
 * Changelog entries, rendered from data/changelog.json (deploy.sh writes that
 * file - entry first with just a date, then the short hash lands in the
 * follow-up commit; the two-commit rule is unchanged, the surgery target is
 * JSON now instead of HTML). Commit messages may carry the gate-allowlisted
 * inline markup (code/strong/em/…), injected raw like the old hand-written
 * entries. A release the "What's new" record holds also lists the pages it added and changed, each changed page with
 * its examples linked (WhatsNewPages); the work not released yet leads as "Unreleased", and runtime/whats-new.ts
 * gathers what this browser has not seen into "New for you" above everything (hidden when there is nothing).
 * VERIFIED: (documentation.e2e "What's new, example by example") each changed example is linked to its anchor on the
 * page, and New for you lists only the pages this browser has not opened.
 */

/** Optional attribution badge in an entry header (e.g. "Forked here" → the origin repo). */
export interface ChangelogBadge {
  text: string;
  /** when set, the badge is a link (opens in a new tab) */
  href?: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  hash?: string;
  /** optional header badges - attribution; the verify gate ignores them */
  badges?: ChangelogBadge[];
  commits: string[];
}

/** a changelog entry's version as the What's new record keys it: the changelog writes "v0.9.14", the record the
 *  package version "0.9.14" (VERIFIED: the v0.9.14 release - its entry and the front page's dialog listed nothing
 *  of each other until both matched) */
export const releaseKey = (version: string): string => version.replace(/^v/, '');

export function loadChangelog(): ChangelogEntry[] {
  const file = repoFile('src', 'documentation', 'data', 'changelog.json');
  return (JSON.parse(readFileSync(file, 'utf8')) as { entries: ChangelogEntry[] }).entries;
}

export function ChangelogEntries(_props: Props) {
  const releases = new Map(allWhatsNewReleases().map((r) => [r.version, r]));
  const pending = releases.get(UNRELEASED_KEY);
  return (
    <>
      <section class="whats-new-for-you" data-whats-new-for-you aria-label="New for you" hidden></section>
      {pending ? (
        <div class="changelog-release" style="margin-bottom:2.5rem;">
          <div class="flex items-center gap-3 mb-2">
            <h2 style="font-family:var(--font-display);font-size:1.375rem;font-weight:400;letter-spacing:-0.02em;margin:0;">Unreleased</h2>
            <span class="badge" data-variant="secondary">in the works</span>
          </div>
          <p class="text-sm text-muted-foreground mt-0 mb-2">What the next release brings so far.</p>
          <WhatsNewPages release={pending} />
        </div>
      ) : null}
      {loadChangelog().map((e) => (
        <div style="margin-bottom:2.5rem;">
          <div class="flex items-center gap-3 mb-2">
            <h2 style="font-family:var(--font-display);font-size:1.375rem;font-weight:400;letter-spacing:-0.02em;margin:0;">
              {e.version}
            </h2>
            <span class="badge" data-variant="outline" style="font-family:var(--font-mono);">
              {e.date}
            </span>
            {e.hash ? (
              <>
                {' '}
                <code class="changelog-hash">{e.hash}</code>
              </>
            ) : null}
            {(e.badges ?? []).map((b) =>
              b.href ? (
                <a class="badge" data-variant="secondary" href={b.href} target="_blank" rel="noopener" style="font-family:var(--font-mono);text-decoration:none;">
                  {b.text}
                </a>
              ) : (
                <span class="badge" data-variant="secondary" style="font-family:var(--font-mono);">
                  {b.text}
                </span>
              ),
            )}
          </div>
          {releases.has(releaseKey(e.version)) ? (
            <>
              <WhatsNewPages release={releases.get(releaseKey(e.version))!} />
              <h4 class="whats-new-kind changelog-commits-title">Commits</h4>
            </>
          ) : null}
          <ul style="margin:0;padding-left:1.25rem;" class="text-sm text-muted-foreground flex flex-col gap-1">
            {e.commits.map((c) => (
              <li dangerouslySetInnerHTML={{ __html: c }}></li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}
