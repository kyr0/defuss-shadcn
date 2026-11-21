// dist/components/virtual-list/virtual-list.js
var __df$core = globalThis.df$;
var __df$shared = __df$core && __df$core.shadcn && __df$core.shadcn.shared;
if (!__df$shared || __df$shared.abi !== "0.9.17") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals, defussQuery, componentState, bindComponent, dataSource, parseFilter, virtualWindow, sizerHeight, scrollTopFor } = __df$shared;
var df$ = defussGlobals();
var dfDollar = defussQuery();
var virtualListStates = ["default", "loading", "empty"];
var columnsOf = (list) => Math.max(1, parseInt(list.dataset.columns || "1", 10) || 1);
var itemCount = (list) => list._source ? list._result.entries.length : list._count;
var rowCount = (list) => Math.ceil(itemCount(list) / columnsOf(list));
var listSizer = (list) => sizerHeight(rowCount(list), list._rowHeight);
function fill(list, el, index) {
  if (!list._source)
    return list._renderRow(el, index);
  const entry = list._result.entries[index];
  list._render(el, entry.row, { index, ...entry.meta });
}
function renderRows(list) {
  const rows = list._rows;
  if (!rows)
    return;
  const count = itemCount(list);
  const cols = columnsOf(list);
  const total = rowCount(list);
  const { first, count: pool, shift } = virtualWindow(list.scrollTop, list.clientHeight, list._rowHeight, total);
  while (rows.children.length < pool) {
    const row = document.createElement("div");
    row.className = "virtual-list-row";
    row.setAttribute("role", cols > 1 ? "row" : "listitem");
    dfDollar(rows).append(row);
  }
  while (rows.children.length > pool) {
    rows.lastElementChild.remove();
  }
  rows.style.translate = `0 ${shift}px`;
  for (let i = 0;i < rows.children.length; i++) {
    const row = rows.children[i];
    const index = first + i;
    if (row._index === index)
      continue;
    row._index = index;
    row.dataset.index = String(index);
    if (cols === 1) {
      row.setAttribute("aria-posinset", String(index + 1));
      row.setAttribute("aria-setsize", String(count));
      fill(list, row, index);
      continue;
    }
    row.setAttribute("aria-rowindex", String(index + 1));
    while (row.children.length < cols) {
      const cell = document.createElement("div");
      cell.className = "virtual-list-cell";
      cell.setAttribute("role", "gridcell");
      dfDollar(row).append(cell);
    }
    for (let c = 0;c < cols; c++) {
      const cell = row.children[c];
      const itemIndex = index * cols + c;
      cell.setAttribute("aria-colindex", String(c + 1));
      if (itemIndex >= count) {
        cell.hidden = true;
        cell.dataset.index = "";
        continue;
      }
      cell.hidden = false;
      cell.dataset.index = String(itemIndex);
      fill(list, cell, itemIndex);
    }
  }
}
var defaultRenderRow = (row, index) => {
  row.textContent = `Row ${index + 1}`;
};
function applyMarkup(el, stateName) {
  dfDollar(el).attr("data-state", stateName).attr("aria-busy", stateName === "loading" ? "true" : null);
}
function refresh(list, config) {
  if (list._source)
    list._result = list._source.query({ filters: config.filters, sorters: config.sorters });
  const sizer = list._rows?.parentElement;
  if (sizer)
    sizer.style.height = `${listSizer(list)}px`;
  if (columnsOf(list) > 1)
    list.setAttribute("aria-rowcount", String(rowCount(list)));
  if (list._rows) {
    Array.from(list._rows.children).forEach((row) => {
      row._index = -1;
    });
  }
  return itemCount(list);
}
function triggerStateChange(list, stateName, config, incoming = config) {
  if (list._source && stateName !== "loading" && !refresh(list, config) && stateName === "default")
    stateName = "empty";
  list.dataset.state = stateName;
  list.dataset.stateName = stateName;
  switch (stateName) {
    case "default":
      list.removeAttribute("aria-busy");
      renderRows(list);
      if (typeof incoming.index === "number") {
        const item = Math.floor(Math.max(0, Math.min(itemCount(list) - 1, incoming.index)) / columnsOf(list));
        list.scrollTop = scrollTopFor(item, list.clientHeight, list._rowHeight, rowCount(list));
        renderRows(list);
      }
      break;
    case "loading":
      list.setAttribute("aria-busy", "true");
      break;
    case "empty":
      list.removeAttribute("aria-busy");
      break;
  }
}
var virtualListApi = componentState({
  component: "virtual-list",
  states: virtualListStates,
  mergeConfig: true,
  apply: (list, state, _previous, incoming) => triggerStateChange(list, state.name, state.config, incoming),
  markup: (el, state) => applyMarkup(el, state.name)
});
df$.virtualListApi = virtualListApi;
df$.virtualListStates = virtualListStates;
df$.virtualList = {
  setData(list, count, renderRow) {
    list._source = null;
    list._count = Math.max(0, Math.floor(count) || 0);
    if (renderRow)
      list._renderRow = renderRow;
    refresh(list, {});
    if (list.store)
      virtualListApi.setState(list, list._count ? "default" : "empty");
  },
  setSource(list, rows, { render, idField = "id", query = {} } = {}) {
    list._source = dataSource(rows, { idField });
    list._result = list._source.query(query);
    if (render)
      list._render = render;
    list._render ??= (el, record) => {
      el.textContent = String(record[idField]);
    };
    if (list.store)
      virtualListApi.setState(list, "default", { filters: [], sorters: [], ...query });
    else
      list._pendingQuery = query;
  },
  query(list, query) {
    virtualListApi.setState(list, "default", query);
  },
  rows(list) {
    return list._source ? list._result.entries.map((entry) => entry.row) : [];
  }
};
if (!document.__virtualListQueryInit) {
  document.__virtualListQueryInit = true;
  const target = (el, attr) => dfDollar("#" + CSS.escape(el.getAttribute(attr))).get(0);
  document.addEventListener("input", (e) => {
    const input = e.target.closest?.("[data-virtual-list-filter]");
    const list = input && target(input, "data-virtual-list-filter");
    if (!list?._source || !list.store)
      return;
    clearTimeout(list._filterTimer);
    list._filterTimer = setTimeout(() => {
      const filters = dfDollar(`[data-virtual-list-filter="${CSS.escape(list.id)}"]`).toArray().map((el) => parseFilter(el.dataset.field || list._source.idField, el.value, el.dataset.kind || "text")).filter(Boolean);
      virtualListApi.setState(list, "default", { filters });
    }, 150);
  });
  document.addEventListener("change", (e) => {
    const select = e.target.closest?.("[data-virtual-list-sort]");
    const list = select && target(select, "data-virtual-list-sort");
    if (!list?._source || !list.store)
      return;
    const [field, direction] = select.value.split(":");
    virtualListApi.setState(list, "default", {
      sorters: field ? [{ field, direction: direction === "desc" ? "desc" : "asc" }] : []
    });
  });
}
function init() {
  dfDollar(".virtual-list:not([data-init])").toArray().forEach((list) => {
    list.dataset.init = "";
    let sizer = dfDollar(list).find(".virtual-list-sizer").get(0);
    if (!sizer) {
      sizer = document.createElement("div");
      sizer.className = "virtual-list-sizer";
      dfDollar(list).append(sizer);
    }
    let rows = dfDollar(sizer).find(".virtual-list-rows").get(0);
    if (!rows) {
      rows = document.createElement("div");
      rows.className = "virtual-list-rows";
      dfDollar(sizer).append(rows);
    }
    list._rows = rows;
    list._renderRow = list._renderRow || defaultRenderRow;
    list._rowHeight = parseFloat(getComputedStyle(list).getPropertyValue("--virtual-list-row-height")) || 40;
    if (typeof list._count !== "number") {
      list._count = parseInt(list.dataset.count || "0", 10) || 0;
    }
    const cols = columnsOf(list);
    list.setAttribute("role", cols > 1 ? "grid" : "list");
    if (cols > 1)
      list.setAttribute("aria-colcount", String(cols));
    if (!list.hasAttribute("tabindex"))
      list.tabIndex = 0;
    sizer.style.height = `${listSizer(list)}px`;
    let queued = false;
    list.addEventListener("scroll", () => {
      if (queued)
        return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        if (list.dataset.state !== "loading" && list.dataset.state !== "empty")
          renderRows(list);
      });
    }, { passive: true });
    new ResizeObserver(() => {
      if (list.dataset.state !== "loading" && list.dataset.state !== "empty")
        renderRows(list);
    }).observe(list);
    bindComponent(list, virtualListApi);
    if (list._source)
      virtualListApi.setState(list, "default", { filters: [], sorters: [], ...list._pendingQuery });
    else
      virtualListApi.setState(list, list._count ? "default" : "empty");
  });
}
init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });

