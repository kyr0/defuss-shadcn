/**
 * Why: vendoring - copying the system into a project that cannot or will not
 * load it from a CDN or npm (offline builds, locked-down networks, a CMS
 * theme folder). Each release attaches one ZIP per section bundle plus one
 * for all.*, and each ZIP is complete on its own: core.* first, then every
 * section the chosen one needs, then the section itself - the same files
 * the CDN serves, readable + minified + source maps, with the provenance
 * notice, the license and a README that states the load order.
 *
 * Pure: which files go into which ZIP and the README text. scripts/
 * release-zips.ts stages them from dist/ and runs `zip`; deploy.sh uploads
 * the result to the GitHub release (nothing binary is committed).
 *
 * VERIFIED: (tests/e2e/section-bundles.e2e.ts) the tags each README lists
 * load a working page from the unzipped folder alone.
 */

/** What a ZIP plan needs to know about one section bundle. */
export type ZipSection = { name: string; heading: string; members: readonly string[]; needs: readonly string[]; files: readonly string[] };

export type ZipPlan = {
  /** `defuss-shadcn-v0.9.6-forms-inputs.zip` */
  zip: string;
  /** the one top-level folder inside the ZIP (the ZIP name without `.zip`) */
  folder: string;
  /** dist-relative files to copy, in load order then twins */
  files: string[];
  /** the bundle files a page links, in load order (`components/core.css`, …) */
  css: string[];
  js: string[];
  readme: string;
};

const CORE_CSS = 'components/core.css';
const CORE_JS = 'components/core.js';

/** a bundle file and the min twins / maps minify.ts writes beside it */
export function withTwins(file: string): string[] {
  if (file.endsWith('.css')) return [file, file.replace(/\.css$/, '.min.css'), file.replace(/\.css$/, '.min.css.map')];
  const base = file.replace(/\.js$/, '');
  return [file, `${base}.js.map`, `${base}.min.js`, `${base}.min.js.map`];
}

const min = (file: string): string => file.replace(/\.(css|js)$/, '.min.$1');

function readme(title: string, version: string, docs: string, intro: string[], css: string[], js: string[]): string {
  return [
    `# defuss-shadcn v${version} - ${title}`,
    '',
    ...intro,
    '',
    '## Load order',
    '',
    'core first (the tokens, the utilities and the df$ runtime every component binds to), then the bundles. The readable files sit beside the minified ones; the source maps point back at them.',
    '',
    '```html',
    ...css.map((f) => `<link rel="stylesheet" href="${min(f)}">`),
    ...js.map((f) => `<script type="module" src="${min(f)}"></script>`),
    '```',
    '',
    `Docs: ${docs}`,
    '',
    'NOTICE.txt lists the bundled third-party code (defuss-morph, defuss-query) and its licenses; LICENSE is this project\'s.',
    '',
  ].join('\n');
}

/**
 * One ZIP per section bundle + `all`. `docsBase` is the documentation site
 * (the Bundles & Downloads page is linked from each README). A section's
 * needs are packed in sidebar order (the order of `sections`), before it.
 */
export function zipPlans(sections: readonly ZipSection[], version: string, docsBase: string): ZipPlan[] {
  const docs = `${docsBase.replace(/\/$/, '')}/bundles.html`;
  const extras = ['components/NOTICE.txt', 'LICENSE', 'README.md'];
  const plan = (name: string, title: string, css: string[], js: string[], intro: string[]): ZipPlan => {
    const folder = `defuss-shadcn-v${version}-${name}`;
    return { zip: `${folder}.zip`, folder, css, js, files: [...[...css, ...js].flatMap(withTwins), ...extras], readme: readme(title, version, docs, intro, css, js) };
  };
  const byHeading = new Map(sections.map((s) => [s.heading, s]));
  return [
    plan('all', 'all components', [CORE_CSS, 'components/all.css'], ['components/all.js'], [
      'Every component except the extra bundles (wysiwyg) in all.css + all.js. all.js embeds the core runtime, so there is no core.js here; core.css brings the tokens and utilities.',
    ]),
    ...sections.map((s) => {
      const needs = sections.filter((o) => s.needs.includes(o.heading));
      const missing = s.needs.filter((h) => !byHeading.has(h));
      if (missing.length) throw new Error(`release-zips: ${s.name} needs unknown sections: ${missing.join(', ')}`);
      const bundles = [...needs.flatMap((o) => o.files), ...s.files];
      return plan(s.name, s.heading, [CORE_CSS, ...bundles.filter((f) => f.endsWith('.css'))], [CORE_JS, ...bundles.filter((f) => f.endsWith('.js'))], [
        `The ${s.heading} section: ${s.members.join(', ')}.`,
        needs.length
          ? `Its documented markup also uses components from ${needs.map((o) => o.heading).join(', ')} - those section bundles are included and load before it.`
          : 'Its documented markup uses no other section.',
      ]);
    }),
  ];
}
