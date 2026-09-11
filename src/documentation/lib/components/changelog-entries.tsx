import type { Props } from 'defuss';
import { readFileSync } from 'node:fs';
import { repoFile } from '../repo';

/**
 * Changelog entries, rendered from data/changelog.json (deploy.sh writes that
 * file — entry first with just a date, then the short hash lands in the
 * follow-up commit; the two-commit rule is unchanged, the surgery target is
 * JSON now instead of HTML). Commit messages may carry the gate-allowlisted
 * inline markup (code/strong/em/…), injected raw like the old hand-written
 * entries.
 */

export interface ChangelogEntry {
  version: string;
  date: string;
  hash?: string;
  commits: string[];
}

export function loadChangelog(): ChangelogEntry[] {
  const file = repoFile('src', 'documentation', 'data', 'changelog.json');
  return (JSON.parse(readFileSync(file, 'utf8')) as { entries: ChangelogEntry[] }).entries;
}

export function ChangelogEntries(_props: Props) {
  return (
    <>
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
          </div>
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
