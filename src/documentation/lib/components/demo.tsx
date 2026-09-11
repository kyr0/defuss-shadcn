import type { Props } from 'defuss';
import { vdomToHtmlSource } from '../html-source';

/**
 * The guide-page demo system (.demo / .demo-stage / .demo-viewport /
 * .demo-code). With `viewport` set, site.js injects the Mobile/Tablet/Desktop/
 * Full width toolbar that resizes the authored `.demo-viewport` element
 * inside the stage. The stage content is authored verbatim; each code block
 * is a <DemoCode header="CSS" lang="css"> child (a demo can show several).
 * With no <DemoCode> child at all, one code block is auto-serialized from the
 * stage children (parity by construction). No children at all = code-only
 * demo card (no .demo-stage is rendered).
 */
export function Demo({
  viewport,
  children,
}: Props & { viewport?: boolean }) {
  const kids = (Array.isArray(children) ? children : [children]).filter(
    (k) => k !== null && k !== undefined && typeof k !== 'boolean' && k !== '',
  );
  const codes: { header: string; lang: string; text: string }[] = [];
  const rest: unknown[] = [];
  for (const k of kids) {
    const attrs = (k as any)?.attributes ?? {};
    if ('data-demo-code' in attrs) {
      const text = (function textOf(n: any): string {
        if (typeof n === 'string' || typeof n === 'number') return String(n);
        if (Array.isArray(n)) return n.map(textOf).join('');
        if (n && typeof n === 'object') return textOf(n.children ?? []);
        return '';
      })(k);
      codes.push({
        header: attrs['data-header'] ?? 'HTML',
        lang: attrs['data-lang'] ?? 'html',
        text,
      });
    } else {
      rest.push(k);
    }
  }
  if (!codes.length && rest.length) {
    codes.push({ header: 'HTML', lang: 'html', text: vdomToHtmlSource(rest) });
  }
  return (
    <div class="demo" {...(viewport ? { 'data-viewport': '' } : {})}>
      {rest.length ? <div class="demo-stage">{rest}</div> : null}
      {codes.map((c) => (
        <div class="demo-code">
          <div class="demo-code-header">{c.header}</div>
          <pre>
            <code class={`language-${c.lang}`}>{c.text}</code>
          </pre>
        </div>
      ))}
    </div>
  );
}
