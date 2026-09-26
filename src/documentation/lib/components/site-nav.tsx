import type { Props } from 'defuss';
import { ALWAYS_OPEN_SECTION, flattenNav, NAV, type NavItem } from '../nav';
import { readSkillMeta } from '../repo';
import { NavTypeBadge } from './type-badge';

/**
 * Why: the docs sidebar dogfoods the shipped `sidebar` component (see
 * dist/components/sidebar/) - .app-sidebar shell, .sidebar-content scroller,
 * .sidebar-group sections, .sidebar-submenu parents, .sidebar-link links.
 * Collapse rides the component's data-state; the header's panel-left toggle
 * (site-header.tsx + layout.ts) and sidebar.js's ⌘B shortcut are its
 * controls, so what a visitor sees is the component working.
 * Site chrome (fixed header offset, mobile drawer, dock-to-zero-width) stays
 * docs-side as unlayered overrides in public/css/layout.css.
 *
 * Sections start COLLAPSED except Introduction and the one holding the
 * current page; DocPage's pre-paint script re-applies remembered toggles.
 * `nav-link` rides the component's `sidebar-link` class: it is the router's
 * navigation/hook contract (SPA intercept, active marking, prefetch), not
 * styling - the component's CSS owns the look.
 */

const CHEVRON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

/** One sidebar link: component .sidebar-link + the router's .nav-link hook. */
function NavItemLink({ item, active }: { item: NavItem; active: string }) {
  // explicit page-level type (sub-pages) wins; component pages read the skill
  const type = item.type ?? readSkillMeta(item.href.replace(/\.html$/, ''))?.type;
  const isActive = item.href === active;
  return (
    <a
      class={isActive ? 'nav-link sidebar-link active' : 'nav-link sidebar-link'}
      href={item.href}
      {...(isActive ? { 'aria-current': 'page' } : {})}
    >
      <span>{item.label}</span>
      {type ? <NavTypeBadge type={type} /> : null}
    </a>
  );
}

/** Parent page with sub-pages (Sizing → Width & Height, …) - the component's
 * .sidebar-submenu pattern. The label is the parent page link (click
 * navigates); clicking elsewhere on the row toggles the submenu. */
function NavItemSubmenu({ item, active }: { item: NavItem; active: string }) {
  const kids = item.children ?? [];
  const containsActive = item.href === active || kids.some((k) => k.href === active);
  // a parent that IS a component (Image → Image Gallery) keeps its own badge
  const type = item.type ?? readSkillMeta(item.href.replace(/\.html$/, ''))?.type;
  return (
    <details class="sidebar-submenu" {...(containsActive ? { open: '' } : {})}>
      <summary>
        <a
          class={item.href === active ? 'nav-link sidebar-link active' : 'nav-link sidebar-link'}
          href={item.href}
          {...(item.href === active ? { 'aria-current': 'page' } : {})}
        >
          <span>{item.label}</span>
          {type ? <NavTypeBadge type={type} /> : null}
        </a>
        {CHEVRON}
      </summary>
      <nav class="sidebar-nav">
        {kids.map((k) => (
          <NavItemLink item={k} active={active} />
        ))}
      </nav>
    </details>
  );
}

export function SiteNav({ active }: Props & { active: string }) {
  return (
    <aside class="app-sidebar site-sidebar" id="docs-sidebar" data-state="expanded">
      <div class="sidebar-content">
        {NAV.map((section) => {
          const containsActive = flattenNav(section.items).some((i) => i.href === active);
          const expanded = containsActive || section.heading === ALWAYS_OPEN_SECTION;
          return (
            <details
              class="sidebar-group nav-section"
              {...(expanded ? { open: '' } : {})}
              data-nav-section={section.heading}
            >
              <summary>
                <span>{section.heading}</span>
                {CHEVRON}
              </summary>
              <nav class="sidebar-nav">
                {section.items.map((item) =>
                  item.children?.length ? (
                    <NavItemSubmenu item={item} active={active} />
                  ) : (
                    <NavItemLink item={item} active={active} />
                  ),
                )}
              </nav>
            </details>
          );
        })}
      </div>
      {/* No footer dock control here: the header's panel-left toggle
          (#sidebar-toggle, site-header.tsx) owns dock/undock + drawer. */}
    </aside>
  );
}
