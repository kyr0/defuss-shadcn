import type { Props } from 'defuss';
import { NAV } from '../nav';
import { readSkillMeta } from '../repo';
import { NavTypeBadge } from './type-badge';

/**
 * The docs sidebar. Statically rendered per page (replaces the old <site-nav>
 * custom element): NAV sections as <details> groups, the active link marked,
 * component type badges straight from the skill frontmatter. Sections render
 * open; the inline restore script below re-applies the visitor's remembered
 * collapses pre-paint (the section holding the current page always stays
 * open — same rule the old runtime enforced).
 */
export function SiteNav({ active }: Props & { active: string }) {
  return (
    <>
      <aside class="site-sidebar">
        <div class="sidebar-scroll">
          {NAV.map((section, i) => {
            const isComponentSection = i > 0;
            return (
              <details
                class="nav-section sidebar-group"
                open
                data-nav-section={section.heading}
                style="margin-bottom:0.75rem;"
              >
                <summary class="nav-heading">
                  {section.heading}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </summary>
                <nav class="sidebar-nav">
                  {section.items.map((item) => {
                    const cls = item.href === active ? 'nav-link active' : 'nav-link';
                    const type =
                      isComponentSection
                        ? readSkillMeta(item.href.replace(/\.html$/, ''))?.type
                        : undefined;
                    return (
                      <a class={cls} href={item.href} style="display:flex;align-items:center;gap:0.375rem;">
                        {item.label}
                        {type ? <> <NavTypeBadge type={type} /></> : null}
                      </a>
                    );
                  })}
                </nav>
              </details>
            );
          })}
        </div>
      </aside>
    </>
  );
}
