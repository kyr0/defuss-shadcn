import type { Props } from 'defuss';

/**
 * Marker children shared by <Example> and <Demo>: label/hint/code are declared
 * as child elements with data-example-* marker attributes; the parent extracts
 * them out of the demo flow and places them in the scaffolding. The markers
 * render plain placeholder elements — parents must never pass them through.
 */

export const MARKER_ATTRS: Record<string, 'label' | 'hint' | 'code'> = {
  'data-example-label': 'label',
  'data-example-hint': 'hint',
  'data-example-code': 'code',
};

export function textOf(node: any): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (node && typeof node === 'object') return textOf(node.children ?? []);
  return '';
}

export interface SplitChildren {
  labelKids: unknown[] | null;
  hintKids: unknown[] | null;
  code: string | null;
  rest: unknown[];
}

export function splitMarkers(children: unknown): SplitChildren {
  const kids = (Array.isArray(children) ? children : [children]).filter(
    (k) => k !== null && k !== undefined && typeof k !== 'boolean' && k !== '',
  );
  const out: SplitChildren = { labelKids: null, hintKids: null, code: null, rest: [] };
  for (const k of kids) {
    const attrs = (k as any)?.attributes ?? {};
    const markerKey = Object.keys(MARKER_ATTRS).find((m) => m in attrs);
    const role = markerKey ? MARKER_ATTRS[markerKey as keyof typeof MARKER_ATTRS] : undefined;
    if (role === 'label') out.labelKids = (k as any).children ?? [];
    else if (role === 'hint') out.hintKids = (k as any).children ?? [];
    else if (role === 'code') out.code = textOf(k);
    else out.rest.push(k);
  }
  return out;
}

/** Marker: one code block of a <Demo> (a demo may show HTML + CSS). */
export function DemoCode({ header, lang, children }: Props & { header?: string; lang?: string }) {
  return (
    <span
      data-demo-code=""
      {...(header !== undefined ? { 'data-header': header } : {})}
      {...(lang !== undefined ? { 'data-lang': lang } : {})}
    >
      {children}
    </span>
  );
}

/** Marker: page-level overlays (demo dialogs/popovers) that must live as
 * direct <body> children — DocPage extracts these and renders them after the
 * footer, exactly where the hand-written pages put them. */
export function PageOverlay({ children }: Props) {
  return <div data-page-overlay="">{children}</div>;
}

/** Marker: the demo's label (rendered as the TOC-visible `p.text-sm.font-medium`). */
export function ExampleLabel({ children }: Props) {
  return <p data-example-label="">{children}</p>;
}

/** Marker: the demo's one-line hint. */
export function ExampleHint({ children }: Props) {
  return <p data-example-hint="">{children}</p>;
}

/** Marker: curated code sample text (never rendered into the preview). */
export function ExampleCode({ children }: Props) {
  return <span data-example-code="">{children}</span>;
}
