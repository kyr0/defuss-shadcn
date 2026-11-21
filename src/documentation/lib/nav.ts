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
  /** An alpha page: built and reachable by its URL and by the links that name
   *  it, but listed nowhere - no sidebar link, no pager neighbour, no search
   *  entry, no line in the root SKILL.md (each asks `listed`). For a page too
   *  fragile to offer yet; drop the flag when it is ready. It stays in NAV, so
   *  the page keeps its section, breadcrumb and folder. */
  alpha?: boolean;
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
    {
      label: 'Installation',
      href: 'installation.html',
      children: [
        { label: 'Bundles & Downloads', href: 'bundles.html' },
      ],
    },
    { label: 'Vibe Coding / Agentic Engineering', href: 'vibe-coding.html' },
    { label: 'Anatomy of a Component', href: 'anatomy.html' },
    { label: 'Component Skills', href: 'component-skills.html' },
    { label: 'Verified Agentic Engineering (VAE)', href: 'architecture.html' },
    { label: 'Changelog', href: 'changelog.html' },
  ]},
  { heading: 'Guides', icon: 'compass', items: [
    { label: 'Design Language', href: 'design-language.html' },
    {
      label: 'Theming',
      href: 'theming.html',
      children: [
        { label: 'Theme Designer', href: 'theme-designer.html' },
      ],
    },
    { label: 'Dark Mode', href: 'dark-mode.html' },
    { label: 'Data Attribute API', href: 'data-attribute-api.html' },
    { label: 'State API', href: 'state-api.html' },
    { label: 'DOM Querying & Morphing', href: 'dom-querying.html' },
    { label: 'Client-side Routing', href: 'routing.html' },
    { label: 'Translation', href: 'translation.html' },
    { label: 'Global Key Commands', href: 'global-keys.html' },
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
        { label: 'Parallax', href: 'parallax.html' },
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
    { label: 'Text Rotate', href: 'text-rotate.html' },
    { label: 'Typewriter', href: 'typewriter.html' },
    { label: 'Separator', href: 'separator.html' },
    { label: 'Icon', href: 'icon.html' },
    { label: 'Kbd', href: 'kbd.html' },
    { label: 'Heading Anchor', href: 'heading-anchor.html' },
  ]},
  { heading: 'Actions', icon: 'mouse-pointer-click', items: [
    { label: 'Button', href: 'button.html' },
    { label: 'FAB', href: 'fab.html' },
    { label: 'Play Button', href: 'play-button.html' },
    { label: 'Toggle', href: 'toggle.html' },
    { label: 'Swap', href: 'swap.html' },
    { label: 'Toggle Group', href: 'toggle-group.html' },
    { label: 'Button Group', href: 'button-group.html' },
    { label: 'Toolbar', href: 'toolbar.html' },
  ]},
  { heading: 'Forms & Inputs', icon: 'text-cursor-input', items: [
    { label: 'Label', href: 'label.html' },
    { label: 'Input', href: 'input.html' },
    { label: 'OTP Input', href: 'otp-input.html' },
    { label: 'Textarea', href: 'textarea.html' },
    { label: 'Checkbox', href: 'checkbox.html' },
    { label: 'Radio Group', href: 'radio.html' },
    { label: 'Switch', href: 'switch.html' },
    { label: 'Slider', href: 'slider.html' },
    { label: 'Rating', href: 'rating.html' },
    { label: 'Select', href: 'select.html' },
    { label: 'Number Input', href: 'number-input.html' },
    { label: 'File Input', href: 'file-input.html' },
    { label: 'Color Picker', href: 'color-picker.html' },
    { label: 'Date Picker', href: 'date-picker.html' },
    { label: 'Combobox', href: 'combobox.html' },
    { label: 'Search & Filter', href: 'search-filter.html' },
    { label: 'Form', href: 'form.html' },
  ]},
  // one question at a time: a branching step-flow over one native form - the
  // component page, then its topics (sub-pages carry their badge here)
  { heading: 'WYSIWYG Editors', icon: 'square-pen', items: [
    { label: 'HTML Preview Editor', href: 'code-example.html' },
    { label: 'Editor.js', href: 'editorjs.html' },
    { label: 'Visual Editor', href: 'visual-editor.html' },
    // ALPHA (maintainer, 2026-10-18): too fragile to offer - typing a space in a dropped Button's text, drag and drop
    // of many examples (Button icon-sm, charts) - plans/2026-10-14_19-33_visual-editor-studio.md "Alpha"
    { label: 'Studio', href: 'studio.html', type: 'TPL', alpha: true },
  ]},
  { heading: 'Questionnaire', icon: 'list-checks', items: [
    { label: 'Questionnaire', href: 'questionnaire.html' },
    { label: 'Branching', href: 'questionnaire-branching.html', type: 'MOL' },
    { label: 'Validation', href: 'questionnaire-validation.html', type: 'MOL' },
    { label: 'Drafts & History', href: 'questionnaire-drafts.html', type: 'MOL' },
    { label: 'Dependent Answers', href: 'questionnaire-dependencies.html', type: 'MOL' },
    { label: 'Flow Graph', href: 'questionnaire-graph.html', type: 'MOL' },
  ]},
  { heading: 'Data Display', icon: 'layout-grid', items: [
    { label: 'Badge', href: 'badge.html' },
    { label: 'Type Badge', href: 'type-badge.html' },
    { label: 'Avatar', href: 'avatar.html' },
    { label: 'Indicator', href: 'indicator.html' },
    { label: 'Diff', href: 'diff.html' },
    { label: 'Countdown', href: 'countdown.html' },
    { label: 'Card', href: 'card.html' },
    { label: 'Teaser', href: 'teaser.html' },
    {
      label: 'Image',
      href: 'image.html',
      children: [{ label: 'Image Gallery', href: 'image-gallery.html', type: 'MOL' }],
    },
    { label: 'Iframe', href: 'iframe.html' },
    { label: 'Statistic', href: 'statistic.html' },
    { label: 'QR Code', href: 'qr-code.html' },
    { label: 'Table', href: 'table.html' },
    { label: 'Collapsible', href: 'collapsible.html' },
    { label: 'Timeline', href: 'timeline.html' },
    { label: 'Tree View', href: 'tree-view.html' },
    { label: 'Calendar', href: 'calendar.html' },
    { label: 'Carousel', href: 'carousel.html' },
    { label: 'Scroll Area', href: 'scroll-area.html' },
    { label: 'Sortable', href: 'sortable.html' },
  ]},
  // players with a State API, a timeline that drives them and a tablature with its own clock - the Website Video /
  // Audio Player blocks are their CSS-only cousins
  { heading: 'Multimedia', icon: 'clapperboard', items: [
    { label: 'Video', href: 'video.html' },
    { label: 'Audio', href: 'audio.html' },
    { label: 'Media Timeline', href: 'media-timeline.html' },
    { label: 'Fretboard', href: 'fretboard.html' },
    { label: 'Fretboard Neck', href: 'fretboard-neck.html' },
    { label: 'Chord Chart', href: 'chord-chart.html' },
    { label: 'Knobs', href: 'knob.html' },
    { label: 'Envelopes', href: 'envelope.html' },
    { label: 'Tacho', href: 'tacho.html' },
  ]},
  // records by the hundred thousand: windowed DOM, every query local over all
  // rows (defuss-dataview) - Tree Grid is the Data Grid with parents
  { heading: 'Big Data', icon: 'database', items: [
    { label: 'Virtual List', href: 'virtual-list.html' },
    { label: 'Data Tree', href: 'data-tree.html' },
    { label: 'Data Grid', href: 'data-grid.html' },
    { label: 'Tree Grid', href: 'tree-grid.html', type: 'ATM' },
    { label: 'Autocomplete', href: 'autocomplete.html' },
  ]},
  { heading: 'Charts', icon: 'chart-column', items: [
    { label: 'Chart', href: 'chart.html' },
    { label: 'Comparison', href: 'charts-comparison.html', type: 'MOL' },
    { label: 'Change over time', href: 'charts-change.html', type: 'MOL' },
    { label: 'Distribution', href: 'charts-distribution.html', type: 'MOL' },
    { label: 'Composition', href: 'charts-composition.html', type: 'MOL' },
    { label: 'Election', href: 'charts-election.html', type: 'MOL' },
    { label: 'Narrative', href: 'charts-narrative.html', type: 'MOL' },
    { label: 'Big Data', href: 'charts-big-data.html', type: 'MOL' },
  ]},
  { heading: 'Diagrams', icon: 'workflow', items: [
    {
      label: 'Illustrative Diagrams',
      href: 'diagram.html',
      children: [
        { label: 'Architecture', href: 'diagram-architecture.html', type: 'ATM' },
        { label: 'Flow', href: 'diagram-flow.html', type: 'ATM' },
        { label: 'State', href: 'diagram-state.html', type: 'ATM' },
        { label: 'State Lifecycle', href: 'diagram-state-lifecycle.html', type: 'ATM' },
        { label: 'ER', href: 'diagram-er.html', type: 'ATM' },
        { label: 'Timeline', href: 'diagram-timeline.html', type: 'ATM' },
        { label: 'Swimlane', href: 'diagram-swimlane.html', type: 'ATM' },
        { label: 'Nested', href: 'diagram-nested.html', type: 'ATM' },
        { label: 'Organigram', href: 'diagram-organigram.html', type: 'ATM' },
        { label: 'Layers', href: 'diagram-layers.html', type: 'ATM' },
        { label: 'Loop', href: 'diagram-loop.html', type: 'ATM' },
        { label: 'Data Lake', href: 'diagram-data-lake.html', type: 'ATM' },
        { label: 'Medallion', href: 'diagram-medallion.html', type: 'ATM' },
        { label: 'High-level', href: 'diagram-high-level.html', type: 'ATM' },
        { label: 'High-level Parametric', href: 'diagram-high-level-parametric.html', type: 'ATM' },
        { label: 'Process', href: 'diagram-process.html', type: 'ATM' },
        { label: 'Data Flow', href: 'diagram-data-flow.html', type: 'ATM' },
        { label: 'Topology', href: 'diagram-topology.html', type: 'ATM' },
        { label: 'Matrix', href: 'diagram-matrix.html', type: 'ATM' },
        { label: 'Fishbone', href: 'diagram-fishbone.html', type: 'ATM' },
        { label: 'Wardley Map', href: 'diagram-wardley.html', type: 'ATM' },
        { label: 'Kanban', href: 'diagram-kanban.html', type: 'ATM' },
        { label: 'User Journey', href: 'diagram-journey.html', type: 'ATM' },
        { label: 'Deployment', href: 'diagram-deployment.html', type: 'ATM' },
        { label: 'Dependency Graph', href: 'diagram-dependency.html', type: 'ATM' },
        { label: 'UML Class', href: 'diagram-uml-class.html', type: 'ATM' },
        { label: 'Story Map', href: 'diagram-story-map.html', type: 'ATM' },
        { label: 'Sequence', href: 'diagram-sequence.html', type: 'ATM' },
        { label: 'Quadrant', href: 'diagram-quadrant.html', type: 'ATM' },
        { label: 'Policy Trace', href: 'diagram-policy-trace.html', type: 'ATM' },
      ],
    },
    { label: 'Mermaid', href: 'mermaid.html' },
  ]},
  { heading: 'Graphs', icon: 'waypoints', items: [
    { label: 'Graphs Overview', href: 'graphs.html' },
    { label: 'Graph Explorer', href: 'graph-explorer.html' },
    { label: 'Zoom & Navigation', href: 'graph-navigation.html', type: 'MOL' },
    { label: 'Node Renderers', href: 'graph-nodes.html', type: 'MOL' },
    { label: 'Edge Rules & Labels', href: 'graph-edges.html', type: 'MOL' },
    { label: 'Details & Pages', href: 'graph-details.html', type: 'MOL' },
  ]},
  { heading: 'Workflows', icon: 'workflow', items: [
    { label: 'Workflows Overview', href: 'workflows.html' },
    { label: 'Workflow', href: 'workflow.html' },
    { label: 'Large Workflows', href: 'workflow-large.html', type: 'MOL' },
    { label: 'Node Types & Fields', href: 'workflow-nodes.html', type: 'MOL' },
    { label: 'Editing & Structure', href: 'workflow-editing.html', type: 'MOL' },
    { label: 'Running Workflows', href: 'workflow-run.html', type: 'MOL' },
    { label: 'Formats & Import', href: 'workflow-formats.html', type: 'MOL' },
  ]},
  { heading: 'Math', icon: 'sigma', items: [
    { label: 'Math Overview', href: 'math.html' },
    { label: 'Formula Rendering', href: 'math-renderer.html' },
    { label: 'Formula Editing', href: 'math-editor.html' },
    { label: 'Compute & Explain', href: 'math-compute.html' },
  ]},
  { heading: 'Geography', icon: 'globe', items: [
    { label: 'Geography Overview', href: 'geography.html' },
    { label: 'Geo Map', href: 'geo-map.html' },
    { label: 'Regions & Selection', href: 'geo-regions.html', type: 'ATM' },
    { label: 'Search & Focus', href: 'geo-focus.html', type: 'ATM' },
    { label: 'Callouts', href: 'geo-callouts.html', type: 'ATM' },
    { label: 'GPS & Geodesy', href: 'geo-geodesy.html', type: 'ATM' },
    { label: 'S2 Cells', href: 'geo-s2.html', type: 'ATM' },
    { label: 'Routing', href: 'geo-routing.html', type: 'ATM' },
    { label: 'Data & Encoding', href: 'geo-data.html', type: 'ATM' },
  ]},
  { heading: 'Shaders', icon: 'sparkles', items: [
    { label: 'Shaders Overview', href: 'shaders.html' },
    { label: 'Shader', href: 'shader.html' },
    { label: 'Gradients & Noise', href: 'shader-gradients.html', type: 'ATM' },
    { label: 'Light & Glow', href: 'shader-light.html', type: 'ATM' },
    { label: 'Liquid & Glass', href: 'shader-liquid.html', type: 'ATM' },
    { label: 'Patterns & Trails', href: 'shader-patterns.html', type: 'ATM' },
    { label: 'Nature & Space', href: 'shader-nature.html', type: 'ATM' },
    { label: '3D Scenes', href: 'shader-3d.html', type: 'ATM' },
    { label: 'Custom Shaders', href: 'shader-custom.html', type: 'ATM' },
  ]},
  { heading: 'Infinite Surfaces', icon: 'grid-3x3', items: [
    { label: 'Infinite Surfaces', href: 'surfaces.html' },
    { label: 'Surface', href: 'surface.html' },
    { label: 'Classic Patterns', href: 'surface-patterns.html', type: 'ATM' },
    { label: 'Animated Tiles', href: 'surface-motion.html', type: 'ATM' },
    { label: '3D Materials', href: 'surface-materials.html', type: 'ATM' },
    // alpha (the maintainer, 2026-11-07): the scenes are not stable yet - built, reachable by URL, listed nowhere
    { label: 'Floors, Walls & Tunnels', href: 'surface-scenes.html', type: 'ATM', alpha: true },
  ]},
  { heading: 'Feedback & Status', icon: 'bell-ring', items: [
    { label: 'Spinner', href: 'spinner.html' },
    { label: 'Skeleton', href: 'skeleton.html' },
    { label: 'Progress', href: 'progress.html' },
    { label: 'Radial Progress', href: 'radial-progress.html' },
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
    { label: 'Navbar', href: 'navbar.html' },
    { label: 'Dock', href: 'dock.html' },
    { label: 'Breadcrumb', href: 'breadcrumb.html' },
    { label: 'Table of Contents', href: 'toc.html' },
    { label: 'Pagination', href: 'pagination.html' },
    { label: 'Steps', href: 'steps.html' },
    { label: 'Tabs', href: 'tabs.html' },
    { label: 'Dropdown Menu', href: 'dropdown.html' },
    { label: 'Menubar', href: 'menubar.html' },
    { label: 'Navigation Menu', href: 'navigation-menu.html' },
    { label: 'Theme Switcher', href: 'theme-switcher.html' },
    { label: 'Language Switcher', href: 'language-switcher.html' },
  ]},
  { heading: 'Application', icon: 'app-window', items: [
    { label: 'Sidebar', href: 'sidebar.html' },
    { label: 'Resizer', href: 'resizer.html' },
    { label: 'Border Layout', href: 'border-layout.html' },
    { label: 'Panel', href: 'panel.html' },
    { label: 'Property Grid', href: 'property-grid.html' },
    { label: 'Property Tree', href: 'property-tree.html' },
    { label: 'Window', href: 'window.html' },
    { label: 'Document Comments', href: 'doc-comments.html' },
    {
      label: 'Scaffolds',
      href: 'application-scaffolds.html',
      type: 'TPL',
      children: [
        { label: 'Admin Dashboard', href: 'scaffold-admin-dashboard.html', type: 'TPL' },
        { label: 'Messenger', href: 'scaffold-messenger.html', type: 'TPL' },
        { label: 'Issue Tracker', href: 'scaffold-issue-tracker.html', type: 'TPL' },
        { label: 'Notes & Docs', href: 'scaffold-notes.html', type: 'TPL' },
        { label: 'Status Page', href: 'scaffold-status-page.html', type: 'TPL' },
        { label: 'Desktop', href: 'scaffold-desktop.html', type: 'TPL' },
        { label: 'Document Editor', href: 'scaffold-document-editor.html', type: 'TPL' },
        { label: 'Knowledge Graph', href: 'scaffold-knowledge-graph.html', type: 'TPL' },
        { label: 'API Documentation', href: 'scaffold-api-docs.html', type: 'TPL' },
        { label: 'Calendar', href: 'scaffold-calendar.html', type: 'TPL' },
        { label: 'Workflow Studio', href: 'scaffold-workflow-studio.html', type: 'TPL' },
        { label: 'AI Chat', href: 'scaffold-ai-chat.html', type: 'TPL' },
      ],
    },
  ]},
  { heading: 'Desktop', icon: 'monitor', items: [
    { label: 'Window Manager', href: 'window-manager.html' },
    { label: 'Desktop Manager', href: 'desktop-manager.html' },
    { label: 'Taskbar', href: 'taskbar.html' },
    { label: 'Tray', href: 'tray.html' },
    { label: 'Start Button', href: 'start-button.html' },
    { label: 'Start Menu', href: 'start-menu.html' },
    { label: 'Logon', href: 'logon.html' },
    {
      label: 'Desktop',
      href: 'desktop.html',
      children: [
        { label: 'Modern', href: 'desktop-modern.html', type: 'TPL' },
        { label: 'Windows 7 Look', href: 'desktop-windows-7.html', type: 'TPL' },
        { label: 'Windows XP Look', href: 'desktop-windows-xp.html', type: 'TPL' },
        { label: 'Windows 98 Look', href: 'desktop-windows-98.html', type: 'TPL' },
        { label: 'Windows 95 Look', href: 'desktop-windows-95.html', type: 'TPL' },
      ],
    },
  ]},
  { heading: 'Chat', icon: 'messages-square', items: [
    { label: 'Bubble', href: 'bubble.html' },
    { label: 'Marker', href: 'marker.html' },
    { label: 'Message', href: 'message.html' },
    { label: 'Session', href: 'session.html' },
  ]},
  { heading: 'Mockup', icon: 'terminal', items: [
    { label: 'Code', href: 'mockup-code.html' },
    { label: 'Terminal', href: 'terminal.html' },
  ]},
  { heading: 'Presentations', icon: 'presentation', items: [
    { label: 'Presentation', href: 'presentation.html' },
    { label: 'Deck Gallery', href: 'presentations.html', children: [
      { label: 'The System in Numbers', href: 'system-in-numbers.html', type: 'TPL' },
      { label: 'Editorial Highlight Bars', href: 'editorial-highlight-bars.html', type: 'TPL' },
      { label: 'Lollipop Ranking', href: 'lollipop-ranking.html', type: 'TPL' },
      { label: 'Dumbbell Before/After', href: 'dumbbell-before-after.html', type: 'TPL' },
      { label: 'Slopegraph', href: 'slopegraph.html', type: 'TPL' },
      { label: 'Diverging Bars', href: 'diverging-bars.html', type: 'TPL' },
      { label: 'Waterfall', href: 'waterfall.html', type: 'TPL' },
      { label: 'Normalized Stack', href: 'normalized-stack.html', type: 'TPL' },
      { label: 'Bump Ranking', href: 'bump-ranking.html', type: 'TPL' },
      { label: 'Bar Race', href: 'bar-race.html', type: 'TPL' },
      { label: 'Confidence Band', href: 'confidence-band.html', type: 'TPL' },
      { label: 'Annotated Time Series', href: 'annotated-timeseries.html', type: 'TPL' },
      { label: 'Small Multiples', href: 'small-multiples.html', type: 'TPL' },
      { label: 'Scatter Quadrants', href: 'scatter-quadrants.html', type: 'TPL' },
      { label: 'Jittered Distribution', href: 'jittered-distribution.html', type: 'TPL' },
      { label: 'Heatmap Matrix', href: 'heatmap-matrix.html', type: 'TPL' },
      { label: 'Calendar Heatmap', href: 'calendar-heatmap.html', type: 'TPL' },
      { label: 'Theme River', href: 'theme-river.html', type: 'TPL' },
      { label: 'Treemap', href: 'treemap.html', type: 'TPL' },
      { label: 'Sunburst', href: 'sunburst.html', type: 'TPL' },
      { label: 'Sankey', href: 'sankey.html', type: 'TPL' },
      { label: 'Chord', href: 'chord.html', type: 'TPL' },
      { label: 'Editorial Gauge', href: 'editorial-gauge.html', type: 'TPL' },
      { label: 'Parliament Hemicycle', href: 'parliament-hemicycle.html', type: 'TPL' },
      { label: 'Election Majority Bar', href: 'election-majority-bar.html', type: 'TPL' },
      { label: 'Election Hex Cartogram', href: 'election-hex-cartogram.html', type: 'TPL' },
      { label: 'Election Shift Arrows', href: 'election-shift-arrows.html', type: 'TPL' },
      { label: 'Universal Transition', href: 'universal-transition.html', type: 'TPL' },
      { label: 'Waffle Dot Matrix', href: 'waffle-dot-matrix.html', type: 'TPL' },
      { label: 'Boxplot', href: 'boxplot.html', type: 'TPL' },
      { label: 'Violin - Custom Series', href: 'violin-custom.html', type: 'TPL' },
      { label: 'Custom Wind Vectors', href: 'custom-wind-vectors.html', type: 'TPL' },
      { label: 'Story State Machine', href: 'story-state-machine.html', type: 'TPL' },
    ]},
  ]},
  { heading: 'Papers', icon: 'file-text', items: [
    { label: 'Modern Paper', href: 'paper.html' },
    { label: 'Paper Gallery', href: 'paper-gallery.html', children: [
      { label: 'Theme Chooser', href: 'paper-themes.html', type: 'TPL' },
      { label: 'Light and Dark', href: 'paper-dark-mode.html', type: 'TPL' },
      { label: 'House Styles', href: 'paper-styles.html', type: 'TPL' },
      { label: 'Two Columns', href: 'paper-two-column.html', type: 'TPL' },
      { label: 'Redeschrift 1.0', href: 'paper-redeschrift.html', type: 'TPL' },
      { label: 'Code Listings', href: 'paper-code.html', type: 'TPL' },
      { label: 'Charts and Figures', href: 'paper-charts.html', type: 'TPL' },
      { label: 'Before and After', href: 'paper-diff.html', type: 'TPL' },
      { label: 'Table of Contents', href: 'paper-toc.html', type: 'TPL' },
      { label: 'Database Schema', href: 'paper-schema.html', type: 'TPL' },
      { label: 'Images and Video', href: 'paper-media.html', type: 'TPL' },
      { label: 'Big Data', href: 'paper-big-data.html', type: 'TPL' },
      { label: 'Chat Replay', href: 'paper-chat.html', type: 'TPL' },
      { label: 'Formulas', href: 'paper-math.html', type: 'TPL' },
      { label: 'Interactive Math', href: 'paper-math-interactive.html', type: 'TPL' },
    ]},
    { label: 'BibTeX', href: 'bibtex.html' },
  ]},
  { heading: 'Documents', icon: 'files', items: [
    { label: 'Letter', href: 'letter.html' },
    { label: 'Invoice', href: 'invoice.html' },
  ]},
  { heading: 'Website', icon: 'globe', items: [
    {
      label: 'Landing Page',
      href: 'website-landing-page.html',
      type: 'TPL',
      children: [
        { label: 'Site Header', href: 'site-header.html' },
        { label: 'Hero', href: 'hero.html' },
        { label: 'Product Showcase', href: 'product-showcase.html' },
        { label: 'Brand Logos', href: 'brand-logos.html' },
        { label: 'Section Header', href: 'section-header.html' },
        { label: 'Feature Details', href: 'feature-details.html' },
        { label: 'Testimonials', href: 'testimonials.html' },
        { label: 'Stats', href: 'stats.html' },
        { label: 'Pricing', href: 'pricing.html' },
        { label: 'Blog', href: 'blog.html' },
        { label: 'FAQ', href: 'faq.html' },
        { label: 'Get In Touch', href: 'get-in-touch.html' },
        { label: 'Newsletter', href: 'newsletter.html' },
        { label: 'Cookie Consent', href: 'cookie-consent.html' },
        { label: 'Site Footer', href: 'site-footer.html' },
      ],
    },
    {
      label: 'News',
      href: 'website-news.html',
      type: 'TPL',
      children: [
        { label: 'News Header', href: 'news-header.html' },
        { label: 'News Item', href: 'news-item.html' },
        { label: 'News Ticker', href: 'news-ticker.html' },
      ],
    },
    {
      label: 'Blog',
      href: 'website-blog.html',
      type: 'TPL',
      children: [
        { label: 'Blog Header', href: 'blog-header.html' },
        { label: 'Blog Item', href: 'blog-item.html' },
        { label: 'Archive Index', href: 'archive-index.html' },
      ],
    },
    {
      label: 'Article',
      href: 'website-article.html',
      type: 'MOL',
      children: [
        { label: 'Article Header', href: 'article-header.html' },
        { label: 'Article Body', href: 'article-body.html' },
        { label: 'Author Bio', href: 'author-bio.html' },
        { label: 'Author List', href: 'author-list.html' },
        { label: 'Related Item', href: 'related-item.html' },
        { label: 'Share Links', href: 'share-links.html' },
        { label: 'Article Navigation', href: 'article-navigation.html' },
      ],
    },
    {
      label: 'Comments',
      href: 'website-comments.html',
      type: 'MOL',
      children: [
        { label: 'Comment Header', href: 'comment-header.html' },
        { label: 'Comment Item', href: 'comment-item.html' },
        { label: 'Comment Form', href: 'comment-form.html' },
      ],
    },
    {
      label: 'Company',
      href: 'website-company.html',
      type: 'TPL',
      children: [
        { label: 'About Intro', href: 'about-intro.html' },
        { label: 'Team Member', href: 'team-member.html' },
        { label: 'Job Item', href: 'job-item.html' },
        { label: 'Job Details', href: 'job-details.html' },
        { label: 'Application Form', href: 'application-form.html' },
        { label: 'Service Item', href: 'service-item.html' },
        { label: 'Process Step', href: 'process-step.html' },
        { label: 'Use Case', href: 'use-case.html' },
        { label: 'Case Preview', href: 'case-preview.html' },
        { label: 'Case Study', href: 'case-study.html' },
        { label: 'Project Item', href: 'project-item.html' },
        { label: 'Project Details', href: 'project-details.html' },
        { label: 'Timeline Item', href: 'timeline-item.html' },
        { label: 'Integration Item', href: 'integration-item.html' },
        { label: 'Comparison Table', href: 'comparison-table.html' },
        { label: 'Credential Item', href: 'credential-item.html' },
        { label: 'Press Item', href: 'press-item.html' },
      ],
    },
    {
      label: 'Resume & Portfolio',
      href: 'website-resume-portfolio.html',
      type: 'TPL',
      children: [
        { label: 'Resume Header', href: 'resume-header.html' },
        { label: 'Availability', href: 'availability.html' },
        { label: 'Resume Entry', href: 'resume-entry.html' },
        { label: 'Skill Matrix', href: 'skill-matrix.html' },
        { label: 'Repository Item', href: 'repository-item.html' },
        { label: 'Portfolio Grid', href: 'portfolio-grid.html' },
        { label: 'Editorial Portfolio', href: 'portfolio-editorial.html', type: 'TPL' },
        { label: 'Playful Portfolio', href: 'portfolio-playful.html', type: 'TPL' },
        { label: 'Developer Portfolio', href: 'portfolio-developer.html', type: 'TPL' },
        { label: 'Bento Portfolio', href: 'portfolio-bento.html', type: 'TPL' },
        { label: 'Brutalist Portfolio', href: 'portfolio-brutalist.html', type: 'TPL' },
        { label: 'Photographer Portfolio', href: 'portfolio-photographer.html', type: 'TPL' },
        { label: 'Swiss Portfolio', href: 'portfolio-swiss.html', type: 'TPL' },
        { label: 'Neon Portfolio', href: 'portfolio-neon.html', type: 'TPL' },
        { label: 'Zine Portfolio', href: 'portfolio-zine.html', type: 'TPL' },
        { label: 'Minimal Portfolio', href: 'portfolio-minimal.html', type: 'TPL' },
      ],
    },
    {
      label: 'Events & Promotions',
      href: 'website-events-promotions.html',
      type: 'TPL',
      children: [
        { label: 'CTA', href: 'cta.html' },
        { label: 'Announcement', href: 'announcement.html' },
        { label: 'Offer Banner', href: 'offer-banner.html' },
        { label: 'Event Countdown', href: 'event-countdown.html' },
        { label: 'Booking Form', href: 'booking-form.html' },
        { label: 'Event Item', href: 'event-item.html' },
        { label: 'Event Header', href: 'event-header.html' },
        { label: 'Event Description', href: 'event-description.html' },
        { label: 'Speaker Item', href: 'speaker-item.html' },
        { label: 'Session Item', href: 'session-item.html' },
        { label: 'Registration Form', href: 'registration-form.html' },
        { label: 'Location Item', href: 'location-item.html' },
        { label: 'Location Map', href: 'location-map.html' },
        { label: 'Locator Search', href: 'locator-search.html' },
        { label: 'Opening Hours', href: 'opening-hours.html' },
      ],
    },
    {
      label: 'Media',
      href: 'website-media.html',
      type: 'TPL',
      children: [
        { label: 'Gallery Item', href: 'gallery-item.html' },
        { label: 'Media Gallery', href: 'media-gallery.html' },
        { label: 'Text Media', href: 'text-media.html' },
        { label: 'Video Player', href: 'video-player.html' },
        { label: 'Audio Player', href: 'audio-player.html' },
        { label: 'Playlist Item', href: 'playlist-item.html' },
        { label: 'Before After', href: 'before-after.html' },
        { label: 'Social Post', href: 'social-post.html' },
      ],
    },
    {
      label: 'Shop',
      href: 'website-shop.html',
      type: 'TPL',
      children: [
        { label: 'Collection Item', href: 'collection-item.html' },
        { label: 'Product Item', href: 'product-item.html' },
        { label: 'Cart Item', href: 'cart-item.html' },
        { label: 'Cart Summary', href: 'cart-summary.html' },
        { label: 'Discount Form', href: 'discount-form.html' },
        { label: 'Address Form', href: 'address-form.html' },
        { label: 'Delivery Options', href: 'delivery-options.html' },
        { label: 'Payment Form', href: 'payment-form.html' },
        { label: 'Order Summary', href: 'order-summary.html' },
        { label: 'Order Confirmation', href: 'order-confirmation.html' },
        { label: 'Tracking Status', href: 'tracking-status.html' },
        { label: 'Wishlist Item', href: 'wishlist-item.html' },
      ],
    },
    {
      label: 'Account & States',
      href: 'website-account-states.html',
      type: 'TPL',
      children: [
        { label: 'Login Form', href: 'login-form.html' },
        { label: 'Social Login', href: 'social-login.html' },
        { label: 'Signup Form', href: 'signup-form.html' },
        { label: 'Reset Request', href: 'reset-request.html' },
        { label: 'Password Reset', href: 'password-reset.html' },
        { label: 'Profile Header', href: 'profile-header.html' },
        { label: 'Profile Form', href: 'profile-form.html' },
        { label: 'Security Settings', href: 'security-settings.html' },
        { label: 'Notification Settings', href: 'notification-settings.html' },
        { label: 'Support Form', href: 'support-form.html' },
        { label: 'Feedback Form', href: 'feedback-form.html' },
        { label: 'Survey Question', href: 'survey-question.html' },
        { label: 'Form Progress', href: 'form-progress.html' },
        { label: 'Empty State', href: 'empty-state.html' },
        { label: 'Error State', href: 'error-state.html' },
        { label: 'Success State', href: 'success-state.html' },
        { label: 'Coming Soon', href: 'coming-soon.html' },
        { label: 'Maintenance', href: 'maintenance.html' },
        { label: '404 Page', href: 'page-not-found.html' },
      ],
    },
    {
      label: 'Docs & Help',
      href: 'website-docs-help.html',
      type: 'TPL',
      children: [
        { label: 'Resource Item', href: 'resource-item.html' },
        { label: 'Download Item', href: 'download-item.html' },
        { label: 'Docs Navigation', href: 'docs-navigation.html' },
        { label: 'Docs Content', href: 'docs-content.html' },
        { label: 'Code Example', href: 'code-block.html' },
        { label: 'Release Header', href: 'release-header.html' },
        { label: 'Release Item', href: 'release-item.html' },
        { label: 'Roadmap Item', href: 'roadmap-item.html' },
        { label: 'Help Category', href: 'help-category.html' },
        { label: 'Help Article', href: 'help-article.html' },
      ],
    },
    {
      label: 'Showcase',
      href: 'website-showcase.html',
      type: 'TPL',
      children: [
        { label: 'Roastery', href: 'showcase-roastery.html', type: 'TPL' },
        { label: 'Observatory', href: 'showcase-observatory.html', type: 'TPL' },
        { label: 'Bouldering Gym', href: 'showcase-bouldering.html', type: 'TPL' },
        { label: 'Record Shop', href: 'showcase-records.html', type: 'TPL' },
        { label: 'Framework', href: 'showcase-framework.html', type: 'TPL' },
      ],
    },
    {
      label: 'Industries',
      href: 'website-industries.html',
      type: 'TPL',
      children: [
        { label: 'Restaurant', href: 'industry-restaurant.html', type: 'TPL' },
        { label: 'Hair Salon', href: 'industry-salon.html', type: 'TPL' },
        { label: 'Hotel', href: 'industry-hotel.html', type: 'TPL' },
        { label: 'Doctor', href: 'industry-practice.html', type: 'TPL' },
        { label: 'Spa', href: 'industry-spa.html', type: 'TPL' },
        { label: 'Legal Advisor', href: 'industry-law.html', type: 'TPL' },
        { label: 'Agency', href: 'industry-agency.html', type: 'TPL' },
        { label: 'AI Startup', href: 'industry-ai.html', type: 'TPL' },
      ],
    },
    {
      label: 'Search & Navigation',
      href: 'website-search-navigation.html',
      type: 'TPL',
      children: [
        { label: 'Search Box', href: 'search-box.html' },
        { label: 'Search Suggestions', href: 'search-suggestions.html' },
        { label: 'Search Summary', href: 'search-summary.html' },
        { label: 'Search Result', href: 'search-result.html' },
        { label: 'Filter Bar', href: 'filter-bar.html' },
        { label: 'Filter Sidebar', href: 'filter-sidebar.html' },
        { label: 'Active Filters', href: 'active-filters.html' },
        { label: 'Sort Control', href: 'sort-control.html' },
        { label: 'View Switcher', href: 'view-switcher.html' },
        { label: 'Collection Pagination', href: 'collection-pagination.html' },
        { label: 'Load More', href: 'load-more.html' },
        { label: 'Tag Cloud', href: 'tag-cloud.html' },
        { label: 'Tag List', href: 'tag-list.html' },
        { label: 'Category Menu', href: 'category-menu.html' },
        { label: 'Breadcrumbs', href: 'breadcrumbs.html' },
        { label: 'Contents', href: 'contents.html' },
        { label: 'Quick Links', href: 'quick-links.html' },
      ],
    },
  ]},
];

/** Every item including nested children, in reading order. */
export function flattenNav(items: NavItem[]): NavItem[] {
  return items.flatMap((i) => [i, ...flattenNav(i.children ?? [])]);
}

/** Flat ordered list of all pages, alpha ones included. */
export const ALL_PAGES: NavItem[] = NAV.flatMap((s) => flattenNav(s.items));

/** The items a listing shows: every one but the alpha pages, children included - the sidebar, the pager, the search
 *  index and the root SKILL.md list what this returns. VERIFIED: (2026-10-18) documentation.e2e finds the alpha
 *  Studio in none of them and its page rendered; with this returning every item the check failed. */
export function listed(items: NavItem[]): NavItem[] {
  return items.filter((i) => !i.alpha).map((i) => (i.children ? { ...i, children: listed(i.children) } : i));
}

/** Flat ordered list of the listed pages - the prev/next pager's universe (an alpha page has no neighbours and is
 *  no one's). */
export const LISTED_PAGES: NavItem[] = NAV.flatMap((s) => flattenNav(listed(s.items)));

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
