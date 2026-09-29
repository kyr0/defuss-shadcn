/**
 * Why: the docs sidebar, prev/next pager, search index, and page chrome all
 * derive from this one list. Historically NAV lived inside layout.ts (runtime)
 * and was regex-parsed by scripts/lib/search-index.ts (build time) - two
 * consumers, one stringly-typed source. With defuss-ssg the nav is rendered
 * statically per page, so the data moves here: importable by TSX components
 * AND build plugins alike, no parsing.
 *
 * Labels are plain text (JSX escapes `&` → `&amp;` on render - the serialized
 * pages stay byte-identical to the old hand-written ones).
 */

export interface NavItem {
  label: string;
  href: string;
  /** Sub-pages of this item's own page (e.g. Sizing → Width & Height).
   *  Rendered as a collapsible submenu; the parent href stays a real page. */
  children?: NavItem[];
  /** Taxonomy badge for pages that are not components (sub-pages like the
   *  chart studies or the per-animation deep dives) - component pages get
   *  their badge from the skill frontmatter instead (source of truth). */
  type?: 'ATM' | 'MOL' | 'ORG' | 'BLK' | 'TPL';
  /** Marks a page as new / recently changed - the sidebar shows an activity
   *  dot on it (and on its collapsed section). Clear it one release later. */
  isNew?: boolean;
}

export interface NavSection {
  heading: string;
  /** Lucide icon name (a key of NAV_ICONS in nav-icons.ts) shown in front of
   *  the section heading - 14 sections read faster with a landmark each. */
  icon: string;
  items: NavItem[];
}

/** The one section rendered expanded on first load; every other section
 * starts collapsed (see SiteNav / layout.ts collapse persistence). */
export const ALWAYS_OPEN_SECTION = 'Introduction';

