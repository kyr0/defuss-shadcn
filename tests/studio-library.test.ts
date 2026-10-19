import { describe, expect, it } from 'vitest';
import {
  ownedClasses,
  pageExamples,
  skillBase,
  studioLibrary,
  utilityClasses,
  type StudioComponent,
} from '../scripts/lib/studio-library.ts';

/**
 * Why: the Studio's library is generated from the docs pages (scripts/lib/studio-library.ts) - which examples it
 * holds, what each is called, where it sits and what it drops decide what people build with. Pinned here on small
 * pages; verify's `studio library fresh` compares the built files with the real pages.
 */

const fence = (body: string, meta = '') => `\`\`\`html example${meta}\n${body}\n\`\`\`\n`;

describe('pageExamples', () => {
  it('one example per ```html example fence, named by its label - else "<page> <n>"; plain fences are no example', () => {
    const mdx = `# Typography\n\n${fence('<p class="lead">Lead</p>', ' label="Lead"')}\n${fence('<p lang="ja">日本語</p>')}\n\`\`\`html\n<p>a plain code sample</p>\n\`\`\`\n`;
    expect(pageExamples(mdx, 'Typography')).toEqual([
      { label: 'Lead', html: '<p class="lead">Lead</p>\n', individual: false },
      { label: 'Typography 2', html: '<p lang="ja">日本語</p>\n', individual: false },
    ]);
  });
  it('scripts and stylesheet links go, a <style> stays; nothing left, or a whole document, is no example', () => {
    const mdx =
      fence('<style>.x { color: red; }</style>\n<div class="x">X</div>\n<script>df$(".x")</script>', ' label="Styled"') +
      fence('<link rel="stylesheet" href="a.css">\n<script type="module" src="a.js"></script>', ' label="Install"') +
      fence('<!doctype html><html><body><p>x</p></body></html>', ' label="Document"');
    expect(pageExamples(mdx, 'X')).toEqual([{ label: 'Styled', html: '<style>.x { color: red; }</style>\n<div class="x">X</div>\n', individual: false }]);
  });
});

describe('studioLibrary', () => {
  const component = (name: string, type: string, js = false): StudioComponent => ({ name, title: name, type, classes: [], js, schema: null });
  it('sections → pages → sub-pages, each with its examples; a page with none anywhere under it and a section left empty go; types come from the component, the entry or the parent', () => {
    const pages: Record<string, string> = {
      diagram: fence('<div class="diagram">D</div>', ' label="Flow"'),
      'diagram-architecture': fence('<div class="diagram">A</div>', ' label="Services"'),
      'diagram-empty': '# nothing to show',
      'deck-gallery': '# a list of decks',
      'deck-numbers': fence('<div class="presentation">N</div>', ' label="Numbers"'),
      changelog: '# no examples',
    };
    const { library, examples } = studioLibrary({
      sections: [
        {
          heading: 'Diagrams',
          icon: '<path d="M0 0"/>',
          items: [
            {
              label: 'Illustrative Diagrams',
              href: 'diagram.html',
              children: [
                { label: 'Architecture', href: 'diagram-architecture.html' },
                { label: 'Empty', href: 'diagram-empty.html' },
              ],
            },
          ],
        },
        { heading: 'Presentations', items: [{ label: 'Deck Gallery', href: 'deck-gallery.html', type: 'TPL', children: [{ label: 'The System in Numbers', href: 'deck-numbers.html' }] }] },
        { heading: 'Introduction', items: [{ label: 'Changelog', href: 'changelog.html' }] },
      ],
      page: (slug) => pages[slug] ?? null,
      components: [component('diagram', 'ORG', true)],
      version: '1.2.3',
    });
    expect(library.schema).toBe(4);
    expect(library.skills).toBe(skillBase('1.2.3'));
    expect(library.skills).toBe('https://cdn.jsdelivr.net/gh/kyr0/defuss-shadcn@v1.2.3/dist/components/');
    expect(library.sections).toEqual([
      {
        heading: 'Diagrams',
        icon: '<path d="M0 0"/>',
        pages: [
          {
            slug: 'diagram',
            title: 'Illustrative Diagrams',
            type: 'ORG',
            examples: ['Flow'],
            individual: [],
            pages: [{ slug: 'diagram-architecture', title: 'Architecture', type: 'ORG', examples: ['Services'], individual: [], pages: [] }],
          },
        ],
      },
      {
        heading: 'Presentations',
        icon: '',
        pages: [
          {
            slug: 'deck-gallery',
            title: 'Deck Gallery',
            type: 'TPL',
            examples: [],
            individual: [],
            pages: [{ slug: 'deck-numbers', title: 'The System in Numbers', type: 'TPL', examples: ['Numbers'], individual: [], pages: [] }],
          },
        ],
      },
    ]);
    expect(Object.keys(examples).sort()).toEqual(['deck-numbers', 'diagram', 'diagram-architecture']);
    expect(examples['diagram-architecture']).toEqual([{ label: 'Services', html: '<div class="diagram">A</div>\n', individual: false }]);
  });
});

describe('studioLibrary - individual examples', () => {
  it('each entry says whether it is individual (the classification handed in, with the page and its component); the page lists their indexes', () => {
    const mdx =
      '```html example part label="Outline"\n<button class="btn" data-variant="outline">A</button>\n```\n' +
      fence('<div class="flex"><button class="btn">A</button><button class="btn">B</button></div>', ' label="Row"');
    const seen: string[] = [];
    const { library, examples } = studioLibrary({
      sections: [{ heading: 'Actions', items: [{ label: 'Button', href: 'button.html' }] }],
      page: () => mdx,
      components: [{ name: 'button', title: 'Button', type: 'ATM', classes: ['btn'], js: false, schema: null }],
      isIndividual: (f, p) => (seen.push(`${p.slug}/${p.own}/${f.label}`), f.label === 'Outline'),
      version: '1.0.0',
    });
    expect(seen).toEqual(['button/button/Outline', 'button/button/Row']);
    expect([library.sections[0].pages[0].examples, library.sections[0].pages[0].individual]).toEqual([['Outline', 'Row'], [0]]);
    expect(examples.button.map((e) => e.individual)).toEqual([true, false]);
  });
});

describe('utilityClasses', () => {
  it('every class a selector names, inside :where() and escaped ones too, sorted and unique; at-rules and comments skipped', () => {
    const css = '@layer utilities { /* .nope */ :where(.w-1\\/2) { width: 50%; } :where(.w-1\\/2), .stack > * + * { margin: 0; } @media (min-width: 40rem) { .md\\:flex { display: flex; } } }';
    expect(utilityClasses(css)).toEqual(['md:flex', 'stack', 'w-1/2']);
  });
});

describe('ownedClasses', () => {
  it('a component owns its top-level classes - Button owns .btn, not the .card a nested rule names', () => {
    const owned = ownedClasses([
      { name: 'button', css: '@layer components { .btn { color: red; } .card .btn { margin: 0; } }', ts: '' },
      { name: 'card', css: '@layer components { .card { padding: 1rem; } .card-title { font-weight: 600; } }', ts: '' },
    ]);
    expect(owned('button')).toEqual(['btn']);
    expect(owned('card')).toEqual(['card', 'card-title']);
  });
});
