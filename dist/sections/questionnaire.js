// dist/components/questionnaire/questionnaire.js
var __df$core = globalThis.df$;
var __df$shared = __df$core && __df$core.shadcn && __df$core.shadcn.shared;
if (!__df$shared || __df$shared.abi !== "0.9.5") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals, defussQuery, componentState, bindComponent, persisted, viewPersistence } = __df$shared;
var df$ = defussGlobals();
var dfDollar = defussQuery();
var questionnaireStates = ["default", "answering", "review", "submitted"];
var LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
var stepsOf = (root) => dfDollar(root).find(".questionnaire-step[data-step]").toArray();
var stepById = (root, id) => root._flow?.byId.get(id) ?? null;
var titleOf = (step) => (dfDollar(step).find(".questionnaire-title").get(0)?.textContent ?? step.dataset.step).trim();
var controlsOf = (step) => dfDollar(step).find("input[name], select[name], textarea[name]").toArray().filter((c) => c.type !== "hidden" || c.dataset.answer !== undefined);
var isEnd = (step) => !!step && step.hasAttribute("data-end");
function rulesOf(root) {
  let authored = {};
  const script = dfDollar(root).find("script.questionnaire-rules").get(0);
  if (script) {
    try {
      authored = JSON.parse(script.textContent || "{}");
    } catch (error) {
      console.warn(`questionnaire #${root.id}: the rules are not JSON -`, error);
    }
  }
  const config = root._config || {};
  return {
    branches: { ...authored.branches, ...config.branches },
    validate: { ...authored.validate, ...config.validate }
  };
}
function readFlow(root) {
  const steps = stepsOf(root);
  const byId = new Map(steps.map((s) => [s.dataset.step, s]));
  const blocks = [];
  for (const step of steps) {
    const block = step.closest(".questionnaire-block");
    const id = block?.dataset.block || "";
    if (!blocks.some((b) => b.id === id))
      blocks.push({ id, title: block?.dataset.title || "", el: block });
  }
  root._flow = { steps, byId, blocks, rules: rulesOf(root), start: root.dataset.start || steps[0]?.dataset.step };
}
var operand = (value, answers) => value && typeof value === "object" && !Array.isArray(value) && ("field" in value) ? answers[value.field] : value;
var lower = (v) => String(v ?? "").toLowerCase();
function compare(a, b) {
  const na = typeof a === "number" ? a : a === "" || a == null ? NaN : Number(a);
  const nb = typeof b === "number" ? b : b === "" || b == null ? NaN : Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb))
    return na - nb;
  const sa = String(a);
  const sb = String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}
