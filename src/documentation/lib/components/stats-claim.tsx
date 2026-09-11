import type { Props } from 'defuss';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { repoFile } from '../repo';

interface StatsDoc {
  total: number;
  withJs: number;
  withoutJs: number;
  totalSizeGzMinified: number;
  bundle: { totalSizeGzMinified: number };
}

function loadStats(): StatsDoc {
  return JSON.parse(readFileSync(repoFile('dist', 'stats.json'), 'utf8')) as StatsDoc;
}

const formatKiB = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KiB`;

/** The measured-footprint sentence. Must stay byte-identical to
 * scripts/lib/stats.ts statsClaimText — verify's `stats claim` gate compares
 * README.md and the rendered index page against that function's output. */
export function statsClaimText(doc: StatsDoc): string {
  return (
    `${doc.total} components — ${doc.withJs} with JavaScript, ${doc.withoutJs} CSS-only` +
    ` — ${formatKiB(doc.totalSizeGzMinified)} minified + compressed` +
    ` — ${formatKiB(doc.bundle.totalSizeGzMinified)} as the all.css/all.js bundle`
  );
}

/** Index page: the claim sentence, generated from dist/stats.json (was a
 * hand-maintained paragraph that had to be re-edited on every count change). */
export function StatsClaim(_props: Props) {
  const claim = statsClaimText(loadStats());
  return (
    <p class="text-sm text-muted-foreground mb-4" style="max-width:44rem;">
      {claim}. Measured from the shipped files. Full details in: <code>dist/stats.json</code> - updated on every build.
    </p>
  );
}

/** Index page: the "N of M components need no JavaScript" inline figure,
 *  counted from the actual src/components tree (a .ts source = ships JS) —
 *  verify's CSS-only stat gate compares README + the rendered page against
 *  the live tree, so this can never drift. */
export function CssOnlyStat(_props: Props) {
  const dirs = readdirSync(repoFile('src', 'components')).filter((d) =>
    statSync(repoFile('src', 'components', d)).isDirectory(),
  );
  const withJs = dirs.filter((d) =>
    readdirSync(repoFile('src', 'components', d)).some((f) => f === `${d}.ts`),
  ).length;
  return (
    <>
      {dirs.length - withJs} of {dirs.length}
    </>
  );
}

/** Index page: the four headline Statistic cards, generated from stats.json. */
export function StatsCards(_props: Props) {
  const s = loadStats();
  return (
    <div class="grid gap-4 mb-12" style="grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));">
      <div class="statistic">
        <p class="statistic-title">Components</p>
        <p class="statistic-value">{s.total}</p>
        <p class="statistic-description">ATM · MOL · ORG · BLK · TPL</p>
      </div>
      <div class="statistic">
        <p class="statistic-title">With JavaScript</p>
        <p class="statistic-value">{s.withJs}</p>
        <p class="statistic-description">interactive, State API–driven</p>
      </div>
      <div class="statistic">
        <p class="statistic-title">CSS-only</p>
        <p class="statistic-value">{s.withoutJs}</p>
        <p class="statistic-description">zero behavior, pure markup</p>
      </div>
      <div class="statistic">
        <p class="statistic-title">Bundle</p>
        <p class="statistic-value">{formatKiB(s.bundle.totalSizeGzMinified)}</p>
        <p class="statistic-description">
          <code>all.min.css</code> + <code>all.min.js</code>, gzip
        </p>
      </div>
    </div>
  );
}
