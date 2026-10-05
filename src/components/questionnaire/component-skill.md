---
name: Questionnaire
type: MOL
why: One native <form>, one <fieldset> per step - the controller walks a flow graph (option data-goto, conditional rules, data-next, markup order) one validated step at a time, keeps a branch history and a session draft, and invalidates answers a changed answer cut off. Without JavaScript it is a plain long form.
when: Multi-step forms that ask different people different questions - intake, onboarding, surveys, quotes, triage - where the next question depends on the answers. A plain Form for one screen of fields; Steps for a fixed, linear progress indicator.
where: dist/components/questionnaire/questionnaire.css + dist/components/questionnaire/questionnaire.js
supportedStates: default, answering, review, submitted
---

# Pattern: Questionnaire

## Native basis
A `<form>` whose steps are `<fieldset>`s with a `<legend>` (the question).
The controller shows one step (`hidden` on the rest), validates it with the
browser's own constraint validation (`required`, `min`, `pattern`,
`type="email"` …) plus choice counts and cross-field assertions, and walks a
**flow graph** to the next one. Answers are the form's own controls -
`FormData` still works, and without JavaScript every step shows: the form
degrades to a single long page.

---

## Native Web APIs
- [`<fieldset>` / `<legend>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/fieldset) - a step and its question; the legend names the group for screen readers
- [Constraint validation](https://developer.mozilla.org/en-US/docs/Web/HTML/Constraint_validation) - `checkValidity()` / `validationMessage` per control, `novalidate` so the controller speaks per step
- [`hidden`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/hidden) - the steps not shown; without JavaScript none are hidden
- [`<progress>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/progress) - the progress bar
- [`SubmitEvent.submitter`](https://developer.mozilla.org/en-US/docs/Web/API/SubmitEvent/submitter) - Continue / Send / Skip are submit buttons; Enter in a field continues
- [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - a choice card shows its control's checked / focus state
- [Web Storage](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API) - the draft, through a `persisted()` defuss-store store (session storage by default)
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) · [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) · [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)

---

## Structure

```html
<form class="questionnaire" id="intake" aria-label="Project intake">
  <div class="questionnaire-progress"></div>                       <!-- filled: label, <progress>, block chips -->

  <section class="questionnaire-block" data-block="you" data-title="About you">
    <fieldset class="questionnaire-step" data-step="role">
      <legend class="questionnaire-title">What describes you best?</legend>
      <p class="questionnaire-description">We only ask what matters for your role.</p>
      <div class="questionnaire-choices">
        <label class="questionnaire-choice"><input type="radio" name="role" value="dev" required data-goto="stack"><span class="questionnaire-choice-label">Developer</span></label>
        <label class="questionnaire-choice"><input type="radio" name="role" value="design" data-goto="tools"><span class="questionnaire-choice-label">Designer</span></label>
      </div>
    </fieldset>

    <fieldset class="questionnaire-step" data-step="stack" data-min="1" data-max="3" data-next="team">
      <legend class="questionnaire-title">Which languages?</legend>
      <div class="questionnaire-choices">
        <label class="questionnaire-choice"><input type="checkbox" name="stack" value="ts"><span class="questionnaire-choice-label">TypeScript</span></label>
        …
      </div>
    </fieldset>

    <fieldset class="questionnaire-step" data-step="framework" data-depends-on="stack">
      <legend class="questionnaire-title">Your main framework?</legend>
      <div class="questionnaire-field">
        <label class="label" for="fw">Framework</label>
        <input class="input" id="fw" name="framework" required>
      </div>
    </fieldset>

    <fieldset class="questionnaire-step" data-step="referral" data-optional>
      <legend class="questionnaire-title">How did you hear about us?</legend>
      <div class="questionnaire-choices">
        <label class="questionnaire-choice"><input type="radio" name="referral" value="friend"><span class="questionnaire-choice-label">A friend</span></label>
        <label class="questionnaire-choice"><input type="radio" name="referral" value="other"><span class="questionnaire-choice-label">Other:</span><input class="questionnaire-other" name="referralOther" aria-label="Other source"></label>
      </div>
    </fieldset>
  </section>

  <fieldset class="questionnaire-step" data-step="review" data-end>
    <legend class="questionnaire-title">Check your answers</legend>
    <div class="questionnaire-summary"></div>                      <!-- filled: every answer on the path, with Edit -->
  </fieldset>

  <div class="questionnaire-actions">
    <button class="btn" data-variant="ghost" type="button" data-questionnaire="back">Back</button>
    <button class="btn" data-variant="outline" type="submit" data-questionnaire="skip">Skip</button>
    <button class="btn" type="submit" data-questionnaire="next">Continue</button>
    <button class="btn" type="submit" data-questionnaire="submit">Send</button>
  </div>
  <div class="questionnaire-complete"><p>Thanks!</p></div>        <!-- shown once sent -->

  <script type="application/json" class="questionnaire-rules">
    {
      "branches": { "team": [{ "when": [{ "field": "size", "op": "gte", "value": 50 }], "goto": "enterprise" }] },
      "validate": { "budget": [{ "assert": [{ "field": "max", "op": "gte", "value": { "field": "min" } }], "message": "Max must not be below min.", "field": "max" }] }
    }
  </script>
</form>

<!-- the branch history, inside the form or anywhere -->
<nav class="questionnaire-trail" data-for="intake" aria-label="Your answers"></nav>
```

### Where a step leads (the flow graph)

In order: the chosen option's **`data-goto`** (radio, checkbox, `<option>`),
the first **rule** in `branches[step]` whose `when` holds, the step's
**`data-next`**, else the **next step in the markup**. A `when` is a list of
conditions (all must hold) or `{ "any": [...] }`; a condition is
`{ field, op, value }` with dataview's operators (`eq`, `neq`, `gt`, `gte`,
`lt`, `lte`, `in`, `contains`, `startsWith`, `endsWith`) plus `answered`,
`empty`, `includes` (a checkbox group holds it). `value` may be
`{ "field": "other" }` - another answer.

