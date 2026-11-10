import type { Props } from 'defuss';
import { readFileSync } from 'node:fs';
import { componentDirs } from '../component-dirs';
import { LISTED_PAGES } from '../nav';
import { repoFile, repoWebUrl } from '../repo';

/**
 * Why: the Design Language guide (pages/guides/design-language.mdx) is an index from a use case to the components
 * that serve it - for designers and for agents picking a component. Each row names its components once; this file
 * turns a name into the three places an agent or a designer goes next: the page, the component's skill and the
 * folder of its sidebar section. A name that is no listed page, or a skill that does not exist, fails the docs build
 * by name, so the index cannot point at a page or a skill that is gone.
 *
 * VERIFIED: (bun run build:docs) every name below resolves to a listed page; the skills and the section folders come
 * from src/components/<section>/<name>/.
 */

/** a page id, or [page id, the component whose skill it documents] for a page that is not a component of its own */
type Use = string | [string, string];
interface Row {
  /** the use case */
  when: string;
  /** the components that serve it, best first */
  use: Use[];
  /** why these, in a few words */
  why: string;
}

export const USE_CASES: Record<string, Row[]> = {
  show: [
    { when: 'One number or a status - a KPI, a total, a health', use: ['statistic', 'badge', 'indicator', 'progress', 'radial-progress', 'tacho'], why: 'one glance; a meter or a needle when the range matters' },
    { when: 'A few records that fit the page (up to a few hundred)', use: ['table', 'card', 'timeline'], why: 'all in the DOM: find in page, print, no script' },
    { when: 'Thousands to a million records - sorted, filtered, selected', use: ['data-grid', 'virtual-list', ['charts-big-data', 'chart']], why: 'windowed: only the rows in view are drawn, every query runs over all rows' },
    { when: 'A directory tree or a small hierarchy', use: ['tree-view', 'collapsible'], why: 'native details, keys of the tree pattern' },
    { when: 'A big hierarchy, or a hierarchy with columns', use: ['data-tree', ['tree-grid', 'data-grid']], why: 'windowed; branches open on demand' },
    { when: 'Linked data to explain - an architecture, a flow, a few dozen nodes', use: ['diagram', 'mermaid'], why: 'drawn to make one point, step by step if needed' },
    { when: 'Linked data to explore - thousands to millions of nodes', use: ['graph-explorer'], why: 'semantic zoom, a worker lays out what is near' },
    { when: 'A time series - values over time', use: [['charts-change', 'chart'], 'chart'], why: 'lines and areas; one chart morphs between views' },
    { when: 'Events in time - a history, a schedule, a recording', use: ['timeline', 'calendar', 'media-timeline'], why: 'a list of moments, a month, a ruler under a player' },
    { when: 'Values not over time - a comparison, a share, a distribution', use: [['charts-comparison', 'chart'], ['charts-composition', 'chart'], ['charts-distribution', 'chart']], why: 'the chart form follows the question asked' },
    { when: 'Associative data - an object, metadata, settings (key and value)', use: ['property-grid', 'table'], why: 'one row per key; the Property Grid edits in place' },
    { when: 'Evaluation results - scores per case, pass and fail, a run against a run', use: ['data-grid', 'badge', ['charts-comparison', 'chart'], 'diff'], why: 'filter the failures, rank the scores, compare two runs' },
    { when: 'Two versions of one thing', use: ['diff'], why: 'before and after, side by side or inline' },
    { when: 'Places, regions and routes', use: ['geo-map'], why: 'equal-area projections, regions to select, routes on a graph' },
    { when: 'Formulas and their results', use: ['math-renderer', 'math-compute'], why: 'typeset TeX; a computation with its conditions' },
    { when: 'Code and terminal output', use: ['mockup-code', 'code-example'], why: 'a window to read; a live preview to run' },
    { when: 'Long text - an article, a report, a paper', use: ['typography', 'paper', 'toc'], why: 'a reading measure, a contents list that follows' },
  ],
  take: [
    { when: 'On or off', use: ['switch', 'checkbox', 'toggle'], why: 'a setting that applies now; a choice in a form; a pressed tool' },
    { when: 'One of two to four, cycled with one click', use: ['swap', 'language-switcher'], why: 'the next value is one click away' },
    { when: 'One of three to seven, all in view', use: ['radio', 'toggle-group'], why: 'every option visible, no list to open' },
    { when: 'One of many', use: ['select', 'combobox'], why: 'native up to a dozen or so; with more, a search field' },
    { when: 'One of thousands, or from a server', use: ['autocomplete', 'command'], why: 'debounced requests, the last one wins' },
    { when: 'Several of many', use: ['checkbox', 'combobox'], why: 'a short list as boxes; a long one as tags' },
    { when: 'A number or an amount', use: ['number-input', 'slider', 'knob', 'rating'], why: 'typed, dragged, turned or tapped' },
    { when: 'A date, a color, a file, a code', use: ['date-picker', 'color-picker', 'file-input', 'otp-input'], why: 'native controls under a consistent look' },
    { when: 'A short or a long text', use: ['input', 'textarea'], why: 'validation by the browser, the textarea grows with its text' },
    { when: 'A record - several fields, maybe several steps', use: ['form', 'questionnaire'], why: 'native validation; branches and drafts when the answers decide the way' },
    { when: 'Many records in place', use: ['data-grid'], why: 'the cell edits, the query keeps its filters' },
    { when: 'Rich text and comments on it', use: ['editorjs', 'doc-comments'], why: 'blocks with Markdown in and out; comments anchored in the text' },
    { when: 'A formula', use: ['math-editor'], why: 'a math field over a textarea that stays the form control' },
    { when: 'A page, visually', use: ['visual-editor', 'code-example'], why: 'drag blocks; or edit the source next to its preview' },
  ],
  move: [
    { when: 'The main sections of a site or an app', use: ['navbar', 'navigation-menu', 'sidebar', 'dock'], why: 'always in view; a sidebar when there are many' },
    { when: 'Where am I - and the way up or through the page', use: ['breadcrumb', 'toc'], why: 'the path; the sections of a long page' },
    { when: 'Peer views of one thing', use: ['tabs', 'accordion'], why: 'one view at a time; several open at once' },
    { when: 'A long result in parts', use: ['pagination', 'virtual-list'], why: 'pages to address; one scroll for everything' },
    { when: 'A sequence of steps', use: ['steps', 'questionnaire'], why: 'where the user is and what is left' },
    { when: 'Commands - from anywhere, on a thing, in a menu bar', use: ['command', 'context-menu', 'dropdown', 'menubar'], why: 'search every action; the actions of one item; an app menu' },
    { when: 'The language and the theme', use: ['language-switcher', 'theme-switcher'], why: 'the page language through defuss-i18n; a theme as one stylesheet' },
    { when: 'A workspace the user arranges', use: ['border-layout', 'panel', 'resizer', 'window'], why: 'regions that fold, panels that stack, windows that move' },
  ],
  tell: [
    { when: 'Something happened - no answer needed', use: ['toast'], why: 'it goes by itself; the page stays usable' },
    { when: 'A state of one part of the page', use: ['alert', 'badge'], why: 'in place, as long as the state lasts' },
    { when: 'An answer is required before going on', use: ['alert-dialog'], why: 'modal - the one case that blocks the page' },
    { when: 'A focused task over the page', use: ['dialog', 'sheet'], why: 'a form or a detail without leaving the page' },
    { when: 'More detail on demand', use: ['popover', 'tooltip', 'collapsible'], why: 'a hint on hover, a panel on click, a section that opens' },
    { when: 'Waiting', use: ['spinner', 'skeleton', 'progress'], why: 'unknown time; the shape of what comes; a known share' },
  ],
};