var isEmpty = (v) => v === undefined || v === null || v === "" || Array.isArray(v) && v.length === 0;
function holds(cond, answers) {
  const v = answers[cond.field];
  const target = operand(cond.value, answers);
  switch (cond.op) {
    case "answered":
      return !isEmpty(v);
    case "empty":
      return isEmpty(v);
    case "neq":
      return Array.isArray(v) ? !v.includes(target) : lower(v) !== lower(target);
    case "gt":
      return !isEmpty(v) && !isEmpty(target) && compare(v, target) > 0;
    case "gte":
      return !isEmpty(v) && !isEmpty(target) && compare(v, target) >= 0;
    case "lt":
      return !isEmpty(v) && !isEmpty(target) && compare(v, target) < 0;
    case "lte":
      return !isEmpty(v) && !isEmpty(target) && compare(v, target) <= 0;
    case "in":
      return (Array.isArray(target) ? target : [target]).some((t) => Array.isArray(v) ? v.includes(t) : lower(v) === lower(t));
    case "includes":
      return Array.isArray(v) ? v.includes(target) : lower(v).includes(lower(target));
    case "contains":
      return lower(v).includes(lower(target));
    case "startsWith":
      return lower(v).startsWith(lower(target));
    case "endsWith":
      return lower(v).endsWith(lower(target));
    default:
      return Array.isArray(v) ? v.includes(target) : lower(v) === lower(target);
  }
}
function when(rule, answers) {
  const w = rule.when ?? [];
  if (Array.isArray(w))
    return w.every((c) => holds(c, answers));
  if (Array.isArray(w.any))
    return w.any.some((c) => holds(c, answers));
  if (Array.isArray(w.all))
    return w.all.every((c) => holds(c, answers));
  return holds(w, answers);
}
function gotoOf(step, answers) {
  for (const control of controlsOf(step)) {
    if ((control.type === "radio" || control.type === "checkbox") && control.dataset.goto) {
      const v = answers[control.name];
      if (Array.isArray(v) ? v.includes(control.value) : v === control.value || control.type === "checkbox" && v === true)
        return control.dataset.goto;
    }
    if (control.tagName === "SELECT") {
      const option = [...control.options].find((o) => o.value === answers[control.name] && o.dataset.goto);
      if (option)
        return option.dataset.goto;
    }
  }
  return null;
}
function nextOf(root, stepId, answers) {
  const step = stepById(root, stepId);
  if (!step || isEnd(step))
    return null;
  const picked = gotoOf(step, answers);
  if (picked)
    return picked;
  for (const rule of root._flow.rules.branches[stepId] ?? [])
    if (when(rule, answers))
      return rule.goto;
  return defaultNext(root, step);
}
function defaultNext(root, step) {
  if (step.dataset.next)
    return step.dataset.next;
  const steps = root._flow.steps;
  return steps[steps.indexOf(step) + 1]?.dataset.step ?? null;
}
function edgesOf(root, step) {
  const out = [];
  const seen = new Set;
  const add = (to, label, kind) => {
    if (!to || seen.has(to))
      return;
    seen.add(to);
    out.push({ to, label, kind });
  };
  if (isEnd(step))
    return out;
  let exhaustive = false;
  const radios = controlsOf(step).filter((c) => c.type === "radio");
  for (const c of controlsOf(step)) {
    if ((c.type === "radio" || c.type === "checkbox") && c.dataset.goto)
      add(c.dataset.goto, choiceText(c), "choice");
    if (c.tagName === "SELECT") {
      for (const o of c.options)
        if (o.dataset.goto)
          add(o.dataset.goto, o.textContent.trim(), "choice");
    }
  }
  if (radios.length && radios.every((r) => r.dataset.goto) && radios.some((r) => r.required))
    exhaustive = true;
  for (const rule of root._flow.rules.branches[step.dataset.step] ?? [])
    add(rule.goto, ruleText(rule), "rule");
  if (!exhaustive)
    add(defaultNext(root, step), "", "next");
  return out;
}
var ruleText = (rule) => {
  const w = rule.when ?? [];
  const list = Array.isArray(w) ? w : w.any ?? w.all ?? [w];
  return list.map((c) => `${c.field} ${c.op ?? "eq"}${c.value === undefined ? "" : " " + (typeof c.value === "object" && c.value && "field" in c.value ? c.value.field : JSON.stringify(c.value))}`).join(Array.isArray(w) || w.all ? " and " : " or ");
};
function choiceText(control) {
  const label = control.closest("label") || control.id && dfDollar(`label[for="${CSS.escape(control.id)}"]`).get(0);
  if (!label)
    return control.value;
  const own = dfDollar(label).find(".questionnaire-choice-label").get(0);
  return (own ?? label).textContent.trim() || control.getAttribute("aria-label") || control.value;
}
function reachable(root, answers, skipped) {
  const seen = new Set;
  const stack = [root._flow.start];
  while (stack.length) {
    const id = stack.pop();
    if (!id || seen.has(id))
      continue;
    seen.add(id);
    const step = stepById(root, id);
    if (!step || isEnd(step))
      continue;
    if (skipped.includes(id))
      stack.push(defaultNext(root, step));
    else if (answeredStep(step, answers))
      stack.push(nextOf(root, id, answers));
    else
      for (const e of edgesOf(root, step))
        stack.push(e.to);
  }
  return seen;
}
var answeredStep = (step, answers) => {
  const names = [...new Set(controlsOf(step).map((c) => c.name))];
  return names.length === 0 || names.some((n) => !isEmpty(answers[n]));
};
function readStep(step) {
  const out = {};
  const groups = new Map;
  for (const c of controlsOf(step)) {
    if (!groups.has(c.name))
      groups.set(c.name, []);
    groups.get(c.name).push(c);
  }
  for (const [name, list] of groups) {
    const first = list[0];
    let value;
    if (first.type === "radio")
      value = list.find((c) => c.checked)?.value ?? null;
    else if (first.type === "checkbox")
      value = list.length > 1 || first.dataset.multiple !== undefined ? list.filter((c) => c.checked).map((c) => c.value) : first.checked;
    else if (first.tagName === "SELECT" && first.multiple)
      value = [...first.selectedOptions].map((o) => o.value);
    else if (first.type === "number" || first.type === "range")
      value = first.value === "" ? null : Number(first.value);
    else
      value = first.value;
    out[name] = value;
  }
  return out;
}
function writeStep(step, answers) {
  for (const c of controlsOf(step)) {
    const v = answers[c.name];
    if (c.type === "radio")
      c.checked = v === c.value;
    else if (c.type === "checkbox")
      c.checked = Array.isArray(v) ? v.includes(c.value) : v === true;
    else if (c.tagName === "SELECT" && c.multiple)
      for (const o of c.options)
        o.selected = Array.isArray(v) && v.includes(o.value);
    else
      c.value = v == null ? "" : String(v);
  }
}
function mergeAnswers(answers, stepAnswers) {
  const next = { ...answers };
  for (const [k, v] of Object.entries(stepAnswers)) {
    if (isEmpty(v) || v === false)
      delete next[k];
    else
      next[k] = v;
  }
  return next;
}
function clearStep(step, answers) {
  const next = { ...answers };
  for (const c of controlsOf(step))
    delete next[c.name];
  writeStep(step, next);
  return next;
}
function invalidOf(root, step, answers) {
  for (const c of controlsOf(step)) {
    if (!c.checkValidity())
      return { control: c, message: c.validationMessage };
  }
  const boxes = controlsOf(step).filter((c) => c.type === "checkbox");
  const min = Number(step.dataset.min || 0);
  const max = Number(step.dataset.max || Infinity);
  if (boxes.length && (min || Number.isFinite(max))) {
    const n = boxes.filter((c) => c.checked).length;
    if (n < min)
      return { control: boxes[0], message: min === 1 ? "Choose at least one." : `Choose at least ${min}.` };
    if (n > max)
      return { control: boxes[0], message: `Choose at most ${max}.` };
  }
  const id = step.dataset.step;
  const rules = root._flow.rules.validate[id];
  if (Array.isArray(rules)) {
    for (const rule of rules) {
      const asserts = rule.assert ?? [];
      const ok = Array.isArray(asserts) ? asserts.every((c) => holds(c, answers)) : when({ when: asserts }, answers);
      if (!ok)
        return { control: rule.field ? controlsOf(step).find((c) => c.name === rule.field) : null, message: rule.message || "Check this answer." };
    }
  } else if (typeof rules === "function") {
    const message = rules(answers, readStep(step));
    if (message)
      return { control: null, message: String(message) };
  }
  return null;
}
function errorEl(step) {
  let el = dfDollar(step).find(".questionnaire-error").get(0);
  if (!el) {
    el = document.createElement("p");
    el.className = "questionnaire-error";
    el.id = `${step.closest(".questionnaire").id || "questionnaire"}-${step.dataset.step}-error`;
    el.setAttribute("role", "alert");
    el.hidden = true;
    dfDollar(step).append(el);
  }
  return el;
}
function showInvalid(step, problem) {
  const el = errorEl(step);
  el.textContent = problem.message;
  el.hidden = false;
  step.setAttribute("aria-invalid", "true");
  step.setAttribute("aria-describedby", el.id);
  const target = problem.control || controlsOf(step)[0];
  if (target) {
    target.setAttribute("aria-invalid", "true");
    target.focus({ preventScroll: false });
  }
}
function clearInvalid(step) {
  const el = dfDollar(step).find(".questionnaire-error").get(0);
  if (el) {
    el.hidden = true;
    el.textContent = "";
  }
  step.removeAttribute("aria-invalid");
  for (const c of controlsOf(step))
    c.removeAttribute("aria-invalid");
}
var cfgOf = (root) => root._walk;
function landed(root, walk) {
  if (walk.submitted)
    return "submitted";
  if (isEnd(stepById(root, walk.step)))
    return "review";
  return walk.index === 0 && walk.step === root._flow.start ? "default" : "answering";
}
function applyMarkup(root, state) {
  const config = state.config || {};
  const steps = stepsOf(root);
  const start = root.dataset.start || steps[0]?.dataset.step;
  let current = config.step || start;
  if (state.name === "default")
    current = start;
  if (state.name === "review" && !isEnd(steps.find((s) => s.dataset.step === current)))
    current = steps.find((s) => s.hasAttribute("data-end"))?.dataset.step ?? current;
  const submitted = state.name === "submitted";
  const step = steps.find((s) => s.dataset.step === current);
  for (const s of steps)
    dfDollar(s).attr("hidden", !submitted && s === step ? null : "");
  for (const block of dfDollar(root).find(".questionnaire-block").toArray()) {
    dfDollar(block).attr("hidden", !submitted && step && block.contains(step) ? null : "");
  }
  const button = (name) => dfDollar(root).find(`[data-questionnaire="${name}"]`).toArray();
  const end = isEnd(step);
  for (const b of button("back"))
    dfDollar(b).attr("hidden", submitted || state.name === "default" ? "" : null);
  for (const b of button("next"))
    dfDollar(b).attr("hidden", submitted || end ? "" : null);
  for (const b of button("submit"))
    dfDollar(b).attr("hidden", submitted || !end ? "" : null);
  for (const b of button("skip"))
    dfDollar(b).attr("hidden", submitted || !step?.hasAttribute("data-optional") ? "" : null);
  for (const n of dfDollar(root).find(".questionnaire-actions").toArray())
    dfDollar(n).attr("hidden", submitted ? "" : null);
  for (const c of dfDollar(root).find(".questionnaire-complete").toArray())
    dfDollar(c).attr("hidden", submitted ? null : "");
  dfDollar(root).attr("data-state", state.name);
}
function remainingFrom(root, id) {
  const queue = [[id, 0]];
  const seen = new Set([id]);
  while (queue.length) {
    const [at, d] = queue.shift();
    const step = stepById(root, at);
    if (!step || isEnd(step))
      return d;
    for (const e of edgesOf(root, step)) {
      if (!seen.has(e.to)) {
        seen.add(e.to);
        queue.push([e.to, d + 1]);
      }
    }
  }
  return 0;
}
function remainingBranches(root, id) {
  const seen = new Set;
  const stack = [id];
  while (stack.length) {
    const at = stack.pop();
    if (seen.has(at))
      continue;
    seen.add(at);
    const step = stepById(root, at);
    if (!step)
      continue;
    const out = edgesOf(root, step);
    if (out.length > 1)
      return true;
    for (const e of out)
      stack.push(e.to);
  }
  return false;
}
function renderProgress(root) {
  const host = dfDollar(root).find(".questionnaire-progress").get(0);
  if (!host)
    return;
  const walk = cfgOf(root);
  if (!host._built) {
    host._built = true;
    const bar = document.createElement("progress");
    bar.className = "questionnaire-bar";
    bar.max = 100;
    const label = document.createElement("span");
    label.className = "questionnaire-progress-label";
    const blocks = document.createElement("ol");
    blocks.className = "questionnaire-blocks";
    for (const b of root._flow.blocks) {
      if (!b.title)
        continue;
      const li = document.createElement("li");
      li.className = "questionnaire-block-chip";
      li.dataset.block = b.id;
      li.textContent = b.title;
      blocks.append(li);
    }
    host.append(label, bar);
    if (blocks.children.length)
      host.append(blocks);
  }
  const done = walk.submitted ? walk.history.length : walk.index;
  const remaining = walk.submitted ? 0 : remainingFrom(root, walk.step);
  const endNow = isEnd(stepById(root, walk.step));
  const total = Math.max(1, done + remaining);
  const percent = walk.submitted || endNow ? 100 : Math.round(done / total * 100);
  const bar = dfDollar(host).find(".questionnaire-bar").get(0);
  bar.value = percent;
  bar.setAttribute("aria-label", `${percent}% done`);
  const label = dfDollar(host).find(".questionnaire-progress-label").get(0);
  const branchy = remainingBranches(root, walk.step);
  label.textContent = walk.submitted ? "Done" : endNow ? "Review your answers" : `Question ${done + 1} of ${branchy ? "about " : ""}${total}`;
  const currentBlock = stepById(root, walk.step)?.closest(".questionnaire-block")?.dataset.block;
  const visitedBlocks = new Set(walk.history.slice(0, walk.index).map((id) => stepById(root, id)?.closest(".questionnaire-block")?.dataset.block));
  for (const chip of dfDollar(host).find(".questionnaire-block-chip").toArray()) {
    const id = chip.dataset.block;
    const status = walk.submitted ? "done" : id === currentBlock ? "current" : visitedBlocks.has(id) ? "done" : "upcoming";
    chip.dataset.status = status;
    if (status === "current")
      chip.setAttribute("aria-current", "step");
    else
      chip.removeAttribute("aria-current");
  }
}
function renderTrail(root) {
  const host = dfDollar(root).find(".questionnaire-trail").get(0) || root.id && dfDollar(`.questionnaire-trail[data-for="${CSS.escape(root.id)}"]`).get(0);
  if (!host)
    return;
  if (!root.contains(host) && !host._wired) {
    host._wired = true;
    host.addEventListener("click", (e) => {
      const go = e.target.closest?.("[data-questionnaire-go]")?.dataset.questionnaireGo;
      if (go)
        goTo(root, go);
    });
  }
  const walk = cfgOf(root);
  host.textContent = "";
  const list = document.createElement("ol");
  list.className = "questionnaire-trail-list";
  walk.history.forEach((id, i) => {
    const step = stepById(root, id);
    if (!step || isEnd(step))
      return;
    const li = document.createElement("li");
    li.dataset.status = i < walk.index ? "done" : i === walk.index ? "current" : "ahead";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "questionnaire-trail-item";
    button.dataset.questionnaireGo = id;
    if (i === walk.index)
      button.setAttribute("aria-current", "step");
    const q = document.createElement("span");
    q.className = "questionnaire-trail-question";
    q.textContent = titleOf(step);
    const a = document.createElement("span");
    a.className = "questionnaire-trail-answer";
    a.textContent = answerText(root, step, walk.answers) || (walk.skipped.includes(id) ? "Skipped" : "—");
    button.append(q, a);
    li.append(button);
    list.append(li);
  });
  host.append(list);
}
function answerText(root, step, answers) {
  const parts = [];
  const names = [...new Set(controlsOf(step).map((c) => c.name))];
  for (const name of names) {
    const v = answers[name];
    if (isEmpty(v))
      continue;
    const controls = controlsOf(step).filter((c) => c.name === name);
    const first = controls[0];
    if (first.type === "radio" || first.type === "checkbox") {
      const picked = controls.filter((c) => Array.isArray(v) ? v.includes(c.value) : v === c.value || v === true);
      parts.push(picked.map(choiceText).join(", "));
    } else if (first.tagName === "SELECT") {
      const values = Array.isArray(v) ? v : [v];
      parts.push([...first.options].filter((o) => values.includes(o.value)).map((o) => o.textContent.trim()).join(", "));
    } else
      parts.push(String(v));
  }
  return parts.filter(Boolean).join(" · ");
}
function renderSummary(root) {
  const walk = cfgOf(root);
  const step = stepById(root, walk.step);
  const host = step && dfDollar(step).find(".questionnaire-summary").get(0);
  if (!host)
    return;
  host.textContent = "";
  const list = document.createElement("dl");
  list.className = "questionnaire-summary-list";
  for (const id of walk.history.slice(0, walk.index)) {
    const s = stepById(root, id);
    if (!s || isEnd(s) || !controlsOf(s).length)
      continue;
    const row = document.createElement("div");
    row.className = "questionnaire-summary-row";
    const dt = document.createElement("dt");
    dt.textContent = titleOf(s);
    const dd = document.createElement("dd");
    const text = document.createElement("span");
    text.textContent = answerText(root, s, walk.answers) || "Skipped";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "questionnaire-edit";
    edit.dataset.questionnaireGo = id;
    edit.textContent = "Edit";
    edit.setAttribute("aria-label", `Edit: ${titleOf(s)}`);
    dd.append(text, edit);
    row.append(dt, dd);
    list.append(row);
  }
  host.append(list);
}
function notify(root, text, action) {
  let host = dfDollar(root).find(".questionnaire-notice").get(0);
  if (!host) {
    host = document.createElement("div");
    host.className = "questionnaire-notice";
    host.setAttribute("role", "status");
    const first = dfDollar(root).find(".questionnaire-block, .questionnaire-step").get(0);
    if (first)
      dfDollar(first).before(host);
    else
      dfDollar(root).append(host);
  }
  host.textContent = "";
  if (!text) {
    host.hidden = true;
    return;
  }
  host.hidden = false;
  const span = document.createElement("span");
  span.textContent = text;
  host.append(span);
  if (action) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "questionnaire-notice-action";
    b.dataset.questionnaire = action.name;
    b.textContent = action.label;
    host.append(b);
  }
}
function keyHints(root) {
  if (root.dataset.shortcuts === "none")
    return;
  for (const step of root._flow.steps) {
    const choices = dfDollar(step).find(".questionnaire-choice").toArray();
    choices.forEach((choice, i) => {
      if (!choice.dataset.key)
        choice.dataset.key = root.dataset.shortcuts === "digits" ? String(i + 1) : LETTERS[i] ?? "";
    });
  }
}
function paint(root) {
  renderProgress(root);
  renderTrail(root);
  renderSummary(root);
}
function record(root, name) {
  const walk = cfgOf(root);
  const config = { step: walk.step, answers: walk.answers, history: walk.history, index: walk.index, skipped: walk.skipped };
  if (root.store)
    questionnaireApi.commit(root, name ?? landed(root, walk), config);
  if (root._draft)
    root._draft.set(walk.submitted ? null : config);
}
function show(root, id, focus = true) {
  const walk = cfgOf(root);
  const step = stepById(root, id);
  if (!step)
    return;
  walk.step = id;
  walk.entered = readStep(step);
  const name = landed(root, walk);
  applyMarkup(root, { name, config: { step: id } });
  root.dataset.stateName = name;
  clearInvalid(step);
  paint(root);
  if (focus) {
    const target = controlsOf(step).find((c) => c.type !== "radio" || c.checked) || controlsOf(step)[0] || dfDollar(root).find('[data-questionnaire="submit"]').get(0);
    target?.focus({ preventScroll: true });
    step.scrollIntoView?.({ block: "nearest" });
  }
}
function advance(root, { skip = false } = {}) {
  const walk = cfgOf(root);
  const step = stepById(root, walk.step);
  if (!step || isEnd(step))
    return false;
  const before = walk.answers;
  const mine = readStep(step);
  let answers = skip ? clearStep(step, before) : mergeAnswers(before, mine);
  if (!skip) {
    const problem = invalidOf(root, step, answers);
    if (problem) {
      showInvalid(step, problem);
      root.dispatchEvent(new CustomEvent("questionnaire-invalid", { bubbles: true, detail: { step: walk.step, message: problem.message } }));
      return false;
    }
  }
  clearInvalid(step);
  const skipped = skip ? [...new Set([...walk.skipped, walk.step])] : walk.skipped.filter((s) => s !== walk.step);
  const was = mergeAnswers({}, walk.entered || {});
  const now = mergeAnswers({}, skip ? {} : mine);
  const changed = Object.keys({ ...was, ...now }).filter((k) => JSON.stringify(was[k]) !== JSON.stringify(now[k]));
  const to = skip ? defaultNext(root, step) : nextOf(root, walk.step, answers);
  if (!to || !stepById(root, to)) {
    console.warn(`questionnaire #${root.id}: step "${walk.step}" leads nowhere (${to ?? "no next step"})`);
    return false;
  }
  const ahead = walk.history[walk.index + 1];
  let history = walk.history;
  if (ahead !== to || changed.length)
    history = [...walk.history.slice(0, walk.index + 1), to];
  const cleared = [];
  if (changed.length) {
    for (const s of root._flow.steps) {
      const deps = (s.dataset.dependsOn || "").split(",").map((x) => x.trim()).filter(Boolean);
      if (s !== step && deps.some((d) => changed.includes(d)) && answeredStep(s, answers) && controlsOf(s).length) {
        answers = clearStep(s, answers);
        cleared.push(s.dataset.step);
      }
    }
    const path = reachable(root, answers, skipped);
    for (const s of root._flow.steps) {
      const id = s.dataset.step;
      if (path.has(id) || !controlsOf(s).length || !answeredStep(s, answers) || cleared.includes(id))
        continue;
      answers = clearStep(s, answers);
      cleared.push(id);
    }
  }
  walk.answers = answers;
  walk.skipped = skipped.filter((s) => !cleared.includes(s));
  walk.history = history;
  walk.index += 1;
  if (cleared.length) {
    notify(root, `${cleared.length === 1 ? "1 later answer was" : cleared.length + " later answers were"} cleared - they depended on "${titleOf(step)}".`);
    root.dispatchEvent(new CustomEvent("questionnaire-invalidate", { bubbles: true, detail: { cause: walk.step, changed, cleared } }));
  } else
    notify(root, "");
  show(root, to);
  record(root);
  root.dispatchEvent(new CustomEvent("questionnaire-step", { bubbles: true, detail: { step: to, from: history[walk.index - 1], answers } }));
  return true;
}
function back(root) {
  const walk = cfgOf(root);
  if (walk.index <= 0)
    return false;
  const step = stepById(root, walk.step);
  if (step && !isEnd(step))
    walk.answers = mergeAnswers(walk.answers, readStep(step));
  walk.index -= 1;
  show(root, walk.history[walk.index]);
  record(root);
  return true;
}
function goTo(root, id) {
  const walk = cfgOf(root);
  const at = walk.history.indexOf(id);
  if (at < 0)
    return false;
  walk.index = at;
  show(root, id);
  record(root);
  return true;
}
function restart(root) {
  const walk = cfgOf(root);
  for (const s of root._flow.steps)
    writeStep(s, {});
  walk.answers = {};
  walk.history = [root._flow.start];
  walk.index = 0;
  walk.skipped = [];
  walk.submitted = false;
  notify(root, "");
  show(root, root._flow.start);
  record(root, "default");
}
async function submit(root) {
  const walk = cfgOf(root);
  if (!isEnd(stepById(root, walk.step)))
    return advance(root);
  const path = new Set(walk.history.slice(0, walk.index + 1));
  const names = new Set(root._flow.steps.filter((s) => path.has(s.dataset.step)).flatMap((s) => controlsOf(s).map((c) => c.name)));
  const answers = Object.fromEntries(Object.entries(walk.answers).filter(([k]) => names.has(k)));
  const onSubmit = root._config?.onSubmit;
  root.toggleAttribute("data-busy", true);
  try {
    if (onSubmit)
      await onSubmit(answers, { history: walk.history.slice(0, walk.index + 1) });
  } catch (error) {
    root.removeAttribute("data-busy");
    notify(root, `Could not send: ${error?.message || error}`);
    return false;
  }
  root.removeAttribute("data-busy");
  walk.submitted = true;
  applyMarkup(root, { name: "submitted", config: { step: walk.step } });
  root.dataset.stateName = "submitted";
  notify(root, "");
  paint(root);
  record(root, "submitted");
  root.dispatchEvent(new CustomEvent("questionnaire-submit", { bubbles: true, detail: { answers, history: walk.history.slice(0, walk.index + 1) } }));
  return true;
}
function triggerStateChange(root, state, incoming) {
  const walk = cfgOf(root);
  if (!walk)
    return;
  if (incoming.answers && typeof incoming.answers === "object") {
    walk.answers = { ...incoming.answers };
    for (const s of root._flow.steps)
      writeStep(s, walk.answers);
  }
  walk.submitted = false;
  const go = (id) => {
    if (!stepById(root, id))
      return;
    const at = walk.history.indexOf(id);
    if (at >= 0)
      walk.index = at;
    else {
      walk.history = [...walk.history.slice(0, walk.index + 1), id];
      walk.index = walk.history.length - 1;
    }
    walk.step = id;
  };
  switch (state.name) {
    case "default":
      walk.index = 0;
      walk.history = walk.history.length ? walk.history : [root._flow.start];
      walk.step = walk.history[0];
      break;
    case "answering":
      if (incoming.step)
        go(incoming.step);
      else if (walk.index === 0)
        go(nextOf(root, walk.step, walk.answers) || defaultNext(root, stepById(root, walk.step)));
      break;
    case "review": {
      const end = incoming.step && isEnd(stepById(root, incoming.step)) ? incoming.step : root._flow.steps.find(isEnd)?.dataset.step;
      if (end)
        go(end);
      break;
    }
    case "submitted":
      walk.submitted = true;
      break;
  }
  const name = landed(root, walk);
  applyMarkup(root, { name, config: { step: walk.step } });
  root.dataset.stateName = name;
  paint(root);
  if (root._draft)
    root._draft.set(walk.submitted ? null : { step: walk.step, answers: walk.answers, history: walk.history, index: walk.index, skipped: walk.skipped });
}
var questionnaireApi = componentState({
  component: "questionnaire",
  states: questionnaireStates,
  mergeConfig: true,
  apply: (root, state, _previous, incoming) => triggerStateChange(root, state, incoming),
  read: (root, state) => {
    const walk = cfgOf(root);
    if (!walk)
      return state;
    return { name: landed(root, walk), config: { ...state.config, step: walk.step, answers: walk.answers, history: walk.history, index: walk.index, skipped: walk.skipped } };
  },
  markup: (el, state) => applyMarkup(el, state)
});
df$.questionnaireApi = questionnaireApi;
df$.questionnaireStates = questionnaireStates;
function analyze(root) {
  const errors = [];
  const warnings = [];
  const steps = root._flow.steps;
  const ids = new Set(steps.map((s) => s.dataset.step));
  const edges = new Map(steps.map((s) => [s.dataset.step, edgesOf(root, s)]));
  const start = root._flow.start;
  if (!ids.has(start))
    errors.push(`the start step "${start}" does not exist`);
  for (const [from, list] of edges)
    for (const e of list)
      if (!ids.has(e.to))
        errors.push(`"${from}" leads to "${e.to}", which does not exist`);
  for (const s of steps)
    if (!isEnd(s) && !(edges.get(s.dataset.step) || []).length)
      errors.push(`"${s.dataset.step}" is a dead end - give it a next step or data-end`);
  if (!steps.some(isEnd))
    errors.push("no step is an end (data-end)");
  const color = new Map;
  const stack = [];
  const visit = (id) => {
    color.set(id, 1);
    stack.push(id);
    for (const e of edges.get(id) || []) {
      if (!ids.has(e.to))
        continue;
      if (color.get(e.to) === 1)
        errors.push(`a cycle: ${[...stack.slice(stack.indexOf(e.to)), e.to].join(" → ")}`);
      else if (!color.get(e.to))
        visit(e.to);
    }
    stack.pop();
    color.set(id, 2);
  };
  if (ids.has(start))
    visit(start);
  for (const s of steps)
    if (!color.get(s.dataset.step))
      warnings.push(`"${s.dataset.step}" is unreachable from "${start}"`);
  if (ids.has(start) && ![...color.keys()].some((id) => isEnd(stepById(root, id))))
    errors.push(`no end can be reached from "${start}"`);
  const fieldOwner = new Map;
  for (const s of steps)
    for (const c of controlsOf(s))
      fieldOwner.set(c.name, s.dataset.step);
  const fieldsIn = (w) => (Array.isArray(w) ? w : w?.any ?? w?.all ?? (w ? [w] : [])).flatMap((c) => [c.field, c.value && typeof c.value === "object" && "field" in c.value ? c.value.field : null]).filter(Boolean);
  for (const [id, rules] of Object.entries(root._flow.rules.branches)) {
    if (!ids.has(id))
      errors.push(`branches for "${id}", which does not exist`);
    for (const rule of rules)
      for (const f of fieldsIn(rule.when))
        if (!fieldOwner.has(f))
          errors.push(`a branch on "${id}" reads "${f}", which no step asks`);
  }
  for (const [id, rules] of Object.entries(root._flow.rules.validate)) {
    if (!ids.has(id))
      errors.push(`validation for "${id}", which does not exist`);
    if (Array.isArray(rules)) {
      for (const rule of rules)
        for (const f of fieldsIn(rule.assert))
          if (!fieldOwner.has(f))
            errors.push(`an assertion on "${id}" reads "${f}", which no step asks`);
    }
  }
  for (const s of steps)
    for (const d of (s.dataset.dependsOn || "").split(",").map((x) => x.trim()).filter(Boolean)) {
      if (!fieldOwner.has(d))
        errors.push(`"${s.dataset.step}" depends on "${d}", which no step asks`);
    }
  {
    const reach = [...color.keys()];
    const preds = new Map(reach.map((id) => [id, []]));
    for (const id of reach)
      for (const e of edges.get(id) || [])
        if (preds.has(e.to))
          preds.get(e.to).push(id);
    const all = new Set(reach);
    const dom = new Map(reach.map((id) => [id, id === start ? new Set([start]) : new Set(all)]));
    for (let changed = true;changed; ) {
      changed = false;
      for (const id of reach) {
        if (id === start)
          continue;
        const ps = preds.get(id);
        const inter = new Set(ps.length ? ps.map((p) => dom.get(p)).reduce((a, b) => new Set([...a].filter((x) => b.has(x)))) : []);
        inter.add(id);
        if (inter.size !== dom.get(id).size) {
          dom.set(id, inter);
          changed = true;
        }
      }
    }
    const required = (id) => controlsOf(stepById(root, id)).filter((c) => c.required).map((c) => c.name);
    const guaranteed = (id) => new Set([...dom.get(id) ?? []].filter((d) => d !== id).flatMap(required));
    const reads = (id, field, what) => {
      if (fieldOwner.has(field) && fieldOwner.get(field) !== id && dom.has(id) && !guaranteed(id).has(field))
        warnings.push(`${what} on "${id}" reads "${field}" - a path can reach "${id}" without it`);
    };
    for (const [id, rules] of Object.entries(root._flow.rules.branches))
      for (const rule of rules)
        for (const f of fieldsIn(rule.when))
          reads(id, f, "a branch");
    for (const [id, rules] of Object.entries(root._flow.rules.validate))
      if (Array.isArray(rules))
        for (const rule of rules)
          for (const f of fieldsIn(rule.assert))
            reads(id, f, "an assertion");
  }
  const nodes = steps.map((s) => ({ id: s.dataset.step, title: titleOf(s), end: isEnd(s), block: s.closest(".questionnaire-block")?.dataset.block || "" }));
  const list = [...edges].flatMap(([from, l]) => l.map((e) => ({ from, ...e })));
  return { ok: errors.length === 0, errors: [...new Set(errors)], warnings: [...new Set(warnings)], nodes, edges: list };
}
function toMermaid(root) {
  const { nodes, edges } = analyze(root);
  const walk = cfgOf(root);
  const visited = new Set(walk ? walk.history.slice(0, walk.index + 1) : []);
  const safe = (id) => "q_" + id.replace(/[^A-Za-z0-9_]/g, "_");
  const text = (t) => t.replace(/["\n]/g, " ").slice(0, 48);
  const lines = ["flowchart TD"];
  for (const n of nodes)
    lines.push(`  ${safe(n.id)}${n.end ? `(["${text(n.title)}"])` : `["${text(n.title)}"]`}`);
  const styled = [];
  edges.forEach((e, i) => {
    lines.push(`  ${safe(e.from)} -->${e.label ? `|"${text(e.label)}"|` : ""} ${safe(e.to)}`);
    const a = walk?.history.indexOf(e.from) ?? -1;
    if (a >= 0 && a < (walk?.index ?? 0) && walk.history[a + 1] === e.to)
      styled.push(i);
  });
  lines.push("  classDef visited stroke-width:2px;");
  lines.push("  classDef current stroke-width:3px,stroke-dasharray:4 2;");
  const done = [...visited].filter((id) => id !== walk?.step);
  if (done.length)
    lines.push(`  class ${done.map(safe).join(",")} visited;`);
  if (walk)
    lines.push(`  class ${safe(walk.step)} current;`);
  if (styled.length)
    lines.push(`  linkStyle ${styled.join(",")} stroke-width:3px;`);
  return lines.join(`
`);
}
function toDiagram(root, { title = "" } = {}) {
  const { nodes, edges } = analyze(root);
  const walk = cfgOf(root);
  const start = root._flow.start;
  const rank = new Map([[start, 0]]);
  for (let pass = 0;pass <= nodes.length; pass++) {
    let moved = false;
    for (const e of edges) {
      if (!rank.has(e.from))
        continue;
      const r = rank.get(e.from) + 1;
      if ((rank.get(e.to) ?? -1) < r) {
        rank.set(e.to, r);
        moved = true;
      }
    }
    if (!moved)
      break;
  }
  let bottom = Math.max(0, ...rank.values());
  for (const n of nodes)
    if (!rank.has(n.id))
      rank.set(n.id, ++bottom);
  const rows = new Map;
  for (const n of nodes) {
    const r = rank.get(n.id);
    if (!rows.has(r))
      rows.set(r, []);
    rows.get(r).push(n.id);
  }
  const cols = Math.max(1, ...[...rows.values()].map((ids) => ids.length));
  const col = new Map;
  for (const ids of rows.values())
    ids.forEach((id, i) => col.set(id, Math.floor((cols - ids.length) / 2) + i + 1));
  const taken = walk ? walk.history.slice(0, walk.index + 1) : [];
  const walked = new Set(taken.slice(1).map((to, i) => `${taken[i]}->${to}`));
  const last = taken.length > 1 ? `${taken[taken.length - 2]}->${taken[taken.length - 1]}` : "";
  return {
    type: "flow",
    ...title ? { title } : {},
    cols,
    interactive: true,
    nodes: nodes.map((n) => ({
      id: n.id,
      name: n.title || n.id,
      ...n.id === start ? { eyebrow: "Start" } : n.end ? { eyebrow: "End" } : {},
      col: col.get(n.id),
      row: rank.get(n.id) + 1,
      ...n.end ? { shape: "pill" } : {},
      ...walk && n.id === walk.step ? { tone: "accent" } : taken.includes(n.id) ? { tone: "muted" } : {}
    })),
    edges: edges.map((e) => {
      const ref = `${e.from}->${e.to}`;
      return {
        from: e.from,
        to: e.to,
        ...e.label ? { label: e.label } : {},
        ...rank.get(e.to) - rank.get(e.from) > 1 && col.get(e.to) === col.get(e.from) ? { curve: "around" } : {},
        ...walked.has(ref) ? { tone: "accent" } : { line: "dashed" },
        ...ref === last ? { flow: true } : {}
      };
    })
  };
}
function linkDiagram(root, figure) {
  const diagram = df$.diagram;
  if (!diagram?.build)
    throw new Error("questionnaire.linkDiagram: the diagram component is not loaded (df$.shadcn.diagram)");
  figure._questionnaireUnlink?.();
  let syncing = false;
  let drawn = "";
  const focus = () => {
    syncing = true;
    try {
      if (figure.api?.getState().name === "active")
        figure.api.setState("default");
    } finally {
      syncing = false;
    }
  };
  const draw = () => {
    const walk = cfgOf(root);
    if (!walk)
      return;
    const key = `${walk.step}|${walk.history.join(",")}|${walk.index}`;
    if (key === drawn)
      return;
    drawn = key;
    diagram.build(figure, toDiagram(root, { title: figure.getAttribute("aria-label") || "" }));
    focus();
  };
  const refuse = (to, reason) => {
    const walk = cfgOf(root);
    focus();
    const step = stepById(root, walk.step);
    const target = stepById(root, to);
    if (reason === "unreached")
      notify(root, `"${target ? titleOf(target) : to}" is not reachable yet - answer "${step ? titleOf(step) : walk.step}" first.`);
    root.dispatchEvent(new CustomEvent("questionnaire-jump-refused", { bubbles: true, detail: { to, step: walk.step, reason } }));
  };
  const onActivate = (e) => {
    if (syncing)
      return;
    const walk = cfgOf(root);
    const to = e.detail?.kind === "node" ? e.detail.ref : null;
    if (!walk || !to || to === walk.step)
      return void focus();
    if (walk.history.includes(to))
      return void goTo(root, to);
    const step = stepById(root, walk.step);
    const answers = step && !isEnd(step) ? mergeAnswers(walk.answers, readStep(step)) : walk.answers;
    if (to === nextOf(root, walk.step, answers)) {
      if (!advance(root))
        refuse(to, "invalid");
      return;
    }
    refuse(to, "unreached");
  };
  dfDollar(figure).on("diagram-activate", onActivate);
  const off = root.store.subscribe(draw);
  draw();
  const unlink = () => {
    off?.();
    dfDollar(figure).off("diagram-activate", onActivate);
    delete figure._questionnaireUnlink;
  };
  figure._questionnaireUnlink = unlink;
  return unlink;
}
var resolve = (target) => typeof target === "string" ? dfDollar(target).get(0) : target;
df$.questionnaire = {
  configure(target, config = {}) {
    const root = resolve(target);
    root._config = { ...root._config, ...config };
    if (root._flow)
      root._flow.rules = rulesOf(root);
    if (config.persist && root._walk)
      attachDraft(root, config.persist);
  },
  next: (target) => advance(resolve(target)),
  back: (target) => back(resolve(target)),
  skip: (target) => advance(resolve(target), { skip: true }),
  goTo: (target, id) => goTo(resolve(target), id),
  restart: (target) => restart(resolve(target)),
  submit: (target) => submit(resolve(target)),
  answers: (target) => ({ ...cfgOf(resolve(target))?.answers }),
  history: (target) => {
    const walk = cfgOf(resolve(target));
    return walk ? walk.history.slice(0, walk.index + 1) : [];
  },
  nextOf: (target, stepId, answers) => nextOf(resolve(target), stepId, answers ?? cfgOf(resolve(target)).answers),
  analyze: (target) => analyze(resolve(target)),
  toMermaid: (target) => toMermaid(resolve(target)),
  toDiagram: (target, options) => toDiagram(resolve(target), options),
  linkDiagram: (target, figure) => linkDiagram(resolve(target), resolve(figure))
};
function attachDraft(root, config) {
  root._draft?.destroy();
  const where = viewPersistence(root, "questionnaire", String(dfDollar(".questionnaire").toArray().indexOf(root)), config || {});
  root._draft = where ? persisted(where.key, null, { area: where.area, validate: (v) => v === null || typeof v === "object" && !Array.isArray(v) }) : null;
  return root._draft?.value ?? null;
}
var lastActive = null;
var TYPING = 'input[type="text"], input[type="email"], input[type="number"], input[type="search"], input[type="url"], input[type="tel"], input[type="password"], input[type="date"], input:not([type]), textarea, select, [contenteditable]';
function onKey(e) {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.isComposing)
    return;
  const t = e.target;
  let root = t.closest?.(".questionnaire");
  const onPage = !root && (t === document.body || t === document.documentElement || t === document);
  if (!root && !onPage)
    return;
  if (!root) {
    const live = dfDollar(".questionnaire[data-init]").toArray().filter((q) => q._walk && !q._walk.submitted && q.checkVisibility());
    root = live.includes(lastActive) ? lastActive : live.length === 1 ? live[0] : null;
  }
  if (!root?._walk || root._walk.submitted || t.matches?.(TYPING))
    return;
  const step = stepById(root, root._walk.step);
  if (!step)
    return;
  if (e.key === "Enter" && onPage) {
    e.preventDefault();
    if (isEnd(step))
      submit(root);
    else
      advance(root);
    return;
  }
  if (root.dataset.shortcuts === "none" || e.key.length !== 1)
    return;
  const key = e.key.toLowerCase();
  let input = null;
  const choice = dfDollar(step).find(".questionnaire-choice").toArray().find((c) => c.dataset.key?.toLowerCase() === key);
  if (choice)
    input = dfDollar(choice).find('input[type="radio"], input[type="checkbox"]').get(0);
  else if (/^[1-9]$/.test(key) && !dfDollar(step).find(".questionnaire-choice").get(0)) {
    input = dfDollar(step).find('input[type="radio"]').toArray()[Number(key) - 1] ?? null;
  }
  if (!input || input.disabled)
    return;
  e.preventDefault();
  lastActive = root;
  input.click();
  input.focus({ preventScroll: true });
}
if (!document.__questionnaireKeys) {
  document.__questionnaireKeys = true;
  document.addEventListener("keydown", onKey);
}
function init() {
  dfDollar(".questionnaire:not([data-init])").toArray().forEach((root) => {
    root.dataset.init = "";
    readFlow(root);
    if (!root._flow.steps.length)
      return;
    root.setAttribute("novalidate", "");
    keyHints(root);
    root._walk = { step: root._flow.start, answers: {}, history: [root._flow.start], index: 0, skipped: [], submitted: false };
    const draft = attachDraft(root, root._config?.persist);
    let restored = false;
    if (draft && draft.history?.length && stepById(root, draft.step)) {
      const walk = root._walk;
      walk.answers = draft.answers || {};
      walk.history = draft.history.filter((id) => stepById(root, id));
      walk.index = Math.min(Math.max(0, draft.index ?? 0), walk.history.length - 1);
      walk.step = walk.history[walk.index];
      walk.skipped = draft.skipped || [];
      for (const s of root._flow.steps)
        writeStep(s, walk.answers);
      restored = walk.index > 0 || Object.keys(walk.answers).length > 0;
    }
    const analysis = analyze(root);
    if (!analysis.ok)
      console.warn(`questionnaire #${root.id || "?"}: the flow has problems -`, analysis.errors);
    root.toggleAttribute("data-flow-invalid", !analysis.ok);
    root.addEventListener("submit", (e) => {
      e.preventDefault();
      const action = e.submitter?.dataset.questionnaire;
      if (action === "skip")
        advance(root, { skip: true });
      else if (action === "back")
        back(root);
      else if (isEnd(stepById(root, cfgOf(root).step)))
        submit(root);
      else
        advance(root);
    });
    root.addEventListener("click", (e) => {
      const action = e.target.closest?.("[data-questionnaire]")?.dataset.questionnaire;
      const go = e.target.closest?.("[data-questionnaire-go]")?.dataset.questionnaireGo;
      if (go)
        return goTo(root, go);
      if (e.target.closest?.('button[type="submit"], input[type="submit"]'))
        return;
      if (action === "back")
        back(root);
      else if (action === "next")
        advance(root);
      else if (action === "skip")
        advance(root, { skip: true });
      else if (action === "restart")
        restart(root);
      else if (action === "dismiss")
        notify(root, "");
    });
    const keep = (e) => {
      const step = e.target.closest?.(".questionnaire-step");
      if (!step || step.dataset.step !== cfgOf(root).step)
        return;
      if (e.target.classList?.contains("questionnaire-other") && e.target.value) {
        const holder = e.target.closest(".questionnaire-choice");
        const choice = holder && dfDollar(holder).find('input[type="radio"], input[type="checkbox"]').get(0);
        if (choice)
          choice.checked = true;
      }
      cfgOf(root).answers = mergeAnswers(cfgOf(root).answers, readStep(step));
      clearInvalid(step);
      record(root);
      if (e.type === "change" && e.target.type === "radio" && root.hasAttribute("data-auto-advance") && controlsOf(step).every((c) => c.type === "radio")) {
        clearTimeout(root._auto);
        root._auto = setTimeout(() => advance(root), 280);
      }
    };
    root.addEventListener("input", keep);
    root.addEventListener("change", keep);
    root.addEventListener("focusin", () => {
      lastActive = root;
    });
    root.addEventListener("pointerdown", () => {
      lastActive = root;
    });
    bindComponent(root, questionnaireApi, { name: "default", config: { step: root._flow.start, answers: {}, history: [root._flow.start], index: 0, skipped: [] } });
    show(root, root._walk.step, false);
    record(root);
    if (restored)
      notify(root, "Your answers from earlier are back.", { name: "restart", label: "Start over" });
  });
}
init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });

//# debugId=7D96126615E3DFA364756E2164756E21
//# sourceMappingURL=questionnaire.js.map
