// -- Workflow (workflow) ----------------------------------------------------------------------------------
// A node workflow editor for graphs of 10,000 nodes and 100,000 connections and more, after the defuss-workflow
// package (feat-defuss-workflow, MIT, Aron Homberg), ported into the system's contracts:
//
// - The canonical graph is a GraphStore on the main thread: typed ports, connection rules (types, multiplicity, no
//   cycles unless allowed), atomic patches that roll back with every index, undo / redo from the affected values only.
// - A fixed render budget: a Web Worker keeps a derived scene (node geometry, cached edge curves, a multilevel
//   spatial hash) and draws the connections and every far node into an OffscreenCanvas; the bitmap comes back and is
//   painted in the same frame the bounded pool of HTML node cards is positioned for. Only cards near the view and
//   above zoom 0.55 exist (at most 150); below that the canvas draws the nodes. A frame that costs too much draws
//   fewer connections (sampled - the status says so), a fast run of frames earns them back. VERIFIED: (workflow.e2e
//   "budget") 10,000 nodes and 100,000 connections: no card at fit, at most 150 at 80 %, under 4,000 elements.
// - The worker is ONE function (workflowWorker) started as a classic Blob worker with the engine function
//   (workflowEngine) handed in as source - VERIFIED: (tmp/probe-wf-docs.ts, every docs card reports
//   data-renderer="worker") it works inside opaque-origin sandboxes, and the main thread runs the same engine when no
//   worker can start (data-worker="none", workflow.e2e "boot"). Being stringified, neither may reference anything outside.
// - The page composes the rest: a node palette, an outline, an inspector, a breadcrumb, readouts and actions are
//   OUTLETS (data-workflow-for + data-workflow-outlet / -output / -action) filled and wired by this runtime with the
//   system's own markup (Input, Select, Button, Kbd, Breadcrumb ...).
//
// State lives ON the element (data-readonly, data-selected, data-selected-edge + the store); the bound `api` is the
// state mutator (AGENTS.md "State API"). The graph itself is data, not state: export() serializes it.

import {
  defussGlobals,
  defussQuery,
  componentState,
  bindComponent,
  unbindComponent,
} from '../../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

// 'default' = editable; 'readonly' = the graph can be looked at, selected and run, not changed
const workflowStates = ['default', 'readonly'];

// -- types ----------------------------------------------------------------------------------------------

/** A JSON value - what node data, outputs and metadata hold. */
export type WorkflowJson = null | boolean | number | string | WorkflowJson[] | { [key: string]: WorkflowJson };

/** A point in workflow (world) coordinates. */
export interface WorkflowPoint {
  /** horizontal position */
  x: number;
  /** vertical position */
  y: number;
}

/** The camera: the screen position of the world origin and the zoom factor. */
export interface WorkflowCamera {
  /** screen x of the world origin, in CSS pixels */
  x: number;
  /** screen y of the world origin, in CSS pixels */
  y: number;
  /** the zoom factor, 0.025 to 3 */
  zoom: number;
}

/** A typed port of a node: inputs on the left edge, outputs on the right. */
export interface WorkflowPort {
  /** unique within its node */
  id: string;
  /** the text shown beside the port (default: the id) */
  label?: string;
  /** input or output */
  direction: 'input' | 'output';
  /** the value type; an output connects to an input of the same type, 'any', or a type the input accepts */
  type: string;
  /** how many connections the port takes - inputs default to 1, outputs to any number; 0 means any number */
  maxConnections?: number;
  /** true: the node runs without this input */
  optional?: boolean;
  /** further output types this input accepts */
  accepts?: string[];
}

/** A node: a card with typed ports, data and an optional nested workflow. */
export interface WorkflowNode {
  /** unique within its workflow */
  id: string;
  /** the node type - the registry's definition draws its controls */
  type: string;
  /** the card's title */
  title: string;
  /** left edge, world units */
  x: number;
  /** top edge, world units */
  y: number;
  /** width, at least 80 */
  width: number;
  /** height, at least 40 */
  height: number;
  /** the ports, inputs and outputs in their order */
  ports: WorkflowPort[];
  /** the node's parameters - plain JSON */
  data: Record<string, WorkflowJson>;
  /** the group the node belongs to */
  groupId?: string;
  /** true: the node cannot be moved, resized or deleted */
  locked?: boolean;
  /** a nested workflow; its inputs and outputs are the node's ports */
  subgraph?: WorkflowDocument;
}

/** One end of a connection: a node's port. */
export interface WorkflowEndpoint {
  /** the node id */
  node: string;
  /** the port id */
  port: string;
}

/** A connection from an output port to an input port. */
export interface WorkflowEdge {
  /** unique within its workflow */
  id: string;
  /** the output end */
  source: WorkflowEndpoint;
  /** the input end */
  target: WorkflowEndpoint;
  /** how it is drawn: bezier (default), orthogonal or straight */
  route?: 'bezier' | 'orthogonal' | 'straight';
  /** reroute points it passes through, in order */
  points?: WorkflowPoint[];
  /** a label */
  label?: string;
  /** a CSS color for the line (default: its connection type's, else its port type's color) */
  color?: string;
  /** the connection type - a registered WorkflowEdgeType lends its look and its label renderer (default: the source port's type) */
  type?: string;
  /** the line: solid (default), dashed or dotted */
  dash?: 'solid' | 'dashed' | 'dotted';
  /** the line width in pixels, 0.5 to 12 (default 1.75) */
  width?: number;
  /** true: dashes travel along the line from source to target */
  animated?: boolean;
  /** the connection's own parameters - plain JSON */
  data?: Record<string, WorkflowJson>;
}

/** What a connection type's label renderer receives besides the connection. */
export interface WorkflowEdgeContext {
  /** the node the connection leaves */
  source: WorkflowNode;
  /** the node it enters */
  target: WorkflowNode;
  /** the output port it leaves */
  port: WorkflowPort | undefined;
  /** what the last run sent through it: the source's output at that port */
  value: WorkflowJson | undefined;
  /** the source node's run state */
  runtime: WorkflowRuntime;
  /** true while the connection is selected */
  selected: boolean;
  /** the .workflow element */
  workflow: HTMLElement;
}

/** A connection type: the look and the label of the connections that name it - or leave a port of that type. */
export interface WorkflowEdgeType {
  /** the name a connection carries in type, or a port type: connections from a port of that type take it */
  type: string;
  /** a CSS color or a theme chart color (chart-1 ... chart-5) */
  color?: string;
  /** solid, dashed or dotted */
  dash?: 'solid' | 'dashed' | 'dotted';
  /** the line width in pixels, 0.5 to 12 */
  width?: number;
  /** true: dashes travel along the line */
  animated?: boolean;
  /** draws the connection's label: text or a node (null: the connection's label, else none) */
  render?: (edge: WorkflowEdge, context: WorkflowEdgeContext) => string | Node | null;
}

/** A group: a titled frame around nodes; groups nest and collapse. */
export interface WorkflowGroup {
  /** unique within its workflow */
  id: string;
  /** the frame's title */
  title: string;
  /** left edge */
  x: number;
  /** top edge */
  y: number;
  /** width */
  width: number;
  /** height */
  height: number;
  /** the group it sits in */
  parentId?: string;
  /** true: drawn as one small header, its connections end there */
  collapsed?: boolean;
  /** a CSS color for the frame */
  color?: string;
}

/** A named input or output of a workflow used as a subworkflow: bound to a port inside it. */
export interface WorkflowInterfacePort {
  /** the port id the node shows outside */
  id: string;
  /** the port type */
  type: string;
  /** the port inside the workflow it stands for */
  endpoint: WorkflowEndpoint;
}

/** A workflow document, schema version 1 - plain JSON, the format export() writes and load() reads. */
export interface WorkflowDocument {
  /** always 1 */
  schemaVersion: 1;
  /** the document id */
  id: string;
  /** the title */
  title: string;
  /** the nodes */
  nodes: WorkflowNode[];
  /** the connections */
  edges: WorkflowEdge[];
  /** the groups */
  groups: WorkflowGroup[];
  /** inputs when used as a subworkflow */
  inputs?: WorkflowInterfacePort[];
  /** outputs when used as a subworkflow */
  outputs?: WorkflowInterfacePort[];
  /** free JSON */
  metadata?: Record<string, WorkflowJson>;
  /** allowCycles: true permits loops (the default refuses a connection that closes one) */
  policy?: { allowCycles: boolean };
}

/** One change of a transaction: the new value of one node, edge or group (no value: removed). */
export interface WorkflowPatch {
  /** which collection */
  kind: 'nodes' | 'edges' | 'groups';
  /** the entity's id */
  id: string;
  /** the new value; absent removes the entity */
  value?: WorkflowNode | WorkflowEdge | WorkflowGroup;
}

/** A node's run state - what the card's status badge and progress bar show. */
export interface WorkflowRuntime {
  /** idle, queued, running, success, error or cancelled */
  status: 'idle' | 'queued' | 'running' | 'success' | 'error' | 'cancelled';
  /** 0 to 1 while running */
  progress?: number;
  /** an error or status message */
  message?: string;
  /** what the node produced, by output port */
  output?: WorkflowJson;
}

/** What a field's hooks (edit, render, renderLabel) receive besides its value. */
export interface WorkflowFieldContext {
  /** the node the field belongs to */
  node: WorkflowNode;
  /** the field */
  field: WorkflowField;
  /** the node's run state */
  runtime: WorkflowRuntime;
  /** the .workflow element */
  workflow: HTMLElement;
  /** true while the workflow is read only */
  readonly: boolean;
  /** true when the field has a custom editor (edit or editor: 'external') */
  custom: boolean;
}

/** A declarative control in a node card - drawn with the system's form components, bound to a key of the data. */
export interface WorkflowField {
  /** the data key the control edits (or, for output, the output port shown) */
  key: string;
  /** the label above the control */
  label?: string;
  /** text, textarea, number, select, slider, checkbox, switch, color, image (shows a URL), output (shows a result) or value (shows the value, edited by a custom editor) */
  kind:
    | 'text'
    | 'textarea'
    | 'number'
    | 'select'
    | 'slider'
    | 'checkbox'
    | 'switch'
    | 'color'
    | 'image'
    | 'output'
    | 'value';
  /** 'external': the page edits the value - a click fires workflow-field-edit and the page writes with setField() (the way a JSON type names a custom editor) */
  editor?: 'inline' | 'external';
  /** a custom editor - a dialog, a window, a wizard: resolves with the new value, or undefined to keep the old one */
  edit?: (
    value: WorkflowJson | undefined,
    context: WorkflowFieldContext,
  ) => Promise<WorkflowJson | undefined> | WorkflowJson | undefined;
  /** draws the value in the card instead of a control - for aggregate values: text or a node (null: the default summary) */
  render?: (value: WorkflowJson | undefined, context: WorkflowFieldContext) => string | Node | null;
  /** draws the label: text or a node (null: the default - the label, with an arrow when a custom editor edits it) */
  renderLabel?: (value: WorkflowJson | undefined, context: WorkflowFieldContext) => string | Node | null;
  /** the room the field takes in a new card, world units (default: by its kind) */
  height?: number;
  /** select: the choices */
  options?: string[];
  /** number / slider: the minimum */
  min?: number;
  /** number / slider: the maximum */
  max?: number;
  /** number / slider: the step */
  step?: number;
  /** text / textarea: the placeholder */
  placeholder?: string;
  /** textarea: the rows (default 3) */
  rows?: number;
}

/** What a custom node view gets: write the node's data, ask for another height. */
export interface WorkflowNodeContext {
  /** merges values into the node's data (one undoable change) */
  updateData: (data: Record<string, WorkflowJson>) => void;
  /** asks for a new card height */
  requestResize: (height: number) => void;
}

/** A mounted custom node view. */
export interface WorkflowNodeView {
  /** the node or its run state changed */
  update(node: WorkflowNode, runtime: WorkflowRuntime): void;
  /** the card goes away - release listeners */
  destroy(): void;
}

/** What a node type's run handler gets besides the node. */
export interface WorkflowRunContext {
  /** the values arriving at each input port, one per connection */
  inputs: Record<string, WorkflowJson[]>;
  /** aborts when the run is cancelled */
  signal: AbortSignal;
  /** reports progress, 0 to 1 */
  progress: (value: number) => void;
}

/** A node type: its ports, defaults, controls and, optionally, how it runs. */
export interface WorkflowNodeType {
  /** the type name nodes carry */
  type: string;
  /** the name in the palette and a new node's title */
  label: string;
  /** a line under the name in the palette */
  description?: string;
  /** the palette group */
  category?: string;
  /** a theme chart color (chart-1 ... chart-5) or a CSS color for the card's accent */
  color?: string;
  /** the ports a new node gets */
  ports: WorkflowPort[];
  /** a new node's width (default 260) */
  width?: number;
  /** a new node's height (default: what its ports and fields need) */
  height?: number;
  /** a new node's data */
  defaults?: Record<string, WorkflowJson>;
  /** controls drawn in the card */
  fields?: WorkflowField[];
  /** controls: each field its control (the default); list: a Property Grid list - labels above values, a value edits in place */
  layout?: 'controls' | 'list';
  /** a custom card body: mount it into host, return its view */
  mount?: (host: HTMLElement, node: WorkflowNode, context: WorkflowNodeContext) => WorkflowNodeView;
  /** runs the node: returns its outputs by output port */
  run?: (
    node: WorkflowNode,
    context: WorkflowRunContext,
  ) => Promise<Record<string, WorkflowJson>> | Record<string, WorkflowJson>;
}

/** A run state change of one node, sent by an execution adapter. */
export interface WorkflowExecutionEvent {
  /** the node */
  nodeId: string;
  /** its new run state */
  state: WorkflowRuntime;
}

/** Runs a whole workflow somewhere - in the page, on a server - and reports each node's state. */
export interface WorkflowExecutionAdapter {
  /** runs the document; emit() reports node states; resolves when done, rejects on failure */
  run(
    document: WorkflowDocument,
    context: { signal: AbortSignal; emit: (event: WorkflowExecutionEvent) => void },
  ): Promise<void>;
}

/** A synthetic workflow: how many nodes and connections, how they are arranged. */
export interface WorkflowGenerateSpec {
  /** how many nodes, 1 to 100,000 (default 1,000) */
  nodes?: number;
  /** how many connections (default: twice the nodes); always a DAG from stage to stage */
  edges?: number;
  /** the seed: the same seed gives the same workflow (default 1) */
  seed?: number;
  /** nodes per stage, the column height (default: the square root of the nodes) */
  stage?: number;
  /** wrap blocks of stages in groups, this many stages each (default 0: no groups) */
  groups?: number;
  /** collapse every other group */
  collapsed?: boolean;
}

/** What the last frame drew - the budgets at work. */
export interface WorkflowStats {
  /** the frame number */
  frame: number;
  /** milliseconds spent drawing */
  drawMs: number;
  /** connections drawn */
  edges: number;
  /** nodes drawn on the canvas */
  nodes: number;
  /** HTML node cards mounted */
  domNodes: number;
  /** the current connection budget */
  edgeBudget: number;
  /** true: more connections were in view than the budget allowed (sampled) */
  edgesTruncated: boolean;
  /** worker (OffscreenCanvas) or main (the fallback) */
  renderer: 'worker' | 'main';
  /** the zoom factor */
  zoom: number;
}

/** The state config: the selection and the camera (merged per setState). */
export interface WorkflowConfig {
  /** the selected node ids (data-selected) */
  selected?: string[];
  /** the selected connection's id (data-selected-edge); nodes and a connection are never selected together */
  edge?: string | null;
  /** the camera; set to move the view */
  camera?: WorkflowCamera | null;
}

/** The state configs per state name. */
export interface WorkflowStateConfigs {
  /** editable */
  default: WorkflowConfig;
  /** looked at, selected and run - not changed */
  readonly: WorkflowConfig;
}

/** Detail of workflow-change: a committed transaction (an edit, an undo, a redo). */
export interface WorkflowChangeDetail {
  /** what changed, in words ("Move nodes", "Undo Connect") */
  label: string;
  /** the store's version after the change */
  version: number;
  /** true for undo and redo */
  undo: boolean;
  /** the entities it touched */
  patches: readonly WorkflowPatch[];
}

/** The change history of the level the editor shows (each subworkflow level keeps its own). */
export interface WorkflowHistory {
  /** every change by its label, oldest first: the applied ones, then the undone ones in redo order */
  changes: string[];
  /** how many of them are applied (0: none - the document as loaded) */
  at: number;
}

/** Detail of workflow-select: the selection changed. */
export interface WorkflowSelectDetail {
  /** the selected node ids */
  selected: string[];
  /** the selected connection, or null */
  edge: string | null;
  /** the ids of the subworkflow nodes the view is inside, from the top ([] at the top) */
  path: string[];
}

/** Detail of workflow-field-change: a node's field took a new value - from its control, a custom editor or setField(). */
export interface WorkflowFieldChangeDetail {
  /** the node */
  nodeId: string;
  /** the data key */
  key: string;
  /** the new value */
  value: WorkflowJson;
  /** the value it held (undefined: none) */
  oldValue: WorkflowJson | undefined;
  /** the ids of the subworkflow nodes the node is inside, from the top */
  path: string[];
}

/** Detail of workflow-field-edit: a field's custom editor is asked for - cancelable: preventDefault() and write the value with setField(). */
export interface WorkflowFieldEditDetail {
  /** the node */
  nodeId: string;
  /** the data key */
  key: string;
  /** a copy of the value it holds */
  value: WorkflowJson | undefined;
  /** the ids of the subworkflow nodes the node is inside, from the top */
  path: string[];
}

/** One row of tree(): a group, a node or a subworkflow node, linked to its parent row - the records of a Data Tree. */
export interface WorkflowTreeRow {
  /** the row id: the node ids from the top joined by '/', a group's as '<level>#<group id>' */
  id: string;
  /** the parent row: its group, the subworkflow node it is inside, or null at the top */
  parentId: string | null;
  /** the node's or group's title */
  title: string;
  /** node, subworkflow (a node holding a workflow) or group */
  kind: 'node' | 'subworkflow' | 'group';
  /** the node type ('group' for a group) */
  type: string;
  /** what reveal() takes: the subworkflow node ids from the top, then the node's id (a group: its level) */
  path: string[];
}

/** Detail of workflow-view: the camera came to rest. */
export interface WorkflowViewDetail {
  /** the camera */
  camera: WorkflowCamera;
}

/** Detail of workflow-run: a run started or ended. */
export interface WorkflowRunDetail {
  /** running, done, error or cancelled */
  status: 'running' | 'done' | 'error' | 'cancelled';
  /** the error message */
  message?: string;
}

/** Detail of workflow-node-state: one node's run state changed. */
export interface WorkflowNodeStateDetail {
  /** the node */
  nodeId: string;
  /** its run state */
  state: WorkflowRuntime;
}

/** Detail of workflow-navigate: the view entered or left a subworkflow. */
export interface WorkflowNavigateDetail {
  /** the titles from the top workflow down to the one shown */
  path: string[];
}

/** Detail of workflow-error: an action was refused or failed. */
export interface WorkflowErrorDetail {
  /** why */
  message: string;
}

// -- validation ---------------------------------------------------------------------------------------------
// Structure first (validateDocument), graph semantics second (GraphStore): endpoints, port direction, types,
// multiplicity, duplicates, cycles, groups, subworkflow interfaces.

function fail(message: string): never {
  throw new Error(message);
}
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
function text(v: unknown, field: string): asserts v is string {
  assert(typeof v === 'string' && v.length > 0 && v.length <= 10000, `Invalid ${field}`);
}
function ident(v: unknown): asserts v is string {
  text(v, 'id');
  assert(v.length <= 200, 'ID exceeds 200 characters');
}
function num(v: unknown, field: string): asserts v is number {
  assert(typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1e9, `Invalid ${field}`);
}
function rect(v: Record<string, unknown>): void {
  for (const k of ['x', 'y', 'width', 'height']) num(v[k], k);
  assert((v.width as number) >= 80 && (v.height as number) >= 40, 'Invalid geometry: minimum size 80 × 40');
}
function jsonValue(value: unknown, depth = 0): asserts value is WorkflowJson {
  assert(depth <= 32, 'JSON nesting exceeds 32');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    assert(Number.isFinite(value), 'Non-finite JSON number');
    return;
  }
  assert(typeof value === 'object', 'Data must contain only JSON values');
  const proto = Object.getPrototypeOf(value);
  assert(Array.isArray(value) || proto === Object.prototype || proto === null, 'Data must be plain JSON');
  for (const child of Object.values(value as object)) jsonValue(child, depth + 1);
}
function validateNode(value: unknown, depth = 0): asserts value is WorkflowNode {
  assert(isRecord(value), 'Invalid node');
  ident(value.id);
  text(value.type, 'node type');
  text(value.title, 'node title');
  rect(value);
  assert(Array.isArray(value.ports), 'Ports must be an array');
  assert(value.ports.length <= 256, 'At most 256 ports per node');
  const ports = new Set<string>();
  for (const p of value.ports) {
    assert(isRecord(p), 'Invalid port');
    ident(p.id);
    text(p.type, 'port type');
    assert(!ports.has(p.id), `Duplicate port ${p.id}`);
    ports.add(p.id);
    assert(p.direction === 'input' || p.direction === 'output', 'Invalid port direction');
    if (p.label !== undefined) text(p.label, 'port label');
    if (p.optional !== undefined) assert(typeof p.optional === 'boolean', 'Invalid optional flag');
    if (p.maxConnections !== undefined)
      assert(Number.isInteger(p.maxConnections) && (p.maxConnections as number) >= 0, 'Invalid port multiplicity');
    if (p.accepts !== undefined)
      assert(
        Array.isArray(p.accepts) && p.accepts.every((t) => typeof t === 'string' && t.length),
        'Invalid accepted types',
      );
  }
  assert(isRecord(value.data), 'Node data must be an object');
  jsonValue(value.data);
  if (value.groupId !== undefined) ident(value.groupId);
  if (value.locked !== undefined) assert(typeof value.locked === 'boolean', 'Invalid locked flag');
  if (value.subgraph !== undefined) {
    assert(depth < 8, 'Subworkflow nesting exceeds 8');
    validateDocument(value.subgraph, depth + 1);
  }
}
function validateEdge(value: unknown): asserts value is WorkflowEdge {
  assert(isRecord(value), 'Invalid edge');
  ident(value.id);
  for (const k of ['source', 'target']) {
    const e = value[k];
    assert(isRecord(e), 'Invalid endpoint');
    ident(e.node);
    ident(e.port);
  }
  if (value.route !== undefined)
    assert(['bezier', 'orthogonal', 'straight'].includes(value.route as string), 'Invalid route');
  if (value.points !== undefined) {
    assert(Array.isArray(value.points) && value.points.length <= 256, 'Invalid reroute points');
    for (const p of value.points) {
      assert(isRecord(p), 'Invalid point');
      num(p.x, 'point x');
      num(p.y, 'point y');
    }
  }
  if (value.label !== undefined) text(value.label, 'edge label');
  if (value.color !== undefined) text(value.color, 'edge color');
  edgeLook(value, 'edge');
  if (value.type !== undefined) text(value.type, 'edge type');
  if (value.data !== undefined) {
    assert(isRecord(value.data), 'Invalid edge data');
    jsonValue(value.data);
  }
}
/** the look a connection or a connection type may set: dash, width, animated */
function edgeLook(value: Record<string, unknown>, what: string): void {
  if (value.dash !== undefined)
    assert(['solid', 'dashed', 'dotted'].includes(value.dash as string), `Invalid ${what} dash`);
  if (value.width !== undefined)
    assert(
      typeof value.width === 'number' && value.width >= 0.5 && value.width <= 12,
      `Invalid ${what} width (0.5 to 12)`,
    );
  if (value.animated !== undefined) assert(typeof value.animated === 'boolean', `Invalid ${what} animated`);
}
function validateGroup(value: unknown): asserts value is WorkflowGroup {
  assert(isRecord(value), 'Invalid group');
  ident(value.id);
  text(value.title, 'group title');
  rect(value);
  if (value.parentId !== undefined) ident(value.parentId);
  if (value.collapsed !== undefined) assert(typeof value.collapsed === 'boolean', 'Invalid collapsed flag');
  if (value.color !== undefined) text(value.color, 'group color');
}
function validateDocument(value: unknown, depth = 0): asserts value is WorkflowDocument {
  assert(isRecord(value), 'Invalid document');
  assert(value.schemaVersion === 1, `Unsupported schemaVersion ${String(value.schemaVersion)}`);
  ident(value.id);
  text(value.title, 'document title');
  if (value.policy !== undefined)
    assert(isRecord(value.policy) && typeof value.policy.allowCycles === 'boolean', 'Invalid graph policy');
  for (const k of ['nodes', 'edges', 'groups']) assert(Array.isArray(value[k]), `${k} must be an array`);
  const nodes = value.nodes as unknown[];
  const edges = value.edges as unknown[];
  const groups = value.groups as unknown[];
  assert(nodes.length <= 100000 && edges.length <= 1000000 && groups.length <= 10000, 'Document exceeds import limits');
  const lists: [unknown[], (v: unknown) => void][] = [
    [nodes, (v) => validateNode(v, depth)],
    [edges, validateEdge],
    [groups, validateGroup],
  ];
  for (const [items, validate] of lists) {
    const ids = new Set<string>();
    for (const item of items) {
      validate(item);
      const key = (item as { id: string }).id;
      assert(!ids.has(key), `Duplicate ID ${key}`);
      ids.add(key);
    }
  }
  if (value.metadata !== undefined) {
    assert(isRecord(value.metadata), 'Invalid metadata');
    jsonValue(value.metadata);
  }
  for (const key of ['inputs', 'outputs'])
    if (value[key] !== undefined) {
      assert(Array.isArray(value[key]), `Invalid ${key}`);
      const ids = new Set<string>();
      for (const port of value[key] as unknown[]) {
        assert(isRecord(port), 'Invalid interface port');
        ident(port.id);
        text(port.type, 'interface type');
        assert(!ids.has(port.id), 'Duplicate interface port');
        ids.add(port.id);
        assert(isRecord(port.endpoint), 'Invalid interface endpoint');
        ident(port.endpoint.node);
        ident(port.endpoint.port);
      }
    }
}
function frozen<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) frozen(v);
  }
  return value;
}

let uidCounter = 0;
const uid = (prefix = 'id'): string =>
  `${prefix}-${globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Date.now().toString(36)}${(++uidCounter).toString(36)}`;
const emptyDocument = (): WorkflowDocument => ({
  schemaVersion: 1,
  id: 'workflow',
  title: 'Untitled workflow',
  nodes: [],
  edges: [],
  groups: [],
});

// -- the graph store --------------------------------------------------------------------------------------
// Owns the editable graph: node / edge / group maps, per-node incidence, outgoing edges, per-port connection sets and
// a connection-signature index, so a change validates locally. History keeps the affected values, never snapshots.

const portKey = (p: WorkflowEndpoint): string => p.node + '\u0000' + p.port;
const edgeKey = (e: WorkflowEdge): string =>
  e.source.node + '\u0000' + e.source.port + '\u0000' + e.target.node + '\u0000' + e.target.port;
interface HistoryEntry {
  label: string;
  forward: WorkflowPatch[];
  backward: WorkflowPatch[];
}
interface GraphPolicy {
  allowCycles?: boolean;
  compatible?: (output: WorkflowPort, input: WorkflowPort) => boolean;
  connection?: (edge: WorkflowEdge, source: WorkflowNode, target: WorkflowNode) => string | undefined;
  historyLimit?: number;
}
type ChangeListener = (change: WorkflowChangeDetail) => void;

const capacity = (port: WorkflowPort): number =>
  port.maxConnections === 0 ? Infinity : (port.maxConnections ?? (port.direction === 'input' ? 1 : Infinity));

class GraphStore {
  nodes = new Map<string, WorkflowNode>();
  edges = new Map<string, WorkflowEdge>();
  groups = new Map<string, WorkflowGroup>();
  private incident = new Map<string, Set<string>>();
  private outbound = new Map<string, Set<string>>();
  private portEdges = new Map<string, Set<string>>();
  private signatures = new Map<string, Set<string>>();
  private listeners = new Set<ChangeListener>();
  private past: HistoryEntry[] = [];
  private future: HistoryEntry[] = [];
  private header: Omit<WorkflowDocument, 'nodes' | 'edges' | 'groups'>;
  version = 0;
  readonly policy: GraphPolicy;

