import type { Props } from 'defuss';
import { ALWAYS_OPEN_SECTION, flattenNav, NAV, type NavItem } from '../nav';
import { readSkillMeta } from '../repo';
import { NavTypeBadge } from './type-badge';

const CHEVRON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

/** One sidebar link, active-marked, with the skill-frontmatter type badge. */
function NavItemLink({ item, active }: { item: NavItem; active: string }) {
  const type = readSkillMeta(item.href.replace(/\.html$/, ''))?.type;
  return (
    <a class={item.href === active ? 'nav-link active' : 'nav-link'} href={item.href} style="display:flex;align-items:center;gap:0.375rem;">
      {item.label}
      {type ? <> <NavTypeBadge type={type} /></> : null}
    </a>
  );
}

/** Parent page with sub-pages (Sizing → Width & Height, …), dogfooding the
 * sidebar component's .sidebar-submenu pattern: the summary is the parent
 * page link (the SPA router preventDefaults it, so clicking the label
 * navigates without toggling) and the chevron/row toggles the submenu. */
function NavItemSubmenu({ item, active }: { item: NavItem; active: string }) {
  const kids = item.children ?? [];
  const containsActive = item.href === active || kids.some((k) => k.href === active);
  return (
    <details class="nav-submenu sidebar-submenu" {...(containsActive ? { open: '' } : {})}>
      <summary>
        <a class={item.href === active ? 'nav-link active' : 'nav-link'} href={item.href}>
          {item.label}
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

/**
 * The docs sidebar. Statically rendered per page (replaces the old <site-nav>
 * custom element): NAV sections as <details> groups in the sidebar component's
 * .sidebar-group design, the active link marked, type badges from the skill
 * frontmatter. All sections start COLLAPSED except the Introduction section
 * and the one holding the current page; the inline restore script in DocPage
 * re-applies the visitor's remembered toggles pre-paint.
 */
export function SiteNav({ active }: Props & { active: string }) {
  return (
    <>
      <aside class="site-sidebar">
        {/* Dock control, mirroring the shipped sidebar component's trigger
            (layout.ts #sidebar-collapse toggles data-state="collapsed").
            Hidden below the desktop breakpoint, where the hamburger owns it. */}
        <button
          class="sidebar-collapse"
          id="sidebar-collapse"
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <div class="sidebar-scroll">
          {NAV.map((section) => {
            const containsActive = flattenNav(section.items).some((i) => i.href === active);
            const expanded = containsActive || section.heading === ALWAYS_OPEN_SECTION;
            return (
              <details
                class="nav-section sidebar-group"
                {...(expanded ? { open: '' } : {})}
                data-nav-section={section.heading}
                style="margin-bottom:0.75rem;"
              >
                <summary class="nav-heading">
                  {section.heading}
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
      </aside>
    </>
  );
}
