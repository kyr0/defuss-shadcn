import type { Props } from 'defuss';
import { readSkillMeta, componentHasJs } from '../repo';
import { breadcrumbFor } from '../nav';
import { TypeBadge } from './type-badge';

/**
 * The sticky page header: breadcrumb, "Built with" pills (component pages),
 * the title <h1> with the taxonomy badge (from the skill frontmatter), and
 * the intro paragraph - children are the intro CONTENT (it often carries
 * <code> markup); the intro <p> itself is generated (mb-6 on component pages,
 * mb-10 on guide pages, `introStyle` for outliers like max-width).
 *
 * Component page:  <PageHeader slug="badge" component="badge" title="Badge">…intro…</PageHeader>
 * Guide page:      <PageHeader slug="sizing" title="Sizing" introStyle="max-width:38rem;">…intro…</PageHeader>
 * The breadcrumb derives from NAV (breadcrumbFor: section + parent label + slug);
 * `crumb` is the escape hatch for outliers.
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
  // the breadcrumb mirrors the sidebar's structural depth: section heading
  // (+ parent label for sub-pages) from NAV, the page slug as the leaf;
  // an explicit `crumb` stays the escape hatch for outliers
  const trail = crumb ? [crumb] : [...breadcrumbFor(`${slug}.html`), slug];
  const trailText = trail.join(' / ');
  return (
    <div class="page-header">
      {skill ? (
        <div class="flex items-baseline justify-between mb-1">
          <p class="text-sm text-muted-foreground" style="font-family:var(--font-mono);">defuss-shadcn / {trailText}</p>
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
        <p class="text-sm text-muted-foreground mb-3" style="font-family:var(--font-mono);">defuss-shadcn / {trailText}</p>
      )}
      {/* title row: the h1 on the left, page-level actions on the right (the
          runtime puts the "Expand all code" toolbar here - level with the
          title, under "Built with", instead of a row of its own) */}
      <div class="page-header-title-row">
        <h1 style="font-family:var(--font-display);font-size:2.5rem;font-weight:400;letter-spacing:-0.035em;margin:0;">
          {name}
          {skill ? <TypeBadge type={skill.type} /> : null}
        </h1>
        <div class="page-header-actions"></div>
      </div>
      {children ? (
        <p class={`text-muted-foreground leading-relaxed ${skill ? 'mb-6' : 'mb-10'}`} {...(introStyle ? { style: introStyle } : {})}>
          {(() => {
            // MDX wraps the bare intro text in a markdown <p> - unwrap it so
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