// dist/components/data-tree/data-tree.js
var __df$core2 = globalThis.df$;
var __df$shared2 = __df$core2 && __df$core2.shadcn && __df$core2.shadcn.shared;
if (!__df$shared2 || __df$shared2.abi !== "0.9.17") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals2, defussQuery: defussQuery2, componentState: componentState2, bindComponent: bindComponent2, persisted, viewPersistence, dataSource: dataSource2, parseFilter: parseFilter2, filterText, virtualWindow: virtualWindow2, sizerHeight: sizerHeight2, scrollIntoViewTop, asEditor, builtinEditor, editorControl, editorKey, editorProblem, focusEditor, valueType } = __df$shared2;
var df$2 = defussGlobals2();
var dfDollar2 = defussQuery2();
var dataTreeStates = ["default", "loading", "empty"];
var uid = 0;
var configOf = (tree) => tree._config ?? tree.store?.value.config ?? {};
var labelField = (tree) => tree.dataset.labelField || "name";
function applyMarkup2(el, state) {
  dfDollar2(el).attr("data-state", state.name).attr("aria-busy", state.name === "loading" ? "true" : null);
}
function siblingInfo(tree) {
  const result = tree._result;
  if (tree._siblings?.result === result)
    return tree._siblings;
  const size = new Map;
  const pos = Array.from({ length: result.entries.length }, () => 0);
  result.entries.forEach((entry, i) => {
    const parent = entry.meta.parentId ?? null;
    const n = (size.get(parent) ?? 0) + 1;
    size.set(parent, n);
    pos[i] = n;
  });
  tree._siblings = { result, size, pos };
  return tree._siblings;
}
function renderItems(tree) {
  const pool = tree._pool;
  if (!pool || !tree._result)
    return;
  const entries = tree._result.entries;
  const total = entries.length;
  const h = tree._rowHeight;
  const win = virtualWindow2(tree.scrollTop, tree.clientHeight, h, total);
  tree._sizer.style.height = `${sizerHeight2(total, h)}px`;
  while (pool.children.length < win.count) {
    const item = document.createElement("div");
    item.className = "data-tree-item";
    item.setAttribute("role", "treeitem");
    item.id = `${tree._uid}-item-${pool.children.length}`;
    const toggle = document.createElement("span");
    toggle.className = "data-tree-toggle";
    toggle.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.className = "data-tree-label";
    item.append(toggle, label);
    pool.append(item);
  }
  while (pool.children.length > win.count)
    pool.lastElementChild.remove();
  pool.style.translate = `0 ${win.shift}px`;
  const { size, pos } = siblingInfo(tree);
  const selected = configOf(tree).selected ?? null;
  const idField = tree._source.idField;
  let active = null;
  let edShown = false;
  for (let i = 0;i < pool.children.length; i++) {
    const item = pool.children[i];
    const index = win.first + i;
    const entry = entries[index];
    const key = `${tree._gen}:${index}`;
    if (item._key !== key) {
      item._key = key;
      item._index = index;
      item.dataset.index = String(index);
      const meta = entry.meta;
      item.style.setProperty("--depth", String(meta.depth));
      item.setAttribute("aria-level", String(meta.depth + 1));
      item.setAttribute("aria-setsize", String(size.get(meta.parentId ?? null)));
      item.setAttribute("aria-posinset", String(pos[index]));
      if (meta.hasChildren)
        item.setAttribute("aria-expanded", String(meta.isExpanded));
      else
        item.removeAttribute("aria-expanded");
      item.toggleAttribute("data-match", !!(configOf(tree).filters || []).length && meta.isMatch);
      delete item.dataset.editing;
      const label = item.lastElementChild;
      if (tree._render) {
        label.textContent = "";
        tree._render(label, entry.row, meta);
      } else {
        label.textContent = String(entry.row[labelField(tree)] ?? "");
      }
    }
    const ed = tree._editor;
    if (ed && ed.id === entry.row[idField]) {
      edShown = true;
      if (!item.contains(ed.wrap)) {
        const focused = ed.wrap.contains(document.activeElement) || document.activeElement === document.body;
        placeTreeEditor(item, ed);
        if (focused)
          editorControl(ed.editor).focus({ preventScroll: true });
      }
    }
    item.setAttribute("aria-selected", String(selected !== null && entry.row[idField] === selected));
    item.toggleAttribute("data-active", index === tree._active);
    if (index === tree._active)
      active = item;
  }
  if (active)
    tree.setAttribute("aria-activedescendant", active.id);
  else
    tree.removeAttribute("aria-activedescendant");
  if (tree._editor && !edShown && !tree._writing)
    queueMicrotask(() => {
      if (tree._editor && !commitTreeEdit(tree, false))
        cancelTreeEdit(tree, false);
    });
}
var editField = (tree) => tree.dataset.editField || labelField(tree);
function treeRules(tree) {
  const d = tree.dataset;
  const rules = {};
  if (tree.hasAttribute("data-required"))
    rules.required = true;
  if (d.minLength)
    rules.minLength = Number(d.minLength);
  if (d.maxLength)
    rules.maxLength = Number(d.maxLength);
  if (d.pattern)
    rules.pattern = d.pattern;
  if (d.message)
    rules.message = d.message;
  if (d.options)
    rules.options = d.options.split(",").map((o) => o.trim());
  return rules;
}
var treeContext = (tree, entry) => {
  const field = editField(tree);
  const rules = treeRules(tree);
  return {
    record: entry.row,
    meta: entry.meta,
    field,
    type: tree.dataset.editor || valueType(entry.row[field], rules),
    rules,
    tree
  };
};
function placeTreeEditor(item, ed) {
  ed.item = item;
  item.dataset.editing = "";
  const label = item.lastElementChild;
  label.textContent = "";
  label.append(ed.wrap);
}
function openTreeEdit(tree, index) {
  if (!tree.hasAttribute("data-editable") || tree.hasAttribute("data-readonly"))
    return false;
  const entry = entryAt(tree, index);
  if (!entry)
    return false;
  if (tree._editor && !commitTreeEdit(tree, false))
    return false;
  const ctx = treeContext(tree, entry);
  const value = entry.row[ctx.field];
  const custom = tree._sourceOptions?.getEditorFn?.(ctx.field, value, ctx);
  if (custom === false)
    return false;
  const editor = asEditor(custom) ?? builtinEditor(ctx.type, value, ctx.rules);
  activate(tree, index);
  const wrap = document.createElement("span");
  wrap.className = "data-tree-editor";
  wrap.append(editor.el);
  const ed = { id: entry.row[tree._source.idField], field: ctx.field, editor, wrap, value, entry, item: null };
  tree._editor = ed;
  const item = dfDollar2(tree._pool).children(".data-tree-item").toArray().find((x) => x._index === index);
  if (item)
    placeTreeEditor(item, ed);
  wrap.addEventListener("keydown", (e) => {
    e.stopPropagation();
    const act = editorKey(e, editor);
    if (!act)
      return;
    e.preventDefault();
    if (act === "cancel")
      cancelTreeEdit(tree);
    else
      commitTreeEdit(tree);
  });
  wrap.addEventListener("click", (e) => e.stopPropagation());
  wrap.addEventListener("dblclick", (e) => e.stopPropagation());
  wrap.addEventListener("change", () => {
    if (editor.immediate)
      commitTreeEdit(tree);
  });
  wrap.addEventListener("focusout", (e) => {
    if (wrap.contains(e.relatedTarget))
      return;
    setTimeout(() => {
      if (tree._editor === ed && !wrap.contains(document.activeElement))
        commitTreeEdit(tree, false);
    }, 0);
  });
  focusEditor(editor);
  return true;
}
function cancelTreeEdit(tree, focus = true) {
  if (!tree._editor)
    return;
  tree._editor = null;
  tree._gen = (tree._gen || 0) + 1;
  renderItems(tree);
  if (focus)
    tree.focus({ preventScroll: true });
}
function writeTreeRecord(tree, id, patch) {
  const idField = tree._source.idField;
  const rows = tree._source.rows;
  const at = rows.findIndex((r) => r[idField] === id);
  if (at < 0)
    return null;
  const record = { ...rows[at], ...patch };
  const next = rows.slice();
  next[at] = record;
  tree._source.setRows(next);
  tree._writing = true;
  triggerStateChange2(tree, tree.store.value, tree.store.value);
  tree._writing = false;
  const index = tree._result.entries.findIndex((x) => x.row[idField] === id);
  if (index >= 0)
    activate(tree, index);
  return record;
}
function commitTreeEdit(tree, focus = true) {
  const ed = tree._editor;
  if (!ed)
    return true;
  let problem = ed.editor.validate?.() ?? "";
  let value;
  if (!problem) {
    try {
      value = ed.editor.getValue();
    } catch (error) {
      problem = String(error.message ?? error);
    }
  }
  const ctx = treeContext(tree, ed.entry);
  if (!problem)
    problem = editorProblem(ctx.rules, value);
  if (!problem) {
    const answer = tree._sourceOptions?.validateFn?.(ed.field, value, ctx);
    if (typeof answer === "string" && answer)
      problem = answer;
    else if (answer === false)
      problem = "Invalid value";
  }
  if (problem) {
    const control = editorControl(ed.editor);
    control.setAttribute("aria-invalid", "true");
    let note = dfDollar2(ed.wrap).children(".data-tree-error").get(0);
    if (!note) {
      note = document.createElement("span");
      note.className = "data-tree-error";
      note.setAttribute("role", "alert");
      note.id = `dt-error-${Math.random().toString(36).slice(2, 8)}`;
      ed.wrap.append(note);
      control.setAttribute("aria-describedby", note.id);
    }
    dfDollar2(note).text(problem);
    return false;
  }
  tree._editor = null;
  const oldValue = ed.value;
  const before = new CustomEvent("data-tree-beforeedit", {
    bubbles: true,
    cancelable: true,
    detail: { record: ed.entry.row, field: ed.field, value, oldValue }
  });
  const same = JSON.stringify(value) === JSON.stringify(oldValue) && !ed.editor.patch;
  if (same || !tree.dispatchEvent(before)) {
    tree._gen = (tree._gen || 0) + 1;
    renderItems(tree);
  } else {
    const record = writeTreeRecord(tree, ed.id, { ...ed.editor.patch?.(), [ed.field]: value });
    tree.dispatchEvent(new CustomEvent("data-tree-edit", {
      bubbles: true,
      detail: { record, field: ed.field, value, oldValue }
    }));
  }
  if (focus)
    tree.focus({ preventScroll: true });
  return true;
}
function refresh2(tree, config, previous) {
  if (!tree._source)
    return 0;
  if (tree._editor && !tree._writing) {
    tree._writing = true;
    if (!commitTreeEdit(tree, false))
      tree._editor = null;
    tree._writing = false;
  }
  tree._result = tree._source.query({
    filters: config.filters,
    sorters: config.sorters,
    expanded: config.expanded,
    collapsed: config.collapsed
  });
  tree._gen = (tree._gen || 0) + 1;
  const prev = previous?.config || {};
  if (JSON.stringify(prev.filters ?? []) !== JSON.stringify(config.filters ?? [])) {
    tree.scrollTop = 0;
    const first = tree._result.entries.findIndex((e) => e.meta.isMatch);
    tree._active = (config.filters || []).length ? Math.max(0, first) : 0;
  }
  tree._active = Math.min(tree._active ?? 0, Math.max(0, tree._result.entries.length - 1));
  renderItems(tree);
  return tree._result.entries.length;
}
function triggerStateChange2(tree, state, previous) {
  tree._config = state.config;
  let name = state.name;
  if (name !== "loading") {
    const rows = refresh2(tree, state.config, previous);
    if (name === "default" && !rows)
      name = "empty";
  }
  applyMarkup2(tree, { name, config: state.config });
  tree.dataset.stateName = name;
  if (tree._saved) {
    tree._saved.set({
      filters: state.config.filters ?? [],
      sorters: state.config.sorters ?? [],
      expanded: state.config.expanded ?? [],
      selected: state.config.selected ?? null
    });
  }
  if (tree.id) {
    for (const input of dfDollar2(`[data-tree-filter="${CSS.escape(tree.id)}"]`).toArray()) {
      if (input === document.activeElement)
        continue;
      const field = input.dataset.field || labelField(tree);
      input.value = filterText((state.config.filters || []).find((x) => x.field === field));
    }
  }
}
var KEPT = ["filters", "sorters", "expanded"];
function attachPersistence(tree, config) {
  tree._saved?.destroy();
  const where = viewPersistence(tree, "data-tree", String(dfDollar2(".data-tree").toArray().indexOf(tree)), config || {});
  tree._saved = where ? persisted(where.key, {}, {
    area: where.area,
    validate: (v) => typeof v === "object" && v !== null && !Array.isArray(v)
  }) : null;
  const kept = {};
  for (const k of KEPT)
    if (Array.isArray(tree._saved?.value[k]))
      kept[k] = tree._saved.value[k];
  if (tree._saved && tree._saved.value.selected !== undefined)
    kept.selected = tree._saved.value.selected;
  return kept;
}
var dataTreeApi = componentState2({
  component: "data-tree",
  states: dataTreeStates,
  mergeConfig: true,
  apply: (tree, state, previous) => triggerStateChange2(tree, state, previous),
  markup: (el, state) => applyMarkup2(el, state)
});
df$2.dataTreeApi = dataTreeApi;
df$2.dataTreeStates = dataTreeStates;
var query = (tree, patch) => dataTreeApi.setState(tree, tree.store.value.name === "loading" ? "loading" : "default", patch);
var entryAt = (tree, index) => tree._result?.entries[index];
function ancestorsOf(tree, id) {
  const src = tree._source;
  if (tree._parents?.source !== src) {
    const field = tree._parentField || "parentId";
    const map = new Map;
    for (const row of src.rows)
      map.set(row[src.idField], row[field] ?? null);
    tree._parents = { source: src, map };
  }
  const map = tree._parents.map;
  const out = [];
  const seen = new Set;
  for (let at = map.get(id) ?? null;at !== null && map.has(at) && !seen.has(at); at = map.get(at) ?? null) {
    seen.add(at);
    out.unshift(at);
  }
  return out;
}
function setExpanded(tree, index, open) {
  const entry = entryAt(tree, index);
  if (!entry?.meta.hasChildren || entry.meta.isExpanded === open)
    return false;
  const id = entry.row[tree._source.idField];
  const config = configOf(tree);
  if ((config.filters || []).length) {
    const collapsed = new Set(config.collapsed || []);
    if (open)
      collapsed.delete(id);
    else
      collapsed.add(id);
    query(tree, { collapsed: [...collapsed] });
  } else if (open && tree.hasAttribute("data-exclusive")) {
    query(tree, { expanded: [...ancestorsOf(tree, id), id] });
  } else {
    const expanded = new Set(config.expanded || []);
    if (open)
      expanded.add(id);
    else
      expanded.delete(id);
    query(tree, { expanded: [...expanded] });
  }
  return true;
}
function select(tree, index) {
  const entry = entryAt(tree, index);
  if (!entry)
    return;
  query(tree, { selected: entry.row[tree._source.idField] });
  tree.dispatchEvent(new CustomEvent("data-tree-select", {
    bubbles: true,
    detail: { record: entry.row, meta: entry.meta }
  }));
}
function activate(tree, index) {
  const total = tree._result?.entries.length ?? 0;
  if (!total)
    return;
  tree._active = Math.max(0, Math.min(total - 1, index));
  tree.scrollTop = scrollIntoViewTop(tree._active, tree.scrollTop, tree.clientHeight, tree._rowHeight, total);
  renderItems(tree);
}
function onKeydown(tree, e) {
  if (tree._editor && tree._editor.wrap.contains(e.target))
    return;
  const index = tree._active ?? 0;
  const entry = entryAt(tree, index);
  if (!entry)
    return;
  const page = Math.max(1, Math.floor(tree.clientHeight / tree._rowHeight) - 1);
  switch (e.key) {
    case "ArrowDown":
      activate(tree, index + 1);
      break;
    case "ArrowUp":
      activate(tree, index - 1);
      break;
    case "ArrowRight":
      if (entry.meta.hasChildren && !setExpanded(tree, index, true))
        activate(tree, index + 1);
      break;
    case "ArrowLeft":
      if (entry.meta.hasChildren && entry.meta.isExpanded)
        setExpanded(tree, index, false);
      else if (entry.meta.parentId != null) {
        const parent = tree._result.entries.findIndex((x) => x.row[tree._source.idField] === entry.meta.parentId);
        if (parent >= 0)
          activate(tree, parent);
      }
      break;
    case "Home":
      activate(tree, 0);
      break;
    case "End":
      activate(tree, tree._result.entries.length - 1);
      break;
    case "PageDown":
      activate(tree, index + page);
      break;
    case "PageUp":
      activate(tree, index - page);
      break;
    case "F2":
      if (!openTreeEdit(tree, index))
        return;
      break;
    case "Enter":
    case " ":
      select(tree, index);
      break;
    case "*": {
      const parent = entry.meta.parentId ?? null;
      const ids = tree._result.entries.filter((x) => (x.meta.parentId ?? null) === parent && x.meta.hasChildren).map((x) => x.row[tree._source.idField]);
      query(tree, { expanded: [...new Set([...configOf(tree).expanded || [], ...ids])] });
      break;
    }
    default:
      return;
  }
  e.preventDefault();
}
function onClick(tree, e) {
  const item = e.target.closest?.(".data-tree-item");
  if (!item || !tree._pool.contains(item))
    return;
  tree._active = item._index;
  if (e.target.closest(".data-tree-toggle")) {
    const entry = entryAt(tree, item._index);
    setExpanded(tree, item._index, !entry?.meta.isExpanded);
    return;
  }
  select(tree, item._index);
}
if (!document.__dataTreeFilterInit) {
  document.__dataTreeFilterInit = true;
  document.addEventListener("input", (e) => {
    const input = e.target.closest?.("[data-tree-filter]");
    if (!input)
      return;
    const tree = dfDollar2("#" + CSS.escape(input.dataset.treeFilter)).get(0);
    if (!tree?.store)
      return;
    clearTimeout(tree._filterTimer);
    tree._filterTimer = setTimeout(() => {
      const filter = parseFilter2(input.dataset.field || labelField(tree), input.value, "text");
      query(tree, { filters: filter ? [filter] : [], collapsed: [] });
    }, 150);
  });
}
var resolve = (target) => typeof target === "string" ? dfDollar2(target).get(0) : target;
df$2.dataTree = {
  setSource(target, rows, options = {}) {
    const tree = resolve(target);
    const idField = options.idField || tree.dataset.idField || "id";
    const parentIdField = options.parentIdField || tree.dataset.parentField || "parentId";
    tree._source = dataSource2(rows, { idField, tree: { idField, parentIdField } });
    tree._parentField = parentIdField;
    tree._render = options.render || null;
    tree._sourceOptions = options;
    if (tree.store)
      dataTreeApi.setState(tree, "default", {
        ...options.query,
        ...options.persist ? attachPersistence(tree, options.persist) : {}
      });
  },
  query: (target, patch) => {
    query(resolve(target), patch);
  },
  expandAll(target) {
    const tree = resolve(target);
    query(tree, { expanded: tree._source.branchIds(), collapsed: [] });
  },
  collapseAll(target) {
    const tree = resolve(target);
    const filtering = (configOf(tree).filters || []).length > 0;
    query(tree, filtering ? { collapsed: tree._source.branchIds() } : { expanded: [] });
  },
  reveal(target, id) {
    const tree = resolve(target);
    if (!tree?._source || !tree.store)
      return false;
    if (!tree._source.rows.some((r) => r[tree._source.idField] === id))
      return false;
    const way = ancestorsOf(tree, id);
    const config = configOf(tree);
    if ((config.filters || []).length) {
      const collapsed = new Set(config.collapsed || []);
      for (const a of way)
        collapsed.delete(a);
      query(tree, { collapsed: [...collapsed], selected: id });
    } else {
      const expanded = tree.hasAttribute("data-exclusive") ? way : [...new Set([...config.expanded || [], ...way])];
      query(tree, { expanded, selected: id });
    }
    const index = tree._result?.entries.findIndex((e) => e.row[tree._source.idField] === id) ?? -1;
    if (index < 0)
      return false;
    activate(tree, index);
    return true;
  },
  source: (target) => resolve(target)._source,
  edit(target, id) {
    const tree = resolve(target);
    if (!df$2.dataTree.reveal(tree, id))
      return false;
    const index = tree._result.entries.findIndex((x) => x.row[tree._source.idField] === id);
    return openTreeEdit(tree, index);
  },
  commit: (target) => commitTreeEdit(resolve(target)),
  cancel: (target) => cancelTreeEdit(resolve(target)),
  update(target, id, patch) {
    const tree = resolve(target);
    const old = tree._source.rows.find((r) => r[tree._source.idField] === id);
    if (!old)
      return null;
    const record = writeTreeRecord(tree, id, patch);
    for (const field of Object.keys(patch))
      tree.dispatchEvent(new CustomEvent("data-tree-edit", {
        bubbles: true,
        detail: { record, field, value: patch[field], oldValue: old[field] }
      }));
    return record;
  },
  selected(target) {
    const tree = resolve(target);
    const id = configOf(tree).selected ?? null;
    return id === null ? null : tree._source?.rows.find((r) => r[tree._source.idField] === id) ?? null;
  }
};
function init2() {
  dfDollar2(".data-tree:not([data-init])").toArray().forEach((tree) => {
    tree.dataset.init = "";
    tree._uid = tree.id || `data-tree-${++uid}`;
    const sizer = document.createElement("div");
    sizer.className = "data-tree-sizer";
    const pool = document.createElement("div");
    pool.className = "data-tree-items";
    pool.setAttribute("role", "presentation");
    sizer.append(pool);
    dfDollar2(tree).append(sizer);
    tree._sizer = sizer;
    tree._pool = pool;
    tree._active = 0;
    tree._rowHeight = parseFloat(getComputedStyle(tree).getPropertyValue("--data-tree-row-height")) || 32;
    tree.setAttribute("role", "tree");
    if (!tree.hasAttribute("tabindex"))
      tree.tabIndex = 0;
    const early = tree._sourceOptions || {};
    const config = {
      filters: [],
      sorters: [],
      expanded: [],
      collapsed: [],
      selected: null,
      ...early.query,
      ...attachPersistence(tree, early.persist)
    };
    let queued = false;
    tree.addEventListener("scroll", () => {
      if (queued)
        return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        renderItems(tree);
      });
    }, { passive: true });
    new ResizeObserver(() => renderItems(tree)).observe(tree);
    tree.addEventListener("click", (e) => onClick(tree, e));
    tree.addEventListener("keydown", (e) => onKeydown(tree, e));
    tree.addEventListener("dblclick", (e) => {
      const item = e.target.closest?.(".data-tree-item");
      if (!item || !tree._pool.contains(item) || e.target.closest(".data-tree-toggle"))
        return;
      if (openTreeEdit(tree, item._index))
        e.preventDefault();
    });
    bindComponent2(tree, dataTreeApi, { name: tree._source ? "default" : "loading", config });
    dataTreeApi.setState(tree, tree._source ? "default" : "loading", config);
  });
}
init2();
new MutationObserver(init2).observe(document, { childList: true, subtree: true });