  constructor(document: WorkflowDocument = emptyDocument(), policy: GraphPolicy = {}) {
    validateDocument(document);
    this.policy = Object.freeze({
      ...policy,
      allowCycles: policy.allowCycles ?? document.policy?.allowCycles ?? false,
    });
    const copy = structuredClone(document);
    const { nodes, edges, groups, ...header } = copy;
    this.header = frozen({ ...header, policy: { allowCycles: !!this.policy.allowCycles } });
    for (const value of nodes) this.validateSubgraph(value);
    for (const value of nodes) this.raw({ kind: 'nodes', id: value.id, value: frozen(value) });
    for (const value of groups) this.raw({ kind: 'groups', id: value.id, value: frozen(value) });
    for (const value of edges) this.raw({ kind: 'edges', id: value.id, value: frozen(value) });
    this.validateGroups();
    this.validateInterface();
    for (const edge of this.edges.values()) this.validateConnection(edge, false);
    if (!this.policy.allowCycles) this.topologicalOrder();
  }
  get title(): string {
    return this.header.title;
  }
  get canUndo(): boolean {
    return this.past.length > 0;
  }
  get canRedo(): boolean {
    return this.future.length > 0;
  }
  subscribe(listener: ChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  export(): WorkflowDocument {
    const byId = (a: { id: string }, b: { id: string }): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    return structuredClone({
      ...this.header,
      nodes: [...this.nodes.values()].sort(byId),
      edges: [...this.edges.values()].sort(byId),
      groups: [...this.groups.values()].sort(byId),
    }) as WorkflowDocument;
  }
  edgesFor(id: string): ReadonlySet<string> {
    return this.incident.get(id) ?? new Set();
  }
  connections(endpoint: WorkflowEndpoint): ReadonlySet<string> {
    return this.portEdges.get(portKey(endpoint)) ?? new Set();
  }
  private index(map: Map<string, Set<string>>, key: string, id: string, add: boolean): void {
    if (add) {
      let set = map.get(key);
      if (!set) map.set(key, (set = new Set()));
      set.add(id);
    } else {
      const set = map.get(key);
      set?.delete(id);
      if (!set?.size) map.delete(key);
    }
  }
  private indexEdge(e: WorkflowEdge, add: boolean): void {
    this.index(this.incident, e.source.node, e.id, add);
    this.index(this.incident, e.target.node, e.id, add);
    this.index(this.portEdges, portKey(e.source), e.id, add);
    this.index(this.portEdges, portKey(e.target), e.id, add);
    this.index(this.outbound, e.source.node, e.id, add);
    this.index(this.signatures, edgeKey(e), e.id, add);
  }
  private valueOf(p: WorkflowPatch): WorkflowNode | WorkflowEdge | WorkflowGroup | undefined {
    return p.kind === 'nodes'
      ? this.nodes.get(p.id)
      : p.kind === 'edges'
        ? this.edges.get(p.id)
        : this.groups.get(p.id);
  }
  private raw(p: WorkflowPatch): void {
    if (p.kind === 'edges') {
      const prev = this.edges.get(p.id);
      if (prev) this.indexEdge(prev, false);
      if (p.value) {
        this.edges.set(p.id, p.value as WorkflowEdge);
        this.indexEdge(p.value as WorkflowEdge, true);
      } else this.edges.delete(p.id);
    } else if (p.kind === 'nodes') {
      if (p.value) this.nodes.set(p.id, p.value as WorkflowNode);
      else this.nodes.delete(p.id);
    } else if (p.value) this.groups.set(p.id, p.value as WorkflowGroup);
    else this.groups.delete(p.id);
  }
  private announce(label: string, patches: WorkflowPatch[], undo: boolean): void {
    const event: WorkflowChangeDetail = Object.freeze({
      label,
      patches: Object.freeze(patches),
      version: ++this.version,
      undo,
    });
    for (const listener of this.listeners)
      try {
        listener(event);
      } catch (e) {
        console.error('workflow: a change listener failed', e);
      }
  }
  /** Atomic: an invalid batch rolls back its state and every index. */
  commit(label: string, patches: WorkflowPatch[]): void {
    if (!patches.length) return;
    const unique = new Map<string, WorkflowPatch>();
    for (const p of patches) {
      assert(p.kind === 'nodes' || p.kind === 'edges' || p.kind === 'groups', 'Unknown entity');
      if (p.value) {
        if (p.kind === 'nodes') {
          validateNode(p.value);
          if ((p.value as WorkflowNode).subgraph !== this.nodes.get(p.id)?.subgraph)
            this.validateSubgraph(p.value as WorkflowNode);
        } else if (p.kind === 'edges') validateEdge(p.value);
        else validateGroup(p.value);
        assert(p.id === p.value.id, 'Patch ID mismatch');
      }
      unique.set(p.kind + '\u0000' + p.id, frozen(structuredClone(p)));
    }
    const forward = [...unique.values()];
    const backward = forward.map(
      (p) => Object.freeze({ kind: p.kind, id: p.id, value: this.valueOf(p) }) as WorkflowPatch,
    );
    const affected = new Set<string>();
    for (const p of forward) {
      if (p.kind === 'nodes') for (const id of this.edgesFor(p.id)) affected.add(id);
      this.raw(p);
    }
    try {
      for (const p of forward) {
        if (p.kind === 'edges') affected.add(p.id);
        if (p.kind === 'nodes') {
          for (const id of this.edgesFor(p.id)) affected.add(id);
          const groupId = (p.value as WorkflowNode | undefined)?.groupId;
          if (groupId) assert(this.groups.has(groupId), 'Missing group');
        }
      }
      if (forward.some((p) => p.kind === 'groups')) this.validateGroups();
      this.validateInterface();
      for (const id of affected) {
        const e = this.edges.get(id);
        if (e) this.validateConnection(e, false);
      }
      if (!this.policy.allowCycles)
        for (const p of forward) if (p.kind === 'edges' && p.value) this.checkCycle(p.value as WorkflowEdge);
    } catch (e) {
      for (const p of [...backward].reverse()) this.raw(p);
      throw e;
    }
    this.past.push({ label, forward, backward });
    this.future = [];
    if (this.past.length > (this.policy.historyLimit ?? 100)) this.past.shift();
    this.announce(label, forward, false);
  }
  undo(): void {
    const entry = this.past.pop();
    if (!entry) return;
    for (const p of entry.backward) this.raw(p);
    this.future.push(entry);
    this.announce(`Undo ${entry.label}`, entry.backward, true);
  }
  redo(): void {
    const entry = this.future.pop();
    if (!entry) return;
    for (const p of entry.forward) this.raw(p);
    this.past.push(entry);
    this.announce(`Redo ${entry.label}`, entry.forward, true);
  }
  /** the changes in order - the applied ones, then the undone ones (the next redo first) - and how many are applied */
  history(): WorkflowHistory {
    return {
      changes: [...this.past, ...[...this.future].reverse()].map((e) => e.label),
      at: this.past.length,
    };
  }
  /** undoes or redoes one change at a time until `at` changes are applied */
  travel(at: number): void {
    const to = Math.max(0, Math.min(Math.round(at), this.past.length + this.future.length));
    while (this.past.length > to) this.undo();
    while (this.past.length < to && this.future.length) this.redo();
  }
  updateNode(id: string, update: Partial<Omit<WorkflowNode, 'id'>>, label = 'Update node'): void {
    const n = this.nodes.get(id);
    assert(n, 'Unknown node');
    this.commit(label, [{ kind: 'nodes', id, value: { ...n, ...update } }]);
  }
  addNode(node: WorkflowNode): void {
    assert(!this.nodes.has(node.id), 'Duplicate node ID');
    this.commit('Add node', [{ kind: 'nodes', id: node.id, value: node }]);
  }
  connect(source: WorkflowEndpoint, target: WorkflowEndpoint, replaceId?: string): string {
    const edge: WorkflowEdge = {
      id: replaceId ?? uid('edge'),
      source,
      target,
      route: this.edges.get(replaceId ?? '')?.route ?? 'bezier',
    };
    this.commit(replaceId ? 'Reconnect' : 'Connect', [{ kind: 'edges', id: edge.id, value: edge }]);
    return edge.id;
  }
  canConnect(source: WorkflowEndpoint, target: WorkflowEndpoint, replaceId?: string): string | undefined {
    try {
      this.validateConnection({ id: replaceId ?? '\u0000preview', source, target }, true);
      return undefined;
    } catch (e) {
      return (e as Error).message;
    }
  }
  deleteNodes(ids: Iterable<string>): void {
    const patches: WorkflowPatch[] = [];
    const edgeIds = new Set<string>();
    for (const id of ids) {
      if (this.nodes.get(id)?.locked) continue;
      for (const e of this.edgesFor(id)) edgeIds.add(e);
      patches.push({ kind: 'nodes', id });
    }
    this.commit('Delete nodes', [...[...edgeIds].map((id) => ({ kind: 'edges' as const, id })), ...patches]);
  }
  deleteEdge(id: string): void {
    this.commit('Disconnect', [{ kind: 'edges', id }]);
  }
  groupNodes(ids: Iterable<string>, title = 'Group'): string {
    const nodes = [...ids].map((id) => this.nodes.get(id)).filter((n): n is WorkflowNode => !!n);
    assert(nodes.length, 'Select at least one node');
    const id = uid('group');
    const x = Math.min(...nodes.map((n) => n.x)) - 30;
    const y = Math.min(...nodes.map((n) => n.y)) - 60;
    const parentId = nodes.every((n) => n.groupId && n.groupId === nodes[0].groupId) ? nodes[0].groupId : undefined;
    const group: WorkflowGroup = {
      id,
      title,
      x,
      y,
      width: Math.max(...nodes.map((n) => n.x + n.width)) - x + 30,
      height: Math.max(...nodes.map((n) => n.y + n.height)) - y + 30,
      ...(parentId ? { parentId } : {}),
    };
    this.commit('Group nodes', [
      { kind: 'groups', id, value: group },
      ...nodes.map((n) => ({ kind: 'nodes' as const, id: n.id, value: { ...n, groupId: id } })),
    ]);
    return id;
  }
  ungroup(id: string): void {
    const parentId = this.groups.get(id)?.parentId;
    const patches: WorkflowPatch[] = [{ kind: 'groups', id }];
    const lift = <T extends { groupId?: string; parentId?: string }>(v: T, key: 'groupId' | 'parentId'): T => {
      const copy = { ...v };
      if (parentId) copy[key] = parentId;
      else delete copy[key];
      return copy;
    };
    for (const n of this.nodes.values())
      if (n.groupId === id) patches.push({ kind: 'nodes', id: n.id, value: lift(n, 'groupId') });
    for (const g of this.groups.values())
      if (g.parentId === id) patches.push({ kind: 'groups', id: g.id, value: lift(g, 'parentId') });
    this.commit('Ungroup', patches);
  }
  groupMembers(id: string): WorkflowNode[] {
    const members: WorkflowNode[] = [];
    for (const n of this.nodes.values()) {
      let gid = n.groupId;
      while (gid) {
        if (gid === id) {
          members.push(n);
          break;
        }
        gid = this.groups.get(gid)?.parentId;
      }
    }
    return members;
  }
  fragment(ids: Iterable<string>): WorkflowDocument {
    const selected = new Set(ids);
    const doc = emptyDocument();
    doc.nodes = [...selected]
      .map((id) => this.nodes.get(id))
      .filter((n): n is WorkflowNode => !!n)
      .map((n) => {
        const copy = structuredClone(n);
        delete copy.groupId;
        return copy;
      });
    doc.edges = structuredClone(
      [...this.edges.values()].filter((e) => selected.has(e.source.node) && selected.has(e.target.node)),
    );
    return doc;
  }
  paste(fragment: WorkflowDocument, offset: WorkflowPoint = { x: 40, y: 40 }): string[] {
    const valid = new GraphStore(fragment, this.policy);
    const remap = new Map([...valid.nodes.keys()].map((id) => [id, uid('node')]));
    const nodes = [...valid.nodes.values()].map((n) => {
      const v = { ...n, id: remap.get(n.id)!, x: n.x + offset.x, y: n.y + offset.y };
      delete v.groupId;
      return v;
    });
    const edges = [...valid.edges.values()].map((e) => ({
      ...e,
      id: uid('edge'),
      source: { ...e.source, node: remap.get(e.source.node)! },
      target: { ...e.target, node: remap.get(e.target.node)! },
      points: e.points?.map((p) => ({ x: p.x + offset.x, y: p.y + offset.y })),
    }));
    this.commit('Paste', [
      ...nodes.map((value) => ({ kind: 'nodes' as const, id: value.id, value })),
      ...edges.map((value) => ({ kind: 'edges' as const, id: value.id, value })),
    ]);
    return nodes.map((n) => n.id);
  }
  compatible(out: WorkflowPort, input: WorkflowPort): boolean {
    if (this.policy.compatible) return this.policy.compatible(out, input);
    return out.type === input.type || out.type === 'any' || input.type === 'any' || !!input.accepts?.includes(out.type);
  }
  private validateConnection(edge: WorkflowEdge, cycle: boolean): void {
    const source = this.nodes.get(edge.source.node);
    const target = this.nodes.get(edge.target.node);
    assert(source && target, `Dangling edge ${edge.id}`);
    assert(source !== target, 'A node cannot connect to itself');
    const out = source.ports.find((p) => p.id === edge.source.port);
    const input = target.ports.find((p) => p.id === edge.target.port);
    assert(out?.direction === 'output' && input?.direction === 'input', `Invalid port direction on ${edge.id}`);
    assert(this.compatible(out, input), `Incompatible types: ${out.type} → ${input.type}`);
    for (const [endpoint, port] of [
      [edge.source, out],
      [edge.target, input],
    ] as const) {
      const set = this.connections(endpoint);
      const count = set.size - (set.has(edge.id) ? 1 : 0);
      assert(count < capacity(port), `Port ${port.label ?? port.id} is full`);
    }
    const duplicates = this.signatures.get(edgeKey(edge));
    assert(!duplicates || duplicates.size - (duplicates.has(edge.id) ? 1 : 0) === 0, 'Duplicate connection');
    const reason = this.policy.connection?.(edge, source, target);
    assert(!reason, reason ?? 'Connection rejected');
    if (cycle && !this.policy.allowCycles) this.checkCycle(edge);
  }
  private checkCycle(edge: WorkflowEdge): void {
    const stack = [edge.target.node];
    const seen = new Set<string>();
    while (stack.length) {
      const id = stack.pop()!;
      assert(id !== edge.source.node, 'Connection would create a cycle');
      if (seen.has(id)) continue;
      seen.add(id);
      for (const eid of this.outbound.get(id) ?? []) if (eid !== edge.id) stack.push(this.edges.get(eid)!.target.node);
    }
  }
  private validateGroups(): void {
    for (const n of this.nodes.values())
      if (n.groupId) assert(this.groups.has(n.groupId), `Missing group ${n.groupId}`);
    for (const g of this.groups.values()) {
      const seen = new Set([g.id]);
      let p = g.parentId;
      while (p) {
        assert(!seen.has(p), 'Group hierarchy cycle');
        seen.add(p);
        const parent = this.groups.get(p);
        assert(parent, `Missing group ${p}`);
        p = parent.parentId;
      }
    }
  }
  private validateSubgraph(node: WorkflowNode): void {
    if (!node.subgraph) return;
    new GraphStore(node.subgraph);
    for (const direction of ['input', 'output'] as const) {
      const bindings = (direction === 'input' ? node.subgraph.inputs : node.subgraph.outputs) ?? [];
      const ports = node.ports.filter((p) => p.direction === direction);
      assert(
        ports.length === bindings.length &&
          ports.every((p) => bindings.some((b) => b.id === p.id && b.type === p.type)),
        `Subworkflow interface mismatch on ${node.id}`,
      );
    }
  }
  private validateInterface(): void {
    for (const [ports, direction] of [
      [this.header.inputs, 'input'],
      [this.header.outputs, 'output'],
    ] as const)
      for (const p of ports ?? []) {
        const port = this.nodes.get(p.endpoint.node)?.ports.find((q) => q.id === p.endpoint.port);
        assert(port && port.direction === direction && port.type === p.type, `Invalid interface binding ${p.id}`);
      }
  }
  topologicalOrder(): string[] {
    const indegree = new Map([...this.nodes.keys()].map((id) => [id, 0]));
    for (const e of this.edges.values()) indegree.set(e.target.node, indegree.get(e.target.node)! + 1);
    const queue = [...indegree].filter(([, d]) => d === 0).map(([id]) => id);
    for (let i = 0; i < queue.length; i++)
      for (const eid of this.outbound.get(queue[i]) ?? []) {
        const target = this.edges.get(eid)!.target.node;
        const d = indegree.get(target)! - 1;
        indegree.set(target, d);
        if (!d) queue.push(target);
      }
    assert(queue.length === this.nodes.size, 'Graph contains a cycle');
    return queue;
  }
}

// -- the engine: geometry, the spatial index, the scene, the layout ---------------------------------------
// ONE function, so it can run in the worker (stringified into its Blob) and on the main thread (the fallback, the
// card index, the layout without a worker). Nothing in here may reference anything outside it.

function workflowEngine(): any {
  'use strict';
  const PORT_TOP = 52;
  const PORT_STEP = 26;
  const HEADER = 40;

  const portPosition = (node: any, portId: string): { x: number; y: number } => {
    let port: any;
    for (const p of node.ports)
      if (p.id === portId) {
        port = p;
        break;
      }
    let row = 0;
    if (port)
      for (const p of node.ports) {
        if (p.id === portId) break;
        if (p.direction === port.direction) row++;
      }
    return { x: node.x + (port?.direction === 'output' ? node.width : 0), y: node.y + PORT_TOP + row * PORT_STEP };
  };
  const contentTop = (node: any): number => {
    let i = 0;
    let o = 0;
    for (const p of node.ports)
      if (p.direction === 'input') i++;
      else o++;
    return PORT_TOP + Math.max(i, o) * PORT_STEP - 8;
  };
  const viewport = (camera: any, width: number, height: number, padding = 0): any => ({
    x: (-camera.x - padding) / camera.zoom,
    y: (-camera.y - padding) / camera.zoom,
    width: (width + padding * 2) / camera.zoom,
    height: (height + padding * 2) / camera.zoom,
  });
  const bounds = (points: any[], padding = 0): any => {
    let x = Infinity;
    let y = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    for (const p of points) {
      if (p.x < x) x = p.x;
      if (p.y < y) y = p.y;
      if (p.x > right) right = p.x;
      if (p.y > bottom) bottom = p.y;
    }
    return { x: x - padding, y: y - padding, width: right - x + padding * 2, height: bottom - y + padding * 2 };
  };
  const intersects = (a: any, b: any): boolean =>
    a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y;
  const route = (edge: any, a: any, b: any): any => {
    let points: any[];
    let cubic = false;
    if (edge.points?.length) points = [a, ...edge.points, b];
    else if (edge.route === 'straight') points = [a, b];
    else if (edge.route === 'orthogonal') {
      const mid = (a.x + b.x) / 2;
      points = [a, { x: mid, y: a.y }, { x: mid, y: b.y }, b];
    } else {
      const arm = Math.max(48, Math.abs(b.x - a.x) * 0.5);
      points = [a, { x: a.x + arm, y: a.y }, { x: b.x - arm, y: b.y }, b];
      cubic = true;
    }
    return { points, cubic, box: bounds(points, 8), type: -1 };
  };
  const trace = (ctx: any, curve: any): void => {
    const p = curve.points;
    ctx.moveTo(p[0].x, p[0].y);
    if (curve.cubic) ctx.bezierCurveTo(p[1].x, p[1].y, p[2].x, p[2].y, p[3].x, p[3].y);
    else for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y);
  };
  const samples = (curve: any): any[] => {
    if (!curve.cubic) return curve.points;
    const [a, b, c, d] = curve.points;
    const result: any[] = [];
    for (let i = 0; i <= 32; i++) {
      const t = i / 32;
      const s = 1 - t;
      result.push({
        x: s * s * s * a.x + 3 * s * s * t * b.x + 3 * s * t * t * c.x + t * t * t * d.x,
        y: s * s * s * a.y + 3 * s * s * t * b.y + 3 * s * t * t * c.y + t * t * t * d.y,
      });
    }
    return result;
  };
  const distanceToCurve = (point: any, curve: any): number => {
    const pts = samples(curve);
    let min = Infinity;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
      min = Math.min(min, Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy));
    }
    return min;
  };
  /** the outermost collapsed group around a node: it stands for the node; inner connections disappear */
  const collapsedAncestor = (node: any, groups: Map<string, any>): string | undefined => {
    let id = node.groupId;
    let collapsed: string | undefined;
    let guard = 0;
    while (id && guard++ < 64) {
      const g = groups.get(id);
      if (!g) break;
      if (g.collapsed) collapsed = id;
      id = g.parentId;
    }
    return collapsed;
  };
  /** a port type's color slot (0..7); 'any' has none (-1) */
  const typeIndex = (type: string): number => {
    if (!type || type === 'any') return -1;
    let h = 2166136261;
    for (let i = 0; i < type.length; i++) h = Math.imul(h ^ type.charCodeAt(i), 16777619);
    return (h >>> 0) % 8;
  };

  // Multilevel spatial hash: an item lives in at most four cells of its level; queries have separate output and work
  // budgets, and say when they stopped early.
  class SpatialIndex {
    items: Map<string, any>;
    levels: Map<number, Map<string, Set<string>>>;
    constructor() {
      this.items = new Map();
      this.levels = new Map();
    }
    get size(): number {
      return this.items.size;
    }
    clear(): void {
      this.items.clear();
      this.levels.clear();
    }
    remove(id: string): void {
      const item = this.items.get(id);
      if (!item) return;
      const grid = this.levels.get(item.level)!;
      for (const key of item.keys) {
        const cell = grid.get(key)!;
        cell.delete(id);
        if (!cell.size) grid.delete(key);
      }
      if (!grid.size) this.levels.delete(item.level);
      this.items.delete(id);
    }
    set(id: string, box: any): void {
      this.remove(id);
      const level = Math.max(7, Math.ceil(Math.log2(Math.max(box.width, box.height, 1))));
      const size = 2 ** level;
      let grid = this.levels.get(level);
      if (!grid) this.levels.set(level, (grid = new Map()));
      const keys: string[] = [];
      for (let x = Math.floor(box.x / size); x <= Math.floor((box.x + box.width) / size); x++)
        for (let y = Math.floor(box.y / size); y <= Math.floor((box.y + box.height) / size); y++) {
          const key = x + ',' + y;
          keys.push(key);
          let cell = grid.get(key);
          if (!cell) grid.set(key, (cell = new Set()));
          cell.add(id);
        }
      this.items.set(id, { box: { x: box.x, y: box.y, width: box.width, height: box.height }, level, keys });
    }
    query(box: any, limit = Infinity, workLimit = Infinity): { ids: string[]; examined: number; truncated: boolean } {
      const seen = new Set<string>();
      const ids: string[] = [];
      let examined = 0;
      let stopped = false;
      const visit = (cell: Set<string> | undefined): void => {
        if (!cell) return;
        for (const id of cell) {
          if (seen.has(id)) continue;
          seen.add(id);
          examined++;
          if (intersects(this.items.get(id).box, box)) ids.push(id);
          if (ids.length >= limit || examined >= workLimit) {
            stopped = true;
            return;
          }
        }
      };
      for (const [level, grid] of this.levels) {
        const size = 2 ** level;
        const x0 = Math.floor(box.x / size);
        const x1 = Math.floor((box.x + box.width) / size);
        const y0 = Math.floor(box.y / size);
        const y1 = Math.floor((box.y + box.height) / size);
        if ((x1 - x0 + 1) * (y1 - y0 + 1) > grid.size * 2) {
          for (const [key, cell] of grid) {
            const comma = key.indexOf(',');
            const x = +key.slice(0, comma);
            const y = +key.slice(comma + 1);
            if (x >= x0 && x <= x1 && y >= y0 && y <= y1) visit(cell);
            if (stopped) break;
          }
        } else
          for (let x = x0; x <= x1 && !stopped; x++)
            for (let y = y0; y <= y1 && !stopped; y++) visit(grid.get(x + ',' + y));
        if (stopped) break;
      }
      return { ids, examined, truncated: stopped };
    }
  }

  // The derived scene: stripped nodes (geometry, ports, title, accent, run status), edges with cached curves, groups,
  // the two indexes. Canonical state stays in the GraphStore; this is what a frame needs.
  class Scene {
    nodes: Map<string, any>;
    edges: Map<string, any>;
    groups: Map<string, any>;
    nodeIndex: SpatialIndex;
    edgeIndex: SpatialIndex;
    curves: Map<string, any>;
    incident: Map<string, Set<string>>;
    members: Map<string, Set<string>>;
    constructor() {
      this.nodes = new Map();
      this.edges = new Map();
      this.groups = new Map();
      this.nodeIndex = new SpatialIndex();
      this.edgeIndex = new SpatialIndex();
      this.curves = new Map();
      this.incident = new Map();
      this.members = new Map();
    }
    load(doc: any): void {
      this.nodes = new Map(doc.nodes.map((n: any) => [n.id, n]));
      this.edges = new Map(doc.edges.map((e: any) => [e.id, e]));
      this.groups = new Map(doc.groups.map((g: any) => [g.id, g]));
      this.incident.clear();
      for (const e of doc.edges) this.indexEdge(e, true);
      this.rebuild();
    }
    indexEdge(e: any, add: boolean): void {
      for (const id of e.source.node === e.target.node ? [e.source.node] : [e.source.node, e.target.node]) {
        if (add) {
          let set = this.incident.get(id);
          if (!set) this.incident.set(id, (set = new Set()));
          set.add(e.id);
        } else {
          const set = this.incident.get(id);
          set?.delete(e.id);
          if (!set?.size) this.incident.delete(id);
        }
      }
    }
    node(id: string): void {
      const n = this.nodes.get(id);
      this.nodeIndex.remove(id);
      if (n && !collapsedAncestor(n, this.groups)) this.nodeIndex.set(id, n);
    }
    edge(id: string): void {
      this.edgeIndex.remove(id);
      this.curves.delete(id);
      const e = this.edges.get(id);
      if (!e) return;
      const a = this.nodes.get(e.source.node);
      const b = this.nodes.get(e.target.node);
      if (!a || !b) return;
      const ga = collapsedAncestor(a, this.groups);
      const gb = collapsedAncestor(b, this.groups);
      if (ga && ga === gb) return;
      const proxy = (gid: string, output: boolean): any => {
        const g = this.groups.get(gid);
        return { x: g.x + (output ? 240 : 0), y: g.y + 28 };
      };
      const curve = route(
        e,
        ga ? proxy(ga, true) : portPosition(a, e.source.port),
        gb ? proxy(gb, false) : portPosition(b, e.target.port),
      );
      let type = 'any';
      for (const p of a.ports)
        if (p.id === e.source.port) {
          type = p.type;
          break;
        }
      curve.type = typeIndex(type);
      this.curves.set(id, curve);
      this.edgeIndex.set(id, curve.box);
    }
    rebuild(): void {
      this.members.clear();
      for (const n of this.nodes.values()) {
        let id = n.groupId;
        let guard = 0;
        while (id && guard++ < 64) {
          let members = this.members.get(id);
          if (!members) this.members.set(id, (members = new Set()));
          members.add(n.id);
          id = this.groups.get(id)?.parentId;
        }
      }
      this.nodeIndex.clear();
      this.edgeIndex.clear();
      this.curves.clear();
      for (const id of this.nodes.keys()) this.node(id);
      for (const id of this.edges.keys()) this.edge(id);
    }
    patch(patches: any[]): void {
      const nodes = new Set<string>();
      const edges = new Set<string>();
      const movedGroups = new Set<string>();
      let groups = false;
      for (const p of patches) {
        if (p.kind === 'nodes') {
          if (this.nodes.get(p.id)?.groupId !== p.value?.groupId) groups = true;
          if (p.value) this.nodes.set(p.id, p.value);
          else this.nodes.delete(p.id);
          nodes.add(p.id);
        } else if (p.kind === 'groups') {
          const old = this.groups.get(p.id);
          if (!old || !p.value || old.collapsed !== p.value.collapsed || old.parentId !== p.value.parentId)
            groups = true;
          else movedGroups.add(p.id);
          if (p.value) this.groups.set(p.id, p.value);
          else this.groups.delete(p.id);
        } else {
          const old = this.edges.get(p.id);
          if (old) this.indexEdge(old, false);
          if (p.value) {
            this.edges.set(p.id, p.value);
            this.indexEdge(p.value, true);
          } else this.edges.delete(p.id);
          edges.add(p.id);
        }
      }
      if (groups) {
        this.rebuild();
        return;
      }
      for (const id of movedGroups)
        for (const member of this.members.get(id) ?? [])
          for (const eid of this.incident.get(member) ?? []) edges.add(eid);
      for (const id of nodes) {
        this.node(id);
        for (const eid of this.incident.get(id) ?? []) edges.add(eid);
      }
      for (const id of edges) this.edge(id);
    }
    hit(point: any, tolerance: number): string | undefined {
      const query = this.edgeIndex.query(
        { x: point.x - tolerance, y: point.y - tolerance, width: tolerance * 2, height: tolerance * 2 },
        2000,
        10000,
      );
      let best: string | undefined;
      let min = tolerance;
      for (const id of query.ids) {
        const d = distanceToCurve(point, this.curves.get(id));
        if (d < min) {
          min = d;
          best = id;
        }
      }
      return best;
    }
    draw(ctx: any, f: any): any {
      const start = performance.now();
      const c = f.camera;
      const p = f.palette;
      ctx.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
      ctx.clearRect(0, 0, f.width, f.height);
      ctx.setTransform(f.dpr * c.zoom, 0, 0, f.dpr * c.zoom, f.dpr * c.x, f.dpr * c.y);
      const box = viewport(c, f.width, f.height, 50);
      const eq = this.edgeIndex.query(box, f.maxEdges, f.maxEdges * 6);
      // far out a node is a plain box, a tenth of the work of a drawn card: ten times as many fit the budget
      const tiny = c.zoom < 0.12;
      const nodeLimit = tiny ? f.maxNodes * 10 : f.maxNodes;
      const nq = this.nodeIndex.query(box, nodeLimit, nodeLimit * 6);
      // an explicitly selected connection stays visible when the overview is sampled
      if (f.edgeSelection && this.curves.has(f.edgeSelection) && !eq.ids.includes(f.edgeSelection)) {
        if (eq.ids.length >= f.maxEdges) eq.ids.pop();
        eq.ids.unshift(f.edgeSelection);
      }
      const selected = new Set<string>(f.selection);
      const hot = new Set<string>();
      if (selected.size && selected.size <= 64)
        for (const id of selected) for (const eid of this.incident.get(id) ?? []) hot.add(eid);
      // one path per look: color, dash and width (a connection or its type sets them)
      const batches = new Map<string, { color: string; dash: string; width: number; ids: string[] }>();
      for (const id of eq.ids) {
        if (id === f.edgeSelection || hot.has(id)) continue;
        const e = this.edges.get(id);
        const curve = this.curves.get(id);
        const color = e.color ?? (curve.type >= 0 ? p.types[curve.type] : p.edge);
        const dash = e.dash ?? 'solid';
        const width = e.width ?? 1.75;
        const key = color + '|' + dash + '|' + width;
        let batch = batches.get(key);
        if (!batch) batches.set(key, (batch = { color, dash, width, ids: [] }));
        batch.ids.push(id);
      }
      const px = 1 / c.zoom;
      ctx.lineCap = 'round';
      ctx.globalAlpha = c.zoom < 0.2 ? 0.4 : c.zoom < 0.5 ? 0.6 : 0.85;
      for (const batch of batches.values()) {
        const w = Math.max(1, batch.width * px);
        ctx.strokeStyle = batch.color;
        ctx.lineWidth = w;
        // dash lengths in screen pixels, like the width
        const b = Math.max(1, batch.width);
        ctx.setLineDash(
          batch.dash === 'dashed'
            ? [Math.max(6, b * 3) * px, Math.max(5, b * 2.5) * px]
            : batch.dash === 'dotted'
              ? [0.01, Math.max(4, b * 2.5) * px]
              : [],
        );
        ctx.beginPath();
        for (const id of batch.ids) trace(ctx, this.curves.get(id));
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      if (hot.size) {
        ctx.strokeStyle = p.accent;
        ctx.lineWidth = Math.max(1.5, 2.25 * px);
        ctx.beginPath();
        for (const id of hot) {
          const curve = this.curves.get(id);
          if (curve && id !== f.edgeSelection) trace(ctx, curve);
        }
        ctx.stroke();
      }
      if (f.edgeSelection && this.curves.has(f.edgeSelection)) {
        ctx.strokeStyle = p.accent;
        ctx.lineWidth = Math.max(2, 3.5 * px);
        ctx.beginPath();
        trace(ctx, this.curves.get(f.edgeSelection));
        ctx.stroke();
      }
      // the nodes without a card: a body, a band in the type's color, the title, the ports
      const dom = new Set<string>(f.domIds);
      const radius = Math.min(p.radius, 12);
      const font = f.dpr * c.zoom >= 0.18;
      // far off, the title keeps a readable size on screen (11px): the header band grows with it
      const titleSize = Math.max(13, 11 / c.zoom);
      let fontSize = 0;
      ctx.textBaseline = 'middle';
      if (tiny) {
        // one path per color
        const boxes = new Map<string, any[]>();
        for (const id of nq.ids) {
          if (dom.has(id)) continue;
          const n = this.nodes.get(id);
          const color = selected.has(id) ? p.accent : (n.accent ?? p.muted);
          let list = boxes.get(color);
          if (!list) boxes.set(color, (list = []));
          list.push(n);
        }
        for (const [color, list] of boxes) {
          ctx.fillStyle = color;
          ctx.beginPath();
          for (const n of list) ctx.rect(n.x, n.y, n.width, n.height);
          ctx.fill();
        }
      }
      for (const id of tiny ? [] : nq.ids) {
        if (dom.has(id)) continue;
        const n = this.nodes.get(id);
        const accent = n.accent ?? p.muted;
        const h = n.height;
        const size = Math.min(titleSize, (h * 0.6) / 1.7);
        const band = Math.max(HEADER, size * 1.7);
        ctx.fillStyle = p.node;
        ctx.strokeStyle = selected.has(id) ? p.accent : p.border;
        ctx.lineWidth = (selected.has(id) ? 2.5 : 1) * px;
        ctx.beginPath();
        ctx.roundRect(n.x, n.y, n.width, h, radius);
        ctx.fill();
        ctx.stroke();
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(n.x, n.y, n.width, band, [radius, radius, 0, 0]);
        ctx.clip();
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = accent;
        ctx.fillRect(n.x, n.y, n.width, band);
        ctx.globalAlpha = 1;
        ctx.fillRect(n.x, n.y, Math.max(4, 3 / c.zoom), band);
        ctx.restore();
        if (n.status && n.status !== 'idle') {
          ctx.fillStyle = p.status[n.status] ?? p.muted;
          ctx.fillRect(n.x, n.y + h - 4, n.width, 4);
        }
        if (font) {
          if (fontSize !== size) ctx.font = `600 ${(fontSize = size)}px ${p.font}`;
          const pad = Math.max(14, size * 0.9);
          // cut with an ellipsis rather than squeezed: about 0.58 em per character
          const fits = Math.max(1, Math.floor((n.width - pad * 2) / (size * 0.58)));
          ctx.fillStyle = p.text;
          ctx.fillText(
            n.title.length > fits ? n.title.slice(0, Math.max(1, fits - 1)) + '…' : n.title,
            n.x + pad,
            n.y + band / 2,
            n.width - pad * 2,
          );
        }
        if (c.zoom >= 0.35)
          for (const port of n.ports) {
            const pos = portPosition(n, port.id);
            const t = typeIndex(port.type);
            ctx.beginPath();
            ctx.fillStyle = t >= 0 ? p.types[t] : p.muted;
            ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
            ctx.fill();
          }
      }
      return {
        frame: f.id,
        drawMs: performance.now() - start,
        edges: eq.ids.length,
        nodes: nq.ids.length,
        edgeBudget: f.maxEdges,
        edgesTruncated: eq.truncated,
      };
    }
  }

  /** Deterministic layered layout: a column per longest-path level, cycles in a final column. */
  const layeredLayout = (doc: any, gap = { x: 100, y: 48 }): [string, { x: number; y: number }][] => {
    const indegree = new Map<string, number>(doc.nodes.map((n: any) => [n.id, 0]));
    const outgoing = new Map<string, string[]>();
    const level = new Map<string, number>();
    for (const e of doc.edges) {
      indegree.set(e.target.node, (indegree.get(e.target.node) ?? 0) + 1);
      const out = outgoing.get(e.source.node) ?? [];
      out.push(e.target.node);
      outgoing.set(e.source.node, out);
    }
    const queue: string[] = doc.nodes.filter((n: any) => indegree.get(n.id) === 0).map((n: any) => n.id);
    for (const id of queue) level.set(id, 0);
    for (let i = 0; i < queue.length; i++)
      for (const target of outgoing.get(queue[i]) ?? []) {
        level.set(target, Math.max(level.get(target) ?? 0, level.get(queue[i])! + 1));
        const count = indegree.get(target)! - 1;
        indegree.set(target, count);
        if (!count) queue.push(target);
      }
    let max = 0;
    for (const value of level.values()) max = Math.max(max, value);
    for (const [id, degree] of indegree) if (degree > 0) level.set(id, max + 1);
    // order each column by the mean row of its sources (one barycentre sweep): fewer crossings than input order
    const columns = new Map<number, any[]>();
    for (const n of doc.nodes) {
      const l = level.get(n.id)!;
      let col = columns.get(l);
      if (!col) columns.set(l, (col = []));
      col.push(n);
    }
    const sources = new Map<string, string[]>();
    for (const e of doc.edges) {
      const list = sources.get(e.target.node) ?? [];
      list.push(e.source.node);
      sources.set(e.target.node, list);
    }
    const rowOf = new Map<string, number>();
    const widths = new Map<number, number>();
    const levels = [...columns.keys()].sort((a, b) => a - b);
    for (const l of levels) {
      const col = columns.get(l)!;
      if (l > 0)
        col.sort((a: any, b: any) => {
          const mean = (n: any): number => {
            const s = (sources.get(n.id) ?? []).map((id) => rowOf.get(id)).filter((r) => r !== undefined) as number[];
            return s.length ? s.reduce((x, y) => x + y, 0) / s.length : Infinity;
          };
          return mean(a) - mean(b);
        });
      col.forEach((n: any, i: number) => rowOf.set(n.id, i));
      widths.set(l, Math.max(...col.map((n: any) => n.width)));
    }
    const result: [string, { x: number; y: number }][] = [];
    let x = 0;
    for (const l of levels) {
      let y = 0;
      for (const n of columns.get(l)!) {
        result.push([n.id, { x, y }]);
        y += n.height + gap.y;
      }
      x += widths.get(l)! + gap.x;
    }
    return result;
  };

  return {
    PORT_TOP,
    PORT_STEP,
    HEADER,
    portPosition,
    contentTop,
    viewport,
    bounds,
    intersects,
    route,
    distanceToCurve,
    collapsedAncestor,
    typeIndex,
    SpatialIndex,
    Scene,
    layeredLayout,
  };
}