export const NAV: NavSection[] = [
  { heading: 'Introduction', icon: 'book-open', items: [
    { label: 'Getting Started', href: 'index.html' },
    { label: 'Installation', href: 'installation.html' },
    { label: 'Vibe Coding / Agentic Engineering', href: 'vibe-coding.html', isNew: true },
    { label: 'How to Use', href: 'how-to-use.html' },
    { label: 'Component Skills', href: 'component-skills.html' },
    { label: 'Verified Agentic Engineering (VAE)', href: 'architecture.html' },
    { label: 'Changelog', href: 'changelog.html' },
  ]},
  { heading: 'Guides', icon: 'compass', items: [
    { label: 'Theming', href: 'theming.html' },
    { label: 'Dark Mode', href: 'dark-mode.html' },
    { label: 'Data Attribute API', href: 'data-attribute-api.html' },
    { label: 'State API', href: 'state-api.html' },
    { label: 'DOM Querying & Morphing', href: 'dom-querying.html' },
    { label: 'Global Key Commands', href: 'global-keys.html', isNew: true },
    { label: 'Cascade Layers', href: 'cascade-layers.html' },
    { label: 'JavaScript Modules', href: 'es-modules.html' },
    { label: 'Native Web APIs', href: 'native-web-apis.html' },
    {
      label: 'Animations',
      href: 'animations.html',
      children: [
        { label: 'Motion', href: 'motion.html' },
        { label: 'Animation Canvas', href: 'anim-canvas.html' },
        { label: 'Fade', href: 'anim-fade.html', type: 'ATM' },
        { label: 'Slide Up', href: 'anim-up.html', type: 'ATM' },
        { label: 'Slide Down', href: 'anim-down.html', type: 'ATM' },
        { label: 'Slide Left', href: 'anim-left.html', type: 'ATM' },
        { label: 'Slide Right', href: 'anim-right.html', type: 'ATM' },
        { label: 'Zoom', href: 'anim-zoom.html', type: 'ATM' },
        { label: 'Zoom Out', href: 'anim-zoom-out.html', type: 'ATM' },
        { label: 'Pop', href: 'anim-pop.html', type: 'ATM' },
        { label: 'Spin', href: 'anim-spin.html', type: 'ATM' },
        { label: 'Flip', href: 'anim-flip.html', type: 'ATM' },
        { label: 'Skew', href: 'anim-skew.html', type: 'ATM' },
        { label: 'Blur', href: 'anim-blur.html', type: 'ATM' },
        { label: 'Wipe', href: 'anim-wipe.html', type: 'ATM' },
        { label: 'Wipe Up', href: 'anim-wipe-up.html', type: 'ATM' },
        { label: 'Iris', href: 'anim-iris.html', type: 'ATM' },
      ],
    },
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
    { label: 'Shapes', href: 'shapes.html' },
    { label: 'Accessibility', href: 'accessibility.html' },
  ]},
  { heading: 'Primitives', icon: 'shapes', items: [
    { label: 'Typography', href: 'typography.html' },
    { label: 'Text Rotate', href: 'text-rotate.html', isNew: true },
    { label: 'Separator', href: 'separator.html' },
    { label: 'Icon', href: 'icon.html' },
    { label: 'Heading Anchor', href: 'heading-anchor.html' },
  ]},
  { heading: 'Actions', icon: 'mouse-pointer-click', items: [
    { label: 'Button', href: 'button.html' },
    { label: 'FAB', href: 'fab.html', isNew: true },
    { label: 'Toggle', href: 'toggle.html' },
    { label: 'Toggle Group', href: 'toggle-group.html' },
    { label: 'Button Group', href: 'button-group.html' },
    { label: 'Toolbar', href: 'toolbar.html' },
  ]},
  { heading: 'Forms & Inputs', icon: 'text-cursor-input', items: [
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
  { heading: 'Data Display', icon: 'layout-grid', items: [
    { label: 'Badge', href: 'badge.html' },
    { label: 'Type Badge', href: 'type-badge.html' },
    { label: 'Avatar', href: 'avatar.html' },
    { label: 'Indicator', href: 'indicator.html', isNew: true },
    { label: 'Diff', href: 'diff.html', isNew: true },
    { label: 'Countdown', href: 'countdown.html', isNew: true },
    { label: 'Card', href: 'card.html' },
    {
      label: 'Image',
      href: 'image.html',
      children: [{ label: 'Image Gallery', href: 'image-gallery.html', type: 'MOL' }],
    },
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
  { heading: 'Charts', icon: 'chart-column', items: [
    { label: 'Chart', href: 'chart.html' },
    { label: 'Comparison', href: 'charts-comparison.html', type: 'MOL' },
    { label: 'Change over time', href: 'charts-change.html', type: 'MOL' },
    { label: 'Distribution', href: 'charts-distribution.html', type: 'MOL' },
    { label: 'Composition', href: 'charts-composition.html', type: 'MOL' },
    { label: 'Election', href: 'charts-election.html', type: 'MOL' },
    { label: 'Narrative', href: 'charts-narrative.html', type: 'MOL' },
  ]},
  { heading: 'Diagrams', icon: 'workflow', items: [
    { label: 'Mermaid', href: 'mermaid.html', isNew: true },
  ]},
  { heading: 'Feedback & Status', icon: 'bell-ring', items: [
    { label: 'Spinner', href: 'spinner.html' },
    { label: 'Skeleton', href: 'skeleton.html' },
    { label: 'Progress', href: 'progress.html' },
    { label: 'Alert', href: 'alert.html' },
    { label: 'Alert Dialog', href: 'alert-dialog.html' },
    { label: 'Toast', href: 'toast.html' },
  ]},
  { heading: 'Overlays', icon: 'layers', items: [
    { label: 'Popover', href: 'popover.html' },
    { label: 'Tooltip', href: 'tooltip.html' },
    { label: 'Context Menu', href: 'context-menu.html' },
    { label: 'Dialog', href: 'dialog.html' },
    { label: 'Sheet', href: 'sheet.html' },
    { label: 'Accordion', href: 'accordion.html' },
    { label: 'Command', href: 'command.html' },
  ]},
  { heading: 'Navigation', icon: 'navigation', items: [
    { label: 'Navbar', href: 'navbar.html', isNew: true },
    { label: 'Dock', href: 'dock.html', isNew: true },
    { label: 'Breadcrumb', href: 'breadcrumb.html' },
    { label: 'Table of Contents', href: 'toc.html' },
    { label: 'Pagination', href: 'pagination.html' },
    { label: 'Steps', href: 'steps.html' },
    { label: 'Tabs', href: 'tabs.html' },
    { label: 'Dropdown Menu', href: 'dropdown.html' },
    { label: 'Navigation Menu', href: 'navigation-menu.html' },
    { label: 'Theme Switcher', href: 'theme-switcher.html' },
  ]},
  { heading: 'Application', icon: 'app-window', items: [
    { label: 'Sidebar', href: 'sidebar.html' },
    { label: 'Resizer', href: 'resizer.html' },
  ]},
  { heading: 'Presentations', icon: 'presentation', items: [
    { label: 'Presentation', href: 'presentation.html' },
    { label: 'Deck Gallery', href: 'presentations.html', children: [
      { label: 'The System in Numbers', href: 'system-in-numbers.html' },
      { label: 'Editorial Highlight Bars', href: 'editorial-highlight-bars.html' },
      { label: 'Lollipop Ranking', href: 'lollipop-ranking.html' },
      { label: 'Dumbbell Before/After', href: 'dumbbell-before-after.html' },
      { label: 'Slopegraph', href: 'slopegraph.html' },
      { label: 'Diverging Bars', href: 'diverging-bars.html' },
      { label: 'Waterfall', href: 'waterfall.html' },
      { label: 'Normalized Stack', href: 'normalized-stack.html' },
      { label: 'Bump Ranking', href: 'bump-ranking.html' },
      { label: 'Bar Race', href: 'bar-race.html' },
      { label: 'Confidence Band', href: 'confidence-band.html' },
      { label: 'Annotated Time Series', href: 'annotated-timeseries.html' },
      { label: 'Small Multiples', href: 'small-multiples.html' },
      { label: 'Scatter Quadrants', href: 'scatter-quadrants.html' },
      { label: 'Jittered Distribution', href: 'jittered-distribution.html' },
      { label: 'Heatmap Matrix', href: 'heatmap-matrix.html' },
      { label: 'Calendar Heatmap', href: 'calendar-heatmap.html' },
      { label: 'Theme River', href: 'theme-river.html' },
      { label: 'Treemap', href: 'treemap.html' },
      { label: 'Sunburst', href: 'sunburst.html' },
      { label: 'Sankey', href: 'sankey.html' },
      { label: 'Chord', href: 'chord.html' },
      { label: 'Editorial Gauge', href: 'editorial-gauge.html' },
      { label: 'Parliament Hemicycle', href: 'parliament-hemicycle.html' },
      { label: 'Election Majority Bar', href: 'election-majority-bar.html' },
      { label: 'Election Hex Cartogram', href: 'election-hex-cartogram.html' },
      { label: 'Election Shift Arrows', href: 'election-shift-arrows.html' },
      { label: 'Universal Transition', href: 'universal-transition.html' },
      { label: 'Waffle Dot Matrix', href: 'waffle-dot-matrix.html' },
      { label: 'Boxplot', href: 'boxplot.html' },
      { label: 'Violin - Custom Series', href: 'violin-custom.html' },
      { label: 'Custom Wind Vectors', href: 'custom-wind-vectors.html' },
      { label: 'Story State Machine', href: 'story-state-machine.html' },
    ]},
  ]},
  { heading: 'Marketing', icon: 'megaphone', items: [
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

/** Flat ordered list of all pages - the prev/next pager's universe. */
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

/** The breadcrumb trail for a page - the sidebar's structural depth:
 * [section heading] for top-level pages, [section heading, parent label] for
 * sub-pages. The leaf (the page slug) is appended by the caller. Returns []
 * for pages outside NAV (the `sidebar coverage` gate forbids those). */
export function breadcrumbFor(href: string): string[] {
  for (const s of NAV) {
    for (const item of s.items) {
      if (item.href === href) return [s.heading];
      for (const child of item.children ?? []) {
        if (child.href === href) return [s.heading, item.label];
      }
    }
  }
  return [];
}
