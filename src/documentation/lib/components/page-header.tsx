import type { Props } from 'defuss';
import { readSkillMeta, componentHasJs } from '../repo';
import { TypeBadge } from './type-badge';

/**
 * The sticky page header: breadcrumb, "Built with" pills (component pages),
 * the title <h1> with the taxonomy badge (from the skill frontmatter), and
 * the intro paragraph — children are the intro CONTENT (it often carries
 * <code> markup); the intro <p> itself is generated (mb-6 on component pages,
 * mb-10 on guide pages, `introStyle` for outliers like max-width).
 *
 * Component page:  <PageHeader slug="badge" component="badge" title="Badge">…intro…</PageHeader>
 * Guide page:      <PageHeader slug="sizing" title="Sizing" crumb="layout / flex" introStyle="max-width:38rem;">…intro…</PageHeader>
 */
export function PageHeader({
  slug,
  component,
  title,
  crumb,
  introStyle,
  children,
}: Props & { slug: string; component?: string; title?: string; crumb?: string; introStyle?: string }) {
  const skill = component ? readSkillMeta(component) : null;
  const name = title ?? skill?.name ?? slug;
  const hasJs = component ? componentHasJs(component) : false;
  return (
    <div class="page-header">
      {skill ? (
        <div class="flex items-baseline justify-between mb-1">
          <p class="text-sm text-muted-foreground" style="font-family:var(--font-mono);">defuss-shadcn / {crumb ?? slug}</p>
          <div style="display:flex;align-items:baseline;gap:0.375rem;">
            <span class="text-xs text-muted-foreground" style="font-family:var(--font-mono);white-space:nowrap;">Built with:</span>{' '}
            <a href="#source-css" class="badge built-with-pill" data-variant="outline">CSS</a>
            {hasJs ? (
              <>
                {' '}
                <a href="#source-js" class="badge built-with-pill" data-variant="outline">JS</a>
              </>
            ) : null}
          </div>
        </div>
      ) : (
        <p class="text-sm text-muted-foreground mb-3" style="font-family:var(--font-mono);">defuss-shadcn / {crumb ?? slug}</p>
      )}
      <h1 style="font-family:var(--font-display);font-size:2.5rem;font-weight:400;letter-spacing:-0.035em;margin:0 0 0.75rem;">
        {name}
        {skill ? <TypeBadge type={skill.type} /> : null}
      </h1>
      {children ? (
        <p class={`text-muted-foreground leading-relaxed ${skill ? 'mb-6' : 'mb-10'}`} {...(introStyle ? { style: introStyle } : {})}>
          {(() => {
            // MDX wraps the bare intro text in a markdown <p> — unwrap it so
            // the generated intro <p> never nests
            const kids = (Array.isArray(children) ? children : [children]).filter(
              (k) => k !== null && k !== undefined && k !== '',
            );
            if (kids.length === 1 && (kids[0] as any)?.type === 'p') return (kids[0] as any).children;
            return kids;
          })()}
        </p>
      ) : null}
    </div>
  );
}