// -- the worker -------------------------------------------------------------------------------------------
// Started as a classic Blob worker: `(${workflowWorker})(self, ${workflowEngine})`. Keeps a Scene and answers
// load / patch / frame (an ImageBitmap, transferred) / hit / layout.
function workflowWorker(self: any, engineFactory: any): void {
  'use strict';
  const engine = engineFactory();
  const scene = new engine.Scene();
  let canvas: any;
  self.onmessage = (event: MessageEvent): void => {
    const m = event.data;
    try {
      if (m.type === 'load') scene.load(m.doc);
      else if (m.type === 'patch') scene.patch(m.patches);
      else if (m.type === 'hit') self.postMessage({ type: 'hit', id: m.id, edge: scene.hit(m.point, m.tolerance) });
      else if (m.type === 'layout')
        self.postMessage({ type: 'layout', id: m.id, positions: engine.layeredLayout(m.doc) });
      else if (m.type === 'frame') {
        const f = m.frame;
        const w = Math.max(1, Math.round(f.width * f.dpr));
        const h = Math.max(1, Math.round(f.height * f.dpr));
        if (!canvas) canvas = new OffscreenCanvas(w, h);
        if (canvas.width !== w) canvas.width = w;
        if (canvas.height !== h) canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('OffscreenCanvas 2D is unavailable');
        const start = performance.now();
        const stats = scene.draw(ctx, f);
        const bitmap = canvas.transferToImageBitmap();
        stats.rasterMs = performance.now() - start;
        self.postMessage({ type: 'frame', frame: f, stats, bitmap }, [bitmap]);
      }
    } catch (error) {
      self.postMessage({ type: 'error', id: m?.id, message: (error as Error).message });
    }
  };
}

const ENGINE = workflowEngine();
let workerSource = '';
/** a classic Blob worker running the engine - works in opaque-origin sandboxes; null where workers cannot start */
function startWorker(name: string): Worker | null {
  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') return null;
  try {
    workerSource ||= URL.createObjectURL(
      new Blob([`(${workflowWorker.toString()})(self, ${workflowEngine.toString()});`], { type: 'text/javascript' }),
    );
    return new Worker(workerSource, { name });
  } catch {
    return null;
  }
}

/** What the canvas draws: resolved colors (the worker cannot read CSS). */
interface Palette {
  node: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  edge: string;
  font: string;
  radius: number;
  types: string[];
  status: Record<string, string>;
}
interface Frame {
  id: number;
  revision: number;
  camera: WorkflowCamera;
  width: number;
  height: number;
  dpr: number;
  domIds: string[];
  selection: string[];
  edgeSelection?: string;
  maxEdges: number;
  maxNodes: number;
  palette: Palette;
}
type DrawStats = Omit<WorkflowStats, 'domNodes' | 'zoom' | 'renderer'> & { rasterMs?: number };

// The connection layer: the worker's bitmap, or the engine on the main thread when no worker runs. One frame request
// is in flight; a newer one replaces the pending one. Every frame that arrives is painted (frames arrive in order;
// a corrective transform keeps an older one under the live camera).
class EdgeRenderer {
  mode: 'worker' | 'main' = 'main';
  canvas: HTMLCanvasElement;
  private worker: Worker | null = null;
  private scene: any = null;
  private inFlight = false;
  private next: Frame | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private dead = false;
  private hitId = 0;
  private waits = new Map<number, (value: any) => void>();
  constructor(
    canvas: HTMLCanvasElement,
    private document: () => WorkflowDocument,
    private present: (frame: Frame, stats: DrawStats, renderer: 'worker' | 'main') => void,
    useWorker: boolean,
  ) {
    this.canvas = canvas;
    const worker = useWorker ? startWorker('defuss-workflow') : null;
    if (!worker) {
      this.fallback();
      return;
    }
    this.worker = worker;
    this.mode = 'worker';
    worker.onmessage = (event: MessageEvent): void => this.message(event.data);
    worker.onerror = (): void => this.fallback();
    worker.postMessage({ type: 'load', doc: this.document() });
  }
  private message(m: any): void {
    if (m.type === 'error') {
      if (m.id && this.waits.has(m.id)) {
        this.waits.get(m.id)!(NO_ANSWER);
        this.waits.delete(m.id);
      } else this.fallback();
      return;
    }
    if (m.type === 'hit' || m.type === 'layout') {
      this.waits.get(m.id)?.(m.type === 'hit' ? m.edge : m.positions);
      this.waits.delete(m.id);
      return;
    }
    if (m.type !== 'frame') return;
    clearTimeout(this.timer);
    this.inFlight = false;
    if (this.dead) {
      m.bitmap.close();
      return;
    }
    this.resize(m.frame);
    const ctx = this.canvas.getContext('bitmaprenderer');
    if (ctx) ctx.transferFromImageBitmap(m.bitmap);
    else m.bitmap.close();
    this.present(m.frame, m.stats, 'worker');
    const next = this.next;
    this.next = null;
    if (next && next.id !== m.frame.id) this.draw(next);
  }
  /** no worker (or it failed): draw on the main thread from here on - a fresh canvas, a 2D context can't share it */
  private fallback(): void {
    if (this.dead) return;
    this.worker?.terminate();
    this.worker = null;
    clearTimeout(this.timer);
    this.inFlight = false;
    if (this.mode === 'worker') {
      const fresh = this.canvas.ownerDocument.createElement('canvas');
      fresh.className = this.canvas.className;
      this.canvas.replaceWith(fresh);
      this.canvas = fresh;
    }
    this.mode = 'main';
    this.scene = new ENGINE.Scene();
    this.scene.load(this.document());
    for (const resolve of this.waits.values()) resolve(NO_ANSWER);
    this.waits.clear();
    if (this.next) this.draw(this.next);
  }
  load(doc: WorkflowDocument): void {
    if (this.dead) return;
    if (this.worker) this.worker.postMessage({ type: 'load', doc });
    else this.scene.load(doc);
  }
  patch(patches: WorkflowPatch[]): void {
    if (this.dead || !patches.length) return;
    if (this.worker) this.worker.postMessage({ type: 'patch', patches });
    else this.scene.patch(patches);
  }
  draw(frame: Frame): void {
    if (this.dead) return;
    this.next = frame;
    if (this.worker) {
      if (this.inFlight) return;
      this.inFlight = true;
      this.next = null;
      this.worker.postMessage({ type: 'frame', frame });
      this.timer = setTimeout(() => this.fallback(), 10000);
    } else {
      this.next = null;
      this.resize(frame);
      const stats = this.scene.draw(this.canvas.getContext('2d'), frame);
      this.present(frame, stats, 'main');
    }
  }
  private resize(f: Frame): void {
    const w = Math.max(1, Math.round(f.width * f.dpr));
    const h = Math.max(1, Math.round(f.height * f.dpr));
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
  }
  private ask(message: Record<string, unknown>, timeout: number): Promise<any> {
    return new Promise((resolve) => {
      const id = ++this.hitId;
      this.waits.set(id, resolve);
      this.worker!.postMessage({ ...message, id });
      setTimeout(() => {
        if (this.waits.delete(id)) resolve(NO_ANSWER);
      }, timeout);
    });
  }
  /** the connection at a point: its id, undefined for none - null when the worker gave no answer in time (busy) */
  hit(point: WorkflowPoint, tolerance: number): Promise<string | undefined | null> {
    if (this.dead) return Promise.resolve(null);
    if (!this.worker) return Promise.resolve(this.scene.hit(point, tolerance));
    return this.ask({ type: 'hit', point, tolerance }, 10000).then((answer) => (answer === NO_ANSWER ? null : answer));
  }
  destroy(): void {
    this.dead = true;
    this.worker?.terminate();
    clearTimeout(this.timer);
    for (const resolve of this.waits.values()) resolve(NO_ANSWER);
    this.waits.clear();
  }
}

/** The layered layout off the main thread: a worker of its own (a long layout never blocks a frame), cancellable. */
function layoutPositions(doc: WorkflowDocument, signal?: AbortSignal): Promise<[string, WorkflowPoint][]> {
  if (signal?.aborted) return Promise.reject(new Error('Layout cancelled'));
  const worker = startWorker('defuss-workflow-layout');
  if (!worker) return Promise.resolve(ENGINE.layeredLayout(doc));
  return new Promise((resolve, reject) => {
    const finish = (): void => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      worker.terminate();
    };
    const abort = (): void => {
      finish();
      reject(new Error('Layout cancelled'));
    };
    const timer = setTimeout(() => {
      finish();
      reject(new Error('Layout timed out'));
    }, 30000);
    signal?.addEventListener('abort', abort, { once: true });
    worker.onerror = (): void => {
      finish();
      resolve(ENGINE.layeredLayout(doc));
    };
    worker.onmessage = (e: MessageEvent): void => {
      finish();
      if (e.data.type === 'error') reject(new Error(e.data.message));
      else resolve(e.data.positions);
    };
    worker.postMessage({ type: 'layout', id: 1, doc });
  });
}

/** The patches that move every node to its layout position, fit each group around its members, clear reroutes. */
function layoutPatches(doc: WorkflowDocument, positions: Map<string, WorkflowPoint>): WorkflowPatch[] {
  if (doc.nodes.some((n) => n.locked)) throw new Error('Unlock nodes before arranging');
  const nodes = doc.nodes.map((n) => ({ ...n, ...positions.get(n.id) }));
  const groups = new Map(doc.groups.map((g) => [g.id, g]));
  const points = new Map<string, WorkflowPoint[]>();
  for (const n of nodes) {
    let gid = n.groupId;
    while (gid) {
      const pts = points.get(gid) ?? [];
      pts.push({ x: n.x - 30, y: n.y - 60 }, { x: n.x + n.width + 30, y: n.y + n.height + 30 });
      points.set(gid, pts);
      gid = groups.get(gid)?.parentId;
    }
  }
  return [
    ...nodes.map((value) => ({ kind: 'nodes' as const, id: value.id, value })),
    ...doc.groups.map((g) => ({
      kind: 'groups' as const,
      id: g.id,
      value: points.has(g.id) ? { ...g, ...ENGINE.bounds(points.get(g.id)!) } : g,
    })),
    ...doc.edges
      .filter((e) => e.points?.length)
      .map((e) => ({ kind: 'edges' as const, id: e.id, value: { ...e, points: [] } })),
  ];
}

// -- small helpers ------------------------------------------------------------------------------------------

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (v: unknown): string => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
const fmt = (n: number): string => Number(n).toLocaleString('en-US');
const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
const MIN_ZOOM = 0.025;
const MAX_ZOOM = 3;
const CARD_ZOOM = 0.55;
/** a worker request that got no answer in time - not the same as an answer of nothing */
const NO_ANSWER = Symbol('no answer');
/** captures a pointer - one the browser no longer knows (a script's synthetic event, a pointer already up) is left free */
function capture(el: Element, pointerId: number): void {
  try {
    el.setPointerCapture(pointerId);
  } catch {
    // NotFoundError: no active pointer with that id - the gesture works without the capture
  }
}
/** an image URL a card may show: same-site paths, http(s), data:image and blob: - never script */
const SAFE_IMAGE = /^(?:https?:|data:image\/|blob:|\.{0,2}\/|[\w-]+\/)/i;

// Lucide (ISC) paths, drawn inline: the controls must not depend on a page's icon script
const ICONS: Record<string, string> = {
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  minus: '<path d="M5 12h14"/>',
  fit: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
  edit: '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
  map: '<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/>',
};
const icon = (name: string): string =>
  `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] ?? ''}</svg>`;

/** a node type's accent: chart-1..5 is the theme's chart color, anything else a CSS color */
const accentOf = (color: string | undefined): string | undefined =>
  !color ? undefined : /^chart-[1-5]$/.test(color) ? `var(--${color})` : color;

// -- node types --------------------------------------------------------------------------------------------
// One global registry plus one per element (its own types win); a <script type="application/json"
// class="workflow-types"> inside the element declares types without script.

const globalTypes = new Map<string, WorkflowNodeType>();
const globalEdgeTypes = new Map<string, WorkflowEdgeType>();
/** a connection type, checked: a name, a look and a function or none */
function checkEdgeType(definition: WorkflowEdgeType): WorkflowEdgeType {
  assert(isRecord(definition), 'Invalid connection type');
  text(definition.type, 'connection type');
  assert(definition.type.length > 0, 'A connection type needs a name');
  if (definition.color !== undefined) text(definition.color, 'connection type color');
  edgeLook(definition as unknown as Record<string, unknown>, 'connection type');
  if (definition.render !== undefined)
    assert(typeof definition.render === 'function', 'A connection type render must be a function');
  return definition;
}

const FIELD_KINDS = [
  'text',
  'textarea',
  'number',
  'select',
  'slider',
  'checkbox',
  'switch',
  'color',
  'image',
  'output',
  'value',
];
/** a field edited outside its card: a dialog, a window, the page */
const customEditor = (f: WorkflowField): boolean => !!f.edit || f.editor === 'external';
/** a field that shows its value instead of a control */
const showsValue = (f: WorkflowField): boolean =>
  customEditor(f) || !!f.render || f.kind === 'value' || f.kind === 'output' || f.kind === 'image';

function checkType(definition: WorkflowNodeType): WorkflowNodeType {
  assert(isRecord(definition), 'Invalid node type');
  text(definition.type, 'node type name');
  text(definition.label, 'node type label');
  assert(Array.isArray(definition.ports), 'A node type needs ports');
  validateNode({
    id: 'probe',
    type: definition.type,
    title: definition.label,
    x: 0,
    y: 0,
    width: 260,
    height: 200,
    ports: definition.ports,
    data: definition.defaults ?? {},
  });
  for (const f of definition.fields ?? []) {
    assert(isRecord(f), 'Invalid field');
    text(f.key, 'field key');
    assert(FIELD_KINDS.includes(f.kind), `Unknown field kind ${String(f.kind)}`);
    assert(f.editor === undefined || f.editor === 'inline' || f.editor === 'external', 'Invalid field editor');
    assert(f.height === undefined || (typeof f.height === 'number' && f.height > 0), 'Invalid field height');
    for (const hook of ['edit', 'render', 'renderLabel'] as const)
      assert(f[hook] === undefined || typeof f[hook] === 'function', `A field's ${hook} must be a function`);
  }
  assert(
    definition.layout === undefined || definition.layout === 'controls' || definition.layout === 'list',
    'Invalid node layout',
  );
  return {
    ...definition,
    ports: structuredClone(definition.ports),
    defaults: structuredClone(definition.defaults ?? {}),
  };
}

/** the height a field takes in a card, world units - in a list (labels above values) or as controls */
const fieldHeight = (f: WorkflowField, layout: 'controls' | 'list' = 'controls'): number =>
  f.height ?? (f.kind === 'image' ? 150 : layout === 'list' ? 50 : f.kind === 'value' ? 78 : controlHeight(f));
const controlHeight = (f: WorkflowField): number =>
  f.kind === 'textarea'
    ? 46 + 20 * (f.rows ?? 3)
    : f.kind === 'image'
      ? 150
      : f.kind === 'output'
        ? 72
        : f.kind === 'checkbox' || f.kind === 'switch'
          ? 34
          : 62;

function createNode(
  definition: WorkflowNodeType,
  at: WorkflowPoint,
  layout: 'controls' | 'list' = 'controls',
): WorkflowNode {
  const node: WorkflowNode = {
    id: uid('node'),
    type: definition.type,
    title: definition.label,
    x: Math.round(at.x),
    y: Math.round(at.y),
    width: definition.width ?? 260,
    height: 100,
    ports: structuredClone(definition.ports),
    data: structuredClone(definition.defaults ?? {}),
  };
  const fields = (definition.fields ?? []).reduce((h, f) => h + fieldHeight(f, definition.layout ?? layout), 0);
  node.height = definition.height ?? Math.max(120, ENGINE.contentTop(node) + 20 + (fields || 48));
  return node;
}

// -- card bodies: declarative fields, a custom mount, or the data at a glance ----------------------------------

/**
 * whether a fields view must redraw: its data, run state, title or read-only state changed - a node that only moved
 * (every frame of a drag hands the view a new node) keeps them all, so nothing redraws
 */
function changedSince(): (node: WorkflowNode, runtime: WorkflowRuntime, readonly: boolean) => boolean {
  let last: [Record<string, WorkflowJson>, string, WorkflowRuntime, string, boolean] | undefined;
  return (node, runtime, readonly) => {
    // a commit stores a frozen copy: the same data may come as another object
    const same =
      last &&
      last[2] === runtime &&
      last[3] === node.title &&
      last[4] === readonly &&
      (last[0] === node.data || last[1] === JSON.stringify(node.data));
    if (same) {
      last![0] = node.data;
      return false;
    }
    last = [node.data, JSON.stringify(node.data), runtime, node.title, readonly];
    return true;
  };
}

/** how a card's fields write, open their custom editors and describe themselves - the canvas hands one to a card */
interface FieldHost {
  /** writes data keys: one undoable change, a workflow-field-change per changed key */
  write(data: Record<string, WorkflowJson>): void;
  /** opens a field's custom editor */
  edit(key: string): void;
  /** what the field hooks receive */
  context(field: WorkflowField, node: WorkflowNode, runtime: WorkflowRuntime): WorkflowFieldContext;
  /** true while the workflow is read only */
  readonly(): boolean;
}

const outputOf = (runtime: WorkflowRuntime): Record<string, WorkflowJson> | null =>
  runtime.output && typeof runtime.output === 'object' && !Array.isArray(runtime.output) ? runtime.output : null;

/** the value a field shows: a result first for output / image, else the node's data */
function fieldValue(field: WorkflowField, node: WorkflowNode, runtime: WorkflowRuntime): WorkflowJson | undefined {
  const out = outputOf(runtime);
  if (field.kind === 'output') return out?.[field.key];
  if (field.kind === 'image') return out?.[field.key] ?? node.data[field.key];
  return node.data[field.key];
}

/** a hook's answer into an element: text or a node - false when it declined (null), the default then draws */
function put(el: HTMLElement, content: string | Node | null | undefined): boolean {
  if (content === null || content === undefined) return false;
  dfDollar(el).empty();
  if (typeof content === 'string') el.textContent = content;
  else el.append(content);
  return true;
}

/** the default label: the field's label - with an arrow at its end when a custom editor edits the value */
function defaultLabel(el: HTMLElement, field: WorkflowField): void {
  dfDollar(el).empty();
  el.append(el.ownerDocument.createTextNode(field.label ?? field.key));
  if (!customEditor(field)) return;
  const mark = el.ownerDocument.createElement('span');
  mark.className = 'workflow-field-edit-icon';
  mark.setAttribute('aria-hidden', 'true');
  dfDollar(mark).html(icon('edit'));
  el.append(mark);
}

/** a short line for any JSON value: a list's first items, an object's first keys */
function summary(value: WorkflowJson | undefined): string {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'object') return String(value);
  const short = (v: WorkflowJson): string =>
    v === null || typeof v !== 'object' ? String(v) : Array.isArray(v) ? `[${v.length}]` : '{…}';
  const text = Array.isArray(value)
    ? `${value.length} ${value.length === 1 ? 'item' : 'items'}: ${value.slice(0, 4).map(short).join(', ')}`
    : Object.entries(value)
        .slice(0, 6)
        .map(([k, v]) => `${k}: ${short(v)}`)
        .join(' · ');
  return text.length > 140 ? text.slice(0, 139) + '…' : text;
}

/** the default view of a shown value: a picture, a result, a color, a summary - or "Not set" */
function defaultValueView(el: HTMLElement, field: WorkflowField, value: WorkflowJson | undefined): void {
  const doc = el.ownerDocument;
  const empty = value === undefined || value === null || value === '';
  el.dataset.empty = String(empty);
  if (field.kind === 'image') {
    const src = String(value ?? '');
    // only a URL that cannot run script; anything else is no picture
    if (!SAFE_IMAGE.test(src)) {
      dfDollar(el).empty();
      el.dataset.empty = 'true';
      el.textContent = 'No picture yet';
      return;
    }
    let img = dfDollar(el).children('img').get(0) as HTMLImageElement | undefined;
    if (!img) {
      dfDollar(el).empty();
      img = doc.createElement('img');
      img.className = 'workflow-image';
      img.alt = field.label ?? field.key;
      img.decoding = 'async';
      img.loading = 'lazy';
      el.append(img);
    }
    if (img.getAttribute('src') !== src) img.setAttribute('src', src);
    return;
  }
  dfDollar(el).empty();
  if (empty) {
    el.textContent = field.kind === 'output' ? '—' : 'Not set';
    return;
  }
  if (field.kind === 'color' && typeof value === 'string') {
    const swatch = doc.createElement('i');
    swatch.className = 'workflow-field-swatch';
    swatch.style.background = value;
    swatch.setAttribute('aria-hidden', 'true');
    el.append(swatch, doc.createTextNode(value));
    return;
  }
  el.textContent = typeof value === 'string' ? value : field.kind === 'output' ? JSON.stringify(value) : summary(value);
}

function fieldsView(
  host: HTMLElement,
  node: WorkflowNode,
  fields: WorkflowField[],
  fh: FieldHost,
  idBase: string,
): WorkflowNodeView {
  const doc = host.ownerDocument;
  const entries: {
    field: WorkflowField;
    label: HTMLElement;
    el: HTMLElement;
    readout?: HTMLElement;
    shows?: boolean;
    shown?: string;
  }[] = [];
  const off = new AbortController();
  const signal = off.signal;
  fields.forEach((field, i) => {
    const wrap = doc.createElement('div');
    wrap.className = 'workflow-field';
    wrap.dataset.kind = field.kind;
    wrap.dataset.key = field.key;
    const id = `${idBase}-${i}-${field.key}`.replace(/[^\w-]/g, '_');
    const commit = (value: WorkflowJson): void => fh.write({ [field.key]: value });
    if (showsValue(field)) {
      // a value drawn in the card - a picture, a result, an aggregate - edited, if at all, outside it
      const label = doc.createElement('span');
      label.className = 'label workflow-field-label';
      label.id = `${id}-label`;
      const value = doc.createElement('div');
      // a raw result reads as output; one drawn by render() is the renderer's
      value.className =
        field.kind === 'output' && !field.render ? 'workflow-field-value workflow-output' : 'workflow-field-value';
      value.id = id;
      if (customEditor(field)) {
        wrap.dataset.customEditor = '';
        value.setAttribute('role', 'button');
        value.tabIndex = 0;
        value.setAttribute('aria-haspopup', 'dialog');
        value.setAttribute('aria-labelledby', label.id);
        value.dataset.workflowFieldEdit = field.key;
        const open = (): void => {
          if (!fh.readonly()) fh.edit(field.key);
        };
        value.addEventListener('click', open, { signal });
        value.addEventListener(
          'keydown',
          (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            open();
          },
          { signal },
        );
      }
      wrap.append(label, value);
      host.append(wrap);
      entries.push({ field, label, el: value, shows: true });
      return;
    }
    const label = doc.createElement('label');
    label.className = 'label';
    label.htmlFor = id;
    let el: HTMLElement;
    let readout: HTMLElement | undefined;
    if (field.kind === 'textarea') {
      const t = doc.createElement('textarea');
      t.className = 'textarea';
      t.rows = field.rows ?? 3;
      if (field.placeholder) t.placeholder = field.placeholder;
      t.addEventListener('change', () => commit(t.value), { signal });
      el = t;
    } else if (field.kind === 'select') {
      const sel = doc.createElement('select');
      sel.className = 'select';
      for (const option of field.options ?? []) {
        const o = doc.createElement('option');
        o.value = o.textContent = option;
        sel.append(o);
      }
      sel.addEventListener('change', () => commit(sel.value), { signal });
      el = sel;
    } else {
      const input = doc.createElement('input');
      if (field.kind === 'number' || field.kind === 'slider') {
        // a literal class per kind: scripts/lib/apps.ts reads the classes a component writes, so an app bundle
        // that holds a workflow carries the Slider's and the Input's styles
        if (field.kind === 'slider') {
          input.type = 'range';
          input.className = 'slider';
        } else {
          input.type = 'number';
          input.className = 'input';
        }
        if (field.min !== undefined) input.min = String(field.min);
        if (field.max !== undefined) input.max = String(field.max);
        if (field.step !== undefined) input.step = String(field.step);
        input.addEventListener('change', () => commit(input.valueAsNumber), { signal });
        if (field.kind === 'slider') {
          readout = doc.createElement('output');
          readout.className = 'workflow-readout';
          input.addEventListener('input', () => (readout!.textContent = input.value), { signal });
        }
      } else if (field.kind === 'checkbox' || field.kind === 'switch') {
        input.type = 'checkbox';
        input.className = 'checkbox';
        if (field.kind === 'switch') {
          input.className = 'switch';
          input.setAttribute('role', 'switch');
        }
        input.addEventListener('change', () => commit(input.checked), { signal });
      } else if (field.kind === 'color') {
        input.type = 'color';
        input.className = 'workflow-color';
        input.addEventListener('change', () => commit(input.value), { signal });
      } else {
        input.type = 'text';
        input.className = 'input';
        if (field.placeholder) input.placeholder = field.placeholder;
        input.addEventListener('change', () => commit(input.value), { signal });
      }
      el = input;
    }
    el.id = id;
    if (field.kind === 'checkbox' || field.kind === 'switch') {
      wrap.classList.add('workflow-field-row');
      wrap.append(el, label);
    } else if (readout) {
      const head = doc.createElement('div');
      head.className = 'workflow-field-head';
      head.append(label, readout);
      wrap.append(head, el);
    } else wrap.append(label, el);
    host.append(wrap);
    entries.push({ field, label, el, readout });
  });
  const changed = changedSince();
  const view: WorkflowNodeView = {
    update(n, runtime) {
      if (!changed(n, runtime, fh.readonly())) return;
      for (const entry of entries) {
        const { field, el, readout } = entry;
        const value = fieldValue(field, n, runtime);
        const ctx = fh.context(field, n, runtime);
        if (!put(entry.label, field.renderLabel?.(value, ctx))) defaultLabel(entry.label, field);
        if (entry.shows) {
          if (customEditor(field)) el.setAttribute('aria-disabled', String(ctx.readonly));
          if (field.render) {
            if (put(el, field.render(value, ctx))) {
              el.dataset.empty = 'false';
              entry.shown = undefined;
              continue;
            }
          }
          const key = JSON.stringify(value ?? null);
          if (entry.shown !== key) defaultValueView(el, field, value);
          entry.shown = key;
          continue;
        }
        if (el === doc.activeElement) continue;
        const input = el as HTMLInputElement;
        if (field.kind === 'checkbox' || field.kind === 'switch') input.checked = value === true;
        else input.value = value === undefined || value === null ? '' : String(value);
        if (readout) readout.textContent = input.value;
      }
    },
    destroy() {
      off.abort();
      dfDollar(host).empty();
    },
  };
  view.update(node, IDLE);
  return view;
}

/** a field's Property Grid key settings: its label, how it edits, its choices and bounds */
function gridConfig(field: WorkflowField): Record<string, unknown> {
  const conf: Record<string, unknown> = { displayName: field.label ?? field.key };
  if (showsValue(field)) return { ...conf, type: 'json', readOnly: true };
  if (field.kind === 'select') return { ...conf, type: 'enum', options: field.options ?? [] };
  if (field.kind === 'number' || field.kind === 'slider')
    return { ...conf, type: 'number', min: field.min, max: field.max, step: field.step };
  if (field.kind === 'checkbox' || field.kind === 'switch') return { ...conf, type: 'boolean' };
  if (field.kind === 'color') return { ...conf, type: 'color' };
  return { ...conf, type: field.kind === 'textarea' ? 'text' : 'string' };
}

/**
 * The list layout: the card's fields - or, without fields, the node's whole data - as a Property Grid list (labels
 * above values, a value edits in place). The grid is a soft dependency: null when the page has no Property Grid.
 */