// dist/components/data-grid/data-grid.js
var __df$core3 = globalThis.df$;
var __df$shared3 = __df$core3 && __df$core3.shadcn && __df$core3.shadcn.shared;
if (!__df$shared3 || __df$shared3.abi !== "0.9.17") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals3, defussQuery: defussQuery3, textLocale, componentState: componentState3, bindComponent: bindComponent3, persisted: persisted2, viewPersistence: viewPersistence2, dataSource: dataSource3, parseFilter: parseFilter3, filterText: filterText2, cycleSort, virtualWindow: virtualWindow3, sizerHeight: sizerHeight3, scrollIntoViewTop: scrollIntoViewTop2, asEditor: asEditor2, builtinEditor: builtinEditor2, editorControl: editorControl2, editorKey: editorKey2, editorProblem: editorProblem2, focusEditor: focusEditor2, valueType: valueType2 } = __df$shared3;
var df$3 = defussGlobals3();
var dfDollar3 = defussQuery3();
var dataGridStates = ["default", "loading", "empty"];
var SAVED_KEYS = ["filters", "sorters", "locked", "columns", "hidden", "widths", "expanded"];
var keepable = (key, value) => key === "widths" ? typeof value === "object" && value !== null && !Array.isArray(value) && Object.values(value).every((w) => typeof w === "number" && w > 0) : Array.isArray(value);
var numberFormat = new Map;
function format(value, spec, el) {
  if (value == null)
    return "";
  if (!spec)
    return String(value);
  const locale = textLocale(el);
  if (spec === "date") {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(locale);
  }
  const key = `${locale}|${spec}`;
  if (!numberFormat.has(key)) {
    const [style, currency] = spec.split(":");
    numberFormat.set(key, new Intl.NumberFormat(locale, style === "currency" ? { style, currency: currency || "USD" } : style === "percent" ? { style, maximumFractionDigits: 1 } : {}));
  }
  return typeof value === "number" ? numberFormat.get(key).format(value) : String(value);
}
var headerRowOf = (root) => dfDollar3(root).find(".data-grid-head > .data-grid-row").get(0);
var headersOf = (root) => {
  const row = headerRowOf(root);
  return row ? dfDollar3(row).children(".data-grid-header").toArray() : [];
};
function readColumns(grid) {
  return headersOf(grid).map((el) => ({
    el,
    field: el.dataset.field,
    filter: el.dataset.filter || "",
    type: el.dataset.type === "number" ? "number" : "text",
    format: el.hasAttribute("data-format") ? el.dataset.format : el.dataset.type === "number" ? "number" : "",
    width: el.dataset.width || "minmax(8rem, 1fr)",
    align: el.dataset.align || (el.dataset.type === "number" ? "end" : ""),
    sortable: el.dataset.sortable !== "false",
    lockable: el.dataset.lockable !== "false",
    hideable: el.dataset.hideable !== "false",
    resizable: el.dataset.resizable !== "false",
    movable: el.dataset.movable !== "false",
    lockedAtStart: el.hasAttribute("data-locked"),
    hiddenAtStart: el.hidden,
    sortField: el.dataset.sortField || el.dataset.field,
    options: el.dataset.options ? el.dataset.options.split(",").map((o) => o.trim()) : null,
    editable: el.hasAttribute("data-editable"),
    editor: el.dataset.editor || "",
    rules: columnRules(el)
  }));
}
function columnRules(el) {
  const num = (name) => el.dataset[name] != null && el.dataset[name] !== "" ? Number(el.dataset[name]) : undefined;
  const rules = {};
  if (el.hasAttribute("data-required"))
    rules.required = true;
  if (el.hasAttribute("data-integer"))
    rules.integer = true;
  if (num("min") != null)
    rules.min = num("min");
  if (num("max") != null)
    rules.max = num("max");
  if (el.dataset.step)
    rules.step = el.dataset.step;
  if (num("minLength") != null)
    rules.minLength = num("minLength");
  if (num("maxLength") != null)
    rules.maxLength = num("maxLength");
  if (el.dataset.pattern)
    rules.pattern = el.dataset.pattern;
  if (el.dataset.message)
    rules.message = el.dataset.message;
  return rules;
}
function attachPersistence2(grid, config) {
  grid._saved?.destroy();
  const where = viewPersistence2(grid, "data-grid", String(dfDollar3(".data-grid").toArray().indexOf(grid)), config || {});
  grid._saved = where ? persisted2(where.key, {}, {
    area: where.area,
    validate: (v) => typeof v === "object" && v !== null && !Array.isArray(v)
  }) : null;
  const kept = {};
  for (const k of SAVED_KEYS)
    if (keepable(k, grid._saved?.value[k]))
      kept[k] = grid._saved.value[k];
  return kept;
}
var authoredSort = (grid) => grid._columns.filter((c) => c.el.dataset.sort === "asc" || c.el.dataset.sort === "desc").map((c) => ({ field: c.sortField, direction: c.el.dataset.sort }));
function ordered(items, locked, fieldOf) {
  const set = new Set(locked || []);
  return [...items.filter((i) => set.has(fieldOf(i))), ...items.filter((i) => !set.has(fieldOf(i)))];
}
function inColumnOrder(items, config, fieldOf) {
  const rank = new Map((config.columns || []).map((f, i) => [f, i]));
  const at = (item, i) => rank.get(fieldOf(item)) ?? rank.size + i;
  return items.map((item, i) => [at(item, i), item]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);
}
var arrange = (items, config, fieldOf) => ordered(inColumnOrder(items, config, fieldOf), config.locked, fieldOf);
function applyMarkup3(root, state) {
  const config = state.config || {};
  const headers = root._columns ? root._columns.map((c) => c.el) : headersOf(root);
  const row = headerRowOf(root);
  const locked = new Set(config.locked || []);
  const sorters = config.sorters || [];
  const hidden = new Set(config.hidden || []);
  if (headers.every((el) => hidden.has(el.dataset.field)))
    hidden.clear();
  const order = arrange(headers, config, (el) => el.dataset.field);
  if (row && order.some((el, i) => dfDollar3(row).children(".data-grid-header").get(i) !== el)) {
    order.forEach((el) => dfDollar3(row).append(el));
  }
  for (const el of headers) {
    const at = sorters.findIndex((s) => s.field === (el.dataset.sortField || el.dataset.field));
    const dir = at < 0 ? null : sorters[at].direction || sorters[at].dir || "asc";
    dfDollar3(el).attr("data-locked", locked.has(el.dataset.field) ? "" : null).attr("hidden", hidden.has(el.dataset.field) ? "" : null).attr("aria-sort", dir ? dir === "asc" ? "ascending" : "descending" : null).attr("data-sort-index", dir && sorters.length > 1 ? String(at + 1) : null);
  }
  dfDollar3(root).attr("data-state", state.name).attr("aria-busy", state.name === "loading" ? "true" : null);
}
var configOf2 = (grid) => grid._config ?? grid.store?.value.config ?? {};
var isTree = (grid) => !!grid._source?.tree;
var paging = (grid) => grid.dataset.paging || "virtual";
var pageSize = (grid) => Math.max(1, parseInt(grid.dataset.pageSize || "50", 10) || 50);
function evaluate(grid, config) {
  if (!grid._source)
    return grid._result = { entries: [], totalRows: 0, matchedRows: 0, visibleRows: 0 };
  return grid._result = grid._source.query({
    filters: config.filters,
    sorters: config.sorters,
    expanded: config.expanded,
    collapsed: config.collapsed
  });
}
function shown(grid, config) {
  const entries = grid._result?.entries ?? [];
  const mode = paging(grid);
  if (mode === "virtual")
    return entries;
  const size = pageSize(grid);
  const page = Math.max(0, config.page || 0);
  return mode === "pages" ? entries.slice(page * size, (page + 1) * size) : entries.slice(0, (page + 1) * size);
}
var pageCount = (grid) => Math.max(1, Math.ceil((grid._result?.entries.length ?? 0) / pageSize(grid)));
var parts = (grid) => grid._parts;
var rowHeight = (grid) => grid._rowHeight;
function layoutColumns(grid, config) {
  const all = arrange(grid._columns, config, (c) => c.field);
  const hidden = new Set(config.hidden || []);
  const visible = all.filter((c) => !hidden.has(c.field));
  const columns = visible.length ? visible : all;
  grid._order = columns;
  const widths = config.widths || {};
  grid.style.setProperty("--data-grid-template", columns.map((c) => widths[c.field] > 0 ? `${widths[c.field]}px` : c.width).join(" "));
  const locked = new Set(config.locked || []);
  let left = 0;
  grid._lockLeft = {};
  for (const column of columns) {
    if (!locked.has(column.field)) {
      column.el.style.removeProperty("inset-inline-start");
      continue;
    }
    grid._lockLeft[column.field] = left;
    column.el.style.insetInlineStart = `${left}px`;
    left += column.el.getBoundingClientRect().width;
  }
  grid.toggleAttribute("data-has-locked", locked.size > 0);
}
function buildFilters(grid) {
  if (!grid._columns.some((c) => c.filter) || grid._parts.filters)
    return;
  const row = document.createElement("div");
  row.className = "data-grid-row data-grid-filters";
  row.setAttribute("role", "row");
  grid._parts.filters = row;
  dfDollar3(grid._parts.head).append(row);
}
function syncFilters(grid, config) {
  const row = grid._parts.filters;
  if (!row)
    return;
  const filters = config.filters || [];
  const locked = new Set(config.locked || []);
  const key = grid._order.map((c) => c.field).join("|");
  if (row._key !== key) {
    row._key = key;
    row.textContent = "";
    for (const column of grid._order) {
      const cell = document.createElement("div");
      cell.className = "data-grid-filter-cell";
      cell.setAttribute("role", "gridcell");
      cell.dataset.field = column.field;
      if (column.filter) {
        const label = `Filter ${column.el.textContent.trim()}`;
        let input;
        if (column.filter === "select") {
          input = document.createElement("select");
          const options = column.options || distinct(grid, column.field);
          const all = document.createElement("option");
          all.value = "";
          all.textContent = "All";
          input.append(all, ...options.map((o) => Object.assign(document.createElement("option"), { value: o, textContent: o })));
        } else {
          input = document.createElement("input");
          input.type = "search";
          input.placeholder = column.type === "number" ? "> 100" : "Filter…";
          input.inputMode = column.type === "number" ? "decimal" : "search";
          input.autocomplete = "off";
        }
        input.className = "data-grid-filter";
        input.dataset.field = column.field;
        input.dataset.kind = column.filter === "select" ? "select" : column.type;
        input.setAttribute("aria-label", label);
        cell.append(input);
      }
      row.append(cell);
    }
  }
  for (const cell of dfDollar3(row).children(".data-grid-filter-cell").toArray()) {
    const field = cell.dataset.field;
    if (locked.has(field))
      cell.style.insetInlineStart = `${grid._lockLeft[field] ?? 0}px`;
    else
      cell.style.removeProperty("inset-inline-start");
    cell.toggleAttribute("data-locked", locked.has(field));
    const input = cell.firstElementChild;
    if (input && input !== document.activeElement)
      input.value = filterText2(filters.find((f) => f.field === field));
  }
}
function distinct(grid, field) {
  const seen = new Set;
  for (const row of grid._source?.rows ?? []) {
    if (row[field] != null)
      seen.add(String(row[field]));
    if (seen.size >= 100)
      break;
  }
  return [...seen].sort();
}
var labelOf = (column) => column.el.textContent.trim();
function buildHeaderTools(grid) {
  for (const column of grid._columns) {
    const label = labelOf(column);
    if (!dfDollar3(column.el).children(".data-grid-menu-button").get(0)) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "data-grid-menu-button";
      button.tabIndex = -1;
      button.dataset.field = column.field;
      button.setAttribute("aria-haspopup", "menu");
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", `${label} column menu`);
      dfDollar3(column.el).append(button);
    }
    if (column.resizable && !dfDollar3(column.el).children(".data-grid-resizer").get(0)) {
      const handle = document.createElement("span");
      handle.className = "data-grid-resizer";
      handle.dataset.field = column.field;
      handle.setAttribute("role", "separator");
      handle.setAttribute("aria-orientation", "vertical");
      handle.setAttribute("aria-label", `Resize ${label}`);
      dfDollar3(column.el).append(handle);
    }
  }
}
function fillCell(grid, cell, column, entry, first) {
  const record = entry.row;
  cell.dataset.field = column.field;
  cell.toggleAttribute("data-locked", column.field in grid._lockLeft);
  if (column.field in grid._lockLeft)
    cell.style.insetInlineStart = `${grid._lockLeft[column.field]}px`;
  else
    cell.style.removeProperty("inset-inline-start");
  if (column.align)
    cell.dataset.align = column.align;
  else
    delete cell.dataset.align;
  cell.toggleAttribute("data-editable", !!column.editable && !grid.hasAttribute("data-readonly"));
  delete cell.dataset.editing;
  cell.textContent = "";
  if (first && isTree(grid)) {
    cell.style.setProperty("--depth", String(entry.meta.depth));
    const toggle = document.createElement("span");
    toggle.className = "data-grid-toggle";
    toggle.setAttribute("aria-hidden", "true");
    if (!entry.meta.hasChildren)
      toggle.dataset.leaf = "";
    cell.append(toggle);
  } else {
    cell.style.removeProperty("--depth");
  }
  const custom = grid._cells?.[column.field];
  if (custom) {
    const host = document.createElement("span");
    host.className = "data-grid-content";
    custom(host, record, entry.meta);
    cell.append(host);
  } else {
    const text = document.createElement("span");
    text.className = "data-grid-content";
    text.textContent = format(record[column.field], column.format, grid);
    cell.append(text);
  }
}
function renderRows2(grid) {
  const { viewport, body, pool } = parts(grid);
  if (!pool || !grid._order)
    return;
  const config = configOf2(grid);
  const entries = grid._shown || [];
  const total = entries.length;
  const headH = grid._parts.head.offsetHeight;
  const view = Math.max(rowHeight(grid), viewport.clientHeight - headH);
  const win = virtualWindow3(Math.max(0, viewport.scrollTop), view, rowHeight(grid), total);
  body.style.height = `${sizerHeight3(total, rowHeight(grid))}px`;
  while (pool.children.length < win.count) {
    const row = document.createElement("div");
    row.className = "data-grid-row";
    row.setAttribute("role", "row");
    pool.append(row);
  }
  while (pool.children.length > win.count)
    pool.lastElementChild.remove();
  pool.style.translate = `0 ${win.shift}px`;
  const selected = grid._selected;
  const base = paging(grid) === "pages" ? Math.max(0, config.page || 0) * pageSize(grid) : 0;
  const headRows = grid._parts.filters ? 2 : 1;
  const focus = grid._focus;
  let edShown = false;
  for (let i = 0;i < pool.children.length; i++) {
    const row = pool.children[i];
    const index = win.first + i;
    const entry = entries[index];
    const key = `${grid._gen}:${index}`;
    if (row._key !== key) {
      row._key = key;
      row._index = index;
      row.dataset.index = String(index);
      row.setAttribute("aria-rowindex", String(base + index + headRows + 1));
      while (row.children.length < grid._order.length) {
        const cell = document.createElement("div");
        cell.className = "data-grid-cell";
        cell.setAttribute("role", "gridcell");
        row.append(cell);
      }
      while (row.children.length > grid._order.length)
        row.lastElementChild.remove();
      grid._order.forEach((column, c) => {
        fillCell(grid, row.children[c], column, entry, c === 0);
        row.children[c].setAttribute("aria-colindex", String(c + 1));
      });
      if (isTree(grid)) {
        row.setAttribute("aria-level", String(entry.meta.depth + 1));
        if (entry.meta.hasChildren)
          row.setAttribute("aria-expanded", String(entry.meta.isExpanded));
        else
          row.removeAttribute("aria-expanded");
      }
    }
    const id = entry.row[grid._source.idField];
    const ed = grid._editor;
    if (ed && ed.id === id) {
      edShown = true;
      if (!row.contains(ed.wrap)) {
        const focused = ed.wrap.contains(document.activeElement) || !document.activeElement || document.activeElement === document.body;
        ed.rowEl = row;
        placeEditor(grid, ed);
        if (focused)
          editorControl2(ed.editor).focus({ preventScroll: true });
      }
    }
    if (grid.dataset.select)
      row.setAttribute("aria-selected", String(selected.has(id)));
    else
      row.removeAttribute("aria-selected");
    for (let c = 0;c < row.children.length; c++) {
      row.children[c].tabIndex = focus.row === index && focus.col === c ? 0 : -1;
    }
  }
  if (grid._editor && !edShown && !grid._writing)
    queueMicrotask(() => {
      if (grid._editor && !commitEdit(grid, "none"))
        cancelEdit(grid, false);
    });
}
function renderFooter(grid, config) {
  const count = (n) => format(n, "number", grid);
  const footer = grid._parts.footer;
  if (!footer)
    return;
  const result = grid._result;
  const shownRows = grid._shown?.length ?? 0;
  const visible = result.entries.length;
  const filtered = (config.filters || []).length > 0;
  const mode = paging(grid);
  let text;
  if (isTree(grid)) {
    text = `${count(visible)} rows shown`;
    text += filtered ? ` · ${count(result.matchedRows)} of ${count(result.totalRows)} match` : ` of ${count(result.totalRows)}`;
  } else {
    text = filtered ? `${count(visible)} of ${count(result.totalRows)} rows match` : `${count(visible)} rows`;
  }
  if (mode === "pages" && visible) {
    const start = Math.max(0, config.page || 0) * pageSize(grid);
    text = `${count(start + 1)}–${count(start + shownRows)} of ${text}`;
  }
  if (mode === "infinite" && visible)
    text = `${count(shownRows)} loaded · ${text}`;
  if (grid._selected.size)
    text += ` · ${count(grid._selected.size)} selected`;
  if (!grid._parts.status) {
    const status = document.createElement("span");
    status.className = "data-grid-status";
    status.setAttribute("role", "status");
    footer.append(status);
    grid._parts.status = status;
  }
  grid._parts.status.textContent = text;
  if (mode !== "pages")
    return;
  if (!grid._parts.pager) {
    const pager = document.createElement("div");
    pager.className = "data-grid-pager";
    for (const [act, name] of [
      ["first", "First page"],
      ["prev", "Previous page"],
      ["label"],
      ["next", "Next page"],
      ["last", "Last page"]
    ]) {
      if (act === "label") {
        const label = document.createElement("span");
        label.className = "data-grid-page-label";
        pager.append(label);
        continue;
      }
      const button = document.createElement("button");
      button.type = "button";
      button.className = "data-grid-page-btn";
      button.dataset.page = act;
      button.setAttribute("aria-label", name);
      pager.append(button);
    }
    footer.append(pager);
    grid._parts.pager = pager;
  }
  const page = Math.max(0, config.page || 0);
  const pages = pageCount(grid);
  dfDollar3(grid._parts.pager).find(".data-grid-page-label").get(0).textContent = `Page ${count(page + 1)} of ${count(pages)}`;
  for (const button of dfDollar3(grid._parts.pager).find("[data-page]").toArray()) {
    const back = button.dataset.page === "first" || button.dataset.page === "prev";
    button.disabled = back ? page <= 0 : page >= pages - 1;
  }
}
function refresh3(grid, config, previous) {
  grid._config = config;
  if (grid._editor && !grid._writing) {
    grid._writing = true;
    if (!commitEdit(grid, "none"))
      grid._editor = null;
    grid._writing = false;
  }
  evaluate(grid, config);
  grid._selected = new Set(config.selected || []);
  grid._shown = shown(grid, config);
  layoutColumns(grid, config);
  syncFilters(grid, config);
  grid._gen = (grid._gen || 0) + 1;
  const prev = previous?.config || {};
  const moved = ["filters", "sorters", "page"].some((k) => JSON.stringify(prev[k] ?? null) !== JSON.stringify(config[k] ?? null));
  if (moved && paging(grid) !== "infinite")
    grid._parts.viewport.scrollTop = 0;
  if (moved)
    grid._focus = { row: grid._focus.row < 0 ? -1 : 0, col: grid._focus.col };
  grid.setAttribute("aria-rowcount", String((grid._result.entries.length || 0) + (grid._parts.filters ? 2 : 1)));
  grid.setAttribute("aria-colcount", String(grid._order.length));
  if (grid._focus.col >= grid._order.length)
    grid._focus = { ...grid._focus, col: Math.max(0, grid._order.length - 1) };
  renderRows2(grid);
  renderFooter(grid, config);
  return grid._result.entries.length;
}
function triggerStateChange3(grid, state, previous) {
  grid._config = state.config;
  let name = state.name;
  if (name !== "loading" && grid._parts) {
    const rows = refresh3(grid, state.config, previous);
    if (name === "default" && !rows)
      name = "empty";
  }
  applyMarkup3(grid, { name, config: state.config });
  grid.dataset.stateName = name;
  if (grid._saved) {
    const keep = {};
    for (const k of SAVED_KEYS)
      if (state.config[k] !== undefined)
        keep[k] = state.config[k];
    grid._saved.set(keep);
  }
}
var dataGridApi = componentState3({
  component: "data-grid",
  states: dataGridStates,
  mergeConfig: true,
  apply: (grid, state, previous) => triggerStateChange3(grid, state, previous),
  markup: (el, state) => applyMarkup3(el, state)
});
df$3.dataGridApi = dataGridApi;
df$3.dataGridStates = dataGridStates;
var query2 = (grid, patch) => dataGridApi.setState(grid, grid.store.value.name === "loading" ? "loading" : "default", patch);
function toggleRow(grid, index, mode) {
  const entry = grid._shown[index];
  if (!entry || !grid.dataset.select)
    return;
  const id = entry.row[grid._source.idField];
  let next;
  if (grid.dataset.select === "single" || mode === "only")
    next = grid._selected.has(id) && grid._selected.size === 1 && mode !== "only" ? [] : [id];
  else if (mode === "range" && grid._anchor != null) {
    const from = Math.min(grid._anchor, index);
    const to = Math.max(grid._anchor, index);
    next = [
      ...new Set([...grid._selected, ...grid._shown.slice(from, to + 1).map((e) => e.row[grid._source.idField])])
    ];
  } else {
    next = grid._selected.has(id) ? [...grid._selected].filter((x) => x !== id) : [...grid._selected, id];
  }
  if (mode !== "range")
    grid._anchor = index;
  query2(grid, { selected: next });
}
function selectAll(grid) {
  const idField = grid._source?.idField ?? "id";
  query2(grid, { selected: (grid._result?.entries ?? []).map((e) => e.row[idField]) });
}
function toggleExpand(grid, index, open) {
  const entry = grid._shown[index];
  if (!entry?.meta.hasChildren)
    return;
  const id = entry.row[grid._source.idField];
  const want = open ?? !entry.meta.isExpanded;
  if (want === entry.meta.isExpanded)
    return;
  const config = configOf2(grid);
  if ((config.filters || []).length) {
    const collapsed = new Set(config.collapsed || []);
    if (want)
      collapsed.delete(id);
    else
      collapsed.add(id);
    query2(grid, { collapsed: [...collapsed] });
  } else {
    const expanded = new Set(config.expanded || []);
    if (want)
      expanded.add(id);
    else
      expanded.delete(id);
    query2(grid, { expanded: [...expanded] });
  }
}
function focusCell(grid, row, col) {
  const total = grid._shown.length;
  row = Math.max(-1, Math.min(total - 1, row));
  col = Math.max(0, Math.min(grid._order.length - 1, col));
  grid._focus = { row, col };
  const { viewport } = parts(grid);
  if (row >= 0) {
    const view = viewport.clientHeight - grid._parts.head.offsetHeight;
    viewport.scrollTop = scrollIntoViewTop2(row, viewport.scrollTop, view, rowHeight(grid), total);
  }
  renderRows2(grid);
  for (const [c, header] of grid._order.entries())
    header.el.tabIndex = row === -1 && c === col ? 0 : -1;
  const target = row === -1 ? grid._order[col].el : dfDollar3(grid._parts.pool).children(".data-grid-row").toArray().find((r) => r._index === row)?.children[col];
  target?.focus({ preventScroll: row === -1 });
}
var editableColumn = (grid, col) => {
  const column = grid._order?.[col];
  return column?.editable ? column : null;
};
var editContext = (grid, record, column) => ({
  record,
  field: column.field,
  type: column.editor || (column.type === "number" ? "number" : valueType2(record[column.field], column.options ? { options: column.options } : null)),
  rules: { ...column.rules, ...column.options ? { options: column.options } : {} },
  grid
});
var rowElOf = (grid, id) => dfDollar3(grid._parts.pool).children(".data-grid-row").toArray().find((r) => grid._shown[r._index]?.row[grid._source.idField] === id);
function placeEditor(grid, ed) {
  const col = grid._order.findIndex((c) => c.field === ed.field);
  const cell = ed.rowEl?.children[col];
  if (!cell)
    return;
  ed.cell = cell;
  cell.dataset.editing = "";
  const content = dfDollar3(cell).children(".data-grid-content").get(0);
  if (content && content !== ed.wrap)
    content.replaceWith(ed.wrap);
  else if (!cell.contains(ed.wrap))
    dfDollar3(cell).append(ed.wrap);
}
function openEdit(grid, row, col) {
  const column = editableColumn(grid, col);
  const entry = grid._shown?.[row];
  if (!column || !entry || grid.hasAttribute("data-readonly"))
    return false;
  if (grid._editor && !commitEdit(grid, "none"))
    return false;
  const record = entry.row;
  const value = record[column.field];
  const ctx = editContext(grid, record, column);
  const custom = grid._sourceOptions?.getEditorFn?.(column.field, value, ctx);
  if (custom === false)
    return false;
  const editor = asEditor2(custom) ?? builtinEditor2(ctx.type, value, ctx.rules, { colorClass: "data-grid-color-input" });
  focusCell(grid, row, col);
  const id = record[grid._source.idField];
  const wrap = document.createElement("span");
  wrap.className = "data-grid-editor data-grid-content";
  dfDollar3(wrap).append(editor.el);
  const ed = { id, field: column.field, column, editor, wrap, value, record, rowEl: rowElOf(grid, id), cell: null };
  grid._editor = ed;
  placeEditor(grid, ed);
  wrap.addEventListener("keydown", (e) => {
    const act = editorKey2(e, editor);
    if (!act)
      return;
    if (act === "cancel") {
      e.preventDefault();
      e.stopPropagation();
      cancelEdit(grid);
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    commitEdit(grid, act === "commit" ? "stay" : act);
  });
  wrap.addEventListener("change", () => {
    if (editor.immediate)
      commitEdit(grid, "stay");
  });
  wrap.addEventListener("focusout", (e) => {
    if (wrap.contains(e.relatedTarget))
      return;
    setTimeout(() => {
      if (grid._editor === ed && !wrap.contains(document.activeElement))
        commitEdit(grid, "none");
    }, 0);
  });
  focusEditor2(editor);
  return true;
}
function cancelEdit(grid, focus = true) {
  const ed = grid._editor;
  if (!ed)
    return;
  grid._editor = null;
  grid._gen++;
  renderRows2(grid);
  if (focus)
    focusRecord(grid, ed.id, ed.field);
}
function focusRecord(grid, id, field, by = 0) {
  const row = grid._shown.findIndex((x) => x.row[grid._source.idField] === id);
  const col = grid._order.findIndex((c) => c.field === field);
  if (row < 0 || col < 0)
    return;
  if (!by)
    return focusCell(grid, row, col);
  const editable = grid._order.map((c, i) => c.editable ? i : -1).filter((i) => i >= 0);
  let at = editable.indexOf(col) + by;
  let r = row;
  if (at >= editable.length)
    [at, r] = [0, row + 1];
  if (at < 0)
    [at, r] = [editable.length - 1, row - 1];
  if (r < 0 || r >= grid._shown.length)
    return focusCell(grid, row, col);
  openEdit(grid, r, editable[at]);
}
function showEditProblem(ed, problem) {
  const control = editorControl2(ed.editor);
  control.setAttribute("aria-invalid", "true");
  let note = dfDollar3(ed.wrap).children(".data-grid-error").get(0);
  if (!note) {
    note = document.createElement("span");
    note.className = "data-grid-error";
    note.setAttribute("role", "alert");
    note.id = `dg-error-${Math.random().toString(36).slice(2, 8)}`;
    dfDollar3(ed.wrap).append(note);
    control.setAttribute("aria-describedby", note.id);
  }
  dfDollar3(note).text(problem);
}
function writeRecord(grid, id, patch) {
  const idField = grid._source.idField;
  const rows = grid._source.rows;
  const at = rows.findIndex((r) => r[idField] === id);
  if (at < 0)
    return null;
  const record = { ...rows[at], ...patch };
  const next = rows.slice();
  next[at] = record;
  grid._source.setRows(next);
  grid._writing = true;
  triggerStateChange3(grid, grid.store.value, grid.store.value);
  grid._writing = false;
  return record;
}
function commitEdit(grid, then = "stay") {
  const ed = grid._editor;
  if (!ed)
    return true;
  let problem = ed.editor.validate?.() ?? "";
  let value;
  if (!problem) {
    try {
      value = ed.editor.getValue();
    } catch (error) {
      problem = String(error.message ?? error);
    }
  }
  const ctx = editContext(grid, ed.record, ed.column);
  if (!problem)
    problem = editorProblem2(ctx.rules, value);
  if (!problem) {
    const answer = grid._sourceOptions?.validateFn?.(ed.field, value, ctx);
    if (typeof answer === "string" && answer)
      problem = answer;
    else if (answer === false)
      problem = "Invalid value";
  }
  if (problem) {
    showEditProblem(ed, problem);
    return false;
  }
  grid._editor = null;
  const oldValue = ed.value;
  const before = new CustomEvent("data-grid-beforeedit", {
    bubbles: true,
    cancelable: true,
    detail: { record: ed.record, field: ed.field, value, oldValue }
  });
  const same = JSON.stringify(value) === JSON.stringify(oldValue) && !ed.editor.patch;
  if (same || !grid.dispatchEvent(before)) {
    grid._gen++;
    renderRows2(grid);
  } else {
    const record = writeRecord(grid, ed.id, { ...ed.editor.patch?.(), [ed.field]: value });
    grid.dispatchEvent(new CustomEvent("data-grid-edit", {
      bubbles: true,
      detail: { record, field: ed.field, value, oldValue }
    }));
  }
  if (then === "stay")
    focusRecord(grid, ed.id, ed.field);
  else if (then === "next" || then === "prev")
    focusRecord(grid, ed.id, ed.field, then === "next" ? 1 : -1);
  return true;
}
function onKeydown2(grid, e) {
  if (e.target.closest?.(".data-grid-filters, .data-grid-footer, .data-grid-menu, .data-grid-editor"))
    return;
  if (e.target.closest?.(".data-grid-row :is(a, button, input, select, textarea, label, [contenteditable])"))
    return;
  const { row, col } = grid._focus;
  const page = Math.max(1, Math.floor((grid._parts.viewport.clientHeight - grid._parts.head.offsetHeight) / rowHeight(grid)) - 1);
  const last = grid._shown.length - 1;
  const entry = row >= 0 ? grid._shown[row] : null;
  const header = row === -1 ? grid._order[col] : null;
  if (header && e.altKey && !e.ctrlKey && !e.metaKey) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      openMenu(grid, header);
      return;
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const later = e.key === "ArrowRight";
      if (e.shiftKey) {
        if (header.movable)
          dropColumn(grid, header.field, later ? col + 2 : col - 1);
        focusCell(grid, -1, grid._order.indexOf(header));
      } else if (header.resizable) {
        const width = Math.round(header.el.getBoundingClientRect().width) + (later ? KEY_STEP : -KEY_STEP);
        query2(grid, { widths: { ...configOf2(grid).widths, [header.field]: Math.max(MIN_WIDTH, width) } });
        focusCell(grid, -1, col);
      }
      return;
    }
  }
  let next = null;
  switch (e.key) {
    case "ArrowDown":
      next = [Math.min(last, row + 1), col];
      break;
    case "ArrowUp":
      next = [Math.max(-1, row - 1), col];
      break;
    case "ArrowRight":
      if (isTree(grid) && entry && col === 0 && entry.meta.hasChildren && !entry.meta.isExpanded) {
        toggleExpand(grid, row, true);
        next = [row, 0];
      } else
        next = [row, col + 1];
      break;
    case "ArrowLeft":
      if (isTree(grid) && entry && col === 0) {
        if (entry.meta.hasChildren && entry.meta.isExpanded) {
          toggleExpand(grid, row, false);
          next = [row, 0];
        } else if (entry.meta.parentId != null) {
          const parent = grid._shown.findIndex((x) => x.row[grid._source.idField] === entry.meta.parentId);
          next = [parent >= 0 ? parent : row, 0];
        } else
          next = [row, 0];
      } else
        next = [row, col - 1];
      break;
    case "Home":
      next = e.ctrlKey || e.metaKey ? [Math.min(row, 0), col] : [row, 0];
      break;
    case "End":
      next = e.ctrlKey || e.metaKey ? [last, col] : [row, grid._order.length - 1];
      break;
    case "PageDown":
      next = [Math.min(last, Math.max(0, row) + page), col];
      break;
    case "PageUp":
      next = [Math.max(0, row - page), col];
      break;
    case " ":
      if (row >= 0) {
        toggleRow(grid, row, e.shiftKey ? "range" : "toggle");
        next = [row, col];
      }
      break;
    case "a":
    case "A":
      if (!(e.ctrlKey || e.metaKey) || grid.dataset.select !== "multiple")
        return;
      selectAll(grid);
      next = [row, col];
      break;
    case "F2":
      if (row < 0 || !openEdit(grid, row, col))
        return;
      e.preventDefault();
      return;
    case "Enter":
      if (row >= 0 && !e.shiftKey && editableColumn(grid, col) && openEdit(grid, row, col)) {
        e.preventDefault();
        return;
      }
      if (row === -1) {
        const column = grid._order[col];
        if (column.sortable)
          query2(grid, { sorters: cycleSort(configOf2(grid).sorters, column.sortField, e.shiftKey), page: 0 });
        next = [-1, col];
      } else if (entry) {
        grid.dispatchEvent(new CustomEvent("data-grid-activate", {
          bubbles: true,
          detail: { record: entry.row, index: row }
        }));
      }
      break;
    default:
      return;
  }
  e.preventDefault();
  if (next)
    focusCell(grid, next[0], next[1]);
}
function onClick2(grid, e) {
  const t = e.target;
  if (grid._suppressClick || t.closest(".data-grid-menu, .data-grid-resizer, .data-grid-editor"))
    return;
  const menuButton = t.closest(".data-grid-menu-button");
  if (menuButton) {
    const column = grid._columns.find((c) => c.field === menuButton.dataset.field);
    if (grid._menuClosedBy !== menuButton && column)
      openMenu(grid, column);
    grid._menuClosedBy = null;
    return;
  }
  const pageButton = t.closest("[data-page]");
  if (pageButton && grid._parts.footer.contains(pageButton)) {
    const page = Math.max(0, configOf2(grid).page || 0);
    const target = { first: 0, prev: page - 1, next: page + 1, last: pageCount(grid) - 1 }[pageButton.dataset.page];
    query2(grid, { page: Math.max(0, Math.min(pageCount(grid) - 1, target)) });
    return;
  }
  const header = t.closest(".data-grid-header");
  if (header && grid.contains(header)) {
    const column = grid._columns.find((c) => c.el === header);
    if (column?.sortable)
      query2(grid, { sorters: cycleSort(configOf2(grid).sorters, column.sortField, e.shiftKey), page: 0 });
    grid._focus = { row: -1, col: grid._order.indexOf(column) };
    return;
  }
  const row = t.closest(".data-grid-row");
  if (!row || !grid._parts.pool.contains(row))
    return;
  const index = row._index;
  const cell = t.closest(".data-grid-cell");
  grid._focus = { row: index, col: Math.max(0, [...row.children].indexOf(cell)) };
  if (t.closest(".data-grid-toggle"))
    return toggleExpand(grid, index);
  if (t.closest("a, button, input, select, textarea, label"))
    return;
  toggleRow(grid, index, e.shiftKey ? "range" : e.ctrlKey || e.metaKey ? "toggle" : "only");
}
function onFilterInput(grid, e) {
  const input = e.target.closest?.(".data-grid-filter");
  if (!input)
    return;
  clearTimeout(grid._filterTimer);
  grid._filterTimer = setTimeout(() => {
    const filters = dfDollar3(grid._parts.filters).find(".data-grid-filter").toArray().map((el) => parseFilter3(el.dataset.field, el.value, el.dataset.kind)).filter(Boolean);
    query2(grid, { filters, page: 0, collapsed: [] });
  }, e.type === "change" ? 0 : 200);
}
async function onNearEnd(grid, force = false) {
  if (paging(grid) !== "infinite" || grid._loadingMore || !grid._source)
    return;
  const config = configOf2(grid);
  const loaded = grid._source.rows.length > 0;
  const loadedRows = ((config.page || 0) + 1) * pageSize(grid);
  const { viewport } = parts(grid);
  if (!force && viewport.scrollTop + viewport.clientHeight < viewport.scrollHeight - rowHeight(grid) * 4)
    return;
  if (loadedRows < (grid._result?.entries.length ?? 0)) {
    query2(grid, { page: (config.page || 0) + 1 });
    return;
  }
  if (!grid._load || grid._exhausted)
    return;
  grid._loadingMore = true;
  grid.setAttribute("data-loading-more", "");
  try {
    const more = await grid._load(grid._source.rows.length, pageSize(grid));
    if (!more?.length)
      grid._exhausted = true;
    else
      grid._source.setRows([...grid._source.rows, ...more]);
    dataGridApi.setState(grid, "default", loaded && more?.length ? { page: (config.page || 0) + 1 } : {});
  } finally {
    grid._loadingMore = false;
    grid.removeAttribute("data-loading-more");
  }
  if (!grid._exhausted && grid._parts.viewport.scrollHeight <= grid._parts.viewport.clientHeight)
    onNearEnd(grid, true);
}
var MIN_WIDTH = 48;
var KEY_STEP = 16;
var LONG_PRESS_MS = 450;
var DRAG_SLOP = 6;
var TOUCH_SLOP = 10;
var anchorPositioning = typeof CSS !== "undefined" && CSS.supports("anchor-name: --a");
var menuSeq = 0;
var columnFields = (grid, config) => inColumnOrder(grid._columns, config, (c) => c.field).map((c) => c.field);
function setLocked(grid, field, on) {
  const config = configOf2(grid);
  const locked = new Set(config.locked || []);
  if (on)
    locked.add(field);
  else
    locked.delete(field);
  query2(grid, { locked: columnFields(grid, config).filter((f) => locked.has(f)) });
}
function setHidden(grid, field, on) {
  const config = configOf2(grid);
  const hidden = new Set(config.hidden || []);
  if (on)
    hidden.add(field);
  else
    hidden.delete(field);
  if (grid._columns.every((c) => hidden.has(c.field)))
    return;
  query2(grid, { hidden: grid._columns.map((c) => c.field).filter((f) => hidden.has(f)) });
}
function dropColumn(grid, field, gap) {
  const config = configOf2(grid);
  const shownFields = grid._order.map((c) => c.field);
  const from = shownFields.indexOf(field);
  const column = grid._columns.find((c) => c.field === field);
  if (from < 0 || !column)
    return;
  gap = Math.max(0, Math.min(shownFields.length, gap));
  if (gap === from || gap === from + 1)
    return;
  const locked = new Set(config.locked || []);
  const rest = shownFields.filter((f) => f !== field);
  const lockedCount = rest.filter((f) => locked.has(f)).length;
  let at = gap > from ? gap - 1 : gap;
  if (at < lockedCount && !column.lockable)
    at = lockedCount;
  if (at < lockedCount)
    locked.add(field);
  else if (at > lockedCount)
    locked.delete(field);
  rest.splice(at, 0, field);
  const before = arrange(grid._columns, config, (c) => c.field).map((c) => c.field);
  const hidden = new Set(config.hidden || []);
  before.forEach((f, i) => {
    if (!hidden.has(f))
      return;
    const after = rest.indexOf(before[i - 1]);
    rest.splice(after + 1, 0, f);
  });
  query2(grid, { columns: rest, locked: rest.filter((f) => locked.has(f)) });
}
function resetColumns(grid) {
  query2(grid, {
    columns: grid._columns.map((c) => c.field),
    locked: grid._columns.filter((c) => c.lockedAtStart).map((c) => c.field),
    hidden: grid._columns.filter((c) => c.hiddenAtStart).map((c) => c.field),
    widths: {}
  });
}
function menuOf(grid) {
  if (grid._menu)
    return grid._menu;
  const menu = document.createElement("div");
  menu.className = "data-grid-menu";
  menu.id = `data-grid-menu-${++menuSeq}`;
  menu.setAttribute("popover", "auto");
  menu.setAttribute("role", "menu");
  dfDollar3(grid).append(menu);
  menu.addEventListener("click", (e) => onMenuClick(grid, e));
  menu.addEventListener("keydown", (e) => onMenuKey(grid, e));
  menu.addEventListener("toggle", (e) => {
    const open = e.newState === "open";
    const button = grid._menuButton;
    button?.setAttribute("aria-expanded", String(open));
    if (open)
      return;
    const inside = menu.contains(document.activeElement) || document.activeElement === document.body;
    const column = grid._columns.find((c) => c.field === grid._menuField);
    grid._menuField = null;
    if (inside && column) {
      const at = grid._order.indexOf(column);
      focusCell(grid, -1, at >= 0 ? at : Math.min(grid._focus.col, grid._order.length - 1));
    }
  });
  grid._menu = menu;
  return menu;
}
function menuItem(role, action, text, checked, disabled, field) {
  const item = document.createElement("button");
  item.type = "button";
  item.className = "data-grid-menu-item";
  item.tabIndex = -1;
  item.setAttribute("role", role);
  item.dataset.action = action;
  if (field)
    item.dataset.field = field;
  if (checked !== null)
    item.setAttribute("aria-checked", String(checked));
  item.disabled = disabled;
  item.textContent = text;
  return item;
}
function menuPart(className, role) {
  const el = document.createElement("div");
  el.className = className;
  el.setAttribute("role", role);
  return el;
}
function fillMenu(grid) {
  const menu = grid._menu;
  const column = grid._columns.find((c) => c.field === grid._menuField);
  if (!menu || !column)
    return;
  const config = configOf2(grid);
  const sorter = (config.sorters || []).find((x) => x.field === column.sortField);
  const dir = sorter ? sorter.direction || sorter.dir || "asc" : null;
  const locked = new Set(config.locked || []);
  const hidden = new Set(config.hidden || []);
  const shownCount = grid._columns.filter((c) => !hidden.has(c.field)).length;
  menu.setAttribute("aria-label", `${labelOf(column)} column`);
  const group = menuPart("data-grid-menu-group", "group");
  group.setAttribute("aria-label", "Columns");
  const title = document.createElement("div");
  title.className = "data-grid-menu-label";
  title.setAttribute("aria-hidden", "true");
  title.textContent = "Columns";
  group.append(title, ...arrange(grid._columns, config, (c) => c.field).map((c) => {
    const isShown = !hidden.has(c.field);
    return menuItem("menuitemcheckbox", "show", labelOf(c), isShown, !c.hideable || isShown && shownCount === 1, c.field);
  }));
  menu.textContent = "";
  menu.append(menuItem("menuitemradio", "asc", "Sort ascending", dir === "asc", !column.sortable), menuItem("menuitemradio", "desc", "Sort descending", dir === "desc", !column.sortable), menuPart("data-grid-menu-separator", "separator"), menuItem("menuitemcheckbox", "lock", "Lock column", locked.has(column.field), !column.lockable), menuPart("data-grid-menu-separator", "separator"), group, menuPart("data-grid-menu-separator", "separator"), menuItem("menuitem", "reset", "Reset columns", null, false));
}
var menuItems = (grid) => dfDollar3(grid._menu).find(".data-grid-menu-item").toArray().filter((b) => !b.disabled);
function openMenu(grid, column) {
  const menu = menuOf(grid);
  const button = dfDollar3(column.el).children(".data-grid-menu-button").get(0);
  if (!button || column.el.hidden)
    return;
  if (grid._menuButton && grid._menuButton !== button) {
    grid._menuButton.style.removeProperty("anchor-name");
    grid._menuButton.setAttribute("aria-expanded", "false");
  }
  grid._menuButton = button;
  button.setAttribute("aria-expanded", "true");
  grid._menuField = column.field;
  const anchor = `--${menu.id}`;
  button.style.setProperty("anchor-name", anchor);
  menu.style.setProperty("position-anchor", anchor);
  fillMenu(grid);
  if (!menu.matches(":popover-open"))
    menu.showPopover();
  if (!anchorPositioning) {
    const box = button.getBoundingClientRect();
    menu.style.top = `${Math.min(box.bottom + 4, innerHeight - menu.offsetHeight - 8)}px`;
    menu.style.left = `${Math.max(8, Math.min(box.right - menu.offsetWidth, innerWidth - menu.offsetWidth - 8))}px`;
  }
  menuItems(grid)[0]?.focus({ preventScroll: true });
}
function onMenuClick(grid, e) {
  const item = e.target.closest(".data-grid-menu-item");
  const column = grid._columns.find((c) => c.field === grid._menuField);
  if (!item || item.disabled || !column)
    return;
  const action = item.dataset.action;
  if (action === "asc" || action === "desc") {
    query2(grid, { sorters: [{ field: column.sortField, direction: action }], page: 0 });
    grid._menu.hidePopover();
    return;
  }
  if (action === "reset") {
    resetColumns(grid);
    grid._menu.hidePopover();
    return;
  }
  if (action === "lock")
    setLocked(grid, column.field, item.getAttribute("aria-checked") !== "true");
  if (action === "show") {
    const hide = item.getAttribute("aria-checked") === "true";
    setHidden(grid, item.dataset.field, hide);
    if (hide && item.dataset.field === column.field) {
      grid._menu.hidePopover();
      return;
    }
  }
  fillMenu(grid);
  const again = menuItems(grid).find((b) => b.dataset.action === action && (b.dataset.field ?? "") === (item.dataset.field ?? ""));
  again?.focus({ preventScroll: true });
}
function onMenuKey(grid, e) {
  const items = menuItems(grid);
  const at = items.indexOf(document.activeElement);
  let next = -1;
  if (e.key === "ArrowDown")
    next = (at + 1) % items.length;
  else if (e.key === "ArrowUp")
    next = (at - 1 + items.length) % items.length;
  else if (e.key === "Home")
    next = 0;
  else if (e.key === "End")
    next = items.length - 1;
  else if (e.key === "Tab") {
    e.preventDefault();
    grid._menu.hidePopover();
    return;
  } else
    return;
  e.preventDefault();
  items[next]?.focus({ preventScroll: true });
}
var isRtl = (grid) => getComputedStyle(grid).direction === "rtl";
function onPointerDown(grid, e) {
  if (e.button !== 0 || !e.isPrimary)
    return;
  const t = e.target;
  const header = t.closest(".data-grid-header");
  if (!header || !grid._parts.head.contains(header))
    return;
  const column = grid._columns.find((c) => c.el === header);
  if (!column)
    return;
  const menuButton = t.closest(".data-grid-menu-button");
  if (menuButton) {
    grid._menuClosedBy = grid._menu?.matches(":popover-open") && grid._menuButton === menuButton ? menuButton : null;
    return;
  }
  const handle = t.closest(".data-grid-resizer");
  if (handle) {
    if (!column.resizable)
      return;
    e.preventDefault();
    try {
      handle.setPointerCapture(e.pointerId);
    } catch {}
    grid._press = {
      id: e.pointerId,
      column,
      x: e.clientX,
      resize: true,
      handle,
      start: header.getBoundingClientRect().width,
      width: 0,
      rtl: isRtl(grid)
    };
    handle.setAttribute("data-active", "");
    grid.setAttribute("data-resizing", "");
    return;
  }
  const press = {
    id: e.pointerId,
    column,
    x: e.clientX,
    y: e.clientY,
    touch: e.pointerType === "touch",
    long: false,
    dragging: false,
    timer: 0,
    gap: -1,
    tx: 0,
    lastX: e.clientX,
    edge: 0
  };
  grid._press = press;
  if (press.touch)
    press.timer = setTimeout(() => {
      press.long = true;
      header.setAttribute("data-pressed", "");
      if (navigator.userActivation?.hasBeenActive)
        navigator.vibrate?.(10);
    }, LONG_PRESS_MS);
}
function onPointerMove(grid, e) {
  const press = grid._press;
  if (!press || e.pointerId !== press.id)
    return;
  if (!press.touch && !press.dragging && !press.resize && !e.buttons) {
    endPress(grid);
    return;
  }
  if (press.resize) {
    const dx = (e.clientX - press.x) * (press.rtl ? -1 : 1);
    press.width = Math.max(MIN_WIDTH, Math.round(press.start + dx));
    if (!press.frame)
      press.frame = requestAnimationFrame(() => {
        press.frame = 0;
        showWidths(grid, { ...configOf2(grid).widths, [press.column.field]: press.width });
      });
    return;
  }
  const dx = e.clientX - press.x;
  const dy = e.clientY - press.y;
  if (!press.dragging) {
    if (press.touch && !press.long) {
      if (Math.hypot(dx, dy) > TOUCH_SLOP)
        endPress(grid);
      return;
    }
    if (Math.abs(dx) < DRAG_SLOP || !press.column.movable)
      return;
    beginDrag(grid, e);
  }
  press.lastX = e.clientX;
  dragTo(grid);
}
function showWidths(grid, widths) {
  const config = { ...configOf2(grid), widths };
  layoutColumns(grid, config);
  syncFilters(grid, config);
  grid._gen++;
  renderRows2(grid);
}
function beginDrag(grid, e) {
  const press = grid._press;
  const header = press.column.el;
  press.dragging = true;
  press.grab = e.clientX - header.getBoundingClientRect().left;
  try {
    header.setPointerCapture(e.pointerId);
  } catch {}
  if (grid._menu?.matches(":popover-open"))
    grid._menu.hidePopover();
  header.setAttribute("data-dragging", "");
  grid.setAttribute("data-dragging", "");
  const marker = document.createElement("div");
  marker.className = "data-grid-drop-marker";
  marker.setAttribute("aria-hidden", "true");
  dfDollar3(grid._parts.head).append(marker);
  press.marker = marker;
}
function dragTo(grid) {
  const press = grid._press;
  if (!press?.dragging)
    return;
  const header = press.column.el;
  const rtl = isRtl(grid);
  const rects = grid._order.map((c) => {
    const r = c.el.getBoundingClientRect();
    return c === press.column ? { left: r.left - press.tx, right: r.right - press.tx, width: r.width } : r;
  });
  const own = rects[grid._order.indexOf(press.column)];
  press.tx = press.lastX - press.grab - own.left;
  header.style.translate = `${press.tx}px 0`;
  const mid = (r) => r.left + r.width / 2;
  let gap = rects.filter((r) => rtl ? mid(r) > press.lastX : mid(r) < press.lastX).length;
  gap = Math.max(0, Math.min(rects.length, gap));
  press.gap = gap;
  const head = grid._parts.head.getBoundingClientRect();
  const edge = gap < rects.length ? rtl ? rects[gap].right : rects[gap].left : rtl ? rects[gap - 1].left : rects[gap - 1].right;
  press.marker.style.left = `${edge - head.left}px`;
  const from = grid._order.indexOf(press.column);
  press.marker.hidden = gap === from || gap === from + 1;
  const view = grid._parts.viewport.getBoundingClientRect();
  press.edge = press.lastX < view.left + 32 ? -1 : press.lastX > view.right - 32 ? 1 : 0;
  if (press.edge && !press.scrolling) {
    press.scrolling = true;
    const step = () => {
      if (grid._press !== press || !press.edge) {
        press.scrolling = false;
        return;
      }
      grid._parts.viewport.scrollLeft += press.edge * 12;
      dragTo(grid);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}
function onPointerUp(grid, e) {
  const press = grid._press;
  if (!press || e.pointerId !== press.id)
    return;
  if (press.resize) {
    if (press.width)
      query2(grid, { widths: { ...configOf2(grid).widths, [press.column.field]: press.width } });
    endPress(grid, true);
    return;
  }
  if (press.dragging) {
    const { column, gap } = press;
    endPress(grid, true);
    if (gap >= 0)
      dropColumn(grid, column.field, gap);
    focusCell(grid, -1, grid._order.indexOf(column));
    return;
  }
  const long = press.long;
  endPress(grid, long);
  if (long)
    openMenu(grid, press.column);
}
function endPress(grid, swallowClick = false) {
  const press = grid._press;
  if (!press)
    return;
  grid._press = null;
  clearTimeout(press.timer);
  cancelAnimationFrame(press.frame);
  press.column.el.removeAttribute("data-pressed");
  press.column.el.removeAttribute("data-dragging");
  press.column.el.style.removeProperty("translate");
  press.marker?.remove();
  press.handle?.removeAttribute("data-active");
  grid.removeAttribute("data-dragging");
  grid.removeAttribute("data-resizing");
  if (swallowClick) {
    grid._suppressClick = true;
    setTimeout(() => {
      grid._suppressClick = false;
    });
  }
}
var resolve2 = (target) => typeof target === "string" ? dfDollar3(target).get(0) : target;
df$3.dataGrid = {
  setSource(target, rows, options = {}) {
    const grid = resolve2(target);
    grid._sourceOptions = options;
    const parentIdField = options.parentIdField || grid.dataset.parentField;
    const idField = options.idField || grid.dataset.idField || "id";
    grid._source = dataSource3(rows, { idField, tree: parentIdField ? { idField, parentIdField } : undefined });
    grid._cells = options.cells || null;
    grid._load = options.load || null;
    grid._exhausted = false;
    grid.setAttribute("role", parentIdField ? "treegrid" : "grid");
    if (!grid.store)
      return;
    if (grid._parts.filters)
      grid._parts.filters._key = "";
    const patch = { ...options.query, ...options.persist ? attachPersistence2(grid, options.persist) : {} };
    if (grid._load && !rows.length) {
      dataGridApi.setState(grid, "loading", { ...patch, page: 0 });
      onNearEnd(grid, true);
      return;
    }
    dataGridApi.setState(grid, "default", patch);
  },
  query: (target, patch) => {
    query2(resolve2(target), patch);
  },
  rows: (target) => (resolve2(target)._result?.entries ?? []).map((e) => e.row),
  source: (target) => resolve2(target)._source,
  selected(target) {
    const grid = resolve2(target);
    const ids = grid._selected ?? new Set;
    return (grid._source?.rows ?? []).filter((r) => ids.has(r[grid._source.idField]));
  },
  selectAll: (target) => selectAll(resolve2(target)),
  clearSelection: (target) => {
    query2(resolve2(target), { selected: [] });
  },
  expandAll(target) {
    const grid = resolve2(target);
    query2(grid, { expanded: grid._source.branchIds(), collapsed: [] });
  },
  collapseAll(target) {
    const grid = resolve2(target);
    const filtering = (configOf2(grid).filters || []).length > 0;
    query2(grid, filtering ? { collapsed: grid._source.branchIds() } : { expanded: [] });
  },
  resetColumns: (target) => resetColumns(resolve2(target)),
  edit(target, id, field) {
    const grid = resolve2(target);
    const row = grid._shown.findIndex((x) => x.row[grid._source.idField] === id);
    const col = grid._order.findIndex((c) => c.field === field);
    if (row < 0 || col < 0)
      return false;
    focusCell(grid, row, col);
    return openEdit(grid, row, col);
  },
  commit: (target) => commitEdit(resolve2(target)),
  cancel: (target) => cancelEdit(resolve2(target)),
  update(target, id, patch) {
    const grid = resolve2(target);
    const old = grid._source.rows.find((r) => r[grid._source.idField] === id);
    if (!old)
      return null;
    const record = writeRecord(grid, id, patch);
    for (const field of Object.keys(patch))
      grid.dispatchEvent(new CustomEvent("data-grid-edit", {
        bubbles: true,
        detail: { record, field, value: patch[field], oldValue: old[field] }
      }));
    return record;
  }
};
function init3() {
  dfDollar3(".data-grid:not([data-init])").toArray().forEach((grid) => {
    grid.dataset.init = "";
    const viewport = dfDollar3(grid).children(".data-grid-viewport").get(0);
    const head = viewport && dfDollar3(viewport).children(".data-grid-head").get(0);
    const body = viewport && dfDollar3(viewport).children(".data-grid-body").get(0);
    if (!viewport || !head || !body)
      return;
    let footer = dfDollar3(grid).children(".data-grid-footer").get(0);
    if (!footer) {
      footer = document.createElement("div");
      footer.className = "data-grid-footer";
      dfDollar3(grid).append(footer);
    }
    body.dataset.emptyText = grid.dataset.emptyText || "No rows match.";
    const pool = document.createElement("div");
    pool.className = "data-grid-rows";
    pool.setAttribute("role", "presentation");
    dfDollar3(body).append(pool);
    grid._parts = { viewport, head, body, pool, footer };
    grid._columns = readColumns(grid);
    grid._order = grid._columns;
    grid._shown = [];
    grid._focus = { row: 0, col: 0 };
    grid._selected = new Set;
    grid._rowHeight = parseFloat(getComputedStyle(grid).getPropertyValue("--data-grid-row-height")) || 36;
    if (!grid.hasAttribute("role"))
      grid.setAttribute("role", grid.dataset.parentField ? "treegrid" : "grid");
    if (grid.dataset.select === "multiple")
      grid.setAttribute("aria-multiselectable", "true");
    for (const column of grid._columns) {
      column.el.setAttribute("role", "columnheader");
      column.el.tabIndex = -1;
    }
    buildHeaderTools(grid);
    buildFilters(grid);
    const early = grid._sourceOptions || {};
    const config = {
      filters: [],
      sorters: authoredSort(grid),
      locked: grid._columns.filter((c) => c.lockedAtStart).map((c) => c.field),
      columns: grid._columns.map((c) => c.field),
      hidden: grid._columns.filter((c) => c.hiddenAtStart).map((c) => c.field),
      widths: {},
      page: 0,
      expanded: [],
      collapsed: [],
      selected: [],
      ...early.query,
      ...attachPersistence2(grid, early.persist)
    };
    let queued = false;
    viewport.addEventListener("scroll", () => {
      if (queued)
        return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        renderRows2(grid);
        onNearEnd(grid);
      });
    }, { passive: true });
    new ResizeObserver(() => {
      if (!grid._order)
        return;
      layoutColumns(grid, configOf2(grid));
      grid._gen++;
      renderRows2(grid);
    }).observe(grid);
    grid.addEventListener("click", (e) => onClick2(grid, e));
    head.addEventListener("pointerdown", (e) => onPointerDown(grid, e));
    grid.addEventListener("pointermove", (e) => onPointerMove(grid, e));
    grid.addEventListener("pointerup", (e) => onPointerUp(grid, e));
    grid.addEventListener("pointercancel", () => endPress(grid));
    head.addEventListener("touchmove", (e) => {
      if (grid._press && (grid._press.long || grid._press.dragging || grid._press.resize))
        e.preventDefault();
    }, { passive: false });
    head.addEventListener("contextmenu", (e) => {
      const header = e.target.closest(".data-grid-header");
      const column = grid._columns.find((c) => c.el === header);
      if (!column)
        return;
      e.preventDefault();
      if (grid._press?.touch)
        grid._press.long = true;
      else
        openMenu(grid, column);
    });
    grid.addEventListener("dblclick", (e) => {
      const cell = e.target.closest(".data-grid-cell");
      const rowEl = cell?.closest(".data-grid-row");
      if (cell && rowEl && grid._parts.pool.contains(rowEl) && !cell.hasAttribute("data-editing")) {
        if (openEdit(grid, rowEl._index, [...rowEl.children].indexOf(cell)))
          e.preventDefault();
        return;
      }
      const handle = e.target.closest(".data-grid-resizer");
      if (!handle)
        return;
      const field = handle.dataset.field ?? "";
      const { [field]: _dropped, ...widths } = configOf2(grid).widths || {};
      query2(grid, { widths });
    });
    grid.addEventListener("keydown", (e) => onKeydown2(grid, e));
    grid.addEventListener("input", (e) => onFilterInput(grid, e));
    grid.addEventListener("change", (e) => onFilterInput(grid, e));
    grid.addEventListener("focusin", (e) => {
      if (e.target === grid)
        focusCell(grid, grid._focus.row, grid._focus.col);
    });
    bindComponent3(grid, dataGridApi, { name: grid._source ? "default" : "loading", config });
    dataGridApi.setState(grid, grid._source && !(grid._load && !grid._source.rows.length) ? "default" : "loading", config);
    if (grid._load && !grid._source.rows.length)
      onNearEnd(grid, true);
  });
}
init3();
new MutationObserver(init3).observe(document, { childList: true, subtree: true });

