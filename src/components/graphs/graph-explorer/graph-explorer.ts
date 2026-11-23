// -- Graph Explorer (graph-explorer) -------------------------------------------
// A knowledge graph of 2,000 to 4,000,000 nodes in plain DOM + canvas, after the design study "A Million-Node
// Knowledge Graph Renderer for defuss-shadcn" (the graph-explorer PoC, MIT, Aron Homberg):
//
// - A fixed render budget: a Web Worker owns the graph (CSR edges), the cluster hierarchy, the layouts, the cycles
//   and the far field. It draws every dot and bulk edge into an OffscreenCanvas and decides each node's tier
//   (dot / chip / card) with box collision. The main thread projects a bounded pool of DOM slots with the live camera
//   every frame. VERIFIED: (graph-explorer.e2e "budget") a 1,000,000-node graph keeps fewer than 700 elements in the
//   explorer however far you zoom.
// - One clock: the worker's bitmap is committed in the same requestAnimationFrame as the DOM writes, with a corrective
//   transform when it was drawn for an older camera.
// - Semantic zoom with a floating origin: every cluster is a unit disk; zooming into one dives into it (the frame
//   rebases), zooming out or panning off its disk moves up; the parent level stays as a dimmed backdrop.
// - Plugins: node, edge and detail renderers return html`` (SafeHtml, every interpolation escaped and sanitized);
//   edge styles are declarative rules the worker evaluates (functions never cross into it). Every markup write goes
//   through defuss-morph (pooled, keyless slots, morphed only when their markup changed).
// - The page composes the rest: a breadcrumb, a search box, an outline, details, relations, a layer switch and
//   readouts are OUTLETS - any element with data-graph-explorer-for="<id>" and data-graph-explorer-outlet - filled by
//   this runtime (their content is chrome, data-ce-chrome). The full application is a Border Layout of Panels on the
//   page, not markup this component builds: Expand maximizes the Panel that holds the details outlet.
//
// The worker is ONE function (graphExplorerWorker below) started as a classic Blob worker - the pattern Compute &
// Explain ships: it works inside opaque-origin sandboxes (the docs cards). Being stringified, it may reference
// nothing outside itself.
//
// State lives ON the element (data-* + the store); the bound `api` is the only state mutator (AGENTS.md "State API").

import {
  defussGlobals,
  defussQuery,
  componentState,
  bindComponent,
  unbindComponent,
} from '../../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();
// the morph half of the runtime (defuss-morph): a parsed node as a VNode, and morph
const morphRuntime = dfDollar as unknown as {
  domNodeToVNode: (node: Node) => any;
  morph: (target: Element, content: any[], options?: Record<string, unknown>) => void;
};
/** markup as VNodes: the browser's HTML parser (one pass), each top-level node through defuss-morph */
const parseVNodes = (markup: string): any[] =>
  [...new DOMParser().parseFromString(`<body>${markup}</body>`, 'text/html').body.childNodes].map((n) =>
    morphRuntime.domNodeToVNode(n),
  );

// 'default' = the top level, nothing selected; 'selected' = nodes picked at the top level; 'focused' = inside a
// cluster (its id is the focus), with or without a selection there
const graphExplorerStates = ['default', 'selected', 'focused'];

// -- types ----------------------------------------------------------------------

/** Markup made by html`` - every interpolation escaped; the only value a renderer may return. */
export interface SafeHtml {
  /** the markup, its interpolations escaped */
  readonly html: string;
}

/** A tone: a color role of the theme (muted text, ink, an accent, a link, healthy, warning, danger). */
export type GraphTone = 'muted' | 'ink' | 'accent' | 'link' | 'ok' | 'warn' | 'danger';

/** The breaker facts of a link: one circuit breaker, or the worst of the many an aggregated link bundles. */
export interface GraphBreaker {
  /** closed (healthy), half-open (probing), open (tripped) or cut (by hand) */
  state: 'closed' | 'half-open' | 'open' | 'cut';
  /** trips counted */
  trips: number;
  /** minutes since the breaker left closed */
  since: number;
  /** probes a half-open breaker sends */
  probes: number;
  /** probes that succeeded */
  probesOk: number;
  /** who cut it */
  by: string;
  /** member breakers open */
  open: number;
  /** member breakers half-open */
  half: number;
  /** member breakers cut */
  cut: number;
  /** breakers the link bundles */
  members: number;
  /** true when the link bundles several breakers (an edge between clusters) */
  aggregate: boolean;
  /** the share of open members, 0 to 1 */
  openShare: number;
  /** the share of members not closed, 0 to 1 */
  badShare: number;
}

/** A cluster's breakers by state, summed over its links at this level. */
export interface GraphBreakerCounts {
  /** open breakers */
  open: number;
  /** half-open breakers */
  half: number;
  /** cut breakers */
  cut: number;
  /** breakers in all */
  total: number;
}

/** The attributes of an entity (a leaf node). */
export interface GraphEntityAttrs {
  /** its owner (a generated graph only) */
  owner?: string;
  /** rows, in thousands (a generated graph only) */
  rows?: number;
  /** hours since its last update (a generated graph only) */
  freshness?: number;
  /** outgoing links */
  out: number;
  /** incoming links */
  in: number;
}

/** A node as renderers see it: a cluster (a domain or a system) or an entity. */
export interface GraphNode {
  /** the stable id: c<number> for a cluster, n<number> for an entity */
  id: string;
  /** its index in the current view */
  i: number;
  /** a cluster has children; an entity is a leaf */
  kind: 'cluster' | 'entity';
  /** its name */
  label: string;
  /** its type number (its color is type modulo 8) */
  type: number;
  /** its type's name: a loaded graph's from its types; a generated graph's Domain, API, Worker, Store, Stream - or an
   *  entity's Dataset, Endpoint, Document, Person, Job, Topic */
  typeName: string;
  /** the page's id of a loaded node (nodes.ref, or clusters.ref for a cluster when given); absent in a generated
   *  graph */
  ref?: string;
  /** the entities below a cluster (1 for an entity) */
  members: number;
  /** a cluster's direct children (0 for an entity) */
  children: number;
  /** its links at this level */
  degree: number;
  /** the size of its strongly connected component - more than 1 = in a cycle */
  scc: number;
  /** its center, in the view's unit disk */
  x: number;
  /** its center, in the view's unit disk */
  y: number;
  /** its radius, in the view's unit disk */
  r: number;
  /** the hierarchy level of the view it is in (0 = the top) */
  depth: number;
  /** a cluster's breakers, summed over its links at this level (null in an entity view and in a loaded graph) */
  breakers?: GraphBreakerCounts | null;
  /** an entity's attributes */
  attrs?: GraphEntityAttrs;
}

/** How a link is drawn - what the edge rules decide. */
export interface GraphEdgeStyle {
  /** its color role */
  tone?: GraphTone;
  /** its stroke width in px */
  width?: number;
  /** an arrowhead at the target, or none */
  arrow?: 'end' | 'none';
  /** a dash pattern in px */
  dash?: number[];
  /** animated dashes that move along a link with traffic (1 = on) */
  flow?: number;
  /** a slow pulse */
  pulse?: boolean;
  /** a gap in the middle: a broken link */
  gap?: boolean;
  /** 'around': drawn as a curve (a cycle's back-edge) */
  route?: 'straight' | 'around';
}

/** A link between two nodes of the view. */
export interface GraphEdge {
  /** its index in the view */
  k: number;
  /** the index of its source node in the view */
  a: number;
  /** the index of its target node in the view */
  b: number;
  /** links from a to b (an aggregate counts its members) */
  count: number;
  /** links from b to a */
  count2: number;
  /** true when it runs both ways */
  bidir: boolean;
  /** true when it is the back-edge of a cycle */
  back: boolean;
  /** 'leaf' between entities, 'agg' between clusters (it bundles the links below) */
  kind: 'leaf' | 'agg';
  /** the relation: a type of the loaded graph's types.edge (calls, reads or owns in a generated graph; calls for an
   *  aggregate) */
  type: string;
  /** its breaker facts (null when it has none - always in a loaded graph) */
  breaker: GraphBreaker | null;
  /** true while traffic flows (the live simulation) */
  traffic: boolean;
  /** how the rules draw it */
  style: GraphEdgeStyle;
}

/** One condition of an edge rule; every condition of a rule must hold. */
export interface GraphCondition {
  /** the edge field, dotted for nested ones: 'kind', 'type', 'breaker.state', 'breaker.openShare' */
  field: string;
  /** the value must equal this */
  equals?: string | number | boolean;
  /** the value must be one of these */
  in?: (string | number | boolean)[];
  /** the value must exist (true) or be missing (false) */
  exists?: boolean;
  /** the value must be at least this */
  gte?: number;
  /** the value must be at most this */
  lte?: number;
}

/** An edge rule: plain data the worker evaluates for every link it draws; the highest priority that matches wins. */
export interface GraphRule {
  /** the conditions, all of which must hold */
  when?: GraphCondition[];
  /** the style it gives */
  style: GraphEdgeStyle;
  /** its rank among the rules that match (default 0; a plugin registered on one element adds 1000) */
  priority?: number;
}

/** One step of a path from the top: a cluster or the node itself. */
export interface GraphPathStep {
  /** the step's id */
  id: string;
  /** the step's name */
  label: string;
}

/** A relation of a cluster at its level (details of a cluster). */
export interface GraphRelation {
  /** the other cluster's id */
  id: string;
  /** the other cluster's name */
  label: string;
  /** links from the cluster to it */
  out: number;
  /** links from it to the cluster */
  in: number;
  /** the breaker facts of the link */
  breaker: GraphBreaker | null;
  /** true when the link is the back-edge of a cycle */
  back: boolean;
}

/** An outgoing link of an entity (details of an entity). */
export interface GraphLink {
  /** the target's id */
  id: string;
  /** the target's name */
  label: string;
  /** the target's type */
  type: string;
  /** the target's system */
  system: string;
  /** the target's domain */
  domain: string;
  /** the relation: calls, reads or owns */
  edge: string;
  /** true when the target is in the same system */
  same: boolean;
}

/** What the worker knows about a node beyond its view: path, relations, counts. */
export interface GraphDetails {
  /** the node's id */
  id: string;
  /** the path from the top to the node */
  path: GraphPathStep[];
  /** a cluster's relations at its level, the busiest first (at most 60) */
  relations?: GraphRelation[];
  /** a cluster's entities */
  members?: number;
  /** a cluster's direct children */
  children?: number;
  /** a cluster's hierarchy level */
  level?: number;
  /** an entity's outgoing links (at most 40) */
  out?: GraphLink[];
  /** an entity's incoming links (the sources; at most 40) */
  in?: GraphLink[];
  /** an entity's outgoing links in all */
  outDeg?: number;
  /** an entity's incoming links in all */
  inDeg?: number;
}

/** One end of a link in an edge's details. */
export interface GraphEdgeEnd {
  /** the node's id */
  id: string;
  /** the node's name */
  label: string;
  /** its type: an entity type (Dataset, Endpoint, ...) or a cluster kind (API system, Domain, ...) */
  type: string;
  /** the system it belongs to (entities) */
  system?: string;
}

/** A bundled pair of systems inside an edge between clusters, with its circuit breaker. */
export interface GraphEdgePair {
  /** the calling system */
  from: GraphEdgeEnd;
  /** the called system */
  to: GraphEdgeEnd;
  /** the links between them */
  count: number;
  /** the breaker: closed, half-open, open or cut */
  state: string;
  /** how often it tripped */
  trips: number;
  /** how long it has been in its state (minutes) */
  since: number;
  /** who changed it last */
  by: string;
}

/** A node that sends or receives a share of an edge's links. */
export interface GraphEdgeShare {
  /** its id */
  id: string;
  /** its name */
  label: string;
  /** its type */
  type: string;
  /** its links on this edge */
  count: number;
}

/** One link between two entities, as a sample of an edge. */
export interface GraphEdgeSample {
  /** the source entity */
  from: GraphEdgeEnd;
  /** the target entity */
  to: GraphEdgeEnd;
  /** the relation: calls, reads or owns */
  type: string;
  /** true when it runs from the edge's target back to its source */
  back: boolean;
}

/** What the worker knows about an edge: its links both ways, by relation, the bundled breakers and samples. */
export interface GraphEdgeDetails {
  /** the edge's id: '<source id>><target id>' */
  id: string;
  /** 'leaf' between entities, 'agg' between clusters */
  kind: 'leaf' | 'agg';
  /** the path from the top to the view the edge is in */
  path: GraphPathStep[];
  /** the source end */
  source: GraphEdgeEnd;
  /** the target end */
  target: GraphEdgeEnd;
  /** links from the source to the target */
  forward: number;
  /** links from the target back to the source */
  backward: number;
  /** links per relation (calls, reads, owns), both ways */
  byType: Record<string, number>;
  /** the system pairs it bundles with their breakers, the worst first (at most 40) */
  pairs: GraphEdgePair[];
  /** the source's members that send the most links (at most 8) */
  sources: GraphEdgeShare[];
  /** the target's members that receive the most links (at most 8) */
  targets: GraphEdgeShare[];
  /** single links between entities, both ways (at most 40) */
  samples: GraphEdgeSample[];
}

/** A selected link as its detail renderer gets it: the two ends and the view's edge. */
export interface GraphEdgeItem {
  /** always 'edge' */
  kind: 'edge';
  /** '<source id>><target id>' - the value of data-selected-edge */
  id: string;
  /** the source node */
  source: GraphNode;
  /** the target node */
  target: GraphNode;
  /** the edge in the view: counts, relation, breaker, style */
  edge: GraphEdge;
  /** the hierarchy level of the view (0 = the top) */
  depth: number;
}

/** An edge detail renderer: what the details outlet shows for a selected link (an edge plugin's `detail`). */
export interface GraphEdgeDetail {
  /** a score for a link, or false when it does not describe it; the highest wins (default 0) */
  match?: (item: GraphEdgeItem) => number | false;
  /** the details title for the link */
  title?: (item: GraphEdgeItem) => string;
  /** the markup (or a Promise of it); ctx.expanded asks for the link's full page */
  render: (item: GraphEdgeItem, ctx: GraphRenderContext) => SafeHtml | Promise<SafeHtml>;
  /** whether the link has a page (default: every link) - without one no Expand button shows and E does nothing */
  page?: (item: GraphEdgeItem) => boolean;
}

/** A cluster's view: its children laid out in its unit disk, and the links between them. */
export interface GraphView {
  /** the cluster's id (c0 = the top) */
  id: string;
  /** the path from the top to the cluster */
  path: GraphPathStep[];
  /** the cluster's children */
  children: GraphNode[];
  /** the links between them */
  edges: GraphEdge[];
  /** true when the children are entities */
  leafView: boolean;
}

/** Options of an icon. */
export interface GraphIconOptions {
  /** an accessible name; without one the icon is decorative (aria-hidden) */
  label?: string;
  /** its color role */
  tone?: GraphTone;
  /** xs, sm, lg or xl (default 1rem) */
  size?: 'xs' | 'sm' | 'lg' | 'xl';
  /** a type number: the icon takes that type's color (with the graph-explorer-type-icon class) */
  type?: number;
  /** extra classes */
  cls?: string;
}

/** What a node or detail renderer gets besides the node. */
export interface GraphRenderContext {
  /** chip or card for a node in the graph; detail for the details outlet; relations for the relations outlet */
  tier: 'chip' | 'card' | 'detail' | 'relations';
  /** true when the node is selected */
  selected: boolean;
  /** true while the pointer is over the node */
  highlighted: boolean;
  /** true when the node has the keyboard focus */
  focused: boolean;
  /** the hierarchy level of the view (0 = the top) */
  depth: number;
  /** the camera's zoom: screen px per unit of the view's disk */
  zoom: number;
  /** true when the details outlet is expanded (its Panel maximized): render the node's full page */
  expanded: boolean;
  /** the layers shown (data-layers): nodes, relations, labels, health and the plugins' */
  layers: string[];
  /** true when every node is drawn as a one-line chip (data-compact) */
  compact: boolean;
  /** true for a generated graph (data-nodes): only it has breakers, Live mode and owner, rows and freshness; false
   *  for a graph given to load() */
  synthetic: boolean;
  /** a node renderer: the parts the shown layers add to this node at this tier - put them where they belong (the
   *  explorer appends them after the markup of a renderer that leaves them out) */
  parts: SafeHtml;
  /** the escaping template tag */
  html: (strings: TemplateStringsArray, ...values: unknown[]) => SafeHtml;
  /** an icon */
  icon: (name: string, options?: GraphIconOptions) => SafeHtml;
  /** the value of a data-graph-explorer-action attribute: enter, bring, expand, collapse, details */
  action: (name: string) => string;
  /** a link drawn by the edge label renderers, at a tier */
  edgeLabel: (edge: Partial<GraphEdge>, tier?: 'icon' | 'label' | 'full') => SafeHtml;
  /** a cluster's view, loaded by the worker */
  fetchView: (id: string) => Promise<GraphView>;
  /** a node's details, loaded by the worker */
  fetchDetails: (id: string) => Promise<GraphDetails>;
  /** an edge's details, loaded by the worker: its links both ways, by relation, its breakers and samples */
  fetchEdge: (id: string) => Promise<GraphEdgeDetails>;
  /**
   * markup the details keep as it is while its key and its markup stay the same: a library component with a script
   * (a Chart, a Geo Map, an Avatar) keeps what its script made when the details render again; `mount` runs once
   * when the island's element is made (bind a grid's records, a chart's data) and what it returns when it goes
   */
  island: (key: string, content: SafeHtml, mount?: GraphIslandMount) => SafeHtml;
  /** true when the node (or the link) has a page to expand to: a details outlet shows it and its detail renderer offers
   *  one - an Expand button belongs only there */
  expandable: boolean;
  /** every row behind a node or a link, built by the worker: the entities below a cluster, a link's single links */
  fetchRows: (id: string) => Promise<GraphRows>;
  /** a value loaded once per key: undefined until it first arrives, then the node renders again with it; when the data
   *  moves on (a Live mode update) the key loads again and the last answer stays meanwhile */
  request: <T>(key: string, load: () => T | Promise<T>) => T | undefined;
}

/** Runs once when an island's element is made - bind a component to it (a grid's records, a chart's data); the
 *  function it returns runs when the island goes. */
export type GraphIslandMount = (el: HTMLElement) => void | (() => void);

/** One node of a subtree (subtree()) - a flat record a tree grid takes (data-parent-field="parent"). */
export interface GraphTreeRow {
  /** the node's id (c<number> a cluster, n<number> an entity) */
  id: string;
  /** the parent's id; '' for the subtree's root */
  parent: string;
  /** the node's name */
  label: string;
  /** cluster or entity */
  kind: 'cluster' | 'entity';
  /** what it is: a loaded graph's type name; a generated graph's Graph, Domain, a system kind (API, Worker, Store,
   *  Stream) or an entity type (Dataset, Endpoint ...) */
  type: string;
  /** the hierarchy level in the whole graph (0 = the top) */
  level: number;
  /** a cluster's members (every entity below it), an entity's links (in + out) */
  count: number;
  /** the children it has in the graph - also when the subtree stops above them */
  children: number;
  /** the page's id of a loaded node (or of a cluster with clusters.ref); absent in a generated graph */
  ref?: string;
}

/** One hit of find(): a cluster or an entity whose name holds the query. */
export interface GraphSearchResult {
  /** the node's id */
  id: string;
  /** the node's name */
  label: string;
  /** cluster or entity */
  kind: 'cluster' | 'entity';
  /** its type's name: a loaded graph's, or Domain, a system kind or an entity type */
  type: string;
  /** the clusters above it, joined by ' › ' */
  path: string;
  /** the clusters above it, the top first - id and name each */
  parents: { id: string; label: string }[];
  /** the page's id of a loaded node (or of a cluster with clusters.ref); absent in a generated graph */
  ref?: string;
}

/** Every row behind a node or a link (ctx.fetchRows) - the records a Data Grid takes. */
export interface GraphRows {
  /** the node's or the link's id */
  id: string;
  /** entities: every entity below a cluster (or the entity itself); links: a link's single links, both ways */
  kind: 'entities' | 'links';
  /** an entity: id, label, type, system (its cluster), domain (the one above), out, in - and owner, rows (thousands),
   *  freshness (hours) in a generated graph, ref in a loaded one; a link: id, from, fromLabel, relation, to, toLabel,
   *  direction (forward, back), fromSystem, toSystem */
  rows: GraphRow[];
}

/** One row of GraphRows: plain values. */
export type GraphRow = Record<string, string | number>;

/** What an edge label renderer gets besides the edge. */
export interface GraphEdgeContext {
  /** icon, label or full - picked by the edge's length on screen, the budgets and the free space */
  tier: 'icon' | 'label' | 'full';
  /** the hierarchy level of the view (0 = the top) */
  depth: number;
  /** the camera's zoom */
  zoom: number;
  /** the view's id */
  view: string | null;
  /** the escaping template tag */
  html: (strings: TemplateStringsArray, ...values: unknown[]) => SafeHtml;
  /** an icon */
  icon: (name: string, options?: GraphIconOptions) => SafeHtml;
  /** the link's source node (labels in the graph) */
  source?: GraphNode;
  /** the link's target node (labels in the graph) */
  target?: GraphNode;
  /** true when an end of the link is selected */
  selected?: boolean;
}

/** An edge label renderer: DOM labels and icons along links, chosen per zoom level. */
export interface GraphEdgeLabel {
  /** the shortest on-screen length (px) for each tier */
  levels?: { icon?: number; label?: number; full?: number };
  /** the box [width, height] of each tier, for collision */
  sizes?: { icon?: [number, number]; label?: [number, number]; full?: [number, number] };
  /** the hierarchy levels it labels (null = all) */
  depths?: number[] | null;
  /** its own cap per tier */
  budget?: { icon?: number; label?: number; full?: number } | null;
  /** a score for an edge, or false when it does not label it */
  match: (edge: GraphEdge, ctx: GraphEdgeContext) => number | false;
  /** the rank of an edge's label (the busiest or worst first) */
  priority?: (edge: GraphEdge, ctx: GraphEdgeContext) => number;
  /** the label's markup */
  render: (edge: GraphEdge, ctx: GraphEdgeContext) => SafeHtml;
}

/** A plugin: a node renderer (kind 'node'), edge rules and labels (kind 'edge') or a detail renderer (kind 'detail'). */
export interface GraphPlugin {
  /** node, edge, detail or update */
  kind: 'node' | 'edge' | 'detail' | 'update';
  /** its name (error messages, the HUD) */
  name: string;
  /** node / detail: a score for a node, or false; the highest wins, the later of equal ones */
  match?: (node: GraphNode) => number | false;
  /** node: the box of each tier, [width, height] in px - a part's: a chip part adds its width to the chip, a card
   *  part its height to the card (its width is the least the card needs) */
  sizes?: GraphSizes | ((node: GraphNode) => GraphSizes);
  /** node / detail: the markup (a detail renderer may return a Promise of it) */
  render?: (node: GraphNode, ctx: GraphRenderContext) => SafeHtml | Promise<SafeHtml>;
  /** node: a key of what the markup depends on beyond the node (a slot morphs only when it changes) */
  key?: (node: GraphNode, ctx: GraphRenderContext) => string;
  /** node: the layer this renderer draws a part of (a lowercase word) - without one it draws the node itself (the
   *  nodes layer); edge: the layer its rules and labels belong to (default: relations for rules, labels for labels) */
  layer?: string;
  /** node / edge: the layer's name in the layer switch (a plugin's own layer) */
  layerLabel?: string;
  /** node / edge: the layer's icon in the layer switch */
  layerIcon?: string;
  /** node / edge: the layer's colour, any CSS colour (default: the next chart colour) */
  layerColor?: string;
  /** detail: the details title for a node */
  title?: (node: GraphNode) => string;
  /** detail: whether a node has a page (default: every node) - without one no Expand button shows and E does nothing */
  page?: (node: GraphNode) => boolean;
  /** edge: the style rules (plain data) */
  rules?: GraphRule[];
  /** edge: the label renderer */
  label?: GraphEdgeLabel;
  /** edge: the details of a selected link (the details outlet, its full page when expanded) */
  detail?: GraphEdgeDetail;
  /** update: the row renderer of the Updates outlet */
  update?: GraphUpdateRenderer;
}

/** A node renderer's boxes: [width, height] in px per tier (a part: the width a chip part adds, the height a card part
 *  adds). */
export interface GraphSizes {
  /** the chip's box */
  chip?: [number, number];
  /** the card's box */
  card?: [number, number];
}

/** A layer of information the layer switch shows or hides. */
export interface GraphLayer {
  /** its name (a word of data-layers) */
  name: string;
  /** its label */
  label: string;
  /** its icon */
  icon: string;
  /** its colour: the CSS colour its switch, its parts and its labels are drawn in */
  color: string;
  /** true for the base layers (nodes, relations) - shown while data-layers is absent */
  base: boolean;
  /** true while it is shown */
  shown: boolean;
}

/** The camera: where the view's unit disk is shown. */
export interface GraphCamera {
  /** the center, in the view's unit disk */
  cx: number;
  /** the center, in the view's unit disk */
  cy: number;
  /** screen px per unit */
  z: number;
}

/** What inspect() reports: the camera, the view, the budget's use and the worker's timing. */
export interface GraphInspection {
  /** the view's id */
  view: string | null;
  /** the camera */
  cam: GraphCamera;
  /** DOM slots in use */
  slots: number;
  /** true while a flight runs */
  flight: boolean;
  /** true while a navigation runs */
  navigating: boolean;
  /** frames behind the camera */
  lag: number;
  /** the elements inside the explorer */
  elements: number;
  /** the worker's last frame: cards, chips, dots, edges, labels, ms */
  worker: Record<string, number>;
  /** the graph: nodes, edges, clusters, ms (the time to generate it, or to check and install a loaded one) */
  graph: Record<string, number> | null;
  /** the view's children with their positions (with { children: true }) */
  children?: { id: string; label: string; x: number; y: number; r: number }[];
  /** the view's edges by id, with their link counts (with { children: true }) */
  edges?: { id: string; count: number; count2: number; kind: string }[];
  /** the boxes [x, y, width, height] of the labels the worker drew into the canvas (with { children: true }) */
  dotLabels?: number[][];
}

/** setState() config: what the markup says - the focus, the selection, the layers, the expanded details. */
export interface GraphExplorerConfig {
  /** the cluster the view is in (null = the top); 'focused' needs one */
  focus?: string | null;
  /** the selected node ids, space separated or as a list */
  selected?: string | string[];
  /** the layers shown, space separated or as a list: nodes, relations, labels, health or a plugin's (none: only the
   *  clusters' circles and dots) - data-layers, absent for the base layers nodes and relations */
  layers?: string | string[];
  /** every node as a one-line chip (data-compact) */
  compact?: boolean;
  /** the details outlet expanded to the selection's page (the first selected node's, or the link's) */
  expanded?: boolean;
  /** the selected link: '<source id>><target id>' of two nodes in the view; a node selection clears it */
  edge?: string | null;
}

/** setState() configs per state - every state takes the whole config (merged into the current one). */
export interface GraphExplorerStateConfigs {
  /** The top level, nothing selected - the focus and the selection are cleared. */
  default: GraphExplorerConfig;
  /** Nodes (`config.selected`) or a link (`config.edge`) picked at the top level; an id deeper down flies there and lands in focused. */
  selected: GraphExplorerConfig;
  /** Inside the cluster `config.focus` (the view dives there), with or without a selection. */
  focused: GraphExplorerConfig;
}

/** graph-explorer-select: the selection changed. */
export interface GraphExplorerSelectDetail {
  /** the selected node ids */
  selected: string[];
  /** the selected link ('<source id>><target id>'), null when nodes or nothing is selected */
  edge: string | null;
}

/** graph-explorer-focus: the view moved to another cluster. */
export interface GraphExplorerFocusDetail {
  /** the cluster's id, null at the top */
  focus: string | null;
  /** the path from the top to it */
  path: GraphPathStep[];
}

/** graph-explorer-view: the camera came to rest. */
export interface GraphExplorerViewDetail {
  /** the cluster the view is in, null at the top */
  focus: string | null;
  /** the camera */
  camera: GraphCamera;
}

/** graph-explorer-action: an action button was used (in a card, the details or bound to the explorer). */
export interface GraphExplorerActionDetail {
  /** the action: enter, bring, expand, collapse, details, up, fit, live, help */
  action: string;
  /** the node it acted on, null for the explorer's own actions */
  id: string | null;
}

/** graph-explorer-layers: a layer was shown or hidden, or Compact switched. */
export interface GraphExplorerLayersDetail {
  /** the layers shown now */
  layers: string[];
  /** true when every node is a one-line chip */
  compact: boolean;
}

/** A change in the graph: a node or a link that changed, as the Updates outlet lists it and the graph marks it (a
 *  glowing dot on a node, a link that flashes in its layer's colour). Live mode's simulation makes them; an app adds its
 *  own with update(). */
export interface GraphUpdate {
  /** a unique id (made when an update leaves it out) */
  id: string;
  /** when it happened, in ms since the epoch */
  time: number;
  /** what changed: a node, or a link between two nodes */
  kind: 'node' | 'edge';
  /** the node's id, or the link's '<from>><to>' */
  target: string;
  /** a link's view: the cluster whose children it joins ('c0' the top level) - a click goes there first */
  view?: string;
  /** the layer it belongs to: it shows while that layer is shown (nodes, relations, labels, health or a plugin's) */
  layer: string;
  /** a short word for the kind of change: deploy, breaker, traffic, count ... */
  type: string;
  /** what happened, one line */
  text: string;
  /** the target's name (the explorer fills it in for a node or link of the view it shows) */
  label: string;
  /** its tone: ok, warn, danger, accent ... (the row's dot; default: the layer's colour) */
  tone?: GraphTone;
}

/** graph-explorer-update: a node or a link changed. */
export interface GraphExplorerUpdateDetail {
  /** the change, as the Updates outlet lists it */
  update: GraphUpdate;
}

/** What an update renderer gets beside the update. */
export interface GraphUpdateContext {
  /** the escaping template tag every renderer returns its markup through */
  html: (strings: TemplateStringsArray, ...values: unknown[]) => SafeHtml;
  /** an icon of the explorer's set */
  icon: (name: string, opts?: GraphIconOptions) => SafeHtml;
  /** a layer's colour (any CSS colour) */
  color: (layer: string) => string;
  /** a time, formatted for the row (hours, minutes, seconds) */
  time: (ms: number) => string;
}

/** An update renderer: one compact row of the Updates outlet (the explorer wraps it in the button that selects the
 *  target). */
export interface GraphUpdateRenderer {
  /** a score for an update, or false; the highest wins, the later of equal ones (default 0) */
  match?: (update: GraphUpdate) => number | false;
  /** the row's content */
  render: (update: GraphUpdate, ctx: GraphUpdateContext) => SafeHtml;
}

/** graph-explorer-error: the worker or a renderer failed, or load() refused its data (the graph shown stays). */
export interface GraphExplorerErrorDetail {
  /** what failed - for refused data 'Invalid graph data: ' and the first thing wrong */
  message: string;
}

/**
 * A graph of the page's for load(): every array indexed by number, the typed ones transferred to the worker (each
 * backed by an ArrayBuffer of its own: a view's whole buffer moves; a SharedArrayBuffer is refused, since the page
 * could change it after the check). Cluster 0 is the root; the clusters come in BFS order with each one's children
 * contiguous (clusters.parent never decreases), the nodes sorted by cluster, the edges an out-CSR over the nodes. A
 * cluster holds clusters or nodes, never both and never none, and at most 1,024 of them; at most 256 cluster levels
 * (the root's included). Ids follow the indices: c<cluster>, n<node>. The node labels and refs come as lists of
 * strings or packed as UTF-8 (GraphExplorerStrings), which moves with the typed arrays instead of being copied.
 */
export interface GraphExplorerData {
  /** the hierarchy: parent (-1 for the root, else an earlier cluster), type (an index into types.cluster), label and
   *  an optional ref (the page's id) per cluster */
  clusters: { parent: Int32Array; type: Uint8Array; label: string[]; ref?: string[] };
  /** the entities: cluster (non-decreasing), type (into types.node), label and ref (the page's id) per node, each a
   *  list of strings or GraphExplorerStrings */
  nodes: {
    cluster: Int32Array;
    type: Uint8Array;
    label: string[] | GraphExplorerStrings;
    ref: string[] | GraphExplorerStrings;
  };
  /** the links as an out-CSR: node i's targets are target[start[i]] to target[start[i + 1] - 1] (start holds nodes +
   *  1 entries, start[nodes] = target.length), type (into types.edge) per link */
  edges: { start: Int32Array; target: Int32Array; type: Uint8Array };
  /** the names of the type indices */
  types: { cluster: string[]; node: string[]; edge: string[] };
}

/**
 * Strings packed as UTF-8, end to end: string i is bytes[offsets[i]] up to (excluding) bytes[offsets[i + 1]]. A
 * million labels as a list are a million strings for the page to keep and for load() to copy; packed they are two
 * buffers that move to the worker like the typed arrays, and the worker decodes a label only when it shows it or when
 * a search meets one with a byte above 127.
 */
export interface GraphExplorerStrings {
  /** one entry more than there are strings: offsets[0] is 0, they never decrease, the last is bytes.length */
  offsets: Int32Array;
  /** the strings' UTF-8 bytes, one after the other (bytes that are no UTF-8 show as U+FFFD) */
  bytes: Uint8Array;
}

// -- small helpers --------------------------------------------------------------

const TONES = ['muted', 'ink', 'accent', 'link', 'ok', 'warn', 'danger'];
const reducedMotion = (): boolean => !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
const fmt = (n: number): string => Number(n).toLocaleString('en-US');
/** a cycle worth marking: small enough to read (a whole strongly connected level is no news) */
const smallCycle = (n: { scc: number }): boolean => n.scc > 1 && n.scc <= 12;
const live = new Set<any>();

/** an id list from a config or an attribute: a list, or words separated by spaces or commas */
function keyList(value: unknown): string[] {
  const list = Array.isArray(value) ? value.map(String) : typeof value === 'string' ? value.split(/[\s,]+/) : [];
  return [...new Set(list.map((k) => k.trim()).filter(Boolean))];
}

// -- SafeHtml -------------------------------------------------------------------

const SAFE = new WeakSet<object>();
const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (v: unknown): string => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
const isSafe = (v: unknown): v is SafeHtml => !!v && typeof v === 'object' && SAFE.has(v as object);
const part = (v: unknown): string => (isSafe(v) ? v.html : Array.isArray(v) ? v.map(part).join('') : esc(v));

/**
 * The escaping template tag renderers write markup with: every interpolation is escaped; nested html`` values and
 * arrays of them pass through as markup.
 * @param strings - the template's literal parts
 * @param values - the interpolations
 * @returns the markup as SafeHtml
 */
function html(strings: TemplateStringsArray, ...values: unknown[]): SafeHtml {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += part(values[i]) + strings[i + 1];
  const safe = { html: out };
  SAFE.add(safe);
  return safe;
}

const BLOCKED = new Set([
  'script',
  'iframe',
  'object',
  'embed',
  'style',
  'link',
  'meta',
  'base',
  'form',
  'frame',
  'frameset',
]);
const URL_ATTRS = new Set(['href', 'src', 'xlink:href', 'action', 'formaction', 'srcset', 'poster', 'background']);
/** strips handlers (on*), URLs that run code and active elements: morph would apply an `onerror` attribute as a live
 *  handler and never removes on* attributes on a patch */
function sanitize(list: any[]): any[] {
  const out: any[] = [];
  for (const n of list || []) {
    if (!n || typeof n !== 'object') {
      out.push(n);
      continue;
    }
    if (n.type === '#comment' || BLOCKED.has(String(n.type).toLowerCase())) continue;
    const attrs: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(n.attributes || {})) {
      const kl = k.toLowerCase();
      if (kl.startsWith('on') || typeof v === 'function') continue;
      if (URL_ATTRS.has(kl) && /^\s*(javascript|data|vbscript):/i.test(String(v).replace(/[\s\0]+/g, ''))) continue;
      attrs[k] = v;
    }
    out.push({ type: n.type, attributes: attrs, children: sanitize(n.children) });
  }
  return out;
}
function vnodesOf(safe: SafeHtml): any[] {
  if (!isSafe(safe))
    throw new TypeError('graph-explorer: renderers must return html`...` (SafeHtml); plain strings are rejected');
  return sanitize(parseVNodes(safe.html));
}
/** parses many SafeHtml values in one DOMParser pass; one VNode list per input */
function vnodesBatch(list: SafeHtml[]): any[][] {
  if (!list.length) return [];
  let src = '';
  list.forEach((s, k) => {
    if (!isSafe(s)) throw new TypeError('graph-explorer: renderers must return html`...` (SafeHtml)');
    src += '<div data-job="' + k + '">' + s.html + '</div>';
  });
  const parsed = parseVNodes(src).filter((n) => n && typeof n === 'object');
  return parsed.map((w) => sanitize(w.children));
}
const morph = (el: Element, content: SafeHtml | any[]): void =>
  morphRuntime.morph(el, Array.isArray(content) ? content : vnodesOf(content));

const ISLAND = 'data-graph-explorer-island';
const SLOT = 'data-graph-explorer-slot';
/**
 * An island (ctx.island): markup the details keep while its key and its markup stay the same. A morph reconciles a
 * container to its new markup and would take away what a component's script made inside it (a Chart's canvas, a
 * Geo Map's SVG) - and its data-init, so the component would start again on the same element.
 */
function island(key: string, content: SafeHtml): SafeHtml {
  return html`<div class="graph-explorer-island" ${ISLAND}="${key}">${content}</div>`;
}
/**
 * Morphs an outlet's content and keeps its islands: each live island leaves the DOM for a slot, the morph runs over
 * slots, then every slot takes back the island of its key when its markup is unchanged, else a new one.
 */
function morphKeeping(el: HTMLElement, content: SafeHtml, mounts?: Map<string, GraphIslandMount>): void {
  const want = new Map<string, any>();
  const slots = (list: any[]): any[] =>
    list.map((n) => {
      if (!n || typeof n !== 'object' || !n.attributes) return n;
      const key = n.attributes[ISLAND];
      if (key != null) {
        want.set(String(key), n);
        return { type: 'div', attributes: { [SLOT]: String(key) }, children: [] };
      }
      return { ...n, children: slots(n.children || []) };
    });
  const tree = slots(vnodesOf(content));
  const kept = new Map<string, HTMLElement>();
  for (const isl of dfDollar(el).find(`[${ISLAND}]`).toArray() as HTMLElement[]) {
    const key = isl.getAttribute(ISLAND) ?? '';
    if (kept.has(key)) continue;
    kept.set(key, isl);
    dfDollar(isl).replaceWith(dfDollar(`<div ${SLOT}="${esc(key)}"></div>`).get(0));
  }
  // an island left without its slot goes: its mount's cleanup runs
  const drop = (isl: any): void => {
    try {
      isl?._islandCleanup?.();
    } catch (err) {
      console.error('[graph-explorer] an island cleanup failed', err);
    }
    if (isl) isl._islandCleanup = null;
  };
  morphRuntime.morph(el, tree);
  for (const slot of dfDollar(el).find(`[${SLOT}]`).toArray() as HTMLElement[]) {
    const key = slot.getAttribute(SLOT) ?? '',
      vnode = want.get(key),
      sig = JSON.stringify(vnode ?? null);
    let node = kept.get(key) as any;
    let made = false;
    if (!node || node._islandSig !== sig) {
      drop(node);
      const box = document.createElement('div');
      morphRuntime.morph(box, vnode ? [vnode] : []);
      node = box.firstElementChild;
      if (!node) {
        kept.delete(key);
        dfDollar(slot).remove();
        continue;
      }
      node._islandSig = sig;
      made = true;
    }
    kept.delete(key);
    dfDollar(slot).replaceWith(node);
    const mount = made ? mounts?.get(key) : undefined;
    if (mount)
      try {
        const cleanup = mount(node);
        if (typeof cleanup === 'function') node._islandCleanup = cleanup;
      } catch (err) {
        console.error('[graph-explorer] an island mount failed', err);
      }
  }
  for (const isl of kept.values()) drop(isl);
}
/** the islands of an element go: their mounts' cleanups run (an outlet emptied, the explorer destroyed) */
function dropIslands(el: Element): void {
  for (const isl of dfDollar(el).find(`[${ISLAND}]`).toArray() as any[]) {
    try {
      isl._islandCleanup?.();
    } catch (err) {
      console.error('[graph-explorer] an island cleanup failed', err);
    }
    isl._islandCleanup = null;
  }
}

// -- icons: a Lucide subset as CSS masks (graph-explorer.css) -------------------------
// An icon is one empty <i>: cheap to morph, nothing for the sanitizer to strip, painted with currentColor.

const ICON_NAME = /^[a-z0-9][a-z0-9-]{0,40}$/;
/**
 * An icon of the explorer's set (a Lucide subset drawn as a CSS mask in the current color) - decorative unless it
 * has a label.
 * @param name - the icon's name (database, plug-zap, user, ...); an unknown name draws a circle
 * @param opts - its label, tone, size, type color and classes
 * @returns the icon's markup
 */
function icon(name: string, opts: GraphIconOptions = {}): SafeHtml {
  const n = ICON_NAME.test(String(name)) ? String(name) : 'circle';
  const label = opts.label ? html` role="img" aria-label="${opts.label}"` : html` aria-hidden="true"`;
  const tone = opts.tone && TONES.includes(opts.tone) ? html` data-tone="${opts.tone}"` : '';
  const size = opts.size ? html` data-size="${opts.size}"` : '';
  const type = opts.type != null ? html` data-type="${opts.type}"` : '';
  return html`<i
    class="graph-explorer-icon${opts.cls ? ' ' + opts.cls : ''}"
    data-icon="${n}"
    ${label}${tone}${size}${type}
  ></i>`;
}
let iconSheet: HTMLStyleElement | null = null;
/**
 * Adds an icon to the set: the inner markup of a 24x24 stroke icon (Lucide's conventions), drawn as a mask.
 * @param name - its name (lowercase words joined by "-")
 * @param svg - the shapes inside the <svg> (paths, circles, lines - nothing that loads or runs)
 */
function registerIcon(name: string, svg: string): void {
  if (!ICON_NAME.test(name)) throw new TypeError('graph-explorer: icon names are lowercase words joined by "-"');
  if (/<\s*(script|foreignObject|image|use|style)\b|\bon\w+\s*=|href\s*=/i.test(svg))
    throw new TypeError('graph-explorer: icon markup may only hold shapes');
  const doc = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>${String(svg).replace(/"/g, "'")}</svg>`;
  if (!iconSheet) {
    iconSheet = dfDollar('<style data-graph-explorer-icons></style>').get(0) as HTMLStyleElement;
    dfDollar(document.head).append(iconSheet);
  }
  iconSheet.append(
    `.graph-explorer-icon[data-icon="${name}"]{--graph-explorer-icon:url("data:image/svg+xml,${encodeURIComponent(doc)}")}\n`,
  );
}
const TYPE_ICON: Record<string, string> = {
  Domain: 'boxes',
  API: 'plug-zap',
  Worker: 'cog',
  Store: 'layers',
  Stream: 'waves',
  Dataset: 'database',
  Endpoint: 'plug',
  Document: 'file-text',
  Person: 'user',
  Job: 'timer',
  Topic: 'radio',
};
const typeIcon = (n: { typeName: string; type: number }, opts: GraphIconOptions = {}): SafeHtml =>
  icon(TYPE_ICON[n.typeName] || 'circle', { cls: 'graph-explorer-type-icon', type: n.type, ...opts });
const EDGE_ICON: Record<string, string> = { calls: 'zap', reads: 'eye', owns: 'key-round' };

// -- the plugin registry ----------------------------------------------------------

const globalRegistry: Record<'node' | 'edge' | 'detail' | 'update', any[]> = {
  node: [],
  edge: [],
  detail: [],
  update: [],
};
// edge labels: the tier is picked by the edge's visible length on screen (per zoom level), then by budget and
// collision; `depths` limits a renderer to hierarchy levels (0 = the top)
const DEFAULT_LABEL = {
  levels: { icon: 36, label: 110, full: 220 },
  sizes: { icon: [20, 20], label: [104, 22], full: [196, 24] },
  depths: null,
  budget: null,
};
const LABEL_TIERS = ['icon', 'label', 'full'];
const LABEL_BUDGET: Record<string, number> = { icon: 160, label: 48, full: 16 };
let pluginOrder = 0;
function registryOf(
  scope: 'global' | HTMLElement | string | null | undefined,
): Record<'node' | 'edge' | 'detail' | 'update', any[]> {
  if (scope === 'global' || scope == null) return globalRegistry;
  const inst = resolveTarget(scope)?._graphExplorer;
  if (!inst)
    throw new Error('graph-explorer: register(scope) takes "global" or an initialized .graph-explorer element');
  return inst.registry;
}
/**
 * Registers a node, edge, detail or update plugin - for every explorer ('global') or one element (its plugins win).
 * Explorers on the page render again with it.
 * @param scope - 'global', or the .graph-explorer element (or its selector)
 * @param plugin - the plugin
 * @returns a function that removes the plugin again
 */
function register(scope: 'global' | HTMLElement | string, plugin: GraphPlugin): () => void {
  const kinds = ['node', 'edge', 'detail', 'update'];
  if (!plugin || !kinds.includes(plugin.kind))
    throw new TypeError('graph-explorer: plugin.kind must be node, edge, detail or update');
  if (plugin.kind === 'update' && typeof plugin.update?.render !== 'function')
    throw new TypeError('graph-explorer: update plugins need update.render');
  if (
    plugin.kind === 'node' &&
    (typeof plugin.match !== 'function' || typeof plugin.render !== 'function' || !plugin.sizes)
  )
    throw new TypeError('graph-explorer: node plugins need match, sizes and render');
  if (plugin.kind === 'edge' && !Array.isArray(plugin.rules) && !plugin.label && !plugin.detail)
    throw new TypeError('graph-explorer: edge plugins need rules (plain data), a label renderer or a detail renderer');
  if (plugin.kind === 'edge' && plugin.detail && typeof plugin.detail.render !== 'function')
    throw new TypeError('graph-explorer: an edge detail renderer needs render');
  if (
    plugin.kind === 'edge' &&
    plugin.label &&
    (typeof plugin.label.render !== 'function' || typeof plugin.label.match !== 'function')
  )
    throw new TypeError('graph-explorer: edge label renderers need match and render');
  if (plugin.layer != null && !/^[a-z0-9-]+$/.test(plugin.layer))
    throw new TypeError('graph-explorer: a layer is a lowercase word');
  if (plugin.kind === 'node' && plugin.layer === 'nodes')
    throw new TypeError('graph-explorer: a renderer of the nodes layer has no layer - it draws the node itself');
  if (plugin.kind === 'detail' && (typeof plugin.match !== 'function' || typeof plugin.render !== 'function'))
    throw new TypeError('graph-explorer: detail plugins need match and render');
  if (plugin.kind === 'edge') JSON.stringify(plugin.rules || []); // rules must be structured-cloneable data
  const entry: any = { rules: [], ...plugin, _order: pluginOrder++, _scoped: scope !== 'global' && scope != null };
  if (entry.label)
    entry.label = {
      ...DEFAULT_LABEL,
      ...entry.label,
      levels: { ...DEFAULT_LABEL.levels, ...entry.label.levels },
      sizes: { ...DEFAULT_LABEL.sizes, ...entry.label.sizes },
    };
  const reg = registryOf(scope);
  reg[plugin.kind].push(entry);
  pluginsChanged();
  return () => {
    const i = reg[plugin.kind].indexOf(entry);
    if (i >= 0) reg[plugin.kind].splice(i, 1);
    pluginsChanged();
  };
}
function pluginsChanged(): void {
  for (const inst of live) inst.onPluginsChanged();
}

// -- geometry (the worker has the same) ---------------------------------------------

const drawR = (isCluster: boolean, rs: number): number =>
  isCluster ? Math.max(1.6, rs) : Math.min(6, Math.max(2.5, rs * 0.18));
function anchorBox(
  isCluster: boolean,
  tier: number,
  sx: number,
  sy: number,
  rs: number,
  bw: number,
  bh: number,
): [number, number] {
  if (isCluster && tier === 2) return [sx - bw / 2, Math.max(sy - rs * 0.86 + 6, sy - rs + 4)];
  return [sx - bw / 2, sy - bh / 2];
}
/** a promoted (SVG) edge's path in screen space: { d, head, mid } */
function edgePath(ax, ay, ar, bx, by, br, st, bidir, w): { d: string; head: string; mid: [number, number] } | null {
  const dx = bx - ax,
    dy = by - ay,
    len = Math.hypot(dx, dy);
  if (len < ar + br + 2) return null;
  const ux = dx / len,
    uy = dy / len,
    head = st.arrow === 'none' ? 0 : 3.5 + w * 1.4;
  const f = (n: number): string => n.toFixed(1);
  const tri = (x, y, vx, vy, s): string => {
    const bx2 = x - vx * s,
      by2 = y - vy * s,
      px = -vy * s * 0.55,
      py = vx * s * 0.55;
    return `M${f(x + vx * s * 0.6)} ${f(y + vy * s * 0.6)}L${f(bx2 + px)} ${f(by2 + py)}L${f(bx2 - px)} ${f(by2 - py)}Z`;
  };
  if (st.route === 'around') {
    const cx = (ax + bx) / 2 - uy * len * 0.22,
      cy = (ay + by) / 2 + ux * len * 0.22;
    const s0x = cx - ax,
      s0y = cy - ay,
      s0 = Math.hypot(s0x, s0y) || 1,
      e0x = cx - bx,
      e0y = cy - by,
      e0 = Math.hypot(e0x, e0y) || 1;
    const p0x = ax + (s0x / s0) * ar,
      p0y = ay + (s0y / s0) * ar,
      p2x = bx + (e0x / e0) * (br + head * 0.6),
      p2y = by + (e0y / e0) * (br + head * 0.6);
    const at = (t: number): [number, number] => {
      const mt = 1 - t;
      return [mt * mt * p0x + 2 * mt * t * cx + t * t * p2x, mt * mt * p0y + 2 * mt * t * cy + t * t * p2y];
    };
    const poly = (t0: number, t1: number): string => {
      let s = '';
      for (let k = 0; k <= 10; k++) {
        const p = at(t0 + ((t1 - t0) * k) / 10);
        s += (k ? 'L' : 'M') + f(p[0]) + ' ' + f(p[1]);
      }
      return s;
    };
    const d = st.gap && len > 40 ? poly(0, 0.44) + poly(0.56, 1) : poly(0, 1);
    const hx = p2x - cx,
      hy = p2y - cy,
      hl = Math.hypot(hx, hy) || 1;
    return { d, head: head ? tri(p2x, p2y, hx / hl, hy / hl, head) : '', mid: at(0.5) };
  }
  const off = bidir && head ? head * 0.6 : 0;
  const p0x = ax + ux * (ar + off),
    p0y = ay + uy * (ar + off),
    p2x = bx - ux * (br + head * 0.6),
    p2y = by - uy * (br + head * 0.6);
  const mx = (p0x + p2x) / 2,
    my = (p0y + p2y) / 2;
  const d =
    st.gap && len > 40
      ? `M${f(p0x)} ${f(p0y)}L${f(mx - ux * 6)} ${f(my - uy * 6)}M${f(mx + ux * 6)} ${f(my + uy * 6)}L${f(p2x)} ${f(p2y)}`
      : `M${f(p0x)} ${f(p0y)}L${f(p2x)} ${f(p2y)}`;
  let h = head ? tri(p2x, p2y, ux, uy, head) : '';
  if (head && bidir) h += tri(p0x, p0y, -ux, -uy, head);
  return { d, head: h, mid: [mx, my] };
}

// -- van Wijk & Nuij camera paths -------------------------------------------------------

/** a smooth zoom-pan from p0 to p1 (p = [cx, cy, width in world units]); the duration follows the path's length */
function zoomPath(p0: number[], p1: number[]): { at: (t: number) => number[]; ms: number } {
  const rho = Math.SQRT2,
    rho2 = 2,
    rho4 = 4;
  const [ux0, uy0, w0] = p0,
    [ux1, uy1, w1] = p1,
    dx = ux1 - ux0,
    dy = uy1 - uy0,
    d2 = dx * dx + dy * dy;
  let S: number, at: (t: number) => number[];
  if (d2 < 1e-12) {
    S = Math.log(w1 / w0) / rho;
    at = (t) => [ux0 + t * dx, uy0 + t * dy, w0 * Math.exp(rho * t * S)];
  } else {
    const d1 = Math.sqrt(d2);
    const b0 = (w1 * w1 - w0 * w0 + rho4 * d2) / (2 * w0 * rho2 * d1),
      b1 = (w1 * w1 - w0 * w0 - rho4 * d2) / (2 * w1 * rho2 * d1);
    const r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0),
      r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
    S = (r1 - r0) / rho;
    at = (t) => {
      const s = t * S,
        c0 = Math.cosh(r0),
        u = (w0 / (rho2 * d1)) * (c0 * Math.tanh(rho * s + r0) - Math.sinh(r0));
      return [ux0 + u * dx, uy0 + u * dy, (w0 * c0) / Math.cosh(rho * s + r0)];
    };
  }
  // brisk: a flight shows where the view goes, it does not hold the reader up (1.4 s once felt slow)
  return { at, ms: clamp(Math.abs(S) * 1000 * 0.3, 160, 460) };
}
const ease = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// -- built-in plugins --------------------------------------------------------------------
// The graph shows layers of information (the layer switch, data-layers): the nodes layer draws a node itself - a chip
// with its name, a card with its actions -, every other layer adds a part to it (labels its counts, health its
// breaker state, relations its links), each in the layer's colour. A node renderer without `layer` draws the node; one
// with a layer draws that layer's part, so a plugin can add a layer of its own (an owner per entity) or re-skin a
// node type while the parts still join it.

const STATE_LABEL: Record<string, string> = { closed: 'closed', 'half-open': 'half-open', open: 'open', cut: 'cut' };
const expandBtn = (c: GraphRenderContext, label: string): SafeHtml | string =>
  !c.expandable
    ? ''
    : c.html`<button type="button" class="btn graph-explorer-card-expand" data-variant="ghost" data-size="icon-sm" data-graph-explorer-action="${c.action('expand')}" aria-label="Expand ${label}" title="Expand (E)">${c.icon('expand')}</button>`;
const cycleMark = (c: GraphRenderContext, n: GraphNode): SafeHtml | string =>
  smallCycle(n)
    ? c.html`<span class="graph-explorer-cycle" title="In a cycle of ${n.scc}">${c.icon('repeat-2', { size: 'xs' })}</span>`
    : '';
/** a cluster's breaker health: the shares of its links by state, for bars */
const health = (n: GraphNode) => {
  const b = n.breakers || { open: 0, half: 0, cut: 0, total: 0 };
  const total = Math.max(1, b.total || 0),
    bad = b.open + b.half + b.cut;
  const tone = b.open / total >= 0.1 ? 'danger' : bad / total >= 0.1 ? 'warn' : 'ok';
  return { ...b, total, closed: Math.max(0, total - bad), bad, tone };
};
const healthBar = (c: GraphRenderContext, h: ReturnType<typeof health>): SafeHtml =>
  c.html`<span class="graph-explorer-health" role="img" aria-label="${h.open} open, ${h.half} half-open, ${h.cut} cut of ${h.total} links"><span data-tone="danger" style="flex:${h.open}"></span><span data-tone="warn" style="flex:${h.half}"></span><span data-tone="ink" style="flex:${h.cut}"></span><span data-tone="ok" style="flex:${h.closed}"></span></span>`;
const breakerKey = (n: GraphNode): string =>
  n.breakers ? `${n.breakers.open}/${n.breakers.half}/${n.breakers.cut}` : '';
const freshness = (n: GraphNode) => {
  const f = n.attrs?.freshness ?? 0;
  return { f, tone: f > 24 ? 'danger' : f > 12 ? 'warn' : 'ok' };
};

// the nodes layer: the node itself - its type, its name, Expand; a cluster card zooms in
register('global', {
  kind: 'node',
  name: 'builtin-cluster',
  match: (n) => (n.kind === 'cluster' ? 0 : false),
  // a card's box: padding, border, the head and the button row (a part adds its own height and the gap)
  sizes: { chip: [132, 28], card: [236, 74] },
  render: (n, c) => {
    if (c.tier === 'chip')
      return c.html`<span class="graph-explorer-chip" data-kind="cluster">${typeIcon(n)}<span class="graph-explorer-label">${n.label}</span>${c.parts}</span>`;
    return c.html`<article class="graph-explorer-card" data-kind="cluster">
        <header class="graph-explorer-card-head">${typeIcon(n)}<strong class="graph-explorer-label">${n.label}</strong>${expandBtn(c, n.label)}</header>
        ${c.parts}
        <footer class="graph-explorer-card-actions"><button type="button" class="btn graph-explorer-card-enter" data-variant="outline" data-size="xs" data-graph-explorer-action="${c.action('enter')}" title="Zoom into ${n.label}: its ${fmt(n.children)} children (Enter)">Zoom in ⏎</button></footer>
      </article>`;
  },
});
register('global', {
  kind: 'node',
  name: 'builtin-entity',
  match: (n) => (n.kind === 'entity' ? 0 : false),
  sizes: { chip: [128, 26], card: [220, 42] },
  render: (n, c) => {
    if (c.tier === 'chip')
      return c.html`<span class="graph-explorer-chip" data-kind="entity">${typeIcon(n)}<span class="graph-explorer-label">${n.label}</span>${c.parts}</span>`;
    return c.html`<article class="graph-explorer-card" data-kind="entity">
        <header class="graph-explorer-card-head">${typeIcon(n)}<strong class="graph-explorer-label">${n.label}</strong>${expandBtn(c, n.label)}</header>
        ${c.parts}
      </article>`;
  },
});
// the relations layer: how a node is linked - its links, a small cycle it is in
register('global', {
  kind: 'node',
  name: 'builtin-relations',
  layer: 'relations',
  match: () => 0,
  // a chip marks only a small cycle
  sizes: (n) => (smallCycle(n) ? { chip: [22, 0], card: [0, 29] } : { card: [0, 29] }),
  render: (n, c) => {
    if (c.tier === 'chip') return c.html`${cycleMark(c, n)}`;
    return n.kind === 'cluster'
      ? c.html`<p class="graph-explorer-card-meta">${cycleMark(c, n)}${fmt(n.degree)} links${smallCycle(n) ? c.html` · in a cycle of ${n.scc}` : ''}</p>`
      : c.html`<p class="graph-explorer-card-meta">${n.attrs?.out} out · ${n.attrs?.in} in</p>`;
  },
});
// the labels layer: what a node is and how big
register('global', {
  kind: 'node',
  name: 'builtin-labels',
  layer: 'labels',
  match: () => 0,
  sizes: { chip: [56, 0], card: [0, 29] },
  render: (n, c) => {
    if (c.tier === 'chip')
      return c.html`<span class="graph-explorer-count">${n.kind === 'cluster' ? fmt(n.members) : n.typeName}</span>`;
    return n.kind === 'cluster'
      ? c.html`<p class="graph-explorer-card-meta">${n.typeName} · ${fmt(n.children)} children · ${fmt(n.members)} nodes</p>`
      : c.html`<p class="graph-explorer-card-meta">${n.typeName} · #${n.id.slice(1)}</p>`;
  },
});
// the health layer: a cluster's links by breaker state, an entity's freshness
register('global', {
  kind: 'node',
  name: 'builtin-health',
  layer: 'health',
  match: () => 0,
  sizes: (n) => ({ chip: [52, 0], card: [0, n.kind === 'cluster' ? 41 : 29] }),
  key: breakerKey,
  render: (n, c) => {
    if (n.kind === 'cluster') {
      const h = health(n);
      if (c.tier === 'chip') return c.html`<span data-health="${h.tone}">${healthBar(c, h)}</span>`;
      return c.html`<div data-health="${h.tone}">${healthBar(c, h)}<p class="graph-explorer-card-meta">${h.bad ? `${h.open} open · ${h.half} half-open · ${h.cut} cut` : 'all links closed'} · of ${fmt(h.total)}</p></div>`;
    }
    const { f, tone } = freshness(n);
    if (c.tier === 'chip') return c.html`<span class="graph-explorer-pill" data-tone="${tone}">${f} h</span>`;
    return c.html`<p class="graph-explorer-meter-row" data-health="${tone}"><span>Freshness</span><span class="graph-explorer-meter" data-tone="${tone}"><span style="width:${Math.min(100, Math.round((f / 48) * 100))}%"></span></span><span>${f} h</span></p>`;
  },
});

register('global', {
  kind: 'edge',
  name: 'builtin-edges',
  rules: [
    {
      when: [
        { field: 'kind', equals: 'leaf' },
        { field: 'type', equals: 'calls' },
      ],
      style: { tone: 'muted', width: 1, arrow: 'end' },
      priority: -10,
    },
    {
      when: [
        { field: 'kind', equals: 'leaf' },
        { field: 'type', equals: 'reads' },
      ],
      style: { tone: 'link', width: 1, arrow: 'end', dash: [3, 3] },
      priority: -10,
    },
    {
      when: [
        { field: 'kind', equals: 'leaf' },
        { field: 'type', equals: 'owns' },
      ],
      style: { tone: 'ink', width: 1, arrow: 'end' },
      priority: -10,
    },
    { when: [{ field: 'kind', equals: 'agg' }], style: { tone: 'muted', width: 1.25, arrow: 'end' }, priority: -10 },
  ],
  // the relation between entities, link counts between clusters; more words as the edge gets longer
  label: {
    // generic link labels come later than problem labels (the circuit breakers: an icon from 30 px)
    levels: { icon: 64, label: 150, full: 260 },
    budget: { icon: 40, label: 20, full: 8 }, // the busiest links only; problems (breakers) get the rest
    match: () => 0,
    priority: (e) => Math.log10(1 + e.count + e.count2),
    render: (e, c) => {
      if (e.kind === 'leaf') {
        const ic = c.icon(EDGE_ICON[e.type] || 'link', { tone: e.style?.tone });
        if (c.tier === 'icon') return c.html`<span class="graph-explorer-edge-icon" title="${e.type}">${ic}</span>`;
        return c.html`<span class="graph-explorer-edge-pill">${ic}<span>${e.type}</span>${c.tier === 'full' && e.bidir ? c.html`<span class="graph-explorer-muted">↔</span>` : ''}${c.tier === 'full' && e.back ? c.icon('repeat-2', { size: 'xs' }) : ''}</span>`;
      }
      const n = e.count + e.count2;
      if (c.tier === 'icon')
        return c.html`<span class="graph-explorer-edge-count" title="${fmt(n)} links">${n > 999 ? Math.round(n / 1000) + 'k' : n}</span>`;
      return c.html`<span class="graph-explorer-edge-pill">${c.icon('link-2')}<span>${fmt(n)} links</span>${c.tier === 'full' && e.count2 ? c.html`<span class="graph-explorer-muted">${fmt(e.count)} → · ← ${fmt(e.count2)}</span>` : ''}</span>`;
    },
  },
});

// Circuit breakers (the design study's "Cycles and circuit breakers"): one breaker per link between entities; a link
// between clusters bundles many and reports health by share, so one open breaker among 80 does not paint the whole
// overview red - at least 30% open is critical, at least 15% not closed is degraded.
const BREAKER_ICON: Record<string, string> = {
  open: 'zap-off',
  'half-open': 'circle-dashed',
  cut: 'scissors',
  closed: 'shield-check',
};
const BREAKER_TONE: Record<string, GraphTone> = { open: 'danger', 'half-open': 'warn', cut: 'ink', closed: 'ok' };
const verdict = (b: GraphBreaker | null): string | null =>
  !b
    ? null
    : b.aggregate
      ? b.openShare >= 0.3
        ? 'critical'
        : b.badShare >= 0.15
          ? 'degraded'
          : null
      : b.state !== 'closed'
        ? b.state
        : null;
const AGG = { field: 'breaker.aggregate', equals: true };
register('global', {
  kind: 'edge',
  name: 'circuit-breaker',
  // the breakers' colours and badges are the health layer's
  layer: 'health',
  rules: [
    { when: [{ field: 'breaker.state', equals: 'closed' }], style: { tone: 'muted', width: 1.25, arrow: 'end' } },
    {
      when: [
        { field: 'breaker.state', equals: 'closed' },
        { field: 'traffic', equals: true },
      ],
      priority: 2,
      style: { tone: 'muted', width: 1.25, arrow: 'end', flow: 1 },
    },
    {
      when: [{ field: 'breaker.state', equals: 'half-open' }],
      style: { tone: 'warn', width: 1.5, arrow: 'end', dash: [4, 4], pulse: true },
    },
    {
      when: [{ field: 'breaker.state', equals: 'open' }],
      style: { tone: 'danger', width: 2, arrow: 'end', gap: true },
    },
    { when: [{ field: 'breaker.state', equals: 'cut' }], style: { tone: 'ink', width: 1.5, arrow: 'none', gap: true } },
    { when: [AGG], priority: 10, style: { tone: 'muted', width: 1.25, arrow: 'end', flow: 1 } },
    {
      when: [AGG, { field: 'breaker.badShare', gte: 0.15 }],
      priority: 11,
      style: { tone: 'warn', width: 1.5, arrow: 'end', dash: [5, 3] },
    },
    {
      when: [AGG, { field: 'breaker.openShare', gte: 0.3 }],
      priority: 12,
      style: { tone: 'danger', width: 2, arrow: 'end', gap: true },
    },
  ],
  label: {
    levels: { icon: 30, label: 110, full: 200 },
    sizes: { icon: [22, 22], label: [118, 22], full: [210, 24] },
    match: (e) => (verdict(e.breaker) ? 10 : false),
    // ranks above the link labels: open before cut before half-open; aggregates by share
    priority: (e) => {
      const b = e.breaker as GraphBreaker;
      return b.aggregate
        ? 20 + b.openShare * 30 + b.badShare * 10
        : ({ open: 30, cut: 25, 'half-open': 22 } as Record<string, number>)[b.state] || 0;
    },
    render: (e, c) => {
      const b = e.breaker as GraphBreaker,
        v = verdict(b);
      if (b.aggregate) {
        const tone: GraphTone = v === 'critical' ? 'danger' : 'warn';
        const ic = c.icon('triangle-alert', { tone, label: v ?? '' });
        if (c.tier === 'icon')
          return c.html`<span class="graph-explorer-edge-icon" data-tone="${tone}" title="${b.open + b.half + b.cut}/${b.members} breakers not closed">${ic}</span>`;
        const text =
          v === 'critical' ? `${b.open}/${b.members} open` : `${b.open + b.half + b.cut}/${b.members} degraded`;
        return c.html`<span class="graph-explorer-edge-badge" data-tone="${tone}">${ic}<span>${text}</span>${c.tier === 'full' ? c.html`<span class="graph-explorer-edge-sub">${b.half} half-open · ${b.cut} cut</span>` : ''}</span>`;
      }
      const tone = BREAKER_TONE[b.state],
        ic = c.icon(BREAKER_ICON[b.state], { tone, label: b.state });
      if (c.tier === 'icon')
        return c.html`<span class="graph-explorer-edge-icon" data-tone="${tone}" title="breaker ${b.state}">${ic}</span>`;
      if (c.tier === 'label')
        return c.html`<span class="graph-explorer-edge-badge" data-tone="${tone}">${ic}<span>${b.state}</span></span>`;
      const more =
        b.state === 'half-open'
          ? `probing ${b.probesOk}/${b.probes}`
          : b.state === 'open'
            ? `${b.trips} trips · ${b.since} min`
            : `cut by ${b.by}`;
      return c.html`<span class="graph-explorer-edge-badge" data-tone="${tone}">${ic}<span>${b.state}</span><span class="graph-explorer-edge-sub">${more}</span></span>`;
    },
  },
});

// -- the details: building blocks --------------------------------------------------------
// The details and a node's page are built from the library's own components where they fit - Badge, Button, Card,
// Statistic, Table - and a few parts of the explorer's (rows, bars, the trail). Plugins use the same classes.

/** a breaker's state as a Badge */
const stateBadge = (c: GraphRenderContext, state: string): SafeHtml =>
  c.html`<span class="badge graph-explorer-state" data-variant="${state === 'closed' ? 'secondary' : 'outline'}" data-state="${state}">${c.icon(BREAKER_ICON[state] || 'circle', { size: 'xs' })}${STATE_LABEL[state] ?? state}</span>`;

/** a path as a trail: every step a link, the top plain text; `last` keeps the final step (a view, not a node) */
const trail = (c: GraphRenderContext, path: GraphPathStep[], last = false): SafeHtml =>
  c.html`<nav class="graph-explorer-trail" aria-label="Path">${(last ? path : path.slice(0, -1)).map(
    (p, k) =>
      c.html`${k ? c.html`<span class="graph-explorer-trail-sep" aria-hidden="true">›</span>` : ''}${
        p.id === 'c0'
          ? c.html`<span>${p.label}</span>`
          : c.html`<button type="button" class="graph-explorer-link" data-graph-explorer-goto="${p.id}">${p.label}</button>`
      }`,
  )}</nav>`;

/** facts as a grid of label and value; a tone colors the value */
const stats = (c: GraphRenderContext, rows: [string, unknown, GraphTone?][]): SafeHtml =>
  c.html`<dl class="graph-explorer-stats">${rows.map(
    ([k, v, tone]) =>
      c.html`<div class="graph-explorer-stat"${tone ? c.html` data-tone="${tone}"` : ''}><dt>${k}</dt><dd>${v}</dd></div>`,
  )}</dl>`;

/** a titled section of the side details, with a count */
const section = (c: GraphRenderContext, title: string, body: SafeHtml, count?: unknown): SafeHtml =>
  c.html`<section class="graph-explorer-section"><h4 class="graph-explorer-section-title"><span>${title}</span>${
    count != null ? c.html`<span class="graph-explorer-section-count">${count}</span>` : ''
  }</h4>${body}</section>`;

/** a Card of an expanded page; wide spans the page */
const pageCard = (
  c: GraphRenderContext,
  title: string,
  body: SafeHtml,
  opts: { note?: string; wide?: boolean; icon?: string } = {},
): SafeHtml =>
  c.html`<section class="card graph-explorer-page-card" data-size="sm"${opts.wide ? c.html` data-wide` : ''}><header class="card-header"><h3 class="card-title">${opts.icon ? c.icon(opts.icon, { size: 'sm' }) : ''}${title}</h3>${
    opts.note ? c.html`<p class="card-description">${opts.note}</p>` : ''
  }</header><div class="card-content">${body}</div></section>`;

/** a key figure as a Statistic */
const kpi = (c: GraphRenderContext, title: string, value: unknown, note?: unknown, tone?: GraphTone): SafeHtml =>
  c.html`<div class="statistic graph-explorer-kpi"${tone ? c.html` data-tone="${tone}"` : ''}><p class="statistic-title">${title}</p><p class="statistic-value">${value}</p>${
    note != null ? c.html`<p class="statistic-description">${note}</p>` : ''
  }</div>`;

/** a share as a bar */
const shareBar = (c: GraphRenderContext, part: number, whole: number, tone: GraphTone = 'accent'): SafeHtml => {
  const pct = whole > 0 ? Math.max(1, Math.round((part / whole) * 100)) : 0;
  return c.html`<span class="graph-explorer-bar" data-tone="${tone}" role="img" aria-label="${pct} %"><span style="inline-size:${pct}%"></span></span>`;
};

/** one row of a list: the node (a click goes there), its numbers, a badge and the link to inspect */
const row = (
  c: GraphRenderContext,
  r: {
    id: string;
    label: string;
    meta?: unknown;
    icon?: SafeHtml;
    badge?: SafeHtml | '';
    edge?: string | null;
    bar?: SafeHtml;
  },
): SafeHtml =>
  c.html`<li class="graph-explorer-row"><button type="button" class="graph-explorer-row-main" data-graph-explorer-goto="${r.id}">${r.icon ?? ''}<span class="graph-explorer-row-name">${r.label}</span>${
    r.meta != null ? c.html`<span class="graph-explorer-row-meta">${r.meta}</span>` : ''
  }</button>${r.bar ?? ''}${r.badge ?? ''}${
    r.edge
      ? c.html`<button type="button" class="graph-explorer-row-link" data-graph-explorer-edge="${r.edge}" title="Inspect the link" aria-label="Inspect the link to ${r.label}">${c.icon('link-2', { size: 'sm' })}</button>`
      : ''
  }</li>`;
const rows = (c: GraphRenderContext, list: SafeHtml[], more = 0): SafeHtml =>
  c.html`<ul class="graph-explorer-rows">${list}</ul>${more > 0 ? c.html`<p class="graph-explorer-more">${fmt(more)} more in Relations</p>` : ''}`;

/** the head of the side details: the type as a tile, the kind and the path */
const detailHead = (c: GraphRenderContext, tile: SafeHtml, kicker: SafeHtml, path: SafeHtml | ''): SafeHtml =>
  c.html`<header class="graph-explorer-detail-head"><span class="graph-explorer-detail-tile">${tile}</span><div class="graph-explorer-detail-titles"><p class="graph-explorer-detail-kicker">${kicker}</p>${path}</div></header>`;

/** the head of an expanded page */
const pageHead = (
  c: GraphRenderContext,
  tile: SafeHtml,
  title: string,
  kicker: SafeHtml,
  path: SafeHtml | '',
  actions: SafeHtml,
): SafeHtml =>
  c.html`<header class="graph-explorer-page-head"><span class="graph-explorer-detail-tile" data-size="xl">${tile}</span><div class="graph-explorer-page-titles">${path}<h2 class="graph-explorer-page-title">${title}</h2><p class="graph-explorer-detail-kicker">${kicker}</p></div>${actions}</header>`;

/** the Expand / Back to graph button */
const pageToggle = (c: GraphRenderContext): SafeHtml | string =>
  !c.expanded && !c.expandable
    ? ''
    : c.expanded
      ? c.html`<button type="button" class="btn" data-variant="outline" data-size="sm" data-graph-explorer-action="${c.action('collapse')}">${c.icon('shrink')} Back to graph</button>`
      : c.html`<button type="button" class="btn" data-variant="ghost" data-size="sm" data-graph-explorer-action="${c.action('expand')}" title="Expand (E)">${c.icon('expand')} Expand</button>`;

/** a node's relations as a table; each row's first cell is drawn by the edge label renderers (a click inspects it) */
function relationsTable(
  c: GraphRenderContext,
  item: GraphNode,
  d: GraphDetails,
  tier: 'icon' | 'label' | 'full' = 'label',
  limit = 60,
): SafeHtml {
  const rows =
    item.kind === 'cluster'
      ? (d.relations ?? []).slice(0, limit).map((r) => ({
          id: r.id,
          label: r.label,
          where: '',
          out: r.out,
          in: r.in,
          link: item.id + '>' + r.id,
          edge: {
            kind: 'agg',
            type: 'calls',
            count: r.out || 0,
            count2: r.in || 0,
            bidir: !!(r.out && r.in),
            back: !!r.back,
            breaker: r.breaker || null,
            style: { tone: 'muted' },
          } as Partial<GraphEdge>,
        }))
      : (d.out ?? []).slice(0, limit).map((r) => ({
          id: r.id,
          label: r.label,
          where: r.same ? '' : r.system,
          out: 1,
          in: 0,
          link: r.same ? item.id + '>' + r.id : null,
          edge: {
            kind: 'leaf',
            type: r.edge,
            count: 1,
            count2: 0,
            bidir: false,
            back: false,
            breaker: null,
            style: { tone: r.edge === 'reads' ? 'link' : r.edge === 'owns' ? 'ink' : 'muted' },
          } as Partial<GraphEdge>,
        }));
  if (!rows.length) return c.html`<p class="graph-explorer-muted graph-explorer-pad">No relations.</p>`;
  return c.html`<div class="table-container"><table class="table graph-explorer-rel-table"><thead><tr class="table-row">
      <th class="table-head" scope="col">Link</th><th class="table-head" scope="col">${item.kind === 'cluster' ? 'Cluster' : 'Target'}</th>
      <th class="table-head" scope="col" style="text-align:right">Out</th><th class="table-head" scope="col" style="text-align:right">In</th></tr></thead>
    <tbody>${rows.map(
      (r) => c.html`<tr class="table-row" data-graph-explorer-goto="${r.id}">
      <td class="table-cell graph-explorer-rel-edge">${
        r.link
          ? c.html`<button type="button" class="graph-explorer-edge-btn" data-graph-explorer-edge="${r.link}" title="Inspect the link">${c.edgeLabel(r.edge, tier)}</button>`
          : c.edgeLabel(r.edge, tier)
      }</td>
      <td class="table-cell"><button type="button" class="graph-explorer-link" data-graph-explorer-goto="${r.id}">${r.label}</button>${r.where ? c.html`<span class="graph-explorer-muted"> · ${r.where}</span>` : ''}</td>
      <td class="table-cell" style="text-align:right">${r.out ? fmt(r.out) : ''}</td><td class="table-cell" style="text-align:right">${r.in ? fmt(r.in) : ''}</td></tr>`,
    )}</tbody></table></div>`;
}

/** a link's single links as a table (the relations outlet while a link is selected) */
function linksTable(c: GraphRenderContext, d: GraphEdgeDetails): SafeHtml {
  if (!d.samples.length) return c.html`<p class="graph-explorer-muted graph-explorer-pad">No single links.</p>`;
  return c.html`<div class="table-container"><table class="table graph-explorer-rel-table"><thead><tr class="table-row">
      <th class="table-head" scope="col">From</th><th class="table-head" scope="col">Relation</th><th class="table-head" scope="col">To</th><th class="table-head" scope="col">${c.synthetic ? 'Systems' : 'Clusters'}</th></tr></thead>
    <tbody>${d.samples.map(
      (
        x,
      ) => c.html`<tr class="table-row"><td class="table-cell"><button type="button" class="graph-explorer-link" data-graph-explorer-goto="${x.from.id}">${x.from.label}</button></td>
      <td class="table-cell"><span class="graph-explorer-rel-type">${c.icon(EDGE_ICON[x.type] || 'link', { size: 'xs' })}${x.type}${x.back ? c.html` <span class="graph-explorer-muted">back</span>` : ''}</span></td>
      <td class="table-cell"><button type="button" class="graph-explorer-link" data-graph-explorer-goto="${x.to.id}">${x.to.label}</button></td>
      <td class="table-cell graph-explorer-muted">${x.from.system === x.to.system ? x.from.system : `${x.from.system} → ${x.to.system}`}</td></tr>`,
    )}</tbody></table></div>`;
}

/** a node's children as a table with their share (an expanded page: the drill-down goes on from here) */
function childrenTable(c: GraphRenderContext, kids: GraphNode[], limit = 40): SafeHtml {
  const cluster = kids[0]?.kind === 'cluster';
  const value = (k: GraphNode): number => (cluster ? k.members : k.degree);
  const list = [...kids].sort((a, b) => value(b) - value(a)).slice(0, limit);
  const max = Math.max(1, ...list.map(value));
  return c.html`<div class="table-container"><table class="table graph-explorer-rel-table"><thead><tr class="table-row">
      <th class="table-head" scope="col">Name</th><th class="table-head" scope="col">Type</th>
      <th class="table-head" scope="col" style="text-align:right">${cluster ? 'Nodes' : 'Links'}</th><th class="table-head graph-explorer-bar-col" scope="col"><span class="sr-only">Share</span></th></tr></thead>
    <tbody>${list.map(
      (
        k,
      ) => c.html`<tr class="table-row"><td class="table-cell"><button type="button" class="graph-explorer-link" data-graph-explorer-goto="${k.id}">${typeIcon(k, { size: 'xs' })} ${k.label}</button></td>
      <td class="table-cell graph-explorer-muted">${k.typeName}</td><td class="table-cell" style="text-align:right">${fmt(value(k))}</td>
      <td class="table-cell graph-explorer-bar-col">${shareBar(c, value(k), max)}</td></tr>`,
    )}</tbody></table></div>${kids.length > limit ? c.html`<p class="graph-explorer-more">the ${limit} largest of ${fmt(kids.length)}</p>` : ''}`;
}

// -- the rows grids of a page: every entity below a cluster, every single link of a link -------------------------
// A Data Grid (Big Data) takes the worker's rows; dataview aggregations of the same source - its filter scan shared -
// show how the rows the filters match split up, and follow every filter change. The Data Grid is a soft dependency:
// without df$.shadcn.dataGrid (an app bundle that left it out) a page keeps the sample tables.

/** a column of a rows grid */
interface GridColumn {
  field: string;
  label: string;
  width: string;
  number?: boolean;
  filter?: 'text' | 'number' | 'select';
}
const ENTITY_COLUMNS: GridColumn[] = [
  { field: 'label', label: 'Name', width: '14rem', filter: 'text' },
  { field: 'type', label: 'Type', width: '8rem', filter: 'select' },
  { field: 'system', label: 'System', width: '11rem', filter: 'text' },
  { field: 'owner', label: 'Owner', width: '7rem', filter: 'select' },
  { field: 'out', label: 'Out', width: '5rem', number: true, filter: 'number' },
  { field: 'in', label: 'In', width: '5rem', number: true, filter: 'number' },
  { field: 'rows', label: 'Rows (k)', width: '6.5rem', number: true, filter: 'number' },
  { field: 'freshness', label: 'Age (h)', width: '6rem', number: true, filter: 'number' },
];
// a loaded graph's entity: what the page gave (no owner, rows or freshness), its system a cluster
const LOADED_ENTITY_COLUMNS: GridColumn[] = [
  { field: 'label', label: 'Name', width: '14rem', filter: 'text' },
  { field: 'type', label: 'Type', width: '8rem', filter: 'select' },
  { field: 'system', label: 'Cluster', width: '11rem', filter: 'text' },
  { field: 'out', label: 'Out', width: '5rem', number: true, filter: 'number' },
  { field: 'in', label: 'In', width: '5rem', number: true, filter: 'number' },
  { field: 'ref', label: 'Ref', width: '12rem', filter: 'text' },
];
const LINK_COLUMNS: GridColumn[] = [
  { field: 'fromLabel', label: 'From', width: '13rem', filter: 'text' },
  { field: 'relation', label: 'Relation', width: '7rem', filter: 'select' },
  { field: 'toLabel', label: 'To', width: '13rem', filter: 'text' },
  { field: 'direction', label: 'Way', width: '6.5rem', filter: 'select' },
  { field: 'fromSystem', label: 'From system', width: '11rem', filter: 'text' },
  { field: 'toSystem', label: 'To system', width: '11rem', filter: 'text' },
];
/** the shares beside a grid: one aggregation each, over the rows its filters match */
interface GridShare {
  title: string;
  field: string;
  limit?: number;
}
const ENTITY_SHARES: GridShare[] = [
  { title: 'By type', field: 'type' },
  { title: 'By owner', field: 'owner' },
  { title: 'Largest systems', field: 'system', limit: 5 },
];
const LOADED_ENTITY_SHARES: GridShare[] = [
  { title: 'By type', field: 'type' },
  { title: 'Largest clusters', field: 'system', limit: 5 },
];
const LINK_SHARES: GridShare[] = [
  { title: 'By relation', field: 'relation' },
  { title: 'Way', field: 'direction' },
  { title: 'Busiest senders', field: 'fromSystem', limit: 5 },
];

interface GridSource {
  rows: readonly GraphRow[];
  aggregate(
    query: { filters?: unknown[] },
    spec: Record<string, unknown>,
  ): { rows: Record<string, unknown>[]; matchedRows: number; totalRows: number };
}
interface GridApi {
  setSource(target: HTMLElement, rows: GraphRow[], options?: Record<string, unknown>): void;
  source(target: HTMLElement): GridSource | undefined;
}

/** a custom grid cell: the name as a button that opens its node's page */
const gotoCell =
  (idField: string, labelField: string) =>
  (el: HTMLElement, record: GraphRow): void => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'graph-explorer-link';
    b.setAttribute('data-graph-explorer-goto', String(record[idField]));
    b.textContent = String(record[labelField]);
    el.append(b);
  };

/**
 * Every row behind a node or a link as a Data Grid - filter, sort, open a row's page - with the shares of the rows its
 * filters match (dataview aggregations of the grid's own source). An island: the grid keeps its records, its scroll and
 * its query while the page renders again.
 */
function rowsView(
  c: GraphRenderContext,
  id: string,
  kind: 'entities' | 'links',
  label: string,
  fallback: () => SafeHtml,
): SafeHtml {
  const grids = df$.dataGrid as GridApi | undefined;
  if (!grids?.source) return fallback();
  const cols =
    kind !== 'entities'
      ? LINK_COLUMNS.map((col) => (c.synthetic ? col : { ...col, label: col.label.replace('system', 'cluster') }))
      : c.synthetic
        ? ENTITY_COLUMNS
        : LOADED_ENTITY_COLUMNS;
  const shares = kind !== 'entities' ? LINK_SHARES : c.synthetic ? ENTITY_SHARES : LOADED_ENTITY_SHARES;
  const noun = kind === 'entities' ? 'entities' : 'links';
  const markup = c.html`<div class="graph-explorer-records">
    <p class="graph-explorer-records-count" aria-live="polite">Loading every row...</p>
    <div class="graph-explorer-records-shares"></div>
    <div class="data-grid graph-explorer-grid" aria-label="${label}" data-persist="none" data-empty-text="No row matches the filters." style="height: 24rem">
      <div class="data-grid-viewport"><div class="data-grid-head"><div class="data-grid-row">${cols.map(
        (col) =>
          c.html`<div class="data-grid-header" data-field="${col.field}" data-width="${col.width}"${col.number ? c.html` data-type="number"` : ''}${col.filter ? c.html` data-filter="${col.filter}"` : ''}>${col.label}</div>`,
      )}</div></div><div class="data-grid-body"></div></div>
    </div></div>`;
  return c.island('rows:' + id, markup, (el) => {
    let alive = true,
      off: (() => void) | null = null;
    void c.fetchRows(id).then((data) => {
      if (!alive) return;
      const grid = dfDollar(el).find('.data-grid').get(0) as HTMLElement & {
        store?: { value?: { config?: { filters?: unknown[] } }; subscribe(fn: () => void): () => void };
      };
      const count = dfDollar(el).find('.graph-explorer-records-count').get(0) as HTMLElement;
      const strip = dfDollar(el).find('.graph-explorer-records-shares').get(0) as HTMLElement;
      grids.setSource(grid, data.rows, {
        cells:
          kind === 'entities'
            ? { label: gotoCell('id', 'label') }
            : { fromLabel: gotoCell('from', 'fromLabel'), toLabel: gotoCell('to', 'toLabel') },
      });
      const source = grids.source(grid);
      if (!source) return;
      let seen = '';
      const paint = (): void => {
        const filters = grid.store?.value?.config?.filters ?? [];
        const key = JSON.stringify(filters);
        if (key === seen) return;
        seen = key;
        const parts = shares.map((sh) => ({
          sh,
          r: source.aggregate(
            { filters },
            {
              groupBy: sh.field,
              sort: { by: 'count', direction: 'desc' },
              ...(sh.limit ? { limit: sh.limit, other: 'the rest' } : {}),
            },
          ),
        }));
        const matched = parts[0]?.r.matchedRows ?? source.rows.length;
        morph(
          count,
          c.html`<strong>${fmt(matched)}</strong> of ${fmt(source.rows.length)} ${noun}${
            filters.length ? c.html` <span class="graph-explorer-muted">match the filters</span>` : ''
          }`,
        );
        morph(
          strip,
          c.html`${parts.map(
            ({ sh, r }) =>
              c.html`<section class="graph-explorer-records-share"><h4 class="graph-explorer-section-title"><span>${sh.title}</span></h4><ul class="graph-explorer-shares">${r.rows.map(
                (g) =>
                  c.html`<li><span class="graph-explorer-share-name">${String(g[sh.field] ?? '-')}</span><span class="graph-explorer-share-value">${fmt(Number(g.count))}</span>${shareBar(c, Number(g.count), matched)}</li>`,
              )}</ul></section>`,
          )}`,
        );
      };
      paint();
      off = grid.store?.subscribe(paint) ?? null;
    });
    return () => {
      alive = false;
      off?.();
    };
  });
}

/** how a list of nodes splits by one key: the share of each */
function composition(
  c: GraphRenderContext,
  kids: GraphNode[],
  keyOf: (k: GraphNode) => string,
  weight: (k: GraphNode) => number,
): SafeHtml {
  const by = new Map<string, number>();
  let total = 0;
  for (const k of kids) {
    const w = weight(k);
    by.set(keyOf(k), (by.get(keyOf(k)) || 0) + w);
    total += w;
  }
  const list = [...by.entries()].sort((a, b) => b[1] - a[1]);
  return c.html`<ul class="graph-explorer-shares">${list.map(
    ([k, n]) =>
      c.html`<li><span class="graph-explorer-share-name">${k}</span><span class="graph-explorer-share-value">${fmt(n)} · ${Math.round((n / Math.max(1, total)) * 100)} %</span>${shareBar(c, n, total)}</li>`,
  )}</ul>`;
}

/** a breaker's facts at a glance: the health bar and its legend */
const healthBlock = (c: GraphRenderContext, h: ReturnType<typeof health>): SafeHtml =>
  c.html`${healthBar(c, h)}<ul class="graph-explorer-legend"><li data-tone="danger">${fmt(h.open)} open</li><li data-tone="warn">${fmt(h.half)} half-open</li><li data-tone="ink">${fmt(h.cut)} cut</li><li data-tone="ok">${fmt(h.closed)} closed</li></ul>`;

/** the actions on a node */
const nodeActions = (c: GraphRenderContext, item: GraphNode): SafeHtml =>
  c.html`<div class="graph-explorer-detail-actions">${
    item.kind === 'cluster'
      ? c.html`<button type="button" class="btn" data-variant="default" data-size="sm" data-graph-explorer-action="${c.action('enter')}" title="Zoom into ${item.label} and show its ${fmt(item.children)} children (Enter)">${c.icon('scan')} Zoom in</button>`
      : ''
  }${
    c.expanded
      ? ''
      : c.html`<button type="button" class="btn" data-variant="outline" data-size="sm" data-graph-explorer-action="${c.action('bring')}" title="Gather the busiest neighbours of ${item.label} around it and fly to the one you pick (B)">${c.icon('crosshair')} Jump to a neighbour</button>`
  }${pageToggle(c)}</div>`;

register('global', {
  kind: 'detail',
  name: 'builtin-detail',
  match: () => 0,
  title: (item) => item.label,
  // ctx.expanded: the details outlet's Panel is maximized - the node's full page, every list a way further down
  render: (item, c) => {
    const d = c.request('details:' + item.id, () => c.fetchDetails(item.id));
    const cluster = item.kind === 'cluster';
    const kicker = c.html`${item.typeName}${cluster ? c.html` · ${fmt(item.members)} nodes` : ''}${
      item.scc > 1
        ? c.html` · <span class="graph-explorer-cycle-note">${c.icon('repeat-2', { size: 'xs' })} cycle of ${item.scc}</span>`
        : ''
    }`;
    const tile = typeIcon(item, { size: c.expanded ? 'xl' : 'lg' });
    if (!d) return c.html`${detailHead(c, tile, kicker, '')}<p class="graph-explorer-muted">Loading details...</p>`;
    const h = health(item);
    const relations = d.relations ?? [];
    if (c.expanded) {
      const kids = c.request('view:' + item.id, () => (cluster ? c.fetchView(item.id) : null));
      const head = pageHead(c, tile, item.label, kicker, trail(c, d.path), nodeActions(c, item));
      if (cluster) {
        const children: GraphNode[] = kids ? kids.children : [];
        const leaves = children.length > 0 && children[0].kind === 'entity';
        const worst = relations.filter((r) => r.breaker && r.breaker.state !== 'closed');
        return c.html`<div class="graph-explorer-page">${head}
          <section class="graph-explorer-kpis">
            ${kpi(c, 'Nodes below', fmt(d.members ?? 0), `${fmt(d.children ?? 0)} children`)}
            ${kpi(c, 'Relations', fmt(relations.length), 'at this level')}
            ${c.synthetic ? kpi(c, 'Links not closed', fmt(h.bad), `of ${fmt(h.total)} bundled`, h.bad ? (h.tone as GraphTone) : 'ok') : ''}
            ${kpi(c, 'Cycle', item.scc > 1 ? `${item.scc} nodes` : 'none', item.scc > 1 ? 'reach each other' : 'acyclic here')}
          </section>
          <div class="graph-explorer-page-grid">
            ${pageCard(
              c,
              c.synthetic ? (leaves ? 'Entity types' : 'System kinds') : leaves ? 'Node types' : 'Cluster types',
              kids
                ? composition(
                    c,
                    children,
                    (k) => k.typeName,
                    (k) => (leaves ? 1 : k.members),
                  )
                : c.html`<p class="graph-explorer-muted">Loading...</p>`,
              { icon: 'layers', note: leaves ? 'entities by type' : 'nodes below each kind' },
            )}
            ${
              !c.synthetic
                ? ''
                : leaves && kids
                  ? pageCard(
                      c,
                      'Owners',
                      composition(
                        c,
                        children,
                        (k) => k.attrs?.owner ?? '-',
                        () => 1,
                      ),
                      { icon: 'users', note: 'who owns the entities' },
                    )
                  : pageCard(
                      c,
                      'Link health',
                      c.html`${healthBlock(c, h)}${
                        worst.length
                          ? rows(
                              c,
                              worst.slice(0, 6).map((r) =>
                                row(c, {
                                  id: r.id,
                                  label: r.label,
                                  meta: `${fmt(r.out + r.in)} links`,
                                  badge: stateBadge(c, r.breaker!.state),
                                  edge: item.id + '>' + r.id,
                                }),
                              ),
                            )
                          : c.html`<p class="graph-explorer-muted">Every breaker is closed.</p>`
                      }`,
                      { icon: 'shield-check', note: 'the breakers its links bundle' },
                    )
            }
            ${
              leaves
                ? ''
                : pageCard(
                    c,
                    'Children',
                    kids ? childrenTable(c, children) : c.html`<p class="graph-explorer-muted">Loading...</p>`,
                    { wide: true, icon: 'boxes', note: 'pick one for its page' },
                  )
            }
            ${pageCard(
              c,
              'Every entity below',
              rowsView(c, item.id, 'entities', `Every entity below ${item.label}`, () =>
                kids ? childrenTable(c, children) : c.html`<p class="graph-explorer-muted">Loading...</p>`,
              ),
              { wide: true, icon: 'database', note: 'filter, sort, open one - the shares follow the filters' },
            )}
            ${pageCard(c, 'Relations at this level', relationsTable(c, item, d, 'full'), {
              wide: true,
              icon: 'link-2',
              note: 'a name opens its page, a link its traffic',
            })}
          </div></div>`;
      }
      const a = item.attrs;
      const stale = (a?.freshness ?? 0) > 24;
      return c.html`<div class="graph-explorer-page">${head}
        <section class="graph-explorer-kpis">
          ${kpi(c, 'Outgoing', fmt(d.outDeg ?? 0), 'links it starts')}
          ${kpi(c, 'Incoming', fmt(d.inDeg ?? 0), 'links to it')}
          ${c.synthetic ? kpi(c, 'Rows', fmt(a?.rows ?? 0) + 'k') : ''}
          ${c.synthetic ? kpi(c, 'Freshness', `${a?.freshness ?? 0} h`, stale ? 'stale' : 'fresh', stale ? 'warn' : 'ok') : ''}
        </section>
        <div class="graph-explorer-page-grid">
          ${pageCard(
            c,
            'Attributes',
            stats(
              c,
              c.synthetic
                ? [
                    ['Type', item.typeName],
                    ['Owner', a?.owner ?? '-'],
                    ['System', d.path.at(-2)?.label ?? '-'],
                    ['Domain', d.path.at(-3)?.label ?? '-'],
                    ['Id', item.id],
                  ]
                : [
                    ['Type', item.typeName],
                    ['Cluster', d.path.at(-2)?.label ?? '-'],
                    ['Ref', item.ref ?? '-'],
                    ['Id', item.id],
                  ],
            ),
            { icon: 'info' },
          )}
          ${pageCard(
            c,
            'Incoming',
            (d.in ?? []).length
              ? rows(
                  c,
                  (d.in ?? []).map((r) =>
                    row(c, {
                      id: r.id,
                      label: r.label,
                      icon: c.icon(EDGE_ICON[r.edge] || 'link', { size: 'xs' }),
                      meta: `${r.edge} · ${r.same ? 'this system' : r.system}`,
                      edge: r.same ? r.id + '>' + item.id : null,
                    }),
                  ),
                )
              : c.html`<p class="graph-explorer-muted">Nothing links here.</p>`,
            { icon: 'arrow-left', note: `${fmt(d.inDeg ?? 0)} in all` },
          )}
          ${pageCard(c, 'Outgoing', relationsTable(c, item, d, 'full'), { wide: true, icon: 'arrow-right', note: 'a name opens its page, a link its details' })}
        </div></div>`;
    }
    // the side: who it is, what it does, where it leads
    const head = detailHead(c, tile, kicker, trail(c, d.path));
    if (cluster)
      return c.html`${head}${nodeActions(c, item)}
        ${stats(c, [
          ['Nodes below', fmt(d.members ?? 0)],
          ['Children', fmt(d.children ?? 0)],
          ['Relations', fmt(relations.length)],
          ...(c.synthetic
            ? [
                [
                  'Not closed',
                  h.bad ? `${fmt(h.bad)} of ${fmt(h.total)}` : 'none',
                  h.bad ? (h.tone as GraphTone) : 'ok',
                ] as [string, unknown, GraphTone?],
              ]
            : []),
        ])}
        ${item.breakers && h.total > 1 ? section(c, 'Link health', healthBlock(c, h)) : ''}
        ${section(
          c,
          'Relations',
          relations.length
            ? rows(
                c,
                relations.slice(0, 12).map((r) =>
                  row(c, {
                    id: r.id,
                    label: r.label,
                    meta: c.html`${r.out ? c.html`<span>→ ${fmt(r.out)}</span>` : ''}${r.in ? c.html`<span>← ${fmt(r.in)}</span>` : ''}`,
                    badge: r.breaker && r.breaker.state !== 'closed' ? stateBadge(c, r.breaker.state) : '',
                    edge: item.id + '>' + r.id,
                  }),
                ),
                relations.length - 12,
              )
            : c.html`<p class="graph-explorer-muted">No relations at this level.</p>`,
          relations.length,
        )}`;
    const a = item.attrs;
    const stale = (a?.freshness ?? 0) > 24;
    const linkRows = (list: GraphLink[], incoming: boolean): SafeHtml =>
      rows(
        c,
        list.slice(0, 8).map((r) =>
          row(c, {
            id: r.id,
            label: r.label,
            icon: c.icon(EDGE_ICON[r.edge] || 'link', { size: 'xs' }),
            meta: `${r.edge} · ${r.same ? 'here' : r.system}`,
            edge: r.same ? (incoming ? r.id + '>' + item.id : item.id + '>' + r.id) : null,
          }),
        ),
        list.length - 8,
      );
    return c.html`${head}${nodeActions(c, item)}
      ${stats(
        c,
        c.synthetic
          ? [
              ['Owner', a?.owner ?? '-'],
              ['Rows', fmt(a?.rows ?? 0) + 'k'],
              ['Freshness', `${a?.freshness ?? 0} h`, stale ? 'warn' : 'ok'],
              ['Links', `${fmt(d.outDeg ?? 0)} out · ${fmt(d.inDeg ?? 0)} in`],
            ]
          : [
              ['Type', item.typeName],
              ['Links', `${fmt(d.outDeg ?? 0)} out · ${fmt(d.inDeg ?? 0)} in`],
              ...(item.ref ? [['Ref', item.ref] as [string, unknown]] : []),
            ],
      )}
      ${section(c, 'Outgoing', (d.out ?? []).length ? linkRows(d.out ?? [], false) : c.html`<p class="graph-explorer-muted">None.</p>`, d.outDeg)}
      ${section(c, 'Incoming', (d.in ?? []).length ? linkRows(d.in ?? [], true) : c.html`<p class="graph-explorer-muted">None.</p>`, d.inDeg)}`;
  },
});

/** one end of a link as a button that opens its node */
const endButton = (c: GraphRenderContext, n: GraphNode): SafeHtml =>
  c.html`<button type="button" class="graph-explorer-end" data-graph-explorer-goto="${n.id}">${typeIcon(n, { size: 'sm' })}<span class="graph-explorer-end-name">${n.label}</span><span class="graph-explorer-end-type">${n.typeName}</span></button>`;

// the details of a selected link: both directions, the relations it carries, the breakers it bundles, who sends and
// who receives, and single links - the drill-down goes on into any of them
register('global', {
  kind: 'edge',
  name: 'builtin-edge-detail',
  detail: {
    match: () => 0,
    title: (item) => item.source.label + ' → ' + item.target.label,
    render: (item, c) => {
      const d = c.request('edge:' + item.id, () => c.fetchEdge(item.id));
      const e = item.edge;
      const kicker = c.html`${e.kind === 'agg' ? 'Links between clusters' : 'A link'} · ${e.kind === 'agg' ? fmt(e.count + e.count2) + ' links' : e.type}${e.bidir ? ' · both ways' : ''}`;
      const tile = c.icon(e.breaker && e.breaker.state !== 'closed' ? BREAKER_ICON[e.breaker.state] : 'link-2', {
        size: c.expanded ? 'xl' : 'lg',
      });
      const ends = c.html`<div class="graph-explorer-ends">${endButton(c, item.source)}<span class="graph-explorer-ends-arrow" aria-label="${e.bidir ? 'both ways' : 'to'}">${c.icon(e.bidir ? 'arrow-left-right' : 'arrow-right', { size: 'sm' })}</span>${endButton(c, item.target)}</div>`;
      const actions = c.html`<div class="graph-explorer-detail-actions">${pageToggle(c)}</div>`;
      if (!d)
        return c.html`${detailHead(c, tile, kicker, '')}${ends}<p class="graph-explorer-muted">Loading the links...</p>`;
      const total = d.forward + d.backward;
      const types = Object.entries(d.byType).filter(([, n]) => n > 0);
      const byType = c.html`<ul class="graph-explorer-shares">${types.map(
        ([t, n]) =>
          c.html`<li><span class="graph-explorer-share-name">${c.icon(EDGE_ICON[t] || 'link', { size: 'xs' })} ${t}</span><span class="graph-explorer-share-value">${fmt(n)}</span>${shareBar(c, n, total)}</li>`,
      )}</ul>`;
      const bad = d.pairs.filter((p) => p.state !== 'closed');
      const pairRow = (p: GraphEdgePair): SafeHtml =>
        row(c, {
          id: p.from.id,
          label: p.from.label + ' → ' + p.to.label,
          meta: `${fmt(p.count)} · ${p.trips} trips`,
          badge: stateBadge(c, p.state),
        });
      const share = (list: GraphEdgeShare[]): SafeHtml => {
        const max = Math.max(1, ...list.map((x) => x.count));
        return rows(
          c,
          list
            .slice(0, 6)
            .map((x) => row(c, { id: x.id, label: x.label, meta: fmt(x.count), bar: shareBar(c, x.count, max) })),
        );
      };
      const dirs = `${item.source.label} → ${item.target.label}`;
      if (c.expanded)
        return c.html`<div class="graph-explorer-page">${pageHead(c, tile, dirs, kicker, trail(c, d.path, true), actions)}${ends}
          <section class="graph-explorer-kpis">
            ${kpi(c, 'Forward', fmt(d.forward), `${item.source.label} → ${item.target.label}`)}
            ${kpi(c, 'Back', fmt(d.backward), `${item.target.label} → ${item.source.label}`)}
            ${e.kind !== 'agg' ? kpi(c, 'Relation', e.type) : c.synthetic ? kpi(c, 'Breakers', fmt(d.pairs.length), `${fmt(bad.length)} not closed`, bad.length ? 'warn' : 'ok') : ''}
            ${e.kind === 'agg' && c.synthetic ? kpi(c, 'Trips', fmt(d.pairs.reduce((n, p) => n + p.trips, 0)), 'since the last deploy') : ''}
          </section>
          <div class="graph-explorer-page-grid">
            ${pageCard(c, 'By relation', byType, { icon: 'workflow', note: 'both directions' })}
            ${d.sources.length ? pageCard(c, 'Top senders', share(d.sources), { icon: 'send', note: `in ${item.source.label}` }) : ''}
            ${d.targets.length ? pageCard(c, 'Top receivers', share(d.targets), { icon: 'target', note: `in ${item.target.label}` }) : ''}
            ${
              d.pairs.length
                ? pageCard(
                    c,
                    'Circuit breakers',
                    c.html`<div class="table-container"><table class="table graph-explorer-rel-table"><thead><tr class="table-row"><th class="table-head" scope="col">Caller</th><th class="table-head" scope="col">Callee</th><th class="table-head" scope="col" style="text-align:right">Links</th><th class="table-head" scope="col">State</th><th class="table-head" scope="col" style="text-align:right">Trips</th><th class="table-head" scope="col">Changed by</th></tr></thead><tbody>${d.pairs.map(
                      (p) =>
                        c.html`<tr class="table-row"><td class="table-cell"><button type="button" class="graph-explorer-link" data-graph-explorer-goto="${p.from.id}">${p.from.label}</button></td><td class="table-cell"><button type="button" class="graph-explorer-link" data-graph-explorer-goto="${p.to.id}">${p.to.label}</button></td><td class="table-cell" style="text-align:right">${fmt(p.count)}</td><td class="table-cell">${stateBadge(c, p.state)}</td><td class="table-cell" style="text-align:right">${p.trips}</td><td class="table-cell graph-explorer-muted">${p.by} · ${p.since} min ago</td></tr>`,
                    )}</tbody></table></div>`,
                    { wide: true, icon: 'shield-check', note: 'the system pairs this link bundles, the worst first' },
                  )
                : ''
            }
            ${pageCard(
              c,
              'Every single link',
              rowsView(c, item.id, 'links', `Every link from ${item.source.label} to ${item.target.label}`, () =>
                linksTable(c, d),
              ),
              {
                wide: true,
                icon: 'git-branch',
                note: 'both ways - filter, sort, open an end - the shares follow the filters',
              },
            )}
          </div></div>`;
      return c.html`${detailHead(c, tile, kicker, trail(c, d.path, true))}${ends}${actions}
        ${stats(c, [
          ['Forward', fmt(d.forward)],
          ['Back', fmt(d.backward)],
          ...((c.synthetic
            ? [
                ['Breaker', e.breaker ? stateBadge(c, e.breaker.state) : 'none'],
                [
                  e.kind === 'agg' ? 'Pairs' : 'Relation',
                  e.kind === 'agg' ? `${fmt(d.pairs.length)} · ${fmt(bad.length)} not closed` : e.type,
                  bad.length ? 'warn' : undefined,
                ],
              ]
            : e.kind === 'agg'
              ? []
              : [['Relation', e.type]]) as [string, unknown, GraphTone?][]),
        ])}
        ${section(c, 'By relation', byType)}
        ${bad.length ? section(c, 'Breakers not closed', rows(c, bad.slice(0, 5).map(pairRow), bad.length - 5), bad.length) : ''}
        ${d.sources.length > 1 ? section(c, 'Top senders', share(d.sources)) : ''}
        ${d.targets.length > 1 ? section(c, 'Top receivers', share(d.targets)) : ''}`;
    },
  },
});

// -- outlets ---------------------------------------------------------------------------
// An outlet is a container the page places anywhere - typically a Panel's body - that names the explorer
// (data-graph-explorer-for) and what it shows (data-graph-explorer-outlet). Its content is the runtime's
// (data-ce-chrome): the HTML Preview Editor never writes it back into a source.

const FOR = 'data-graph-explorer-for';
const OUTLETS = ['breadcrumb', 'search', 'outline', 'details', 'relations', 'layers', 'updates'];

// -- layers --------------------------------------------------------------------------------
// What the graph shows is layers of information, each a filter of its own: the base layers nodes (the chips and cards)
// and relations (the lines) are shown while data-layers is absent; with none the clusters' circles and dots remain.

/** the built-in layers, in the switch's order (the plugins' come after them) */
const BUILTIN_LAYERS = [
  { name: 'nodes', label: 'Nodes', icon: 'circle', base: true },
  { name: 'relations', label: 'Relations', icon: 'network', base: true },
  { name: 'labels', label: 'Labels', icon: 'tag', base: false },
  { name: 'health', label: 'Health', icon: 'activity', base: false },
];
const BASE_LAYERS = ['nodes', 'relations'];

/** a layers value (a list or space separated words) as a list of names, each once */
function layerList(value: unknown): string[] {
  const words = Array.isArray(value) ? value.map(String) : String(value ?? '').split(/\s+/);
  return [...new Set(words.map((w) => w.trim()).filter((w) => /^[a-z0-9-]+$/.test(w)))];
}
/** the layers an element shows: data-layers, or the base layers while it is absent */
function layersOf(el: HTMLElement): string[] {
  return el.hasAttribute('data-layers') ? layerList(el.getAttribute('data-layers')) : [...BASE_LAYERS];
}
const sameLayers = (a: string[], b: string[]): boolean =>
  a.length === b.length && [...a].sort().join(' ') === [...b].sort().join(' ');

/** the elements bound to an explorer that match `sel`: the bound elements themselves and their descendants */
function boundOf(el: HTMLElement, sel: string): HTMLElement[] {
  if (!el.id) return [];
  const out: HTMLElement[] = [];
  for (const bound of dfDollar(`[${FOR}="${CSS.escape(el.id)}"]`).toArray() as HTMLElement[]) {
    if (bound.matches(sel)) out.push(bound);
    out.push(...(dfDollar(bound).find(sel).toArray() as HTMLElement[]));
  }
  return [...new Set(out)];
}

/** the chrome element of an outlet (made once; an outlet emptied by a morph of the page gets it again) */
function outletChrome(outlet: HTMLElement, kind: string, make: () => HTMLElement): HTMLElement {
  let chrome = dfDollar(outlet).children(`.graph-explorer-${kind}[data-ce-chrome]`).get(0);
  if (!chrome) {
    chrome = make();
    dfDollar(outlet).append(chrome);
  }
  return chrome;
}

const resolveTarget = (target: string | HTMLElement): HTMLElement | undefined =>
  typeof target === 'string' ? dfDollar(target).get(0) : target;

// -- the State API -------------------------------------------------------------------------

/**
 * The markup of a state, on the live element and on render()'s detached copy: the focus, the selection, the layers
 * and the expanded details as data-* attributes. Everything drawn (canvas, slots, labels, outlets) is the runtime's.
 */
function applyMarkup(el: HTMLElement, name: string, config: GraphExplorerConfig): void {
  // the base layers are no attribute; any other set is written (an empty one too: only the circles)
  if (config.layers !== undefined) {
    const want = layerList(config.layers);
    if (!sameLayers(want, layersOf(el)))
      dfDollar(el).attr('data-layers', sameLayers(want, BASE_LAYERS) ? null : want.join(' '));
  }
  if (config.compact !== undefined && el.hasAttribute('data-compact') !== !!config.compact)
    dfDollar(el).attr('data-compact', config.compact ? '' : null);
  const selected = name === 'default' ? [] : keyList(config.selected ?? '');
  if (selected.join(' ') !== keyList(el.getAttribute('data-selected') ?? '').join(' '))
    dfDollar(el).attr('data-selected', selected.length ? selected.join(' ') : null);
  // a link and nodes are never selected together: the nodes win
  const edge = name === 'default' || selected.length ? null : edgeKey(config.edge);
  if ((el.getAttribute('data-selected-edge') || null) !== edge) dfDollar(el).attr('data-selected-edge', edge);
  const focus = name === 'focused' ? config.focus || null : null;
  if ((el.getAttribute('data-focus') || null) !== focus) dfDollar(el).attr('data-focus', focus);
  const expanded = (selected.length > 0 || !!edge) && !!config.expanded;
  if (el.hasAttribute('data-expanded') !== expanded) dfDollar(el).attr('data-expanded', expanded ? '' : null);
}

/** a link's id ('<source>><target>') when the value is one, else null */
function edgeKey(value: unknown): string | null {
  const v = typeof value === 'string' ? value.trim() : '';
  return /^[cn]\d+>[cn]\d+$/.test(v) ? v : null;
}

/** the state the markup amounts to */
function stateNameOf(focus: string | null, selected: string[], edge: string | null): string {
  return focus ? 'focused' : selected.length || edge ? 'selected' : 'default';
}

/** what the element's attributes say */
function configOf(
  el: HTMLElement,
): Required<Omit<GraphExplorerConfig, 'selected' | 'layers'>> & { selected: string[]; layers: string[] } {
  return {
    focus: el.getAttribute('data-focus') || null,
    selected: keyList(el.getAttribute('data-selected') ?? ''),
    layers: layersOf(el),
    compact: el.hasAttribute('data-compact'),
    expanded: el.hasAttribute('data-expanded'),
    edge: edgeKey(el.getAttribute('data-selected-edge')),
  };
}

/** the state's DOM work: the markup, then the view follows it (a new focus flies there) */
function triggerStateChange(
  el: HTMLElement,
  name: string,
  config: GraphExplorerConfig,
  incoming: GraphExplorerConfig,
): Promise<void> {
  const inst = el._graphExplorer;
  const asked = name;
  // a config that names a focus or a selection asks for the state that shows it (the State tab edits one field of
  // the current state: a selection entered at the top lands in 'selected')
  if (incoming.focus && name !== 'focused') name = 'focused';
  else if (name === 'default' && (keyList(incoming.selected ?? '').length || edgeKey(incoming.edge))) name = 'selected';
  // nodes and a link exclude each other: the one this setState names wins (a merged config may hold both)
  if (edgeKey(incoming.edge) && !keyList(incoming.selected ?? '').length) config = { ...config, selected: [] };
  else if (keyList(incoming.selected ?? '').length) config = { ...config, edge: null };
  let landed = name;
  const selected = keyList(config.selected ?? '');
  const edge = selected.length ? null : edgeKey(config.edge);
  if (name === 'focused' && !config.focus) landed = selected.length || edge ? 'selected' : 'default';
  if (name === 'selected' && !selected.length && !edge) landed = 'default';
  applyMarkup(el, landed, config);
  if (landed !== asked) el.dataset.stateName = landed;
  return inst ? inst.sync() : Promise.resolve();
}

/** Registry-level API; pass the element explicitly. Unknown names throw. */
export const graphExplorerApi = componentState({
  component: 'graph-explorer',
  states: graphExplorerStates,
  mergeConfig: true,
  apply: (el, state, _previous, incoming) =>
    triggerStateChange(
      el as HTMLElement,
      state.name,
      state.config as GraphExplorerConfig,
      incoming as GraphExplorerConfig,
    ),
  // the state the attributes show now - a click, a zoom into a cluster or the layer switch change them without setState
  read: (el) => {
    const config = configOf(el as HTMLElement);
    return {
      name: stateNameOf(config.focus, config.selected, config.edge),
      config: config as unknown as Record<string, unknown>,
    };
  },
  markup: (el, state) => applyMarkup(el as HTMLElement, state.name, state.config as GraphExplorerConfig),
});

df$.graphExplorerApi = graphExplorerApi;
df$.graphExplorerStates = graphExplorerStates;

// -- updates: what changed, newest first ------------------------------------------------------
// A change marks its node (a glowing dot at its top right) or its link (the line flashes in its layer's colour and
// fades) for CHANGE_MS, and joins the Updates outlet: a Virtual List of every update the shown layers own, newest
// first, each row a button that selects the node or the link. The list keeps the last UPDATE_LIMIT.
const CHANGE_MS = 8000;
const TIME_FMT = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const UPDATE_LIMIT = 10_000;
const UPDATE_ICONS: Record<string, string> = {
  deploy: 'send',
  breaker: 'zap',
  traffic: 'activity',
  count: 'hash',
};

// the built-in row: the layer's dot (or the tone's), the target, what happened, when
register('global', {
  kind: 'update',
  name: 'builtin-update',
  update: {
    match: () => 0,
    render: (u, c) =>
      c.html`<span class="indicator-dot" data-size="sm" ${u.tone ? c.html`data-tone="${u.tone}"` : ''} aria-hidden="true"></span>${c.icon(UPDATE_ICONS[u.type] ?? 'circle', { size: 'sm' })}<span class="graph-explorer-update-label">${u.label}</span><span class="graph-explorer-update-text">${u.text}</span><time class="graph-explorer-update-time" datetime="${new Date(u.time).toISOString()}">${c.time(u.time)}</time>`,
  },
});

// -- the explorer ---------------------------------------------------------------------------

const HELP_ROWS: [string, string][] = [
  ['←↑→↓', 'move the focus to the nearest node in that direction'],
  ['Shift + arrows, drag', 'pan (panning into a neighbour cluster moves you there)'],
  ['+ - / wheel, pinch', 'zoom (zooming into a cluster enters it)'],
  ['Enter / double click', 'zoom into a cluster: its children show; expand an entity'],
  ['E', 'expand the focused node: its full page in the details outlet (Esc returns)'],
  ['Space / click', 'select and show details (Shift adds)'],
  ['click a link', 'select the link: its traffic, breakers and single links (E expands, Esc lets it go)'],
  ['] [', 'focus the next / previous neighbour'],
  ['B / press and hold', 'jump to a neighbour: the busiest ones gather around the node, pick one to fly there'],
  ['1 - 9', 'show or hide a layer (Nodes, Relations, Labels, Health, ...)'],
  ['Esc', 'close the topmost overlay, then move out'],
  ['Backspace', 'move out'],
  ['0', 'fit the view'],
  ['/', 'search'],
  ['?', 'this map'],
];

class Explorer {
  [key: string]: any;

  constructor(el: HTMLElement) {
    this.el = el;
    this.registry = { node: [], edge: [], detail: [], update: [] };
    // data-source="external": the graph comes from load(), nothing is generated
    this.waitsForData = el.getAttribute('data-source') === 'external';
    this.n = this.waitsForData ? 0 : clamp(parseInt(el.dataset.nodes || '1000000', 10) || 1000000, 2000, 4000000);
    this.seed = parseInt(el.dataset.seed || '7', 10) || 7;
    this.loaded = false; // the graph shown came from load()
    this.gen = 0; // the graph's generation: a load() that lands moves it on (a navigation of the graph before stops)
    this.loads = new Map(); // load() calls the worker has not answered: request -> resolve
    this.loadSeq = 0;
    this.swap = false; // a loaded graph is installed: its top view replaces the one shown
    this.uid = el.id || 'graph-explorer-' + Math.random().toString(36).slice(2, 8);
    this.views = new Map(); // view id -> payload
    this.view = null;
    this.cam = { cx: 0, cy: 0, z: 1 };
    this.bitmapCam = null;
    this.camSeq = 0;
    this.sent = null;
    this.sentAt = 0;
    this.inflight = 0;
    this.pendingBitmap = null;
    this.tiers = null;
    this.slots = new Map(); // node index -> slot
    this.free = [];
    this.selected = new Set();
    this.hover = -1;
    this.kbd = -1;
    this.dataRev = new Map();
    this.requests = new Map();
    this.islandMounts = new Map(); // island key -> its mount, set by the renderer that made the island
    this.rowCache = new Map(); // id -> Promise<GraphRows>, the last two
    this.edgePaths = new Map();
    this.signKeys = '';
    this.labelHosts = new Map(); // edge labels: pooled hosts keyed by edge
    this.labelPool = [];
    this.labelVer = 0;
    this.shown = new Set(layersOf(el)); // the layers shown
    this.compact = el.hasAttribute('data-compact');
    this.layerColors = new Map(); // layer -> its CSS colour
    this.monochrome = false; // the theme's chart colours are one hue: the layers turn chart-1 around the hue circle
    this.expanded = false;
    this.edge = null; // the selected link ('<source>><target>'), or null
    this.dotLabels = []; // the canvas labels' boxes of the last frame (the edge labels keep clear of them)
    this.updates = []; // GraphUpdate[], newest first (UPDATE_LIMIT)
    this.updatesShown = []; // the ones the shown layers own - the Updates outlet's rows
    this.changes = new Map(); // target -> { u, at }: what changed in the last CHANGE_MS (the dots, the flashes)
    this.changeDots = new Map(); // node id -> its dot
    this.updateSeq = 0;
    this.flight = null;
    this.navigating = false;
    this.loading = true;
    this.stats = { frames: 0, fpsT: performance.now(), fps: 0, worker: {} };
    this.searchSeq = 0;
    this.results = [];
    this.activeResult = -1;
    this.waiters = new Map();
    this.syncChain = Promise.resolve();
    this.armReady();
    this.mount();
    this.startWorker();
    this.bindEvents();
    this.observeTheme();
    live.add(this);
  }

  // ---------------------------------------------------- the viewport's chrome
  mount(): void {
    const el = this.el,
      id = this.uid;
    const help = html`<div class="card graph-explorer-help" id="${id}-help" popover data-ce-chrome>
      <div class="card-header"><h3 class="card-title">Keyboard and pointer</h3></div>
      <div class="card-content">
        <table class="graph-explorer-keys">
          <tbody>
            ${HELP_ROWS.map(
              ([k, v]) =>
                html`<tr>
                  <td>${k.split(' / ').map((key, j) => html`${j ? ' / ' : ''}<kbd class="kbd">${key}</kbd>`)}</td>
                  <td>${v}</td>
                </tr>`,
            )}
          </tbody>
        </table>
      </div>
    </div>`;
    const chrome = html`<canvas class="graph-explorer-canvas" aria-hidden="true" data-ce-chrome></canvas>
      <svg class="graph-explorer-edges" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" data-ce-chrome>
        <g class="graph-explorer-edge-group"></g>
      </svg>
      <div class="graph-explorer-edge-labels" aria-hidden="true" data-ce-chrome></div>
      <div class="graph-explorer-world" data-ce-chrome></div>
      <div class="graph-explorer-signs" data-ce-chrome></div>
      <div class="graph-explorer-changes" aria-hidden="true" data-ce-chrome></div>
      <div class="graph-explorer-ring" hidden data-ce-chrome></div>
      <div class="graph-explorer-focus-ring" hidden aria-hidden="true" data-ce-chrome></div>
      <div class="graph-explorer-loading" data-ce-chrome>
        <span class="graph-explorer-loading-text"
          >${this.waitsForData ? 'Waiting for the graph...' : `Generating ${fmt(this.n)} nodes...`}</span
        ><progress></progress>
      </div>
      <pre class="graph-explorer-hud" aria-hidden="true" hidden data-ce-chrome></pre>
      <output class="graph-explorer-live" data-ce-chrome></output>
      <span class="graph-explorer-probe" aria-hidden="true" data-ce-chrome></span>
      ${help}`;
    // the authored content (a fallback text for no script) stays; the chrome goes after it. Parsed as HTML: the <svg>
    // keeps its namespace and the HTML around it stays HTML (df$('<svg>...') would make everything SVG); the nodes go
    // in through df$
    const doc = new DOMParser().parseFromString(`<body>${chrome.html}</body>`, 'text/html');
    for (const node of Array.from(doc.body.children)) dfDollar(el).append(document.adoptNode(node));
    if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
    if (!el.hasAttribute('role')) dfDollar(el).attr('role', 'application');
    dfDollar(el).attr('aria-roledescription', 'graph');
    dfDollar(el).attr('aria-describedby', `${id}-help`);
    dfDollar(el).attr('aria-busy', 'true');
    dfDollar(el).attr('data-graph-status', 'loading');
    const $ = (sel: string) => dfDollar(el).children(sel).get(0) as any;
    this.canvas = $('.graph-explorer-canvas');
    this.svgG = dfDollar(el).find('.graph-explorer-edge-group').get(0);
    this.labelsEl = $('.graph-explorer-edge-labels');
    this.world = $('.graph-explorer-world');
    this.signs = $('.graph-explorer-signs');
    this.changesEl = $('.graph-explorer-changes');
    this.ring = $('.graph-explorer-ring');
    this.focusRing = $('.graph-explorer-focus-ring');
    this.loadingEl = $('.graph-explorer-loading');
    this.hud = $('.graph-explorer-hud');
    this.liveEl = $('.graph-explorer-live');
    this.probe = $('.graph-explorer-probe');
    this.help = $('.graph-explorer-help');
    this.bitmapCtx = this.canvas.getContext('bitmaprenderer');
    if (el.hasAttribute('data-hud')) this.hud.hidden = false;
  }

  // ---------------------------------------------------- the worker
  startWorker(): void {
    this.workerUrl = URL.createObjectURL(
      new Blob([`(${graphExplorerWorker.toString()})(self);`], { type: 'text/javascript' }),
    );
    this.worker = new Worker(this.workerUrl, { name: 'defuss-graph-explorer' });
    this.worker.onmessage = (ev: MessageEvent) => this.onWorker(ev.data);
    this.worker.onerror = (ev: ErrorEvent) => this.fail(ev.message || 'worker error');
    this.postRules();
    this.postLayers();
    if (!this.waitsForData) this.post({ t: 'init', n: this.n, seed: this.seed });
    this.t0 = performance.now();
  }
  /** a new ready promise: the first graph's view, or the next loaded one's while a load() is under way */
  armReady(): void {
    this.isReady = false;
    this.ready = new Promise<void>(
      (resolve) =>
        (this.resolveReady = () => {
          this.isReady = true;
          resolve();
        }),
    );
  }
  /** true from load() until the worker refused its graph or the new graph shows: the frames pause meanwhile */
  get reloading(): boolean {
    return this.swap || this.loads.size > 0;
  }
  /** a graph of the page's in place of the one shown: the typed arrays move to the worker (they are empty here
   *  afterwards, refused or not), packed labels and refs (GraphExplorerStrings) with them; true once it shows, false
   *  when the worker refused it (graph-explorer-error says why) or a later load superseded it */
  load(data: GraphExplorerData): Promise<boolean> {
    const transfer = new Set<ArrayBuffer>();
    const move = (v: unknown) => {
      if (ArrayBuffer.isView(v) && v.buffer instanceof ArrayBuffer) transfer.add(v.buffer);
    };
    for (const part of [data?.clusters, data?.nodes, data?.edges])
      for (const v of Object.values(part ?? {}))
        if (v && typeof v === 'object' && !Array.isArray(v) && !ArrayBuffer.isView(v)) Object.values(v).forEach(move);
        else move(v);
    const req = ++this.loadSeq;
    return new Promise<boolean>((resolve) => {
      this.loads.set(req, resolve);
      if (this.view && this.isReady) this.armReady();
      dfDollar(this.el).attr('aria-busy', 'true');
      try {
        this.worker.postMessage({ t: 'load', data, req }, [...transfer]);
      } catch (err) {
        this.refused(req, `Invalid graph data: ${err instanceof Error ? err.message : err}`);
      }
    });
  }
  /** the worker refused a graph: the one shown stays (without one, the explorer shows the error) */
  refused(req: number, message: string): void {
    const resolve = this.loads.get(req);
    this.loads.delete(req);
    if (this.view) {
      this.fail(message, true);
      if (!this.reloading) {
        dfDollar(this.el).attr('aria-busy', null);
        this.resolveReady();
        this.requestTick();
      }
    } else this.fail(message);
    resolve?.(false);
  }
  /** the worker installed a loaded graph: its top view is asked for; the one shown stays until it comes (onView) */
  installed(m: any): void {
    const resolve = this.loads.get(m.req);
    this.loads.delete(m.req);
    (this.landing ??= []).push(resolve);
    this.loaded = true;
    this.n = m.stats.nodes;
    this.views.clear();
    this.swap = true;
  }
  /** everything the graph shown before left: its views and answers, the selection, the updates, the search, Live
   *  mode; then its top view shows (the state lands at the top, nothing selected) */
  land(m: any): void {
    const picked = this.selected.size > 0 || !!this.edge;
    this.swap = false;
    this.gen++;
    this.stopFlight();
    this.diving = null;
    this.upping = false;
    this.requests.clear();
    this.rowCache.clear();
    this.dataRev.clear();
    this.selected = new Set();
    this.edge = null;
    this.bitmapCam = null;
    this.sent = null;
    this.inflight = 0;
    this.pendingBitmap?.bitmap.close();
    this.pendingBitmap = null;
    if (this.expanded) this.collapseDetails(false);
    this.updates = [];
    this.changes.clear();
    for (const dot of this.changeDots.values()) dot.remove();
    this.changeDots.clear();
    this.results = [];
    this.activeResult = -1;
    for (const outlet of this.outlets('search')) {
      const { input, list } = this.searchBox(outlet);
      input.value = '';
      dfDollar(input).attr('placeholder', `Search ${fmt(this.n)} nodes ( / )`);
      morph(list, []);
    }
    this.closeResults();
    // the outline's filter was for the old graph's names: the new top shows whole
    for (const outlet of this.outlets('outline'))
      for (const filter of dfDollar(outlet).find('.graph-explorer-outline-filter').toArray() as HTMLInputElement[])
        filter.value = '';
    // Live mode belongs to a generated graph: its switch goes
    this.simulating = false;
    for (const b of boundOf(this.el, '[data-graph-explorer-action="live"]')) {
      dfDollar(b).attr('aria-pressed', 'false');
      b.hidden = true;
    }
    this.renderUpdates();
    this.setView(m);
    this.fit(false);
    if (picked)
      this.el.dispatchEvent(
        new CustomEvent<GraphExplorerSelectDetail>('graph-explorer-select', {
          detail: { selected: [], edge: null },
          bubbles: true,
        }),
      );
    // the last load installed is the graph that shows; the loads it superseded did not
    const landing = this.landing.splice(0);
    landing.forEach((resolve, k) => resolve?.(k === landing.length - 1));
  }
  post(m: Record<string, unknown>, transfer?: Transferable[]): void {
    if (!this.destroyed) this.worker.postMessage(m, transfer || []);
  }
  /** a failure: the error event, and (unless the graph shown stays) the error in place of the graph */
  fail(message: string, keep = false): void {
    if (!keep) {
      dfDollar(this.el).attr('data-graph-status', 'error');
      dfDollar(this.el).attr('aria-busy', null);
      dfDollar(this.loadingEl)
        .find('.graph-explorer-loading-text')
        .text(`The graph could not be built: ${message.split('\n')[0]}`);
    }
    // the worker or a renderer failed, or load() was given data the worker refused (the graph shown stays)
    this.el.dispatchEvent(
      new CustomEvent<GraphExplorerErrorDetail>('graph-explorer-error', { detail: { message }, bubbles: true }),
    );
  }

  onWorker(m: any): void {
    switch (m.t) {
      case 'ready':
        this.genStats = m.stats;
        this.genMs = Math.round(performance.now() - this.t0);
        if (m.req) this.installed(m);
        this.postColors();
        this.post({ t: 'focus', id: m.root });
        break;
      case 'rejected':
        this.refused(m.req, String(m.message));
        break;
      case 'view':
        this.onView(m);
        break;
      case 'frame':
        this.onFrame(m);
        break;
      case 'search':
        this.onSearch(m);
        break;
      case 'details':
        this.resolve('details:' + m.id, m);
        break;
      case 'rows':
        this.resolve('rows:' + m.id, m);
        break;
      case 'subtree':
        this.resolve('subtree:' + m.id + ':' + m.levels, m.rows);
        break;
      case 'edge':
        this.resolve('edge:' + m.id, m);
        break;
      case 'path':
        this.resolve('path:' + m.id, m.path);
        break;
      case 'patch':
        this.onPatch(m);
        break;
      case 'updates':
        this.addUpdates(m.items);
        break;
      case 'error':
        this.fail(String(m.message));
        break;
    }
  }
  waitFor(key: string, send: () => void): Promise<any> {
    let w = this.waiters.get(key);
    if (!w) {
      w = {};
      w.promise = new Promise((r) => (w.resolve = r));
      this.waiters.set(key, w);
      send();
    }
    return w.promise;
  }
  resolve(key: string, value: unknown): void {
    const w = this.waiters.get(key);
    if (w) {
      this.waiters.delete(key);
      w.resolve(value);
    }
  }
  fetchView(id: string): Promise<any> {
    if (this.views.has(id)) return Promise.resolve(this.views.get(id));
    return this.waitFor('view:' + id, () => this.post({ t: 'focus', id }));
  }

  postRules(): void {
    const rules: GraphRule[] = [];
    for (const reg of [globalRegistry, this.registry])
      for (const p of reg.edge) {
        if (!this.shown.has(p.layer || 'relations') || !this.offers(p.layer || 'relations')) continue;
        for (const r of p.rules || [])
          rules.push({
            when: r.when || [],
            style: r.style || {},
            priority: (r.priority ?? 0) + (p._scoped ? 1000 : 0),
          });
      }
    this.post({ t: 'rules', rules });
  }
  onPluginsChanged(): void {
    this.renderUpdates();
    this.postRules();
    this.labelVer++;
    this.renderLayers();
    if (this.view) {
      this.assignRenderers();
      for (const s of this.slots.values()) s._key = '';
      this.applyTiers(this.tiers, true);
      this.renderPanel();
      this.refreshDecor(true);
    }
  }

  // ---------------------------------------------------- theme → the canvas palette
  postColors(): void {
    const probe = this.probe;
    const read = (v: string): string => {
      probe.style.color = '';
      probe.style.color = v;
      return getComputedStyle(probe).color;
    };
    const forced = !!globalThis.matchMedia?.('(forced-colors: active)').matches;
    const tok = (name: string, fallback: string): string => (forced ? read(fallback) : read(`var(${name})`));
    const palette: any = {
      paper: tok('--background', 'Canvas'),
      ink: tok('--foreground', 'CanvasText'),
      muted: tok('--muted-foreground', 'GrayText'),
      border: tok('--border', 'GrayText'),
      ring: tok('--ring', 'Highlight'),
      tones: {
        muted: tok('--muted-foreground', 'GrayText'),
        ink: tok('--foreground', 'CanvasText'),
        accent: tok('--chart-2', 'Highlight'),
        link: tok('--chart-4', 'LinkText'),
        ok: tok('--chart-3', 'CanvasText'),
        warn: tok('--chart-1', 'Mark'),
        danger: tok('--destructive', 'Highlight'),
      },
      cat: ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5'].map((v) => tok(v, 'CanvasText')),
      font: getComputedStyle(this.el).fontFamily || 'system-ui, sans-serif',
      dark:
        document.documentElement.classList.contains('dark') ||
        getComputedStyle(document.documentElement).colorScheme === 'dark',
    };
    for (const shift of [150, 210, 280])
      palette.cat.push(forced ? palette.ink : read(`oklch(from var(--chart-1) l c calc(h + ${shift}))`) || palette.ink);
    // the layers' colours: the chart colours, unless the theme's are one hue
    const mono = !forced && this.chartsMonochrome(palette.cat.slice(0, 5));
    if (mono !== this.monochrome) {
      this.monochrome = mono;
      this.renderLayers();
      if (this.view) {
        for (const s of this.slots.values()) s._key = '';
        this.applyTiers(this.tiers, true);
        this.refreshDecor(true);
      }
    } else this.renderLayers();
    // a calm line is the relations layer's colour (its SVG twins read --graph-explorer-relations), a chip or a card
    // has the nodes layer's
    const relations = this.colorOf('relations');
    this.el.style.setProperty('--graph-explorer-relations', relations);
    this.el.style.setProperty('--graph-explorer-nodes', this.colorOf('nodes'));
    if (!forced) palette.tones.muted = read(relations) || palette.tones.muted;
    this.palette = palette;
    this.post({ t: 'colors', palette });
  }
  /** true when the theme's chart colours are one hue (the default theme's are five blues): no two of the coloured
   *  ones are more than 40 degrees apart */
  chartsMonochrome(colors: string[]): boolean {
    const canvas = dfDollar('<canvas width="1" height="1"></canvas>').get(0) as HTMLCanvasElement;
    const g = canvas.getContext('2d', { willReadFrequently: true });
    if (!g) return false;
    const hues: number[] = [];
    for (const color of colors) {
      g.clearRect(0, 0, 1, 1);
      g.fillStyle = '#000';
      g.fillStyle = color;
      g.fillRect(0, 0, 1, 1);
      const [r, gr, b] = [...g.getImageData(0, 0, 1, 1).data].map((v) => v / 255);
      const max = Math.max(r, gr, b),
        min = Math.min(r, gr, b),
        d = max - min;
      if (d < 0.12) continue; // grey: no hue
      const h = max === r ? ((gr - b) / d) % 6 : max === gr ? (b - r) / d + 2 : (r - gr) / d + 4;
      hues.push((h * 60 + 360) % 360);
    }
    let spread = 0;
    for (const a of hues)
      for (const b of hues) spread = Math.max(spread, Math.min(Math.abs(a - b), 360 - Math.abs(a - b)));
    return spread < 40;
  }
  observeTheme(): void {
    const again = (): void => {
      if (this.genStats) this.postColors();
    };
    this.themeObserver = new MutationObserver(again);
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme'],
    });
    this.mediaQueries = globalThis.matchMedia
      ? ['(prefers-color-scheme: dark)', '(prefers-contrast: more)', '(forced-colors: active)'].map((q) =>
          globalThis.matchMedia(q),
        )
      : [];
    this.onMedia = again;
    for (const mq of this.mediaQueries) mq.addEventListener('change', again);
    // the docs' theme switcher swaps a stylesheet: its event, and any sheet that loads later
    this.onThemeEvent = () => requestAnimationFrame(again);
    document.addEventListener('defuss-theme-change', this.onThemeEvent);
    document.addEventListener('load', this.onThemeEvent, true);
  }

  // ---------------------------------------------------- views
  onView(m: any): void {
    const first = !this.views.has(m.id);
    this.views.set(m.id, m);
    m.byId = new Map(m.children.map((c) => [c.id, c.i]));
    m.edgeById = new Map(m.edges.map((e) => [m.children[e.a].id + '>' + m.children[e.b].id, e.k]));
    m.adj = m.children.map(() => []);
    m.edges.forEach((e) => {
      m.adj[e.a].push(e.k);
      m.adj[e.b].push(e.k);
    });
    for (const c of m.children) c.breakers = null;
    this.computeBreakerCounts(m);
    this.resolve('view:' + m.id, m);
    if (this.swap && m.id === 'c0') {
      this.land(m);
      this.loading = false;
      this.loadingEl.hidden = true;
      if (!this.reloading) dfDollar(this.el).attr('aria-busy', null);
      dfDollar(this.el).attr('data-graph-status', 'ready');
      this.resolveReady();
      this.requestTick();
    } else if (first && !this.view) {
      this.setView(m);
      this.fit(false);
      this.loading = false;
      this.loadingEl.hidden = true;
      dfDollar(this.el).attr('aria-busy', null);
      dfDollar(this.el).attr('data-graph-status', 'ready');
      this.resolveReady();
    }
  }
  computeBreakerCounts(m: any): void {
    if (m.leafView || this.loaded) return;
    for (const c of m.children) c.breakers = { open: 0, half: 0, cut: 0, total: 0 };
    for (const e of m.edges) {
      if (!e.breaker) continue;
      for (const end of [e.a, e.b]) {
        const b = m.children[end].breakers;
        b.open += e.breaker.open;
        b.half += e.breaker.half;
        b.cut += e.breaker.cut;
        b.total += e.breaker.members || 1;
      }
    }
  }
  setView(m: any): void {
    this.view = m;
    for (const s of this.slots.values()) {
      s.hidden = true;
      s._key = '';
      this.free.push(s);
    }
    this.slots.clear();
    this.tiers = null;
    this.hover = -1;
    this.kbd = -1;
    this.selected = new Set([...this.selected].filter((id) => m.byId.has(id)));
    if (this.edge && this.edgeIndex(this.edge) < 0) this.edge = null;
    for (const p of this.edgePaths.values()) {
      p.hit.remove();
      p.line.remove();
      p.head.remove();
      p.flash?.remove();
    }
    this.edgePaths.clear();
    this.assignRenderers();
    if (!this.updatesRendered) this.renderUpdates();
    this.renderLayers();
    this.renderCrumbs();
    this.renderOutline();
    this.renderPanel();
    this.refreshDecor(true);
    this.signKeys = '';
    morph(this.signs, []);
    this.closeRing();
    this.commitState();
    // the view moved to another cluster (null = the top)
    this.el.dispatchEvent(
      new CustomEvent<GraphExplorerFocusDetail>('graph-explorer-focus', {
        detail: { focus: m.id === 'c0' ? null : m.id, path: m.path },
        bubbles: true,
      }),
    );
    this.announce(`${m.path.map((p) => p.label).join(' › ')} · ${fmt(m.children.length)} nodes`);
    this.camDirty = true;
    this.requestTick();
  }
  nodeOf(i: number): GraphNode {
    return { ...this.view.children[i], depth: this.view.path.length - 1 };
  }
  /** a renderer's boxes for a node (sizes may be a function of the node) */
  sizesOf(r: any, node: GraphNode): GraphSizes {
    try {
      return (typeof r.sizes === 'function' ? r.sizes(node) : r.sizes) || {};
    } catch (err) {
      console.error('[graph-explorer] sizes of "' + r.name + '" failed', err);
      return {};
    }
  }
  /** each child's renderer (the nodes layer), the parts of the other layers shown and its boxes - the worker places
   *  the chips and cards by them; a node without either has no box (only its circle shows) */
  assignRenderers(): void {
    const m = this.view;
    const head = this.shown.has('nodes');
    const partLayers = this.layerDefs()
      .filter((l) => l.name !== 'nodes' && l.shown)
      .map((l) => l.name);
    m.renderers = m.children.map((c: GraphNode) => (head ? this.pick('node', c) : null));
    m.boxes = [];
    const sizes = new Float32Array(m.children.length * 4);
    m.children.forEach((_c: GraphNode, i: number) => {
      const node = this.nodeOf(i),
        r = m.renderers[i];
      const hs = r ? this.sizesOf(r, node) : {};
      const chip0 = hs.chip || [140, 26],
        card0 = hs.card || chip0;
      let [chipW, chipH] = r ? chip0 : [0, 0],
        [cardW, cardH] = r ? card0 : [0, 0];
      const chipParts: any[] = [],
        cardParts: any[] = [];
      for (const layer of partLayers) {
        const p = this.pickPart(layer, node);
        if (!p) continue;
        const ps = this.sizesOf(p, node);
        if (ps.chip) {
          chipW += ps.chip[0];
          chipH = Math.max(chipH, ps.chip[1]);
          chipParts.push(p);
        }
        if (ps.card) {
          cardW = Math.max(cardW, ps.card[0]);
          cardH += ps.card[1];
          cardParts.push(p);
        }
      }
      // the parts without their node: a bare box of them
      if (!r && chipParts.length) {
        chipW += 12;
        chipH = Math.max(chipH, 22);
      }
      if (!r && cardParts.length) {
        cardW = Math.max(cardW, 168);
        cardH += 14;
      }
      if (this.compact) {
        cardW = chipW;
        cardH = chipH;
      }
      m.boxes[i] = {
        chip: chipParts,
        card: this.compact ? chipParts : cardParts,
        chipSize: [chipW, chipH],
        cardSize: [cardW, cardH],
      };
      sizes.set([chipW, chipH, cardW, cardH], i * 4);
    });
    this.post({ t: 'sizes', id: m.id, sizes });
  }
  pick(kind: 'node' | 'detail', item: GraphNode): any {
    for (const reg of [this.registry, globalRegistry]) {
      let best = null,
        score = -Infinity;
      for (const p of reg[kind]) {
        if (kind === 'node' && p.layer) continue; // a part, not the node
        const s = p.match(item);
        if (s === false || s == null) continue;
        if (s > score || (s === score && p._order > best._order)) {
          best = p;
          score = s;
        }
      }
      if (best) return best;
    }
    return null;
  }
  /** the renderer of a layer's part for a node (the element's plugins first, the highest score wins) */
  pickPart(layer: string, item: GraphNode): any {
    for (const reg of [this.registry, globalRegistry]) {
      let best = null,
        score = -Infinity;
      for (const p of reg.node) {
        if (p.layer !== layer) continue;
        let s;
        try {
          s = p.match(item);
        } catch (err) {
          console.error(err);
          s = false;
        }
        if (s === false || s == null) continue;
        if (s > score || (s === score && p._order > best._order)) {
          best = p;
          score = s;
        }
      }
      if (best) return best;
    }
    return null;
  }

  // ---------------------------------------------------- layers
  /** every layer the switch offers: the built-in ones, then the plugins' in the order they came */
  layerDefs(): GraphLayer[] {
    const out: Omit<GraphLayer, 'shown'>[] = BUILTIN_LAYERS.filter((l) => this.offers(l.name)).map((l) => ({
      ...l,
      color: '',
    }));
    const seen = new Set(out.map((l) => l.name));
    const plugins = [...globalRegistry.node, ...globalRegistry.edge, ...this.registry.node, ...this.registry.edge];
    for (const p of plugins.sort((a, b) => a._order - b._order)) {
      if (!p.layer || seen.has(p.layer) || !this.offers(p.layer)) continue;
      seen.add(p.layer);
      out.push({
        name: p.layer,
        label: p.layerLabel || p.layer,
        icon: p.layerIcon || 'layers',
        color: p.layerColor || '',
        base: false,
      });
    }
    return out.map((l, k) => ({ ...l, color: l.color || this.layerColor(k), shown: this.shown.has(l.name) }));
  }
  /** whether the graph has a layer: Health (the breakers) is a generated graph's only */
  offers(layer: string): boolean {
    return !(this.loaded && layer === 'health');
  }
  /** the k-th layer's colour: the theme's chart colours - or, when they are one hue (the default theme's five blues),
   *  chart-1 turned around the hue circle, so every layer keeps a colour of its own */
  layerColor(k: number): string {
    if (!this.monochrome && k < 5) return `var(--chart-${k + 1})`;
    return `oklch(from var(--chart-1) 0.66 max(c, 0.15) calc(h + ${(k * 72 + (k >= 5 ? 36 : 0)) % 360}))`;
  }
  /** a layer's colour by name */
  colorOf(layer: string): string {
    return this.layerColors.get(layer) || 'var(--muted-foreground)';
  }
  renderLayers(): void {
    const defs = this.layerDefs();
    this.layerColors = new Map(defs.map((l) => [l.name, l.color]));
    const sig = defs.map((l) => l.name + '=' + l.color + '=' + l.shown).join('|') + '|' + this.compact;
    const first = Math.max(
      0,
      defs.findIndex((l) => l.shown),
    );
    for (const outlet of this.outlets('layers')) {
      const box = outletChrome(
        outlet,
        'layers',
        () => dfDollar('<div class="graph-explorer-layers" data-ce-chrome></div>').get(0) as HTMLElement,
      );
      if (box._sig === sig) continue;
      box._sig = sig;
      // a Toggle Group of the layers, each with its colour as an Indicator dot; Compact after a Separator
      morph(
        box,
        html`<div
            class="toggle-group"
            role="group"
            aria-label="Layers"
            data-type="multiple"
            data-size="sm"
            data-spacing
          >
            ${defs.map(
              (l, k) =>
                html`<button
                  type="button"
                  class="toggle graph-explorer-layer"
                  key="${l.name}"
                  data-graph-explorer-layer="${l.name}"
                  aria-pressed="${l.shown ? 'true' : 'false'}"
                  tabindex="${k === first ? '0' : '-1'}"
                  style="--graph-explorer-layer: ${l.color}"
                  title="${l.label}: ${l.shown ? 'shown' : 'hidden'}${k < 9 ? ` (${k + 1})` : ''}"
                >
                  <span class="indicator-dot" aria-hidden="true"></span>${icon(l.icon)}<span
                    class="graph-explorer-layer-label"
                    >${l.label}</span
                  >
                </button>`,
            )}
          </div>
          <div class="separator" data-orientation="vertical" role="separator"></div>
          <button
            type="button"
            class="toggle graph-explorer-compact"
            data-size="sm"
            data-graph-explorer-compact
            aria-pressed="${this.compact ? 'true' : 'false'}"
            title="Compact: every node as a one-line chip"
          >
            ${icon('rows-3')}<span class="graph-explorer-layer-label">Compact</span>
          </button>`,
      );
    }
  }
  /** show these layers (unknown names are kept for a plugin that registers later); `user` commits it as a change
   *  the user made */
  setLayers(names: string[], user = true): void {
    const next = new Set(layerList(names));
    if (sameLayers([...next], [...this.shown])) return;
    this.shown = next;
    this.layersChanged(user);
  }
  /** show or hide one layer */
  toggleLayer(name: string): void {
    const next = new Set<string>(this.shown);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    this.setLayers([...next]);
    const l = this.layerDefs().find((x) => x.name === name);
    this.announce(`${l?.label ?? name}: ${this.shown.has(name) ? 'shown' : 'hidden'}`);
  }
  /** every node as a one-line chip, or back */
  setCompact(on: boolean, user = true): void {
    if (this.compact === !!on) return;
    this.compact = !!on;
    this.layersChanged(user);
    this.announce(`Compact ${this.compact ? 'on' : 'off'}`);
  }
  /** the graph after a layer or Compact changed: the worker's lines and names, the boxes, the labels, the switch */
  layersChanged(user: boolean): void {
    this.renderLayers();
    this.postLayers();
    this.postRules();
    this.labelVer++;
    this.signKeys = '';
    if (this.view) {
      this.assignRenderers();
      for (const s of this.slots.values()) s._key = '';
      this.applyTiers(this.tiers, true);
      this.refreshDecor(true);
      this.camChanged();
    }
    this.renderUpdates();
    if (user) this.commitState();
    // a layer was shown or hidden, or Compact switched
    this.el.dispatchEvent(
      new CustomEvent<GraphExplorerLayersDetail>('graph-explorer-layers', {
        detail: { layers: [...this.shown], compact: this.compact },
        bubbles: true,
      }),
    );
  }
  /** what the worker draws itself: the lines (relations) and the names beside small nodes (nodes) */
  postLayers(): void {
    this.post({ t: 'layers', nodes: this.shown.has('nodes'), relations: this.shown.has('relations') });
  }

  // ---------------------------------------------------- the camera loop
  requestTick(): void {
    if (!this.raf && !this.destroyed) this.raf = requestAnimationFrame((t) => this.tick(t));
  }
  size(): void {
    const r = this.el.getBoundingClientRect();
    this.w = Math.max(1, r.width);
    this.h = Math.max(1, r.height);
    this.vmin = Math.min(this.w, this.h);
  }
  tick(now: number): void {
    this.raf = 0;
    // a load() under way: the graph shown holds still until the new one shows (or the worker refuses it)
    if (!this.view || this.destroyed || this.reloading) return;
    if (!this.w) this.size();
    if (this.flight) this.stepFlight(now);
    else if (!this.navigating) this.autoDepth();
    if (this.pendingBitmap) {
      const f = this.pendingBitmap;
      this.pendingBitmap = null;
      this.bitmapCtx.transferFromImageBitmap(f.bitmap);
      this.bitmapCam = f.cam;
      this.camDirty = true;
      this.stats.frames++;
    }
    if (this.camDirty) {
      this.camDirty = false;
      this.project();
    }
    this.maybeSend();
    if (now - this.stats.fpsT > 500) this.sampleHud(now);
    if (this.flight || this.pendingBitmap || this.inflight) this.requestTick();
    else if (!this.hud.hidden) {
      clearTimeout(this.hudT);
      this.hudT = setTimeout(() => this.sampleHud(performance.now()), 600);
    }
  }
  // the HUD samples while frames flow, and once after the loop goes idle, so it never shows stale numbers
  sampleHud(now: number): void {
    this.stats.fps = Math.round((this.stats.frames * 1000) / Math.max(1, now - this.stats.fpsT));
    this.stats.frames = 0;
    this.stats.fpsT = now;
    if (!this.hud.hidden && this.view && !this.destroyed) this.renderHud();
  }
  camChanged(): void {
    this.camDirty = true;
    clearTimeout(this.restTimer);
    this.restTimer = setTimeout(() => {
      if (!this.view || this.destroyed) return;
      // the camera came to rest
      this.el.dispatchEvent(
        new CustomEvent<GraphExplorerViewDetail>('graph-explorer-view', {
          detail: { focus: this.view.id === 'c0' ? null : this.view.id, camera: { ...this.cam } },
          bubbles: true,
        }),
      );
    }, 250);
    this.requestTick();
  }
  maybeSend(): void {
    const c = this.cam;
    const sel = [...this.selected].map((id) => this.view.byId.get(id)).filter((i) => i !== undefined);
    const ends = this.edgeEnds();
    const key = [
      this.view.cid,
      c.cx.toFixed(5),
      c.cy.toFixed(5),
      c.z.toFixed(3),
      this.w,
      this.h,
      this.hover,
      this.kbd,
      sel.join(','),
      ends.join(','),
    ].join('|');
    const now = performance.now();
    // send the same camera again when its frame never came back (superseded inside the worker)
    if (key === this.sent && !(this.inflight && now - this.sentAt > 400)) return;
    if (this.inflight && now - this.sentAt < 120) {
      this.requestTick();
      return;
    }
    this.sent = key;
    this.sentAt = now;
    this.inflight = ++this.camSeq;
    this.post({
      t: 'camera',
      id: this.camSeq,
      view: this.view.cid,
      cx: c.cx,
      cy: c.cy,
      z: c.z,
      w: this.w,
      h: this.h,
      dpr: Math.min(2, globalThis.devicePixelRatio || 1),
      hover: this.hover,
      kbd: this.kbd,
      sel,
      edge: ends.length ? ends : null,
    });
  }
  onFrame(m: any): void {
    if (m.camId >= this.inflight) this.inflight = 0;
    this.stats.worker = m.stats;
    this.stats.lag = this.camSeq - m.camId;
    if (!this.view || m.view !== this.view.cid || this.destroyed || this.reloading) {
      m.bitmap.close();
      return;
    }
    if (this.pendingBitmap) this.pendingBitmap.bitmap.close();
    this.pendingBitmap = { bitmap: m.bitmap, cam: m.cam, camId: m.camId };
    this.dotLabels = m.dotLabels || [];
    this.applyTiers(m.tiers);
    this.requestTick();
  }

  // ---------------------------------------------------- projection (every frame)
  toScreen(x: number, y: number): [number, number] {
    const c = this.cam;
    return [(x - c.cx) * c.z + this.w / 2, (y - c.cy) * c.z + this.h / 2];
  }
  project(): void {
    const m = this.view,
      c = this.cam,
      isCluster = !m.leafView;
    if (this.bitmapCam && this.bitmapCam.w === this.w && this.bitmapCam.h === this.h) {
      const b = this.bitmapCam,
        k = c.z / b.z;
      this.canvas.style.transform = `translate(${((b.cx - c.cx) * c.z).toFixed(2)}px, ${((b.cy - c.cy) * c.z).toFixed(2)}px) scale(${k.toFixed(5)})`;
    }
    for (const [i, s] of this.slots) {
      const n = m.children[i];
      const [sx, sy] = this.toScreen(n.x, n.y);
      const [x, y] = anchorBox(isCluster, s._tier, sx, sy, n.r * c.z, s._w, s._h);
      s._x = Math.round(x);
      s._y = Math.round(y);
      s.style.translate = `${s._x}px ${s._y}px`;
    }
    this.projectEdges();
    this.projectChanges();
    this.projectDecor();
    this.projectSigns();
    this.projectFocusRing();
    if (!this.ring.hidden) this.projectRing();
  }

  // ---------------------------------------------------- tiers → pooled slots (morphed only on change)
  applyTiers(tiers: Int8Array | null, force = false): void {
    if (!tiers || !this.view) return;
    this.tiers = tiers;
    const m = this.view,
      jobs: SafeHtml[] = [],
      slotsForJobs: HTMLElement[] = [];
    // a tier whose box holds nothing (the nodes layer hidden, no part at that tier) is no slot
    const empty = (i: number): boolean => {
      const b = m.boxes?.[i];
      return !b || (!m.renderers[i] && !(tiers[i] === 2 ? b.card : b.chip).length);
    };
    for (const [i, s] of this.slots) {
      if (tiers[i] < 1 || empty(i)) {
        s.hidden = true;
        s._key = '';
        this.slots.delete(i);
        this.free.push(s);
      }
    }
    for (let i = 0; i < tiers.length; i++) {
      if (tiers[i] < 1 || empty(i)) continue;
      let s = this.slots.get(i);
      if (!s) {
        s = this.free.pop();
        if (!s) {
          s = dfDollar('<div class="graph-explorer-node"></div>').get(0);
          dfDollar(this.world).append(s);
        }
        s.hidden = false;
        s._key = '';
        this.slots.set(i, s);
      }
      // Compact draws every node as its chip
      const tier = tiers[i] === 2 && !this.compact ? 'card' : 'chip';
      const node = this.nodeOf(i),
        r = m.renderers[i],
        box = m.boxes[i],
        parts: any[] = tier === 'card' ? box.card : box.chip,
        ctx = this.ctxFor(node, tier, i);
      const keyOf = (x: any): string => {
        try {
          return x.key ? x.key(node, ctx) : '';
        } catch {
          return '';
        }
      };
      const key =
        (r ? r.name + ':' + keyOf(r) : '-') +
        '|' +
        parts.map((x) => x.name + ':' + keyOf(x)).join(',') +
        '|' +
        tier +
        '|' +
        (ctx.selected ? 1 : 0) +
        '|' +
        (ctx.expandable ? 1 : 0) +
        '|' +
        (this.dataRev.get(node.id) || 0);
      if (s._key === key && !force) continue;
      const [w, h] = tiers[i] === 2 ? box.cardSize : box.chipSize;
      if (s._node !== node.id) {
        s._node = node.id;
        dfDollar(s).attr('data-node', node.id);
      }
      if (s._tier !== tiers[i]) {
        s._tier = tiers[i];
        dfDollar(s).attr('data-tier', tier);
      }
      s._w = w;
      s._h = h;
      s.style.width = w + 'px';
      s.style.height = h + 'px';
      dfDollar(s).attr('data-selected', ctx.selected ? '' : null);
      dfDollar(s).attr('data-kind', node.kind);
      s._key = key;
      try {
        jobs.push(this.composeNode(node, tier, ctx, r, parts));
        slotsForJobs.push(s);
      } catch (err) {
        console.error('[graph-explorer] renderer "' + (r?.name ?? 'parts') + '" failed', err);
      }
    }
    if (jobs.length) {
      let lists: any[][];
      try {
        lists = vnodesBatch(jobs);
      } catch (err) {
        console.error(err);
        lists = jobs.map(() => []);
      }
      lists.forEach((list, k) => morphRuntime.morph(slotsForJobs[k], list));
    }
    for (const [i, s] of this.slots) dfDollar(s).attr('data-kbd', i === this.kbd ? '' : null);
    this.el.toggleAttribute('data-dim', this.hover >= 0 || this.selected.size > 0 || !!this.edge);
    for (const [i, s] of this.slots) s.toggleAttribute('data-hl', this.isHighlighted(i));
    this.refreshDecor(false);
    this.camDirty = true;
    this.requestTick();
  }
  /** a node's markup at a tier: its renderer's with the shown layers' parts inside (or after it), or the parts
   *  alone when the nodes layer is hidden */
  composeNode(node: GraphNode, tier: 'chip' | 'card', ctx: GraphRenderContext, r: any, parts: any[]): SafeHtml {
    const tag = tier === 'chip' ? 'span' : 'div';
    const drawn: SafeHtml[] = [];
    for (const p of parts) {
      let out: SafeHtml;
      try {
        out = p.render(node, { ...ctx, parts: html`` });
      } catch (err) {
        console.error('[graph-explorer] part "' + p.name + '" failed', err);
        continue;
      }
      if (!isSafe(out) || !out.html.trim()) continue;
      const layer = p.layer as string;
      drawn.push(
        tag === 'span'
          ? html`<span
              class="graph-explorer-part"
              data-layer="${layer}"
              style="--graph-explorer-layer: ${this.colorOf(layer)}"
              >${out}</span
            >`
          : html`<div
              class="graph-explorer-part"
              data-layer="${layer}"
              style="--graph-explorer-layer: ${this.colorOf(layer)}"
            >
              ${out}
            </div>`,
      );
    }
    const joined = html`${drawn}`;
    if (!r)
      return html`<div class="graph-explorer-parts-only" data-tier="${tier}" data-kind="${node.kind}">${joined}</div>`;
    const out = r.render(node, { ...ctx, parts: joined });
    if (!drawn.length || !isSafe(out) || out.html.includes('graph-explorer-part"')) return out;
    return html`${out}${joined}`; // a renderer that leaves the parts out: they follow its markup
  }
  isHighlighted(i: number): boolean {
    const ends = this.edgeEnds();
    if (ends.length) return ends.includes(i) || i === this.hover;
    const foci = [...this.selected].map((id) => this.view.byId.get(id)).filter((x) => x !== undefined);
    if (this.hover >= 0) foci.push(this.hover);
    if (!foci.length) return true;
    if (foci.includes(i)) return true;
    return foci.some((f) =>
      this.view.adj[f].some((k) => {
        const e = this.view.edges[k];
        return e.a === i || e.b === i;
      }),
    );
  }
  ctxFor(node: GraphNode, tier: GraphRenderContext['tier'], i: number): GraphRenderContext {
    return {
      tier,
      selected: this.selected.has(node.id),
      highlighted: i === this.hover,
      focused: i === this.kbd,
      depth: node.depth,
      zoom: this.cam.z,
      html,
      icon,
      expanded: tier === 'detail' && this.expanded,
      layers: [...this.shown],
      compact: this.compact,
      synthetic: !this.loaded,
      parts: html``,
      action: (name) => String(name),
      edgeLabel: (e, t = 'label') => this.edgeLabelHtml(e, t),
      fetchView: (id) => this.fetchView(id),
      fetchRows: (id) => this.fetchRows(id),
      expandable: tier === 'relations' ? false : this.expandableNode(node),
      request: (key, load) => {
        const r = this.requests.get(key);
        if (r && !r.stale) return r.done ? r.value : r.prev;
        // a first load, or a stale answer's successor: the stale answer stays shown until the new one arrives -
        // a loading state between two answers made the details flicker on every Live mode update
        const entry = {
          done: false,
          value: undefined,
          prev: r ? (r.done ? r.value : r.prev) : undefined,
          stale: false,
        };
        this.requests.set(key, entry);
        Promise.resolve()
          .then(load)
          .then(
            (value) => {
              entry.done = true;
              entry.value = value;
              this.dataRev.set(node.id, (this.dataRev.get(node.id) || 0) + 1);
              this.applyTiers(this.tiers);
              this.renderPanel();
            },
            (err) => {
              entry.done = true;
              entry.value = entry.prev;
              console.error(err);
            },
          );
        return entry.prev;
      },
      fetchDetails: (id) => this.waitFor('details:' + id, () => this.post({ t: 'details', id })),
      fetchEdge: (id) => {
        const [a, b] = String(id).split('>');
        return this.waitFor('edge:' + a + '>' + b, () => this.post({ t: 'edge', a, b }));
      },
      island: (key, content, mount) => {
        if (mount) this.islandMounts.set(key, mount);
        else this.islandMounts.delete(key);
        return island(key, content);
      },
    };
  }
  /** every row behind a node or a link, from the worker; the last two answers are kept */
  /** a node's descendants down to `levels` levels (the node included) - from the worker, which owns the graph */
  fetchSubtree(id: string, levels: number): Promise<GraphTreeRow[]> {
    return this.waitFor('subtree:' + id + ':' + levels, () => this.post({ t: 'subtree', id, levels }));
  }
  /** the worker's search as data: a newer search (here or in a search outlet) ends this one with what it found */
  find(
    query: string,
    onPartial?: (results: GraphSearchResult[], scanned: number) => void,
  ): Promise<GraphSearchResult[]> {
    this.finder?.resolve(this.finder.results);
    this.searchSeq++;
    const seq = this.searchSeq;
    return new Promise((resolve) => {
      this.finder = { seq, resolve, onPartial, results: [] };
      this.post({ t: 'search', q: query, seq });
    });
  }
  fetchRows(id: string): Promise<GraphRows> {
    const hit = this.rowCache.get(id);
    if (hit) {
      this.rowCache.delete(id);
      this.rowCache.set(id, hit);
      return hit;
    }
    const p = this.waitFor('rows:' + id, () => this.post({ t: 'rows', id }));
    this.rowCache.set(id, p);
    while (this.rowCache.size > 2) this.rowCache.delete(this.rowCache.keys().next().value);
    return p;
  }
  /** whether a node has a page to expand to: a details outlet to show it, and a detail renderer that offers one */
  expandableNode(node: GraphNode | undefined): boolean {
    if (!node || !this.outlets('details').length) return false;
    const r = this.pick('detail', node);
    return !!r && (typeof r.page !== 'function' || r.page(node) !== false);
  }
  /** whether the selected link has a page to expand to */
  expandableEdge(item: GraphEdgeItem | null = this.edgeItem()): boolean {
    if (!item || !this.outlets('details').length) return false;
    const r = this.pickEdgeDetail(item);
    return !!r && (typeof r.page !== 'function' || r.page(item) !== false);
  }

  // ---------------------------------------------------- promoted edges (SVG)
  promotedEdges(): Set<number> {
    const m = this.view,
      out = new Set<number>();
    // a changed link flashes while its layer shows, the relations layer or not
    for (const [target, ch] of this.changes) {
      if (ch.u.kind !== 'edge' || !this.shown.has(ch.u.layer)) continue;
      const k = this.edgeIndex(target);
      if (k >= 0) out.add(k);
    }
    if (!this.shown.has('relations')) return out; // the relations layer draws every line
    const foci = [...this.selected].map((id) => m.byId.get(id)).filter((x) => x !== undefined);
    if (this.hover >= 0) foci.push(this.hover);
    if (this.kbd >= 0) foci.push(this.kbd);
    const picked = this.edgeIndex(this.edge);
    if (picked >= 0) out.add(picked);
    for (const f of foci)
      for (const k of m.adj[f]) {
        if (out.size > 80) break;
        out.add(k);
      }
    return out;
  }
  projectEdges(): void {
    const m = this.view,
      z = this.cam.z,
      want = this.promotedEdges();
    for (const [k, p] of this.edgePaths)
      if (!want.has(k)) {
        p.hit.remove();
        p.line.remove();
        p.head.remove();
        p.flash?.remove();
        this.edgePaths.delete(k);
      }
    const picked = this.edgeIndex(this.edge);
    // without the relations layer a link shows only while it flashes
    const lines = this.shown.has('relations');
    const NS = 'http://www.w3.org/2000/svg';
    for (const k of want) {
      const e = m.edges[k],
        a = m.children[e.a],
        b = m.children[e.b];
      const [ax, ay] = this.toScreen(a.x, a.y),
        [bx, by] = this.toScreen(b.x, b.y);
      const st = e.style;
      const w =
        e.kind === 'agg' ? Math.min(5, st.width * (1 + Math.min(1.6, Math.log10(e.count + e.count2) * 0.7))) : st.width;
      const cl = !m.leafView;
      const g = edgePath(ax, ay, drawR(cl, a.r * z), bx, by, drawR(cl, b.r * z), st, e.bidir, w);
      let p = this.edgePaths.get(k);
      if (!p) {
        p = {
          hit: document.createElementNS(NS, 'path'),
          line: document.createElementNS(NS, 'path'),
          head: document.createElementNS(NS, 'path'),
        };
        // a click on a link selects it: the hit path is wide and transparent, under the drawn line
        p.hit.setAttribute('class', 'graph-explorer-edge-hit');
        p.line.setAttribute('class', 'graph-explorer-edge');
        p.head.setAttribute('class', 'graph-explorer-edge-head');
        this.svgG.append(p.hit, p.line, p.head);
        this.edgePaths.set(k, p);
      }
      const id = this.edgeId(k);
      if (p.id !== id) {
        p.id = id;
        p.hit.setAttribute('data-graph-explorer-edge', id);
      }
      const on = k === picked;
      if (p.on !== on) {
        p.on = on;
        p.line.toggleAttribute('data-selected', on);
        p.head.toggleAttribute('data-selected', on);
      }
      const tone = TONES.includes(st.tone) ? st.tone : 'muted';
      if (p.tone !== tone) {
        p.tone = tone;
        p.line.setAttribute('data-tone', tone);
        p.head.setAttribute('data-tone', tone);
      }
      const flow = st.flow && e.traffic ? '1' : null,
        pulse = st.pulse ? '1' : null;
      if (p.flow !== flow) {
        p.flow = flow;
        p.line.toggleAttribute('data-flow', !!flow);
      }
      if (p.pulse !== pulse) {
        p.pulse = pulse;
        p.line.toggleAttribute('data-pulse', !!pulse);
      }
      const dash = !flow && st.dash ? st.dash.join(' ') : '';
      if (p.dash !== dash) {
        p.dash = dash;
        if (dash) p.line.setAttribute('stroke-dasharray', dash);
        else p.line.removeAttribute('stroke-dasharray');
      }
      p.line.setAttribute('stroke-width', (w + 0.75).toFixed(2));
      p.line.setAttribute('d', g ? g.d : '');
      p.hit.setAttribute('d', g ? g.d : '');
      p.head.setAttribute('d', g ? g.head : '');
      p.mid = g ? g.mid : null;
      if (p.lines !== lines) {
        p.lines = lines;
        p.line.style.visibility = p.head.style.visibility = lines ? '' : 'hidden';
      }
      // a change: the line flashes in its layer's colour and fades (a new change starts it again)
      const ch = this.changes.get(id);
      const flash = ch && ch.u.kind === 'edge' && this.shown.has(ch.u.layer) ? ch : null;
      if (flash && p.flashAt !== flash.at) {
        p.flash?.remove();
        p.flash = document.createElementNS(NS, 'path');
        p.flash.setAttribute('class', 'graph-explorer-edge-flash');
        p.flash.setAttribute('data-layer', flash.u.layer);
        p.flash.style.setProperty('--graph-explorer-layer', this.colorOf(flash.u.layer));
        p.flash.style.animationDuration = `${CHANGE_MS}ms`;
        p.line.after(p.flash);
        p.flashAt = flash.at;
      } else if (!flash && p.flash) {
        p.flash.remove();
        p.flash = null;
        p.flashAt = null;
      }
      if (p.flash) {
        p.flash.setAttribute('d', g ? g.d : '');
        p.flash.setAttribute('stroke-width', (w + 3).toFixed(2));
      }
    }
  }

  // ---------------------------------------------------- edge labels and icons (per zoom level)
  // Every refresh: the candidates are the edges whose visible length passes a renderer's smallest level and whose
  // renderer matches this hierarchy depth; ranked (the selection first, then the renderer's priority), each takes the
  // richest tier its length, the tier budget and the free space allow. Hosts are pooled per edge; a host's content is
  // morphed only when its markup changed.
  /** the label renderers - on the graph only the shown layers' (a plugin without a layer: labels) */
  labelPlugins(graph = false): any[] {
    return this.edgePlugins().filter(
      (p) => p.label && (!graph || (this.shown.has(p.layer || 'labels') && this.offers(p.layer || 'labels'))),
    );
  }
  labelFor(e: any, ctx: GraphEdgeContext): any {
    const sig = e.breaker ? e.breaker.state + (e.breaker.openShare || 0) : '';
    if (e._lv !== this.labelVer || e._ls !== sig) {
      e._lv = this.labelVer;
      e._ls = sig;
      let best = null,
        score = -Infinity;
      for (const p of this.labelPlugins(true)) {
        const L = p.label;
        if (L.depths && !L.depths.includes(ctx.depth)) continue;
        let sc;
        try {
          sc = L.match(e, ctx);
        } catch (err) {
          console.error(err);
          sc = false;
        }
        if (sc === false || sc == null) continue;
        sc += p._scoped ? 1000 : 0;
        if (sc > score) {
          best = p;
          score = sc;
        }
      }
      e._lp = best;
    }
    return e._lp;
  }
  /** the SafeHtml of the best label renderer for an edge at a tier (the panels and tables use it too) */
  edgeLabelHtml(e: any, tier: GraphEdgeContext['tier']): SafeHtml {
    const depth = this.view ? this.view.path.length - 1 : 0;
    const ctx = this.edgeCtx(depth, tier);
    let best = null,
      score = -Infinity;
    for (const p of this.labelPlugins()) {
      let sc;
      try {
        sc = p.label.match(e, ctx);
      } catch {
        sc = false;
      }
      if (sc !== false && sc != null && sc + (p._scoped ? 1000 : 0) > score) {
        best = p;
        score = sc + (p._scoped ? 1000 : 0);
      }
    }
    if (!best) return html``;
    try {
      return best.label.render(e, ctx);
    } catch (err) {
      console.error(err);
      return html``;
    }
  }
  edgeCtx(depth: number, tier: GraphEdgeContext['tier']): GraphEdgeContext {
    return { tier, depth, zoom: this.cam.z, html, icon, view: this.view && this.view.id };
  }
  refreshDecor(reset: boolean): void {
    const m = this.view;
    if (reset || !m || !this.tiers) {
      for (const h of this.labelHosts.values()) {
        h.hidden = true;
        h._sig = '';
        this.labelPool.push(h);
      }
      this.labelHosts.clear();
      if (!m || !this.tiers) return;
    }
    const z = this.cam.z,
      depth = m.path.length - 1,
      W = this.w,
      H = this.h;
    const foci = new Set([...this.selected].map((id) => m.byId.get(id)).filter((x) => x !== undefined));
    for (const end of this.edgeEnds()) foci.add(end);
    if (this.hover >= 0) foci.add(this.hover);
    const picked = this.edgeIndex(this.edge);
    const isCluster = !m.leafView,
      cands: any[] = [];
    const ctx0 = this.edgeCtx(depth, 'icon');
    for (const e of m.edges) {
      const a = m.children[e.a],
        b = m.children[e.b];
      const [ax, ay] = this.toScreen(a.x, a.y),
        [bx, by] = this.toScreen(b.x, b.y);
      const len = Math.hypot(bx - ax, by - ay) - drawR(isCluster, a.r * z) - drawR(isCluster, b.r * z);
      if (len < 24) continue;
      const mx = (ax + bx) / 2,
        my = (ay + by) / 2;
      if (mx < -20 || mx > W + 20 || my < -20 || my > H + 20) continue;
      const p = this.labelFor(e, ctx0);
      if (!p || len < p.label.levels.icon) continue;
      const focus = foci.has(e.a) || foci.has(e.b);
      if (foci.size && !focus && (this.selected.size || this.edge)) continue; // with a selection, label its edges only
      let pr = 0;
      try {
        pr = p.label.priority ? +p.label.priority(e, ctx0) || 0 : 0;
      } catch {
        pr = 0;
      }
      cands.push({
        e,
        p,
        len,
        pr: pr + (e.k === picked ? 5000 : 0) + (focus ? 1000 : 0) + (p._scoped ? 0.5 : 0),
        ax,
        ay,
        bx,
        by,
      });
    }
    cands.sort((p, q) => q.pr - p.pr || q.len - p.len);
    // the collision space: the DOM nodes on screen, then every label placed
    const cell = 64,
      grid = new Map<number, number[][]>();
    const hit = (x: number, y: number, w: number, h: number): boolean => {
      for (let gx = Math.floor(x / cell); gx <= Math.floor((x + w) / cell); gx++)
        for (let gy = Math.floor(y / cell); gy <= Math.floor((y + h) / cell); gy++) {
          const l = grid.get(gx * 7919 + gy);
          if (!l) continue;
          for (const r of l)
            if (x < r[0] + r[2] + 2 && x + w + 2 > r[0] && y < r[1] + r[3] + 2 && y + h + 2 > r[1]) return true;
        }
      return false;
    };
    const put = (x: number, y: number, w: number, h: number): void => {
      const r = [x, y, w, h];
      for (let gx = Math.floor(x / cell); gx <= Math.floor((x + w) / cell); gx++)
        for (let gy = Math.floor(y / cell); gy <= Math.floor((y + h) / cell); gy++) {
          const k = gx * 7919 + gy;
          let l = grid.get(k);
          if (!l) grid.set(k, (l = []));
          l.push(r);
        }
    };
    for (const [i, sl] of this.slots) {
      const n = m.children[i],
        [sx, sy] = this.toScreen(n.x, n.y);
      const [x, y] = anchorBox(isCluster, sl._tier, sx, sy, n.r * z, sl._w, sl._h);
      put(x, y, sl._w, sl._h);
    }
    // the names the worker drew into the canvas beside small nodes
    for (const r of this.dotLabels) put(r[0], r[1], r[2], r[3]);
    const used: Record<string, number> = { icon: 0, label: 0, full: 0 },
      usedBy = new Map(),
      chosen: any[] = [];
    for (const c of cands) {
      if (chosen.length >= 200) break;
      const L = c.p.label;
      let mine = usedBy.get(c.p);
      if (!mine) usedBy.set(c.p, (mine = { icon: 0, label: 0, full: 0 }));
      for (let t = 2; t >= 0; t--) {
        const tier = LABEL_TIERS[t];
        if (c.len < L.levels[tier] || used[tier] >= LABEL_BUDGET[tier]) continue;
        if (L.budget && L.budget[tier] != null && mine[tier] >= L.budget[tier]) continue; // the renderer's own cap
        const [w, h] = L.sizes[tier];
        if (c.len < w * 0.9 + 8 && t > 0) continue; // the label must fit along the edge
        let placed = -1;
        for (const f of [0.5, 0.38, 0.62]) {
          const x = c.ax + (c.bx - c.ax) * f - w / 2,
            y = c.ay + (c.by - c.ay) * f - h / 2;
          if (!hit(x, y, w, h)) {
            put(x, y, w, h);
            placed = f;
            break;
          }
        }
        if (placed < 0) continue;
        used[tier]++;
        mine[tier]++;
        chosen.push({ c, tier, f: placed });
        break;
      }
    }
    // pooled hosts: reused per edge, their content morphed only when its markup changed
    const next = new Map(),
      jobs: SafeHtml[] = [],
      jobHosts: HTMLElement[] = [];
    for (const { c, tier, f } of chosen) {
      const e = c.e;
      let hst = this.labelHosts.get(e.k);
      if (!hst) {
        hst = this.labelPool.pop();
        if (!hst) {
          hst = dfDollar('<div class="graph-explorer-edge-label"></div>').get(0);
          dfDollar(this.labelsEl).append(hst);
        }
        hst._sig = '';
      }
      this.labelHosts.delete(e.k);
      next.set(e.k, hst);
      hst.hidden = false;
      hst._f = f;
      hst._k = e.k;
      // the picked link's mark follows the selection, which the label's markup does not depend on
      if (hst.hasAttribute('data-selected') !== (e.k === picked))
        dfDollar(hst).attr('data-selected', e.k === picked ? '' : null);
      let out: SafeHtml;
      try {
        out = c.p.label.render(e, {
          ...this.edgeCtx(depth, tier),
          source: m.children[e.a],
          target: m.children[e.b],
          selected: foci.has(e.a) || foci.has(e.b),
        });
      } catch (err) {
        console.error('[graph-explorer] edge label "' + c.p.name + '" failed', err);
        continue;
      }
      if (!isSafe(out)) continue;
      const sig = tier + '|' + out.html;
      if (hst._sig === sig) continue;
      hst._sig = sig;
      dfDollar(hst).attr('data-tier', tier);
      // the label is drawn in its layer's colour
      const layer = c.p.layer || 'labels';
      dfDollar(hst).attr('data-layer', layer);
      hst.style.setProperty('--graph-explorer-layer', this.colorOf(layer));
      dfDollar(hst).attr('data-edge', String(e.k));
      dfDollar(hst).attr('data-graph-explorer-edge', this.edgeId(e.k));
      jobs.push(out);
      jobHosts.push(hst);
    }
    for (const h of this.labelHosts.values()) {
      h.hidden = true;
      h._sig = '';
      this.labelPool.push(h);
    }
    this.labelHosts = next;
    if (jobs.length) {
      let lists: any[][];
      try {
        lists = vnodesBatch(jobs);
      } catch (err) {
        console.error(err);
        lists = jobs.map(() => []);
      }
      lists.forEach((list, k) => morphRuntime.morph(jobHosts[k], list));
    }
    this.camDirty = true;
  }
  edgePlugins(): any[] {
    return [...this.registry.edge, ...globalRegistry.edge].sort((a, b) => b._scoped - a._scoped || b._order - a._order);
  }
  projectDecor(): void {
    const m = this.view;
    if (!m) return;
    for (const [k, hst] of this.labelHosts) {
      const e = m.edges[k];
      if (!e) {
        hst.hidden = true;
        continue;
      }
      const a = m.children[e.a],
        b = m.children[e.b],
        f = hst._f;
      const [ax, ay] = this.toScreen(a.x, a.y),
        [bx, by] = this.toScreen(b.x, b.y);
      hst.style.translate = `${Math.round(ax + (bx - ax) * f)}px ${Math.round(ay + (by - ay) * f)}px`;
    }
  }

  // ---------------------------------------------------- signposts (relations off screen)
  projectSigns(): void {
    const m = this.view,
      list: any[] = [];
    const inset = 14,
      w = this.w,
      h = this.h;
    const offscreen = (sx: number, sy: number): boolean => sx < inset || sx > w - inset || sy < inset || sy > h - inset;
    // the signposts point along relations: hidden with them
    const rel = this.shown.has('relations');
    if (m.parent && rel)
      for (const ext of m.parent.external) {
        const [sx, sy] = this.toScreen(ext.x, ext.y);
        if (offscreen(sx, sy))
          list.push({
            key: 'x' + ext.id,
            sx,
            sy,
            label: ext.label,
            count: ext.out + ext.in,
            dir: ext.out && ext.in ? '↔' : ext.out ? '→' : '←',
            tone: ext.style.tone,
            goto: ext.id,
            ext: true,
          });
      }
    const sel = rel ? [...this.selected].map((id) => m.byId.get(id)).filter((x) => x !== undefined) : [];
    for (const f of sel)
      for (const k of m.adj[f]) {
        const e = m.edges[k],
          j = e.a === f ? e.b : e.a,
          n = m.children[j];
        const [sx, sy] = this.toScreen(n.x, n.y);
        if (offscreen(sx, sy))
          list.push({
            key: 'n' + n.id,
            sx,
            sy,
            label: n.label,
            count: e.count + e.count2,
            dir: e.a === f ? '→' : '←',
            tone: e.style.tone,
            goto: n.id,
            ext: false,
          });
      }
    list.sort((a, b) => b.count - a.count);
    const top = list.slice(0, 10);
    const keys = top.map((s) => s.key + s.tone).join(',');
    if (keys !== this.signKeys) {
      this.signKeys = keys;
      morph(
        this.signs,
        html`${top.map(
          (s) =>
            html`<button
              type="button"
              class="graph-explorer-sign"
              key="${s.key}"
              data-graph-explorer-goto="${s.goto}"
              data-ext="${s.ext ? '1' : '0'}"
              data-tone="${s.tone}"
              title="Go to ${s.label}"
            >
              ${s.dir} ${s.label} · ${fmt(s.count)}
            </button>`,
        )}`,
      );
    }
    const els = dfDollar(this.signs).children().toArray() as HTMLElement[];
    const cx = w / 2,
      cy = h / 2;
    top.forEach((s, j) => {
      const el = els[j];
      if (!el) return;
      const dx = s.sx - cx,
        dy = s.sy - cy,
        t = Math.min((w / 2 - inset - 60) / Math.abs(dx || 1e-6), (h / 2 - inset - 12) / Math.abs(dy || 1e-6));
      el.style.translate = `${Math.round(cx + dx * t)}px ${Math.round(cy + dy * t)}px`;
    });
  }
  projectFocusRing(): void {
    const i = this.kbd;
    if (i < 0 || this.slots.has(i) || !this.view.children[i]) {
      this.focusRing.hidden = true;
      return;
    }
    const n = this.view.children[i],
      [sx, sy] = this.toScreen(n.x, n.y),
      r = Math.max(6, drawR(!this.view.leafView, n.r * this.cam.z)) + 4;
    this.focusRing.hidden = false;
    this.focusRing.style.translate = `${Math.round(sx - r)}px ${Math.round(sy - r)}px`;
    this.focusRing.style.width = this.focusRing.style.height = Math.round(r * 2) + 'px';
  }

  // ---------------------------------------------------- semantic depth: dive / up
  autoDepth(): void {
    const m = this.view,
      c = this.cam,
      vmin = this.vmin;
    if (!m || this.loading || this.syncing) return;
    if (m.parent && 2 * c.z < 0.38 * vmin) {
      void this.up(false);
      return;
    }
    // panned off this cluster's disk: hand over to the parent frame, which shows the neighbours with their contents
    // and dives into one once it is centered and big enough (4% hysteresis)
    if (m.parent && Math.hypot(c.cx, c.cy) > 1.04) {
      void this.up(false);
      return;
    }
    if (m.leafView) return;
    for (const n of m.children) {
      const d = Math.hypot(n.x - c.cx, n.y - c.cy);
      if (d > n.r) continue;
      const dia = 2 * n.r * c.z;
      if (dia >= 0.45 * vmin) void this.fetchView(n.id);
      if (dia >= 0.85 * vmin) {
        void this.rebaseDown(n.i);
        return;
      }
    }
  }
  async rebaseDown(i: number): Promise<void> {
    const n = this.view.children[i],
      gen = this.gen;
    if (this.diving === n.id || this.reloading) return;
    this.diving = n.id;
    const child = await this.fetchView(n.id);
    if (gen !== this.gen) return;
    this.diving = null;
    if (!this.view || this.reloading || this.view.children[i]?.id !== n.id) return;
    const conv = (cam) => cam && { ...cam, cx: (cam.cx - n.x) / n.r, cy: (cam.cy - n.y) / n.r, z: cam.z * n.r };
    const keep = this.selected;
    this.cam = conv(this.cam);
    this.bitmapCam = conv(this.bitmapCam);
    if (this.flight) this.flight = null;
    this.selected = new Set([...keep].filter((id) => child.byId.has(id)));
    this.setView(child);
    this.camChanged();
  }
  async up(animate = true): Promise<boolean> {
    const m = this.view,
      gen = this.gen;
    if (!m || !m.parent || this.upping || this.reloading) return false;
    this.upping = true;
    const parent = await this.fetchView(m.parent.id);
    if (gen !== this.gen) return false;
    this.upping = false;
    if (this.view !== m || this.reloading) return false;
    const p = m.parent;
    const conv = (cam) => cam && { ...cam, cx: p.x + cam.cx * p.r, cy: p.y + cam.cy * p.r, z: cam.z / p.r };
    this.cam = conv(this.cam);
    this.bitmapCam = conv(this.bitmapCam);
    this.flight = null;
    this.setView(parent);
    this.kbd = parent.byId.get(m.id) ?? -1;
    this.camChanged();
    if (animate) await this.flyTo({ cx: 0, cy: 0, z: this.fitZ() });
    return true;
  }
  async dive(i: number, animate = true): Promise<void> {
    const n = this.view.children[i];
    if (!n || n.kind !== 'cluster' || this.reloading) return;
    void this.fetchView(n.id);
    await this.flyTo({ cx: n.x, cy: n.y, z: (0.9 * this.vmin) / (2 * n.r) }, { animate });
    if (this.view.children[i] && this.view.children[i].id === n.id) await this.rebaseDown(i);
  }
  fitZ(): number {
    if (!this.w) this.size();
    return this.vmin / 2 / 1.04;
  }
  fit(animate = true): Promise<string> {
    return this.flyTo({ cx: 0, cy: 0, z: this.fitZ() }, { animate });
  }
  flyTo(target: GraphCamera, opts: { animate?: boolean; ms?: number } = {}): Promise<string> {
    if (!this.w) this.size();
    const animate = opts.animate !== false && !reducedMotion();
    if (this.flight) this.flight.done('interrupted');
    if (!animate) {
      Object.assign(this.cam, target);
      this.camChanged();
      return Promise.resolve('done');
    }
    const c = this.cam,
      path = zoomPath([c.cx, c.cy, this.vmin / c.z], [target.cx, target.cy, this.vmin / target.z]);
    return new Promise((resolve) => {
      this.flight = {
        path,
        start: performance.now(),
        ms: opts.ms || path.ms,
        done: (r: string) => {
          this.flight = null;
          resolve(r);
        },
      };
      this.requestTick();
    });
  }
  stepFlight(now: number): void {
    const f = this.flight,
      t = clamp((now - f.start) / f.ms, 0, 1),
      [cx, cy, w] = f.path.at(ease(t));
    this.cam.cx = cx;
    this.cam.cy = cy;
    this.cam.z = this.vmin / w;
    this.camChanged();
    if (t >= 1) f.done('done');
  }
  stopFlight(): void {
    if (this.flight) this.flight.done('interrupted');
  }

  async navigateTo(id: string, opts: { enter?: boolean; select?: boolean; animate?: boolean } = {}): Promise<void> {
    if (!id) return;
    await this.ready;
    this.navigating = true;
    const animate = opts.animate !== false;
    // a graph loaded meanwhile ends the way through this one
    const gen = this.gen;
    try {
      const path = await this.waitFor('path:' + id, () => this.post({ t: 'path', id }));
      if (!path || !path.length || gen !== this.gen) return;
      const ids = path.map((p) => p.id);
      // a node is selected among its parent's children: going to the view itself (a trail's last cluster) climbs
      const above = opts.enter ? ids : ids.slice(0, -1);
      let climbed = false;
      while (!above.includes(this.view.id)) {
        if (!(await this.up(false)) || gen !== this.gen) break;
        climbed = true;
      }
      if (gen !== this.gen) return;
      // after a climb the camera still shows the child it left, as big as when it was entered: fit the level first,
      // or the zoom dives straight back into it
      if (climbed) await this.fit(animate);
      let depth = ids.indexOf(this.view.id);
      while (depth < ids.length - 2 && gen === this.gen) {
        const nextId = ids[depth + 1],
          i = this.view.byId.get(nextId);
        if (i === undefined) break;
        // a dive that went nowhere (a graph is being loaded, or the same dive is under way) ends the way: else the
        // loop spins on resolved promises and the message that would end it is never read
        const before = this.view;
        await this.dive(i, animate);
        if (this.view === before) break;
        depth = ids.indexOf(this.view.id);
      }
      if (gen !== this.gen || this.reloading) return;
      const i = this.view.byId.get(id);
      if (i !== undefined && opts.enter && this.view.children[i].kind === 'cluster') {
        await this.dive(i, animate);
        await this.fit(animate);
      } else if (i !== undefined) {
        if (opts.select !== false) this.select([id]);
        this.kbd = i;
        await this.focusNode(i, animate);
      }
    } finally {
      this.navigating = false;
      this.requestTick();
      if (this.expanded) this.commitState();
    }
  }
  focusNode(i: number, animate = true): Promise<string> {
    const n = this.view.children[i],
      want = this.view.leafView ? 90 / (2 * n.r) : Math.min((0.6 * this.vmin) / (2 * n.r), (260 / (2 * n.r)) * 1.2);
    return this.flyTo({ cx: n.x, cy: n.y, z: Math.max(this.cam.z, want) }, { animate });
  }

  // ---------------------------------------------------- selection, hover, the primary action
  /** the view's edge index of a link id (either direction), or -1 */
  edgeIndex(id: string | null): number {
    if (!id || !this.view?.edgeById) return -1;
    const [a, b] = id.split('>');
    return this.view.edgeById.get(a + '>' + b) ?? this.view.edgeById.get(b + '>' + a) ?? -1;
  }
  /** the id of the view's edge k: '<source id>><target id>' */
  edgeId(k: number): string {
    const e = this.view.edges[k];
    return this.view.children[e.a].id + '>' + this.view.children[e.b].id;
  }
  /** the selected link's ends (view indexes), none without one */
  edgeEnds(): number[] {
    const k = this.edgeIndex(this.edge);
    if (k < 0) return [];
    const e = this.view.edges[k];
    return [e.a, e.b];
  }
  /** selects a link of the view (null clears it); the node selection goes */
  selectEdge(id: string | null): void {
    const k = this.edgeIndex(id);
    const next = k >= 0 ? this.edgeId(k) : null;
    if (next === this.edge && !this.selected.size) return;
    this.edge = next;
    this.selected = new Set();
    // a picked link takes the keyboard focus from the node that had it, so E expands the link
    if (next) this.kbd = -1;
    this.afterSelection();
  }
  /** the selected link's whole page: its detail renderer in expanded mode, the details outlet's Panel maximized */
  expandEdge(user = true): void {
    if (!this.edge || !this.expandableEdge()) return;
    const panel = this.detailsPanel();
    if (panel?.api && panel.api.getState().name !== 'maximized') panel.api.setState('maximized');
    this.setExpanded(true, user);
  }
  select(ids: string[], additive = false): void {
    this.edge = null;
    const next = additive ? new Set(this.selected) : new Set<string>();
    for (const id of ids) {
      if (additive && next.has(id)) next.delete(id);
      else next.add(id);
    }
    this.selected = next;
    this.afterSelection();
  }
  afterSelection(): void {
    // the keyboard follows a single selection (a click, select(), setState): E, Enter and the arrows start from the
    // node just picked - E once expanded the node a search had flown to while setState had selected another
    const only = this.selected.size === 1 ? this.view?.byId.get([...this.selected][0]) : undefined;
    if (only !== undefined) this.kbd = only;
    this.applyTiers(this.tiers);
    this.renderPanel();
    this.renderOutline();
    // an expanded page stays while a drill-down moves to the next node
    if (!this.selected.size && !this.edge && this.expanded && !this.navigating) this.collapseDetails();
    this.commitState();
    // the selection changed - by a click, a key, a search result or setState
    this.el.dispatchEvent(
      new CustomEvent<GraphExplorerSelectDetail>('graph-explorer-select', {
        detail: { selected: [...this.selected], edge: this.edge },
        bubbles: true,
      }),
    );
    this.camChanged();
  }
  setHover(i: number): void {
    if (i === this.hover) return;
    this.hover = i;
    this.el.toggleAttribute('data-dim', this.hover >= 0 || this.selected.size > 0 || !!this.edge);
    for (const [j, s] of this.slots) s.toggleAttribute('data-hl', this.isHighlighted(j));
    this.camChanged();
  }
  primary(i: number): void {
    const n = this.view.children[i];
    if (!n) return;
    if (n.kind === 'cluster') void this.dive(i, true);
    else this.expandNode(i);
  }
  nodeAt(ev: PointerEvent): number {
    const slot = (ev.target as Element)?.closest?.('.graph-explorer-node') as any;
    if (slot && slot._node) return this.view.byId.get(slot._node) ?? -1;
    const r = this.el.getBoundingClientRect(),
      px = ev.clientX - r.left,
      py = ev.clientY - r.top;
    const c = this.cam,
      wx = (px - this.w / 2) / c.z + c.cx,
      wy = (py - this.h / 2) / c.z + c.cy;
    let best = -1,
      bestR = Infinity,
      bestD = Infinity;
    for (const n of this.view.children) {
      const d = Math.hypot(n.x - wx, n.y - wy);
      if (d <= n.r && n.r < bestR) {
        best = n.i;
        bestR = n.r;
        bestD = 0;
      } else if (best < 0 || bestD > 0) {
        const ds = (d - n.r) * c.z;
        if (ds < 8 && ds < bestD) {
          best = n.i;
          bestD = ds;
        }
      }
    }
    return best;
  }

  // ---------------------------------------------------- jump to a neighbour (the Bring & Go ring)
  bringAndGo(i: number): void {
    const m = this.view,
      n = m.children[i];
    if (!n) return;
    const nbrs = m.adj[i]
      .map((k) => {
        const e = m.edges[k];
        return { j: e.a === i ? e.b : e.a, count: e.count + e.count2, tone: e.style.tone };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
    if (!nbrs.length) {
      this.announce(`${n.label} has no neighbours at this level`);
      return;
    }
    this.ringFor = { i, nbrs, opened: performance.now() };
    morph(
      this.ring,
      html`<span class="graph-explorer-ring-center" aria-hidden="true"></span>${nbrs.map(
          (b, k) =>
            html`<button
              type="button"
              class="graph-explorer-ring-item"
              key="r${b.j}"
              data-graph-explorer-ring="${b.j}"
              data-tone="${b.tone}"
              style="--k:${k}"
            >
              ${m.children[b.j].label}<span class="graph-explorer-count">${fmt(b.count)}</span>
            </button>`,
        )}`,
    );
    this.ring.hidden = false;
    this.ringEls = dfDollar(this.ring).find('.graph-explorer-ring-item').toArray();
    this.ringStart = true;
    this.projectRing();
    requestAnimationFrame(() => {
      this.ringStart = false;
      this.projectRing();
    });
    this.announce(`Jump to a neighbour: ${nbrs.length} neighbours of ${n.label} around it. Choose one to fly there.`);
    this.ringEls[0]?.focus({ preventScroll: true });
  }
  projectRing(): void {
    const r = this.ringFor;
    if (!r) return;
    const n = this.view.children[r.i],
      [cx, cy] = this.toScreen(n.x, n.y);
    const center = dfDollar(this.ring).find('.graph-explorer-ring-center').get(0);
    if (center) center.style.translate = `${Math.round(cx)}px ${Math.round(cy)}px`;
    const R = 120 + Math.max(0, r.nbrs.length - 8) * 8;
    r.nbrs.forEach((b, k) => {
      const el = this.ringEls[k];
      if (!el) return;
      let x: number, y: number;
      if (this.ringStart) {
        const t = this.view.children[b.j];
        [x, y] = this.toScreen(t.x, t.y);
        x = clamp(x, 0, this.w);
        y = clamp(y, 0, this.h);
      } else {
        const a = -Math.PI / 2 + (k / r.nbrs.length) * Math.PI * 2;
        x = cx + Math.cos(a) * R;
        y = cy + Math.sin(a) * R;
      }
      el.style.translate = `${Math.round(x)}px ${Math.round(y)}px`;
    });
  }
  closeRing(): boolean {
    if (this.ring.hidden) return false;
    this.ring.hidden = true;
    this.ringFor = null;
    morph(this.ring, []);
    return true;
  }
  async travel(j: number): Promise<void> {
    this.closeRing();
    const n = this.view.children[j];
    if (!n) return;
    this.kbd = j;
    this.select([n.id]);
    await this.focusNode(j);
    this.el.focus({ preventScroll: true });
  }

  // ---------------------------------------------------- events
  bindEvents(): void {
    const vp = this.el,
      pointers = new Map();
    let drag: any = null,
      lastTap: { i: number; t: number; edge?: string } = { i: -2, t: 0 },
      pinch: any = null,
      press: any = 0;
    const inChrome = (t: Element): boolean =>
      !!t.closest(
        '.graph-explorer-sign, .graph-explorer-ring-item, .graph-explorer-help, [data-graph-explorer-action], button, a, input',
      );
    dfDollar(vp).on('pointerdown', (ev: PointerEvent) => {
      if (inChrome(ev.target as Element) || !this.view) return;
      vp.focus({ preventScroll: true });
      this.stopFlight();
      pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      vp.setPointerCapture?.(ev.pointerId);
      if (pointers.size === 2) {
        const [p, q] = [...pointers.values()];
        pinch = { d: Math.hypot(p.x - q.x, p.y - q.y), z: this.cam.z };
        drag = null;
        clearTimeout(press);
        return;
      }
      // a link label is drawn over the nodes: under it the link wins; a line's wide hit path yields to a node
      const label = (ev.target as Element).closest?.('.graph-explorer-edge-label[data-graph-explorer-edge]');
      const i = label ? -1 : this.nodeAt(ev);
      const edge = label ?? (i < 0 ? (ev.target as Element).closest?.('[data-graph-explorer-edge]') : null);
      drag = {
        x: ev.clientX,
        y: ev.clientY,
        sx: ev.clientX,
        sy: ev.clientY,
        moved: false,
        i,
        edge: edge?.getAttribute('data-graph-explorer-edge') ?? null,
      };
      clearTimeout(press);
      if (i >= 0)
        press = setTimeout(() => {
          if (drag && !drag.moved) {
            drag.longPressed = true;
            this.bringAndGo(i);
          }
        }, 550);
    });
    dfDollar(vp).on('pointermove', (ev: PointerEvent) => {
      if (pointers.has(ev.pointerId)) pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pinch && pointers.size === 2) {
        const [p, q] = [...pointers.values()],
          d = Math.hypot(p.x - q.x, p.y - q.y),
          r = vp.getBoundingClientRect();
        this.zoomAt((p.x + q.x) / 2 - r.left, (p.y + q.y) / 2 - r.top, (pinch.z * d) / pinch.d / this.cam.z);
        return;
      }
      if (drag) {
        const dx = ev.clientX - drag.x,
          dy = ev.clientY - drag.y;
        if (!drag.moved && Math.hypot(ev.clientX - drag.sx, ev.clientY - drag.sy) > 5) {
          drag.moved = true;
          clearTimeout(press);
          vp.setAttribute('data-panning', '');
        }
        if (drag.moved && !drag.longPressed) {
          this.cam.cx -= dx / this.cam.z;
          this.cam.cy -= dy / this.cam.z;
          this.camChanged();
        }
        drag.x = ev.clientX;
        drag.y = ev.clientY;
        return;
      }
      if (ev.pointerType === 'mouse' && this.view && !inChrome(ev.target as Element))
        this.setHover((ev.target as Element).closest?.('.graph-explorer-edge-label') ? -1 : this.nodeAt(ev));
    });
    const end = (ev: PointerEvent): void => {
      pointers.delete(ev.pointerId);
      if (pointers.size < 2) pinch = null;
      clearTimeout(press);
      vp.removeAttribute('data-panning');
      const d = drag;
      drag = null;
      if (!d || d.moved || !this.view) return;
      if (d.longPressed) {
        const item = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.graph-explorer-ring-item');
        if (item) void this.travel(+(item.getAttribute('data-graph-explorer-ring') ?? -1));
        return;
      }
      if (this.closeRing()) return;
      const i = d.i,
        now = performance.now();
      if (i < 0 && d.edge) {
        const twice = lastTap.i === -3 && lastTap.edge === d.edge && now - lastTap.t < 320;
        lastTap = { i: -3, t: now, edge: d.edge };
        this.selectEdge(d.edge);
        if (twice) this.expandEdge();
        else this.showDetails();
        return;
      }
      if (i >= 0 && lastTap.i === i && now - lastTap.t < 320) {
        lastTap = { i: -2, t: 0 };
        this.primary(i);
        return;
      }
      lastTap = { i, t: now };
      if (i >= 0) {
        this.kbd = i;
        this.select([this.view.children[i].id], ev.shiftKey);
        this.showDetails();
      } else if (this.selected.size) this.select([]);
    };
    dfDollar(vp).on('pointerup', end);
    dfDollar(vp).on('pointercancel', end);
    dfDollar(vp).on('pointerleave', (ev: PointerEvent) => {
      if (ev.pointerType === 'mouse' && !drag) this.setHover(-1);
    });
    // a wheel zooms the graph, never the page: passive false to cancel the scroll
    vp.addEventListener(
      'wheel',
      (ev: WheelEvent) => {
        if (!this.view) return;
        ev.preventDefault();
        this.stopFlight();
        const r = vp.getBoundingClientRect(),
          k = ev.ctrlKey ? 0.012 : 0.0016;
        this.zoomAt(ev.clientX - r.left, ev.clientY - r.top, Math.exp(-ev.deltaY * (ev.deltaMode === 1 ? 16 : 1) * k));
      },
      { passive: false },
    );
    dfDollar(vp).on('keydown', (ev: KeyboardEvent) => this.onKey(ev));
    // the clicks inside the explorer (cards, signposts, the ring); the outlets' clicks come through the document
    dfDollar(vp).on('click', (ev: MouseEvent) => this.onClick(ev));
    this.resizeObserver = new ResizeObserver(() => {
      this.size();
      this.camChanged();
    });
    this.resizeObserver.observe(vp);
    // the attributes are the state: written from outside (a page, the HTML Preview Editor), the view follows
    this.attrObserver = new MutationObserver(() => void this.sync());
    this.attrObserver.observe(vp, {
      attributes: true,
      attributeFilter: [
        'data-focus',
        'data-selected',
        'data-selected-edge',
        'data-layers',
        'data-compact',
        'data-expanded',
        'data-hud',
      ],
    });
  }
  /** a click on an action, a goto, a crumb, a result, an outline row, a layer switch, a signpost or a ring item */
  onClick(ev: MouseEvent): void {
    const t = ev.target as Element;
    if (!t?.closest) return;
    const act = t.closest('[data-graph-explorer-action]');
    if (act) {
      const slot = act.closest('.graph-explorer-node') as any;
      const id = slot ? slot._node : ([...this.selected][0] ?? null);
      void this.act(act.getAttribute('data-graph-explorer-action') ?? '', id, act as HTMLElement);
      return;
    }
    const upd = t.closest('[data-graph-explorer-update]');
    if (upd) {
      void this.openUpdate(upd.getAttribute('data-graph-explorer-update') ?? '');
      return;
    }
    const layer = t.closest('[data-graph-explorer-layer]');
    if (layer) {
      this.toggleLayer(layer.getAttribute('data-graph-explorer-layer') ?? '');
      return;
    }
    if (t.closest('[data-graph-explorer-compact]')) {
      this.setCompact(!this.compact);
      return;
    }
    const ring = t.closest('[data-graph-explorer-ring]');
    if (ring) {
      void this.travel(+(ring.getAttribute('data-graph-explorer-ring') ?? -1));
      return;
    }
    const link = t.closest('[data-graph-explorer-edge]');
    if (link && this.view) {
      this.selectEdge(link.getAttribute('data-graph-explorer-edge'));
      this.showDetails(true);
      return;
    }
    const goto = t.closest('[data-graph-explorer-goto]');
    if (goto && this.view) {
      const id = goto.getAttribute('data-graph-explorer-goto') ?? '';
      // an expanded page drills down: the next node's page replaces it, the graph moves along unseen
      if (this.expanded) void this.navigateTo(id, { animate: false });
      else if (goto.getAttribute('data-ext') === '1') void this.goSibling(id);
      else {
        const i = this.view.byId.get(id);
        if (i !== undefined) void this.travel(i);
        else void this.navigateTo(id);
      }
      return;
    }
    const crumb = t.closest('[data-graph-explorer-crumb]');
    if (crumb) {
      ev.preventDefault();
      void this.upTo(crumb.getAttribute('data-graph-explorer-crumb') ?? 'c0');
      return;
    }
    const res = t.closest('[data-graph-explorer-result]');
    if (res) {
      this.chooseResult(+(res.getAttribute('data-graph-explorer-result') ?? -1));
      return;
    }
    const oi = t.closest('[data-graph-explorer-outline]');
    if (oi && this.view) {
      const i = +(oi.getAttribute('data-graph-explorer-outline') ?? -1);
      if (i >= 0) {
        this.kbd = i;
        this.select([this.view.children[i].id]);
        void this.focusNode(i);
      }
    }
  }
  /** an action: on a node (enter, bring, details, expand) or on the explorer (collapse, up, fit, live, help) */
  async act(action: string, id: string | null, button?: HTMLElement): Promise<void> {
    if (!this.view) return;
    const i = id ? this.view.byId.get(id) : undefined;
    const own = ['up', 'fit', 'live', 'help', 'collapse'].includes(action);
    // an action button was used
    this.el.dispatchEvent(
      new CustomEvent<GraphExplorerActionDetail>('graph-explorer-action', {
        detail: { action, id: own ? null : id },
        bubbles: true,
      }),
    );
    if (action === 'up') await this.up(true);
    else if (action === 'fit') await this.fit(true);
    else if (action === 'help') this.help.togglePopover();
    else if (action === 'live') {
      if (this.loaded) return; // Live mode simulates a generated graph
      const on = !this.simulating;
      this.simulating = on;
      this.post({ t: 'simulate', on });
      for (const b of boundOf(this.el, '[data-graph-explorer-action="live"]'))
        dfDollar(b).attr('aria-pressed', String(on));
      if (button && !button.closest(`[${FOR}]`)) dfDollar(button).attr('aria-pressed', String(on));
    } else if (action === 'collapse') this.collapseDetails();
    else if (i === undefined) {
      if (action === 'expand' && this.edge) this.expandEdge();
    } else if (action === 'enter') await this.dive(i, true);
    else if (action === 'bring') this.bringAndGo(i);
    else if (action === 'details') {
      this.select([id as string]);
      this.showDetails(true);
    } else if (action === 'expand') this.expandNode(i);
  }
  zoomAt(px: number, py: number, f: number): void {
    const c = this.cam,
      m = this.view;
    if (!m) return;
    const wx = (px - this.w / 2) / c.z + c.cx,
      wy = (py - this.h / 2) / c.z + c.cy;
    let minZ = this.vmin * 0.05,
      maxZ = this.vmin * 40;
    if (!m.parent) minZ = this.fitZ() / 3;
    if (m.leafView) maxZ = 240 / (m.children[0] ? m.children[0].r : 0.02);
    c.z = clamp(c.z * f, minZ, maxZ);
    c.cx = wx - (px - this.w / 2) / c.z;
    c.cy = wy - (py - this.h / 2) / c.z;
    this.camChanged();
  }
  async goSibling(id: string): Promise<void> {
    await this.up(false);
    const i = this.view.byId.get(id);
    if (i !== undefined) await this.travel(i);
  }
  async upTo(id: string, animate = true): Promise<void> {
    while (this.view.id !== id && this.view.parent) {
      if (!(await this.up(false))) break;
    }
    await this.fit(animate);
  }

  onKey(ev: KeyboardEvent): void {
    const m = this.view,
      t = ev.target as Element;
    if (!m) return;
    if (ev.key === '/' && !t.closest('input, textarea')) {
      const input = this.searchInputs()[0];
      if (input) {
        ev.preventDefault();
        input.focus();
        input.select();
      }
      return;
    }
    if (t !== this.el && !t.closest('.graph-explorer-ring')) return;
    const key = ev.key,
      pan = (0.15 * this.vmin) / this.cam.z;
    const dirs: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    if (dirs[key]) {
      ev.preventDefault();
      this.stopFlight();
      const [dx, dy] = dirs[key];
      if (ev.shiftKey || !this.moveFocus(dx, dy)) {
        this.cam.cx += dx * pan;
        this.cam.cy += dy * pan;
        this.camChanged();
      }
      return;
    }
    if (key === 'Enter') {
      ev.preventDefault();
      if (this.kbd >= 0) this.primary(this.kbd);
      return;
    }
    if (key === ' ') {
      ev.preventDefault();
      if (this.kbd >= 0) {
        this.select([m.children[this.kbd].id], ev.shiftKey);
        this.showDetails(true);
      }
      return;
    }
    if (key === 'e' || key === 'E') {
      ev.preventDefault();
      const i = this.kbd >= 0 ? this.kbd : m.byId.get([...this.selected][0]);
      if (this.edge && !this.selected.size && this.kbd < 0) this.expandEdge();
      else if (i !== undefined && i >= 0) this.expandNode(i);
      return;
    }
    // 1 - 9: show or hide the k-th layer
    if (/^[1-9]$/.test(key) && !ev.metaKey && !ev.ctrlKey && !ev.altKey) {
      const l = this.layerDefs()[+key - 1];
      if (l) {
        ev.preventDefault();
        this.toggleLayer(l.name);
      }
      return;
    }
    if (key === 'Escape') {
      ev.preventDefault();
      if (this.closeRing()) {
        this.el.focus();
        return;
      }
      if (this.help.matches(':popover-open')) {
        this.help.hidePopover();
        return;
      }
      if (this.expanded) {
        this.collapseDetails();
        return;
      }
      const host = this.el.closest('.panel');
      if (host?.hasAttribute('data-maximized') && host.api) {
        host.api.setState('default');
        return;
      }
      if (this.edge) {
        this.selectEdge(null);
        return;
      }
      void this.up(true);
      return;
    }
    if (key === 'Backspace') {
      ev.preventDefault();
      void this.up(true);
      return;
    }
    if (key === '0') {
      ev.preventDefault();
      void this.fit(true);
      return;
    }
    if (key === '+' || key === '=') {
      ev.preventDefault();
      this.zoomAt(this.w / 2, this.h / 2, 1.35);
      return;
    }
    if (key === '-' || key === '_') {
      ev.preventDefault();
      this.zoomAt(this.w / 2, this.h / 2, 1 / 1.35);
      return;
    }
    if (key === ']' || key === '[') {
      ev.preventDefault();
      this.cycleNeighbor(key === ']' ? 1 : -1);
      return;
    }
    if (key === 'b' || key === 'B') {
      ev.preventDefault();
      if (this.kbd >= 0) this.bringAndGo(this.kbd);
      return;
    }
    if (key === '?') {
      ev.preventDefault();
      this.help.togglePopover();
    }
  }
  moveFocus(dx: number, dy: number): boolean {
    const m = this.view,
      c = this.cam;
    const from = this.kbd >= 0 ? m.children[this.kbd] : { x: c.cx, y: c.cy, i: -1 };
    let best = -1,
      score = Infinity;
    for (const n of m.children) {
      if (n.i === from.i || !this.tiers || this.tiers[n.i] < 0) continue;
      const vx = n.x - from.x,
        vy = n.y - from.y,
        d = Math.hypot(vx, vy);
      if (d < 1e-9) continue;
      const cos = (vx * dx + vy * dy) / d;
      if (cos < 0.5) continue;
      const s = d * (2 - cos);
      if (s < score) {
        score = s;
        best = n.i;
      }
    }
    if (best < 0) return false;
    this.setKbd(best);
    return true;
  }
  setKbd(i: number): void {
    this.kbd = i;
    const m = this.view,
      n = m.children[i];
    for (const [j, s] of this.slots) dfDollar(s).attr('data-kbd', j === i ? '' : null);
    const [sx, sy] = this.toScreen(n.x, n.y);
    if (sx < 40 || sx > this.w - 40 || sy < 40 || sy > this.h - 40)
      void this.flyTo({ cx: n.x, cy: n.y, z: this.cam.z }, { ms: 180 });
    this.announce(
      `${n.label} · ${n.typeName} · ${n.kind === 'cluster' ? fmt(n.members) + ' nodes' : n.degree + ' links'} · ${i + 1} of ${m.children.length} in ${m.path[m.path.length - 1].label}${n.scc > 1 ? ' · in a cycle of ' + n.scc : ''}`,
    );
    this.camChanged();
  }
  cycleNeighbor(dir: number): void {
    const m = this.view;
    if (this.kbd < 0) return;
    if (!this.nbrCursor || this.nbrCursor.of !== this.kbd) {
      const list = m.adj[this.kbd]
        .map((k) => {
          const e = m.edges[k];
          return { j: e.a === this.kbd ? e.b : e.a, c: e.count + e.count2 };
        })
        .sort((a, b) => b.c - a.c)
        .map((x) => x.j);
      this.nbrCursor = { of: this.kbd, list, at: -1 };
    }
    const cur = this.nbrCursor;
    if (!cur.list.length) {
      this.announce('No neighbours at this level');
      return;
    }
    cur.at = (cur.at + dir + cur.list.length) % cur.list.length;
    const origin = cur.of;
    this.setKbd(cur.list[cur.at]);
    this.nbrCursor = cur;
    cur.of = origin;
    this.kbd = cur.list[cur.at];
  }

  // ---------------------------------------------------- the search outlet
  searchInputs(): HTMLInputElement[] {
    return this.outlets('search').map((o) => this.searchBox(o).input);
  }
  searchBox(outlet: HTMLElement): { input: HTMLInputElement; list: HTMLElement } {
    const id = this.uid;
    const box = outletChrome(outlet, 'search', () => {
      const made = dfDollar(`<div class="graph-explorer-search" role="search" data-ce-chrome></div>`).get(
        0,
      ) as HTMLElement;
      morph(
        made,
        html`${icon('search', { cls: 'graph-explorer-search-icon' })}<input
            class="input graph-explorer-search-input"
            data-size="sm"
            type="search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="false"
            aria-controls="${id}-results"
            autocomplete="off"
            spellcheck="false"
            enterkeyhint="search"
            placeholder="Search ${fmt(this.n)} nodes ( / )"
            aria-label="Search the graph"
          />
          <ul
            class="graph-explorer-results"
            id="${id}-results"
            role="listbox"
            aria-label="Search results"
            hidden
          ></ul>`,
      );
      const input = dfDollar(made).find('input').get(0) as HTMLInputElement;
      let deb: any = 0;
      // the scan runs in the worker; the next keystroke aborts it
      dfDollar(input).on('input', () => {
        clearTimeout(deb);
        deb = setTimeout(() => {
          this.searchSeq++;
          this.post({ t: 'search', q: input.value, seq: this.searchSeq });
        }, 140);
      });
      dfDollar(input).on('keydown', (ev: KeyboardEvent) => {
        if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
          ev.preventDefault();
          this.moveResult(ev.key === 'ArrowDown' ? 1 : -1);
        } else if (ev.key === 'Enter') {
          ev.preventDefault();
          this.chooseResult(this.activeResult >= 0 ? this.activeResult : 0);
        } else if (ev.key === 'Escape') {
          ev.preventDefault();
          if (!this.closeResults()) this.el.focus();
        }
      });
      dfDollar(input).on('blur', () =>
        setTimeout(() => {
          if (document.activeElement !== input) this.closeResults();
        }, 150),
      );
      // a press on a result keeps the input's focus until the click chooses it
      dfDollar(made).on('pointerdown', (ev: PointerEvent) => {
        if ((ev.target as Element).closest('[data-graph-explorer-result]')) ev.preventDefault();
      });
      return made;
    });
    return {
      input: dfDollar(box).find('input').get(0) as HTMLInputElement,
      list: dfDollar(box).find('ul').get(0) as HTMLElement,
    };
  }
  onSearch(m: any): void {
    if (m.seq !== this.searchSeq) return;
    const finder = this.finder;
    if (finder && finder.seq === m.seq) {
      finder.results = m.results;
      if (m.partial) finder.onPartial?.(m.results, m.scanned);
      else {
        this.finder = null;
        finder.resolve(m.results);
      }
      return;
    }
    this.results = m.results;
    this.activeResult = m.results.length ? 0 : -1;
    const id = this.uid;
    for (const outlet of this.outlets('search')) {
      const { input, list } = this.searchBox(outlet);
      morph(
        list,
        html`${m.results.map(
          (r, k) =>
            html`<li
              role="option"
              id="${id}-r${k}"
              key="r${r.id}"
              data-graph-explorer-result="${k}"
              aria-selected="${k === this.activeResult ? 'true' : 'false'}"
            >
              <span class="graph-explorer-result-label">${r.label}</span
              ><span class="graph-explorer-result-path">${r.type}${r.path ? ' · ' + r.path : ''}</span>
            </li>`,
        )}
        ${m.partial ? html`<li class="graph-explorer-result-more" aria-hidden="true">scanning... ${fmt(m.scanned)} / ${fmt(this.n)}</li>` : ''}
        ${!m.partial && !m.results.length && m.q ? html`<li class="graph-explorer-result-more">No matches</li>` : ''}`,
      );
      const open = !!m.q && document.activeElement === input;
      list.hidden = !open;
      dfDollar(input).attr('aria-expanded', open ? 'true' : 'false');
      dfDollar(input).attr(
        'aria-activedescendant',
        open && this.activeResult >= 0 ? `${id}-r${this.activeResult}` : null,
      );
    }
  }
  moveResult(d: number): void {
    if (!this.results.length) return;
    this.activeResult = (this.activeResult + d + this.results.length) % this.results.length;
    for (const outlet of this.outlets('search')) {
      const { input, list } = this.searchBox(outlet);
      dfDollar(list)
        .find('[role="option"]')
        .each((k, el) => {
          dfDollar(el).attr('aria-selected', k === this.activeResult ? 'true' : 'false');
        });
      dfDollar(input).attr('aria-activedescendant', `${this.uid}-r${this.activeResult}`);
    }
  }
  chooseResult(k: number): void {
    const r = this.results[k];
    if (!r) return;
    this.closeResults();
    this.el.focus({ preventScroll: true });
    void this.navigateTo(r.id);
  }
  closeResults(): boolean {
    let closed = false;
    for (const outlet of this.outlets('search')) {
      const { input, list } = this.searchBox(outlet);
      if (list.hidden) continue;
      list.hidden = true;
      dfDollar(input).attr('aria-expanded', 'false');
      dfDollar(input).attr('aria-activedescendant', null);
      closed = true;
    }
    return closed;
  }

  // ---------------------------------------------------- outlets: details, relations, outline, breadcrumb
  outlets(kind: string): HTMLElement[] {
    return boundOf(this.el, `[data-graph-explorer-outlet="${kind}"]`);
  }
  outputs(kind: string): HTMLElement[] {
    return boundOf(this.el, `[data-graph-explorer-output="${kind}"]`);
  }
  /** the Panel that holds the details outlet (Expand maximizes it) */
  detailsPanel(): HTMLElement | null {
    return (this.outlets('details')[0]?.closest('.panel') as HTMLElement) ?? null;
  }
  /** shows the details outlet's Panel: opens it when closed; `restore` also unfolds it when minimized */
  showDetails(restore = false): void {
    const panel = this.detailsPanel();
    if (!panel?.api) return;
    const state = panel.api.getState().name;
    if (state === 'closed' || (restore && state === 'minimized')) panel.api.setState('default');
  }
  /** the node's whole page: its detail renderer in expanded mode, the details outlet's Panel maximized */
  expandNode(i: number, user = true): void {
    const n = this.view?.children[i];
    if (!n) return;
    this.kbd = i;
    if (!this.selected.has(n.id) || this.selected.size !== 1) this.select([n.id]);
    // no details outlet, or no page for this node: nothing to expand to
    if (!this.expandableNode(this.nodeOf(i))) return;
    const panel = this.detailsPanel();
    if (panel?.api && panel.api.getState().name !== 'maximized') panel.api.setState('maximized');
    this.setExpanded(true, user);
  }
  collapseDetails(user = true): void {
    const panel = this.detailsPanel();
    if (panel?.api && panel.api.getState().name === 'maximized') panel.api.setState('default');
    this.setExpanded(false, user);
  }
  setExpanded(on: boolean, user = true): void {
    if (this.expanded === on) return;
    this.expanded = on;
    this.renderPanel();
    if (user) this.commitState();
    // focus follows the expanded page, and comes back to the graph after
    if (!on) this.el.focus({ preventScroll: true });
    else
      dfDollar(this.detailsPanel() ?? document)
        .find('.panel-maximize input')
        .get(0)
        ?.focus({ preventScroll: true });
  }
  onPanelChange(ev: CustomEvent): void {
    const panel = ev.target as HTMLElement;
    if (panel === this.detailsPanel()) {
      const max = ev.detail?.state === 'maximized';
      if (max !== this.expanded) {
        if (max && !this.selected.size && !this.edge) panel.api?.setState('default');
        else this.setExpanded(max);
      }
    }
    if (this.outlets('relations').some((o) => o.closest('.panel') === panel) && ev.detail?.state !== 'minimized')
      this.renderRelations();
  }
  renderPanel(): void {
    const m = this.view;
    if (this.edge && m) {
      this.renderEdgePanel();
      return;
    }
    const id = [...this.selected][0],
      i = m && id ? m.byId.get(id) : undefined;
    const outlets = this.outlets('details');
    if (i === undefined) {
      // a drill-down on an expanded page passes through views without a selection: the page waits for the next node
      if (this.expanded && this.navigating) return;
      this.writeOutput('details-title', null);
      for (const outlet of outlets)
        morph(
          this.chrome(outlet, 'details'),
          html`<div class="graph-explorer-empty">
            ${icon('crosshair', { size: 'xl' })}
            <p><strong>Nothing selected</strong></p>
            <p class="graph-explorer-muted">
              Click a node to see its details here. <kbd class="kbd">E</kbd> or the ${icon('expand', { size: 'xs' })}
              button expands a node's full page.
            </p>
          </div>`,
        );
      if (this.expanded) this.collapseDetails();
      this.renderRelations();
      return;
    }
    const node = this.nodeOf(i),
      r = this.pick('detail', node);
    if (!r) return;
    this.writeOutput('details-title', r.title ? r.title(node) : node.label);
    if (outlets.length) {
      const ctx = this.ctxFor(node, 'detail', i);
      let out;
      try {
        out = r.render(node, ctx);
      } catch (err) {
        console.error('[graph-explorer] detail renderer "' + r.name + '" failed', err);
        return;
      }
      void Promise.resolve(out).then((safe) => {
        if ([...this.selected][0] !== id) return;
        for (const outlet of outlets) morphKeeping(this.chrome(outlet, 'details'), safe, this.islandMounts);
      });
    }
    this.renderRelations();
  }
  /** the selected link as its detail renderer gets it */
  edgeItem(): GraphEdgeItem | null {
    const k = this.edgeIndex(this.edge);
    if (k < 0) return null;
    const m = this.view,
      e = m.edges[k];
    return {
      kind: 'edge',
      id: this.edgeId(k),
      source: this.nodeOf(e.a),
      target: this.nodeOf(e.b),
      edge: e,
      depth: m.path.length - 1,
    };
  }
  /** the edge plugin whose detail renderer describes a link best (the element's plugins first) */
  pickEdgeDetail(item: GraphEdgeItem): GraphEdgeDetail | null {
    for (const reg of [this.registry, globalRegistry]) {
      let best: any = null,
        score = -Infinity;
      for (const p of reg.edge) {
        if (!p.detail) continue;
        const s = p.detail.match ? p.detail.match(item) : 0;
        if (s === false || s == null) continue;
        if (s > score || (s === score && p._order > best._order)) {
          best = p;
          score = s;
        }
      }
      if (best) return best.detail;
    }
    return null;
  }
  /** the details of the selected link */
  renderEdgePanel(): void {
    const item = this.edgeItem();
    if (!item) return;
    const r = this.pickEdgeDetail(item);
    if (!r) return;
    this.writeOutput('details-title', r.title ? r.title(item) : item.source.label + ' → ' + item.target.label);
    const outlets = this.outlets('details');
    if (outlets.length) {
      const ctx = { ...this.ctxFor(item.source, 'detail', item.edge.a), expandable: this.expandableEdge(item) };
      let out;
      try {
        out = r.render(item, ctx);
      } catch (err) {
        console.error('[graph-explorer] edge detail renderer failed', err);
        return;
      }
      const id = item.id;
      void Promise.resolve(out).then((safe) => {
        if (this.edge !== id) return;
        for (const outlet of outlets) morphKeeping(this.chrome(outlet, 'details'), safe, this.islandMounts);
      });
    }
    this.renderRelations();
  }
  /** the relations outlet: the selected node's relations, each edge drawn by the edge label renderers */
  renderRelations(): void {
    const m = this.view,
      id = [...this.selected][0],
      i = m && id ? m.byId.get(id) : undefined;
    const outlets = this.outlets('relations');
    const item = this.edge ? this.edgeItem() : null;
    if (item) {
      const ctx = this.ctxFor(item.source, 'relations', item.edge.a);
      const d = ctx.request('edge:' + item.id, () => ctx.fetchEdge(item.id));
      this.writeOutput(
        'relations-title',
        `${item.source.label} → ${item.target.label} · ${fmt(item.edge.count + item.edge.count2)}`,
      );
      for (const outlet of outlets) {
        const panel = outlet.closest('.panel');
        if (panel?.hasAttribute('data-minimized')) continue;
        morphKeeping(
          this.chrome(outlet, 'relations'),
          d ? linksTable(ctx, d) : html`<p class="graph-explorer-muted graph-explorer-pad">Loading...</p>`,
          this.islandMounts,
        );
      }
      return;
    }
    if (i === undefined) {
      this.writeOutput('relations-title', null);
      for (const outlet of outlets)
        morph(
          this.chrome(outlet, 'relations'),
          html`<p class="graph-explorer-muted graph-explorer-pad">Select a node to list its relations.</p>`,
        );
      return;
    }
    const node = this.nodeOf(i);
    const ctx = this.ctxFor(node, 'relations', i);
    const d = ctx.request('details:' + node.id, () => ctx.fetchDetails(node.id));
    if (!d) {
      for (const outlet of outlets)
        morph(
          this.chrome(outlet, 'relations'),
          html`<p class="graph-explorer-muted graph-explorer-pad">Loading...</p>`,
        );
      return;
    }
    const total = node.kind === 'cluster' ? (d.relations?.length ?? 0) : (d.outDeg ?? 0);
    this.writeOutput('relations-title', `${node.label} · ${fmt(total)}`);
    for (const outlet of outlets) {
      const panel = outlet.closest('.panel');
      if (panel?.hasAttribute('data-minimized')) continue; // folded: the title says enough
      morphKeeping(
        this.chrome(outlet, 'relations'),
        relationsTable(ctx, node, d, panel?.hasAttribute('data-maximized') ? 'full' : 'label', 200),
        this.islandMounts,
      );
    }
  }
  /** the chrome box of a details / relations outlet */
  chrome(outlet: HTMLElement, kind: string): HTMLElement {
    return outletChrome(
      outlet,
      kind,
      () => dfDollar(`<div class="graph-explorer-${kind}" data-ce-chrome></div>`).get(0) as HTMLElement,
    );
  }
  /** a readout: its text, or (null) the text it was authored with */
  writeOutput(kind: string, text: string | null): void {
    for (const out of this.outputs(kind)) {
      if (out._graphExplorerText === undefined) out._graphExplorerText = dfDollar(out).text();
      const next = text ?? out._graphExplorerText;
      if (dfDollar(out).text() !== next) dfDollar(out).text(next);
    }
  }
  renderOutline(): void {
    const m = this.view;
    if (!m) return;
    for (const outlet of this.outlets('outline')) {
      const box = outletChrome(outlet, 'outline', () => {
        const made = dfDollar('<div class="graph-explorer-outline" data-ce-chrome></div>').get(0) as HTMLElement;
        morph(
          made,
          html`<div class="graph-explorer-outline-head">
              <input
                class="input graph-explorer-outline-filter"
                data-size="sm"
                type="search"
                placeholder="Filter this level"
                aria-label="Filter the outline"
              />
            </div>
            <ul class="graph-explorer-outline-list" role="tree" aria-label="Current cluster"></ul>`,
        );
        const list = dfDollar(made).find('ul').get(0) as HTMLElement;
        dfDollar(made)
          .find('input')
          .on('input', () => this.renderOutline());
        dfDollar(list).on('keydown', (ev: KeyboardEvent) => {
          const items = dfDollar(list).find('[data-graph-explorer-outline]').toArray() as HTMLElement[],
            at = items.indexOf(document.activeElement as HTMLElement);
          if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
            ev.preventDefault();
            items[clamp(at + (ev.key === 'ArrowDown' ? 1 : -1), 0, items.length - 1)]?.focus();
          }
          if (ev.key === 'Enter' && at >= 0) {
            ev.preventDefault();
            const i = +(items[at].getAttribute('data-graph-explorer-outline') ?? -1);
            if (i >= 0) this.primary(i);
            else void this.upTo(items[at].getAttribute('data-graph-explorer-crumb') ?? 'c0');
          }
        });
        dfDollar(list).on('dblclick', (ev: MouseEvent) => {
          const oi = (ev.target as Element).closest('[data-graph-explorer-outline]');
          const i = +(oi?.getAttribute('data-graph-explorer-outline') ?? -1);
          if (i >= 0) this.primary(i);
        });
        return made;
      });
      const filter = dfDollar(box).find('input').get(0) as HTMLInputElement;
      const list = dfDollar(box).find('ul').get(0) as HTMLElement;
      const q = (filter.value || '').trim().toLowerCase();
      const kids = m.children
        .filter((c) => !q || c.label.toLowerCase().includes(q))
        .sort((a, b) => b.degree + b.members - (a.degree + a.members));
      const shown = kids.slice(0, 300);
      morph(
        list,
        html`${m.path.map(
          (p, depth) =>
            html`<li
              role="treeitem"
              aria-level="${depth + 1}"
              aria-expanded="true"
              key="p${p.id}"
              class="graph-explorer-outline-path"
              style="--depth:${depth}"
            >
              <button
                type="button"
                class="graph-explorer-outline-item"
                data-graph-explorer-crumb="${p.id}"
                tabindex="-1"
              >
                ${p.label}
              </button>
            </li>`,
        )}
        ${shown.map(
          (c) =>
            html`<li
              role="treeitem"
              aria-level="${m.path.length + 1}"
              aria-selected="${this.selected.has(c.id) ? 'true' : 'false'}"
              key="o${c.id}"
              style="--depth:${m.path.length}"
            >
              <button
                type="button"
                class="graph-explorer-outline-item"
                data-graph-explorer-outline="${c.i}"
                tabindex="-1"
              >
                <span class="graph-explorer-type" data-type="${c.type}"></span
                ><span class="graph-explorer-label">${c.label}</span>
                ${smallCycle(c) ? html`<span class="graph-explorer-cycle" title="cycle of ${c.scc}">↻</span>` : ''}<span
                  class="graph-explorer-count"
                  >${c.kind === 'cluster' ? fmt(c.members) : c.degree}</span
                >
              </button>
            </li>`,
        )}
        ${kids.length > shown.length ? html`<li class="graph-explorer-outline-more">${fmt(kids.length - shown.length)} more - refine the filter</li>` : ''}
        ${!kids.length ? html`<li class="graph-explorer-outline-more">No match at this level</li>` : ''}`,
      );
      const items = dfDollar(list).find('.graph-explorer-outline-item').toArray() as HTMLElement[];
      const first = items[m.path.length] || items[0];
      if (first) first.tabIndex = 0;
    }
  }
  renderCrumbs(): void {
    const m = this.view,
      last = m.path.length - 1;
    for (const outlet of this.outlets('breadcrumb')) {
      const nav = outletChrome(outlet, 'path', () => {
        const made = dfDollar(
          '<nav class="breadcrumb graph-explorer-path" aria-label="Graph path" data-ce-chrome></nav>',
        ).get(0) as HTMLElement;
        morph(made, html`<ol class="breadcrumb-list"></ol>`);
        return made;
      });
      morph(
        dfDollar(nav).find('ol').get(0) as HTMLElement,
        html`${m.path.map((p, k) =>
          k === last
            ? html`<li class="breadcrumb-item" key="${p.id}">
                <span class="breadcrumb-page" aria-current="page">${p.label}</span>
              </li>`
            : html`<li class="breadcrumb-item" key="${p.id}">
                  <a class="breadcrumb-link" href="#${p.id}" data-graph-explorer-crumb="${p.id}">${p.label}</a>
                </li>
                <li class="breadcrumb-separator" aria-hidden="true" key="s${p.id}">›</li>`,
        )}`,
      );
    }
    this.writeOutput('view', m.path[last].label);
  }
  announce(text: string): void {
    clearTimeout(this.announceT);
    this.announceT = setTimeout(() => {
      const outs = this.outputs('status');
      // a bound status readout is the live region; without one, the explorer's own (visually hidden) one
      for (const out of outs.length ? outs : [this.liveEl]) dfDollar(out).text(text);
    }, 120);
  }
  renderHud(): void {
    const s = this.stats,
      w = s.worker || {},
      dom = dfDollar(this.el).find('*').toArray().length;
    dfDollar(this.hud).text(
      `graph   ${fmt(this.genStats.nodes)} nodes · ${fmt(this.genStats.edges)} edges · gen ${fmt(this.genStats.ms)} ms\n` +
        `view    ${this.view.path[this.view.path.length - 1].label} · ${this.view.children.length} children\n` +
        `DOM     ${w.cards ?? 0} cards · ${w.chips ?? 0} chips · ${dom} elements in the explorer\n` +
        `canvas  ${fmt(w.dots ?? 0)} dots · ${fmt(w.edges ?? 0)} edges · ${w.labels ?? 0} labels\n` +
        `worker  ${w.ms ?? 0} ms/frame · ${s.fps} bitmaps/s · lag ${s.lag ?? 0}`,
    );
  }

  // ---------------------------------------------------- live patches (the breaker simulation)
  onPatch(m: any): void {
    const v = this.views.get(m.view);
    if (!v) return;
    const touched = new Set<number>();
    for (const p of m.edges) {
      const e = v.edges[p.k];
      if (!e) continue;
      const was = e.breaker && e.breaker.state;
      e.breaker = p.breaker;
      e.style = p.style;
      e.traffic = p.traffic;
      if (was !== (e.breaker && e.breaker.state)) {
        touched.add(e.a);
        touched.add(e.b);
      }
    }
    if (m.external && v.parent)
      for (const x of m.external) {
        const ext = v.parent.external.find((q) => q.id === x.id);
        if (ext) {
          ext.breaker = x.breaker;
          ext.style = x.style;
        }
      }
    this.computeBreakerCounts(v);
    if (v !== this.view) return;
    for (const i of touched) {
      const id = v.children[i].id;
      this.dataRev.set(id, (this.dataRev.get(id) || 0) + 1);
      this.staleRequest('details:' + id);
    }
    // breakers that moved change the selection's details; a restyle (another layer shown) changes no number
    if (!m.restyle) for (const id of this.selected) this.staleRequest('details:' + id);
    this.signKeys = '';
    this.applyTiers(this.tiers);
    if (this.selected.size) this.renderPanel();
    for (const p of this.edgePaths.values()) p.tone = null;
    this.camChanged();
  }

  /** the data behind a request moved on: its next use loads it again, showing the last answer until then */
  staleRequest(key: string): void {
    const r = this.requests.get(key);
    if (r) r.stale = true;
  }

  // ---------------------------------------------------- updates: what changed
  /** a target's name in the view shown: a node's label, a link's 'A → B' */
  labelOf(target: string): string {
    const m = this.view;
    if (!m) return target;
    if (target.includes('>')) {
      const k = this.edgeIndex(target);
      if (k < 0) return target.replace('>', ' → ');
      const e = m.edges[k];
      return `${m.children[e.a].label} → ${m.children[e.b].label}`;
    }
    const i = m.byId.get(target);
    return i === undefined ? target : m.children[i].label;
  }
  /** adds changes: each marks its node or link and joins the Updates outlet (newest first) */
  addUpdates(items: Array<Partial<GraphUpdate>>): GraphUpdate[] {
    const now = Date.now(),
      at = performance.now();
    const added: GraphUpdate[] = [];
    for (const raw of items || []) {
      if (!raw || !raw.target) continue;
      const target = String(raw.target);
      const kind = raw.kind === 'edge' || (raw.kind !== 'node' && target.includes('>')) ? 'edge' : 'node';
      const u: GraphUpdate = {
        id: raw.id ? String(raw.id) : `u${++this.updateSeq}`,
        time: Number(raw.time) || now,
        kind,
        target,
        layer: raw.layer ? String(raw.layer) : kind === 'edge' ? 'relations' : 'nodes',
        type: raw.type ? String(raw.type) : 'change',
        text: raw.text ? String(raw.text) : '',
        label: raw.label ? String(raw.label) : this.labelOf(target),
      };
      if (kind === 'edge') u.view = raw.view ? String(raw.view) : (this.view?.id ?? 'c0');
      if (raw.tone && TONES.includes(raw.tone)) u.tone = raw.tone;
      added.push(u);
      this.changes.set(target, { u, at });
    }
    if (!added.length) return added;
    this.updates.unshift(...added.slice().reverse());
    if (this.updates.length > UPDATE_LIMIT) this.updates.length = UPDATE_LIMIT;
    for (const u of added)
      // a node or a link changed - Live mode's simulation or update()
      this.el.dispatchEvent(
        new CustomEvent<GraphExplorerUpdateDetail>('graph-explorer-update', { detail: { update: u }, bubbles: true }),
      );
    this.renderUpdates(added.filter((u) => this.shown.has(u.layer)).length);
    clearTimeout(this.changeT);
    this.changeT = setTimeout(() => this.pruneChanges(), CHANGE_MS + 50);
    if (this.view) {
      this.projectEdges();
      this.projectChanges();
    }
    return added;
  }
  /** the marks of changes older than CHANGE_MS go */
  pruneChanges(): void {
    const old = performance.now() - CHANGE_MS;
    for (const [t, ch] of this.changes) if (ch.at <= old) this.changes.delete(t);
    if (this.changes.size) this.changeT = setTimeout(() => this.pruneChanges(), 500);
    if (this.view && !this.destroyed) {
      this.projectEdges();
      this.projectChanges();
    }
  }
  /** a glowing dot at the top right of every changed node in view (its slot's corner, else its circle's) */
  projectChanges(): void {
    const m = this.view;
    if (!m || !this.changesEl) return;
    const keep = new Set<string>();
    const z = this.cam.z,
      isCluster = !m.leafView;
    for (const [target, ch] of this.changes) {
      if (ch.u.kind !== 'node' || !this.shown.has(ch.u.layer)) continue;
      const i = m.byId.get(target);
      if (i === undefined) continue;
      const n = m.children[i],
        s = this.slots.get(i);
      let x: number, y: number;
      if (s && !s.hidden && s._x != null) {
        x = s._x + s._w - 2;
        y = s._y + 2;
      } else {
        const [sx, sy] = this.toScreen(n.x, n.y),
          r = drawR(isCluster, n.r * z) * 0.72;
        x = sx + r;
        y = sy - r;
      }
      if (x < -8 || y < -8 || x > this.w + 8 || y > this.h + 8) continue;
      keep.add(target);
      let dot = this.changeDots.get(target);
      if (!dot || dot._at !== ch.at) {
        dot?.remove();
        dot = dfDollar(
          `<span class="indicator-dot graph-explorer-change-dot" data-animate="ping" data-layer="${esc(ch.u.layer)}"></span>`,
        ).get(0) as HTMLElement;
        dot.style.setProperty('--graph-explorer-layer', this.colorOf(ch.u.layer));
        dot.style.animationDuration = `${CHANGE_MS}ms`;
        dot._at = ch.at;
        dfDollar(this.changesEl).append(dot);
        this.changeDots.set(target, dot);
      }
      dot.style.translate = `${Math.round(x)}px ${Math.round(y)}px`;
    }
    for (const [t, dot] of this.changeDots)
      if (!keep.has(t)) {
        dot.remove();
        this.changeDots.delete(t);
      }
  }
  /** the update renderer for an update: the highest match, the element's own before the global ones */
  pickUpdate(u: GraphUpdate): GraphUpdateRenderer {
    let best: any = null,
      bestScore = -Infinity;
    for (const p of [...this.registry.update, ...globalRegistry.update]) {
      const score = p.update.match ? p.update.match(u) : 0;
      if (score === false || score == null) continue;
      const rank = score * 1e6 + (p._scoped ? 5e5 : 0) + p._order;
      if (rank > bestScore) {
        bestScore = rank;
        best = p.update;
      }
    }
    return best;
  }
  /** one row of the Updates outlet: the renderer's content in the button that selects the target */
  updateRow(u: GraphUpdate): SafeHtml {
    const r = this.pickUpdate(u);
    let body: SafeHtml | string = u.text;
    try {
      body = r.render(u, this.updateCtx);
    } catch (err) {
      console.error('[graph-explorer] update renderer', err);
    }
    return html`<button
      type="button"
      class="graph-explorer-update"
      data-graph-explorer-update="${u.id}"
      data-layer="${u.layer}"
      data-kind="${u.kind}"
      style="--graph-explorer-layer: ${this.colorOf(u.layer)}"
      title="${u.label}: ${u.text}"
    >
      ${body}
    </button>`;
  }
  get updateCtx(): GraphUpdateContext {
    return {
      html,
      icon,
      color: (layer: string) => this.colorOf(layer),
      time: (ms: number) => TIME_FMT.format(ms),
    };
  }
  /** the Updates outlet: a Virtual List of the shown layers' updates, newest first (a plain list without one) */
  renderUpdates(added = 0): void {
    const outs = this.outlets('updates');
    if (!outs.length) return;
    this.updatesRendered = true;
    this.updatesShown = this.updates.filter((u) => this.shown.has(u.layer));
    // a soft dependency, like the Data Grid: without df$.shadcn.virtualList (an app bundle that left it out) a plain list
    const vl = df$.virtualList as
      | { setData(list: HTMLElement, count: number, render: (row: HTMLElement, index: number) => void): void }
      | undefined;
    for (const out of outs) {
      const box = outletChrome(
        out,
        'updates',
        () =>
          dfDollar(
            `<div class="graph-explorer-updates${vl ? ' virtual-list' : ''}" aria-label="Updates" data-empty-text="No updates in the shown layers yet" data-ce-chrome></div>`,
          ).get(0) as HTMLElement,
      );
      if (vl) {
        // a reader scrolled down keeps the rows they read: the new ones go in above them
        if (added && box.scrollTop > 0) box.scrollTop += added * (box._rowHeight || 32);
        vl.setData(box, this.updatesShown.length, (row: HTMLElement, i: number) => {
          const u = this.updatesShown[i];
          if (u) morph(row, this.updateRow(u));
        });
      } else
        morph(
          box,
          this.updatesShown.length
            ? html`${this.updatesShown.slice(0, 200).map((u) => this.updateRow(u))}`
            : html`<p class="graph-explorer-muted graph-explorer-pad">No updates in the shown layers yet</p>`,
        );
    }
  }
  /** an update's target, selected: a node is flown to; a link's view is entered first */
  async openUpdate(id: string): Promise<void> {
    const u = this.updates.find((x: GraphUpdate) => x.id === id);
    if (!u || !this.view) return;
    if (u.kind === 'node') {
      await this.navigateTo(u.target);
      return;
    }
    if (u.view && u.view !== this.view.id) {
      if (u.view === 'c0') await this.upTo('c0');
      else await this.navigateTo(u.view, { enter: true, select: false });
    }
    this.selectEdge(u.target);
    this.showDetails(true);
  }

  // ---------------------------------------------------- the State API bridge
  /** what the explorer shows now, as a state */
  liveState(): { name: string; config: Record<string, unknown> } {
    const v = this.view;
    const focus = v && v.id !== 'c0' ? v.id : null;
    const selected = [...this.selected];
    const edge = selected.length ? null : this.edge;
    return {
      name: stateNameOf(focus, selected, edge),
      config: {
        focus,
        selected,
        layers: [...this.shown],
        compact: this.compact,
        expanded: this.expanded && (selected.length > 0 || !!edge),
        edge,
      },
    };
  }
  /** record what the user did (a pick, a dive, a layer shown or hidden) the way setState would have written it */
  commitState(): void {
    if (this.syncing || !this.view || this.loading) return;
    // a drill-down on an expanded page records where it lands, not the views it passes through
    if (this.navigating && this.expanded) return;
    const s = this.liveState();
    applyMarkup(this.el, s.name, s.config as GraphExplorerConfig);
    graphExplorerApi.commit(this.el, s.name, configOf(this.el) as unknown as Record<string, unknown>);
  }
  /** make the view follow the attributes (the state's markup); serialized - one sync at a time */
  sync(): Promise<void> {
    this.syncChain = this.syncChain.then(() => this.syncNow()).catch((err) => console.error('[graph-explorer]', err));
    return this.syncChain;
  }
  async syncNow(): Promise<void> {
    await this.ready;
    if (this.destroyed) return;
    // the state the markup declares at load is jumped to; later ones are flown to
    const animate = !!this.synced && !reducedMotion();
    this.synced = true;
    this.hud.hidden = !this.el.hasAttribute('data-hud');
    const want = configOf(this.el);
    const now = this.liveState().config;
    const same =
      want.focus === now.focus &&
      want.selected.join(' ') === (now.selected as string[]).join(' ') &&
      sameLayers(want.layers, now.layers as string[]) &&
      want.compact === now.compact &&
      want.expanded === now.expanded &&
      want.edge === now.edge;
    if (same) return;
    this.syncing = true;
    try {
      if (!sameLayers(want.layers, [...this.shown]) || want.compact !== this.compact) {
        this.shown = new Set(want.layers);
        this.compact = want.compact;
        this.layersChanged(false);
      }
      // the view: the focus, else the cluster of the first selected node that is not at the top, else the top
      const target = want.focus ?? 'c0';
      if (this.view.id !== target) {
        if (target === 'c0') await this.upTo('c0', animate);
        else await this.navigateTo(target, { enter: true, select: false, animate });
      }
      const inView = want.selected.filter((id) => this.view.byId.has(id));
      const missing = want.selected.find((id) => !this.view.byId.has(id));
      if (missing && !want.focus) {
        await this.navigateTo(missing, { select: false, animate });
      }
      const selected = want.selected.filter((id) => this.view.byId.has(id));
      if (selected.join(' ') !== [...this.selected].join(' ') || inView.length !== selected.length) {
        if (selected.length) this.edge = null;
        this.selected = new Set(selected);
        this.afterSelection();
      }
      // a link: its source's cluster unless a focus says where
      if (!selected.length && want.edge) {
        if (this.edgeIndex(want.edge) < 0 && !want.focus)
          await this.navigateTo(want.edge.split('>')[0], { select: false, animate });
        if (this.edgeIndex(want.edge) >= 0 && this.edge !== want.edge) this.selectEdge(want.edge);
      } else if (!selected.length && this.edge) this.selectEdge(null);
      const first = this.view.byId.get(selected[0]);
      if (want.expanded && first !== undefined) this.expandNode(first, false);
      else if (want.expanded && this.edge && !selected.length) this.expandEdge(false);
      else if (this.expanded) this.collapseDetails(false);
    } finally {
      this.syncing = false;
    }
    this.commitState();
  }
  destroy(): void {
    this.destroyed = true;
    live.delete(this);
    if (this.raf) cancelAnimationFrame(this.raf);
    for (const t of [this.hudT, this.restTimer, this.announceT, this.changeT]) clearTimeout(t);
    for (const mq of this.mediaQueries || []) mq.removeEventListener('change', this.onMedia);
    document.removeEventListener('defuss-theme-change', this.onThemeEvent);
    document.removeEventListener('load', this.onThemeEvent, true);
    this.worker.terminate();
    URL.revokeObjectURL(this.workerUrl);
    this.resizeObserver.disconnect();
    this.themeObserver.disconnect();
    this.attrObserver.disconnect();
    unbindComponent(this.el);
    delete this.el.api;
    dfDollar(this.el).children('[data-ce-chrome]').remove();
    for (const kind of OUTLETS)
      for (const o of this.outlets(kind)) {
        dropIslands(o);
        dfDollar(o).children('[data-ce-chrome]').remove();
      }
    // data-init stays: a destroyed explorer does not start again by itself (remove the attribute to start it)
    this.el._graphExplorer = undefined;
  }
}

// the outlets' clicks and the Panels' changes: one delegation for every explorer on the page
if (!document.__graphExplorerInit) {
  document.__graphExplorerInit = true;
  // an event inside an explorer is its own (the explorer listens itself), also when a bound element holds it
  const owner = (t: Element | null): any => {
    if (!t?.closest || t.closest('.graph-explorer')) return undefined;
    const bound = t.closest(`[${FOR}]`);
    const id = bound?.getAttribute(FOR);
    return id ? dfDollar('#' + CSS.escape(id)).get(0)?._graphExplorer : undefined;
  };
  document.addEventListener('click', (ev) => {
    const inst = owner(ev.target as Element);
    if (inst) inst.onClick(ev);
  });
  document.addEventListener('keydown', (ev) => {
    const t = ev.target as Element;
    const inst = owner(t);
    if (inst && ev.key === '/' && !t.closest('input, textarea')) inst.onKey(ev);
  });
  document.addEventListener('panel-change', (ev) => {
    for (const inst of live) inst.onPanelChange(ev as CustomEvent);
  });
}

// -- the public API ------------------------------------------------------------------------------

const need = (target: string | HTMLElement): any => {
  const inst = resolveTarget(target)?._graphExplorer;
  if (!inst) throw new Error('graph-explorer: the element is not initialized');
  return inst;
};

df$.graphExplorer = {
  html,
  register,
  icon,
  registerIcon,
  /**
   * Flies to a node anywhere in the graph - out of the view and into the clusters on its path - and selects it.
   * @param target - the .graph-explorer element or its selector
   * @param id - the node's id (c<number> or n<number>)
   * @returns resolves when the flight has landed
   */
  navigate: (target: string | HTMLElement, id: string): Promise<void> => need(target).navigateTo(id),
  /**
   * Enters a cluster from anywhere: flies there and makes it the view (the focus).
   * @param target - the .graph-explorer element or its selector
   * @param id - the cluster's id
   * @returns resolves when the view is inside it
   */
  dive: (target: string | HTMLElement, id: string): Promise<void> =>
    need(target).navigateTo(id, { enter: true, select: false }),
  /**
   * Moves up one level.
   * @param target - the .graph-explorer element or its selector
   * @returns true when it moved (false at the top)
   */
  up: (target: string | HTMLElement): Promise<boolean> => need(target).up(true),
  /**
   * Fits the view's whole cluster into the viewport.
   * @param target - the .graph-explorer element or its selector
   * @returns 'done', or 'interrupted' when another flight took over
   */
  fit: (target: string | HTMLElement): Promise<string> => need(target).fit(true),
  /**
   * Flies the camera to a point of the view's unit disk.
   * @param target - the .graph-explorer element or its selector
   * @param camera - the camera to land on
   * @returns 'done', or 'interrupted' when another flight took over
   */
  flyTo: (target: string | HTMLElement, camera: GraphCamera): Promise<string> => need(target).flyTo(camera),
  /**
   * The way from the top of the graph to a node: every cluster above it and the node itself - the worker answers.
   * @param target - the .graph-explorer element or its selector
   * @param id - the node's id (c<number> or n<number>)
   * @returns id and name of every step, the top (c0) first, the node last
   */
  path: async (target: string | HTMLElement, id: string): Promise<GraphPathStep[]> => {
    const inst = need(target);
    await inst.ready;
    return inst.waitFor('path:' + id, () => inst.post({ t: 'path', id }));
  },
  /**
   * A node and its descendants down to a number of levels, as flat records linked by parent id - what a tree grid
   * takes (data-parent-field="parent"). The worker answers: a domain of a million-node graph with two levels below it
   * is its systems and all their entities.
   * @param target - the .graph-explorer element or its selector
   * @param id - the subtree's root (c0 is the whole graph)
   * @param levels - how many levels to return, the root's included (default 3)
   * @returns the rows, depth first, the root first
   */
  subtree: async (target: string | HTMLElement, id: string, levels: number = 3): Promise<GraphTreeRow[]> => {
    const inst = need(target);
    await inst.ready;
    return inst.fetchSubtree(id, levels);
  },
  /**
   * Searches the whole graph for names that hold the query (or #<number> for an entity) and answers with the hits -
   * the clusters first, then up to twelve entities; the worker scans the entities in chunks. A newer search ends this
   * one with what it found so far.
   * @param target - the .graph-explorer element or its selector
   * @param query - the text to find in names
   * @param onPartial - called with the hits so far and the entities scanned while the scan runs
   * @returns the hits
   */
  find: async (
    target: string | HTMLElement,
    query: string,
    onPartial?: (results: GraphSearchResult[], scanned: number) => void,
  ): Promise<GraphSearchResult[]> => {
    const inst = need(target);
    await inst.ready;
    return inst.find(query, onPartial);
  },
  /**
   * Searches the graph like the search outlet does (the results show in it).
   * @param target - the .graph-explorer element or its selector
   * @param query - the text to find in names (or #<number> for an entity)
   */
  search: (target: string | HTMLElement, query: string): void => {
    const inst = need(target);
    for (const input of inst.searchInputs()) {
      input.value = query;
      input.focus();
    }
    inst.searchSeq++;
    inst.post({ t: 'search', q: query, seq: inst.searchSeq });
  },
  /**
   * Selects nodes of the view (an empty list clears the selection).
   * @param target - the .graph-explorer element or its selector
   * @param ids - the node ids
   */
  select: (target: string | HTMLElement, ids: string[]): void =>
    need(target).select(ids.filter((id) => need(target).view?.byId.has(id))),
  /**
   * Selects a link of the view (null clears it): its details show and the rest of the graph steps back.
   * @param target - the .graph-explorer element or its selector
   * @param id - the link: '<source id>><target id>' of two nodes in the view, or null
   */
  selectEdge: (target: string | HTMLElement, id: string | null): void => need(target).selectEdge(id),
  /**
   * Shows exactly these layers: nodes, relations, labels, health or a plugin's (an empty list leaves the circles).
   * @param target - the .graph-explorer element or its selector
   * @param layers - the layers' names
   */
  setLayers: (target: string | HTMLElement, layers: string[]): void => need(target).setLayers(layers),
  /**
   * The layers the switch offers - the built-in ones and those plugins add - with their colours and whether they show.
   * @param target - the .graph-explorer element or its selector
   * @returns name, label, icon, colour, base and shown of each
   */
  layers: (target: string | HTMLElement): GraphLayer[] => need(target).layerDefs(),
  /**
   * Draws every node as a one-line chip (on) or by its size (off).
   * @param target - the .graph-explorer element or its selector
   * @param on - true for one-line chips
   */
  setCompact: (target: string | HTMLElement, on: boolean): void => need(target).setCompact(on),
  /**
   * Expands a node's full page: its detail renderer with ctx.expanded, the details outlet's Panel maximized (navigates
   * there first when the node is not in view).
   * @param target - the .graph-explorer element or its selector
   * @param id - the node's id, or a link's ('<source id>><target id>')
   * @returns resolves when the page shows
   */
  expand: async (target: string | HTMLElement, id: string): Promise<void> => {
    const inst = need(target);
    if (edgeKey(id)) {
      if (inst.edgeIndex(id) < 0) await inst.navigateTo(id.split('>')[0], { select: false });
      inst.selectEdge(id);
      inst.expandEdge();
      return;
    }
    if (!inst.view?.byId.has(id)) await inst.navigateTo(id);
    const k = inst.view.byId.get(id);
    if (k !== undefined) inst.expandNode(k);
  },
  /**
   * Collapses the expanded page back to the details.
   * @param target - the .graph-explorer element or its selector
   */
  collapse: (target: string | HTMLElement): void => need(target).collapseDetails(),
  /**
   * Shows a graph of the page's in place of the one shown (a generated one too): the worker checks it whole - the
   * hierarchy in BFS order with contiguous children, the nodes sorted by cluster, the out-CSR, every index in range,
   * at most 1,024 children per cluster and 256 cluster levels - and installs it, or refuses it with
   * graph-explorer-error and keeps the graph shown. The typed arrays' buffers are transferred, not copied, refused or
   * not - packed node labels and refs (GraphExplorerStrings) too, while lists of strings are copied: they are empty
   * on the page afterwards, and a refused graph is built anew to try again. The new graph shows
   * at its top, nothing selected, without the old one's updates, search or outline filter; Health, breakers, Live
   * mode and the generated attributes are a generated graph's only. With data-source="external" the element generates
   * nothing and waits for this call.
   * @param target - the .graph-explorer element or its selector
   * @param data - the graph: clusters, nodes, edges and the names of their types
   * @returns true once the new graph shows; false when the worker refused it (the event says why) or a later load()
   * superseded it before it showed
   */
  load: (target: string | HTMLElement, data: GraphExplorerData): Promise<boolean> => need(target).load(data),
  /**
   * Starts or stops Live mode: a simulation in which breakers trip, probe and close, nodes deploy, traffic moves and
   * counts change - each change an update (a dot on the node, a flash on the link, a row in the Updates outlet). A
   * loaded graph has no Live mode: its changes come through update().
   * @param target - the .graph-explorer element or its selector
   * @param on - true to start, false to stop
   */
  simulate: (target: string | HTMLElement, on: boolean): void => {
    const inst = need(target);
    if (!inst.loaded && !!inst.simulating !== on) void inst.act('live', null);
  },
  /**
   * Adds changes from the app: each marks its node or link for a while and joins the Updates outlet, newest first. A
   * link's target is '<from>><to>' in the view its `view` names (default: the view shown); the id, the time, the layer
   * (nodes for a node, relations for a link), the type and the label are filled in when left out.
   * @param target - the .graph-explorer element or its selector
   * @param updates - one change or several
   * @returns the updates as recorded
   */
  update: (target: string | HTMLElement, updates: Partial<GraphUpdate> | Array<Partial<GraphUpdate>>): GraphUpdate[] =>
    need(target).addUpdates(Array.isArray(updates) ? updates : [updates]),
  /**
   * Every update so far, newest first (the last 10,000).
   * @param target - the .graph-explorer element or its selector
   * @returns a copy of the list
   */
  updates: (target: string | HTMLElement): GraphUpdate[] => [...need(target).updates],
  /**
   * Diagnostics for tests and the HUD: the camera, the view, the budget's use, the worker's timing.
   * @param target - the .graph-explorer element or its selector
   * @param opts - { children: true } adds the view's children with their positions
   * @returns the inspection
   */
  inspect: (target: string | HTMLElement, opts: { children?: boolean } = {}): GraphInspection => {
    const inst = need(target);
    const out: GraphInspection = {
      view: inst.view?.id ?? null,
      cam: { ...inst.cam },
      slots: inst.slots.size,
      flight: !!inst.flight,
      navigating: inst.navigating,
      lag: inst.stats.lag ?? 0,
      elements: dfDollar(inst.el).find('*').toArray().length,
      worker: { ...inst.stats.worker },
      graph: inst.genStats ? { ...inst.genStats } : null,
    };
    if (opts.children && inst.view) {
      out.children = inst.view.children.map((n: GraphNode) => ({ id: n.id, label: n.label, x: n.x, y: n.y, r: n.r }));
      out.edges = inst.view.edges.map((e: GraphEdge, k: number) => ({
        id: inst.edgeId(k),
        count: e.count,
        count2: e.count2,
        kind: e.kind,
      }));
      out.dotLabels = inst.dotLabels.map((r: number[]) => [...r]);
    }
    return out;
  },
  /**
   * Stops the explorer: the worker ends, the chrome and the outlets' content go, the State API is unbound.
   * @param target - the .graph-explorer element or its selector
   */
  destroy: (target: string | HTMLElement): void => need(target).destroy(),
};

function init(): void {
  (dfDollar('.graph-explorer:not([data-init])').toArray() as HTMLElement[]).forEach((el) => {
    el.dataset.init = '';
    const inst = new Explorer(el);
    el._graphExplorer = inst;
    const config = configOf(el);
    // el.store + el.api (AGENTS.md "State through stores"): the state the attributes declare
    const name = stateNameOf(config.focus, config.selected, config.edge);
    bindComponent(el, graphExplorerApi, { name, config: config as unknown as Record<string, unknown> });
    // the first state change waits for the graph: el.api.settled() resolves once it is drawn in that state
    void graphExplorerApi.setState(el, name, {});
  });
  // outlets placed after the explorer started get their content
  for (const inst of live)
    if (inst.view)
      for (const kind of OUTLETS)
        for (const o of inst.outlets(kind))
          if (!dfDollar(o).children('[data-ce-chrome]').get(0)) {
            inst.renderLayers();
            inst.renderCrumbs();
            inst.renderOutline();
            inst.renderPanel();
            inst.searchInputs();
            break;
          }
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });

// -- the worker -------------------------------------------------------------------------------------
// Owns the synthetic graph (CSR edges), the cluster hierarchy, the aggregated edges with their breaker state, the
// per-cluster layouts (lazy), the cycles (SCC + back-edges), the three budget valves (aggregate, cull, demote with
// box collision), the declarative edge-style rules and the far field + bulk edges drawn into an OffscreenCanvas,
// sent back to the main thread as an ImageBitmap tagged with the camera id it was drawn for.
// Stringified into a Blob worker: nothing in here may reference anything outside it.

function graphExplorerWorker(self: any): void {
  'use strict';

  // ------------------------------------------------------------------ hashing
  let SEED = 0x5bd1e995;
  const h32 = (a, b) => {
    let x = (a | 0) ^ Math.imul((b | 0) + 0x632be5ab, 0x9e3779b1) ^ SEED;
    x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
    x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
    return (x ^ (x >>> 16)) >>> 0;
  };
  const rnd = (a, b) => h32(a, b) / 4294967296;

  // --------------------------------------------------------------- vocabulary
  const DOMAINS = [
    'Payments',
    'Identity',
    'Search',
    'Catalog',
    'Logistics',
    'Analytics',
    'Messaging',
    'Billing',
    'Risk',
    'Media',
    'Inventory',
    'Support',
    'Pricing',
    'Recommendations',
    'Notifications',
    'Compliance',
    'Fulfillment',
    'Accounts',
    'Marketing',
    'Data Platform',
    'Observability',
    'Edge',
    'Storage',
    'Partners',
    'Mobile',
    'Growth',
    'Security',
    'Content',
    'Ads',
    'Maps',
  ];
  const SVC_A = [
    'ledger',
    'fraud',
    'token',
    'session',
    'order',
    'cart',
    'invoice',
    'refund',
    'quota',
    'profile',
    'consent',
    'route',
    'shipment',
    'stock',
    'price',
    'promo',
    'review',
    'feed',
    'index',
    'query',
    'crawl',
    'rank',
    'asset',
    'thumb',
    'audit',
    'policy',
    'key',
    'cache',
    'event',
    'metric',
    'trace',
    'alert',
    'mail',
    'push',
    'sms',
    'geo',
    'tile',
    'billing',
    'tax',
    'payout',
  ];
  const SVC_B = [
    'api',
    'gateway',
    'worker',
    'store',
    'stream',
    'scorer',
    'sync',
    'indexer',
    'router',
    'cache',
    'broker',
    'scheduler',
    'service',
    'adapter',
    'engine',
    'proxy',
    'registry',
    'collector',
  ];
  const SYSTEM_KINDS = ['API', 'Worker', 'Store', 'Stream'];
  const ENTITY_TYPES = ['Dataset', 'Endpoint', 'Document', 'Person', 'Job', 'Topic'];
  const KIND_FAVOR = [1, 4, 0, 5]; // API→Endpoint, Worker→Job, Store→Dataset, Stream→Topic
  const EDGE_TYPES = ['calls', 'reads', 'owns'];
  const NOUN = [
    'order',
    'invoice',
    'ledger',
    'account',
    'payment',
    'refund',
    'session',
    'token',
    'profile',
    'cart',
    'route',
    'parcel',
    'stock',
    'price',
    'coupon',
    'review',
    'rating',
    'query',
    'index',
    'shard',
    'asset',
    'image',
    'video',
    'policy',
    'audit',
    'metric',
    'trace',
    'event',
    'alert',
    'report',
    'segment',
    'model',
    'feature',
    'schema',
    'table',
    'topic',
    'queue',
    'batch',
    'job',
    'cron',
    'contract',
    'customer',
    'merchant',
    'partner',
    'device',
    'region',
    'zone',
    'tile',
    'consent',
    'tax',
    'payout',
    'quota',
    'limit',
    'cache',
    'key',
    'secret',
    'webhook',
    'ticket',
    'case',
    'note',
    'draft',
    'budget',
    'forecast',
    'campaign',
  ];
  const ADJ = [
    'daily',
    'hourly',
    'stale',
    'fresh',
    'raw',
    'clean',
    'gold',
    'silver',
    'bronze',
    'hot',
    'cold',
    'warm',
    'live',
    'shadow',
    'legacy',
    'next',
    'beta',
    'canary',
    'eu',
    'us',
    'apac',
    'global',
    'local',
    'shared',
    'private',
    'public',
    'internal',
    'external',
    'primary',
    'replica',
    'archived',
    'pending',
    'active',
    'failed',
    'retry',
    'dead',
    'fast',
    'slow',
    'small',
    'large',
    'core',
    'edge',
    'mobile',
    'web',
    'batch',
    'stream',
    'nightly',
    'weekly',
    'monthly',
    'q1',
    'q2',
    'q3',
    'q4',
    'v1',
    'v2',
    'v3',
    'alpha',
    'omega',
    'blue',
    'green',
    'red',
    'amber',
    'gray',
    'prime',
  ];
  const USERS = ['mira', 'jonas', 'li', 'sam', 'ada', 'omar', 'noor', 'tomas'];
  const STATE_NAMES = ['closed', 'half-open', 'open', 'cut'];
  const SEVERITY = [0, 1, 3, 2]; // closed < half-open < cut < open

  // ------------------------------------------------------------------ graph
  let N = 0,
    E = 0,
    C = 0,
    D = 0,
    S = 0,
    P = 0;
  let leafType, leafCluster, outStart, outTarget, edgeType, inDeg;
  // cLeafParent: the cluster's children are entities (a leaf view); cLeafStart/End: the range of those entities (a leaf
  // parent's only - a loaded graph of variable depth keeps no cluster's whole subtree contiguous, rangesOf() walks it)
  let cParent, cLevel, cChildStart, cChildCount, cLeafStart, cLeafEnd, cKind, cName, cLeafParent;
  let pairA, pairB, pairCount, pairState, pairTrips, pairSince, pairProbesOk, pairBy, pairVer;
  // viewPairs: the cluster whose view draws a pair's aggregate edge (the lowest common ancestor of its two systems)
  let domPairs, rootPairs, pairMap, viewPairs;
  // a graph given to load() (EXT): its own names, labels and refs; no breakers, no simulation, no synthetic attributes
  let EXT = false,
    TYPES = null,
    LABELS = null,
    REFS = null,
    cRef = null,
    cMembers = null;

  const views = new Map(); // cluster id -> view (layout, edges, cycles)
  const previews = new Map(); // cluster id -> cheap phyllotaxis layout for far-field dots

  function generate(n, seed) {
    const t0 = performance.now();
    SEED = ((seed | 0) * 0x27d4eb2d) ^ 0x5bd1e995;
    N = n = Math.max(2000, Math.min(4000000, n | 0));
    D = Math.min(60, Math.max(6, Math.round(n / 40000)));
    const S0 = Math.max(D * 3, Math.round(n / 190));
    const dw = new Float64Array(D);
    let dsum = 0;
    for (let d = 0; d < D; d++) {
      dw[d] = 0.65 + rnd(d, 11) * 0.7;
      dsum += dw[d];
    }
    const sysPer = new Int32Array(D);
    S = 0;
    for (let d = 0; d < D; d++) {
      sysPer[d] = Math.max(3, Math.floor((dw[d] / dsum) * S0));
      S += sysPer[d];
    }
    for (let d = 0; S < S0; d = (d + 1) % D) {
      sysPer[d]++;
      S++;
    }
    C = 1 + D + S;

    cParent = new Int32Array(C);
    cLevel = new Uint8Array(C);
    cChildStart = new Int32Array(C);
    cChildCount = new Int32Array(C);
    cLeafStart = new Int32Array(C);
    cLeafEnd = new Int32Array(C);
    cKind = new Uint8Array(C);
    cName = Array.from({ length: C });
    cLeafParent = new Uint8Array(C);
    EXT = false;

    // leaves per system, summing to n
    const sw = new Float64Array(S);
    let ssum = 0;
    for (let s = 0; s < S; s++) {
      sw[s] = 0.45 + rnd(s, 13) * 1.1;
      ssum += sw[s];
    }
    const size = new Int32Array(S);
    let tot = 0;
    for (let s = 0; s < S; s++) {
      size[s] = Math.max(6, Math.floor((sw[s] / ssum) * n));
      tot += size[s];
    }
    for (let s = 0; tot < n; s = (s + 1) % S) {
      size[s]++;
      tot++;
    }
    for (let s = 0; tot > n; s = (s + 1) % S)
      if (size[s] > 6) {
        size[s]--;
        tot--;
      }

    leafCluster = new Int32Array(n);
    leafType = new Uint8Array(n);
    cParent[0] = -1;
    cLevel[0] = 0;
    cChildStart[0] = 1;
    cChildCount[0] = D;
    cLeafStart[0] = 0;
    cLeafEnd[0] = n;
    cName[0] = 'All domains';
    let leaf = 0,
      sys = 1 + D;
    for (let d = 0; d < D; d++) {
      const dom = 1 + d;
      cParent[dom] = 0;
      cLevel[dom] = 1;
      cKind[dom] = d % 8;
      cName[dom] =
        DOMAINS[d % DOMAINS.length] + (d >= DOMAINS.length ? ' ' + (Math.floor(d / DOMAINS.length) + 1) : '');
      cChildStart[dom] = sys;
      cChildCount[dom] = sysPer[d];
      cLeafStart[dom] = leaf;
      const taken = new Set();
      for (let k = 0; k < sysPer[d]; k++, sys++) {
        const s = sys - 1 - D,
          h = h32(sys, 17);
        let name = SVC_A[h % SVC_A.length] + '-' + SVC_B[(h >>> 8) % SVC_B.length];
        if (taken.has(name)) {
          let j = 2;
          while (taken.has(name + '-' + j)) j++;
          name += '-' + j;
        }
        taken.add(name);
        cName[sys] = name;
        cParent[sys] = dom;
        cLevel[sys] = 2;
        cLeafParent[sys] = 1;
        cKind[sys] = (h >>> 16) % 4;
        cLeafStart[sys] = leaf;
        cChildStart[sys] = leaf;
        cChildCount[sys] = size[s];
        const favored = KIND_FAVOR[cKind[sys]];
        for (let i = leaf; i < leaf + size[s]; i++) {
          leafCluster[i] = sys;
          leafType[i] = rnd(i, 7) < 0.45 ? favored : h32(i, 8) % 6;
        }
        leaf += size[s];
        cLeafEnd[sys] = leaf;
      }
      cLeafEnd[dom] = leaf;
    }

    // dependencies: domains depend on 2-4 domains; systems on 2-5 siblings and sometimes cross-domain
    const dDeps = [];
    for (let d = 0; d < D; d++) {
      const list = [],
        k = 2 + (h32(d, 21) % 3);
      for (let j = 0; list.length < k && j < 16; j++) {
        const dd = h32(d, 30 + j) % D;
        if (dd !== d && !list.includes(dd)) list.push(dd);
      }
      dDeps.push(list);
    }
    const sDepStart = new Int32Array(S + 1),
      sCrossStart = new Int32Array(S + 1);
    const sDeps = [],
      sCross = [];
    for (let s = 0; s < S; s++) {
      const c = s + 1 + D,
        dom = cParent[c],
        first = cChildStart[dom],
        m = cChildCount[dom];
      sDepStart[s] = sDeps.length;
      const k = Math.min(m - 1, 2 + (h32(c, 23) % 4)),
        local = [];
      for (let j = 0; local.length < k && j < 24; j++) {
        const t = first + (h32(c, 40 + j) % m);
        if (t !== c && !local.includes(t)) local.push(t);
      }
      sDeps.push(...local);
      sCrossStart[s] = sCross.length;
      if (rnd(c, 41) < 0.55) {
        const deps = dDeps[dom - 1],
          kk = 1 + (h32(c, 42) % 2);
        for (let j = 0; j < kk; j++) {
          const dd = 1 + deps[h32(c, 43 + j) % deps.length];
          sCross.push(cChildStart[dd] + (h32(c, 50 + j) % cChildCount[dd]));
        }
      }
    }
    sDepStart[S] = sDeps.length;
    sCrossStart[S] = sCross.length;

    // out-degree per leaf (heavy-tailed, mean about 2.3)
    outStart = new Int32Array(n + 1);
    for (let i = 0; i < n; i++) {
      const k = Math.min(12, 1 + Math.floor(-Math.log(1 - rnd(i, 1)) * 1.3));
      outStart[i + 1] = outStart[i] + k;
    }
    E = outStart[n];
    outTarget = new Int32Array(E);
    edgeType = new Uint8Array(E);
    inDeg = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      const c = leafCluster[i],
        s = c - 1 - D;
      const depN = sDepStart[s + 1] - sDepStart[s],
        crossN = sCrossStart[s + 1] - sCrossStart[s];
      for (let e = outStart[i], j = 0; e < outStart[i + 1]; e++, j++) {
        const u = rnd(i, 2 + j * 3);
        let tc = c;
        if (u >= 0.72 && depN > 0) {
          if (u < 0.92 || crossN === 0) tc = sDeps[sDepStart[s] + (h32(i, 3 + j * 3) % depN)];
          else tc = sCross[sCrossStart[s] + (h32(i, 3 + j * 3) % crossN)];
        }
        const tls = cLeafStart[tc],
          tsz = cLeafEnd[tc] - tls;
        let t = tls + (h32(i, 4 + j * 3) % tsz);
        if (t === i) t = tls + ((t - tls + 1) % tsz);
        outTarget[e] = t;
        edgeType[e] = tc === c ? h32(i, 5 + j * 3) % 3 : 0;
        inDeg[t]++;
      }
    }

    // aggregate cross-system edges into system pairs (each pair carries a circuit breaker)
    pairMap = new Map();
    const pa = [],
      pb = [],
      pc = [];
    for (let i = 0; i < n; i++) {
      const sa = leafCluster[i];
      for (let e = outStart[i]; e < outStart[i + 1]; e++) {
        const sb = leafCluster[outTarget[e]];
        if (sa === sb) continue;
        const key = sa * C + sb;
        let p = pairMap.get(key);
        if (p === undefined) {
          p = pa.length;
          pairMap.set(key, p);
          pa.push(sa);
          pb.push(sb);
          pc.push(0);
        }
        pc[p]++;
      }
    }
    P = pa.length;
    pairA = Int32Array.from(pa);
    pairB = Int32Array.from(pb);
    pairCount = Int32Array.from(pc);
    pairState = new Uint8Array(P);
    pairTrips = new Uint16Array(P);
    pairSince = new Uint16Array(P);
    pairProbesOk = new Uint8Array(P);
    pairBy = new Uint8Array(P);
    pairVer = new Uint32Array(P);
    domPairs = new Map();
    rootPairs = [];
    for (let p = 0; p < P; p++) {
      const u = rnd(pairA[p] * 7919 + pairB[p], 51);
      pairState[p] = u < 0.84 ? 0 : u < 0.91 ? 1 : u < 0.96 ? 2 : 3;
      const h = h32(p, 52);
      pairTrips[p] = pairState[p] === 2 ? 1 + (h % 40) : h % 3;
      pairSince[p] = 1 + ((h >>> 8) % 180);
      pairProbesOk[p] = (h >>> 16) % 10;
      pairBy[p] = (h >>> 20) % USERS.length;
      const da = cParent[pairA[p]],
        db = cParent[pairB[p]];
      if (da === db) {
        let l = domPairs.get(da);
        if (!l) domPairs.set(da, (l = []));
        l.push(p);
      } else rootPairs.push(p);
    }
    viewPairs = new Map(domPairs);
    viewPairs.set(0, rootPairs);
    views.clear();
    previews.clear();
    return {
      nodes: N,
      edges: E,
      clusters: C,
      domains: D,
      systems: S,
      pairs: P,
      ms: Math.round(performance.now() - t0),
    };
  }

  // ------------------------------------------------------- a graph of the page's (load)
  // GraphExplorerData as it arrives: checked whole before anything changes, so a rejected graph leaves the shown one
  // as it was. The answer is the first thing wrong, or null. The bounds: a view lays out its children in O(n^2)
  // (1,024 take ~0.1 s, 8,000 ~9 s), and the hierarchy's walks recurse per level.
  const MAX_CHILDREN = 1024,
    MAX_LEVELS = 256;
  function invalid(d) {
    if (!d || typeof d !== 'object') return 'the data must be an object';
    const { clusters: c, nodes: n, edges: e, types: t } = d;
    if (!c || !n || !e || !t) return 'clusters, nodes, edges and types are required';
    const typed = [
      ['clusters.parent', c.parent, Int32Array],
      ['clusters.type', c.type, Uint8Array],
      ['nodes.cluster', n.cluster, Int32Array],
      ['nodes.type', n.type, Uint8Array],
      ['edges.start', e.start, Int32Array],
      ['edges.target', e.target, Int32Array],
      ['edges.type', e.type, Uint8Array],
    ] as [string, ArrayBufferView, any][];
    for (const [name, v, T] of typed) {
      if (!(v instanceof T)) return `${name} must be an ${T.name}`;
      // a shared buffer stays the page's: it could change after the check
      if (!(v.buffer instanceof ArrayBuffer))
        return `${name} must not be backed by a SharedArrayBuffer: the page could change it after the check`;
    }
    // each index, holes too (every() skips them, and new Array(n) with an entry missing has one)
    const names = (v) => {
      if (!Array.isArray(v)) return false;
      for (let i = 0; i < v.length; i++) if (typeof v[i] !== 'string') return false;
      return true;
    };
    for (const k of ['cluster', 'node', 'edge']) if (!names(t[k])) return `types.${k} must be a list of names`;
    const nc = c.parent.length,
      nn = n.cluster.length,
      ne = e.target.length;
    if (!nc) return 'clusters: there must be a root (cluster 0)';
    if (!nn) return 'nodes: there must be at least one';
    // a node label or ref list is strings or GraphExplorerStrings (an object of offsets and bytes)
    const packed = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
    const sized = [
      ['clusters.type', c.type.length, nc],
      ['clusters.label', names(c.label) ? c.label.length : -1, nc],
      ['nodes.type', n.type.length, nn],
      ...(packed(n.label) ? [] : [['nodes.label', names(n.label) ? n.label.length : -1, nn]]),
      ...(packed(n.ref) ? [] : [['nodes.ref', names(n.ref) ? n.ref.length : -1, nn]]),
      ['edges.start', e.start.length, nn + 1],
      ['edges.type', e.type.length, ne],
    ] as [string, number, number][];
    if (c.ref !== undefined) sized.push(['clusters.ref', names(c.ref) ? c.ref.length : -1, nc]);
    for (const [name, got, want] of sized)
      if (got !== want)
        return got < 0 ? `${name} must be a list of strings` : `${name} has ${got} entries, ${want} expected`;
    // packed strings: both views of an ArrayBuffer and offsets that cut bytes into nn strings in order. The bytes need
    // no UTF-8 check: the decoder shows a byte that is no UTF-8 as U+FFFD, so bad bytes cost a label, nothing else.
    const viewWhy = (name, v, T) =>
      !(v instanceof T)
        ? `${name} must be an ${T.name}`
        : v.buffer instanceof ArrayBuffer
          ? null
          : `${name} must not be backed by a SharedArrayBuffer: the page could change it after the check`;
    for (const name of ['label', 'ref']) {
      const s = n[name],
        field = 'nodes.' + name;
      if (!packed(s)) continue;
      const why = viewWhy(field + '.offsets', s.offsets, Int32Array) ?? viewWhy(field + '.bytes', s.bytes, Uint8Array);
      if (why) return why;
      const o = s.offsets;
      if (o.length !== nn + 1) return `${field}.offsets has ${o.length} entries, ${nn + 1} expected`;
      if (o[0] !== 0) return `${field}.offsets[0] must be 0`;
      for (let i = 0; i < nn; i++)
        if (o[i + 1] < o[i]) return `${field}.offsets falls at string ${i}: it must not decrease`;
      if (o[nn] !== s.bytes.length)
        return `${field}.offsets[${nn}] is ${o[nn]}, the length of ${field}.bytes (${s.bytes.length}) expected`;
    }
    if (c.parent[0] !== -1) return 'clusters.parent[0] must be -1: cluster 0 is the root';
    // children per cluster (clusters or nodes) and levels: within what a view lays out and the hierarchy's walks hold
    const kids = new Int32Array(nc),
      held = new Int32Array(nc),
      level = new Uint16Array(nc);
    for (let i = 1; i < nc; i++) {
      const p = c.parent[i];
      if (p < 0 || p >= i) return `cluster ${i} has parent ${p}: a parent comes before its children (BFS order)`;
      if (p < c.parent[i - 1])
        return `cluster ${i} has parent ${p} after a child of ${c.parent[i - 1]}: the children of a cluster must be contiguous, the clusters in BFS order`;
      kids[p]++;
      if ((level[i] = level[p] + 1) >= MAX_LEVELS)
        return `cluster ${i} is at level ${level[i]}: at most ${MAX_LEVELS} cluster levels`;
    }
    for (let i = 0; i < nc; i++)
      if (c.type[i] >= t.cluster.length) return `cluster ${i} has type ${c.type[i]}, beyond types.cluster`;
    for (let i = 0; i < nn; i++) {
      const k = n.cluster[i];
      if (k < 0 || k >= nc) return `node ${i} is in cluster ${k}, which does not exist`;
      if (i && k < n.cluster[i - 1])
        return `node ${i} is in cluster ${k} after a node of ${n.cluster[i - 1]}: nodes are sorted by cluster`;
      if (kids[k]) return `cluster ${k} holds clusters and nodes: a cluster holds only one of them`;
      if (n.type[i] >= t.node.length) return `node ${i} has type ${n.type[i]}, beyond types.node`;
      held[k]++;
    }
    for (let i = 0; i < nc; i++) {
      if (!kids[i] && !held[i]) return `cluster ${i} is empty: it needs clusters or nodes`;
      if (kids[i] + held[i] > MAX_CHILDREN)
        return `cluster ${i} has ${kids[i] + held[i]} children, at most ${MAX_CHILDREN}`;
    }
    if (e.start[0] !== 0) return 'edges.start[0] must be 0';
    for (let i = 0; i < nn; i++)
      if (e.start[i + 1] < e.start[i]) return `edges.start falls at node ${i}: it must not decrease`;
    if (e.start[nn] !== ne) return `edges.start[${nn}] is ${e.start[nn]}, the length of edges.target (${ne}) expected`;
    for (let k = 0; k < ne; k++) {
      if (e.target[k] < 0 || e.target[k] >= nn) return `edge ${k} has target ${e.target[k]}, which is no node`;
      if (e.type[k] >= t.edge.length) return `edge ${k} has type ${e.type[k]}, beyond types.edge`;
    }
    return null;
  }

  // the lowest common ancestor of two clusters, and the child of `anc` that holds cluster c
  function lcaOf(a, b) {
    while (a !== b) {
      if (cLevel[a] >= cLevel[b]) a = cParent[a];
      else b = cParent[b];
    }
    return a;
  }
  function childOf(c, anc) {
    while (cParent[c] !== anc) c = cParent[c];
    return c;
  }

  /** the checked data in place of the graph: the hierarchy's ranges, the in-degrees and the aggregate pairs */
  function install(d) {
    const t0 = performance.now();
    simulate(false);
    abortSearch();
    EXT = true;
    TYPES = { cluster: d.types.cluster, node: d.types.node, edge: d.types.edge };
    C = d.clusters.parent.length;
    N = d.nodes.cluster.length;
    E = d.edges.target.length;
    D = S = 0;
    cParent = d.clusters.parent;
    cKind = d.clusters.type;
    cName = d.clusters.label;
    cRef = d.clusters.ref ?? null;
    leafCluster = d.nodes.cluster;
    leafType = d.nodes.type;
    LABELS = d.nodes.label;
    REFS = d.nodes.ref;
    outStart = d.edges.start;
    outTarget = d.edges.target;
    edgeType = d.edges.type;
    cLevel = new Uint16Array(C);
    cChildStart = new Int32Array(C);
    cChildCount = new Int32Array(C);
    cLeafStart = new Int32Array(C);
    cLeafEnd = new Int32Array(C);
    cLeafParent = new Uint8Array(C);
    cMembers = new Int32Array(C);
    for (let i = C - 1; i >= 1; i--) {
      const p = cParent[i];
      cChildStart[p] = i;
      cChildCount[p]++;
    }
    for (let i = 1; i < C; i++) cLevel[i] = cLevel[cParent[i]] + 1;
    for (let i = N - 1; i >= 0; i--) {
      const k = leafCluster[i];
      if (!cLeafParent[k]) cLeafEnd[k] = i + 1;
      cLeafParent[k] = 1;
      cLeafStart[k] = cChildStart[k] = i;
      cChildCount[k]++;
      cMembers[k]++;
    }
    for (let i = C - 1; i >= 1; i--) cMembers[cParent[i]] += cMembers[i];
    inDeg = new Int32Array(N);
    for (let k = 0; k < E; k++) inDeg[outTarget[k]]++;
    // links between two systems (leaf parents) bundled per pair, each pair drawn in the view of the lowest cluster
    // that holds both - like generate()'s, without breakers
    pairMap = new Map();
    const pa = [],
      pb = [],
      pc = [];
    for (let i = 0; i < N; i++) {
      const sa = leafCluster[i];
      for (let k = outStart[i]; k < outStart[i + 1]; k++) {
        const sb = leafCluster[outTarget[k]];
        if (sa === sb) continue;
        const key = sa * C + sb;
        let p = pairMap.get(key);
        if (p === undefined) {
          p = pa.length;
          pairMap.set(key, p);
          pa.push(sa);
          pb.push(sb);
          pc.push(0);
        }
        pc[p]++;
      }
    }
    P = pa.length;
    pairA = Int32Array.from(pa);
    pairB = Int32Array.from(pb);
    pairCount = Int32Array.from(pc);
    pairState = pairTrips = pairSince = pairProbesOk = pairBy = pairVer = null;
    domPairs = new Map();
    rootPairs = [];
    viewPairs = new Map();
    for (let p = 0; p < P; p++) {
      const l = lcaOf(pairA[p], pairB[p]);
      let list = viewPairs.get(l);
      if (!list) viewPairs.set(l, (list = []));
      list.push(p);
    }
    views.clear();
    previews.clear();
    layoutQueue.clear();
    clearTimeout(layoutTimer);
    layoutTimer = 0;
    clearTimeout(pendingFrame.timer);
    pendingFrame.timer = 0;
    pendingFrame.cam = null;
    lastCam = null;
    let depth = 0;
    for (let i = 0; i < C; i++) depth = Math.max(depth, cLevel[i]);
    return { nodes: N, edges: E, clusters: C, depth: depth + 1, pairs: P, ms: Math.round(performance.now() - t0) };
  }

  // --------------------------------------------------------------- labels
  // a loaded label or ref: from the page's list, or decoded from its packed UTF-8 when asked (GraphExplorerStrings)
  const UTF8 = new TextDecoder();
  const stringAt = (s, i) => (Array.isArray(s) ? s[i] : UTF8.decode(s.bytes.subarray(s.offsets[i], s.offsets[i + 1])));
  // a generated entity's name comes from its index; a loaded one's from the page
  const leafLabel = (i) => {
    if (EXT) return stringAt(LABELS, i);
    const h = h32(i, 99);
    return NOUN[h % 64] + '-' + ADJ[(h >>> 6) % 64] + '-' + ((h >>> 12) % 1000);
  };
  const leafRef = (i) => stringAt(REFS, i);
  const nodeType = (i) => (EXT ? TYPES.node[leafType[i]] : ENTITY_TYPES[leafType[i]]);
  const clusterType = (c) =>
    EXT ? TYPES.cluster[cKind[c]] : cLevel[c] === 0 ? 'Graph' : cLevel[c] === 1 ? 'Domain' : SYSTEM_KINDS[cKind[c]];
  const edgeName = (k) => (EXT ? TYPES.edge[edgeType[k]] : EDGE_TYPES[edgeType[k]]);
  // the page's id of a loaded node or cluster (none for a generated graph)
  const refOf = (leaf, idx) => (EXT ? (leaf ? leafRef(idx) : (cRef?.[idx] ?? undefined)) : undefined);
  const withRef = (o, leaf, idx) => {
    const ref = refOf(leaf, idx);
    if (ref !== undefined) o.ref = ref;
    return o;
  };
  const idOf = (kindLeaf, idx) => (kindLeaf ? 'n' : 'c') + idx;
  const parseId = (id) => ({ leaf: id[0] === 'n', idx: parseInt(id.slice(1), 10) });
  // an id of this graph (an answer for an id of a graph loaded before is empty)
  const known = (id) => {
    const { leaf, idx } = parseId(String(id));
    return idx >= 0 && idx < (leaf ? N : C);
  };
  // the entities below a cluster as ranges of indices, in the hierarchy's order (adjacent ones merged: one range for
  // every cluster of a generated graph)
  function rangesOf(c) {
    const out = [],
      walk = [c];
    while (walk.length) {
      const x = walk.pop();
      if (cLeafParent[x]) {
        const last = out[out.length - 1];
        if (last && last[1] === cLeafStart[x]) last[1] = cLeafEnd[x];
        else out.push([cLeafStart[x], cLeafEnd[x]]);
      } else for (let k = cChildStart[x] + cChildCount[x] - 1; k >= cChildStart[x]; k--) walk.push(k);
    }
    return out;
  }
  // whether cluster c is b or below it
  function under(c, b) {
    const lb = cLevel[b];
    while (cLevel[c] > lb) c = cParent[c];
    return c === b;
  }
  function pathOf(id) {
    const { leaf, idx } = parseId(id);
    const chain = [];
    if (!known(id)) return chain;
    let c = leaf ? leafCluster[idx] : idx;
    if (leaf) chain.push({ id, label: leafLabel(idx) });
    while (c >= 0) {
      chain.push({ id: 'c' + c, label: cName[c] });
      c = cParent[c];
    }
    return chain.reverse();
  }

  // ---------------------------------------------------------------- subtree
  // a node and its descendants down to `levels` levels, depth first - the records of a tree grid. A domain of a
  // million-node graph with two levels below it is its systems and their entities (tens of thousands of rows)
  function subtreeOf(id, levels) {
    const rows = [];
    const entity = (g, parent) =>
      rows.push(
        withRef(
          {
            id: 'n' + g,
            parent,
            label: leafLabel(g),
            kind: 'entity',
            type: nodeType(g),
            level: cLevel[leafCluster[g]] + 1,
            count: outStart[g + 1] - outStart[g] + inDeg[g],
            children: 0,
          },
          true,
          g,
        ),
      );
    const cluster = (c, parent, left) => {
      rows.push(
        withRef(
          {
            id: 'c' + c,
            parent,
            label: cName[c],
            kind: 'cluster',
            type: clusterType(c),
            level: cLevel[c],
            count: membersOf(c),
            children: cChildCount[c],
          },
          false,
          c,
        ),
      );
      if (left <= 1) return;
      const first = cChildStart[c],
        end = first + cChildCount[c];
      for (let k = first; k < end; k++)
        if (cLeafParent[c]) entity(k, 'c' + c);
        else cluster(k, 'c' + c, left - 1);
    };
    const { leaf, idx } = parseId(id);
    if (known(id)) {
      if (leaf) entity(idx, '');
      else cluster(idx, '', Math.max(1, levels | 0));
    }
    if (rows.length) rows[0].parent = '';
    return { t: 'subtree', id, levels, rows };
  }

  // ---------------------------------------------------------------- views
  function membersOf(c) {
    return EXT ? cMembers[c] : cLeafEnd[c] - cLeafStart[c];
  }

  function buildView(cid, wantLayout = true) {
    let v = views.get(cid);
    if (v) {
      if (v.dirty) refreshEdgeState(v);
      if (wantLayout && !v.laidOut) layoutView(v);
      return v;
    }
    const leafView = cLeafParent[cid] === 1;
    const start = cChildStart[cid],
      n = cChildCount[cid];
    v = { cid, leafView, start, n, edges: [], laidOut: false, dirty: false, sizes: null };
    v.type = new Uint8Array(n);
    v.members = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      v.type[i] = leafView ? leafType[start + i] : cKind[start + i];
      v.members[i] = leafView ? 1 : membersOf(start + i);
    }
    computeEdges(v);
    computeCycles(v);
    computeRank(v);
    computeRadii(v);
    views.set(cid, v);
    if (wantLayout) layoutView(v);
    return v;
  }

  function computeEdges(v) {
    const map = new Map(),
      raw = [];
    const add = (a, b, count, kind, type, pairs) => {
      const key = a * v.n + b;
      let e = map.get(key);
      if (!e) {
        e = { a, b, count: 0, kind, type, pairs: [] };
        map.set(key, e);
        raw.push(e);
      }
      e.count += count;
      if (pairs) e.pairs.push(...pairs);
    };
    if (v.leafView) {
      const s = v.start,
        end = s + v.n;
      for (let i = s; i < end; i++)
        for (let e = outStart[i]; e < outStart[i + 1]; e++) {
          const t = outTarget[e];
          if (t >= s && t < end && t !== i) add(i - s, t - s, 1, 'leaf', edgeName(e), null);
        }
    } else {
      // the pairs whose lowest common cluster this is, between the children that hold their two ends
      for (const p of viewPairs.get(v.cid) ?? [])
        add(childOf(pairA[p], v.cid) - v.start, childOf(pairB[p], v.cid) - v.start, pairCount[p], 'agg', 'calls', [p]);
    }
    // merge bidirectional pairs into one edge with two counts
    const out = [];
    for (const e of raw) {
      if (e.merged) continue;
      const back = map.get(e.b * v.n + e.a);
      if (back && back !== e) {
        back.merged = true;
        out.push({
          a: e.a,
          b: e.b,
          count: e.count,
          count2: back.count,
          bidir: true,
          back: false,
          kind: e.kind,
          type: e.type,
          pairs: e.pairs.concat(back.pairs),
          ver: 0,
        });
      } else
        out.push({
          a: e.a,
          b: e.b,
          count: e.count,
          count2: 0,
          bidir: false,
          back: false,
          kind: e.kind,
          type: e.type,
          pairs: e.pairs,
          ver: 0,
        });
    }
    v.edges = out;
    v.adj = Array.from({ length: v.n }, () => []);
    out.forEach((e, i) => {
      v.adj[e.a].push(i);
      v.adj[e.b].push(i);
    });
    refreshEdgeState(v);
  }

  // breaker facts of an edge: one pair, or the worst of its member pairs (aggregates)
  function refreshEdgeState(v) {
    for (const e of v.edges) {
      // a loaded graph has no breakers
      if (EXT || !e.pairs.length) {
        e.breaker = null;
        continue;
      }
      let worst = 0,
        trips = 0,
        since = 65535,
        probesOk = 0,
        by = 0,
        open = 0,
        half = 0,
        cut = 0,
        ver = 0;
      for (const p of e.pairs) {
        const st = pairState[p];
        if (SEVERITY[st] > SEVERITY[worst]) {
          worst = st;
          probesOk = pairProbesOk[p];
          by = pairBy[p];
        }
        if (st === 2) open++;
        else if (st === 1) half++;
        else if (st === 3) cut++;
        trips += pairTrips[p];
        if (st !== 0) since = Math.min(since, pairSince[p]);
        ver += pairVer[p];
      }
      const members = e.pairs.length;
      e.breaker = {
        state: STATE_NAMES[worst],
        trips,
        since: since === 65535 ? 0 : since,
        probes: 10,
        probesOk,
        by: USERS[by],
        open,
        half,
        cut,
        members,
        aggregate: members > (e.bidir ? 2 : 1),
        openShare: +(open / members).toFixed(3),
        badShare: +((open + half + cut) / members).toFixed(3),
      };
      e.traffic = e.count >= 2;
      e.ver = ver;
    }
    v.dirty = false;
  }

  // Tarjan (iterative) for strongly connected components, DFS for back-edges
  function computeCycles(v) {
    const n = v.n,
      out = Array.from({ length: n }, () => []);
    v.edges.forEach((e, i) => {
      out[e.a].push([e.b, i]);
      if (e.bidir) out[e.b].push([e.a, i]);
    });
    const index = new Int32Array(n).fill(-1),
      low = new Int32Array(n),
      onStack = new Uint8Array(n);
    const comp = new Int32Array(n).fill(-1),
      stack = [];
    let idx = 0,
      nComp = 0;
    for (let s = 0; s < n; s++) {
      if (index[s] !== -1) continue;
      const work = [[s, 0]];
      index[s] = low[s] = idx++;
      stack.push(s);
      onStack[s] = 1;
      while (work.length) {
        const top = work[work.length - 1],
          u = top[0];
        if (top[1] < out[u].length) {
          const w = out[u][top[1]++][0];
          if (index[w] === -1) {
            index[w] = low[w] = idx++;
            stack.push(w);
            onStack[w] = 1;
            work.push([w, 0]);
          } else if (onStack[w]) low[u] = Math.min(low[u], index[w]);
        } else {
          work.pop();
          if (work.length) {
            const p = work[work.length - 1][0];
            low[p] = Math.min(low[p], low[u]);
          }
          if (low[u] === index[u]) {
            let w;
            do {
              w = stack.pop();
              onStack[w] = 0;
              comp[w] = nComp;
            } while (w !== u);
            nComp++;
          }
        }
      }
    }
    const compSize = new Int32Array(nComp);
    for (let i = 0; i < n; i++) compSize[comp[i]]++;
    v.scc = new Int32Array(n);
    for (let i = 0; i < n; i++) v.scc[i] = compSize[comp[i]];
    v.comp = comp;
    // back-edges: an edge to a node that is still on the DFS stack (gray)
    const color = new Uint8Array(n);
    const markCycles = () => {
      for (const e of v.edges) e.cycle = e.back && v.scc[e.a] <= 12;
    };
    for (let s = 0; s < n; s++) {
      if (color[s]) continue;
      const work = [[s, 0]];
      color[s] = 1;
      while (work.length) {
        const top = work[work.length - 1],
          u = top[0];
        if (top[1] < out[u].length) {
          const [w, ei] = out[u][top[1]++];
          const e = v.edges[ei];
          if (e.bidir) continue;
          if (color[w] === 1) e.back = true;
          else if (color[w] === 0) {
            color[w] = 1;
            work.push([w, 0]);
          }
        } else {
          color[u] = 2;
          work.pop();
        }
      }
    }
    markCycles();
  }

  function computeRank(v) {
    v.degree = new Float64Array(v.n);
    for (const e of v.edges) {
      v.degree[e.a] += e.count + e.count2;
      v.degree[e.b] += e.count + e.count2;
    }
    v.rank = new Float64Array(v.n);
    for (let i = 0; i < v.n; i++)
      v.rank[i] = Math.log2(1 + v.degree[i]) + Math.log2(1 + v.members[i]) * 0.6 + rnd(v.cid * 31 + i, 77) * 0.01;
    v.order = Int32Array.from({ length: v.n }, (_, i) => i).sort((a, b) => v.rank[b] - v.rank[a]);
  }

  function computeRadii(v) {
    const n = v.n;
    v.r = new Float32Array(n);
    if (v.leafView) {
      const r = Math.min(0.045, 0.42 / Math.sqrt(n));
      v.r.fill(r);
      return;
    }
    let sum = 0;
    for (let i = 0; i < n; i++) sum += v.members[i];
    for (let i = 0; i < n; i++) v.r[i] = Math.min(0.24, Math.sqrt((0.4 * v.members[i]) / sum));
  }

  // golden-angle spiral, highest rank in the middle
  function phyllotaxis(n, order, r, x, y) {
    const golden = Math.PI * (3 - Math.sqrt(5));
    let maxR = 0;
    for (let i = 0; i < n; i++) maxR = Math.max(maxR, r[i]);
    for (let k = 0; k < n; k++) {
      const i = order[k],
        rad = Math.sqrt((k + 0.5) / n) * Math.max(0.2, 0.92 - maxR),
        a = k * golden;
      x[i] = Math.cos(a) * rad;
      y[i] = Math.sin(a) * rad;
    }
  }

  function layoutView(v) {
    const n = v.n,
      r = v.r;
    const x = new Float64Array(n),
      y = new Float64Array(n);
    phyllotaxis(n, v.order, r, x, y);
    if (n > 1) {
      const ea = v.edges.map((e) => e.a),
        eb = v.edges.map((e) => e.b);
      const ew = v.edges.map((e) => Math.min(3, 0.4 + Math.log2(1 + e.count + e.count2) * 0.35));
      const k = Math.sqrt(1 / n) * 0.75,
        k2 = k * k;
      const dx = new Float64Array(n),
        dy = new Float64Array(n);
      let temp = 0.08;
      const iters = n > 220 ? 70 : 100;
      for (let it = 0; it < iters; it++) {
        dx.fill(0);
        dy.fill(0);
        for (let i = 0; i < n; i++) {
          const xi = x[i],
            yi = y[i],
            ri = r[i];
          for (let j = i + 1; j < n; j++) {
            let ddx = xi - x[j],
              ddy = yi - y[j];
            let d2 = ddx * ddx + ddy * ddy;
            if (d2 < 1e-12) {
              ddx = 1e-4 * ((i % 7) - 3);
              ddy = 1e-4 * ((j % 5) - 2);
              d2 = ddx * ddx + ddy * ddy;
            }
            const d = Math.sqrt(d2),
              min = ri + r[j] + 0.012;
            let f = k2 / d;
            if (d < min) f += (min - d) * 6;
            const fx = (ddx / d) * f,
              fy = (ddy / d) * f;
            dx[i] += fx;
            dy[i] += fy;
            dx[j] -= fx;
            dy[j] -= fy;
          }
        }
        for (let m = 0; m < ea.length; m++) {
          const a = ea[m],
            b = eb[m];
          const ddx = x[b] - x[a],
            ddy = y[b] - y[a];
          const d = Math.sqrt(ddx * ddx + ddy * ddy) + 1e-9;
          const f = ((d * d) / k) * ew[m] * 0.5;
          dx[a] += (ddx / d) * f;
          dy[a] += (ddy / d) * f;
          dx[b] -= (ddx / d) * f;
          dy[b] -= (ddy / d) * f;
        }
        for (let i = 0; i < n; i++) {
          dx[i] -= x[i] * k * 2.2;
          dy[i] -= y[i] * k * 2.2;
          const len = Math.sqrt(dx[i] * dx[i] + dy[i] * dy[i]) + 1e-12,
            step = Math.min(len, temp);
          x[i] += (dx[i] / len) * step;
          y[i] += (dy[i] / len) * step;
        }
        temp *= 0.965;
      }
      // fit into the unit disk, then relax overlaps
      let s = Infinity;
      for (let i = 0; i < n; i++) {
        const d = Math.sqrt(x[i] * x[i] + y[i] * y[i]);
        if (d > 1e-6) s = Math.min(s, (0.94 - r[i]) / d);
      }
      if (!Number.isFinite(s)) s = 1;
      for (let i = 0; i < n; i++) {
        x[i] *= s;
        y[i] *= s;
      }
      for (let pass = 0; pass < 6; pass++) {
        for (let i = 0; i < n; i++)
          for (let j = i + 1; j < n; j++) {
            const ddx = x[j] - x[i],
              ddy = y[j] - y[i],
              d = Math.sqrt(ddx * ddx + ddy * ddy) + 1e-9,
              min = r[i] + r[j] + 0.006;
            if (d < min) {
              const push = (min - d) / 2;
              x[i] -= (ddx / d) * push;
              y[i] -= (ddy / d) * push;
              x[j] += (ddx / d) * push;
              y[j] += (ddy / d) * push;
            }
          }
        for (let i = 0; i < n; i++) {
          const d = Math.sqrt(x[i] * x[i] + y[i] * y[i]),
            max = 0.96 - r[i];
          if (d > max) {
            x[i] *= max / d;
            y[i] *= max / d;
          }
        }
      }
    }
    v.x = Float32Array.from(x);
    v.y = Float32Array.from(y);
    typeOrderFor(v);
    v.laidOut = true;
  }

  function typeOrderFor(l) {
    const n = l.type.length,
      buckets = Array.from({ length: 8 }, () => []);
    for (let i = 0; i < n; i++) buckets[l.type[i] & 7].push(i);
    l.typeStart = new Int32Array(9);
    l.typeOrder = new Int32Array(n);
    let k = 0;
    for (let t = 0; t < 8; t++) {
      l.typeStart[t] = k;
      for (const i of buckets[t]) l.typeOrder[k++] = i;
    }
    l.typeStart[8] = k;
  }

  // cheap far-field layout for a cluster we have not laid out yet
  function preview(cid) {
    const done = views.get(cid);
    if (done && done.laidOut) return done;
    let p = previews.get(cid);
    if (p) return p;
    const leafView = cLeafParent[cid] === 1,
      start = cChildStart[cid],
      n = cChildCount[cid];
    const type = new Uint8Array(n),
      members = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      type[i] = leafView ? leafType[start + i] : cKind[start + i];
      members[i] = leafView ? 1 : membersOf(start + i);
    }
    const r = new Float32Array(n);
    if (leafView) r.fill(Math.min(0.045, 0.42 / Math.sqrt(n)));
    else {
      let sum = 0;
      for (let i = 0; i < n; i++) sum += members[i];
      for (let i = 0; i < n; i++) r[i] = Math.min(0.24, Math.sqrt((0.4 * members[i]) / sum));
    }
    const order = Int32Array.from({ length: n }, (_, i) => i).sort(
      (a, b) => members[b] - members[a] || h32(cid, a) - h32(cid, b),
    );
    const x = new Float32Array(n),
      y = new Float32Array(n);
    phyllotaxis(n, order, r, x, y);
    p = { cid, n, type, r, x, y, laidOut: false, edges: [] };
    typeOrderFor(p);
    previews.set(cid, p);
    return p;
  }

  // lazy layouts for big-on-screen children, time-sliced so camera frames stay responsive
  const layoutQueue = new Map(); // cid -> priority (screen radius)
  let layoutTimer = 0,
    lastCam = null;
  function requestLayout(cid, prio) {
    const v = views.get(cid);
    if (v && v.laidOut) return;
    layoutQueue.set(cid, Math.max(prio, layoutQueue.get(cid) ?? 0));
    if (!layoutTimer) layoutTimer = setTimeout(runLayouts, 16);
  }
  function runLayouts() {
    layoutTimer = 0;
    const t0 = performance.now();
    let did = 0;
    const todo = [...layoutQueue.entries()].sort((a, b) => b[1] - a[1]);
    for (const [cid] of todo) {
      layoutQueue.delete(cid);
      buildView(cid, true);
      previews.delete(cid);
      did++;
      if (performance.now() - t0 > 12) break;
    }
    if (layoutQueue.size) layoutTimer = setTimeout(runLayouts, 0);
    if (did && lastCam) scheduleFrame(lastCam);
  }

  // ------------------------------------------------------------ edge rules
  let rules = [],
    ruleVersion = 1;
  // the layers the worker draws itself: the lines (relations) and the names beside small nodes (nodes)
  let showNodes = true,
    showRelations = true;
  const DEFAULT_STYLE = { tone: 'muted', width: 1, arrow: 'end' };
  function getField(o, path) {
    for (const k of path.split('.')) {
      if (o == null) return undefined;
      o = o[k];
    }
    return o;
  }
  function matches(when, f) {
    for (const c of when || []) {
      const val = getField(f, c.field);
      if ('equals' in c && val !== c.equals) return false;
      if (c.in && !c.in.includes(val)) return false;
      if ('exists' in c && (val !== undefined && val !== null) !== c.exists) return false;
      if ('gte' in c && !(typeof val === 'number' && val >= c.gte)) return false;
      if ('lte' in c && !(typeof val === 'number' && val <= c.lte)) return false;
    }
    return true;
  }
  function factsOf(e) {
    return {
      kind: e.kind,
      type: e.type,
      count: e.count + e.count2,
      bidir: e.bidir,
      back: e.back,
      cycle: !!e.cycle,
      traffic: !!e.traffic,
      breaker: e.breaker || undefined,
    };
  }
  function styleOf(e) {
    const key = ruleVersion + ':' + e.ver + ':' + (e.breaker ? e.breaker.state : '');
    if (e.styleKey === key) return e.style;
    const f = factsOf(e);
    let best = null;
    for (const r of rules)
      if (
        matches(r.when, f) &&
        (!best || r.priority > best.priority || (r.priority === best.priority && r.order > best.order))
      )
        best = r;
    const s = Object.assign({}, DEFAULT_STYLE, best ? best.style : null);
    // cycle overlay: back-edges of small cycles curve around and take the accent (big strongly connected levels stay calm)
    if (f.cycle) {
      s.route = s.route || 'around';
      if (s.tone === 'muted') {
        s.tone = 'accent';
        s.dash = s.dash || [5, 4];
      }
    }
    if (s.dash && !s.dash.length) s.dash = null;
    e.style = s;
    e.styleKey = key;
    return s;
  }

  // ------------------------------------------------------------ rendering
  let canvas = null,
    ctx = null;
  let palette = {
    paper: '#ffffff',
    ink: '#111111',
    muted: '#71717a',
    border: '#e4e4e7',
    ring: '#2563eb',
    tones: {
      muted: '#a1a1aa',
      ink: '#18181b',
      accent: '#7c3aed',
      link: '#2563eb',
      ok: '#16a34a',
      warn: '#d97706',
      danger: '#dc2626',
    },
    cat: ['#e76e50', '#2a9d90', '#274754', '#e8c468', '#f4a462', '#8b5cf6', '#ec4899', '#14b8a6'],
    font: 'system-ui, sans-serif',
    dark: false,
  };
  let selfStats: Record<string, number> = { ms: 0, dots: 0, edges: 0, labels: 0 };
  // far-field dots go straight into pixels: one putImageData instead of tens of thousands of fillRect calls
  let dotCanvas = null,
    dotCtx = null,
    dotImg = null,
    dotBuf = null,
    probeCtx = null;
  const rgbaCache = new Map();
  function rgba(color, a) {
    let base = rgbaCache.get(color);
    if (!base) {
      probeCtx = probeCtx || new OffscreenCanvas(1, 1).getContext('2d', { willReadFrequently: true });
      probeCtx.clearRect(0, 0, 1, 1);
      probeCtx.fillStyle = '#888';
      probeCtx.fillStyle = color;
      probeCtx.fillRect(0, 0, 1, 1);
      const d = probeCtx.getImageData(0, 0, 1, 1).data;
      base = [d[0], d[1], d[2]];
      rgbaCache.set(color, base);
    }
    return ((Math.round(a * 255) << 24) | (base[2] << 16) | (base[1] << 8) | base[0]) >>> 0;
  }

  const pendingFrame = { cam: null, timer: 0 };
  // never let a re-render for an older camera replace a newer pending one
  function scheduleFrame(cam) {
    if (!pendingFrame.cam || cam.id >= pendingFrame.cam.id) pendingFrame.cam = cam;
    if (!pendingFrame.timer)
      pendingFrame.timer = setTimeout(() => {
        pendingFrame.timer = 0;
        const c = pendingFrame.cam;
        pendingFrame.cam = null;
        if (c) renderFrame(c);
      }, 0);
  }

  const alpha = (color, a) => {
    ctx.globalAlpha = a;
    return color;
  };

  // anchor of a DOM box: cluster cards sit at the top inside their disk, everything else is centered
  function anchorBox(isCluster, tier, sx, sy, rs, bw, bh) {
    if (isCluster && tier === 2) return [sx - bw / 2, Math.max(sy - rs * 0.86 + 6, sy - rs + 4)];
    return [sx - bw / 2, sy - bh / 2];
  }

  // drawn radius: clusters are containers (their disk), entities stay dots; their layout radius is spacing only
  const drawR = (isCluster, rs) => (isCluster ? Math.max(1.6, rs) : Math.min(6, Math.max(2.5, rs * 0.18)));

  function renderFrame(cam) {
    const t0 = performance.now();
    lastCam = cam;
    const cid = cam.view;
    const v = buildView(cid, true);
    const W = Math.max(1, Math.round(cam.w * cam.dpr)),
      H = Math.max(1, Math.round(cam.h * cam.dpr));
    if (!canvas || canvas.width !== W || canvas.height !== H) {
      canvas = new OffscreenCanvas(W, H);
      ctx = canvas.getContext('2d');
    }
    ctx.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, cam.w, cam.h);
    const z = cam.z,
      ox = cam.w / 2 - cam.cx * z,
      oy = cam.h / 2 - cam.cy * z;
    const vw = cam.w,
      vh = cam.h;
    let dots = 0,
      segs = 0,
      labels = 0;
    if (!dotCanvas || dotCanvas.width !== W || dotCanvas.height !== H) {
      dotCanvas = new OffscreenCanvas(W, H);
      dotCtx = dotCanvas.getContext('2d');
      dotImg = dotCtx.createImageData(W, H);
      dotBuf = new Uint32Array(dotImg.data.buffer);
    } else dotBuf.fill(0);
    const ds = cam.dpr >= 1.5 ? 3 : 2,
      dpr = cam.dpr;
    let usedDots = false;
    // far field of one cluster: its children as dots (1-2 px straight into the ImageData, bigger ones as arcs)
    const farField = (l, x0, y0, r0, a) => {
      for (let t = 0; t < 8; t++) {
        const from = l.typeStart[t],
          to = l.typeStart[t + 1];
        if (from === to) continue;
        const px32 = rgba(palette.cat[t], a);
        ctx.fillStyle = alpha(palette.cat[t], a);
        let pathOpen = false;
        for (let k = from; k < to; k++) {
          const j = l.typeOrder[k];
          const gx = x0 + l.x[j] * r0,
            gy = y0 + l.y[j] * r0,
            gr = l.r[j] * r0;
          if (gx < -4 || gx > vw + 4 || gy < -4 || gy > vh + 4) continue;
          if (gr < 1.3) {
            const px = Math.round(gx * dpr) - 1,
              py = Math.round(gy * dpr) - 1;
            if (px >= 0 && py >= 0 && px + ds <= W && py + ds <= H) {
              for (let yy = 0; yy < ds; yy++) {
                const row = (py + yy) * W + px;
                for (let xx = 0; xx < ds; xx++) dotBuf[row + xx] = px32;
              }
              usedDots = true;
            }
          } else {
            if (!pathOpen) {
              ctx.beginPath();
              pathOpen = true;
            }
            ctx.moveTo(gx + gr, gy);
            ctx.arc(gx, gy, gr, 0, Math.PI * 2);
          }
          dots++;
        }
        if (pathOpen) ctx.fill();
      }
    };

    // backdrop: the parent level, dimmed, with the edges that leave this cluster rising into it
    if (cid !== 0) {
      const pv = buildView(cParent[cid], true),
        fi = cid - pv.start;
      const fx = pv.x[fi],
        fy = pv.y[fi],
        fr = pv.r[fi];
      const tx = (x) => ((x - fx) / fr) * z + ox,
        ty = (y) => ((y - fy) / fr) * z + oy;
      let backdropDots = 0;
      for (let j = 0; j < pv.n; j++) {
        if (j === fi) continue;
        const sx = tx(pv.x[j]),
          sy = ty(pv.y[j]),
          rs = (pv.r[j] / fr) * z;
        if (sx + rs < -50 || sx - rs > vw + 50 || sy + rs < -50 || sy - rs > vh + 50) continue;
        const col = palette.cat[pv.type[j] & 7];
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(1.5, rs), 0, Math.PI * 2);
        ctx.fillStyle = alpha(col, 0.05);
        ctx.fill();
        ctx.strokeStyle = alpha(col, 0.28);
        ctx.lineWidth = 1;
        ctx.stroke();
        // the sibling's contents, so a neighbour panned into view is never an empty disk
        const sc = pv.start + j;
        if (rs >= 6 && backdropDots < 60000) {
          if (rs > 120) requestLayout(sc, rs * 0.5);
          const l = preview(sc),
            d0 = dots;
          if (cLeafParent[sc]) farField(l, sx, sy, rs, 0.4);
          else {
            const cs = cChildStart[sc];
            for (let t = 0; t < 8; t++) {
              ctx.beginPath();
              let any = false;
              for (let k = 0; k < l.n; k++) {
                if ((l.type[k] & 7) !== t) continue;
                const gx = sx + l.x[k] * rs,
                  gy = sy + l.y[k] * rs,
                  gr = l.r[k] * rs;
                if (gx + gr < 0 || gx - gr > vw || gy + gr < 0 || gy - gr > vh || gr < 1.5) continue;
                ctx.moveTo(gx + gr, gy);
                ctx.arc(gx, gy, gr, 0, Math.PI * 2);
                any = true;
              }
              if (any) {
                ctx.strokeStyle = alpha(palette.cat[t], 0.3);
                ctx.lineWidth = 1;
                ctx.stroke();
              }
            }
            for (let k = 0; k < l.n && backdropDots + dots - d0 < 60000; k++) {
              const gx = sx + l.x[k] * rs,
                gy = sy + l.y[k] * rs,
                gr = l.r[k] * rs;
              if (gr < 4 || gx + gr < 0 || gx - gr > vw || gy + gr < 0 || gy - gr > vh) continue;
              farField(preview(cs + k), gx, gy, gr, 0.4);
            }
          }
          backdropDots += dots - d0;
        }
        if (showNodes && rs > 16 && labels < 80) {
          ctx.globalAlpha = 0.55;
          ctx.fillStyle = palette.muted;
          ctx.font = '11px ' + palette.font;
          ctx.textAlign = 'center';
          ctx.fillText(cName[pv.start + j], sx, sy + 4);
          labels++;
        }
      }
      const picked = (cam.sel && cam.sel.length > 0) || !!cam.edge;
      for (const e of showRelations ? pv.edges : []) {
        const incident = e.a === fi || e.b === fi;
        const st = styleOf(e);
        let ax = tx(pv.x[e.a]),
          ay = ty(pv.y[e.a]),
          bx = tx(pv.x[e.b]),
          by = ty(pv.y[e.b]);
        if (incident) {
          const len = Math.hypot(bx - ax, by - ay) || 1,
            ux = (bx - ax) / len,
            uy = (by - ay) / len;
          if (e.a === fi) {
            ax += ux * z;
            ay += uy * z;
          } else {
            bx -= ux * z;
            by -= uy * z;
          }
        }
        ctx.globalAlpha = incident ? (picked ? 0.3 : 0.7) : 0.1;
        ctx.strokeStyle = palette.tones[st.tone] || palette.tones.muted;
        ctx.lineWidth = incident ? Math.min(4, 1 + Math.log10(e.count + e.count2 + 1)) : 0.75;
        ctx.setLineDash(incident && st.dash ? st.dash : []);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
        segs++;
      }
      ctx.setLineDash([]);
      // depth: dim everything outside the focus disk
      ctx.globalAlpha = palette.dark ? 0.4 : 0.32;
      ctx.fillStyle = palette.paper;
      ctx.beginPath();
      ctx.rect(0, 0, vw, vh);
      ctx.arc(ox, oy, z, 0, Math.PI * 2, true);
      ctx.fill('evenodd');
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ox, oy, z, 0, Math.PI * 2);
      ctx.stroke();
    }

    // children in screen space
    const n = v.n,
      sx = new Float32Array(n),
      sy = new Float32Array(n),
      rs = new Float32Array(n);
    const vis = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      sx[i] = v.x[i] * z + ox;
      sy[i] = v.y[i] * z + oy;
      rs[i] = v.r[i] * z;
      vis[i] = sx[i] + rs[i] > -40 && sx[i] - rs[i] < vw + 40 && sy[i] + rs[i] > -40 && sy[i] - rs[i] < vh + 40 ? 1 : 0;
    }
    const sel = new Set<number>(cam.sel || []);
    const pair = Array.isArray(cam.edge) && cam.edge.length === 2 ? cam.edge : null;
    const hl = new Set();
    const focusNodes = [...sel];
    if (pair) focusNodes.push(pair[0], pair[1]);
    if (cam.hover >= 0) focusNodes.push(cam.hover);
    for (const f of focusNodes) {
      hl.add(f);
      if (pair) continue;
      for (const ei of v.adj[f] || []) {
        const e = v.edges[ei];
        hl.add(e.a);
        hl.add(e.b);
      }
    }
    const dimming = focusNodes.length > 0;

    // tiers: aggregate (done by the hierarchy), cull (vis), demote (caps + box collision)
    const tiers = new Int8Array(n).fill(-1);
    const sizes = v.sizes;
    const cell = 96,
      grid = new Map(),
      boxes = [];
    const fits = (x, y, w, h) => {
      const pad = 3,
        x0 = Math.floor((x - pad) / cell),
        x1 = Math.floor((x + w + pad) / cell),
        y0 = Math.floor((y - pad) / cell),
        y1 = Math.floor((y + h + pad) / cell);
      for (let gx = x0; gx <= x1; gx++)
        for (let gy = y0; gy <= y1; gy++) {
          const list = grid.get(gx * 100003 + gy);
          if (!list) continue;
          for (const b of list)
            if (x < b[0] + b[2] + pad && x + w + pad > b[0] && y < b[1] + b[3] + pad && y + h + pad > b[1])
              return false;
        }
      return true;
    };
    const place = (x, y, w, h) => {
      const b = [x, y, w, h];
      boxes.push(b);
      const x0 = Math.floor(x / cell),
        x1 = Math.floor((x + w) / cell),
        y0 = Math.floor(y / cell),
        y1 = Math.floor((y + h) / cell);
      for (let gx = x0; gx <= x1; gx++)
        for (let gy = y0; gy <= y1; gy++) {
          const k = gx * 100003 + gy;
          let l = grid.get(k);
          if (!l) grid.set(k, (l = []));
          l.push(b);
        }
    };
    const isCluster = !v.leafView;
    const order = [];
    const pushed = new Uint8Array(n);
    for (const f of [...sel, cam.hover, cam.kbd])
      if (f >= 0 && f < n && !pushed[f]) {
        pushed[f] = 1;
        order.push(f);
      }
    for (const i of v.order) if (!pushed[i]) order.push(i);
    let cards = 0,
      chips = 0;
    const chipMin = isCluster ? 24 : 7,
      cardMin = isCluster ? 200 : 40;
    for (const i of order) {
      if (!vis[i]) continue;
      tiers[i] = 0;
      const d = rs[i] * 2,
        forced = sel.has(i) || i === cam.hover || i === cam.kbd;
      const cw = sizes ? sizes[i * 4 + 2] : isCluster ? 248 : 220,
        ch = sizes ? sizes[i * 4 + 3] : isCluster ? 104 : 92;
      const pw = sizes ? sizes[i * 4] : isCluster ? 150 : 140,
        ph = sizes ? sizes[i * 4 + 1] : 28;
      if (d >= cardMin && cards < 120 && (!isCluster || rs[i] * 1.6 > cw)) {
        const [x, y] = anchorBox(isCluster, 2, sx[i], sy[i], rs[i], cw, ch);
        if (forced || fits(x, y, cw, ch)) {
          place(x, y, cw, ch);
          tiers[i] = 2;
          cards++;
          continue;
        }
      }
      if ((d >= chipMin || forced) && chips < 300) {
        const [x, y] = anchorBox(isCluster, 1, sx[i], sy[i], rs[i], pw, ph);
        if (forced || fits(x, y, pw, ph)) {
          place(x, y, pw, ph);
          tiers[i] = 1;
          chips++;
        }
      }
    }

    // children: disks (clusters) or dots (entities), then their own children as far-field dots
    for (let t = 0; t < 8; t++) {
      const col = palette.cat[t];
      for (let pass = 0; pass < 2; pass++) {
        // pass 0: highlighted, pass 1: dimmed
        ctx.beginPath();
        let any = false;
        for (let i = 0; i < n; i++) {
          if (!vis[i] || (v.type[i] & 7) !== t) continue;
          const dim = dimming && !hl.has(i);
          if ((pass === 1) !== dim) continue;
          const dr = drawR(isCluster, rs[i]);
          ctx.moveTo(sx[i] + dr, sy[i]);
          ctx.arc(sx[i], sy[i], dr, 0, Math.PI * 2);
          any = true;
        }
        if (!any) continue;
        if (isCluster) {
          ctx.fillStyle = alpha(col, pass ? 0.03 : 0.07);
          ctx.fill();
          ctx.strokeStyle = alpha(col, pass ? 0.22 : 0.6);
          ctx.lineWidth = 1.25;
          ctx.stroke();
        } else {
          ctx.fillStyle = alpha(col, pass ? 0.25 : 0.95);
          ctx.fill();
        }
      }
    }
    if (isCluster) {
      let innerSegs = 0;
      for (let i = 0; i < n; i++) {
        if (!vis[i] || rs[i] < 3) continue;
        const cc = v.start + i;
        const l = preview(cc);
        if (rs[i] > 36) requestLayout(cc, rs[i]);
        const dim = dimming && !hl.has(i);
        farField(l, sx[i], sy[i], rs[i], dim ? 0.2 : cLeafParent[cc] ? 0.85 : 0.55);
        // inner edges of a child that is big on screen and already laid out
        if (showRelations && rs[i] > 170 && l.laidOut && innerSegs < 6000) {
          ctx.strokeStyle = alpha(palette.muted, dim ? 0.06 : 0.22);
          ctx.lineWidth = 0.75;
          ctx.beginPath();
          for (const e of l.edges) {
            ctx.moveTo(sx[i] + l.x[e.a] * rs[i], sy[i] + l.y[e.a] * rs[i]);
            ctx.lineTo(sx[i] + l.x[e.b] * rs[i], sy[i] + l.y[e.b] * rs[i]);
            if (++innerSegs >= 6000) break;
          }
          ctx.stroke();
          segs += l.edges.length;
        }
      }
    }
    if (usedDots) {
      dotCtx.putImageData(dotImg, 0, 0);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.drawImage(dotCanvas, 0, 0);
      ctx.restore();
    }

    // bulk edges, batched by stroke style
    const buckets = new Map();
    for (let ei = 0; showRelations && ei < v.edges.length; ei++) {
      const e = v.edges[ei];
      const a = e.a,
        b = e.b;
      if (!vis[a] && !vis[b]) {
        const minx = Math.min(sx[a], sx[b]),
          maxx = Math.max(sx[a], sx[b]),
          miny = Math.min(sy[a], sy[b]),
          maxy = Math.max(sy[a], sy[b]);
        if (maxx < 0 || minx > vw || maxy < 0 || miny > vh) continue;
      }
      const st = styleOf(e);
      const incident =
        dimming &&
        (pair
          ? (a === pair[0] && b === pair[1]) || (a === pair[1] && b === pair[0])
          : focusNodes.includes(a) || focusNodes.includes(b));
      const calm = st.tone === 'muted';
      const a0 = dimming ? (incident ? 0.95 : 0.1) : calm ? (e.kind === 'agg' ? 0.3 : 0.38) : 0.8;
      const w =
        e.kind === 'agg' ? Math.min(5, st.width * (1 + Math.min(1.6, Math.log10(e.count + e.count2) * 0.7))) : st.width;
      const key = st.tone + '|' + w.toFixed(2) + '|' + (st.dash ? st.dash.join(',') : '') + '|' + a0;
      let bk = buckets.get(key);
      if (!bk) buckets.set(key, (bk = { tone: st.tone, w, dash: st.dash, a: a0, lines: [], arrows: [] }));
      edgeGeometry(
        sx[a],
        sy[a],
        drawR(isCluster, rs[a]),
        sx[b],
        sy[b],
        drawR(isCluster, rs[b]),
        st,
        e.bidir,
        w,
        bk.lines,
        bk.arrows,
      );
      segs++;
    }
    for (const bk of buckets.values()) {
      const col = palette.tones[bk.tone] || palette.tones.muted;
      ctx.globalAlpha = bk.a;
      ctx.strokeStyle = col;
      ctx.lineWidth = bk.w;
      ctx.setLineDash(bk.dash || []);
      ctx.beginPath();
      for (const poly of bk.lines) {
        ctx.moveTo(poly[0], poly[1]);
        for (let k = 2; k < poly.length; k += 2) ctx.lineTo(poly[k], poly[k + 1]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = col;
      ctx.beginPath();
      for (const t of bk.arrows) {
        ctx.moveTo(t[0], t[1]);
        ctx.lineTo(t[2], t[3]);
        ctx.lineTo(t[4], t[5]);
        ctx.closePath();
      }
      ctx.fill();
    }

    // canvas labels for dot-tier children, collision-culled in the same grid as the DOM boxes
    ctx.globalAlpha = 1;
    ctx.font = '11px ' + palette.font;
    ctx.textAlign = 'left';
    ctx.fillStyle = palette.muted;
    const dotLabels = [];
    for (const i of order) {
      if (!showNodes || tiers[i] !== 0 || labels >= 160) continue;
      if (dimming && !hl.has(i)) continue;
      const text = v.leafView ? leafLabel(v.start + i) : cName[v.start + i];
      const x = sx[i] + drawR(isCluster, rs[i]) + 4,
        y = sy[i] - 7;
      if (!fits(x, y, text.length * 4.5 + 4, 14)) continue; // a cheap lower bound first, then the measured width
      const w = Math.ceil(ctx.measureText(text).width) + 4;
      if (!fits(x, y, w, 14)) continue;
      place(x, y, w, 14);
      ctx.fillText(text, x, y + 11);
      dotLabels.push([x, y, w, 14]);
      labels++;
    }

    const bitmap = canvas.transferToImageBitmap();
    selfStats = { ms: +(performance.now() - t0).toFixed(1), dots, edges: segs, labels, cards, chips, view: cid };
    self.postMessage(
      {
        t: 'frame',
        camId: cam.id,
        view: cid,
        tiers,
        bitmap,
        dotLabels,
        stats: selfStats,
        cam: { cx: cam.cx, cy: cam.cy, z: cam.z, w: cam.w, h: cam.h },
      },
      [bitmap, tiers.buffer],
    );
  }

  // shared edge geometry (graph-explorer.js has the same function for promoted SVG edges)
  function edgeGeometry(ax, ay, ar, bx, by, br, st, bidir, w, lines, arrows) {
    const dx = bx - ax,
      dy = by - ay,
      len = Math.hypot(dx, dy);
    if (len < ar + br + 2) return;
    const ux = dx / len,
      uy = dy / len,
      head = st.arrow === 'none' ? 0 : 3.5 + w * 1.4;
    if (st.route === 'around') {
      const cx = (ax + bx) / 2 - uy * len * 0.22,
        cy = (ay + by) / 2 + ux * len * 0.22;
      const s0x = cx - ax,
        s0y = cy - ay,
        s0 = Math.hypot(s0x, s0y) || 1,
        e0x = cx - bx,
        e0y = cy - by,
        e0 = Math.hypot(e0x, e0y) || 1;
      const p0x = ax + (s0x / s0) * ar,
        p0y = ay + (s0y / s0) * ar,
        p2x = bx + (e0x / e0) * (br + head * 0.6),
        p2y = by + (e0y / e0) * (br + head * 0.6);
      const pts = (t0, t1) => {
        const out = [];
        for (let k = 0; k <= 10; k++) {
          const t = t0 + ((t1 - t0) * k) / 10,
            mt = 1 - t;
          out.push(mt * mt * p0x + 2 * mt * t * cx + t * t * p2x, mt * mt * p0y + 2 * mt * t * cy + t * t * p2y);
        }
        return out;
      };
      if (st.gap && len > 40) {
        lines.push(pts(0, 0.44));
        lines.push(pts(0.56, 1));
      } else lines.push(pts(0, 1));
      if (head) {
        const hx = p2x - cx,
          hy = p2y - cy,
          hl = Math.hypot(hx, hy) || 1;
        arrows.push(tri(p2x, p2y, hx / hl, hy / hl, head));
      }
      return;
    }
    const p0x = ax + ux * (ar + (bidir && head ? head * 0.6 : 0)),
      p0y = ay + uy * (ar + (bidir && head ? head * 0.6 : 0));
    const p2x = bx - ux * (br + head * 0.6),
      p2y = by - uy * (br + head * 0.6);
    if (st.gap && len > 40) {
      const mx = (p0x + p2x) / 2,
        my = (p0y + p2y) / 2,
        g = 6;
      lines.push([p0x, p0y, mx - ux * g, my - uy * g]);
      lines.push([mx + ux * g, my + uy * g, p2x, p2y]);
    } else lines.push([p0x, p0y, p2x, p2y]);
    if (head) {
      arrows.push(tri(p2x, p2y, ux, uy, head));
      if (bidir) arrows.push(tri(p0x, p0y, -ux, -uy, head));
    }
  }
  function tri(x, y, ux, uy, s) {
    const bx = x - ux * s,
      by = y - uy * s,
      px = -uy * s * 0.55,
      py = ux * s * 0.55;
    return [x + ux * s * 0.6, y + uy * s * 0.6, bx + px, by + py, bx - px, by - py];
  }

  // -------------------------------------------------------- view payloads
  function viewPayload(cid) {
    const v = buildView(cid, true);
    const children = [];
    for (let i = 0; i < v.n; i++) {
      const g = v.start + i;
      const node: any = {
        i,
        id: idOf(v.leafView, g),
        kind: v.leafView ? 'entity' : 'cluster',
        label: v.leafView ? leafLabel(g) : cName[g],
        type: v.type[i],
        typeName: v.leafView ? nodeType(g) : clusterType(g),
        members: v.members[i],
        children: v.leafView ? 0 : cChildCount[g],
        degree: Math.round(v.degree[i]),
        scc: v.scc[i],
        x: v.x[i],
        y: v.y[i],
        r: v.r[i],
      };
      if (v.leafView) {
        node.degree = outStart[g + 1] - outStart[g] + inDeg[g];
        if (EXT) node.attrs = { out: outStart[g + 1] - outStart[g], in: inDeg[g] };
        else {
          const h = h32(g, 61);
          node.attrs = {
            owner: USERS[h % USERS.length],
            rows: ((h >>> 4) % 9000) + 12,
            freshness: 1 + ((h >>> 18) % 48),
            out: outStart[g + 1] - outStart[g],
            in: inDeg[g],
          };
        }
      }
      withRef(node, v.leafView, g);
      children.push(node);
    }
    const edges = v.edges.map((e, k) => ({
      k,
      a: e.a,
      b: e.b,
      count: e.count,
      count2: e.count2,
      bidir: e.bidir,
      back: e.back,
      kind: e.kind,
      type: e.type,
      breaker: e.breaker,
      traffic: !!e.traffic,
      style: styleOf(e),
    }));
    let parent = null;
    if (cid !== 0) {
      const pv = buildView(cParent[cid], true),
        fi = cid - pv.start,
        fr = pv.r[fi];
      const external = [];
      for (const e of pv.edges) {
        if (e.a !== fi && e.b !== fi) continue;
        const j = e.a === fi ? e.b : e.a;
        external.push({
          id: 'c' + (pv.start + j),
          label: cName[pv.start + j],
          x: (pv.x[j] - pv.x[fi]) / fr,
          y: (pv.y[j] - pv.y[fi]) / fr,
          r: pv.r[j] / fr,
          out: e.a === fi ? e.count : e.count2,
          in: e.a === fi ? e.count2 : e.count,
          breaker: e.breaker,
          style: styleOf(e),
        });
      }
      parent = { id: 'c' + cParent[cid], x: pv.x[fi], y: pv.y[fi], r: fr, external };
    }
    return {
      t: 'view',
      id: 'c' + cid,
      cid,
      leafView: v.leafView,
      path: pathOf('c' + cid),
      children,
      edges,
      parent,
      stats: { nodes: N, edges: E },
    };
  }

  // the cluster above a system ('' when the top holds entities itself)
  const above = (sys) => (cParent[sys] >= 0 ? cName[cParent[sys]] : '');
  function details(id) {
    const { leaf, idx } = parseId(id);
    if (!known(id)) return { t: 'details', id, path: [], relations: [], out: [], in: [], outDeg: 0, inDeg: 0 };
    if (leaf) {
      const out = [];
      for (let e = outStart[idx]; e < outStart[idx + 1] && out.length < 40; e++) {
        const t = outTarget[e];
        out.push({
          id: 'n' + t,
          label: leafLabel(t),
          type: nodeType(t),
          system: cName[leafCluster[t]],
          domain: above(leafCluster[t]),
          edge: edgeName(e),
          same: leafCluster[t] === leafCluster[idx],
        });
      }
      const inc = [],
        want = Math.min(40, inDeg[idx]),
        sys = leafCluster[idx];
      // the sources nearest first: the system, then the rest of each cluster above it (no reverse index: a scan of
      // the out-links until enough are found; a sibling's ranges are walked only when it is reached)
      const scan = (r0, r1) => {
        for (let i = r0; i < r1 && inc.length < want; i++)
          for (let e = outStart[i]; e < outStart[i + 1]; e++)
            if (outTarget[e] === idx) {
              inc.push({
                id: 'n' + i,
                label: leafLabel(i),
                type: nodeType(i),
                system: cName[leafCluster[i]],
                domain: above(leafCluster[i]),
                edge: edgeName(e),
                same: leafCluster[i] === sys,
              });
              break;
            }
        return inc.length >= want;
      };
      if (!scan(cLeafStart[sys], cLeafEnd[sys]))
        around: for (let p = sys, a = cParent[sys]; a >= 0; p = a, a = cParent[a])
          for (let k = cChildStart[a]; k < cChildStart[a] + cChildCount[a]; k++)
            if (k !== p) for (const [r0, r1] of rangesOf(k)) if (scan(r0, r1)) break around;
      return {
        t: 'details',
        id,
        out,
        in: inc,
        outDeg: outStart[idx + 1] - outStart[idx],
        inDeg: inDeg[idx],
        path: pathOf(id),
      };
    }
    const relations = [];
    if (idx !== 0) {
      const pv = buildView(cParent[idx], false),
        fi = idx - pv.start;
      for (const ei of pv.adj[fi]) {
        const e = pv.edges[ei],
          j = e.a === fi ? e.b : e.a;
        relations.push({
          id: 'c' + (pv.start + j),
          label: cName[pv.start + j],
          out: e.a === fi ? e.count : e.count2,
          in: e.a === fi ? e.count2 : e.count,
          breaker: e.breaker,
          back: e.back,
        });
      }
      relations.sort((a, b) => b.out + b.in - (a.out + a.in));
    }
    return {
      t: 'details',
      id,
      relations: relations.slice(0, 60),
      members: membersOf(idx),
      children: cChildCount[idx],
      level: cLevel[idx],
      path: pathOf(id),
    };
  }

  // --------------------------------------------------------------- an edge's details
  const endOf = (leaf, idx) =>
    !known((leaf ? 'n' : 'c') + idx)
      ? { id: (leaf ? 'n' : 'c') + idx, label: '', type: '', system: '' }
      : leaf
        ? { id: 'n' + idx, label: leafLabel(idx), type: nodeType(idx), system: cName[leafCluster[idx]] }
        : { id: 'c' + idx, label: cName[idx], type: clusterType(idx) };
  // the entities a node id stands for: itself, or every entity below a cluster; `inside` tests a target against it
  const spanOf = (p) => (!known(idOf(p.leaf, p.idx)) ? [] : p.leaf ? [[p.idx, p.idx + 1]] : rangesOf(p.idx));
  const inside = (t, p) => (p.leaf ? t === p.idx : under(leafCluster[t], p.idx));
  // every row behind a node or a link, for a page's grid: a cluster's entities (its ranges of leaves - a domain of a
  // million-node graph holds about 40,000), or a link's single links both ways (one pass over both ends' leaves)
  function rowsOf(id) {
    if (id.includes('>')) {
      const [aId, bId] = id.split('>');
      const A = parseId(aId),
        B = parseId(bId);
      const rows = [];
      const scan = (from, to, back) => {
        if (!known(idOf(to.leaf, to.idx))) return;
        for (const [s0, s1] of spanOf(from))
          for (let i = s0; i < s1; i++)
            for (let e = outStart[i]; e < outStart[i + 1]; e++) {
              const t = outTarget[e];
              if (!inside(t, to)) continue;
              rows.push({
                id: e,
                from: 'n' + i,
                fromLabel: leafLabel(i),
                relation: edgeName(e),
                to: 'n' + t,
                toLabel: leafLabel(t),
                direction: back ? 'back' : 'forward',
                fromSystem: cName[leafCluster[i]],
                toSystem: cName[leafCluster[t]],
              });
            }
      };
      scan(A, B, false);
      scan(B, A, true);
      return { t: 'rows', id, kind: 'links', rows };
    }
    const rows = [];
    for (const [s0, s1] of spanOf(parseId(id)))
      for (let g = s0; g < s1; g++) {
        const sys = leafCluster[g];
        if (EXT) {
          // a loaded entity: what the page gave - no owner, rows or freshness
          rows.push({
            id: 'n' + g,
            label: leafLabel(g),
            type: nodeType(g),
            system: cName[sys],
            domain: above(sys),
            out: outStart[g + 1] - outStart[g],
            in: inDeg[g],
            ref: leafRef(g),
          });
          continue;
        }
        const h = h32(g, 61);
        rows.push({
          id: 'n' + g,
          label: leafLabel(g),
          type: ENTITY_TYPES[leafType[g]],
          system: cName[sys],
          domain: cName[cParent[sys]],
          owner: USERS[h % USERS.length],
          out: outStart[g + 1] - outStart[g],
          in: inDeg[g],
          rows: ((h >>> 4) % 9000) + 12,
          freshness: 1 + ((h >>> 18) % 48),
        });
      }
    return { t: 'rows', id, kind: 'entities', rows };
  }
  // the links of one edge of a view, both ways: by relation, the system pairs it bundles with their breakers, the
  // members that send and receive the most, and samples. One pass over the source's and the target's leaves (a
  // domain of a million-node graph: about 100,000 links)
  function edgeDetails(aId, bId) {
    const A = parseId(aId),
      B = parseId(bId);
    const byType = {};
    for (const t of EXT ? TYPES.edge : EDGE_TYPES) byType[t] = 0;
    const samples = [];
    const ok = known(aId) && known(bId);
    const out = {
      t: 'edge',
      id: aId + '>' + bId,
      kind: A.leaf ? 'leaf' : 'agg',
      path: ok ? pathOf('c' + (A.leaf ? leafCluster[A.idx] : cParent[A.idx])) : [],
      source: endOf(A.leaf, A.idx),
      target: endOf(B.leaf, B.idx),
      forward: 0,
      backward: 0,
      byType,
      pairs: [],
      sources: [],
      targets: [],
      samples,
    };
    if (!ok) return out;
    if (A.leaf) {
      for (const [from, to, back] of [
        [A.idx, B.idx, false],
        [B.idx, A.idx, true],
      ] as [number, number, boolean][])
        for (let e = outStart[from]; e < outStart[from + 1]; e++) {
          if (outTarget[e] !== to) continue;
          if (back) out.backward++;
          else out.forward++;
          byType[edgeName(e)]++;
          samples.push({ from: endOf(true, from), to: endOf(true, to), type: edgeName(e), back });
        }
      return out;
    }
    // the members of a link between clusters are each end's children: a domain edge's its systems, a system edge's
    // its entities (two siblings of a loaded graph may sit at different depths)
    const keyOf = (c) => (cLeafParent[c] ? (leaf) => leaf : (leaf) => childOf(leafCluster[leaf], c));
    const keyA = keyOf(A.idx),
      keyB = keyOf(B.idx);
    const sent = new Map(),
      got = new Map();
    let fs = 0,
      bs = 0;
    const scan = (from, to, back) => {
      let n = 0;
      for (const [s0, s1] of rangesOf(from.idx))
        for (let i = s0; i < s1; i++)
          for (let e = outStart[i]; e < outStart[i + 1]; e++) {
            const t = outTarget[e];
            if (!under(leafCluster[t], to.idx)) continue;
            n++;
            byType[edgeName(e)]++;
            if (!back) {
              const ks = keyA(i),
                kt = keyB(t);
              sent.set(ks, (sent.get(ks) || 0) + 1);
              got.set(kt, (got.get(kt) || 0) + 1);
            }
            if (back ? bs < 12 : fs < 28) {
              samples.push({ from: endOf(true, i), to: endOf(true, t), type: edgeName(e), back });
              if (back) bs++;
              else fs++;
            }
          }
      return n;
    };
    out.forward = scan(A, B, false);
    out.backward = scan(B, A, true);
    const top = (m, leaves) =>
      [...m.entries()]
        .sort((x, y) => y[1] - x[1])
        .slice(0, 8)
        .map(([k, count]) => {
          const end = endOf(leaves, k);
          return { id: end.id, label: end.label, type: end.type, count };
        });
    out.sources = top(sent, !!cLeafParent[A.idx]);
    out.targets = top(got, !!cLeafParent[B.idx]);
    if (EXT) return out;
    const pairs = [];
    if (!cLeafParent[A.idx]) {
      for (const p of rootPairs) {
        const da = cParent[pairA[p]],
          db = cParent[pairB[p]];
        if ((da === A.idx && db === B.idx) || (da === B.idx && db === A.idx)) pairs.push(p);
      }
    } else
      for (const key of [A.idx * C + B.idx, B.idx * C + A.idx]) {
        const p = pairMap.get(key);
        if (p !== undefined) pairs.push(p);
      }
    out.pairs = pairs
      .sort((p, q) => SEVERITY[pairState[q]] - SEVERITY[pairState[p]] || pairCount[q] - pairCount[p])
      .slice(0, 40)
      .map((p) => ({
        from: endOf(false, pairA[p]),
        to: endOf(false, pairB[p]),
        count: pairCount[p],
        state: STATE_NAMES[pairState[p]],
        trips: pairTrips[p],
        since: pairSince[p],
        by: USERS[pairBy[p]],
      }));
    return out;
  }

  // --------------------------------------------------------------- search
  let searchSeq = 0,
    scanning = null; // the scan in progress: { seq, q, results, at }
  // a graph loaded mid-scan ends the scan with what it found (in the graph it searched)
  function abortSearch() {
    if (scanning)
      self.postMessage({
        t: 'search',
        seq: scanning.seq,
        q: scanning.q,
        results: scanning.results,
        scanned: scanning.at,
      });
    scanning = null;
    searchSeq = -1;
  }
  // packed labels are searched in their bytes, in one pass, with the answer of toLowerCase().includes: ASCII bytes
  // fold A-Z and meet the query's UTF-8 bytes (ASCII lowercases to itself whatever follows, so a match there is a
  // match); the first byte above 127 hands the label to the decoder and toLowerCase, as a listed label goes (a
  // non-ASCII letter may lowercase to ASCII: the Kelvin sign to k). Most labels are ASCII and decode no string at all.
  function packedHit(query) {
    const q = new TextEncoder().encode(query),
      qn = q.length,
      ascii = q.every((b) => b < 128),
      // the query's first byte in either case (it is lower case already)
      q0 = q[0],
      Q0 = q0 >= 97 && q0 <= 122 ? q0 - 32 : q0,
      o = LABELS.offsets,
      b = LABELS.bytes;
    const decoded = (i) => stringAt(LABELS, i).toLowerCase().includes(query);
    return (i) => {
      const z = o[i + 1],
        // where a match can start; a non-ASCII query starts none in ASCII bytes
        last = ascii ? z - qn : -1;
      let k = o[i];
      next: for (; k <= last; k++) {
        const c = b[k];
        if (c !== q0 && c !== Q0) {
          if (c > 127) return decoded(i);
          continue;
        }
        for (let j = 1; j < qn; j++) {
          const d = b[k + j];
          if ((d >= 65 && d <= 90 ? d | 32 : d) !== q[j]) continue next;
        }
        return true;
      }
      for (; k < z; k++) if (b[k] > 127) return decoded(i);
      return false;
    };
  }
  function search(q, seq) {
    searchSeq = seq;
    scanning = null;
    const query = String(q || '')
      .trim()
      .toLowerCase();
    if (!query) {
      self.postMessage({ t: 'search', seq, q, results: [] });
      return;
    }
    const results = [];
    const push = (id, label, kind, type, idx) => {
      const chain = pathOf(id);
      results.push(
        withRef(
          {
            id,
            label,
            kind,
            type,
            path: chain
              .slice(1, -1)
              .map((p) => p.label)
              .join(' › '),
            parents: chain.slice(0, -1),
          },
          kind === 'entity',
          idx,
        ),
      );
    };
    const direct = /^#?(\d+)$/.exec(query);
    if (direct && +direct[1] < N)
      push('n' + direct[1], leafLabel(+direct[1]), 'entity', nodeType(+direct[1]), +direct[1]);
    for (let c = 1; c < C && results.length < 6; c++)
      if (cName[c].toLowerCase().includes(query)) push('c' + c, cName[c], 'cluster', clusterType(c), c);
    // a generated name is lower case already; a loaded one is compared in lower case
    const hit = !EXT
      ? (i) => leafLabel(i).includes(query)
      : Array.isArray(LABELS)
        ? (i) => LABELS[i].toLowerCase().includes(query)
        : packedHit(query);
    const run = { seq, q, results, at: 0 };
    scanning = run;
    let i = 0;
    const step = () => {
      if (seq !== searchSeq) return; // a newer keystroke aborted this scan
      const end = Math.min(N, i + 120000);
      for (; i < end && results.length < 12; i++) if (hit(i)) push('n' + i, leafLabel(i), 'entity', nodeType(i), i);
      run.at = i;
      if (i < N && results.length < 12) {
        self.postMessage({ t: 'search', seq, q, results, partial: true, scanned: i });
        setTimeout(step, 0);
      } else {
        if (scanning === run) scanning = null;
        self.postMessage({ t: 'search', seq, q, results, scanned: i });
      }
    };
    step();
  }

  // ------------------------------------------------- Live mode: the simulation
  // Every step a few breakers between systems trip, probe or close (the health layer), and now and then a node deploys
  // (nodes), a link's traffic moves (relations) or a count changes (labels) - each change an update for the main thread,
  // named in the view it happened in.
  let simTimer = 0;
  const BREAKER_WORDS = ['Closed', 'Half-open', 'Open'];
  const BREAKER_TONES = ['ok', 'warn', 'danger'];
  function simulate(on) {
    clearInterval(simTimer);
    simTimer = 0;
    if (on) simTimer = setInterval(simStep, 1100);
  }
  function simStep() {
    if (!lastCam) return;
    const v = views.get(lastCam.view);
    if (!v) return;
    const t = Date.now() & 0xffff,
      now = Date.now(),
      viewId = 'c' + v.cid;
    const childId = (i) => (v.leafView ? 'n' : 'c') + (v.start + i);
    const childLabel = (i) => (v.leafView ? leafLabel(v.start + i) : cName[v.start + i]);
    const items = [];
    // a level of clusters: each breaker belongs to a link of the view; inside a system: to the system
    const linked = v.leafView ? [] : v.edges.map((_e, k) => k).filter((k) => v.edges[k].pairs.length);
    const pool = v.leafView ? (domPairs.get(cParent[v.cid]) ?? []) : null;
    for (let k = 0; k < 3; k++) {
      let p, e;
      if (pool) {
        if (!pool.length) break;
        p = pool[h32(t, k) % pool.length];
      } else {
        if (!linked.length) break;
        e = v.edges[linked[h32(t, k + 20) % linked.length]];
        p = e.pairs[h32(t, k) % e.pairs.length];
      }
      const st = pairState[p];
      if (st === 3) continue;
      pairState[p] = st === 0 ? 1 : st === 1 ? (rnd(t, k + 9) < 0.5 ? 0 : 2) : 1;
      if (pairState[p] === 2) pairTrips[p]++;
      if (pairState[p] === 1) pairProbesOk[p] = h32(t, k + 3) % 10;
      pairSince[p] = 1;
      pairVer[p]++;
      const dom = cParent[pairA[p]];
      const domView = views.get(dom);
      if (domView) domView.dirty = true;
      if (cParent[pairB[p]] !== dom && views.get(0)) views.get(0).dirty = true;
      for (const vv of views.values()) if (vv.cid === dom || vv.cid === 0) vv.dirty = true;
      const text = `${BREAKER_WORDS[pairState[p]]}: ${cName[pairA[p]]} → ${cName[pairB[p]]}`;
      const tone = BREAKER_TONES[pairState[p]];
      if (e)
        items.push({
          kind: 'edge',
          target: childId(e.a) + '>' + childId(e.b),
          view: viewId,
          label: childLabel(e.a) + ' → ' + childLabel(e.b),
          layer: 'health',
          type: 'breaker',
          text,
          tone,
          time: now,
        });
      else
        items.push({
          kind: 'node',
          target: viewId,
          label: cName[v.cid],
          layer: 'health',
          type: 'breaker',
          text,
          tone,
          time: now,
        });
    }
    // a node deploys
    if (v.n && rnd(t, 31) < 0.6) {
      const i = h32(t, 32) % v.n,
        g = v.start + i;
      const text = v.leafView
        ? `Updated · revision ${100 + (h32(t, 33) % 900)}`
        : cLevel[g] === 1
          ? `${1 + (h32(t, 34) % 5)} systems deployed`
          : `Deployed v${1 + (h32(t, 35) % 4)}.${h32(t, 36) % 20}.${h32(t, 37) % 30}`;
      items.push({
        kind: 'node',
        target: childId(i),
        label: childLabel(i),
        layer: 'nodes',
        type: 'deploy',
        text,
        time: now,
      });
    }
    // a link's traffic moves
    if (v.edges.length && rnd(t, 41) < 0.4) {
      const e = v.edges[h32(t, 42) % v.edges.length];
      const up = rnd(t, 43) < 0.5;
      items.push({
        kind: 'edge',
        target: childId(e.a) + '>' + childId(e.b),
        view: viewId,
        label: childLabel(e.a) + ' → ' + childLabel(e.b),
        layer: 'relations',
        type: 'traffic',
        text: `Traffic ${up ? 'up' : 'down'} ${5 + (h32(t, 44) % 60)}%`,
        tone: up ? 'accent' : 'muted',
        time: now,
      });
    }
    // a count changes
    if (v.n && rnd(t, 51) < 0.3) {
      const i = h32(t, 52) % v.n;
      const d = 1 + (h32(t, 53) % 5000);
      items.push({
        kind: 'node',
        target: childId(i),
        label: childLabel(i),
        layer: 'labels',
        type: 'count',
        text: `${rnd(t, 54) < 0.7 ? '+' : '-'}${d.toLocaleString('en-US')} records`,
        time: now,
      });
    }
    if (items.length) self.postMessage({ t: 'updates', items });
    postPatch();
    scheduleFrame(lastCam);
  }
  /** the current view's links as they are now - their breakers and their styles - for the main thread (`restyle`:
   *  only the styles changed, the breakers are as they were) */
  function postPatch(restyle = false) {
    if (!lastCam || !views.get(lastCam.view)) return;
    const cur = buildView(lastCam.view, false);
    const patch = cur.edges.map((e, k) => ({ k, breaker: e.breaker, style: styleOf(e), traffic: !!e.traffic }));
    let ext = null;
    if (cur.cid !== 0) {
      const pv = buildView(cParent[cur.cid], false),
        fi = cur.cid - pv.start;
      ext = pv.edges
        .filter((e) => e.a === fi || e.b === fi)
        .map((e) => ({ id: 'c' + (pv.start + (e.a === fi ? e.b : e.a)), breaker: e.breaker, style: styleOf(e) }));
    }
    self.postMessage({ t: 'patch', view: 'c' + cur.cid, edges: patch, external: ext, restyle });
  }

  // ------------------------------------------------------------- messages
  self.onmessage = (ev) => {
    const m = ev.data;
    try {
      switch (m.t) {
        case 'init': {
          self.postMessage({ t: 'progress', phase: 'generating' });
          const stats = generate(m.n, m.seed);
          self.postMessage({ t: 'ready', stats, root: 'c0' });
          break;
        }
        case 'load': {
          // the page's graph: refused whole (the shown one stays) or installed whole
          const why = invalid(m.data);
          if (why) self.postMessage({ t: 'rejected', req: m.req, message: 'Invalid graph data: ' + why });
          else self.postMessage({ t: 'ready', stats: install(m.data), root: 'c0', req: m.req });
          break;
        }
        case 'rules':
          rules = (m.rules || []).map((r, order) => ({
            when: r.when || [],
            style: r.style || {},
            priority: r.priority ?? 0,
            order,
          }));
          ruleVersion++;
          // the shown layers' rules restyle the links the main thread draws too
          postPatch(true);
          if (lastCam) scheduleFrame(lastCam);
          break;
        case 'layers':
          showNodes = !!m.nodes;
          showRelations = !!m.relations;
          if (lastCam) scheduleFrame(lastCam);
          break;
        case 'colors':
          palette = m.palette;
          rgbaCache.clear();
          if (lastCam) scheduleFrame(lastCam);
          break;
        case 'focus': {
          const { leaf, idx } = parseId(m.id);
          // an id of a graph loaded before: an empty view (the main thread drops it with that graph)
          if (leaf || !known(m.id))
            self.postMessage({
              t: 'view',
              id: m.id,
              cid: -1,
              leafView: false,
              path: [],
              children: [],
              edges: [],
              parent: null,
              stats: { nodes: N, edges: E },
            });
          else self.postMessage(viewPayload(idx));
          break;
        }
        case 'sizes': {
          const v = views.get(parseId(m.id).idx);
          if (v && m.sizes.length === v.n * 4) {
            v.sizes = m.sizes;
            if (lastCam) scheduleFrame(lastCam);
          }
          break;
        }
        case 'camera':
          if (m.view >= 0 && m.view < C) scheduleFrame(m);
          break;
        case 'search':
          search(m.q, m.seq);
          break;
        case 'details':
          self.postMessage(details(m.id));
          break;
        case 'edge':
          self.postMessage(edgeDetails(m.a, m.b));
          break;
        case 'rows':
          self.postMessage(rowsOf(m.id));
          break;
        case 'subtree':
          self.postMessage(subtreeOf(m.id, m.levels));
          break;
        case 'path':
          self.postMessage({ t: 'path', id: m.id, path: pathOf(m.id), req: m.req });
          break;
        case 'simulate':
          // Live mode simulates the generated graph's breakers; a loaded graph changes through update()
          simulate(!!m.on && !EXT);
          break;
      }
    } catch (err) {
      self.postMessage({ t: 'error', message: String((err && err.stack) || err) });
    }
  };
}