function listView(
  host: HTMLElement,
  node: WorkflowNode,
  fields: WorkflowField[] | null,
  fh: FieldHost,
): WorkflowNodeView | null {
  const pg = df$.propertyGrid as
    | { configure?: (target: HTMLElement, options: Record<string, unknown>) => HTMLElement | null }
    | undefined;
  const configure = pg?.configure;
  if (!configure) return null;
  const doc = host.ownerDocument;
  const grid = doc.createElement('div');
  grid.className = 'property-grid workflow-properties';
  grid.dataset.layout = 'list';
  grid.dataset.frame = 'none';
  grid.setAttribute('aria-label', `${node.title}: fields`);
  host.append(grid);
  const byKey = new Map((fields ?? []).map((f) => [f.key, f]));
  let current = node;
  let runtime: WorkflowRuntime = IDLE;
  const ctxFor = (key: string): WorkflowFieldContext | null => {
    const field = byKey.get(key);
    return field ? fh.context(field, current, runtime) : null;
  };
  const sourceConfig: Record<string, unknown> = {};
  for (const field of fields ?? []) sourceConfig[field.key] = gridConfig(field);
  const off = new AbortController();
  const signal = off.signal;
  // the workflow's own events are the contract: the grid's stay inside the card
  grid.addEventListener('property-grid-beforechange', (e) => e.stopPropagation(), { signal });
  grid.addEventListener(
    'property-grid-change',
    (e) => {
      e.stopPropagation();
      const { path, source } = (e as CustomEvent<{ path: string; source: Record<string, WorkflowJson> }>).detail;
      const top = path.split('.')[0];
      if (fields && !byKey.has(top)) return;
      shown = JSON.stringify(source);
      fh.write({ [top]: source[top] });
    },
    { signal },
  );
  // a value a custom editor edits: a click or Enter on its (read-only) cell opens the editor
  const openFrom = (target: EventTarget | null): boolean => {
    const row = (target as Element | null)?.closest?.('tr[data-path]') as HTMLElement | null;
    const cell = (target as Element | null)?.closest?.('.property-grid-value');
    const field = row && cell ? byKey.get(row.dataset.path!) : undefined;
    if (!field || !customEditor(field) || fh.readonly()) return false;
    fh.edit(field.key);
    return true;
  };
  grid.addEventListener('click', (e) => void openFrom(e.target), { signal });
  grid.addEventListener(
    'keydown',
    (e) => {
      if ((e.key === 'Enter' || e.key === 'F2') && openFrom(e.target)) e.preventDefault();
    },
    { signal },
  );
  let shown = '';
  let pending: Record<string, WorkflowJson> | null = null;
  let readonly: boolean | undefined;
  let unsubscribe: (() => void) | undefined;
  const apply = (source: Record<string, WorkflowJson>): void => {
    const text = JSON.stringify(source);
    if (text === shown) return;
    shown = text;
    configure(grid, { source });
  };
  configure(grid, {
    sourceConfig,
    keyRenderFn: (key: string) => {
      const field = byKey.get(key);
      if (!field) return null;
      const el = doc.createElement('span');
      el.className = 'workflow-field-label';
      const ctx = ctxFor(key)!;
      if (!put(el, field.renderLabel?.(fieldValue(field, current, runtime), ctx))) defaultLabel(el, field);
      return el;
    },
    valueRenderFn: (_value: WorkflowJson, key: string) => {
      const field = byKey.get(key);
      if (!field || !showsValue(field)) return null;
      const el = doc.createElement('div');
      el.className =
        field.kind === 'output' && !field.render ? 'workflow-field-value workflow-output' : 'workflow-field-value';
      const value = fieldValue(field, current, runtime);
      if (!(field.render && put(el, field.render(value, ctxFor(key)!)))) defaultValueView(el, field, value);
      if (customEditor(field)) el.dataset.workflowFieldEdit = field.key;
      return el;
    },
    getEditorFn: (key: string) => {
      const field = byKey.get(key);
      return field && showsValue(field) ? false : null;
    },
  });
  const changed = changedSince();
  const view: WorkflowNodeView = {
    update(n, state) {
      if (!changed(n, state, fh.readonly())) return;
      current = n;
      runtime = state;
      const ro = fh.readonly();
      if (ro !== readonly) {
        readonly = ro;
        grid.toggleAttribute('data-readonly', ro);
        shown = '';
      }
      const source: Record<string, WorkflowJson> = fields
        ? Object.fromEntries(fields.map((f) => [f.key, fieldValue(f, n, state) ?? null]))
        : { ...n.data };
      // an open editor keeps its value: the change applies when it closes
      if (grid.store?.value.name === 'editing') {
        pending = source;
        unsubscribe ??= grid.store.subscribe((v: { name: string }) => {
          if (v.name !== 'editing' && pending) {
            const next = pending;
            pending = null;
            queueMicrotask(() => apply(next));
          }
        });
        return;
      }
      // a field drawn by render() may depend on more than its value: it redraws with every change
      if (fields?.some((f) => f.render || f.renderLabel)) shown = '';
      apply(source);
    },
    destroy() {
      off.abort();
      unsubscribe?.();
      dfDollar(host).empty();
    },
  };
  view.update(node, IDLE);
  return view;
}

/** a node without a type definition (an import, a generated workflow): its data at a glance */
function dataView(host: HTMLElement, node: WorkflowNode, description?: string): WorkflowNodeView {
  const doc = host.ownerDocument;
  const intro = doc.createElement('p');
  intro.className = 'workflow-node-description';
  const list = doc.createElement('dl');
  list.className = 'workflow-data';
  host.append(intro, list);
  const view: WorkflowNodeView = {
    update(n, runtime) {
      intro.textContent = description ?? '';
      intro.hidden = !description;
      const out =
        runtime.output && typeof runtime.output === 'object' && !Array.isArray(runtime.output) ? runtime.output : {};
      const entries = [...Object.entries(n.data), ...Object.entries(out).map(([k, v]) => [`→ ${k}`, v] as const)].slice(
        0,
        5,
      );
      dfDollar(list).empty();
      list.append(
        ...entries.flatMap(([k, v]) => {
          const dt = doc.createElement('dt');
          dt.textContent = k;
          const dd = doc.createElement('dd');
          const s = typeof v === 'string' ? v : JSON.stringify(v);
          dd.textContent = s.length > 80 ? s.slice(0, 79) + '…' : s;
          return [dt, dd];
        }),
      );
    },
    destroy() {
      dfDollar(host).empty();
    },
  };
  view.update(node, { status: 'idle' });
  return view;
}

// -- the canvas: one store under the camera -----------------------------------------------------------------

interface Card {
  el: HTMLElement;
  title: HTMLElement;
  status: HTMLElement;
  ports: HTMLElement;
  body: HTMLFieldSetElement;
  progress: HTMLElement;
  signature: string;
  type: string;
  typeVersion: number;
  view?: WorkflowNodeView;
  node?: WorkflowNode;
  runtime?: WorkflowRuntime;
}
const IDLE: WorkflowRuntime = Object.freeze({ status: 'idle' });
type Gesture = {
  type: 'pan' | 'marquee' | 'move' | 'resize' | 'bend' | 'pinch';
  pointer: number;
  start: WorkflowPoint;
  last: WorkflowPoint;
  camera: WorkflowCamera;
  original: WorkflowNode[];
  groups?: WorkflowGroup[];
  bend?: { edge: string; index: number; points: WorkflowPoint[] };
  pinch?: { distance: number; center: WorkflowPoint };
};
interface CanvasHooks {
  types: (type: string) => WorkflowNodeType | undefined;
  typesVersion: () => number;
  change: (change: WorkflowChangeDetail) => void;
  select: () => void;
  view: () => void;
  frame: (stats: WorkflowStats) => void;
  error: (message: string) => void;
  enter: (id: string) => void;
  /** writes a node's data keys (one change, a workflow-field-change per key) */
  write: (id: string, data: Record<string, WorkflowJson>) => void;
  /** opens a field's custom editor */
  edit: (id: string, key: string) => void;
  /** the layout of cards whose type names none: data-layout */
  layout: () => 'controls' | 'list';
  /** the connection type of a name (a connection's type, else its source port's type) */
  edgeType: (name: string) => WorkflowEdgeType | undefined;
}

/** a connection's look: its own values over its type's */
interface EdgeLook {
  type: WorkflowEdgeType | undefined;
  port: WorkflowPort | undefined;
  color: string | undefined;
  dash: 'solid' | 'dashed' | 'dotted' | undefined;
  width: number | undefined;
  animated: boolean;
}
/** what a connection in view shows above the canvas: a travelling dash and a label */
interface EdgeDecor {
  path?: SVGPathElement;
  label?: HTMLElement;
  /** what the label was drawn from - redrawn when one of them changes */
  drawn?: [WorkflowEdge, WorkflowJson | undefined, boolean, number, string];
  /** the label's size at scale 1, measured once per content */
  size?: { width: number; height: number };
}
let edgeTypesVersion = 0;
/** the point at t (0..1) along a routed connection, world units - halfway by default */
function curveAt(curve: { points: WorkflowPoint[]; cubic: boolean }, t = 0.5): WorkflowPoint {
  const p = curve.points;
  if (curve.cubic) {
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const d = 3 * u * t * t;
    const e = t * t * t;
    return {
      x: a * p[0].x + b * p[1].x + d * p[2].x + e * p[3].x,
      y: a * p[0].y + b * p[1].y + d * p[2].y + e * p[3].y,
    };
  }
  let total = 0;
  for (let i = 1; i < p.length; i++) total += Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y);
  let left = total * t;
  for (let i = 1; i < p.length; i++) {
    const d = Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y);
    if (d >= left && d > 0)
      return { x: p[i - 1].x + ((p[i].x - p[i - 1].x) * left) / d, y: p[i - 1].y + ((p[i].y - p[i - 1].y) * left) / d };
    left -= d;
  }
  return p[0];
}

class Canvas {
  graph: GraphStore;
  readonly root: HTMLElement;
  readonly selected = new Set<string>();
  selectedEdge: string | undefined;
  camera: WorkflowCamera = { x: 80, y: 80, zoom: 1 };
  readonly: boolean;
  stats: WorkflowStats | undefined;
  palette: Palette;
  private hooks: CanvasHooks;
  private budget = { dom: 150, edges: 5000, nodes: 3000 };
  private edgeBudget = 5000;
  private fastFrames = 0;
  private nodeIndex = new ENGINE.SpatialIndex();
  private groupIndex = new ENGINE.SpatialIndex();
  private cards = new Map<string, Card>();
  private pool: Card[] = [];
  private groupEls = new Map<string, HTMLElement>();
  private runtime = new Map<string, WorkflowRuntime>();
  private statusDirty = new Set<string>();
  readonly viewport: HTMLElement;
  private grid: HTMLElement;
  private groupLayer: HTMLElement;
  private nodeLayer: HTMLElement;
  private overlay: HTMLCanvasElement;
  private mini: HTMLCanvasElement;
  private miniBase: HTMLCanvasElement;
  private miniBounds = { x: 0, y: 0, width: 1, height: 1 };
  private miniDirty = true;
  readonly live: HTMLElement;
  private message: HTMLElement;
  private empty: HTMLElement;
  private renderer: EdgeRenderer;
  private flowLayer: SVGSVGElement;
  private labelLayer: HTMLElement;
  private decor = new Map<string, EdgeDecor>();
  /** the connections with a label or a moving dash - null: to be found again */
  private decorated: Set<string> | null = null;
  private drawnCamera: WorkflowCamera | null = null;
  private abort = new AbortController();
  private resize: ResizeObserver;
  private unsubscribe: () => void;
  private raf = 0;
  private frameId = 0;
  private revision = 0;
  private dead = false;
  private gesture: Gesture | undefined;
  private pointers = new Map<number, WorkflowPoint>();
  private space = false;
  private preview = new Map<string, WorkflowNode>();
  private pendingPreview = new Map<string, WorkflowNode>();
  private groupPreview = new Map<string, WorkflowGroup>();
  private pendingGroups: WorkflowPatch[] = [];
  private connection:
    | { endpoint: WorkflowEndpoint; direction: 'input' | 'output'; replaceId?: string; cursor?: WorkflowPoint }
    | undefined;
  private clipboard: WorkflowDocument | undefined;
  private viewTimer: ReturnType<typeof setTimeout> | undefined;
  private messageTimer: ReturnType<typeof setTimeout> | undefined;
  private colorCache = new Map<string, string>();
  private probe: HTMLElement;
  private zoomLabel: HTMLElement | undefined;
  private probeCtx: CanvasRenderingContext2D | null = null;
  private idBase: string;
  ready: Promise<void>;
  private resolveReady!: () => void;

  constructor(
    root: HTMLElement,
    store: GraphStore,
    options: { readonly: boolean; worker: boolean; minimap: boolean; controls: boolean },
    hooks: CanvasHooks,
  ) {
    this.root = root;
    this.graph = store;
    this.hooks = hooks;
    this.readonly = options.readonly;
    this.idBase = (root.id || uid('wf')) + '-f';
    this.ready = new Promise((resolve) => (this.resolveReady = resolve));
    const doc = root.ownerDocument;
    const viewport = doc.createElement('div');
    viewport.className = 'workflow-viewport';
    viewport.setAttribute('data-ce-chrome', '');
    dfDollar(viewport).html(
      `<div class="workflow-grid"></div><div class="workflow-groups"></div><canvas class="workflow-edges"></canvas>` +
        `<svg class="workflow-edge-flow" aria-hidden="true"></svg>` +
        `<div class="workflow-nodes"></div><div class="workflow-edge-labels"></div><canvas class="workflow-overlay"></canvas>` +
        `<div class="workflow-empty" hidden><strong>An empty workflow</strong><span>Add a node from the palette, then drag from a port to connect it.</span></div>` +
        `<div class="workflow-message" role="status" hidden></div>` +
        (options.controls
          ? `<div class="workflow-controls" role="toolbar" aria-label="View">` +
            `<button type="button" class="btn" data-variant="ghost" data-size="icon-sm" data-workflow-control="zoom-out" aria-label="Zoom out" title="Zoom out (−)">${icon('minus')}</button>` +
            `<button type="button" class="workflow-zoom" data-workflow-control="reset" aria-label="Zoom to 100%" title="Zoom to 100%">100%</button>` +
            `<button type="button" class="btn" data-variant="ghost" data-size="icon-sm" data-workflow-control="zoom-in" aria-label="Zoom in" title="Zoom in (+)">${icon('plus')}</button>` +
            `<button type="button" class="btn" data-variant="ghost" data-size="icon-sm" data-workflow-control="fit" aria-label="Fit the workflow" title="Fit (F)">${icon('fit')}</button>` +
            `</div>`
          : '') +
        `<canvas class="workflow-minimap" aria-label="Minimap - click to move the view"${options.minimap ? '' : ' hidden'}></canvas>` +
        `<span class="workflow-probe" aria-hidden="true"></span>` +
        `<div class="workflow-live" aria-live="polite" aria-atomic="true"></div>`,
    );
    root.append(viewport);
    this.viewport = viewport;
    const part = (cls: string): any => dfDollar(viewport).children(cls).get(0);
    this.grid = part('.workflow-grid');
    this.groupLayer = part('.workflow-groups');
    this.nodeLayer = part('.workflow-nodes');
    this.flowLayer = part('.workflow-edge-flow');
    this.labelLayer = part('.workflow-edge-labels');
    this.overlay = part('.workflow-overlay');
    this.mini = part('.workflow-minimap');
    this.miniBase = doc.createElement('canvas');
    this.live = part('.workflow-live');
    this.message = part('.workflow-message');
    this.empty = part('.workflow-empty');
    this.probe = part('.workflow-probe');
    this.zoomLabel = dfDollar(viewport).find('.workflow-zoom').get(0) as HTMLElement | undefined;
    this.palette = this.readPalette();
    this.reindex();
    this.renderer = new EdgeRenderer(
      part('.workflow-edges'),
      () => this.sceneDocument(),
      (f, s, r) => this.present(f, s, r),
      options.worker,
    );
    this.unsubscribe = this.subscribe();
    this.resize = new ResizeObserver(() => {
      this.miniDirty = true;
      this.request();
    });
    this.resize.observe(root);
    this.listen();
    this.request();
  }