### Behavior in code

```js
df$.shadcn.questionnaire.configure(form, {
  branches: { team: [{ when: [{ field: 'size', op: 'gte', value: 50 }], goto: 'enterprise' }] },
  validate: { email: (answers) => answers.email.endsWith('@example.com') ? 'Use your work address.' : null },
  onSubmit: async (answers, { history }) => fetch('/api/intake', { method: 'POST', body: JSON.stringify(answers) }),
  persist: { area: 'local', prefix: 'my-app' },
});
```

---

## Variants

| Attribute | Element | Behaviour |
|-----------|---------|-----------|
| `data-step` | `.questionnaire-step` | The step's id (required) |
| `data-next` | `.questionnaire-step` | The default next step (else the next in the markup) |
| `data-goto` | radio / checkbox / `<option>` | Picking it leads there |
| `data-end` | `.questionnaire-step` | An end: the review (with `.questionnaire-summary`) and Send |
| `data-optional` | `.questionnaire-step` | Offers Skip (skipping drops its answers, takes the default way) |
| `data-min` / `data-max` | `.questionnaire-step` | How many of its checkboxes must / may be checked |
| `data-depends-on="a, b"` | `.questionnaire-step` | Its answers are cleared when `a` or `b` changes |
| `data-start` | `.questionnaire` | The first step (else the first in the markup) |
| `data-auto-advance` | `.questionnaire` | A single-choice step moves on once picked |
| `data-shortcuts="letters\|digits\|none"` | `.questionnaire` | Choice keys (A, B, C … / 1, 2, 3 …); `data-key` on a choice sets its own |
| `data-persist="session\|local\|none"`, `data-persist-prefix`, `data-persist-key` | `.questionnaire` | Where the draft is kept (session storage by default) |
| `data-block` / `data-title` | `.questionnaire-block` | A group of steps - a chip in the progress |
| `.questionnaire-other` | text input in a choice | Freeform "Other": typing picks its choice |
| `.questionnaire-trail[data-for]` | anywhere | The branch history of that form |

---

## States

| State | Meaning |
|-------|---------|
| `default` | At the start step |
| `answering` | On a later step (`config.step`) |
| `review` | On an end step - the summary and Send |
| `submitted` | Sent - the steps give way to `.questionnaire-complete` |

The config is the walk: `{ step, answers, history, index, skipped }` -
`el.store` follows every keystroke (the draft does too).

```js
const form = document.querySelector('#intake');
form.api.setState('answering', { step: 'budget' });
form.api.setState('review');
form.store.subscribe(({ config }) => console.log(config.answers));
form.addEventListener('questionnaire-invalidate', (e) => console.log(e.detail.cleared));
```