// dist/components/autocomplete/autocomplete.js
var __df$core4 = globalThis.df$;
var __df$shared4 = __df$core4 && __df$core4.shadcn && __df$core4.shadcn.shared;
if (!__df$shared4 || __df$shared4.abi !== "0.9.17") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals4, defussQuery: defussQuery4, componentState: componentState4, bindComponent: bindComponent4, dataSource: dataSource4, safeShowPopover, textLocale: textLocale2 } = __df$shared4;
var df$4 = defussGlobals4();
var dfDollar4 = defussQuery4();
var autocompleteStates = ["default", "open", "loading", "empty", "error"];
var SHOWN = new Set(["open", "loading", "empty", "error"]);
var uid2 = 0;
var num = (v, fallback) => Number.isFinite(Number(v)) && v !== "" && v != null ? Number(v) : fallback;
var inputOf = (root) => dfDollar4(root).find(".autocomplete-input").get(0);
var popoverOf = (root) => dfDollar4(root).find(".autocomplete-popover").get(0);
var listOf = (root) => dfDollar4(root).find(".autocomplete-list").get(0);
function applyMarkup4(root, state) {
  dfDollar4(root).attr("data-state", state.name);
  const input = inputOf(root);
  if (input) {
    dfDollar4(input).attr("aria-expanded", SHOWN.has(state.name) ? "true" : "false").attr("aria-busy", state.name === "loading" ? "true" : null);
  }
}
function configOf3(root) {
  const d = root.dataset;
  const [sortField, sortDir] = (d.sort || "").split(":");
  const base = {
    debounce: num(d.debounce, 200),
    minChars: num(d.minChars, 1),
    pageSize: num(d.pageSize, 20),
    url: d.url || null,
    labelField: d.labelField || "label",
    valueField: d.valueField || "id",
    searchField: d.searchField || null,
    match: d.match === "startsWith" ? "startsWith" : "contains",
    sorters: sortField ? [{ field: sortField, direction: sortDir === "desc" ? "desc" : "asc" }] : [],
    filters: []
  };
  return { ...base, ...root._config };
}
var labelOf2 = (cfg, record) => typeof cfg.label === "function" ? cfg.label(record) : String(record?.[cfg.labelField] ?? "");
var valueOf = (cfg, record) => typeof cfg.value === "function" ? cfg.value(record) : record?.[cfg.valueField];
function requestFor(cfg, query, page) {
  const field = cfg.searchField || cfg.labelField;
  return {
    query,
    filters: [...cfg.filters || [], ...query ? [{ field, op: cfg.match, value: query }] : []],
    sorters: cfg.sorters || [],
    page,
    pageSize: cfg.pageSize
  };
}
function normalize(answer, request) {
  const raw = Array.isArray(answer) ? { rows: answer } : answer || {};
  const rows = raw.rows ?? raw.items ?? raw.data ?? raw.results ?? [];
  const total = Number.isFinite(raw.total) ? raw.total : undefined;
  const hasMore = typeof raw.hasMore === "boolean" ? raw.hasMore : total !== undefined ? (request.page + 1) * request.pageSize < total : rows.length >= request.pageSize;
  return { rows, hasMore, total };
}
async function networkLoad(cfg, request, signal) {
  const client = cfg.client || {};
  let url;
  if (typeof cfg.url === "function")
    url = cfg.url(request);
  else {
    const params = new URLSearchParams({
      q: request.query,
      page: String(request.page),
      pageSize: String(request.pageSize)
    });
    if (request.sorters[0])
      params.set("sort", `${request.sorters[0].field}:${request.sorters[0].direction || "asc"}`);
    url = `${cfg.url}${String(cfg.url).includes("?") ? "&" : "?"}${params}`;
  }
  const doFetch = client.fetch || globalThis.fetch.bind(globalThis);
  const response = await doFetch(url, { signal, headers: { accept: "application/json", ...client.headers } });
  if (!response.ok)
    throw new Error(`${response.status} ${response.statusText || "request failed"}`.trim());
  const json = await response.json();
  return client.parse ? client.parse(json, request) : json;
}
function localLoad(root, cfg, request) {
  if (!root._source || root._source.rows !== cfg.rows)
    root._source = dataSource4(cfg.rows, { idField: cfg.valueField });
  const entries = root._source.query({ filters: request.filters, sorters: request.sorters }).entries;
  const start = request.page * request.pageSize;
  return { rows: entries.slice(start, start + request.pageSize).map((e) => e.row), total: entries.length };
}
function runLoad(root, cfg, request, signal) {
  if (typeof cfg.load === "function")
    return cfg.load(request, { signal });
  if (Array.isArray(cfg.rows))
    return localLoad(root, cfg, request);
  if (cfg.url)
    return networkLoad(cfg, request, signal);
  throw new Error("autocomplete: no data - configure rows, url or load");
}
function markMatch(el, label, query) {
  el.textContent = "";
  const at = query ? label.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (at < 0) {
    el.append(label);
    return;
  }
  const mark = document.createElement("mark");
  mark.className = "autocomplete-match";
  mark.textContent = label.slice(at, at + query.length);
  el.append(label.slice(0, at), mark, label.slice(at + query.length));
}
function appendOptions(root, rows) {
  const cfg = configOf3(root);
  const list = listOf(root);
  const query = root._run.query;
  for (const record of rows) {
    const index = root._run.records.length;
    root._run.records.push(record);
    const option = document.createElement("div");
    option.className = "autocomplete-option";
    option.setAttribute("role", "option");
    option.id = `${root._uid}-opt-${index}`;
    option.dataset.index = String(index);
    option.setAttribute("aria-selected", "false");
    if (cfg.render)
      cfg.render(option, record, { query, index });
    else {
      const label = document.createElement("span");
      label.className = "autocomplete-label";
      markMatch(label, labelOf2(cfg, record), query);
      option.append(label);
    }
    list.append(option);
  }
}
function setStatus(root, text) {
  const status = dfDollar4(root).find(".autocomplete-status").get(0);
  if (status)
    status.textContent = text;
}
function describe(root) {
  const run = root._run;
  const n = run.records.length;
  if (!n)
    return;
  const num = (v) => v.toLocaleString(textLocale2(root));
  const total = run.total !== undefined ? ` of ${num(run.total)}` : "";
  setStatus(root, run.loadingMore ? `${num(n)}${total} · loading more…` : `${num(n)}${total}${run.hasMore ? " · scroll for more" : ""}`);
}
function activate2(root, index) {
  const run = root._run;
  const n = run.records.length;
  if (!n)
    return;
  run.active = Math.max(0, Math.min(n - 1, index));
  const input = inputOf(root);
  for (const option of dfDollar4(listOf(root)).children(".autocomplete-option").toArray()) {
    const on = Number(option.dataset.index) === run.active;
    option.toggleAttribute("data-active", on);
    if (on) {
      input.setAttribute("aria-activedescendant", option.id);
      option.scrollIntoView({ block: "nearest" });
    }
  }
  if (run.active >= n - 3)
    loadMore(root);
}
function abort(root) {
  root._controller?.abort();
  root._controller = null;
  clearTimeout(root._timer);
}
async function search(root, query) {
  abort(root);
  const cfg = configOf3(root);
  const input = inputOf(root);
  root._run = {
    query,
    records: [],
    page: 0,
    hasMore: false,
    total: undefined,
    active: -1,
    loadingMore: false,
    seq: (root._run?.seq || 0) + 1
  };
  listOf(root).textContent = "";
  input.removeAttribute("aria-activedescendant");
  if (query.length < cfg.minChars) {
    autocompleteApi.setState(root, "default");
    return;
  }
  setStatus(root, "Searching…");
  autocompleteApi.setState(root, "loading");
  await fetchPage(root, 0);
}
async function fetchPage(root, page) {
  const cfg = configOf3(root);
  const run = root._run;
  const seq = run.seq;
  const controller = new AbortController;
  root._controller = controller;
  const request = requestFor(cfg, run.query, page);
  root.dispatchEvent(new CustomEvent("autocomplete-request", { bubbles: true, detail: { request } }));
  try {
    const answer = normalize(await runLoad(root, cfg, request, controller.signal), request);
    if (controller.signal.aborted || seq !== root._run.seq)
      return;
    run.page = page;
    run.hasMore = answer.hasMore;
    run.total = answer.total;
    run.loadingMore = false;
    appendOptions(root, answer.rows);
    if (!run.records.length) {
      setStatus(root, "");
      autocompleteApi.setState(root, "empty");
      return;
    }
    describe(root);
    if (root.store.value.name !== "open")
      autocompleteApi.setState(root, "open");
    if (run.active < 0)
      activate2(root, 0);
    const list = listOf(root);
    if (run.hasMore && list.scrollHeight <= list.clientHeight)
      loadMore(root);
  } catch (error) {
    if (controller.signal.aborted || error?.name === "AbortError" || seq !== root._run.seq)
      return;
    run.loadingMore = false;
    root._error = error;
    if (run.records.length) {
      setStatus(root, `Could not load more - ${error?.message || error}`);
      return;
    }
    setStatus(root, "");
    autocompleteApi.setState(root, "error", { message: String(error?.message || error) });
  } finally {
    if (root._controller === controller)
      root._controller = null;
  }
}
function loadMore(root) {
  const run = root._run;
  if (!run || !run.hasMore || run.loadingMore || root._controller)
    return;
  run.loadingMore = true;
  describe(root);
  fetchPage(root, run.page + 1);
}
function choose(root, index) {
  const record = root._run?.records[index];
  if (!record)
    return;
  const cfg = configOf3(root);
  const label = labelOf2(cfg, record);
  const value = valueOf(cfg, record);
  inputOf(root).value = label;
  const hidden = dfDollar4(root).find(".autocomplete-value").get(0);
  if (hidden)
    hidden.value = value == null ? "" : String(value);
  abort(root);
  autocompleteApi.setState(root, "default", { query: label, value: value ?? null, label });
  root.dispatchEvent(new CustomEvent("autocomplete-select", {
    bubbles: true,
    detail: { record, value, label }
  }));
}
function triggerStateChange4(root, state, incoming) {
  const popover = popoverOf(root);
  applyMarkup4(root, state);
  if (popover) {
    if (SHOWN.has(state.name)) {
      if (!popover.matches(":popover-open"))
        safeShowPopover(popover);
    } else if (popover.matches(":popover-open")) {
      try {
        popover.hidePopover();
      } catch {}
    }
  }
  if (state.name === "default") {
    abort(root);
    inputOf(root)?.removeAttribute("aria-activedescendant");
  }
  if (state.name === "error")
    setStatus(root, "");
  const message = dfDollar4(root).find(".autocomplete-error-text").get(0);
  if (message)
    message.textContent = state.name === "error" ? String(state.config.message || "Something went wrong.") : "";
  const typed = inputOf(root)?.value.trim() ?? "";
  if (state.name === "open" && incoming.query === undefined && !root._run?.records.length && typed) {
    queueMicrotask(() => search(root, typed));
  }
  if (typeof incoming.query === "string" && SHOWN.has(state.name) && incoming.query !== root._run?.query) {
    inputOf(root).value = incoming.query;
    queueMicrotask(() => search(root, incoming.query));
  }
}
var autocompleteApi = componentState4({
  component: "autocomplete",
  states: autocompleteStates,
  mergeConfig: true,
  apply: (root, state, _previous, incoming) => triggerStateChange4(root, state, incoming),
  markup: (el, state) => applyMarkup4(el, state)
});
df$4.autocompleteApi = autocompleteApi;
df$4.autocompleteStates = autocompleteStates;
var resolve3 = (target) => typeof target === "string" ? dfDollar4(target).get(0) : target;
df$4.autocomplete = {
  configure(target, config = {}) {
    const root = resolve3(target);
    root._config = { ...root._config, ...config };
    if (config.labelField)
      root._config.labelField = config.labelField;
    root._source = null;
  },
  search: (target, query) => {
    const root = resolve3(target);
    inputOf(root).value = query;
    return search(root, query);
  },
  close: (target) => {
    autocompleteApi.setState(resolve3(target), "default");
  },
  records: (target) => [...resolve3(target)._run?.records ?? []]
};
function init4() {
  dfDollar4(".autocomplete:not([data-init])").toArray().forEach((root) => {
    root.dataset.init = "";
    const input = inputOf(root);
    if (!input)
      return;
    root._uid = root.id || `autocomplete-${++uid2}`;
    let popover = popoverOf(root);
    if (!popover) {
      popover = document.createElement("div");
      popover.className = "autocomplete-popover";
      dfDollar4(root).append(popover);
    }
    popover.setAttribute("popover", "manual");
    if (!popover.id)
      popover.id = `${root._uid}-popover`;
    let list = listOf(root);
    if (!list) {
      list = document.createElement("div");
      list.className = "autocomplete-list";
      dfDollar4(popover).append(list);
    }
    list.setAttribute("role", "listbox");
    if (!list.id)
      list.id = `${root._uid}-list`;
    if (!list.hasAttribute("aria-label") && !list.hasAttribute("aria-labelledby"))
      list.setAttribute("aria-label", input.getAttribute("aria-label") || "Suggestions");
    if (!dfDollar4(popover).find(".autocomplete-status").get(0)) {
      const status = document.createElement("div");
      status.className = "autocomplete-status";
      status.setAttribute("role", "status");
      dfDollar4(popover).append(status);
    }
    if (!dfDollar4(popover).find(".autocomplete-error").get(0)) {
      const error = document.createElement("div");
      error.className = "autocomplete-error";
      const text = document.createElement("span");
      text.className = "autocomplete-error-text";
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "autocomplete-retry";
      retry.textContent = "Retry";
      error.append(text, retry);
      dfDollar4(popover).append(error);
    }
    if (!dfDollar4(popover).find(".autocomplete-empty").get(0)) {
      const empty = document.createElement("div");
      empty.className = "autocomplete-empty";
      empty.textContent = root.dataset.emptyText || "No matches.";
      dfDollar4(popover).append(empty);
    }
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-controls", list.id);
    input.setAttribute("autocomplete", "off");
    if (!input.hasAttribute("aria-expanded"))
      input.setAttribute("aria-expanded", "false");
    const anchor = `--autocomplete-${root._uid}`;
    input.style.anchorName = anchor;
    popover.style.positionAnchor = anchor;
    root._run = { query: "", records: [], page: 0, hasMore: false, active: -1, seq: 0 };
    applyMarkup4(root, { name: "default" });
    input.addEventListener("input", () => {
      abort(root);
      const query = input.value.trim();
      const hidden = dfDollar4(root).find(".autocomplete-value").get(0);
      if (hidden)
        hidden.value = "";
      root._timer = setTimeout(() => search(root, query), configOf3(root).debounce);
    });
    input.addEventListener("keydown", (e) => {
      const name = root.store.value.name;
      const run = root._run;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (name === "default")
            search(root, input.value.trim());
          else
            activate2(root, run.active + 1);
          break;
        case "ArrowUp":
          e.preventDefault();
          if (name !== "default")
            activate2(root, run.active - 1);
          break;
        case "PageDown":
          if (name !== "default") {
            e.preventDefault();
            activate2(root, run.active + 10);
          }
          break;
        case "PageUp":
          if (name !== "default") {
            e.preventDefault();
            activate2(root, run.active - 10);
          }
          break;
        case "Enter":
          if (name === "open" && run.active >= 0) {
            e.preventDefault();
            choose(root, run.active);
          }
          break;
        case "Escape":
          if (name !== "default")
            autocompleteApi.setState(root, "default");
          else if (input.value) {
            input.value = "";
            input.dispatchEvent(new Event("input", { bubbles: true }));
          }
          e.preventDefault();
          break;
        case "Tab":
          if (name !== "default")
            autocompleteApi.setState(root, "default");
          break;
      }
    });
    list.addEventListener("pointerdown", (e) => {
      const option = e.target.closest?.(".autocomplete-option");
      if (!option)
        return;
      e.preventDefault();
      choose(root, Number(option.dataset.index));
    });
    list.addEventListener("pointermove", (e) => {
      const option = e.target.closest?.(".autocomplete-option");
      if (option && Number(option.dataset.index) !== root._run.active)
        activate2(root, Number(option.dataset.index));
    });
    list.addEventListener("scroll", () => {
      if (list.scrollTop + list.clientHeight >= list.scrollHeight - 48)
        loadMore(root);
    }, { passive: true });
    popover.addEventListener("click", (e) => {
      if (e.target.closest?.(".autocomplete-retry"))
        search(root, root._run.query);
    });
    root.addEventListener("focusout", (e) => {
      if (e.relatedTarget && root.contains(e.relatedTarget))
        return;
      if (root.store.value.name !== "default")
        autocompleteApi.setState(root, "default");
    });
    bindComponent4(root, autocompleteApi, { name: "default", config: { query: "", value: null, label: "" } });
  });
}
init4();
new MutationObserver(init4).observe(document, { childList: true, subtree: true });

//# debugId=355B4FBCD343A6EC64756E2164756E21
//# sourceMappingURL=big-data.js.map