  // ---- colors: tokens resolved to rgb() strings the canvas (and the worker) can take
  private resolve(color: string): string {
    const cached = this.colorCache.get(color);
    if (cached) return cached;
    this.probe.style.color = '';
    this.probe.style.color = color;
    const computed = getComputedStyle(this.probe).color || color;
    let out = computed;
    try {
      this.probeCtx ??= this.root.ownerDocument.createElement('canvas').getContext('2d', { willReadFrequently: true });
      const ctx = this.probeCtx!;
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000';
      ctx.fillStyle = computed;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      out = `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
    } catch {
      /* the computed string stays */
    }
    this.colorCache.set(color, out);
    return out;
  }
  private readPalette(): Palette {
    this.colorCache.clear();
    const css = getComputedStyle(this.root);
    const v = (name: string, fallback: string): string => this.resolve(css.getPropertyValue(name).trim() || fallback);
    const radius = parseFloat(getComputedStyle(this.probe).borderTopLeftRadius) || 10;
    return {
      node: v('--workflow-node', '#fff'),
      border: v('--workflow-border', '#ddd'),
      text: v('--workflow-text', '#111'),
      muted: v('--workflow-muted', '#888'),
      accent: v('--workflow-accent', '#3b82f6'),
      edge: v('--workflow-edge', '#999'),
      font: css.fontFamily || 'system-ui, sans-serif',
      radius,
      types: Array.from({ length: 8 }, (_, i) => v(`--workflow-type-${i}`, '#888')),
      status: {
        queued: v('--workflow-queued', '#888'),
        running: v('--workflow-running', '#3b82f6'),
        success: v('--workflow-success', '#16a34a'),
        error: v('--workflow-error', '#dc2626'),
        cancelled: v('--workflow-muted', '#888'),
      },
    };
  }
  refreshTheme(): void {
    this.palette = this.readPalette();
    this.decorated = null;
    for (const d of this.decor.values()) d.drawn = undefined;
    this.renderer.load(this.sceneDocument());
    this.miniDirty = true;
    this.request();
  }

  // ---- the store
  private subscribe(): () => void {
    return this.graph.subscribe((change) => {
      this.revision++;
      this.preview.clear();
      this.pendingPreview.clear();
      this.groupPreview.clear();
      this.pendingGroups = [];
      if (change.patches.some((p) => p.kind === 'groups')) this.reindex();
      else
        for (const p of change.patches)
          if (p.kind === 'nodes') {
            this.nodeIndex.remove(p.id);
            const n = p.value as WorkflowNode | undefined;
            if (n && !ENGINE.collapsedAncestor(n, this.graph.groups)) this.nodeIndex.set(p.id, n);
            if (!n) {
              this.selected.delete(p.id);
              this.runtime.delete(p.id);
            }
          }
      if (this.selectedEdge && !this.graph.edges.has(this.selectedEdge)) this.selectedEdge = undefined;
      if (change.patches.some((p) => p.kind === 'edges')) this.decorated = null;
      this.renderer.patch(change.patches.map((p) => this.scenePatch(p)));
      this.miniDirty = true;
      this.request();
      this.hooks.change(change);
    });
  }
  setGraph(store: GraphStore): void {
    this.cancel();
    this.unsubscribe();
    this.graph = store;
    this.unsubscribe = this.subscribe();
    this.selected.clear();
    this.selectedEdge = undefined;
    this.runtime.clear();
    for (const [id, card] of this.cards) this.release(id, card);
    for (const el of this.groupEls.values()) el.remove();
    this.groupEls.clear();
    for (const id of this.decor.keys()) this.dropDecor(id);
    this.decorated = null;
    this.revision++;
    this.reindex();
    this.renderer.load(this.sceneDocument());
    this.miniDirty = true;
    this.request();
  }
  /** a node as the scene needs it - no data, no nested document */
  private sceneNode(n: WorkflowNode): any {
    const definition = this.hooks.types(n.type);
    const accent = accentOf(definition?.color);
    const status = this.runtime.get(n.id)?.status;
    return {
      id: n.id,
      type: n.type,
      title: n.title,
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
      ports: n.ports,
      data: {},
      groupId: n.groupId,
      accent: accent ? this.resolve(accent) : undefined,
      status: status && status !== 'idle' ? status : undefined,
    };
  }
  private scenePatch(p: WorkflowPatch): WorkflowPatch {
    if (p.kind === 'nodes' && p.value) return { ...p, value: this.sceneNode(p.value as WorkflowNode) };
    if (p.kind === 'edges' && p.value) return { ...p, value: this.sceneEdge(p.value as WorkflowEdge) };
    return p;
  }
  /** a connection's look: its own color, dash, width and animated over its type's (its type, else its port's) */
  look(e: WorkflowEdge): EdgeLook {
    let port: WorkflowPort | undefined;
    const source = this.graph.nodes.get(e.source.node);
    if (source)
      for (const p of source.ports)
        if (p.id === e.source.port) {
          port = p;
          break;
        }
    const type = this.hooks.edgeType(e.type ?? port?.type ?? '');
    return {
      type,
      port,
      color: e.color ?? type?.color,
      dash: e.dash ?? type?.dash,
      width: e.width ?? type?.width,
      animated: e.animated ?? type?.animated ?? false,
    };
  }
  /** a connection as the scene needs it: its look resolved to what a canvas takes, no data */
  private sceneEdge(e: WorkflowEdge): any {
    const look = this.look(e);
    const color = accentOf(look.color);
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      route: e.route,
      points: e.points,
      color: color ? this.resolve(color) : undefined,
      dash: look.dash,
      width: look.width,
    };
  }
  private sceneDocument(): WorkflowDocument {
    return {
      schemaVersion: 1,
      id: 'scene',
      title: 'scene',
      nodes: [...this.graph.nodes.values()].map((n) => this.sceneNode(this.preview.get(n.id) ?? n)),
      edges: [...this.graph.edges.values()].map((e) => this.sceneEdge(e)),
      groups: [...this.graph.groups.values()],
    };
  }
  private reindex(): void {
    this.nodeIndex.clear();
    this.groupIndex.clear();
    for (const n of this.graph.nodes.values())
      if (!ENGINE.collapsedAncestor(n, this.graph.groups)) this.nodeIndex.set(n.id, n);
    for (const g of this.graph.groups.values())
      if (!this.hiddenGroup(g))
        this.groupIndex.set(g.id, { ...g, width: g.collapsed ? 240 : g.width, height: g.collapsed ? 56 : g.height });
  }
  private hiddenGroup(g: WorkflowGroup): boolean {
    let id = g.parentId;
    while (id) {
      const p = this.graph.groups.get(id);
      if (!p) break;
      if (p.collapsed) return true;
      id = p.parentId;
    }
    return false;
  }

  // ---- camera, selection, run states
  setReadonly(value: boolean): void {
    if (this.readonly === value) return;
    this.cancel();
    this.readonly = value;
    for (const card of this.cards.values()) {
      card.body.disabled = value;
      // the views read it (a list's grid, a custom editor's value)
      if (card.node) this.attempt(() => card.view?.update(card.node!, card.runtime ?? IDLE));
    }
    this.request();
  }
  setCamera(camera: WorkflowCamera, rest = true): void {
    if (![camera.x, camera.y, camera.zoom].every(Number.isFinite)) throw new Error('Invalid camera');
    this.camera = { x: camera.x, y: camera.y, zoom: clamp(camera.zoom, MIN_ZOOM, MAX_ZOOM) };
    this.request();
    if (rest) this.rest();
  }
  /** the camera came to rest (no change for 150 ms) */
  private rest(): void {
    clearTimeout(this.viewTimer);
    this.viewTimer = setTimeout(() => this.hooks.view(), 150);
  }
  select(ids: Iterable<string>, edge?: string): void {
    const next = new Set<string>();
    for (const id of ids) if (this.graph.nodes.has(id)) next.add(id);
    const nextEdge = edge && this.graph.edges.has(edge) ? edge : undefined;
    const same =
      next.size === this.selected.size &&
      [...next].every((id) => this.selected.has(id)) &&
      nextEdge === this.selectedEdge;
    if (same) return;
    this.selected.clear();
    for (const id of next) this.selected.add(id);
    this.selectedEdge = nextEdge;
    this.request();
    this.hooks.select();
  }
  setRuntime(id: string, state: WorkflowRuntime): void {
    if (!this.graph.nodes.has(id)) return;
    const before = this.runtime.get(id)?.status ?? 'idle';
    if (state.status === 'idle') this.runtime.delete(id);
    else this.runtime.set(id, { ...state });
    if (before !== state.status) this.statusDirty.add(id);
    this.request();
  }
  clearRuntime(): void {
    for (const id of this.runtime.keys()) this.statusDirty.add(id);
    this.runtime.clear();
    this.request();
  }
  getRuntime(id: string): WorkflowRuntime {
    return this.runtime.get(id) ?? IDLE;
  }
  center(): WorkflowPoint {
    return {
      x: (this.root.clientWidth / 2 - this.camera.x) / this.camera.zoom,
      y: (this.root.clientHeight / 2 - this.camera.y) / this.camera.zoom,
    };
  }
  flyTo(point: WorkflowPoint, zoom = this.camera.zoom): void {
    this.setCamera({
      x: this.root.clientWidth / 2 - point.x * zoom,
      y: this.root.clientHeight / 2 - point.y * zoom,
      zoom,
    });
  }
  /** a field's control (or its value) takes the focus - the node is brought into view first when it has no card */
  focusField(id: string, key: string): boolean {
    const k = CSS.escape(key);
    const find = (): HTMLElement | undefined => {
      const body = this.cards.get(id)?.body;
      return body
        ? (dfDollar(body)
            .find(`[data-key="${k}"] :is(input,select,textarea,[tabindex]), tr[data-path="${k}"] .property-grid-value`)
            .get(0) as HTMLElement | undefined)
        : undefined;
    };
    if (!this.graph.nodes.has(id)) return false;
    const now = find();
    if (now) {
      now.focus({ preventScroll: true });
      return true;
    }
    this.focusNode(id, false);
    // the card mounts with the next frame
    requestAnimationFrame(() => requestAnimationFrame(() => find()?.focus({ preventScroll: true })));
    return true;
  }
  focusNode(id: string, focus = true): void {
    const n = this.graph.nodes.get(id);
    if (!n) return;
    const collapsed = ENGINE.collapsedAncestor(n, this.graph.groups);
    if (collapsed) {
      const g = this.graph.groups.get(collapsed)!;
      this.flyTo({ x: g.x + 120, y: g.y + 28 });
    } else this.flyTo({ x: n.x + n.width / 2, y: n.y + n.height / 2 }, Math.max(this.camera.zoom, 0.8));
    this.select([id]);
    if (focus) this.root.focus({ preventScroll: true });
  }
  fit(selectionOnly = false): void {
    const nodes = selectionOnly
      ? [...this.selected].map((id) => this.graph.nodes.get(id)!).filter(Boolean)
      : [...this.graph.nodes.values()];
    const w = this.root.clientWidth;
    const h = this.root.clientHeight;
    if (!nodes.length || !w || !h) {
      this.setCamera({ x: 80, y: 80, zoom: 1 });
      return;
    }
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const n of nodes) {
      if (n.x < x0) x0 = n.x;
      if (n.y < y0) y0 = n.y;
      if (n.x + n.width > x1) x1 = n.x + n.width;
      if (n.y + n.height > y1) y1 = n.y + n.height;
    }
    const b = { x: x0 - 60, y: y0 - 60, width: x1 - x0 + 120, height: y1 - y0 + 120 };
    // the minimap and the view controls sit over the bottom edge: fit above them while that leaves most of the height
    let band = 0;
    for (const sel of ['.workflow-minimap', '.workflow-controls']) {
      const part = dfDollar(this.root).find(sel).get(0) as HTMLElement | undefined;
      if (part && !part.hidden) band = Math.max(band, h - part.offsetTop + 8);
    }
    const zoomIn = (height: number): number => clamp(Math.min(1.2, w / b.width, height / b.height), MIN_ZOOM, MAX_ZOOM);
    // ... unless that would turn the cards back into boxes
    const above = band > 0 && h - band >= h * 0.55 && (zoomIn(h - band) >= CARD_ZOOM || zoomIn(h) < CARD_ZOOM);
    const free = above ? h - band : h;
    const zoom = zoomIn(free);
    this.setCamera({ x: (w - b.width * zoom) / 2 - b.x * zoom, y: (free - b.height * zoom) / 2 - b.y * zoom, zoom });
  }
  zoomBy(factor: number): void {
    this.zoomAt({ x: this.root.clientWidth / 2, y: this.root.clientHeight / 2 }, factor);
  }
  private zoomAt(p: WorkflowPoint, factor: number): void {
    const w = this.toWorld(p);
    const zoom = clamp(this.camera.zoom * factor, MIN_ZOOM, MAX_ZOOM);
    this.setCamera({ x: p.x - w.x * zoom, y: p.y - w.y * zoom, zoom });
  }
  private toWorld(p: WorkflowPoint, camera = this.camera): WorkflowPoint {
    return { x: (p.x - camera.x) / camera.zoom, y: (p.y - camera.y) / camera.zoom };
  }
  private toScreen(p: WorkflowPoint, camera = this.camera): WorkflowPoint {
    return { x: p.x * camera.zoom + camera.x, y: p.y * camera.zoom + camera.y };
  }
  private local(e: { clientX: number; clientY: number }): WorkflowPoint {
    const r = this.root.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  notify(message: string, tone: 'info' | 'error' = 'info'): void {
    this.live.textContent = message;
    this.message.textContent = message;
    this.message.dataset.tone = tone;
    this.message.hidden = false;
    clearTimeout(this.messageTimer);
    this.messageTimer = setTimeout(() => (this.message.hidden = true), 4000);
  }
  report(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.notify(message, 'error');
    this.hooks.error(message);
  }
  attempt(fn: () => void): void {
    try {
      fn();
    } catch (e) {
      this.report(e);
    }
  }

  // ---- frames
  request(): void {
    if (!this.raf && !this.dead)
      this.raf = requestAnimationFrame(() => {
        this.raf = 0;
        this.draw();
      });
  }
  private domIds(): string[] {
    const w = this.root.clientWidth;
    const h = this.root.clientHeight;
    const box = ENGINE.viewport(this.camera, w, h, 160);
    const ids = new Set<string>();
    const doc = this.root.ownerDocument;
    const focused = (doc.activeElement?.closest('[data-node-id]') as HTMLElement | null)?.dataset.nodeId;
    if (focused && this.root.contains(doc.activeElement) && this.graph.nodes.has(focused)) ids.add(focused);
    if (this.camera.zoom < CARD_ZOOM) return [...ids];
    for (const id of this.selected) {
      if (ids.size >= this.budget.dom) break;
      const n = this.preview.get(id) ?? this.graph.nodes.get(id)!;
      if (!ENGINE.collapsedAncestor(n, this.graph.groups) && ENGINE.intersects(n, box)) ids.add(id);
    }
    for (const id of this.nodeIndex.query(box, this.budget.dom * 4, 20000).ids) {
      if (ids.size >= this.budget.dom) break;
      ids.add(id);
    }
    return [...ids];
  }
  private draw(): void {
    if (this.dead) return;
    const w = this.root.clientWidth;
    const h = this.root.clientHeight;
    if (!w || !h) return;
    if (this.pendingPreview.size) {
      this.renderer.patch(
        [...this.pendingPreview.values()].map((n) => ({ kind: 'nodes' as const, id: n.id, value: this.sceneNode(n) })),
      );
      this.pendingPreview.clear();
    }
    if (this.pendingGroups.length) {
      this.renderer.patch(this.pendingGroups);
      this.pendingGroups = [];
    }
    if (this.statusDirty.size) {
      const patches: WorkflowPatch[] = [];
      for (const id of this.statusDirty) {
        const n = this.preview.get(id) ?? this.graph.nodes.get(id);
        if (n) patches.push({ kind: 'nodes', id, value: this.sceneNode(n) });
      }
      this.statusDirty.clear();
      this.renderer.patch(patches);
    }
    const domIds = this.domIds();
    this.syncCards(domIds);
    this.renderGroups(w, h);
    this.place();
    this.empty.hidden = this.graph.nodes.size > 0;
    const frame: Frame = {
      id: ++this.frameId,
      revision: this.revision,
      camera: { ...this.camera },
      width: w,
      height: h,
      dpr: Math.min(globalThis.devicePixelRatio || 1, 2),
      domIds,
      selection: [...this.selected].slice(0, 64),
      edgeSelection: this.selectedEdge,
      maxEdges: this.edgeBudget,
      maxNodes: this.budget.nodes,
      palette: this.palette,
    };
    this.renderer.draw(frame);
    this.drawOverlay();
    this.drawMinimap();
  }
  /** the live camera on everything the page shows now: the grid, the cards, the groups, the edge bitmap (corrected) */
  private place(): void {
    const c = this.camera;
    const step = 24 * c.zoom;
    this.grid.style.backgroundSize = `${step}px ${step}px`;
    this.grid.style.backgroundPosition = `${c.x}px ${c.y}px`;
    this.grid.dataset.fine = String(step < 8);
    for (const [id, card] of this.cards) {
      const n = this.preview.get(id) ?? this.graph.nodes.get(id);
      if (n) card.el.style.transform = `translate(${n.x * c.zoom + c.x}px, ${n.y * c.zoom + c.y}px) scale(${c.zoom})`;
    }
    // the group titles keep a readable size on screen far off (workflow.css reads it)
    this.groupLayer.style.setProperty('--workflow-zoom', String(c.zoom));
    for (const [id, el] of this.groupEls) {
      const g = this.groupPreview.get(id) ?? this.graph.groups.get(id);
      if (g) el.style.transform = `translate(${g.x * c.zoom + c.x}px, ${g.y * c.zoom + c.y}px) scale(${c.zoom})`;
    }
    const d = this.drawnCamera;
    const canvas = this.renderer.canvas;
    if (d) {
      const s = c.zoom / d.zoom;
      canvas.style.transform =
        s === 1 && c.x === d.x && c.y === d.y ? '' : `translate(${c.x - d.x * s}px, ${c.y - d.y * s}px) scale(${s})`;
    }
    const zoom = this.zoomLabel;
    if (zoom) zoom.textContent = `${Math.round(c.zoom * 100)}%`;
    this.placeEdges();
  }

  // ---- connections above the canvas: a travelling dash (animated, or data flowing into a running node) and a label
  //      (the connection's, or its type's render()) - only for the connections in view, at most 300
  private curveOf(e: WorkflowEdge): any {
    const a = this.preview.get(e.source.node) ?? this.graph.nodes.get(e.source.node);
    const b = this.preview.get(e.target.node) ?? this.graph.nodes.get(e.target.node);
    if (!a || !b) return null;
    if (ENGINE.collapsedAncestor(a, this.graph.groups) || ENGINE.collapsedAncestor(b, this.graph.groups)) return null;
    return ENGINE.route(e, ENGINE.portPosition(a, e.source.port), ENGINE.portPosition(b, e.target.port));
  }
  private dropDecor(id: string): void {
    const d = this.decor.get(id);
    d?.path?.remove();
    d?.label?.remove();
    this.decor.delete(id);
  }
  private placeEdges(): void {
    const c = this.camera;
    const box = ENGINE.viewport(c, this.root.clientWidth, this.root.clientHeight, 40);
    const wanted = new Map<string, { e: WorkflowEdge; curve: any; look: EdgeLook; flow: boolean; label: boolean }>();
    if (c.zoom >= 0.12) {
      if (!this.decorated) {
        this.decorated = new Set();
        for (const e of this.graph.edges.values()) {
          const look = this.look(e);
          if (e.label || look.animated || look.type?.render) this.decorated.add(e.id);
        }
      }
      // data flows into a running node
      const flowing = new Set<string>();
      for (const [id, r] of this.runtime)
        if (r.status === 'running')
          for (const eid of this.graph.edgesFor(id))
            if (this.graph.edges.get(eid)?.target.node === id) flowing.add(eid);
      const candidates =
        this.decorated.size + flowing.size <= 1500
          ? [...this.decorated, ...flowing]
          : this.nodeIndex
              .query(box, 300, 5000)
              .ids.flatMap((id: string) => [...this.graph.edgesFor(id)])
              .filter((id: string) => this.decorated!.has(id) || flowing.has(id));
      for (const id of candidates) {
        if (wanted.size >= 300) break;
        if (wanted.has(id)) continue;
        const e = this.graph.edges.get(id);
        if (!e) continue;
        const curve = this.curveOf(e);
        if (!curve || !ENGINE.intersects(curve.box, box)) continue;
        const look = this.look(e);
        wanted.set(id, {
          e,
          curve,
          look,
          flow: look.animated || flowing.has(id),
          label: c.zoom >= 0.3 && (!!e.label || !!look.type?.render),
        });
      }
    }
    for (const id of this.decor.keys()) if (!wanted.has(id)) this.dropDecor(id);
    const labels: { d: EdgeDecor; curve: any; selected: boolean }[] = [];
    const doc = this.root.ownerDocument;
    const screen = (p: WorkflowPoint): string =>
      `${(p.x * c.zoom + c.x).toFixed(1)},${(p.y * c.zoom + c.y).toFixed(1)}`;
    for (const [id, w] of wanted) {
      let d = this.decor.get(id);
      if (!d) this.decor.set(id, (d = {}));
      if (w.flow) {
        if (!d.path) {
          d.path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
          d.path.setAttribute('class', 'workflow-edge-flow-path');
          this.flowLayer.append(d.path);
        }
        const p = w.curve.points;
        d.path.setAttribute(
          'd',
          w.curve.cubic
            ? `M${screen(p[0])}C${screen(p[1])} ${screen(p[2])} ${screen(p[3])}`
            : 'M' + p.map(screen).join('L'),
        );
        const slot = ENGINE.typeIndex(w.look.port?.type ?? 'any');
        d.path.style.stroke =
          accentOf(w.look.color) ?? (slot >= 0 ? `var(--workflow-type-${slot})` : 'var(--workflow-edge)');
        d.path.style.strokeWidth = `${Math.max(2, (w.look.width ?? 1.75) + 1)}px`;
        d.path.toggleAttribute('data-selected', id === this.selectedEdge);
      } else if (d.path) {
        d.path.remove();
        d.path = undefined;
      }
      if (w.label) {
        const runtime = this.getRuntime(w.e.source.node);
        const value = outputOf(runtime)?.[w.e.source.port];
        const selected = id === this.selectedEdge;
        const drawn = d.drawn;
        if (
          !d.label ||
          !drawn ||
          drawn[0] !== w.e ||
          drawn[1] !== value ||
          drawn[2] !== selected ||
          drawn[3] !== edgeTypesVersion ||
          drawn[4] !== runtime.status
        ) {
          if (!d.label) {
            d.label = doc.createElement('button');
            (d.label as HTMLButtonElement).type = 'button';
            d.label.className = 'workflow-edge-label';
            d.label.tabIndex = -1;
            d.label.dataset.edgeId = id;
            this.labelLayer.append(d.label);
          }
          d.drawn = [w.e, value, selected, edgeTypesVersion, runtime.status];
          // the connection's own label wins over its type's renderer
          let content: string | Node | null = w.e.label ?? null;
          if (content === null && w.look.type?.render)
            try {
              content = w.look.type.render(w.e, {
                source: this.graph.nodes.get(w.e.source.node)!,
                target: this.graph.nodes.get(w.e.target.node)!,
                port: w.look.port,
                value,
                runtime,
                selected,
                workflow: this.root,
              });
            } catch (error) {
              this.report(error);
            }
          if (!put(d.label, content)) {
            d.label.remove();
            d.label = undefined;
            continue;
          }
          d.label.toggleAttribute('data-selected', selected);
          d.label.setAttribute('aria-label', `Connection ${w.e.label ?? id}`);
          d.size = undefined;
        }
        labels.push({ d, curve: w.curve, selected: id === this.selectedEdge });
      } else if (d.label) {
        d.label.remove();
        d.label = undefined;
        d.drawn = undefined;
      }
    }
    this.placeLabels(labels, box);
  }
  /**
   * Puts each connection label where it covers neither a card nor another label: halfway along its connection,
   * else further along it (40 %, 60 %, 30 % ...), else just beside it; a label with no free place hides (`data-crowded`) - the selected
   * one shows at its middle in any case. Places depend on the world and the zoom only, so a pan moves the labels
   * with the connections. Past 150 labels every one sits at its middle (a large graph's frame budget).
   */
  private placeLabels(list: { d: EdgeDecor; curve: any; selected: boolean }[], box: any): void {
    if (!list.length) return;
    const c = this.camera;
    const scale = Math.min(1.25, Math.max(0.75, c.zoom));
    // sizes first, all in one layout: the labels whose content changed (a size of 0 - measured unrendered - again)
    for (const it of list)
      if (!it.d.size?.width) it.d.size = { width: it.d.label!.offsetWidth, height: it.d.label!.offsetHeight };
    const crowd = list.length <= 150;
    const cards: { x: number; y: number; r: number; b: number }[] = [];
    if (crowd)
      for (const id of this.nodeIndex.query(box, 600, 6000).ids) {
        const n = this.preview.get(id) ?? this.graph.nodes.get(id);
        if (!n || ENGINE.collapsedAncestor(n, this.graph.groups)) continue;
        const x = n.x * c.zoom + c.x;
        const y = n.y * c.zoom + c.y;
        cards.push({ x, y, r: x + n.width * c.zoom, b: y + n.height * c.zoom });
      }
    const placed: { x: number; y: number; r: number; b: number }[] = [];
    const free = (q: { x: number; y: number; r: number; b: number }): boolean =>
      !cards.some((o) => q.x < o.r && q.r > o.x && q.y < o.b && q.b > o.y) &&
      !placed.some((o) => q.x < o.r && q.r > o.x && q.y < o.b && q.b > o.y);
    // along the line first, then just beside it (its edge still on the line): two connections out of one port run
    // close together, their middles half as far apart as their ends
    const ALONG = [0.5, 0.4, 0.6, 0.3, 0.7, 0.22, 0.78];
    const PLACES = [
      ...ALONG.map((t) => [t, 0]),
      ...ALONG.flatMap((t) => [
        [t, 1],
        [t, -1],
      ]),
    ];
    // the selected label first: it never hides
    for (const it of [...list].sort((a, b) => Number(b.selected) - Number(a.selected))) {
      const w = it.d.size!.width * scale;
      const h = it.d.size!.height * scale;
      const rect = ([t, side]: number[]) => {
        const m = curveAt(it.curve, t);
        const x = m.x * c.zoom + c.x - w / 2;
        const y = m.y * c.zoom + c.y - h / 2 + side * (h / 2 + 6);
        return { x: x - 2, y: y - 2, r: x + w + 2, b: y + h + 2 };
      };
      let at: { x: number; y: number; r: number; b: number } | undefined;
      if (crowd)
        for (const place of PLACES) {
          const q = rect(place);
          if (free(q)) {
            at = q;
            break;
          }
        }
      else at = rect([0.5, 0]);
      const crowded = !at && !it.selected;
      if (!at) at = rect([0.5, 0]);
      if (!crowded) placed.push(at);
      it.d.label!.toggleAttribute('data-crowded', crowded);
      it.d.label!.style.transform = `translate(${(at.x + 2).toFixed(1)}px, ${(at.y + 2).toFixed(1)}px) scale(${scale})`;
    }
  }
  private present(f: Frame, stats: DrawStats, renderer: 'worker' | 'main'): void {
    if (this.dead) return;
    const cost = stats.rasterMs ?? stats.drawMs;
    if (cost > 20 && stats.edges > 128) {
      this.edgeBudget = Math.max(
        Math.min(128, this.budget.edges),
        Math.floor(this.edgeBudget * Math.max(0.15, Math.min(0.8, 14 / cost))),
      );
      this.fastFrames = 0;
    } else if (cost < 10 && ++this.fastFrames >= 30) {
      this.edgeBudget = Math.min(this.budget.edges, Math.ceil(this.edgeBudget * 1.15));
      this.fastFrames = 0;
    }
    this.drawnCamera = f.camera;
    this.place();
    this.stats = {
      frame: stats.frame,
      drawMs: Math.round(stats.drawMs * 10) / 10,
      edges: stats.edges,
      nodes: stats.nodes,
      domNodes: this.cards.size,
      edgeBudget: stats.edgeBudget,
      edgesTruncated: stats.edgesTruncated,
      renderer,
      zoom: f.camera.zoom,
    };
    this.root.dataset.renderer = renderer;
    this.hooks.frame(this.stats);
    this.resolveReady();
  }

  // ---- cards: a bounded pool of HTML nodes
  private release(id: string, card: Card): void {
    this.attempt(() => card.view?.destroy());
    card.view = undefined;
    card.node = undefined;
    card.runtime = undefined;
    dfDollar(card.body).empty();
    card.el.remove();
    this.cards.delete(id);
    if (this.pool.length < this.budget.dom) this.pool.push(card);
  }
  private syncCards(ids: string[]): void {
    const wanted = new Set(ids);
    for (const [id, card] of this.cards) if (!wanted.has(id)) this.release(id, card);
    for (const id of ids) {
      const node = this.preview.get(id) ?? this.graph.nodes.get(id);
      if (!node) continue;
      let card = this.cards.get(id);
      if (!card) {
        card = this.pool.pop() ?? this.newCard();
        this.cards.set(id, card);
        card.el.dataset.nodeId = id;
        card.signature = '';
        card.type = '';
        this.nodeLayer.append(card.el);
      }
      this.updateCard(card, node);
    }
  }
  private newCard(): Card {
    const doc = this.root.ownerDocument;
    const el = doc.createElement('article');
    el.className = 'workflow-node';
    el.setAttribute('role', 'group');
    const head = doc.createElement('header');
    head.className = 'workflow-node-header';
    const title = doc.createElement('span');
    title.className = 'workflow-node-title';
    const status = doc.createElement('span');
    status.className = 'workflow-node-status';
    head.append(title, status);
    const ports = doc.createElement('div');
    ports.className = 'workflow-node-ports';
    const body = doc.createElement('fieldset');
    body.className = 'workflow-node-body';
    const progress = doc.createElement('div');
    progress.className = 'workflow-node-progress';
    const resize = doc.createElement('button');
    resize.type = 'button';
    resize.className = 'workflow-node-resize';
    resize.setAttribute('aria-label', 'Resize node');
    resize.title = 'Drag to resize; arrow keys resize';
    resize.addEventListener('keydown', (e) => {
      if (!e.key.startsWith('Arrow') || this.readonly) return;
      e.preventDefault();
      e.stopPropagation();
      const n = this.graph.nodes.get(el.dataset.nodeId!);
      if (!n || n.locked) return;
      const dx = e.key === 'ArrowRight' ? 16 : e.key === 'ArrowLeft' ? -16 : 0;
      const dy = e.key === 'ArrowDown' ? 16 : e.key === 'ArrowUp' ? -16 : 0;
      this.attempt(() =>
        this.graph.updateNode(
          n.id,
          { width: Math.max(160, n.width + dx), height: Math.max(ENGINE.contentTop(n) + 40, n.height + dy) },
          'Resize',
        ),
      );
    });
    el.append(head, ports, body, progress, resize);
    return { el, title, status, ports, body, progress, signature: '', type: '', typeVersion: -1 };
  }
  private updateCard(card: Card, n: WorkflowNode): void {
    const c = this.camera;
    card.el.style.width = `${n.width}px`;
    card.el.style.height = `${n.height}px`;
    card.el.style.transform = `translate(${n.x * c.zoom + c.x}px, ${n.y * c.zoom + c.y}px) scale(${c.zoom})`;
    card.el.toggleAttribute('data-selected', this.selected.has(n.id));
    card.el.toggleAttribute('data-locked', !!n.locked);
    card.el.toggleAttribute('data-subgraph', !!n.subgraph);
    card.el.setAttribute('aria-label', n.title);
    if (card.title.textContent !== n.title) card.title.textContent = n.title;
    const state = this.getRuntime(n.id);
    card.el.dataset.status = state.status;
    card.status.title = state.message ?? state.status;
    card.status.textContent =
      state.status === 'running' && state.progress !== undefined
        ? `${Math.round(state.progress * 100)}%`
        : state.status === 'idle'
          ? ''
          : state.status;
    card.progress.style.setProperty(
      '--workflow-progress',
      String(state.progress ?? (state.status === 'success' ? 1 : 0)),
    );
    const definition = this.hooks.types(n.type);
    const accent = accentOf(definition?.color);
    if (accent) card.el.style.setProperty('--workflow-accent-color', accent);
    else card.el.style.removeProperty('--workflow-accent-color');
    const signature = JSON.stringify(n.ports);
    if (card.signature !== signature) {
      dfDollar(card.ports).empty();
      card.signature = signature;
      for (const direction of ['input', 'output'] as const)
        n.ports
          .filter((p) => p.direction === direction)
          .forEach((p, i) => {
            const doc = this.root.ownerDocument;
            const button = doc.createElement('button');
            button.type = 'button';
            button.className = 'workflow-port';
            button.dataset.portId = p.id;
            button.dataset.direction = direction;
            button.style.top = `${ENGINE.PORT_TOP + i * ENGINE.PORT_STEP - 11}px`;
            const t = ENGINE.typeIndex(p.type);
            button.style.setProperty('--workflow-port', t >= 0 ? `var(--workflow-type-${t})` : 'var(--workflow-edge)');
            button.title = `${p.label ?? p.id} · ${p.type}`;
            button.setAttribute('aria-label', `${direction} ${p.label ?? p.id} (${p.type})`);
            const dot = doc.createElement('i');
            dot.setAttribute('aria-hidden', 'true');
            const label = doc.createElement('span');
            label.textContent = p.label ?? p.id;
            button.append(dot, label);
            card.ports.append(button);
          });
    }
    card.body.style.top = `${ENGINE.contentTop(n)}px`;
    const version = this.hooks.typesVersion();
    if (card.type !== n.type || !card.node || card.typeVersion !== version) {
      this.attempt(() => card.view?.destroy());
      card.view = undefined;
      dfDollar(card.body).empty();
      card.type = n.type;
      card.typeVersion = version;
      const id = n.id;
      const context: WorkflowNodeContext = {
        updateData: (data) => this.hooks.write(id, data),
        requestResize: (height) => {
          const current = this.graph.nodes.get(id);
          if (!this.readonly && current)
            this.attempt(() =>
              this.graph.updateNode(id, { height: Math.max(ENGINE.contentTop(current) + 40, height) }, 'Resize'),
            );
        },
      };
      const host: FieldHost = {
        write: (data) => this.hooks.write(id, data),
        edit: (key) => this.hooks.edit(id, key),
        context: (field, node, runtime) => ({
          node,
          field,
          runtime,
          workflow: this.root,
          readonly: this.readonly,
          custom: customEditor(field),
        }),
        readonly: () => this.readonly,
      };
      const layout = definition?.layout ?? this.hooks.layout();
      this.attempt(() => {
        if (definition?.mount) card.view = definition.mount(card.body, n, context);
        else {
          const fields = definition?.fields?.length ? definition.fields : null;
          const list = layout === 'list' ? listView(card.body, n, fields, host) : null;
          if (list) card.view = list;
          else if (fields) card.view = fieldsView(card.body, n, fields, host, `${this.idBase}-${n.id}`);
          else card.view = dataView(card.body, n, definition?.description);
        }
      });
      card.el.dataset.layout = dfDollar(card.body).children('.workflow-properties').get(0) ? 'list' : 'controls';
      card.node = undefined;
    }
    if (card.node !== n || card.runtime !== state) this.attempt(() => card.view?.update(n, state));
    card.node = n;
    card.runtime = state;
    card.body.disabled = this.readonly;
    if (this.connection) this.markCompatible(card);
  }
  private renderGroups(w: number, h: number): void {
    const ids = new Set<string>(this.groupIndex.query(ENGINE.viewport(this.camera, w, h, 100), 100, 2000).ids);
    for (const [id, el] of this.groupEls)
      if (!ids.has(id)) {
        el.remove();
        this.groupEls.delete(id);
      }
    for (const id of ids) {
      const g = this.groupPreview.get(id) ?? this.graph.groups.get(id);
      if (!g) continue;
      let el = this.groupEls.get(id);
      if (!el) {
        el = this.root.ownerDocument.createElement('section');
        el.className = 'workflow-group';
        el.dataset.groupId = id;
        dfDollar(el).html(
          `<header class="workflow-group-header"><button type="button" class="workflow-group-toggle"></button><span class="workflow-group-title"></span><span class="workflow-group-count"></span></header>`,
        );
        this.groupEls.set(id, el);
        this.groupLayer.append(el);
      }
      el.style.width = `${g.collapsed ? 240 : g.width}px`;
      el.style.height = `${g.collapsed ? 56 : g.height}px`;
      el.toggleAttribute('data-collapsed', !!g.collapsed);
      if (g.color) el.style.setProperty('--workflow-group-color', g.color);
      const title = dfDollar(el).find('.workflow-group-title').get(0) as HTMLElement;
      if (title.textContent !== g.title) title.textContent = g.title;
      const toggle = dfDollar(el).find('.workflow-group-toggle').get(0) as HTMLButtonElement;
      toggle.textContent = g.collapsed ? '+' : '−';
      toggle.setAttribute('aria-label', `${g.collapsed ? 'Expand' : 'Collapse'} ${g.title}`);
      toggle.setAttribute('aria-expanded', String(!g.collapsed));
      toggle.disabled = this.readonly;
      const count = dfDollar(el).find('.workflow-group-count').get(0) as HTMLElement;
      count.textContent = g.collapsed ? `${fmt(this.graph.groupMembers(id).length)} nodes` : '';
    }
  }
  toggleGroup(id: string): void {
    const g = this.graph.groups.get(id);
    if (!g || this.readonly) return;
    this.attempt(() =>
      this.graph.commit(g.collapsed ? 'Expand group' : 'Collapse group', [
        { kind: 'groups', id, value: { ...g, collapsed: !g.collapsed } },
      ]),
    );
  }

  // ---- input
  private listen(): void {
    const signal = this.abort.signal;
    const root = this.root;
    // VERIFIED: (workflow.e2e, scrollLeft 86 under overflow: hidden) a focus or scrollIntoView scrolled the editor and
    // the cards, the bitmap and the pointer maths parted; it never scrolls now (overflow: clip), and where clip is
    // unknown this listener undoes a scroll
    root.addEventListener(
      'scroll',
      () => {
        if (root.scrollLeft || root.scrollTop) root.scrollTo(0, 0);
      },
      { signal },
    );
    root.addEventListener('pointerdown', (e) => this.down(e), { signal });
    root.addEventListener('pointermove', (e) => this.move(e), { signal });
    root.addEventListener('pointerup', (e) => this.up(e), { signal });
    root.addEventListener(
      'pointercancel',
      (e) => {
        this.pointers.delete(e.pointerId);
        this.cancel();
      },
      { signal },
    );
    root.addEventListener(
      'lostpointercapture',
      (e) => {
        this.pointers.delete(e.pointerId);
        if (this.gesture && this.gesture.pointer === e.pointerId) this.cancel();
      },
      { signal },
    );
    root.addEventListener('wheel', (e) => this.wheel(e), { passive: false, signal });
    root.addEventListener('keydown', (e) => this.key(e), { signal });
    root.addEventListener(
      'keyup',
      (e) => {
        if (e.code === 'Space') this.space = false;
      },
      { signal },
    );
    root.addEventListener(
      'focusout',
      () => {
        this.space = false;
        this.request();
      },
      { signal },
    );
    root.addEventListener(
      'dblclick',
      (e) => {
        const target = e.target as Element;
        // VERIFIED: (workflow.e2e "subworkflow") a captured pointer's dblclick targets the editor itself: the press
        // remembers the node
        const id =
          (target.closest('[data-node-id]') as HTMLElement | null)?.dataset.nodeId ??
          (target === root ? this.pressedNode : undefined);
        if (id && this.graph.nodes.get(id)?.subgraph && !target.closest('input,textarea,select,button'))
          this.hooks.enter(id);
        else if (!id && !target.closest('.workflow-group,.workflow-controls,.workflow-minimap')) this.fit();
      },
      { signal },
    );
    root.addEventListener(
      'click',
      (e) => {
        const target = e.target as Element;
        const control = (target.closest('[data-workflow-control]') as HTMLElement | null)?.dataset.workflowControl;
        if (control === 'zoom-in') this.zoomBy(1.25);
        else if (control === 'zoom-out') this.zoomBy(0.8);
        else if (control === 'fit') this.fit();
        else if (control === 'reset') this.zoomBy(1 / this.camera.zoom);
        const toggle = target.closest('.workflow-group-toggle');
        if (toggle) this.toggleGroup((toggle.closest('[data-group-id]') as HTMLElement).dataset.groupId!);
        // a port activated from the keyboard (Enter / Space) connects in two steps
        const port = target.closest('[data-port-id]') as HTMLElement | null;
        if (port && (e as MouseEvent).detail === 0 && !this.readonly) {
          const nodeEl = port.closest('[data-node-id]') as HTMLElement;
          this.portAction(
            { node: nodeEl.dataset.nodeId!, port: port.dataset.portId! },
            port.dataset.direction as 'input' | 'output',
          );
        }
      },
      { signal },
    );
    root.addEventListener(
      'dragover',
      (e) => {
        if (e.dataTransfer?.types.includes('application/x-workflow-type') && !this.readonly) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }
      },
      { signal },
    );
    root.addEventListener(
      'drop',
      (e) => {
        const type = e.dataTransfer?.getData('application/x-workflow-type');
        if (!type || this.readonly) return;
        e.preventDefault();
        this.addNode(type, this.toWorld(this.local(e)));
      },
      { signal },
    );
    this.mini.addEventListener(
      'pointerdown',
      (e) => {
        e.stopPropagation();
        capture(this.mini, e.pointerId);
        this.miniJump(e);
      },
      { signal },
    );
    this.mini.addEventListener(
      'pointermove',
      (e) => {
        if (this.mini.hasPointerCapture(e.pointerId)) this.miniJump(e);
      },
      { signal },
    );
  }
  private miniJump(e: PointerEvent): void {
    const r = this.mini.getBoundingClientRect();
    const b = this.miniBounds;
    this.flyTo({
      x: b.x + ((e.clientX - r.left) / r.width) * b.width,
      y: b.y + ((e.clientY - r.top) / r.height) * b.height,
    });
  }
  addNode(type: string, at?: WorkflowPoint): string | undefined {
    if (this.readonly) return undefined;
    const definition = this.hooks.types(type);
    if (!definition) {
      this.report(`Unknown node type ${type}`);
      return undefined;
    }
    const where = at ?? this.center();
    const node = createNode(
      definition,
      { x: where.x - (definition.width ?? 260) / 2, y: where.y - 40 },
      this.hooks.layout(),
    );
    let added: string | undefined;
    this.attempt(() => {
      this.graph.addNode(node);
      this.select([node.id]);
      added = node.id;
    });
    return added;
  }
  private down(e: PointerEvent): void {
    const target = e.target as HTMLElement;
    if (e.button === 2) return;
    if (target.closest('.workflow-minimap,.workflow-controls,.workflow-group-toggle')) return;
    const edgeLabel = target.closest('.workflow-edge-label') as HTMLElement | null;
    if (edgeLabel?.dataset.edgeId && e.pointerType !== 'touch') {
      e.preventDefault();
      this.select([], edgeLabel.dataset.edgeId);
      this.root.focus({ preventScroll: true });
      return;
    }
    const point = this.local(e);
    if (e.pointerType === 'touch') {
      this.pointers.set(e.pointerId, point);
      if (this.pointers.size === 2) {
        // two fingers: pinch to zoom, move to pan - whatever the first finger had started is undone
        this.cancel();
        const [a, b] = [...this.pointers.values()];
        this.gesture = {
          type: 'pinch',
          pointer: e.pointerId,
          start: point,
          last: point,
          camera: { ...this.camera },
          original: [],
          pinch: {
            distance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
            center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
          },
        };
        e.preventDefault();
        return;
      }
    }
    const port = target.closest('[data-port-id]') as HTMLElement | null;
    const nodeEl = target.closest('[data-node-id]') as HTMLElement | null;
    if (port && nodeEl && !this.readonly) {
      e.preventDefault();
      e.stopPropagation();
      this.portAction(
        { node: nodeEl.dataset.nodeId!, port: port.dataset.portId! },
        port.dataset.direction as 'input' | 'output',
      );
      if (this.connection) this.connection.cursor = point;
      capture(this.root, e.pointerId);
      return;
    }
    if (
      target.closest(
        'input,textarea,select,option,label,[contenteditable="true"],a,.property-grid,[data-workflow-field-edit]',
      ) ||
      target.closest('button:not(.workflow-node-resize)')
    )
      return;
    this.root.focus({ preventScroll: true });
    this.pressedNode = nodeEl?.dataset.nodeId;
    let type: Gesture['type'] = 'pan';
    let original: WorkflowNode[] = [];
    if (nodeEl && !this.space && e.button !== 1) {
      const id = nodeEl.dataset.nodeId!;
      if (e.shiftKey || e.metaKey || e.ctrlKey) {
        const next = new Set(this.selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        this.select(next);
      } else if (!this.selected.has(id)) this.select([id]);
      if (!this.readonly) {
        type = target.closest('.workflow-node-resize') ? 'resize' : 'move';
        original = (type === 'resize' ? [id] : [...this.selected])
          .map((nid) => this.graph.nodes.get(nid)!)
          .filter((n) => n && !n.locked);
      }
    } else if (e.shiftKey && !this.space) type = 'marquee';
    const groupEl = target.closest('.workflow-group-header')?.closest('[data-group-id]') as HTMLElement | null;
    let movingGroups: WorkflowGroup[] | undefined;
    if (groupEl && !this.readonly) {
      const gid = groupEl.dataset.groupId!;
      const members = this.graph.groupMembers(gid);
      if (members.some((n) => n.locked)) {
        this.report('Unlock the group’s nodes before moving it');
        return;
      }
      this.select(members.map((n) => n.id));
      type = 'move';
      original = members;
      movingGroups = [...this.graph.groups.values()].filter((g) => {
        let id: string | undefined = g.id;
        while (id) {
          if (id === gid) return true;
          id = this.graph.groups.get(id)?.parentId;
        }
        return false;
      });
    }
    // reroute handles are painted in the overlay; test them before a pan starts
    if (!nodeEl && this.selectedEdge && !this.readonly) {
      const edge = this.graph.edges.get(this.selectedEdge);
      const index =
        edge?.points?.findIndex((p) => {
          const s = this.toScreen(p);
          return Math.hypot(s.x - point.x, s.y - point.y) < 9;
        }) ?? -1;
      if (index >= 0) {
        this.gesture = {
          type: 'bend',
          pointer: e.pointerId,
          start: point,
          last: point,
          camera: { ...this.camera },
          original,
          bend: { edge: this.selectedEdge, index, points: structuredClone(edge!.points!) },
        };
        e.preventDefault();
        capture(this.root, e.pointerId);
        return;
      }
    }
    this.gesture = {
      type,
      pointer: e.pointerId,
      start: point,
      last: point,
      camera: { ...this.camera },
      original,
      groups: movingGroups,
    };
    e.preventDefault();
    capture(this.root, e.pointerId);
    this.root.dataset.gesture = type;
  }
  private move(e: PointerEvent): void {
    const point = this.local(e);
    if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, point);
    if (this.connection) {
      this.connection.cursor = point;
      this.connectionMoved = true;
      this.drawOverlay();
    }
    const g = this.gesture;
    if (!g) return;
    if (g.type === 'pinch') {
      if (this.pointers.size < 2) return;
      const [a, b] = [...this.pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const zoom = clamp((g.camera.zoom * distance) / g.pinch!.distance, MIN_ZOOM, MAX_ZOOM);
      const world = this.toWorld(g.pinch!.center, g.camera);
      this.setCamera({ x: center.x - world.x * zoom, y: center.y - world.y * zoom, zoom });
      return;
    }
    if (g.pointer !== e.pointerId) return;
    g.last = point;
    const dx = g.last.x - g.start.x;
    const dy = g.last.y - g.start.y;
    if (g.type === 'pan') this.setCamera({ ...g.camera, x: g.camera.x + dx, y: g.camera.y + dy });
    else if (g.type === 'move' || g.type === 'resize') {
      const grid = 16;
      const snap = (v: number): number => (e.altKey ? v : Math.round(v / grid) * grid);
      const wx = dx / this.camera.zoom;
      const wy = dy / this.camera.zoom;
      for (const n of g.original) {
        const value =
          g.type === 'move'
            ? { ...n, x: g.groups ? n.x + snap(wx) : snap(n.x + wx), y: g.groups ? n.y + snap(wy) : snap(n.y + wy) }
            : {
                ...n,
                width: Math.max(160, snap(n.width + wx)),
                height: Math.max(ENGINE.contentTop(n) + 40, snap(n.height + wy)),
              };
        this.preview.set(n.id, value);
        this.pendingPreview.set(n.id, value);
        if (!ENGINE.collapsedAncestor(n, this.graph.groups)) this.nodeIndex.set(n.id, value);
        const card = this.cards.get(n.id);
        if (card) this.updateCard(card, value);
      }
      this.pendingGroups = (g.groups ?? []).map((group) => {
        const value = { ...group, x: group.x + snap(wx), y: group.y + snap(wy) };
        this.groupPreview.set(group.id, value);
        this.groupIndex.set(group.id, {
          ...value,
          width: value.collapsed ? 240 : value.width,
          height: value.collapsed ? 56 : value.height,
        });
        return { kind: 'groups' as const, id: group.id, value };
      });
      this.request();
    } else this.drawOverlay();
  }
  private up(e: PointerEvent): void {
    this.pointers.delete(e.pointerId);
    if (this.connection && e.type === 'pointerup') {
      const hit = this.root.ownerDocument.elementFromPoint(e.clientX, e.clientY);
      const portEl = hit?.closest('[data-port-id]') as HTMLElement | null;
      const nodeEl = hit?.closest('[data-node-id]') as HTMLElement | null;
      const from = this.connection.endpoint;
      if (portEl && nodeEl) {
        const endpoint = { node: nodeEl.dataset.nodeId!, port: portEl.dataset.portId! };
        if (endpoint.node !== from.node || endpoint.port !== from.port)
          this.portAction(endpoint, portEl.dataset.direction as 'input' | 'output');
      } else if (nodeEl && nodeEl.dataset.nodeId !== from.node) {
        // dropped on a card: its first free port that fits
        const port = this.bestPort(nodeEl.dataset.nodeId!);
        if (port) this.portAction({ node: nodeEl.dataset.nodeId!, port: port.id }, port.direction);
        else {
          this.report('No free port of a matching type on that node');
          this.endConnection();
        }
      } else if (this.connectionMoved) this.endConnection();
    }
    const g = this.gesture;
    if (g?.type === 'pinch') {
      if (this.pointers.size < 2) {
        this.gesture = undefined;
        delete this.root.dataset.gesture;
      }
      return;
    }
    if (g && g.pointer !== e.pointerId) return;
    this.gesture = undefined;
    delete this.root.dataset.gesture;
    if (this.root.hasPointerCapture(e.pointerId)) this.root.releasePointerCapture(e.pointerId);
    if (!g) return;
    const moved = Math.hypot(g.last.x - g.start.x, g.last.y - g.start.y) > 3;
    if (g.type === 'move' || g.type === 'resize') {
      const patches: WorkflowPatch[] = [
        ...[...this.preview.values()].map((value) => ({ kind: 'nodes' as const, id: value.id, value })),
        ...[...this.groupPreview.values()].map((value) => ({ kind: 'groups' as const, id: value.id, value })),
      ];
      this.preview.clear();
      this.pendingPreview.clear();
      this.groupPreview.clear();
      this.pendingGroups = [];
      if (moved && patches.length) {
        try {
          this.graph.commit(g.type === 'move' ? 'Move nodes' : 'Resize nodes', patches);
        } catch (err) {
          this.restore(g);
          this.report(err);
        }
      } else this.restore(g);
    } else if (g.type === 'marquee') {
      const a = this.toWorld(g.start);
      const b = this.toWorld(g.last);
      const rect = {
        x: Math.min(a.x, b.x),
        y: Math.min(a.y, b.y),
        width: Math.abs(a.x - b.x),
        height: Math.abs(a.y - b.y),
      };
      this.select(this.nodeIndex.query(rect).ids);
    } else if (g.type === 'bend' && g.bend) {
      const edge = this.graph.edges.get(g.bend.edge);
      if (edge && moved) {
        g.bend.points[g.bend.index] = this.toWorld(g.last);
        this.attempt(() =>
          this.graph.commit('Move reroute point', [
            { kind: 'edges', id: edge.id, value: { ...edge, points: g.bend!.points } },
          ]),
        );
      }
    } else if (g.type === 'pan' && !moved) {
      const store = this.graph;
      const version = store.version;
      const point = this.toWorld(this.local(e));
      if (!this.pressedNode)
        void this.renderer.hit(point, 8 / this.camera.zoom).then((id) => {
          // the graph changed meanwhile: the answer is about another graph
          if (this.dead || this.graph !== store || store.version !== version) return;
          this.select([], id);
          if (id && e.altKey && !this.readonly) {
            const edge = this.graph.edges.get(id)!;
            this.attempt(() =>
              this.graph.commit('Add reroute point', [
                { kind: 'edges', id, value: { ...edge, points: [...(edge.points ?? []), point] } },
              ]),
            );
          }
        });
    }
    this.drawOverlay();
    this.request();
  }
  private connectionMoved = false;
  private pressedNode: string | undefined;
  private restore(g: Gesture): void {
    this.renderer.patch([
      ...g.original.map((value) => ({ kind: 'nodes' as const, id: value.id, value: this.sceneNode(value) })),
      ...(g.groups ?? []).map((value) => ({ kind: 'groups' as const, id: value.id, value })),
    ]);
    this.reindex();
  }
  /** the first port of a node that the pending connection may end at */
  private bestPort(nodeId: string): WorkflowPort | undefined {
    const pending = this.connection;
    const n = this.graph.nodes.get(nodeId);
    if (!pending || !n) return undefined;
    const want = pending.direction === 'output' ? 'input' : 'output';
    return n.ports.find((p) => {
      if (p.direction !== want) return false;
      const endpoint = { node: nodeId, port: p.id };
      return want === 'input'
        ? !this.graph.canConnect(pending.endpoint, endpoint, pending.replaceId)
        : !this.graph.canConnect(endpoint, pending.endpoint, pending.replaceId);
    });
  }
  private markCompatible(card: Card): void {
    const pending = this.connection;
    for (const el of dfDollar(card.ports).children('[data-port-id]').toArray() as HTMLElement[]) {
      if (!pending) {
        delete el.dataset.compatible;
        continue;
      }
      const endpoint = { node: card.el.dataset.nodeId!, port: el.dataset.portId! };
      const ok =
        el.dataset.direction !== pending.direction &&
        endpoint.node !== pending.endpoint.node &&
        !(el.dataset.direction === 'input'
          ? this.graph.canConnect(pending.endpoint, endpoint, pending.replaceId)
          : this.graph.canConnect(endpoint, pending.endpoint, pending.replaceId));
      el.dataset.compatible = String(ok);
    }
  }
  private endConnection(): void {
    this.connection = undefined;
    this.connectionMoved = false;
    delete this.root.dataset.connecting;
    for (const card of this.cards.values()) this.markCompatible(card);
    this.drawOverlay();
  }
  private portAction(endpoint: WorkflowEndpoint, direction: 'input' | 'output'): void {
    if (!this.connection) {
      // pulling an occupied input takes its connection along (reconnect); else a new one starts here
      const existing = direction === 'input' ? [...this.graph.connections(endpoint)][0] : undefined;
      if (existing) {
        const edge = this.graph.edges.get(existing)!;
        this.connection = { endpoint: edge.source, direction: 'output', replaceId: existing };
      } else this.connection = { endpoint, direction };
      this.root.dataset.connecting = this.connection.direction;
      this.live.textContent = 'Pick a port to connect to. Escape cancels.';
      for (const card of this.cards.values()) this.markCompatible(card);
      this.drawOverlay();
      return;
    }
    const pending = this.connection;
    if (pending.direction === direction) {
      if (pending.endpoint.node === endpoint.node && pending.endpoint.port === endpoint.port) return;
      this.report('Connect an output to an input');
      this.endConnection();
      return;
    }
    const source = direction === 'output' ? endpoint : pending.endpoint;
    const target = direction === 'input' ? endpoint : pending.endpoint;
    this.attempt(() => {
      const id = this.graph.connect(source, target, pending.replaceId);
      this.live.textContent = 'Connected';
      this.select([], id);
    });
    this.endConnection();
  }
  cancel(): void {
    const g = this.gesture;
    this.gesture = undefined;
    delete this.root.dataset.gesture;
    if (this.connection) this.endConnection();
    this.preview.clear();
    this.pendingPreview.clear();
    this.groupPreview.clear();
    this.pendingGroups = [];
    this.revision++;
    if (g && (g.original.length || g.groups?.length)) this.restore(g);
    this.drawOverlay();
    this.request();
  }
  private wheel(e: WheelEvent): void {
    const target = e.target as Element;
    const body = target.closest('.workflow-node-body, textarea, select') as HTMLElement | null;
    if (body && body.scrollHeight > body.clientHeight && !e.ctrlKey) return;
    if (target.closest('.workflow-minimap')) return;
    e.preventDefault();
    const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
    // a trackpad's two-finger scroll pans (it sends deltaX); a wheel, a pinch (ctrl) or ⌘ zooms at the cursor
    if (!e.ctrlKey && !e.metaKey && (e.shiftKey || (e.deltaMode === 0 && Math.abs(e.deltaX) > 0.5))) {
      const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
      const dy = e.shiftKey && !e.deltaX ? 0 : e.deltaY;
      this.setCamera({ ...this.camera, x: this.camera.x - dx * scale, y: this.camera.y - dy * scale });
    } else this.zoomAt(this.local(e), Math.exp(-e.deltaY * scale * (e.ctrlKey ? 0.01 : 0.0015)));
  }
  copy(): void {
    this.clipboard = this.graph.fragment(this.selected);
  }
  paste(fragment = this.clipboard): void {
    if (this.readonly || !fragment) return;
    this.attempt(() => this.select(this.graph.paste(fragment)));
  }
  duplicate(): void {
    if (!this.readonly && this.selected.size) this.paste(this.graph.fragment(this.selected));
  }
  removeSelection(): void {
    if (this.readonly) return;
    this.attempt(() => {
      if (this.selectedEdge) this.graph.deleteEdge(this.selectedEdge);
      else if (this.selected.size) this.graph.deleteNodes(this.selected);
      this.select([]);
    });
  }
  align(axis: 'x' | 'y'): void {
    if (this.readonly) return;
    const nodes = [...this.selected].map((id) => this.graph.nodes.get(id)!).filter((n) => n && !n.locked);
    if (nodes.length < 2) return;
    const coordinate = Math.min(...nodes.map((n) => n[axis]));
    this.attempt(() =>
      this.graph.commit(
        axis === 'x' ? 'Align left' : 'Align top',
        nodes.map((n) => ({ kind: 'nodes' as const, id: n.id, value: { ...n, [axis]: coordinate } })),
      ),
    );
  }
  private key(e: KeyboardEvent): void {
    const target = e.target as Element;
    if (target.closest('input,textarea,select,[contenteditable="true"],.property-grid,[data-workflow-field-edit]'))
      return;
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    if (e.key === 'Escape') {
      if (this.connection || this.gesture) e.preventDefault();
      this.cancel();
      return;
    }
    if (e.code === 'Space' && target === this.root) {
      this.space = true;
      e.preventDefault();
      return;
    }
    if (mod && k === 'a') {
      e.preventDefault();
      this.select(this.graph.nodes.keys());
    } else if (mod && k === 'c') {
      e.preventDefault();
      this.copy();
    } else if (mod && k === 'v') {
      e.preventDefault();
      this.paste();
    } else if (mod && k === 'd') {
      e.preventDefault();
      this.duplicate();
    } else if (mod && (k === 'z' || k === 'y')) {
      e.preventDefault();
      if (this.readonly) return;
      this.cancel();
      if (e.shiftKey || k === 'y') this.graph.redo();
      else this.graph.undo();
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && !mod) {
      e.preventDefault();
      this.removeSelection();
    } else if (k === 'f' && !mod) {
      e.preventDefault();
      this.fit(e.shiftKey && this.selected.size > 0);
    } else if ((e.key === '+' || e.key === '=') && !mod) this.zoomBy(1.25);
    else if (e.key === '-' && !mod) this.zoomBy(0.8);
    else if (e.key === '0' && !mod) this.zoomBy(1 / this.camera.zoom);
    else if (e.key === 'Enter' && this.selected.size === 1) {
      const id = [...this.selected][0];
      if (this.graph.nodes.get(id)?.subgraph) {
        e.preventDefault();
        this.hooks.enter(id);
      }
    } else if (e.key.startsWith('Arrow') && this.selected.size && target === this.root) {
      e.preventDefault();
      if (e.altKey) {
        // follow a connection: right / down to a node it feeds, left / up to one feeding it
        const first = [...this.selected][0];
        const forward = e.key === 'ArrowRight' || e.key === 'ArrowDown';
        for (const eid of this.graph.edgesFor(first)) {
          const edge = this.graph.edges.get(eid)!;
          if (forward && edge.source.node === first) return this.focusNode(edge.target.node);
          if (!forward && edge.target.node === first) return this.focusNode(edge.source.node);
        }
        return;
      }
      if (this.readonly) return;
      const amount = e.shiftKey ? 64 : 16;
      const dx = e.key === 'ArrowLeft' ? -amount : e.key === 'ArrowRight' ? amount : 0;
      const dy = e.key === 'ArrowUp' ? -amount : e.key === 'ArrowDown' ? amount : 0;
      this.attempt(() =>
        this.graph.commit(
          'Nudge nodes',
          [...this.selected]
            .map((id) => this.graph.nodes.get(id)!)
            .filter((n) => n && !n.locked)
            .map((n) => ({ kind: 'nodes' as const, id: n.id, value: { ...n, x: n.x + dx, y: n.y + dy } })),
        ),
      );
    }
  }

  // ---- overlay and minimap
  private drawOverlay(): void {
    const w = this.root.clientWidth;
    const h = this.root.clientHeight;
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    if (this.overlay.width !== Math.round(w * dpr)) this.overlay.width = Math.round(w * dpr);
    if (this.overlay.height !== Math.round(h * dpr)) this.overlay.height = Math.round(h * dpr);
    const ctx = this.overlay.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = this.palette.accent;
    ctx.fillStyle = this.palette.accent;
    ctx.lineWidth = 2;
    const pending = this.connection;
    if (pending) {
      const n = this.graph.nodes.get(pending.endpoint.node);
      if (n) {
        const p = this.toScreen(ENGINE.portPosition(n, pending.endpoint.port));
        const q = pending.cursor ?? { x: p.x + (pending.direction === 'output' ? 80 : -80), y: p.y };
        const arm = Math.max(40, Math.abs(q.x - p.x) / 2) * (pending.direction === 'output' ? 1 : -1);
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.bezierCurveTo(p.x + arm, p.y, q.x - arm, q.y, q.x, q.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(q.x, q.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const g = this.gesture;
    if (g?.type === 'marquee') {
      ctx.globalAlpha = 0.12;
      ctx.fillRect(g.start.x, g.start.y, g.last.x - g.start.x, g.last.y - g.start.y);
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1;
      ctx.strokeRect(g.start.x + 0.5, g.start.y + 0.5, g.last.x - g.start.x, g.last.y - g.start.y);
    }
    const points = g?.bend
      ? g.bend.points.map((p, i) => (i === g.bend!.index ? this.toWorld(g.last) : p))
      : this.graph.edges.get(this.selectedEdge ?? '')?.points;
    for (const p of points ?? []) {
      const s = this.toScreen(p);
      ctx.fillRect(s.x - 5, s.y - 5, 10, 10);
    }
  }
  private drawMinimap(): void {
    if (this.mini.hidden) return;
    const W = 180;
    const H = 116;
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    if (this.mini.width !== W * dpr) {
      this.mini.width = this.miniBase.width = W * dpr;
      this.mini.height = this.miniBase.height = H * dpr;
      this.miniDirty = true;
    }
    if (this.miniDirty) {
      this.miniDirty = false;
      const base = this.miniBase.getContext('2d')!;
      base.setTransform(dpr, 0, 0, dpr, 0, 0);
      base.clearRect(0, 0, W, H);
      const nodes = [...this.graph.nodes.values()];
      if (!nodes.length) this.miniBounds = { x: 0, y: 0, width: 1000, height: 640 };
      else {
        const pts: WorkflowPoint[] = [];
        for (const n of nodes) pts.push(n, { x: n.x + n.width, y: n.y + n.height });
        const b = ENGINE.bounds(pts, 120);
        const scale = Math.min(W / b.width, H / b.height);
        b.x -= (W / scale - b.width) / 2;
        b.y -= (H / scale - b.height) / 2;
        b.width = W / scale;
        b.height = H / scale;
        this.miniBounds = b;
        base.fillStyle = this.palette.muted;
        base.globalAlpha = 0.55;
        const stride = Math.max(1, Math.ceil(nodes.length / 4000));
        for (let i = 0; i < nodes.length; i += stride) {
          const n = nodes[i];
          base.fillRect(
            (n.x - b.x) * scale,
            (n.y - b.y) * scale,
            Math.max(1, n.width * scale),
            Math.max(1, n.height * scale),
          );
        }
        base.globalAlpha = 1;
        base.fillStyle = this.palette.accent;
        for (const id of [...this.selected].slice(0, 500)) {
          const n = this.graph.nodes.get(id);
          if (n)
            base.fillRect(
              (n.x - b.x) * scale,
              (n.y - b.y) * scale,
              Math.max(2, n.width * scale),
              Math.max(2, n.height * scale),
            );
        }
      }
    }
    const ctx = this.mini.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.mini.width, this.mini.height);
    ctx.drawImage(this.miniBase, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const b = this.miniBounds;
    const scale = W / b.width;
    const box = ENGINE.viewport(this.camera, this.root.clientWidth, this.root.clientHeight);
    ctx.strokeStyle = this.palette.accent;
    ctx.lineWidth = 1.5;
    ctx.strokeRect((box.x - b.x) * scale, (box.y - b.y) * scale, box.width * scale, box.height * scale);
  }
  selectionChanged(): void {
    this.miniDirty = true;
  }
  /** the nodes that intersect the view - for integrations and tests */
  visibleNodeIds(): string[] {
    const box = ENGINE.viewport(this.camera, this.root.clientWidth, this.root.clientHeight);
    return this.nodeIndex.query(box).ids;
  }
  destroy(): void {
    if (this.dead) return;
    this.dead = true;
    cancelAnimationFrame(this.raf);
    clearTimeout(this.viewTimer);
    clearTimeout(this.messageTimer);
    this.abort.abort();
    this.resize.disconnect();
    this.unsubscribe();
    this.renderer.destroy();
    for (const card of this.cards.values()) this.attempt(() => card.view?.destroy());
    this.cards.clear();
    this.pool = [];
    this.viewport.remove();
    delete this.root.dataset.renderer;
    delete this.root.dataset.gesture;
    delete this.root.dataset.connecting;
  }
}

// -- execution ------------------------------------------------------------------------------------------------
// The canvas has no execution semantics: an adapter runs a document and reports node states. The built-in one
// runs the node types' run() handlers in the page, in topological order, a subworkflow as one node.

function localExecutor(types: (type: string) => WorkflowNodeType | undefined): WorkflowExecutionAdapter {
  return {
    async run(document, context) {
      const evaluate = async (
        doc: WorkflowDocument,
        seeds: Record<string, Record<string, WorkflowJson[]>>,
        root: boolean,
      ): Promise<Record<string, Record<string, WorkflowJson>>> => {
        const store = new GraphStore(doc);
        const outputs: Record<string, Record<string, WorkflowJson>> = Object.create(null);
        let i = 0;
        for (const id of store.topologicalOrder()) {
          context.signal.throwIfAborted();
          const node = store.nodes.get(id)!;
          const inputs: Record<string, WorkflowJson[]> = Object.assign(Object.create(null), seeds[id]);
          for (const eid of store.edgesFor(id)) {
            const e = store.edges.get(eid)!;
            if (e.target.node !== id) continue;
            const value = outputs[e.source.node]?.[e.source.port];
            if (value === undefined) continue;
            (inputs[e.target.port] ??= []).push(value);
          }
          if (root) context.emit({ nodeId: id, state: { status: 'running', progress: 0 } });
          if (node.subgraph) {
            const injected: Record<string, Record<string, WorkflowJson[]>> = Object.create(null);
            for (const p of node.subgraph.inputs ?? [])
              (injected[p.endpoint.node] ??= Object.create(null))[p.endpoint.port] = inputs[p.id] ?? [];
            const nested = await evaluate(node.subgraph, injected, false);
            outputs[id] = Object.create(null);
            for (const p of node.subgraph.outputs ?? []) {
              const v = nested[p.endpoint.node]?.[p.endpoint.port];
              if (v !== undefined) outputs[id][p.id] = v;
            }
          } else {
            const type = types(node.type);
            if (!type?.run) throw new Error(`No run handler for ${node.title} (${node.type})`);
            const progress = (value: number): void => {
              if (root) context.emit({ nodeId: id, state: { status: 'running', progress: clamp(value, 0, 1) } });
            };
            outputs[id] = (await type.run(structuredClone(node), { inputs, signal: context.signal, progress })) ?? {};
          }
          context.signal.throwIfAborted();
          if (root) context.emit({ nodeId: id, state: { status: 'success', progress: 1, output: outputs[id] } });
          // a long run yields now and then, so the page keeps drawing
          if (++i % 64 === 0) await new Promise((r) => setTimeout(r, 0));
        }
        return outputs;
      };
      await evaluate(document, Object.create(null), true);
    },
  };
}

// -- the synthetic workflow -------------------------------------------------------------------------------------
// Stages of nodes in columns, connections from a stage to one of the next three - always a DAG, every type matched.
// Deterministic: the same spec gives the same workflow (node n<i>, edge e<i>).

const GENERATED_TYPES = ['image', 'latent', 'text', 'number'];
function generate(spec: WorkflowGenerateSpec = {}): WorkflowDocument {
  const count = clamp(Math.floor(spec.nodes ?? 1000), 1, 100000);
  const want = clamp(Math.floor(spec.edges ?? count * 2), 0, Math.min(1000000, count * 60));
  let seed = (spec.seed ?? 1) >>> 0 || 1;
  const rand = (): number => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  const perStage = clamp(Math.floor(spec.stage ?? Math.ceil(Math.sqrt(count))), 1, count);
  const stages = Math.ceil(count / perStage);
  const doc = emptyDocument();
  doc.id = `generated-${count}`;
  doc.title = `${fmt(count)} nodes, ${fmt(want)} connections`;
  const ports: WorkflowPort[] = [
    ...GENERATED_TYPES.map((type) => ({
      id: `in-${type}`,
      label: type,
      direction: 'input' as const,
      type,
      maxConnections: 0,
    })),
    ...GENERATED_TYPES.map((type) => ({ id: `out-${type}`, label: type, direction: 'output' as const, type })),
  ];
  const STEPS = ['Load', 'Resize', 'Encode', 'Sample', 'Decode', 'Filter', 'Blend', 'Score', 'Caption', 'Save'];
  for (let i = 0; i < count; i++) {
    const stage = Math.floor(i / perStage);
    const row = i % perStage;
    doc.nodes.push({
      id: `n${i}`,
      type: 'generated',
      title: `${STEPS[(stage + row) % STEPS.length]} ${i}`,
      x: stage * 360,
      y: row * 220,
      width: 240,
      height: 180,
      ports,
      data: { stage, index: i },
    });
  }
  if (stages > 1)
    for (let i = 0; i < want; i++) {
      const s = Math.floor(rand() * (stages - 1));
      const t = Math.min(stages - 1, s + 1 + Math.floor(rand() * rand() * 3));
      const a = s * perStage + Math.floor(rand() * perStage);
      const b = t * perStage + Math.floor(rand() * perStage);
      if (a >= count || b >= count) continue;
      const type = GENERATED_TYPES[Math.floor(rand() * GENERATED_TYPES.length)];
      doc.edges.push({
        id: `e${doc.edges.length}`,
        source: { node: `n${a}`, port: `out-${type}` },
        target: { node: `n${b}`, port: `in-${type}` },
      });
    }
  // drop the duplicates the dice threw
  const seen = new Set<string>();
  doc.edges = doc.edges.filter((e) => {
    const key = edgeKey(e);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const span = Math.floor(spec.groups ?? 0);
  if (span > 0)
    for (let s = 0, g = 0; s < stages; s += span, g++) {
      const id = `g${g}`;
      const x = s * 360 - 30;
      const width = Math.min(span, stages - s) * 360 - 120 + 60;
      doc.groups.push({
        id,
        title: `Stages ${s + 1}-${Math.min(stages, s + span)}`,
        x,
        y: -60,
        width,
        height: perStage * 220 + 50,
        ...(spec.collapsed && g % 2 === 1 ? { collapsed: true } : {}),
      });
      for (let i = s * perStage; i < Math.min(count, (s + span) * perStage); i++) doc.nodes[i].groupId = id;
    }
  return doc;
}

// -- formats: the ComfyUI API prompt and Gradio's workflow schema 2 ------------------------------------------------

/** One node of a ComfyUI API prompt. */
export interface WorkflowComfyNode {
  /** the node class */
  class_type: string;
  /** parameters and links ([source node id, output slot]) by input name */
  inputs: Record<string, WorkflowJson>;
  /** the title */
  _meta?: { title?: string };
}

/** A ComfyUI API prompt: each node id names its node (not LiteGraph's visual workflow JSON). */
export type WorkflowComfyPrompt = Record<string, WorkflowComfyNode>;

function fromComfy(prompt: WorkflowComfyPrompt): WorkflowDocument {
  jsonValue(prompt);
  assert(isRecord(prompt), 'Invalid ComfyUI prompt');
  const doc = emptyDocument();
  doc.id = 'comfyui-prompt';
  doc.title = 'Imported ComfyUI prompt';
  const map = new Map<string, WorkflowNode>();
  Object.entries(prompt).forEach(([id, entry], i) => {
    const raw: unknown = entry;
    assert(isRecord(raw) && typeof raw.class_type === 'string' && isRecord(raw.inputs), 'Invalid ComfyUI node');
    const n: WorkflowNode = {
      id,
      type: `comfy:${entry.class_type}`,
      title: entry._meta?.title || entry.class_type,
      x: (i % 4) * 360,
      y: Math.floor(i / 4) * 300,
      width: 260,
      height: 200,
      ports: [],
      data: { params: {} },
    };
    map.set(id, n);
    doc.nodes.push(n);
  });
  for (const [id, entry] of Object.entries(prompt)) {
    const n = map.get(id)!;
    for (const [key, value] of Object.entries(entry.inputs)) {
      if (Array.isArray(value) && value.length === 2 && typeof value[0] === 'string' && typeof value[1] === 'number') {
        const source = map.get(value[0]);
        assert(source && Number.isInteger(value[1]) && value[1] >= 0 && value[1] < 256, 'Invalid ComfyUI output link');
        const out = `out:${value[1]}`;
        for (let slot = 0; slot <= value[1]; slot++)
          if (!source.ports.some((p) => p.id === `out:${slot}`))
            source.ports.push({ id: `out:${slot}`, label: `Output ${slot}`, direction: 'output', type: 'any' });
        n.ports.push({ id: `in:${key}`, label: key, direction: 'input', type: 'any' });
        doc.edges.push({
          id: `link-${doc.edges.length}`,
          source: { node: source.id, port: out },
          target: { node: id, port: `in:${key}` },
        });
      } else (n.data.params as Record<string, WorkflowJson>)[key] = value as WorkflowJson;
    }
  }
  for (const n of doc.nodes) n.height = Math.max(n.height, 110 + 26 * n.ports.length);
  return new GraphStore(doc).export();
}
function toComfy(document: WorkflowDocument): WorkflowComfyPrompt {
  const store = new GraphStore(document);
  const prompt: WorkflowComfyPrompt = Object.create(null);
  for (const n of store.nodes.values()) {
    assert(n.type.startsWith('comfy:') && !n.subgraph, 'ComfyUI export needs imported comfy:* nodes');
    const params = n.data.params;
    assert(isRecord(params), 'Invalid ComfyUI parameters');
    prompt[n.id] = {
      class_type: n.type.slice(6),
      inputs: structuredClone(params) as Record<string, WorkflowJson>,
      _meta: { title: n.title },
    };
  }
  for (const e of store.edges.values()) {
    assert(e.source.port.startsWith('out:') && e.target.port.startsWith('in:'), 'Invalid ComfyUI port');
    prompt[e.target.node].inputs[e.target.port.slice(3)] = [e.source.node, Number(e.source.port.slice(4))];
  }
  return prompt;
}
type JsonObject = { [key: string]: WorkflowJson };
const object = (value: WorkflowJson | undefined, name: string): JsonObject => {
  assert(isRecord(value), `Invalid ${name}`);
  return value as JsonObject;
};
const list = (value: WorkflowJson | undefined, name: string): WorkflowJson[] => {
  assert(Array.isArray(value), `Invalid ${name}`);
  return value;
};
const word = (value: WorkflowJson | undefined, name: string): string => {
  assert(typeof value === 'string' && value.length > 0, `Invalid ${name}`);
  return value;
};
function fromGradio(raw: Record<string, WorkflowJson>): WorkflowDocument {
  jsonValue(raw);
  const input = object(raw, 'Gradio workflow');
  assert(input.schema_version === '2', 'The Gradio adapter reads schema_version "2"');
  const doc = emptyDocument();
  doc.id = typeof input.id === 'string' ? input.id : 'gradio-workflow';
  doc.title = word(input.name, 'Gradio name');
  const { references, operators, subjects, edges, ...metadata } = input;
  doc.metadata = { gradio: metadata };
  for (const [collection, role] of [
    [references, 'reference'],
    [operators, 'operator'],
    [subjects, 'subject'],
  ] as const)
    for (const value of list(collection, role)) {
      const n = object(value, 'Gradio node');
      const ports: WorkflowPort[] = [];
      const originalPorts: JsonObject = {};
      for (const [direction, values] of [
        ['input', n.inputs],
        ['output', n.outputs],
      ] as const)
        for (const pv of list(values, `${direction} ports`)) {
          const p = object(pv, 'Gradio port');
          const id = `${direction}:${word(p.id, 'port id')}`;
          const type = word(p.type, 'port type');
          originalPorts[id] = p;
          ports.push({
            id,
            label: typeof p.label === 'string' && p.label ? p.label : String(p.id),
            direction,
            type,
            optional: p.required !== true,
            ...(type === 'text' ? { accepts: ['markdown'] } : type === 'markdown' ? { accepts: ['text'] } : {}),
          });
        }
      const { inputs: _inputs, outputs: _outputs, data, x, y, width, height, ...extra } = n;
      doc.nodes.push({
        id: word(n.id, 'node id'),
        type: `gradio:${role}`,
        title: word(n.label, 'node label'),
        x: typeof x === 'number' ? x : (doc.nodes.length % 4) * 360,
        y: typeof y === 'number' ? y : Math.floor(doc.nodes.length / 4) * 300,
        width: typeof width === 'number' ? Math.max(160, width) : 260,
        height:
          typeof height === 'number'
            ? Math.max(110 + 26 * ports.length, height)
            : Math.max(200, 110 + 26 * ports.length),
        ports,
        data: { values: data ?? {}, gradio: extra, gradioPorts: originalPorts },
      });
    }
  doc.edges = list(edges, 'Gradio edges').map((value) => {
    const e = object(value, 'Gradio edge');
    return {
      id: word(e.id, 'edge id'),
      source: { node: word(e.from_node_id, 'source node'), port: `output:${word(e.from_port_id, 'source port')}` },
      target: { node: word(e.to_node_id, 'target node'), port: `input:${word(e.to_port_id, 'target port')}` },
    };
  });
  return new GraphStore(doc).export();
}
function toGradio(document: WorkflowDocument): Record<string, WorkflowJson> {
  const store = new GraphStore(document);
  const result: JsonObject = {
    ...object((document.metadata?.gradio ?? {}) as WorkflowJson, 'Gradio metadata'),
    schema_version: '2',
    id: document.id,
    name: document.title,
    references: [],
    operators: [],
    subjects: [],
    edges: [],
  };
  for (const n of store.nodes.values()) {
    assert(n.type.startsWith('gradio:') && !n.subgraph, 'Gradio export needs imported gradio:* nodes');
    const extra = object(n.data.gradio, 'Gradio node metadata');
    const original = object(n.data.gradioPorts, 'Gradio port metadata');
    const ports = (direction: 'input' | 'output'): JsonObject[] =>
      n.ports
        .filter((p) => p.direction === direction)
        .map((p) => ({
          ...(original[p.id] ? object(original[p.id], 'port metadata') : {}),
          id: p.id.slice(direction.length + 1),
          label: p.label ?? p.id,
          type: p.type,
          required: !p.optional,
        }));
    const value: JsonObject = {
      ...extra,
      id: n.id,
      label: n.title,
      data: n.data.values ?? {},
      inputs: ports('input'),
      outputs: ports('output'),
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
    };
    const collection =
      n.type === 'gradio:reference'
        ? 'references'
        : n.type === 'gradio:operator'
          ? 'operators'
          : n.type === 'gradio:subject'
            ? 'subjects'
            : '';
    assert(collection, 'Unknown Gradio role');
    (result[collection] as WorkflowJson[]).push(value);
  }
  result.edges = [...store.edges.values()].map((e) => ({
    id: e.id,
    from_node_id: e.source.node,
    from_port_id: e.source.port.slice(7),
    to_node_id: e.target.node,
    to_port_id: e.target.port.slice(6),
    type: store.nodes.get(e.source.node)!.ports.find((p) => p.id === e.source.port)!.type,
  }));
  return result;
}
/** any of the three formats, recognised by its shape */
function readAny(raw: unknown): WorkflowDocument {
  assert(isRecord(raw), 'Not a workflow');
  if (raw.schemaVersion !== undefined) return raw as unknown as WorkflowDocument;
  if (raw.schema_version !== undefined) return fromGradio(raw as Record<string, WorkflowJson>);
  return fromComfy(raw as unknown as WorkflowComfyPrompt);
}

// -- the instance: the canvas, the subworkflow stack, the outlets, the actions, the run ------------------------------

const OUTLETS = ['palette', 'outline', 'inspector', 'breadcrumb'] as const;
const live = new Set<Workflow>();
let typesVersion = 0;

class Workflow {
  readonly el: HTMLElement;
  canvas!: Canvas;
  private types = new Map<string, WorkflowNodeType>();
  private edgeTypes = new Map<string, WorkflowEdgeType>();
  private stack: { graph: GraphStore; nodeId: string; camera: WorkflowCamera }[] = [];
  private execution: WorkflowExecutionAdapter | null = null;
  private runAbort: AbortController | null = null;
  private layoutAbort: AbortController | null = null;
  private outletsTimer = 0;
  private inspectedKey = '';
  private inspectedGraph: GraphStore | null = null;
  private attrObserver: MutationObserver;
  private writing = false;
  private themeObserver: MutationObserver;
  private offTheme: () => void;
  private file: HTMLInputElement;
  failed = '';

  constructor(el: HTMLElement) {
    this.el = el;
    this.readTypes();
    let store: GraphStore;
    try {
      store = new GraphStore(this.readSource());
    } catch (e) {
      this.failed = (e as Error).message;
      store = new GraphStore();
    }
    el.setAttribute('role', 'application');
    el.setAttribute('aria-roledescription', 'workflow editor');
    if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
    this.canvas = new Canvas(
      el,
      store,
      {
        readonly: el.hasAttribute('data-readonly'),
        worker: el.dataset.worker !== 'none',
        minimap: el.dataset.minimap !== 'none',
        controls: el.dataset.controls !== 'none',
      },
      {
        types: (type) => this.type(type),
        typesVersion: () => typesVersion,
        change: (change) => this.changed(change),
        select: () => this.selected(),
        view: () => this.emit('workflow-view'),
        frame: () => this.scheduleOutputs(),
        error: (message) => this.emit('workflow-error', message),
        enter: (id) => this.enter(id),
        write: (id, data) => void this.writeData(id, data),
        edit: (id, key) => void this.editField(id, key),
        layout: () => this.layout(),
        edgeType: (name) => this.edgeTypes.get(name) ?? globalEdgeTypes.get(name),
      },
    );
    this.file = el.ownerDocument.createElement('input');
    this.file.type = 'file';
    this.file.accept = '.json,application/json';
    this.file.hidden = true;
    this.file.setAttribute('data-ce-chrome', '');
    this.file.addEventListener('change', () => void this.importFile());
    this.canvas.viewport.append(this.file);
    if (this.failed) this.canvas.report(`The workflow could not be read: ${this.failed}`);
    // attributes written from outside (data-readonly, data-selected) apply at once
    this.attrObserver = new MutationObserver(() => {
      if (this.writing) return;
      const c = configOf(el);
      this.canvas.setReadonly(el.hasAttribute('data-readonly'));
      this.canvas.select(c.selected, c.edge ?? undefined);
      this.refreshOutlets();
    });
    this.attrObserver.observe(el, {
      attributes: true,
      attributeFilter: ['data-readonly', 'data-selected', 'data-selected-edge'],
    });
    const initial = configOf(el);
    if (initial.selected.length || initial.edge) this.canvas.select(initial.selected, initial.edge ?? undefined);
    // a theme change re-reads the colors the canvas draws with
    const theme = (): void => this.canvas.refreshTheme();
    this.themeObserver = new MutationObserver(theme);
    this.themeObserver.observe(el.ownerDocument.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme'],
    });
    el.ownerDocument.addEventListener('defuss-theme-change', theme);
    this.offTheme = () => el.ownerDocument.removeEventListener('defuss-theme-change', theme);
    live.add(this);
    void this.canvas.ready.then(() => {
      if (el.dataset.camera) {
        const [x, y, zoom] = el.dataset.camera.split(/[\s,]+/).map(Number);
        if ([x, y, zoom].every(Number.isFinite)) this.canvas.setCamera({ x, y, zoom });
        else this.canvas.fit();
      } else this.canvas.fit();
      el.dataset.workflowStatus = this.failed ? 'error' : 'ready';
      this.refreshOutlets();
    });
    // the first frame needs a size: fit as soon as the element has one
    this.canvas.fit();
    this.refreshOutlets();
  }
  private readSource(): WorkflowDocument {
    const script = dfDollar(this.el).children('script.workflow-source').get(0) as HTMLScriptElement | undefined;
    if (script?.textContent?.trim()) {
      const doc = readAny(JSON.parse(script.textContent));
      return doc;
    }
    if (this.el.dataset.generate)
      return generate({
        nodes: Number(this.el.dataset.generate),
        edges: this.el.dataset.edges ? Number(this.el.dataset.edges) : undefined,
        seed: this.el.dataset.seed ? Number(this.el.dataset.seed) : undefined,
        stage: this.el.dataset.stage ? Number(this.el.dataset.stage) : undefined,
        groups: this.el.dataset.groups ? Number(this.el.dataset.groups) : undefined,
        collapsed: this.el.hasAttribute('data-collapsed'),
      });
    return emptyDocument();
  }
  private readTypes(): void {
    for (const script of dfDollar(this.el).children('script.workflow-types').toArray() as HTMLScriptElement[]) {
      try {
        const list = JSON.parse(script.textContent || '[]');
        for (const t of Array.isArray(list) ? list : [list]) {
          const checked = checkType(t);
          this.types.set(checked.type, checked);
        }
      } catch (e) {
        console.error('workflow: invalid node types', e);
      }
    }
  }
  /** an element's own type wins; a global one of the same name lends what it lacks (a JSON type has no run()) */
  type(type: string): WorkflowNodeType | undefined {
    const local = this.types.get(type);
    const global = globalTypes.get(type);
    if (!local || !global) return local ?? global;
    // a JSON field lends nothing: the global field of the same key lends its hooks (edit, render, renderLabel)
    const fields =
      local.fields && global.fields
        ? local.fields.map((field) => {
            const lender = global.fields!.find((g) => g.key === field.key);
            return lender ? { ...lender, ...field } : field;
          })
        : (local.fields ?? global.fields);
    return { ...global, ...local, fields, run: local.run ?? global.run, mount: local.mount ?? global.mount };
  }
  /** the layout of a type that names none: data-layout on the element */
  layout(): 'controls' | 'list' {
    return this.el.dataset.layout === 'list' ? 'list' : 'controls';
  }

  // ---- fields
  /** the ids of the subworkflow nodes the view is inside, from the top */
  location(): string[] {
    return this.stack.map((f) => f.nodeId);
  }
  /** writes data keys of a node of the shown level: one undoable change, a workflow-field-change per changed key */
  writeData(id: string, data: Record<string, WorkflowJson>): boolean {
    if (this.canvas.readonly) return false;
    const node = this.graph.nodes.get(id);
    if (!node) return false;
    const changed = Object.keys(data).filter((k) => JSON.stringify(node.data[k]) !== JSON.stringify(data[k]));
    if (!changed.length) return true;
    let ok = false;
    this.canvas.attempt(() => {
      // named by the card and the keys, so a history reads "Edit Item 9: answer"
      this.graph.updateNode(id, { data: { ...node.data, ...data } }, `Edit ${node.title || id}: ${changed.join(', ')}`);
      ok = true;
    });
    if (!ok) return false;
    const path = this.location();
    for (const key of changed)
      // a node's field took a new value: its control, a custom editor or setField() - undo and redo are workflow-change only
      this.el.dispatchEvent(
        new CustomEvent<WorkflowFieldChangeDetail>('workflow-field-change', {
          bubbles: true,
          detail: {
            nodeId: id,
            key,
            value: structuredClone(data[key]),
            oldValue: node.data[key] === undefined ? undefined : structuredClone(node.data[key]),
            path,
          },
        }),
      );
    return true;
  }
  /** the field definition of a node's key (its type's fields) */
  field(id: string, key: string): WorkflowField | undefined {
    const node = this.graph.nodes.get(id);
    return node ? this.type(node.type)?.fields?.find((f) => f.key === key) : undefined;
  }
  /**
   * Opens a field's editor: a custom one through workflow-field-edit (cancelable) and the field's edit(); an inline
   * control gets the focus.
   */
  async editField(id: string, key: string): Promise<boolean> {
    const node = this.graph.nodes.get(id);
    const field = this.field(id, key);
    if (!node || !field) return false;
    if (!customEditor(field)) return this.canvas.focusField(id, key);
    if (this.canvas.readonly) return false;
    const value = node.data[key] === undefined ? undefined : structuredClone(node.data[key]);
    // a field's custom editor is asked for (a click on its value, Enter, editField()) - preventDefault() and write the value with setField()
    const asked = new CustomEvent<WorkflowFieldEditDetail>('workflow-field-edit', {
      bubbles: true,
      cancelable: true,
      detail: { nodeId: id, key, value, path: this.location() },
    });
    if (!this.el.dispatchEvent(asked) || !field.edit) return false;
    const graph = this.graph;
    let next: WorkflowJson | undefined;
    try {
      next = await field.edit(value, {
        node,
        field,
        runtime: this.canvas.getRuntime(id),
        workflow: this.el,
        readonly: false,
        custom: true,
      });
    } catch (e) {
      this.canvas.report(e);
      return false;
    }
    // the editor came back to another workflow (loaded, entered, left): the value has no node to go to
    if (next === undefined || this.graph !== graph || !graph.nodes.has(id)) return false;
    return this.writeData(id, { [key]: next });
  }

  // ---- the tree of the whole document
  tree(): WorkflowTreeRow[] {
    const rows: WorkflowTreeRow[] = [];
    const levels = [...this.stack.map((f) => f.graph), this.graph];
    const entered = this.location();
    const walk = (
      nodes: Iterable<WorkflowNode>,
      groups: Iterable<WorkflowGroup>,
      depth: number,
      prefix: string[],
      parent: string | null,
    ): void => {
      const level = prefix.join('/');
      const known = new Set<string>();
      const groupList = [...groups];
      for (const g of groupList) known.add(g.id);
      for (const g of groupList)
        rows.push({
          id: `${level}#${g.id}`,
          parentId: g.parentId && known.has(g.parentId) ? `${level}#${g.parentId}` : parent,
          title: g.title,
          kind: 'group',
          type: 'group',
          path: [...prefix],
        });
      for (const n of nodes) {
        const path = [...prefix, n.id];
        const id = path.join('/');
        rows.push({
          id,
          parentId: n.groupId && known.has(n.groupId) ? `${level}#${n.groupId}` : parent,
          title: n.title,
          kind: n.subgraph ? 'subworkflow' : 'node',
          type: n.type,
          path,
        });
        if (!n.subgraph) continue;
        // the subworkflow being edited is live in its store, the others are the node's document
        const live = depth >= 0 && entered[depth] === n.id ? levels[depth + 1] : undefined;
        if (live) walk(live.nodes.values(), live.groups.values(), depth + 1, path, id);
        else walk(n.subgraph.nodes, n.subgraph.groups ?? [], -1, path, id);
      }
    };
    walk(levels[0].nodes.values(), levels[0].groups.values(), 0, [], null);
    return rows;
  }
  /** shows a node anywhere in the document: enters the subworkflows on its way, selects it, moves the view when asked */
  reveal(path: string[], camera: boolean): boolean {
    if (!path.length) return false;
    const way = path.slice(0, -1);
    const id = path[path.length - 1];
    const here = this.location();
    let common = 0;
    while (common < here.length && common < way.length && here[common] === way[common]) common++;
    if (here.length > common) this.leave(here.length - common);
    for (let i = common; i < way.length; i++) {
      if (!this.graph.nodes.get(way[i])?.subgraph) return false;
      this.enter(way[i]);
    }
    if (!this.graph.nodes.has(id)) return false;
    if (camera) this.canvas.focusNode(id, false);
    else this.canvas.select([id]);
    return true;
  }
  register(definition: WorkflowNodeType): () => void {
    const checked = checkType(definition);
    this.types.set(checked.type, checked);
    typesVersion++;
    this.canvas.refreshTheme();
    this.refreshOutlets();
    return () => {
      if (this.types.get(checked.type) === checked) this.types.delete(checked.type);
      typesVersion++;
      this.canvas.refreshTheme();
      this.refreshOutlets();
    };
  }
  /** adds a connection type to this element (its own win over the global ones) */
  registerEdge(definition: WorkflowEdgeType): () => void {
    const checked = checkEdgeType(definition);
    this.edgeTypes.set(checked.type, checked);
    edgeTypesVersion++;
    this.canvas.refreshTheme();
    return () => {
      if (this.edgeTypes.get(checked.type) === checked) this.edgeTypes.delete(checked.type);
      edgeTypesVersion++;
      this.canvas.refreshTheme();
    };
  }
  /** changes a connection: label, type, look or data - one undoable change */
  setEdge(id: string, update: Partial<Omit<WorkflowEdge, 'id' | 'source' | 'target'>>): boolean {
    const e = this.graph.edges.get(id);
    if (!e) return false;
    const next: Record<string, unknown> = { ...e, ...update, id: e.id, source: e.source, target: e.target };
    for (const k of Object.keys(next)) if (next[k] === undefined || next[k] === null) delete next[k];
    validateEdge(next);
    this.graph.commit('Edit connection', [{ kind: 'edges', id, value: next as unknown as WorkflowEdge }]);
    return true;
  }
  allTypes(): WorkflowNodeType[] {
    return [...new Set([...globalTypes.keys(), ...this.types.keys()])].map((t) => this.type(t)!);
  }
  get graph(): GraphStore {
    return this.canvas.graph;
  }

  // ---- events, state attributes
  emit(name: string, message?: string): void {
    const el = this.el;
    if (name === 'workflow-view') {
      // the camera came to rest (no change for 150 ms)
      el.dispatchEvent(
        new CustomEvent<WorkflowViewDetail>('workflow-view', {
          bubbles: true,
          detail: { camera: { ...this.canvas.camera } },
        }),
      );
    } else if (name === 'workflow-error') {
      // an action was refused or failed: a connection that does not fit, an import that cannot be read
      el.dispatchEvent(
        new CustomEvent<WorkflowErrorDetail>('workflow-error', { bubbles: true, detail: { message: message ?? '' } }),
      );
    }
  }
  private changed(change: WorkflowChangeDetail): void {
    // a committed transaction: an edit, an undo, a redo, an arrangement
    this.el.dispatchEvent(
      new CustomEvent<WorkflowChangeDetail>('workflow-change', {
        bubbles: true,
        detail: { label: change.label, version: change.version, undo: change.undo, patches: change.patches },
      }),
    );
    this.writeAttrs();
    this.refreshOutlets();
  }
  private selected(): void {
    this.canvas.selectionChanged();
    this.writeAttrs();
    const { selected, edge } = configOf(this.el);
    // the selection changed: a click, a marquee, select-all, setState, reveal()
    this.el.dispatchEvent(
      new CustomEvent<WorkflowSelectDetail>('workflow-select', {
        bubbles: true,
        detail: { selected, edge, path: this.location() },
      }),
    );
    this.refreshOutlets();
  }
  /** the selection as attributes (the state's markup) */
  writeAttrs(): void {
    this.writing = true;
    applyMarkup(this.el, this.canvas.readonly ? 'readonly' : 'default', {
      selected: [...this.canvas.selected],
      edge: this.canvas.selectedEdge ?? null,
    });
    this.attrObserver?.takeRecords();
    this.writing = false;
  }
  setReadonly(on: boolean): void {
    this.canvas.setReadonly(on);
    this.writeAttrs();
    this.refreshOutlets();
  }

  // ---- subworkflows
  enter(id: string): void {
    const n = this.graph.nodes.get(id);
    if (!n?.subgraph) return;
    let child: GraphStore;
    try {
      child = new GraphStore(n.subgraph);
    } catch (e) {
      this.canvas.report(e);
      return;
    }
    this.stack.push({ graph: this.graph, nodeId: id, camera: { ...this.canvas.camera } });
    this.canvas.setGraph(child);
    this.canvas.fit();
    this.navigated();
  }
  leave(levels = 1): void {
    for (let i = 0; i < levels; i++) {
      const parent = this.stack.pop();
      if (!parent) break;
      // what changed inside goes back into the node, one undoable change of the parent
      if (!this.canvas.readonly && this.graph.version > 0)
        this.canvas.attempt(() =>
          parent.graph.updateNode(parent.nodeId, { subgraph: this.graph.export() }, 'Edit subworkflow'),
        );
      this.canvas.setGraph(parent.graph);
      this.canvas.setCamera(parent.camera);
    }
    this.navigated();
  }
  private navigated(): void {
    this.writeAttrs();
    // the view entered or left a subworkflow
    this.el.dispatchEvent(
      new CustomEvent<WorkflowNavigateDetail>('workflow-navigate', { bubbles: true, detail: { path: this.path() } }),
    );
    this.refreshOutlets();
  }
  path(): string[] {
    return [...this.stack.map((f) => f.graph.title), this.graph.title];
  }
  /** the whole document - the subworkflow being edited written back into its node, up to the top */
  export(): WorkflowDocument {
    let doc = this.graph.export();
    for (const frame of [...this.stack].reverse()) {
      const parent = frame.graph.export();
      const n = parent.nodes.find((x) => x.id === frame.nodeId)!;
      n.subgraph = doc;
      doc = parent;
    }
    return doc;
  }
  load(doc: WorkflowDocument): void {
    const store = new GraphStore(doc);
    this.cancelRun();
    this.layoutAbort?.abort();
    this.stack = [];
    this.canvas.setGraph(store);
    this.canvas.fit();
    this.navigated();
  }

  // ---- arrange, run
  async arrange(): Promise<void> {
    if (this.canvas.readonly) return;
    this.layoutAbort?.abort();
    const abort = new AbortController();
    this.layoutAbort = abort;
    const store = this.graph;
    const version = store.version;
    const doc = store.export();
    this.canvas.notify('Arranging…');
    try {
      const positions = await layoutPositions(doc, abort.signal);
      if (abort.signal.aborted || this.graph !== store || store.version !== version) return;
      store.commit('Arrange', layoutPatches(doc, new Map(positions)));
      this.canvas.fit();
      this.canvas.notify('Arranged');
    } catch (e) {
      if (!abort.signal.aborted) this.canvas.report(e);
    }
  }
  configure(options: { execution?: WorkflowExecutionAdapter | null }): void {
    if ('execution' in options) this.execution = options.execution ?? null;
    this.refreshOutlets();
  }
  get running(): boolean {
    return !!this.runAbort;
  }
  cancelRun(): void {
    this.runAbort?.abort(new DOMException('Run cancelled', 'AbortError'));
  }
  async run(): Promise<void> {
    if (this.runAbort) return;
    const abort = new AbortController();
    this.runAbort = abort;
    const canvas = this.canvas;
    const store = this.graph;
    const doc = store.export();
    const adapter = this.execution ?? localExecutor((type) => this.type(type));
    const active = new Set(doc.nodes.map((n) => n.id));
    canvas.clearRuntime();
    const send = (e: WorkflowExecutionEvent): void => {
      if (abort.signal.aborted || !active.has(e.nodeId) || canvas.graph !== store) return;
      canvas.setRuntime(e.nodeId, e.state);
      // one node's run state changed
      this.el.dispatchEvent(
        new CustomEvent<WorkflowNodeStateDetail>('workflow-node-state', {
          bubbles: true,
          detail: { nodeId: e.nodeId, state: e.state },
        }),
      );
      if (e.state.status === 'success' || e.state.status === 'error' || e.state.status === 'cancelled')
        active.delete(e.nodeId);
    };
    for (const id of active) canvas.setRuntime(id, { status: 'queued' });
    this.el.dataset.running = '';
    // assistive technology (and a test) can tell the editor is still working
    this.el.setAttribute('aria-busy', 'true');
    this.runEvent('running');
    this.refreshOutlets();
    let status: WorkflowRunDetail['status'] = 'done';
    let message: string | undefined;
    try {
      await Promise.race([
        adapter.run(structuredClone(doc), { signal: abort.signal, emit: send }),
        new Promise<never>((_, reject) =>
          abort.signal.addEventListener('abort', () => reject(abort.signal.reason), { once: true }),
        ),
      ]);
      for (const id of active) canvas.setRuntime(id, { status: 'success' });
    } catch (error) {
      status = abort.signal.aborted ? 'cancelled' : 'error';
      message = (error as Error)?.message ?? String(error);
      for (const id of active) canvas.setRuntime(id, { status: abort.signal.aborted ? 'cancelled' : 'error', message });
      if (status === 'error') canvas.report(message);
    } finally {
      this.runAbort = null;
      delete this.el.dataset.running;
      this.el.removeAttribute('aria-busy');
      this.runEvent(status, message);
      this.refreshOutlets();
    }
  }
  private runEvent(status: WorkflowRunDetail['status'], message?: string): void {
    // a run started (running) or ended (done, error, cancelled)
    this.el.dispatchEvent(
      new CustomEvent<WorkflowRunDetail>('workflow-run', {
        bubbles: true,
        detail: { status, ...(message ? { message } : {}) },
      }),
    );
  }

  // ---- import / export
  private async importFile(): Promise<void> {
    const selected = this.file.files?.[0];
    this.file.value = '';
    if (!selected) return;
    try {
      if (selected.size > 128 * 1024 * 1024) throw new Error('The file exceeds 128 MiB');
      this.load(readAny(JSON.parse(await selected.text())));
      this.canvas.notify(`Imported ${selected.name}`);
    } catch (e) {
      this.canvas.report(e);
    }
  }
  download(): void {
    const doc = this.export();
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = this.el.ownerDocument.createElement('a');
    a.href = url;
    a.download = `${(doc.title || 'workflow').replace(/[^\w-]+/g, '-').toLowerCase()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ---- actions: buttons anywhere with data-workflow-action (+ data-workflow-for)
  action(name: string, source?: HTMLElement): void {
    const c = this.canvas;
    const edit = (fn: () => void): void => {
      if (!c.readonly) c.attempt(fn);
    };
    switch (name) {
      case 'undo':
        edit(() => this.graph.undo());
        break;
      case 'redo':
        edit(() => this.graph.redo());
        break;
      case 'fit':
        c.fit();
        break;
      case 'fit-selection':
        c.fit(c.selected.size > 0);
        break;
      case 'zoom-in':
        c.zoomBy(1.25);
        break;
      case 'zoom-out':
        c.zoomBy(0.8);
        break;
      case 'arrange':
        void this.arrange();
        break;
      case 'group':
        edit(() => {
          const id = this.graph.groupNodes(c.selected, source?.dataset.workflowTitle || 'Group');
          c.notify(`Grouped as ${this.graph.groups.get(id)!.title}`);
        });
        break;
      case 'ungroup': {
        const n = this.graph.nodes.get([...c.selected][0] ?? '');
        if (n?.groupId) edit(() => this.graph.ungroup(n.groupId!));
        break;
      }
      case 'collapse': {
        const n = this.graph.nodes.get([...c.selected][0] ?? '');
        if (n?.groupId) c.toggleGroup(n.groupId);
        break;
      }
      case 'duplicate':
        c.duplicate();
        break;
      case 'copy':
        c.copy();
        break;
      case 'paste':
        c.paste();
        break;
      case 'delete':
        c.removeSelection();
        break;
      case 'select-all':
        c.select(this.graph.nodes.keys());
        break;
      case 'align-left':
        c.align('x');
        break;
      case 'align-top':
        c.align('y');
        break;
      case 'run':
        void this.run();
        break;
      case 'cancel':
        this.cancelRun();
        break;
      case 'parent':
        this.leave();
        break;
      case 'top':
        this.leave(this.stack.length);
        break;
      case 'enter':
        if (c.selected.size === 1) this.enter([...c.selected][0]);
        break;
      case 'import':
        if (!c.readonly) this.file.click();
        break;
      case 'export':
        this.download();
        break;
      case 'readonly':
        this.setReadonly(!c.readonly);
        break;
      case 'add':
        if (source?.dataset.workflowType) c.addNode(source.dataset.workflowType);
        break;
      default:
        c.report(`Unknown action ${name}`);
    }
  }

  // ---- outlets and outputs
  find(selector: string): HTMLElement[] {
    const id = this.el.id;
    const outside = id ? (dfDollar(`[data-workflow-for="${CSS.escape(id)}"]`).toArray() as HTMLElement[]) : [];
    return outside.filter((o) => o.matches(selector));
  }
  scheduleOutputs(): void {
    if (this.outletsTimer) return;
    this.outletsTimer = globalThis.setTimeout(() => {
      this.outletsTimer = 0;
      this.renderOutputs();
    }, 120) as unknown as number;
  }
  refreshOutlets(): void {
    this.renderOutputs();
    this.renderActions();
    for (const o of this.find('[data-workflow-outlet="palette"]')) this.renderPalette(o);
    for (const o of this.find('[data-workflow-outlet="outline"]')) this.renderOutline(o);
    for (const o of this.find('[data-workflow-outlet="inspector"]')) this.renderInspector(o);
    for (const o of this.find('[data-workflow-outlet="breadcrumb"]')) this.renderBreadcrumb(o);
  }
  private renderOutputs(): void {
    const c = this.canvas;
    const s = c.stats;
    const values: Record<string, string> = {
      title: this.graph.title,
      nodes: fmt(this.graph.nodes.size),
      edges: fmt(this.graph.edges.size),
      groups: fmt(this.graph.groups.size),
      selection: c.selectedEdge
        ? '1 connection'
        : c.selected.size
          ? `${fmt(c.selected.size)} selected`
          : 'Nothing selected',
      zoom: `${Math.round(c.camera.zoom * 100)}%`,
      drawn: s ? `${fmt(s.edges)} connections drawn${s.edgesTruncated ? ' (sampled)' : ''}` : '',
      cards: s ? `${fmt(s.domNodes)} cards` : '',
      renderer: s ? (s.renderer === 'worker' ? 'Worker canvas' : 'Main-thread canvas') : '',
      frame: s ? `${s.drawMs.toFixed(1)} ms` : '',
      status: this.running ? 'Running…' : c.live.textContent || 'Ready',
      depth: String(this.stack.length),
    };
    for (const o of this.find('[data-workflow-output]')) {
      const key = o.dataset.workflowOutput!;
      if (key in values && o.textContent !== values[key]) o.textContent = values[key];
      if (key === 'drawn') o.toggleAttribute('data-sampled', !!s?.edgesTruncated);
    }
  }
  private renderActions(): void {
    const c = this.canvas;
    const ro = c.readonly;
    const single = c.selected.size === 1 ? this.graph.nodes.get([...c.selected][0]) : undefined;
    const disabled: Record<string, boolean> = {
      undo: ro || !this.graph.canUndo,
      redo: ro || !this.graph.canRedo,
      arrange: ro || !this.graph.nodes.size,
      group: ro || !c.selected.size,
      ungroup: ro || !single?.groupId,
      collapse: ro || !single?.groupId,
      duplicate: ro || !c.selected.size,
      delete: ro || (!c.selected.size && !c.selectedEdge),
      paste: ro,
      'align-left': ro || c.selected.size < 2,
      'align-top': ro || c.selected.size < 2,
      'fit-selection': !c.selected.size,
      run: this.running || !this.graph.nodes.size,
      cancel: !this.running,
      parent: !this.stack.length,
      top: !this.stack.length,
      enter: !single?.subgraph,
      import: ro,
      add: ro,
    };
    for (const b of this.find('[data-workflow-action]')) {
      const name = b.dataset.workflowAction!;
      if (name in disabled) (b as HTMLButtonElement).disabled = disabled[name];
      if (name === 'readonly') b.setAttribute('aria-pressed', String(ro));
    }
  }
  private renderPalette(o: HTMLElement): void {
    let listEl = dfDollar(o).find('.workflow-palette-list').get(0) as HTMLElement | undefined;
    if (!listEl) {
      dfDollar(o).html(
        `<div class="workflow-palette" data-ce-chrome><input class="input" data-size="sm" type="search" placeholder="Search node types" aria-label="Search node types" data-workflow-search="palette"><div class="workflow-palette-list" role="list"></div></div>`,
      );
      listEl = dfDollar(o).find('.workflow-palette-list').get(0) as HTMLElement;
    }
    const search = dfDollar(o).find('[data-workflow-search]').get(0) as HTMLInputElement;
    const query = search.value.trim().toLowerCase();
    const ro = this.canvas.readonly;
    // data-workflow-types on the outlet: the type names it lists, `prefix*` for all the names that start so
    const only = (o.dataset.workflowTypes ?? '').split(/\s+/).filter(Boolean);
    const listed = (type: string): boolean =>
      !only.length || only.some((w) => (w.endsWith('*') ? type.startsWith(w.slice(0, -1)) : type === w));
    const groups = new Map<string, WorkflowNodeType[]>();
    for (const t of this.allTypes()) {
      if (!listed(t.type)) continue;
      if (query && !`${t.label} ${t.type} ${t.description ?? ''} ${t.category ?? ''}`.toLowerCase().includes(query))
        continue;
      const key = t.category ?? 'Nodes';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t);
    }
    let markup = '';
    for (const [category, types] of groups) {
      markup += `<p class="workflow-palette-heading">${esc(category)}</p>`;
      for (const t of types) {
        const accent = accentOf(t.color);
        markup +=
          `<button type="button" class="workflow-palette-item" role="listitem" draggable="${!ro}" data-workflow-action="add" data-workflow-type="${esc(t.type)}"${ro ? ' disabled' : ''}` +
          `${accent ? ` style="--workflow-accent-color: ${esc(accent)}"` : ''} title="Click to add, or drag onto the canvas">` +
          `<span class="workflow-palette-swatch" aria-hidden="true"></span><span class="workflow-palette-text"><strong>${esc(t.label)}</strong>${t.description ? `<small>${esc(t.description)}</small>` : ''}</span></button>`;
      }
    }
    if (!markup) markup = `<p class="workflow-muted">No node type matches.</p>`;
    dfDollar(listEl).html(markup);
  }
  private renderOutline(o: HTMLElement): void {
    let listEl = dfDollar(o).find('.workflow-outline-list').get(0) as HTMLElement | undefined;
    if (!listEl) {
      dfDollar(o).html(
        `<div class="workflow-outline" data-ce-chrome><input class="input" data-size="sm" type="search" placeholder="Find a node" aria-label="Find a node" data-workflow-search="outline"><div class="workflow-outline-list"></div></div>`,
      );
      listEl = dfDollar(o).find('.workflow-outline-list').get(0) as HTMLElement;
    }
    const search = dfDollar(o).find('[data-workflow-search]').get(0) as HTMLInputElement;
    const query = search.value.trim().toLowerCase();
    const LIMIT = 100;
    let count = 0;
    let markup = '';
    const groups = [...this.graph.groups.values()].filter((g) => !query || g.title.toLowerCase().includes(query));
    if (groups.length) {
      markup += `<p class="workflow-palette-heading">Groups</p>`;
      for (const g of groups.slice(0, 50))
        markup += `<button type="button" class="workflow-outline-item" data-workflow-group="${esc(g.id)}" aria-expanded="${!g.collapsed}"><span class="workflow-outline-icon" aria-hidden="true">${g.collapsed ? '▸' : '▾'}</span><span>${esc(g.title)}</span><small>${fmt(this.graph.groupMembers(g.id).length)}</small></button>`;
    }
    markup += `<p class="workflow-palette-heading">Nodes</p>`;
    for (const n of this.graph.nodes.values()) {
      if (query && !`${n.title} ${n.id} ${n.type}`.toLowerCase().includes(query)) continue;
      if (++count > LIMIT) continue;
      const current = this.canvas.selected.has(n.id);
      markup += `<button type="button" class="workflow-outline-item" data-workflow-node="${esc(n.id)}"${current ? ' aria-current="true"' : ''}><span class="workflow-outline-icon" aria-hidden="true">${n.subgraph ? '⧉' : '•'}</span><span>${esc(n.title)}</span><small>${esc(n.type)}</small></button>`;
    }
    if (!count) markup += `<p class="workflow-muted">No node matches.</p>`;
    else if (count > LIMIT)
      markup += `<p class="workflow-muted">${fmt(LIMIT)} of ${fmt(count)} shown - search to narrow.</p>`;
    dfDollar(listEl).html(markup);
  }
  private renderBreadcrumb(o: HTMLElement): void {
    const path = this.path();
    const items = path
      .map((title, i) => {
        const last = i === path.length - 1;
        const up = path.length - 1 - i;
        return (
          (i ? `<li class="breadcrumb-separator" aria-hidden="true">/</li>` : '') +
          `<li class="breadcrumb-item">${last ? `<span class="breadcrumb-page" aria-current="page">${esc(title)}</span>` : `<button type="button" class="breadcrumb-link" data-workflow-up="${up}">${esc(title)}</button>`}</li>`
        );
      })
      .join('');
    dfDollar(o).html(
      `<nav class="breadcrumb" aria-label="Workflow path" data-ce-chrome><ol class="breadcrumb-list">${items}</ol></nav>`,
    );
  }
  private renderInspector(o: HTMLElement): void {
    const c = this.canvas;
    const store = this.graph;
    const ids = [...c.selected];
    const doc = o.ownerDocument;
    const key = JSON.stringify([ids, c.selectedEdge, store.version, c.readonly, this.stack.length]);
    // an edit in progress survives unrelated changes
    if (
      o.contains(doc.activeElement) &&
      doc.activeElement?.matches('input,textarea,select') &&
      this.inspectedKey.startsWith(JSON.stringify([ids, c.selectedEdge]).slice(0, -1))
    )
      return;
    // a loaded graph starts at version 0 again: the key holds for one graph only
    if (key === this.inspectedKey && store === this.inspectedGraph && dfDollar(o).children('[data-ce-chrome]').get(0))
      return;
    this.inspectedKey = key;
    this.inspectedGraph = store;
    const ro = c.readonly ? ' disabled' : '';
    const field = (label: string, control: string, id: string): string =>
      `<div class="workflow-inspector-field"><label class="label" for="${id}">${esc(label)}</label>${control}</div>`;
    const base = (this.el.id || 'workflow') + '-inspector';
    let body = '';
    if (c.selectedEdge) {
      const e = store.edges.get(c.selectedEdge)!;
      const from = store.nodes.get(e.source.node);
      const to = store.nodes.get(e.target.node);
      const port = from?.ports.find((p) => p.id === e.source.port);
      body =
        `<p class="workflow-inspector-kicker">Connection</p><h3 class="workflow-inspector-title">${esc(from?.title)} → ${esc(to?.title)}</h3>` +
        `<p class="workflow-muted"><code>${esc(e.source.port)}</code> → <code>${esc(e.target.port)}</code> · ${esc(port?.type ?? 'any')}</p>` +
        field(
          'Route',
          `<select class="select" id="${base}-route" data-workflow-edit="route"${ro}>${['bezier', 'orthogonal', 'straight'].map((r) => `<option value="${r}"${(e.route ?? 'bezier') === r ? ' selected' : ''}>${r[0].toUpperCase() + r.slice(1)}</option>`).join('')}</select>`,
          `${base}-route`,
        ) +
        field(
          'Label',
          `<input class="input" id="${base}-edge-label" data-workflow-edit="edge-label" value="${esc(e.label ?? '')}"${ro}>`,
          `${base}-edge-label`,
        ) +
        field(
          'Line',
          `<select class="select" id="${base}-dash" data-workflow-edit="dash"${ro}>${['solid', 'dashed', 'dotted'].map((r) => `<option value="${r}"${(e.dash ?? 'solid') === r ? ' selected' : ''}>${r[0].toUpperCase() + r.slice(1)}</option>`).join('')}</select>`,
          `${base}-dash`,
        ) +
        `<div class="workflow-inspector-actions"><button type="button" class="btn" data-variant="outline" data-size="sm" data-workflow-edit="clear-points"${ro || !e.points?.length ? ' disabled' : ''}>Clear reroute points</button>` +
        `<button type="button" class="btn" data-variant="destructive" data-size="sm" data-workflow-edit="disconnect"${ro}>Disconnect</button></div>` +
        `<p class="workflow-muted">Alt-click the connection to add a reroute point, drag its square handles to move them.</p>`;
    } else if (ids.length === 1) {
      const n = store.nodes.get(ids[0])!;
      const type = this.type(n.type);
      const json = JSON.stringify(n.data, null, 2);
      const edges = [...store.edgesFor(n.id)].slice(0, 50).map((id) => store.edges.get(id)!);
      body =
        `<p class="workflow-inspector-kicker">${esc(type?.label ?? n.type)}</p><h3 class="workflow-inspector-title">${esc(n.title)}</h3>` +
        field(
          'Title',
          `<input class="input" id="${base}-title" data-workflow-edit="title" value="${esc(n.title)}"${ro}>`,
          `${base}-title`,
        ) +
        `<div class="workflow-inspector-row"><input class="switch" type="checkbox" role="switch" id="${base}-locked" data-workflow-edit="locked"${n.locked ? ' checked' : ''}${ro}><label for="${base}-locked">Lock position</label></div>` +
        field(
          'Data (JSON)',
          `<textarea class="textarea workflow-json" id="${base}-data" rows="6" spellcheck="false" data-workflow-edit="data"${ro}>${esc(json)}</textarea>`,
          `${base}-data`,
        ) +
        `<div class="workflow-inspector-actions"><button type="button" class="btn" data-variant="secondary" data-size="sm" data-workflow-edit="apply-data"${ro}>Apply data</button>` +
        (n.subgraph
          ? `<button type="button" class="btn" data-variant="outline" data-size="sm" data-workflow-action="enter">Open subworkflow</button>`
          : '') +
        (n.groupId
          ? `<button type="button" class="btn" data-variant="outline" data-size="sm" data-workflow-action="ungroup"${ro}>Ungroup</button>`
          : '') +
        `</div>` +
        `<p class="workflow-palette-heading">Ports</p><ul class="workflow-inspector-list">${n.ports
          .map(
            (p) =>
              `<li><span class="workflow-port-swatch" style="--workflow-port: ${ENGINE.typeIndex(p.type) >= 0 ? `var(--workflow-type-${ENGINE.typeIndex(p.type)})` : 'var(--workflow-edge)'}" aria-hidden="true"></span>${p.direction === 'input' ? 'in' : 'out'} <strong>${esc(p.label ?? p.id)}</strong><code>${esc(p.type)}</code><span class="workflow-muted">${store.connections({ node: n.id, port: p.id }).size}</span></li>`,
          )
          .join('')}</ul>` +
        `<p class="workflow-palette-heading">Connections (${fmt(store.edgesFor(n.id).size)})</p><div class="workflow-inspector-list">${edges
          .map((e) => {
            const other = store.nodes.get(e.source.node === n.id ? e.target.node : e.source.node);
            return `<button type="button" class="workflow-outline-item" data-workflow-select-edge="${esc(e.id)}"><span class="workflow-outline-icon" aria-hidden="true">${e.source.node === n.id ? '→' : '←'}</span><span>${esc(other?.title)}</span><small>${esc(e.source.node === n.id ? e.source.port : e.target.port)}</small></button>`;
          })
          .join('')}</div>`;
    } else if (ids.length > 1) {
      body =
        `<p class="workflow-inspector-kicker">Selection</p><h3 class="workflow-inspector-title">${fmt(ids.length)} nodes</h3>` +
        `<div class="workflow-inspector-actions">` +
        `<button type="button" class="btn" data-variant="outline" data-size="sm" data-workflow-action="align-left"${ro}>Align left</button>` +
        `<button type="button" class="btn" data-variant="outline" data-size="sm" data-workflow-action="align-top"${ro}>Align top</button>` +
        `<button type="button" class="btn" data-variant="outline" data-size="sm" data-workflow-action="group"${ro}>Group</button>` +
        `<button type="button" class="btn" data-variant="outline" data-size="sm" data-workflow-action="fit-selection">Fit selection</button>` +
        `</div>`;
    } else {
      const k = (keys: string[]): string =>
        keys.length > 1
          ? `<kbd class="kbd-group">${keys.map((x) => `<kbd class="kbd">${x}</kbd>`).join('')}</kbd>`
          : `<kbd class="kbd">${keys[0]}</kbd>`;
      const rows: [string[], string][] = [
        [['Drag'], 'Pan; Shift-drag selects'],
        [['Wheel'], 'Zoom; a trackpad pans'],
        [['⌘', 'Z'], 'Undo; ⇧ redoes'],
        [['⌘', 'D'], 'Duplicate'],
        [['⌘', 'C'], 'Copy; ⌘ V pastes'],
        [['F'], 'Fit; ⇧ F the selection'],
        [['Del'], 'Delete the selection'],
        [['Alt', '→'], 'Follow a connection'],
        [['Esc'], 'Cancel'],
      ];
      body =
        `<p class="workflow-inspector-kicker">${esc(this.graph.title)}</p><h3 class="workflow-inspector-title">${fmt(store.nodes.size)} nodes, ${fmt(store.edges.size)} connections</h3>` +
        `<p class="workflow-muted">Select a node or a connection to inspect it. Drag from a port to connect; drop on a card to use its first free port that fits.</p>` +
        `<dl class="workflow-keys">${rows.map(([keys, what]) => `<dt>${k(keys)}</dt><dd>${esc(what)}</dd>`).join('')}</dl>`;
    }
    dfDollar(o).html(`<div class="workflow-inspector" data-ce-chrome>${body}</div>`);
  }
  /** an inspector control was used */
  edit(control: HTMLElement): void {
    const c = this.canvas;
    const store = this.graph;
    const what = control.dataset.workflowEdit;
    const id = [...c.selected][0];
    const node = id ? store.nodes.get(id) : undefined;
    c.attempt(() => {
      if (what === 'title' && node)
        store.updateNode(node.id, { title: (control as HTMLInputElement).value.trim() || node.title }, 'Rename');
      else if (what === 'locked' && node)
        store.updateNode(node.id, { locked: (control as HTMLInputElement).checked }, 'Lock');
      else if (what === 'apply-data' && node) {
        const area = dfDollar(control.closest('.workflow-inspector') as Element)
          .find('[data-workflow-edit="data"]')
          .get(0) as HTMLTextAreaElement;
        let parsed: unknown;
        try {
          parsed = JSON.parse(area.value);
        } catch {
          throw new Error('The data is not valid JSON');
        }
        assert(isRecord(parsed), 'The data must be a JSON object');
        store.updateNode(node.id, { data: parsed as Record<string, WorkflowJson> }, 'Edit data');
        c.notify('Data applied');
      } else if (c.selectedEdge) {
        const e = store.edges.get(c.selectedEdge);
        if (!e) return;
        if (what === 'route')
          store.commit('Change route', [
            {
              kind: 'edges',
              id: e.id,
              value: { ...e, route: (control as HTMLSelectElement).value as WorkflowEdge['route'] },
            },
          ]);
        else if (what === 'edge-label' || what === 'dash') {
          const value = (control as HTMLInputElement).value.trim();
          this.setEdge(
            e.id,
            what === 'dash'
              ? { dash: value === 'solid' ? undefined : (value as WorkflowEdge['dash']) }
              : { label: value || undefined },
          );
        } else if (what === 'clear-points')
          store.commit('Clear reroute points', [{ kind: 'edges', id: e.id, value: { ...e, points: [] } }]);
        else if (what === 'disconnect') c.removeSelection();
      }
    });
  }
  destroy(): void {
    this.cancelRun();
    this.layoutAbort?.abort();
    clearTimeout(this.outletsTimer);
    this.attrObserver.disconnect();
    this.themeObserver.disconnect();
    this.offTheme();
    this.canvas.destroy();
    this.file.remove();
    live.delete(this);
    for (const kind of OUTLETS)
      for (const o of this.find(`[data-workflow-outlet="${kind}"]`)) dfDollar(o).children('[data-ce-chrome]').remove();
    delete this.el.dataset.workflowStatus;
  }
}

// -- State API -----------------------------------------------------------------------------------------------------
// The state is attributes: data-readonly (the readonly state), data-selected (node ids, space separated) and
// data-selected-edge. The camera is part of the config (getState reads it live) but no markup.

interface ResolvedConfig {
  selected: string[];
  edge: string | null;
  camera: WorkflowCamera | null;
}
function configOf(el: HTMLElement): ResolvedConfig {
  const inst = (el as any)._workflow as Workflow | undefined;
  return {
    selected: (el.getAttribute('data-selected') ?? '').split(/\s+/).filter(Boolean),
    edge: el.getAttribute('data-selected-edge') || null,
    camera: inst ? { ...inst.canvas.camera } : null,
  };
}
/** a selection as a list - the State tab passes the attribute's text */
const idList = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(String) : typeof v === 'string' ? v.split(/\s+/).filter(Boolean) : [];
/** the state's markup - the live element and render()'s detached copy alike */
function applyMarkup(el: HTMLElement, name: string, config: WorkflowConfig): void {
  el.toggleAttribute('data-readonly', name === 'readonly');
  const selected = config.edge ? [] : idList(config.selected);
  if (selected.length) el.setAttribute('data-selected', selected.join(' '));
  else el.removeAttribute('data-selected');
  if (config.edge) el.setAttribute('data-selected-edge', config.edge);
  else el.removeAttribute('data-selected-edge');
}
function triggerStateChange(
  el: HTMLElement,
  name: string,
  config: WorkflowConfig,
  incoming: WorkflowConfig,
): Promise<void> {
  const inst = (el as any)._workflow as Workflow | undefined;
  if (!inst) {
    applyMarkup(el, name, config);
    return Promise.resolve();
  }
  // a config that names a connection drops the node selection, and the other way round
  const merged: WorkflowConfig = { ...config };
  if (incoming && 'selected' in incoming && idList(incoming.selected).length && !('edge' in incoming))
    merged.edge = null;
  inst.canvas.setReadonly(name === 'readonly');
  inst.canvas.select(merged.edge ? [] : idList(merged.selected), merged.edge || undefined);
  if (incoming?.camera) inst.canvas.setCamera(incoming.camera);
  inst.writeAttrs();
  inst.refreshOutlets();
  return inst.canvas.ready;
}

export const workflowApi = componentState({
  component: 'workflow',
  states: workflowStates,
  mergeConfig: true,
  apply: (el, state, _previous, incoming) =>
    triggerStateChange(el as HTMLElement, state.name, state.config as WorkflowConfig, incoming as WorkflowConfig),
  // the state the attributes show now - a click, the readonly action or an attribute written from outside change them
  read: (el) => ({
    name: (el as HTMLElement).hasAttribute('data-readonly') ? 'readonly' : 'default',
    config: configOf(el as HTMLElement) as unknown as Record<string, unknown>,
  }),
  markup: (el, state) => applyMarkup(el as HTMLElement, state.name, state.config as WorkflowConfig),
  events: ['workflow-view'],
});

df$.workflowApi = workflowApi;
df$.workflowStates = workflowStates;

// -- outlets, outputs and actions anywhere on the page: one delegated listener per kind ------------------------------

const instanceFor = (from: Element): Workflow | undefined => {
  const host = from.closest('[data-workflow-for]') as HTMLElement | null;
  const id = host?.dataset.workflowFor;
  const el = (id ? dfDollar(`#${CSS.escape(id)}`).get(0) : from.closest('.workflow')) as HTMLElement | null;
  return (el as any)?._workflow as Workflow | undefined;
};
const docs = new WeakSet<Document>();
function delegate(doc: Document): void {
  if (docs.has(doc)) return;
  docs.add(doc);
  doc.addEventListener('click', (e) => {
    const target = e.target as Element;
    if (!(target instanceof Element)) return;
    const action = target.closest('[data-workflow-action]') as HTMLElement | null;
    if (action && !(action as HTMLButtonElement).disabled) {
      const inst = instanceFor(action);
      if (inst) {
        e.preventDefault();
        inst.action(action.dataset.workflowAction!, action);
        return;
      }
    }
    const inst = instanceFor(target);
    if (!inst) return;
    const node = target.closest('[data-workflow-node]') as HTMLElement | null;
    if (node) inst.canvas.focusNode(node.dataset.workflowNode!);
    const group = target.closest('[data-workflow-group]') as HTMLElement | null;
    if (group) inst.canvas.toggleGroup(group.dataset.workflowGroup!);
    const edge = target.closest('[data-workflow-select-edge]') as HTMLElement | null;
    if (edge) inst.canvas.select([], edge.dataset.workflowSelectEdge!);
    const up = target.closest('[data-workflow-up]') as HTMLElement | null;
    if (up) inst.leave(Number(up.dataset.workflowUp) || 1);
    const edit = target.closest('button[data-workflow-edit]') as HTMLElement | null;
    if (edit) inst.edit(edit);
  });
  doc.addEventListener('change', (e) => {
    const target = e.target as HTMLElement;
    if (!(target instanceof Element) || !target.matches('input[data-workflow-edit],select[data-workflow-edit]')) return;
    instanceFor(target)?.edit(target);
  });
  doc.addEventListener('input', (e) => {
    const target = e.target as HTMLElement;
    if (!(target instanceof Element) || !target.matches('[data-workflow-search]')) return;
    const inst = instanceFor(target);
    const outlet = target.closest('[data-workflow-outlet]') as HTMLElement | null;
    if (!inst || !outlet) return;
    if (target.dataset.workflowSearch === 'palette') (inst as any).renderPalette(outlet);
    else (inst as any).renderOutline(outlet);
  });
  doc.addEventListener('keydown', (e) => {
    // Enter in a palette search adds the first match
    const target = e.target as HTMLElement;
    if (e.key !== 'Enter' || !(target instanceof Element) || !target.matches('[data-workflow-search="palette"]'))
      return;
    const first = dfDollar(target.closest('[data-workflow-outlet]') as Element)
      .find('[data-workflow-type]:not([disabled])')
      .get(0) as HTMLElement | undefined;
    if (first) {
      e.preventDefault();
      instanceFor(target)?.action('add', first);
    }
  });
  doc.addEventListener('dragstart', (e) => {
    const target = e.target as HTMLElement;
    if (!(target instanceof Element)) return;
    const item = target.closest('[data-workflow-type]') as HTMLElement | null;
    if (item && e.dataTransfer) {
      e.dataTransfer.setData('application/x-workflow-type', item.dataset.workflowType!);
      e.dataTransfer.effectAllowed = 'copy';
    }
  });
}