const version = (): string => (JSON.parse(readFileSync(repoFile('package.json'), 'utf8')) as { version: string }).version;

/** the listed pages' labels by id, and every component's section */
function lookups() {
  const labels = new Map(LISTED_PAGES.map((p) => [p.href.replace(/\.html$/, ''), p.label]));
  const sections = new Map(componentDirs(repoFile('src', 'components')).map((c) => [c.name, c.section]));
  return { labels, sections };
}

/** One group of the index: when · use (the pages) · skills · the section folders. */
export function UseCaseTable({ group }: Props & { group: string }) {
  const rows = USE_CASES[group];
  if (!rows) throw new Error(`UseCaseTable: no group "${group}" (${Object.keys(USE_CASES).join(', ')})`);
  const { labels, sections } = lookups();
  const tree = `${repoWebUrl()}/tree/v${version()}/src/components/`;
  const resolve = (use: Use) => {
    const [page, skill] = typeof use === 'string' ? [use, use] : use;
    const label = labels.get(page);
    if (!label) throw new Error(`UseCaseTable: "${page}" is no listed page`);
    if (!sections.has(skill)) throw new Error(`UseCaseTable: "${skill}" is no component (its skill is missing)`);
    return { page, label, skill, section: sections.get(skill)! };
  };
  return (
    <div class="overflow-x-auto mb-10">
      <table class="table" data-use-cases={group}>
        <thead>
          <tr>
            <th scope="col">When you need</th>
            <th scope="col">Use</th>
            <th scope="col">Why</th>
            <th scope="col">Skills · folders</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const items = row.use.map(resolve);
            const skills = [...new Set(items.map((i) => i.skill))];
            const folders = [...new Set(items.map((i) => i.section))];
            return (
              <tr>
                <th scope="row" style="font-weight:500;">{row.when}</th>
                <td>
                  {items.map((i, n) => (
                    <span>
                      {n ? ' · ' : ''}
                      <a class="link" href={`${i.page}.html`}>{i.label}</a>
                    </span>
                  ))}
                </td>
                <td class="text-muted-foreground">{row.why}</td>
                <td class="text-xs">
                  {skills.map((s, n) => (
                    <span>
                      {n ? ' ' : ''}
                      <a class="link" href={`../components/${s}/component-skill.md`}><code>{s}</code></a>
                    </span>
                  ))}
                  {' · '}
                  {folders.map((f, n) => (
                    <span>
                      {n ? ' ' : ''}
                      <a class="link" href={`${tree}${f}`}><code>{`${f}/`}</code></a>
                    </span>
                  ))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