Registry: `df$.shadcn.questionnaireApi` / `df$.shadcn.questionnaireStates`;
`df$.shadcn.questionnaire` has `configure`, `next`, `back`, `skip`, `goTo`,
`restart`, `submit`, `answers`, `history`, `nextOf`, `analyze`, `toMermaid`.
Events: `questionnaire-step`, `questionnaire-invalid`,
`questionnaire-invalidate`, `questionnaire-submit`.

---

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc in the .ts, not this section -->

**Every element:** `el.api.setState(name, config?)` · `el.api.getState()` · `el.api.render(state?)` · `el.api.settled()`; `el.store` - a defuss-store store of `{ name, config }` (subscribe to follow, set to drive).

**Registry:** `df$.shadcn.questionnaireApi` - `setState(el, name, config?)`, `getState(el)`, `render(state)`, `store(el)`, `commit(el, name, config?)`; `df$.shadcn.questionnaireStates` = `default`, `answering`, `review`, `submitted`.

### `df$.shadcn.questionnaire`

| Member | Description |
|---|---|
| `configure(target, config = {})` | Behavior in code: branches ({ stepId: [{ when, goto }] }), validate ({ stepId: [{ assert, message, field }] \| (answers, stepAnswers) => message \| null }), onSubmit(answers, { history }) (may return a promise; a rejection keeps the review and says why), persist ({ area, prefix, key } - where the draft is kept). |
| `next(target)` | Leave the current step forward - validated; false when it cannot be left. |
| `back(target)` | Back one step along the branch history. |
| `skip(target)` | Skip an optional step - its answers dropped, the default way taken. |
| `goTo(target, id)` | Jump to a step of the history (what the trail and Edit do). |
| `restart(target)` | Start over: no answers, no history, no draft. |
| `submit(target)` | Send from the end step (onSubmit, then questionnaire-submit). |
| `answers(target)` | The answers so far. |
| `history(target)` | The steps taken up to the current one. |
| `nextOf(target, stepId, answers)` | where the answers lead from a step (the graph, evaluated) |
| `analyze(target)` | Check the flow graph - { ok, errors, warnings, nodes, edges }. |
| `toMermaid(target)` | The flow as a Mermaid flowchart, the walked path marked. |

### Events

| Event | `detail` | Description |
|---|---|---|
| `questionnaire-invalid` | `step`, `message` | Fires when a step cannot be left - the step and the message shown. |
| `questionnaire-invalidate` | `cause`, `changed`, `cleared` | Fires when a changed answer clears later answers - the step that changed, the fields that changed, the steps cleared. |
| `questionnaire-step` | `step`, `from`, `answers` | Fires on every move forward - the new step, the one left, the answers. |
| `questionnaire-submit` | `answers`, `history` | Fires when sent - the answers on the path and the steps taken. |

---

## ARIA

| Attribute | Element | When |
|-----------|---------|------|
| `aria-label` / `aria-labelledby` | `.questionnaire` | Always - names the form |
| `<legend>` | `.questionnaire-step` | The question names the group |
| `aria-invalid="true"` + `aria-describedby` | step + control | A step that cannot be left yet |
| `role="alert"` | `.questionnaire-error` | Made per step: the reason |
| `role="status"` | `.questionnaire-notice` | A restored draft, cleared answers |
| `aria-current="step"` | block chip / trail item | Where the walk is |
| `aria-label` | `.questionnaire-bar` | "40% done" |

Keyboard: Tab / Shift+Tab move through a step's controls; Enter in a field
continues; a letter (or digit) picks a choice; Space toggles a checkbox.

---

## Notes
- **Back goes back along the branch history** - the steps taken, not the
  previous fieldset. Going forward again without changing an answer keeps
  the way it went (the steps ahead stay in the history).
- **Dependent-answer invalidation**: leaving a step whose answer changed
  clears (1) answers of steps that declare `data-depends-on` that field and
  (2) answers of steps the answers can no longer reach - a branch abandoned.
  A notice says so; `questionnaire-invalidate` lists them. Only answers on
  the path are submitted.
- **The draft** (`{ step, answers, history, index, skipped }`) is kept in
  session storage by default under `defuss-shadcn:<path>:questionnaire:<id>`
  and restored on load ("Your answers from earlier are back." · Start over);
  sending clears it.
- **Check the flow**: `analyze(form)` reports edges to missing steps, cycles,
  dead ends, no reachable end, unreachable steps, and fields a rule reads
  that some path reaches the step without (dominator analysis); a broken
  flow is flagged with `data-flow-invalid` and a console warning at init.
  `toMermaid(form)` draws it, the walked path marked.