// -- the namespace ----------------------------------------------------------------------------------------------------

const resolveTarget = (target: string | HTMLElement): HTMLElement | null =>
  typeof target === 'string' ? ((dfDollar(target).get(0) as HTMLElement | null) ?? null) : target;
const need = (target: string | HTMLElement): Workflow => {
  const inst = (resolveTarget(target) as any)?._workflow as Workflow | undefined;
  if (!inst) throw new Error('workflow: the element is not initialized');
  return inst;
};

df$.workflow = {
  /**
   * Registers a node type: its ports, defaults, card controls and run handler. 'global' makes it known to every
   * workflow on the page; an element (or its selector) to that one only, where it wins over a global type.
   * @param scope - 'global', a .workflow element or its selector
   * @param definition - the node type
   * @returns removes the type again
   */
  register(scope: 'global' | string | HTMLElement, definition: WorkflowNodeType): () => void {
    if (scope === 'global') {
      const checked = checkType(definition);
      globalTypes.set(checked.type, checked);
      typesVersion++;
      for (const inst of live) inst.refreshOutlets();
      for (const inst of live) inst.canvas.refreshTheme();
      return () => {
        if (globalTypes.get(checked.type) === checked) globalTypes.delete(checked.type);
        typesVersion++;
        for (const inst of live) inst.refreshOutlets();
      };
    }
    return need(scope).register(definition);
  },
  /**
   * Registers a connection type - the look (color, dash, width, animated) and the label renderer of the connections
   * that name it in `type`, or leave an output port of that type. A connection's own values win.
   * @param scope - 'global', a .workflow element or its selector
   * @param definition - the connection type
   * @returns removes the type again
   */
  registerEdge(scope: 'global' | string | HTMLElement, definition: WorkflowEdgeType): () => void {
    if (scope === 'global') {
      const checked = checkEdgeType(definition);
      globalEdgeTypes.set(checked.type, checked);
      edgeTypesVersion++;
      for (const inst of live) inst.canvas.refreshTheme();
      return () => {
        if (globalEdgeTypes.get(checked.type) === checked) globalEdgeTypes.delete(checked.type);
        edgeTypesVersion++;
        for (const inst of live) inst.canvas.refreshTheme();
      };
    }
    return need(scope).registerEdge(definition);
  },
  /**
   * Changes a connection - its label, type, route, color, dash, width, animated or data (undefined removes a key):
   * one undoable change and a workflow-change.
   * @param target - the .workflow element or its selector
   * @param id - the connection's id
   * @param update - the values to change
   * @returns false when there is no such connection
   */
  setEdge(
    target: string | HTMLElement,
    id: string,
    update: Partial<Omit<WorkflowEdge, 'id' | 'source' | 'target'>>,
  ): boolean {
    return need(target).setEdge(id, update);
  },
  /**
   * Replaces the workflow with a document (any format: native, a ComfyUI API prompt, a Gradio workflow); history
   * starts over, the view fits.
   * @param target - the .workflow element or its selector
   * @param document - the document
   */
  load(target: string | HTMLElement, document: WorkflowDocument | Record<string, WorkflowJson>): void {
    need(target).load(readAny(document));
  },
  /**
   * The whole document as JSON - a subworkflow being edited is written back into its node.
   * @param target - the .workflow element or its selector
   * @returns the document, nodes / edges / groups sorted by id
   */
  export(target: string | HTMLElement): WorkflowDocument {
    return need(target).export();
  },
  /**
   * Adds a node of a registered type.
   * @param target - the .workflow element or its selector
   * @param type - the node type
   * @param at - where its center goes, world units (default: the middle of the view)
   * @returns the new node's id, or undefined when refused (readonly, unknown type)
   */
  addNode(target: string | HTMLElement, type: string, at?: WorkflowPoint): string | undefined {
    return need(target).canvas.addNode(type, at);
  },
  /**
   * A node of a registered type, not yet added: its ports, defaults and a height that fits its fields - for building a
   * document in script and loading it with load().
   * @param target - the .workflow element or its selector (its own types, then the global ones)
   * @param type - the node type
   * @param at - its top-left corner, world units
   * @param overrides - fields to set on it (id, title, data merged into the defaults, width, height, groupId)
   * @returns the node
   */
  node(target: string | HTMLElement, type: string, at: WorkflowPoint, overrides?: Partial<WorkflowNode>): WorkflowNode {
    const inst = need(target);
    const definition = inst.type(type);
    if (!definition) throw new Error(`Unknown node type ${type}`);
    const n = createNode(definition, at, inst.layout());
    const { data, ...rest } = overrides ?? {};
    return { ...n, ...rest, data: { ...n.data, ...data } };
  },
  /**
   * Connects an output port to an input port - checked like a drag: types, free capacity, no cycle.
   * @param target - the .workflow element or its selector
   * @param source - the output end
   * @param to - the input end
   * @returns the new connection's id (throws with the reason when refused)
   */
  connect(target: string | HTMLElement, source: WorkflowEndpoint, to: WorkflowEndpoint): string {
    return need(target).graph.connect(source, to);
  },
  /**
   * Applies patches as one undoable transaction - all or nothing: an invalid batch changes nothing and throws.
   * @param target - the .workflow element or its selector
   * @param label - what the change is called in the history
   * @param patches - the new values (no value removes)
   */
  commit(target: string | HTMLElement, label: string, patches: WorkflowPatch[]): void {
    need(target).graph.commit(label, patches);
  },
  /**
   * Undoes the last change.
   * @param target - the .workflow element or its selector
   */
  undo(target: string | HTMLElement): void {
    need(target).graph.undo();
  },
  /**
   * Redoes the last undone change.
   * @param target - the .workflow element or its selector
   */
  redo(target: string | HTMLElement): void {
    need(target).graph.redo();
  },
  /**
   * The change history of the level the editor shows: every change by its label and how many are applied - the
   * steps undo and redo walk (at most the last 100).
   * @param target - the .workflow element or its selector
   * @returns the changes, oldest first, and the position
   */
  history(target: string | HTMLElement): WorkflowHistory {
    return need(target).graph.history();
  },
  /**
   * Moves through the history: undoes or redoes one change at a time until `at` changes are applied (0: the
   * document as loaded). Each step is a workflow-change, as an undo or a redo is; nothing happens while read-only.
   * @param target - the .workflow element or its selector
   * @param at - how many changes stay applied
   */
  travel(target: string | HTMLElement, at: number): void {
    const inst = need(target);
    if (!inst.canvas.readonly) inst.canvas.attempt(() => inst.graph.travel(at));
  },
  /**
   * Selects nodes - or one connection.
   * @param target - the .workflow element or its selector
   * @param ids - the node ids
   * @param edge - a connection id instead (the nodes are then ignored)
   */
  select(target: string | HTMLElement, ids: string[], edge?: string): void {
    need(target).canvas.select(edge ? [] : ids, edge);
  },
  /**
   * Moves the view to a node and selects it.
   * @param target - the .workflow element or its selector
   * @param id - the node id
   */
  focus(target: string | HTMLElement, id: string): void {
    need(target).canvas.focusNode(id);
  },
  /**
   * Writes one field of a node of the shown level - one undoable change, workflow-field-change follows. The value
   * must be JSON (a node's data is).
   * @param target - the .workflow element or its selector
   * @param id - the node id
   * @param key - the data key
   * @param value - the new value
   * @returns false when refused: read only, no such node, not JSON
   */
  setField(target: string | HTMLElement, id: string, key: string, value: WorkflowJson): boolean {
    return need(target).writeData(id, { [key]: value });
  },
  /**
   * One field of a node of the shown level.
   * @param target - the .workflow element or its selector
   * @param id - the node id
   * @param key - the data key
   * @returns a copy of its value, undefined when the node or the key is missing
   */
  getField(target: string | HTMLElement, id: string, key: string): WorkflowJson | undefined {
    const v = need(target).graph.nodes.get(id)?.data[key];
    return v === undefined ? undefined : structuredClone(v);
  },
  /**
   * Opens a field's editor - what a click on its value does: a custom editor gets workflow-field-edit (cancelable)
   * and then the field's edit(); an inline control gets the focus (the view moves to the node when it has no card).
   * @param target - the .workflow element or its selector
   * @param id - the node id
   * @param key - the data key
   * @returns resolves true when a value was written (a custom editor) or a control took the focus
   */
  editField(target: string | HTMLElement, id: string, key: string): Promise<boolean> {
    return need(target).editField(id, key);
  },
  /**
   * The whole document as rows for a Data Tree: groups, nodes and the nodes inside subworkflows, each with its
   * parent row - the subworkflow being edited included as it is now.
   * @param target - the .workflow element or its selector
   * @returns the rows, a parent before its children
   */
  tree(target: string | HTMLElement): WorkflowTreeRow[] {
    return need(target).tree();
  },
  /**
   * Shows a node anywhere in the document: enters the subworkflows on its way (and leaves the ones off it), selects
   * it and - with camera - moves the view to it. The focus stays where it is.
   * @param target - the .workflow element or its selector
   * @param path - a tree row's path: the subworkflow node ids from the top, then the node's id
   * @param options - camera: true moves the view to the node (default false: only the selection changes)
   * @returns false when the path leads nowhere
   */
  reveal(target: string | HTMLElement, path: string[], options?: { camera?: boolean }): boolean {
    return need(target).reveal(path, !!options?.camera);
  },
  /**
   * Fits the workflow, or the selection, into the view.
   * @param target - the .workflow element or its selector
   * @param selection - true: only the selected nodes
   */
  fit(target: string | HTMLElement, selection?: boolean): void {
    need(target).canvas.fit(!!selection);
  },
  /**
   * The camera, or moves it.
   * @param target - the .workflow element or its selector
   * @param camera - the camera to move to (omit to read)
   * @returns the camera after the move
   */
  camera(target: string | HTMLElement, camera?: WorkflowCamera): WorkflowCamera {
    const inst = need(target);
    if (camera) inst.canvas.setCamera(camera);
    return { ...inst.canvas.camera };
  },
  /**
   * Arranges the nodes in layers (left to right along the connections) in a worker - one undoable change.
   * @param target - the .workflow element or its selector
   * @returns resolves when the nodes moved
   */
  arrange(target: string | HTMLElement): Promise<void> {
    return need(target).arrange();
  },
  /**
   * Runs the workflow: the configured execution adapter, else the node types' run() handlers in the page. Every
   * node shows its state; resolves when the run ends (it never rejects - workflow-run says how it ended).
   * @param target - the .workflow element or its selector
   * @returns resolves when the run ended
   */
  run(target: string | HTMLElement): Promise<void> {
    return need(target).run();
  },
  /**
   * Cancels a run.
   * @param target - the .workflow element or its selector
   */
  cancel(target: string | HTMLElement): void {
    need(target).cancelRun();
  },
  /**
   * Sets a node's run state from outside - a server's progress, a queue.
   * @param target - the .workflow element or its selector
   * @param id - the node id
   * @param state - its run state
   */
  setRuntime(target: string | HTMLElement, id: string, state: WorkflowRuntime): void {
    need(target).canvas.setRuntime(id, state);
  },
  /**
   * Configures how the workflow runs.
   * @param target - the .workflow element or its selector
   * @param options - execution: an adapter that runs documents (null: the built-in one)
   */
  configure(target: string | HTMLElement, options: { execution?: WorkflowExecutionAdapter | null }): void {
    need(target).configure(options);
  },
  /**
   * Opens a node's subworkflow (its card shows a stack); the breadcrumb outlet and the parent action lead back.
   * @param target - the .workflow element or its selector
   * @param id - the node id
   */
  enter(target: string | HTMLElement, id: string): void {
    need(target).enter(id);
  },
  /**
   * Leaves subworkflows, writing their changes back into their nodes.
   * @param target - the .workflow element or its selector
   * @param levels - how many levels up (default 1)
   */
  leave(target: string | HTMLElement, levels?: number): void {
    need(target).leave(levels ?? 1);
  },
  /**
   * What the last frame drew: the budgets at work.
   * @param target - the .workflow element or its selector
   * @returns the frame's numbers, or null before the first frame
   */
  stats(target: string | HTMLElement): WorkflowStats | null {
    const s = need(target).canvas.stats;
    return s ? { ...s } : null;
  },
  /**
   * Runs an action by name - what a data-workflow-action button does.
   * @param target - the .workflow element or its selector
   * @param name - undo, redo, fit, fit-selection, zoom-in, zoom-out, arrange, group, ungroup, collapse, duplicate, copy, paste, delete, select-all, align-left, align-top, run, cancel, parent, top, enter, import, export or readonly
   */
  action(target: string | HTMLElement, name: string): void {
    need(target).action(name);
  },
  /**
   * A synthetic workflow - stages of nodes with typed ports and connections between them; the same spec gives the
   * same workflow.
   * @param spec - how many nodes and connections, the seed, the stage height, groups
   * @returns the document
   */
  generate(spec?: WorkflowGenerateSpec): WorkflowDocument {
    return generate(spec);
  },
  /**
   * Checks a document - its structure and its graph: endpoints, port types and capacity, duplicates, cycles, groups,
   * subworkflow interfaces.
   * @param document - the document
   * @returns null when valid, else the first problem
   */
  validate(document: WorkflowDocument): string | null {
    try {
      new GraphStore(document);
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  },
  /**
   * Reads a ComfyUI API prompt (each node id with its class_type and inputs) as a workflow document.
   * @param prompt - the prompt
   * @returns the document
   */
  fromComfy(prompt: WorkflowComfyPrompt): WorkflowDocument {
    return fromComfy(prompt);
  },
  /**
   * Writes a workflow of imported comfy:* nodes back as a ComfyUI API prompt.
   * @param document - the document
   * @returns the prompt
   */
  toComfy(document: WorkflowDocument): WorkflowComfyPrompt {
    return toComfy(document);
  },
  /**
   * Reads a Gradio workflow (schema_version "2") as a workflow document; unknown fields are kept in the data.
   * @param workflow - the Gradio workflow
   * @returns the document
   */
  fromGradio(workflow: Record<string, WorkflowJson>): WorkflowDocument {
    return fromGradio(workflow);
  },
  /**
   * Writes a workflow of imported gradio:* nodes back as a Gradio workflow (schema_version "2").
   * @param document - the document
   * @returns the Gradio workflow
   */
  toGradio(document: WorkflowDocument): Record<string, WorkflowJson> {
    return toGradio(document);
  },
  /**
   * Stops a workflow: the worker ends, the listeners go, the outlets empty, the State API unbinds. data-init stays,
   * so it does not start again by itself - remove the attribute to start it.
   * @param target - the .workflow element or its selector
   */
  destroy(target: string | HTMLElement): void {
    const el = resolveTarget(target);
    const inst = (el as any)?._workflow as Workflow | undefined;
    if (!el || !inst) return;
    inst.destroy();
    (el as any)._workflow = undefined;
    unbindComponent(el);
    delete el.api;
    // data-init stays: a stopped workflow does not start again by itself (remove the attribute to start it)
  },
};

// -- init -------------------------------------------------------------------------------------------------------------

function init(): void {
  (dfDollar('.workflow:not([data-init])').toArray() as HTMLElement[]).forEach((el) => {
    el.dataset.init = '';
    delegate(el.ownerDocument);
    let inst: Workflow;
    try {
      inst = new Workflow(el);
    } catch (e) {
      el.dataset.workflowStatus = 'error';
      console.error('workflow: could not start', e);
      return;
    }
    (el as any)._workflow = inst;
    const config = configOf(el);
    bindComponent(el, workflowApi, {
      name: el.hasAttribute('data-readonly') ? 'readonly' : 'default',
      config: config as unknown as Record<string, unknown>,
    });
    inst.writeAttrs();
  });
  // outlets placed after their workflow started get their content
  for (const inst of live)
    for (const kind of OUTLETS)
      for (const o of inst.find(`[data-workflow-outlet="${kind}"]`))
        if (!dfDollar(o).children('[data-ce-chrome]').get(0)) {
          inst.refreshOutlets();
          break;
        }
  // a workflow removed from the page stops
  // deleting the current entry of a Set while iterating it is defined: the iteration goes on with the next
  for (const inst of live) if (!inst.el.isConnected) (df$.workflow as any).destroy(inst.el);
}

init();
// the canvas's own DOM (cards, groups) changes every frame - those mutations are no reason to look again
new MutationObserver((records) => {
  if (records.some((r) => !(r.target as Element).closest?.('.workflow-viewport'))) init();
}).observe(document, { childList: true, subtree: true });
