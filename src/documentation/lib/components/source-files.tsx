import type { Props } from 'defuss';
import { readComponentSource, componentHasJs } from '../repo';
import { CopyButton } from './copy-button';

const H2_STYLE =
  'font-family:var(--font-display);font-size:1.5rem;font-weight:400;letter-spacing:-0.025em;margin:0 0 0.375rem;';
const VIEW_FILE_STYLE =
  'font-size:0.75rem;font-weight:400;color:var(--muted-foreground);text-decoration:underline;text-underline-offset:3px;margin-left:0.5rem;';

/** Optional prose note above a source listing: <SourceNote for="css|js">…</SourceNote> */
export function SourceNote({ children, ...rest }: Props & { for?: string }) {
  return (
    <p class="text-muted-foreground text-sm mb-4" data-source-note="" {...rest}>
      {children}
    </p>
  );
}

/**
 * The #source-css / #source-js sections. The component's actual source file
 * is read from src/components/ at build time and embedded (escaped by the
 * JSX serializer) — the doc pages can never drift from the shipped code,
 * which retires the sync-css-snippets / sync-js-snippets scripts.
 *
 * `section` renders just one of the two (for pages that interleave other
 * sections between them); without it, CSS then JS in one go.
 */
export function SourceFiles({
  component,
  section,
  cssLang,
  jsLang,
  cssTitle,
  jsTitle,
  children,
}: Props & {
  component: string;
  section?: 'css' | 'js';
  cssLang?: string;
  jsLang?: string;
  cssTitle?: string;
  jsTitle?: string;
}) {
  const css = readComponentSource(component, 'css');
  const js = readComponentSource(component, 'js');
  const notes = (Array.isArray(children) ? children : [children]).filter(Boolean) as any[];
  const noteFor = (kind: string) =>
    notes
      .filter((n) => {
        const attrs = n?.attributes ?? {};
        return 'data-source-note' in attrs && (attrs.for ?? attrs['for']) === kind;
      })
      .map((n) => n.children ?? []);
  const renderSection = (kind: 'css' | 'js') => {
    const source = kind === 'css' ? css : js;
    if (source === null) return null;
    if (kind === 'js' && !componentHasJs(component)) return null;
    const title = kind === 'css' ? cssTitle ?? 'CSS' : jsTitle ?? 'JavaScript';
    const lang = kind === 'css' ? cssLang ?? 'scss' : jsLang ?? 'javascript';
    const ext = kind === 'css' ? 'css' : 'js';
    return (
      <section style="margin-top:3rem;" id={`source-${kind}`}>
        <h2 style={H2_STYLE}>
          {title}{' '}
          <a href={`../components/${component}/${component}.${ext}`} target="_blank" style={VIEW_FILE_STYLE}>
            view file
          </a>
        </h2>
        {noteFor(kind).map((kids) => (
          <p class="text-muted-foreground text-sm mb-4">{kids}</p>
        ))}
        <div style="position:relative;margin-top:0.5rem;">
          <CopyButton />
          <pre>
            <code class={`language-${lang}`}>{source}</code>
          </pre>
        </div>
      </section>
    );
  };
  return (
    <>
      {section !== 'js' ? renderSection('css') : null}
      {section !== 'css' ? renderSection('js') : null}
    </>
  );
}
