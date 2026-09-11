import type { Props } from 'defuss';

/**
 * Docs content blocks — the prose/skill-panel/code-card patterns the doc
 * pages repeat. They render byte-identical markup to the hand-written forms
 * they replace (DOM-diff verified), so a page authored with them cannot drift
 * on spacing, classes or inline styles.
 */

/** Prose paragraph (guide pages). */
export function DocText({ children }: Props) {
  return (
    <p class="text-sm text-muted-foreground mb-5" style="line-height:1.7;">
      {children}
    </p>
  );
}

/** Primary inline link in prose. */
export function DocLink({ href, target, rel, children }: Props & { href: string; target?: string; rel?: string }) {
  return (
    <a
      href={href}
      {...(target ? { target } : {})}
      {...(rel ? { rel } : {})}
      style="color:var(--primary);text-decoration:underline;text-underline-offset:4px;"
    >
      {children}
    </a>
  );
}

/** Display section heading (picked up by the TOC plugin). */
export function H2({ children }: Props) {
  return (
    <h2 style="font-family:var(--font-display);font-size:1.375rem;font-weight:400;letter-spacing:-0.02em;margin:0 0 0.875rem;">
      {children}
    </h2>
  );
}

/** One labeled field of a <SkillPanel> (label + content). */
export function SkillField({ label, children }: Props & { label: string }) {
  return (
    <>
      <p style="margin:0 0 0.5rem;font-weight:600;font-size:0.8125rem;font-family:var(--font-mono);">{label}</p>
      {children}
    </>
  );
}

/** Body text inside a SkillField (dense = the bullet-list spacing). */
export function SkillText({ dense, children }: Props & { dense?: boolean }) {
  return (
    <p class="text-muted-foreground" style={dense ? 'margin:0 0 0.25rem;' : 'margin:0 0 1.25rem;'}>
      {children}
    </p>
  );
}

/** The flex row carrying classes/pills inside a SkillField. */
export function SkillRow({ children }: Props) {
  return <div style="display:flex;flex-wrap:wrap;gap:0.375rem;margin-bottom:1.25rem;">{children}</div>;
}

/** The two-column variants grid inside a SkillField (wraps <Variant> rows). */
export function SkillGrid({ children }: Props) {
  return <div style="display:grid;grid-template-columns:auto 1fr;gap:0.25rem 1rem;margin-bottom:1.25rem;">{children}</div>;
}

/** One variants-grid row: name (code) + description. */
export function Variant({ name, description }: Props & { name: string; description: string | unknown }) {
  return (
    <>
      <code>{name}</code>
      <span class="text-muted-foreground">{description}</span>
    </>
  );
}

/** MDN API pill link (Web Platform APIs field). */
export function ApiPill({ href, title, children }: Props & { href: string; title: string }) {
  return (
    <a href={href} target="_blank" rel="noopener" title={title} class="api-pill">
      {children}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M7 7h10v10" />
        <path d="M7 17 17 7" />
      </svg>
    </a>
  );
}

/** Dimmed comment span inside a hand-highlighted code sample. */
export function Dim({ children }: Props) {
  return <span class="dim">{children}</span>;
}

/**
 * Bordered code card: muted header strip + the code area. `mb` picks the
 * outer spacing (default 1.5rem, 2.5rem for lead cards, "column" for the
 * flex-column layout variant where the pre stretches).
 */
export function CodeCard({
  title,
  lang,
  mb,
  column,
  children,
}: Props & { title: string; lang: string; mb?: string; column?: boolean }) {
  const outer = column
    ? 'border:1px solid var(--border);border-radius:var(--radius-xl);overflow:hidden;display:flex;flex-direction:column;'
    : `border:1px solid var(--border);border-radius:var(--radius-xl);overflow:hidden;margin-bottom:${mb ?? '1.5rem'};`;
  return (
    <div style={outer}>
      <div style="padding:0.625rem 1rem;background:var(--muted);border-bottom:1px solid var(--border);">
        <span style="font-size:0.75rem;font-family:var(--font-mono);color:var(--muted-foreground);">{title}</span>
      </div>
      <pre style="border-radius:0;border:none;margin:0;background:transparent;flex:1;overflow:hidden;">
        <code class={`language-${lang}`}>{children}</code>
      </pre>
    </div>
  );
}

/** Same bordered card with a table body (reference tables in guide pages). */
export function TableCard({ title, mb, children }: Props & { title: string; mb?: string }) {
  return (
    <div style={`border:1px solid var(--border);border-radius:var(--radius-xl);overflow:hidden;margin-bottom:${mb ?? '1.5rem'};`}>
      <div style="padding:0.625rem 1rem;background:var(--muted);border-bottom:1px solid var(--border);">
        <span style="font-size:0.75rem;font-family:var(--font-mono);color:var(--muted-foreground);">{title}</span>
      </div>
      <div style="padding:1rem 1.25rem;font-size:0.8125rem;overflow-x:auto;">{children}</div>
    </div>
  );
}
