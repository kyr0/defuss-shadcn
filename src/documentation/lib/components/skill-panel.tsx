import type { Props } from 'defuss';

/**
 * The collapsible Component Skill panel. The scaffolding (details/summary/
 * spec link) is generated; the body stays authored content (it is a curated
 * reading view of the skill, not a 1:1 dump). Rendered as a sibling AFTER
 * .page-header — exactly where site.js used to move it at runtime.
 */
export function SkillPanel({ component, children }: Props & { component: string }) {
  return (
    <details style="margin-bottom:2rem;border:1px solid var(--border);border-radius:var(--radius-xl);overflow:hidden;">
      <summary style="padding:0.875rem 1.25rem;background:var(--muted);cursor:pointer;font-size:0.8125rem;font-weight:600;font-family:var(--font-mono);color:var(--muted-foreground);list-style:none;display:flex;align-items:center;gap:0.5rem;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transition:transform 200ms;">
          <path d="m9 18 6-6-6-6" />
        </svg>
        Component Skill —{' '}
        <span data-spec-href={`../components/${component}/component-skill.md`} style="text-decoration:underline;text-underline-offset:3px;">
          components/{component}/component-skill.md
        </span>
      </summary>
      <div style="padding:1.5rem;font-size:0.875rem;line-height:1.85;">{children}</div>
    </details>
  );
}
