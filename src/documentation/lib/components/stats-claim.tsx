import type { Props } from 'defuss';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { readSkillMeta, repoFile } from '../repo';

interface StatsDoc {
  total: number;
  withJs: number;
  withoutJs: number;
  totalSizeGzMinified: number;
  bundle: { totalSizeGzMinified: number };
  core: { totalSizeGzMinified: number };
}

function loadStats(): StatsDoc {
  return JSON.parse(readFileSync(repoFile('dist', 'stats.json'), 'utf8')) as StatsDoc;
}

const formatKiB = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KiB`;

/** The measured-footprint sentence. Must stay byte-identical to
 * scripts/lib/stats.ts statsClaimText - verify's `stats claim` gate compares
 * README.md and the rendered index page against that function's output. */
export function statsClaimText(doc: StatsDoc): string {
  return (
    `${doc.total} components - ${doc.withJs} with JavaScript, ${doc.withoutJs} CSS-only` +
    ` - ${formatKiB(doc.totalSizeGzMinified)} minified + compressed` +
    ` - ${formatKiB(doc.bundle.totalSizeGzMinified)} as the all.css/all.js bundle`
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

/** A figure that counts when it scrolls into view (runtime/site.ts): a count
 *  rises from 0, a size falls from the next power of ten (253.6 ← 1000). The
 *  final value is the rendered text - without JS, or under reduced motion,
 *  that is all anyone sees. */
function CountUp({ value }: { value: number }) {
  return (
    <span data-stat-count data-count={String(value)} data-count-from="0" data-count-decimals="0">
      {String(value)}
    </span>
  );
}
function CountDown({ bytes }: { bytes: number }) {
  const kib = Number((bytes / 1024).toFixed(1));
  const from = 10 ** Math.ceil(Math.log10(Math.max(kib, 1.0001)));
  return (
    <span data-stat-count data-count={kib.toFixed(1)} data-count-from={String(from)} data-count-decimals="1">
      {kib.toFixed(1)}
    </span>
  );
}

/** One boxed statistic: the shipped Statistic inside the shipped Card. */
function StatCard({ title, children, description }: { title: string; children: unknown; description: unknown }) {
  return (
    <div class="card stats-card" data-size="sm">
      <div class="card-content">
        <div class="statistic">
          <p class="statistic-title">{title}</p>
          <p class="statistic-value">{children}</p>
          <p class="statistic-description">{description}</p>
        </div>
      </div>
    </div>
  );
}

/** Index page: the headline statistics as boxed cards, generated from
 *  stats.json - counts rise from 0, sizes fall to their measurement. */
export function StatsCards(_props: Props) {
  const s = loadStats();
  const gzip = <span class="badge" data-variant="secondary" title="gzip-compressed size">gzip</span>;
  return (
    <div class="stats-cards grid gap-3 mb-12">
      <StatCard title="Components" description="ATM · MOL · ORG · BLK · TPL"><CountUp value={s.total} /></StatCard>
      <StatCard title="With JavaScript" description="interactive, State API–driven"><CountUp value={s.withJs} /></StatCard>
      <StatCard title="CSS-only" description="zero behavior, pure markup"><CountUp value={s.withoutJs} /></StatCard>
      <StatCard title="Bundle" description={<><code>all.min.css</code> + <code>all.min.js</code></>}>
        <CountDown bytes={s.bundle.totalSizeGzMinified} /> <span class="stats-unit">KiB</span> {gzip}
      </StatCard>
      <StatCard title="Core runtime" description={<><code>core.min.js</code> + <code>core.min.css</code></>}>
        <CountDown bytes={s.core.totalSizeGzMinified} /> <span class="stats-unit">KiB</span> {gzip}
      </StatCard>
    </div>
  );
}

/** JavaScript Modules page: which components ship a .js (a `{name}.ts`
 *  source) and which are CSS-only - read from the actual src/components tree
 *  at docs build time (was a hand-kept list that had drifted: Slider and
 *  Avatar were filed as CSS-only). Names come from the skill frontmatter,
 *  each linking to its page. */
export function ComponentJsSplit(_props: Props) {
  const dirs = readdirSync(repoFile('src', 'components'))
    .filter((d) => statSync(repoFile('src', 'components', d)).isDirectory())
    .sort();
  const hasJs = (d: string) => readdirSync(repoFile('src', 'components', d)).some((f) => f === `${d}.ts`);
  const column = (title: string, hint: string, names: string[]) => (
    <div class="code-card-col">
      <div class="code-card-head">
        <span class="mono-meta">
          {title} ({names.length})
        </span>
      </div>
      <div style="padding:1.25rem;font-size:0.8125rem;">
        <p class="text-muted-foreground" style="margin:0 0 0.75rem;">{hint}</p>
        <p style="margin:0;line-height:1.9;">
          {names.map((d, i) => (
            <>
              <a href={`${d}.html`} style="text-decoration:underline;text-underline-offset:3px;">
                {readSkillMeta(d)?.name ?? d}
              </a>
              {i < names.length - 1 ? ' · ' : ''}
            </>
          ))}
        </p>
      </div>
    </div>
  );
  return (
    <div class="grid grid-cols-auto gap-4 mb-10">
      {column('CSS-only - no JS needed', 'Pure markup + CSS - native elements (details, form controls, progress, meter) carry the behavior.', dirs.filter((d) => !hasJs(d)))}
      {column('Ships JavaScript', 'Keyboard models, focus management, state coordination, rendering - and every one exposes the State API.', dirs.filter(hasJs))}
    </div>
  );
}
