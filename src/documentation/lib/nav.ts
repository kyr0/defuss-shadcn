/**
 * Why: the docs sidebar, prev/next pager, search index, and page chrome all
 * derive from this one list. Historically NAV lived inside layout.ts (runtime)
 * and was regex-parsed by scripts/lib/search-index.ts (build time) — two
 * consumers, one stringly-typed source. With defuss-ssg the nav is rendered
 * statically per page, so the data moves here: importable by TSX components
 * AND build plugins alike, no parsing.
 *
 * Labels are plain text (JSX escapes `&` → `&amp;` on render — the serialized
 * pages stay byte-identical to the old hand-written ones).
 */

export interface NavItem {
  label: string;
  href: string;
  /** Sub-pages of this item's own page (e.g. Sizing → Width & Height).
   *  Rendered as a collapsible submenu; the parent href stays a real page. */
  children?: NavItem[];
}

export interface NavSection {
  heading: string;
  items: NavItem[];
}

/** The one section rendered expanded on first load; every other section
 * starts collapsed (see SiteNav / layout.ts collapse persistence). */
export const ALWAYS_OPEN_SECTION = 'Introduction';

export const NAV: NavSection[] = [
  { heading: 'Introduction', items: [
    { label: 'Getting Started', href: 'index.html' },
    { label: 'Installation', href: 'installation.html' },
    { label: 'How to Use', href: 'how-to-use.html' },
    { label: 'Component Skills', href: 'component-skills.html' },
    { label: 'Changelog', href: 'changelog.html' },
  ]},
  { heading: 'Guides', items: [
    { label: 'Theming', href: 'theming.html' },
    { label: 'Dark Mode', href: 'dark-mode.html' },
    { label: 'Data Attribute API', href: 'data-attribute-api.html' },
    { label: 'State API', href: 'state-api.html' },
    { label: 'Verified Agentic Engineering (VAE)', href: 'architecture.html' },
    { label: 'Cascade Layers', href: 'cascade-layers.html' },
    { label: 'JavaScript Modules', href: 'es-modules.html' },
    { label: 'Native Web APIs', href: 'native-web-apis.html' },
    { label: 'Animations', href: 'animations.html' },
    {
      label: 'Sizing',
      href: 'sizing.html',
      children: [
        { label: 'Width & Height', href: 'width-height.html' },
        { label: 'Spacing', href: 'spacing.html' },
        { label: 'Density', href: 'density.html' },
      ],
    },
    {
      label: 'Layout',
      href: 'layout.html',
      children: [
        { label: 'Container', href: 'container.html' },
        { label: 'Flex', href: 'flex.html' },
        { label: 'Grid', href: 'grid.html' },
      ],
    },
    { label: 'Accessibility', href: 'accessibility.html' },
  ]},
  { heading: 'Primitives', items: [
    { label: 'Typography', href: 'typography.html' },
    { label: 'Separator', href: 'separator.html' },
    { label: 'Icon', href: 'icon.html' },
    { label: 'Heading Anchor', href: 'heading-anchor.html' },
  ]},
  { heading: 'Actions', items: [
    { label: 'Button', href: 'button.html' },
    { label: 'Toggle', href: 'toggle.html' },
    { label: 'Toggle Group', href: 'toggle-group.html' },
    { label: 'Button Group', href: 'button-group.html' },
    { label: 'Toolbar', href: 'toolbar.html' },
  ]},
  { heading: 'Forms & Inputs', items: [
    { label: 'Label', href: 'label.html' },
    { label: 'Input', href: 'input.html' },
    { label: 'Textarea', href: 'textarea.html' },
    { label: 'Checkbox', href: 'checkbox.html' },
    { label: 'Radio Group', href: 'radio.html' },
    { label: 'Switch', href: 'switch.html' },
    { label: 'Slider', href: 'slider.html' },
    { label: 'Select', href: 'select.html' },
    { label: 'Number Input', href: 'number-input.html' },
    { label: 'File Input', href: 'file-input.html' },
    { label: 'Color Picker', href: 'color-picker.html' },
    { label: 'Date Picker', href: 'date-picker.html' },
    { label: 'Combobox', href: 'combobox.html' },
    { label: 'Form', href: 'form.html' },
  ]},
  { heading: 'Data Display', items: [
    { label: 'Badge', href: 'badge.html' },
    { label: 'Type Badge', href: 'type-badge.html' },
    { label: 'Avatar', href: 'avatar.html' },
    { label: 'Card', href: 'card.html' },
    { label: 'Image', href: 'image.html' },
    { label: 'Statistic', href: 'statistic.html' },
    { label: 'Table', href: 'table.html' },
    { label: 'Collapsible', href: 'collapsible.html' },
    { label: 'Timeline', href: 'timeline.html' },
    { label: 'Tree View', href: 'tree-view.html' },
    { label: 'Calendar', href: 'calendar.html' },
    { label: 'Carousel', href: 'carousel.html' },
    { label: 'Scroll Area', href: 'scroll-area.html' },
    { label: 'Sortable', href: 'sortable.html' },
  ]},
  { heading: 'Feedback & Status', items: [
    { label: 'Spinner', href: 'spinner.html' },
    { label: 'Skeleton', href: 'skeleton.html' },
    { label: 'Progress', href: 'progress.html' },
    { label: 'Alert', href: 'alert.html' },
    { label: 'Alert Dialog', href: 'alert-dialog.html' },
    { label: 'Toast', href: 'toast.html' },
  ]},
  { heading: 'Overlays', items: [
    { label: 'Popover', href: 'popover.html' },
    { label: 'Tooltip', href: 'tooltip.html' },
    { label: 'Context Menu', href: 'context-menu.html' },
    { label: 'Dialog', href: 'dialog.html' },
    { label: 'Sheet', href: 'sheet.html' },
    { label: 'Accordion', href: 'accordion.html' },
    { label: 'Command', href: 'command.html' },
  ]},
  { heading: 'Navigation', items: [
    { label: 'Breadcrumb', href: 'breadcrumb.html' },
    { label: 'Table of Contents', href: 'toc.html' },
    { label: 'Pagination', href: 'pagination.html' },
    { label: 'Steps', href: 'steps.html' },
    { label: 'Tabs', href: 'tabs.html' },
    { label: 'Dropdown Menu', href: 'dropdown.html' },
    { label: 'Navigation Menu', href: 'navigation-menu.html' },
  ]},
  { heading: 'Application', items: [
    { label: 'Sidebar', href: 'sidebar.html' },
  ]},
  { heading: 'Marketing', items: [
    { label: 'Site Header', href: 'site-header.html' },
    { label: 'Hero', href: 'hero.html' },
    { label: 'Product Showcase', href: 'product-showcase.html' },
    { label: 'Brand Logos', href: 'brand-logos.html' },
    { label: 'Feature Details', href: 'feature-details.html' },
    { label: 'Testimonials', href: 'testimonials.html' },
    { label: 'Stats', href: 'stats.html' },
    { label: 'Pricing', href: 'pricing.html' },
    { label: 'Blog', href: 'blog.html' },
    { label: 'FAQ', href: 'faq.html' },
    { label: 'Get In Touch', href: 'get-in-touch.html' },
    { label: 'Newsletter', href: 'newsletter.html' },
    { label: 'Site Footer', href: 'site-footer.html' },
  ]},
];

/** Every item including nested children, in reading order. */
export function flattenNav(items: NavItem[]): NavItem[] {
  return items.flatMap((i) => [i, ...flattenNav(i.children ?? [])]);
}

/** Flat ordered list of all pages — the prev/next pager's universe. */
export const ALL_PAGES: NavItem[] = NAV.flatMap((s) => flattenNav(s.items));

/** The section heading a page belongs to (drives the always-open rule). */
export function sectionOf(href: string): string | null {
  for (const s of NAV) if (flattenNav(s.items).some((i) => i.href === href)) return s.heading;
  return null;
}

export function labelOf(href: string): string | null {
  for (const s of NAV) {
    const hit = flattenNav(s.items).find((i) => i.href === href);
    if (hit) return hit.label;
  }
  return null;
}
