import type { Props } from 'defuss';
import { readFileSync } from 'node:fs';
import { repoFile, repoWebUrl } from '../repo';
import { CodeWindow } from './copy-button';

/**
 * Why: the Bundles & Downloads page (pages/bundles.mdx) describes the section
 * bundles - what each holds, what it needs, how big it is, where to get it.
 * Every one of those facts is rendered here from dist/stats.json at docs
 * build time (stats.ts writes `sections` from scripts/lib/sections-files.ts),
 * so the page cannot state a member, a need or a size the build did not
 * produce. The ZIP names follow scripts/lib/release-zips.ts (the docs build
 * renders from a copy of the docs tree and cannot import scripts/); verify's
 * `bundles page` gate compares the rendered links against zipPlans().
 *
 * VERIFIED: (verify `bundles page ↔ release ZIPs`) the page links exactly
 * the ZIPs release-zips.ts builds, under the current release.
 */

type Section = {
  heading: string;
  members: string[];
  needs: string[];
  files: string[];
  totalSizeGzMinified: number;
};
type Stats = { sections: Record<string, Section>; core: { totalSizeGzMinified: number; cssSizeGzMinified: number }; bundle: { totalSizeGzMinified: number } };

const stats = (): Stats => JSON.parse(readFileSync(repoFile('dist', 'stats.json'), 'utf8')) as Stats;
const version = (): string => (JSON.parse(readFileSync(repoFile('package.json'), 'utf8')) as { version: string }).version;
/** the DocLink style - prose links in the docs are primary + underlined */
const LINK = 'color:var(--primary);text-decoration:underline;text-underline-offset:4px;';
const kib = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KiB`;
const CDN = 'https://cdn.jsdelivr.net/gh/kyr0/defuss-shadcn@latest/dist/';
const min = (file: string): string => file.replace(/\.(css|js)$/, '.min.$1');

/** releases/download/vX.Y.Z/defuss-shadcn-vX.Y.Z-{name}.zip - the asset deploy.sh attaches */
export function zipUrl(name: string): string {
  const v = version();
  return `${repoWebUrl()}/releases/download/v${v}/defuss-shadcn-v${v}-${name}.zip`;
}

/** A link to one release ZIP (`all` or a section name). */
export function ZipLink({ name }: Props & { name: string }) {
  return <a href={zipUrl(name)} data-zip={name} style={LINK}>{`${name}.zip`}</a>;
}

/** the bundle files of a section and of every section it needs, in load order */
function loadOrder(all: Stats['sections'], name: string): { css: string[]; js: string[] } {
  const s = all[name];
  const needs = Object.values(all).filter((o) => s.needs.includes(o.heading));
  const files = [...needs.flatMap((o) => o.files), ...s.files];
  return {
    css: ['components/core.css', ...files.filter((f) => f.endsWith('.css'))],
    js: ['components/core.js', ...files.filter((f) => f.endsWith('.js'))],
  };
}

/** One row per section bundle: members, needs, size, files, ZIP. */
export function SectionBundleTable(_props: Props) {
  const all = stats().sections;
  return (
    <div class="code-card" style="margin-bottom:1.5rem;">
      <div class="code-card-head">
        <span class="code-card-title">dist/sections - one bundle per sidebar section</span>
      </div>
      <div style="padding:1rem 1.25rem;font-size:0.8125rem;overflow-x:auto;">
        <table class="mini-table" id="section-bundle-table">
          <thead>
            <tr><th>Section</th><th>Components</th><th>Needs</th><th>Files</th><th class="whitespace-nowrap">Size</th><th>ZIP</th></tr>
          </thead>
          <tbody>
            {Object.entries(all).map(([name, s]) => (
              <tr data-section={name}>
                <td class="whitespace-nowrap"><a href={`${s.members[0]}.html`} style={LINK}>{s.heading}</a></td>
                <td><span title={s.members.join(', ')}>{String(s.members.length)}</span>{s.members.length <= 4 ? <span class="text-muted-foreground"> · {s.members.join(', ')}</span> : null}</td>
                <td>{s.needs.length ? s.needs.join(', ') : <span class="text-muted-foreground">nothing else</span>}</td>
                <td class="whitespace-nowrap">{s.files.map((f, i) => <>{i ? <br /> : null}<code>{f}</code></>)}</td>
                <td class="whitespace-nowrap" style="padding-inline-end:1rem;">{kib(s.totalSizeGzMinified)}</td>
                <td class="whitespace-nowrap"><a href={zipUrl(name)} data-zip={name} style={LINK}>{`${name}.zip`}</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** The link + script tags (CDN) or side-effect imports (npm) that load one section with what it needs. */
export function SectionLoad({ section, mode }: Props & { section: string; mode: 'cdn' | 'npm' }) {
  const all = stats().sections;
  if (!all[section]) throw new Error(`SectionLoad: no section bundle "${section}" in dist/stats.json`);
  const { css, js } = loadOrder(all, section);
  const s = all[section];
  if (mode === 'npm') {
    const code = [
      `// ${s.heading}: core first, then the sections it needs, then the section`,
      ...[...css, ...js].map((f) => `import 'defuss-shadcn/dist/${f}';`),
    ].join('\n');
    return <CodeWindow lang="javascript" title="main.js" code={code} />;
  }
  const code = [
    `<!-- ${s.heading}: core first, then the sections it needs, then the section -->`,
    ...css.map((f) => `<link rel="stylesheet" href="${CDN}${min(f)}">`),
    ...js.map((f) => `<script type="module" src="${CDN}${min(f)}"></script>`),
  ].join('\n');
  return <CodeWindow lang="html" title="index.html · head" code={code} />;
}

/** The size of one section with core and everything it needs, minified + compressed. */
export function SectionTotal({ section }: Props & { section: string }) {
  const doc = stats();
  const s = doc.sections[section];
  if (!s) throw new Error(`SectionTotal: no section bundle "${section}" in dist/stats.json`);
  const needs = Object.values(doc.sections).filter((o) => s.needs.includes(o.heading));
  return <>{kib(doc.core.totalSizeGzMinified + s.totalSizeGzMinified + needs.reduce((n, o) => n + o.totalSizeGzMinified, 0))}</>;
}

/** core.css + all.css + all.js (all.js embeds core.js), minified + compressed - what SectionTotal compares against. */
export function AllTotal(_props: Props) {
  const doc = stats();
  return <>{kib(doc.bundle.totalSizeGzMinified + doc.core.cssSizeGzMinified)}</>;
}
