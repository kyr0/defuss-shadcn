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
`type="email"` ...) plus choice counts and cross-field assertions, and walks a
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
| `data-shortcuts="letters\|digits\|none"` | `.questionnaire` | Choice keys (A, B, C ... / 1, 2, 3 ...); `data-key` on a choice sets its own |
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
`restart`, `submit`, `answers`, `history`, `nextOf`, `analyze`, `toMermaid`,
`toDiagram`, `linkDiagram`.
Events: `questionnaire-step`, `questionnaire-invalid`,
`questionnaire-invalidate`, `questionnaire-submit`, `questionnaire-jump-refused`.

`linkDiagram(form, figure)` draws the flow into a `.diagram` figure (the
Illustrative Diagram component must be loaded) and keeps it in step both
ways: every move redraws it, and a click on a step moves the form - back to
a step taken, forward only to the step the current answers lead to.

---

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type QuestionnaireState = 'default' | 'answering' | 'review' | 'submitted'</code> - `setState(name, config)` takes the config of the state it names (`QuestionnaireStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | At the start step. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>answers?</code></td><td><code>QuestionnaireAnswers</code></td><td>replace the answers (the fields are filled from them)</td></tr><tr><td><code>step?</code></td><td><code>string</code></td><td>reported by getState(): the step shown</td></tr><tr><td><code>history?</code></td><td><code>string[]</code></td><td>reported by getState(): the steps taken, in order</td></tr><tr><td><code>index?</code></td><td><code>number</code></td><td>reported by getState(): the current step's position in history</td></tr><tr><td><code>skipped?</code></td><td><code>string[]</code></td><td>reported by getState(): the optional steps skipped</td></tr></table> |
| `answering` | On a later step. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>step?</code></td><td><code>string</code></td><td>the step to show (one the answers reach)</td></tr><tr><td><code>answers?</code></td><td><code>QuestionnaireAnswers</code></td><td>replace the answers</td></tr><tr><td><code>history?</code></td><td><code>string[]</code></td><td>reported by getState(): the steps taken, in order</td></tr><tr><td><code>index?</code></td><td><code>number</code></td><td>reported by getState(): the current step's position in history</td></tr><tr><td><code>skipped?</code></td><td><code>string[]</code></td><td>reported by getState(): the optional steps skipped</td></tr></table> |
| `review` | On an end step - the summary and Send. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>step?</code></td><td><code>string</code></td><td>the end step to show (default: the first end)</td></tr><tr><td><code>answers?</code></td><td><code>QuestionnaireAnswers</code></td><td>replace the answers</td></tr><tr><td><code>history?</code></td><td><code>string[]</code></td><td>reported by getState(): the steps taken, in order</td></tr><tr><td><code>index?</code></td><td><code>number</code></td><td>reported by getState(): the current step's position in history</td></tr><tr><td><code>skipped?</code></td><td><code>string[]</code></td><td>reported by getState(): the optional steps skipped</td></tr></table> |
| `submitted` | Sent - the steps give way to the .questionnaire-complete message. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>answers?</code></td><td><code>QuestionnaireAnswers</code></td><td>reported by getState(): the answers sent</td></tr><tr><td><code>step?</code></td><td><code>string</code></td><td>reported by getState(): the end step</td></tr><tr><td><code>history?</code></td><td><code>string[]</code></td><td>reported by getState(): the steps taken, in order</td></tr><tr><td><code>index?</code></td><td><code>number</code></td><td>reported by getState(): the end step's position in history</td></tr><tr><td><code>skipped?</code></td><td><code>string[]</code></td><td>reported by getState(): the optional steps skipped</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends QuestionnaireState&gt;(name: S, config?: QuestionnaireStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>QuestionnaireStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: QuestionnaireState; config: QuestionnaireStateConfigs[QuestionnaireState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: QuestionnaireState; config: QuestionnaireStateConfigs[QuestionnaireState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: QuestionnaireState; config: QuestionnaireStateConfigs[QuestionnaireState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: QuestionnaireState; config: QuestionnaireStateConfigs[QuestionnaireState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: QuestionnaireState; config: QuestionnaireStateConfigs[QuestionnaireState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.questionnaireApi.setState&lt;S extends QuestionnaireState&gt;(el: HTMLElement, name: S, config?: QuestionnaireStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>QuestionnaireStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.questionnaireApi.getState(el: HTMLElement): { name: QuestionnaireState; config: QuestionnaireStateConfigs[QuestionnaireState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: QuestionnaireState; config: QuestionnaireStateConfigs[QuestionnaireState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.questionnaireApi.render(state: { name: QuestionnaireState; config: QuestionnaireStateConfigs[QuestionnaireState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: QuestionnaireState; config: QuestionnaireStateConfigs[QuestionnaireState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.questionnaireApi.store(el: HTMLElement): Store&lt;{ name: QuestionnaireState; config: QuestionnaireStateConfigs[QuestionnaireState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: QuestionnaireState; config: QuestionnaireStateConfigs[QuestionnaireState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.questionnaireApi.commit&lt;S extends QuestionnaireState&gt;(el: HTMLElement, name: S, config?: QuestionnaireStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>QuestionnaireStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.questionnaireStates: QuestionnaireState[]</code> | The declared states, 'default' first: <code>default</code>, <code>answering</code>, <code>review</code>, <code>submitted</code>. |

### `df$.shadcn.questionnaire`

| Member | Description |
|---|---|
| <code>configure(target: string \| HTMLElement, config: QuestionnaireConfig = {}): void</code> | Behavior in code: branches ({ stepId: [{ when, goto }] }), validate ({ stepId: [{ assert, message, field }] \| (answers, stepAnswers) =&gt; message \| null }), onSubmit(answers, { history }) (may return a promise; a rejection keeps the review and says why), persist ({ area, prefix, key } - where the draft is kept). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .questionnaire element or its selector</td></tr><tr><td><code>config</code></td><td><code>QuestionnaireConfig</code> = <code>{}</code></td><td>branches, checks, the submit handler and the draft's place (merged into the current config)</td></tr></table> |
| <code>next(target: string \| HTMLElement): boolean</code> | Leave the current step forward - validated; false when it cannot be left. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .questionnaire element or its selector</td></tr></table> <b>Returns</b> <code>boolean</code> - true when it moved on; false when the step does not validate (or is an end) |
| <code>back(target: string \| HTMLElement): boolean</code> | Back one step along the branch history. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .questionnaire element or its selector</td></tr></table> <b>Returns</b> <code>boolean</code> - false on the first step |
| <code>skip(target: string \| HTMLElement): boolean</code> | Skip an optional step - its answers dropped, the default way taken. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .questionnaire element or its selector</td></tr></table> <b>Returns</b> <code>boolean</code> - true when it moved on |
| <code>goTo(target: string \| HTMLElement, id: string): boolean</code> | Jump to a step of the history (what the trail and Edit do). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .questionnaire element or its selector</td></tr><tr><td><code>id</code></td><td><code>string</code></td><td>the step id</td></tr></table> <b>Returns</b> <code>boolean</code> - false when the step is not in the history |
| <code>restart(target: string \| HTMLElement): void</code> | Start over: no answers, no history, no draft. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .questionnaire element or its selector</td></tr></table> |
| <code>submit(target: string \| HTMLElement): Promise&lt;boolean&gt;</code> | Send from the end step (onSubmit, then questionnaire-submit). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .questionnaire element or its selector</td></tr></table> <b>Returns</b> <code>Promise&lt;boolean&gt;</code> - true when sent; false when onSubmit rejected or (before the end) the step did not validate |
| <code>answers(target: string \| HTMLElement): QuestionnaireAnswers</code> | The answers so far. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .questionnaire element or its selector</td></tr></table> <b>Returns</b> <code>QuestionnaireAnswers</code> - a copy of every answer, by field name |
| <code>history(target: string \| HTMLElement): string[]</code> | The steps taken up to the current one. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .questionnaire element or its selector</td></tr></table> <b>Returns</b> <code>string[]</code> - the step ids, in order |
| <code>nextOf(target: string \| HTMLElement, stepId: string, answers?: QuestionnaireAnswers): string \| null</code> | Where the answers lead from a step (the graph, evaluated). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .questionnaire element or its selector</td></tr><tr><td><code>stepId</code></td><td><code>string</code></td><td>the step to leave</td></tr><tr><td><code>answers?</code></td><td><code>QuestionnaireAnswers</code></td><td>the answers to evaluate (default: the current ones)</td></tr></table> <b>Returns</b> <code>string \| null</code> - the next step's id, null from an end |
| <code>analyze(target: string \| HTMLElement): QuestionnaireAnalysis</code> | Check the flow graph - { ok, errors, warnings, nodes, edges }. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .questionnaire element or its selector</td></tr></table> <b>Returns</b> <code>QuestionnaireAnalysis</code> - the errors, the warnings and the graph |
| <code>toMermaid(target: string \| HTMLElement): string</code> | The flow as a Mermaid flowchart, the walked path marked. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .questionnaire element or its selector</td></tr></table> <b>Returns</b> <code>string</code> - the flowchart source |
| <code>toDiagram(target: string \| HTMLElement, options?: { title?: string }): QuestionnaireDiagramSpec</code> | The flow as an Illustrative Diagram spec for df$.shadcn.diagram.build - steps ranked top-down, the walked path marked, the edge just walked flowing; { title } names it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .questionnaire element or its selector</td></tr><tr><td><code>options?</code></td><td><code>{ title?: string }</code></td><td>title: the figure's title</td></tr></table> <b>Returns</b> <code>QuestionnaireDiagramSpec</code> - the spec, for df$.shadcn.diagram.build() |
| <code>linkDiagram(target: string \| HTMLElement, figure: string \| HTMLElement): (() =&gt; void)</code> | Link a .diagram figure both ways: it redraws on every move with the current step active, and a click moves the form - back to a step taken, forward only to the step the answers lead to; further on is refused (questionnaire-jump-refused). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .questionnaire element or its selector</td></tr><tr><td><code>figure</code></td><td><code>string \| HTMLElement</code></td><td>the .diagram figure or its selector</td></tr></table> <b>Returns</b> <code>(() =&gt; void)</code> - the unlink function: call it to stop the two following each other |

### Events

| Event | Description |
|---|---|
| `questionnaire-invalid` | Fires when a step cannot be left - the step and the message shown. <code>detail</code>: <code>QuestionnaireInvalidDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>step</code></td><td><code>string</code></td><td>the step that cannot be left</td></tr><tr><td><code>message</code></td><td><code>string</code></td><td>the message shown</td></tr></table> |
| `questionnaire-invalidate` | Fires when a changed answer clears later answers - the step that changed, the fields that changed, the steps cleared. <code>detail</code>: <code>QuestionnaireInvalidateDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>cause</code></td><td><code>string</code></td><td>the step whose answers changed</td></tr><tr><td><code>changed</code></td><td><code>string[]</code></td><td>the fields that changed</td></tr><tr><td><code>cleared</code></td><td><code>string[]</code></td><td>the steps whose answers were cleared</td></tr></table> |
| `questionnaire-jump-refused` | Fires when a click on the linked diagram asks for a step the walk cannot reach yet - the step asked for, the current step and why: 'unreached' (further on) or 'invalid' (the current step does not validate). <code>detail</code>: <code>QuestionnaireJumpRefusedDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>to</code></td><td><code>string</code></td><td>the step the diagram click asked for</td></tr><tr><td><code>step</code></td><td><code>string</code></td><td>the step the form is on</td></tr><tr><td><code>reason</code></td><td><code>'unreached' \| 'invalid'</code></td><td>'unreached': further than the answers lead; 'invalid': the current step does not validate</td></tr></table> |
| `questionnaire-step` | Fires on every move forward - the new step, the one left, the answers. <code>detail</code>: <code>QuestionnaireStepDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>step</code></td><td><code>string</code></td><td>the step now shown</td></tr><tr><td><code>from</code></td><td><code>string</code></td><td>the step left</td></tr><tr><td><code>answers</code></td><td><code>QuestionnaireAnswers</code></td><td>every answer so far</td></tr></table> |
| `questionnaire-submit` | Fires when sent - the answers on the path and the steps taken. <code>detail</code>: <code>QuestionnaireSubmitDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>answers</code></td><td><code>QuestionnaireAnswers</code></td><td>the answers on the path taken</td></tr><tr><td><code>history</code></td><td><code>string[]</code></td><td>the steps taken, in order</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `QuestionnaireAnalysis` | What analyze() returns. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>ok</code></td><td><code>boolean</code></td><td>true when there are no errors</td></tr><tr><td><code>errors</code></td><td><code>string[]</code></td><td>missing targets, cycles, dead ends, no end step</td></tr><tr><td><code>warnings</code></td><td><code>string[]</code></td><td>unreachable steps, fields a rule reads that a path may arrive without</td></tr><tr><td><code>nodes</code></td><td><code>QuestionnaireNode[]</code></td><td>every step</td></tr><tr><td><code>edges</code></td><td><code>QuestionnaireEdge[]</code></td><td>every way between steps</td></tr></table> |
| `QuestionnaireAnswer` | One answer: a text / select value, a number field, a checkbox (boolean, or the checked values of a group), null when unanswered. = <code>string \| number \| boolean \| string[] \| null</code> |
| `QuestionnaireAnswers` | Every answer so far, by field name. = <code>Record&lt;string, QuestionnaireAnswer&gt;</code> |
| `QuestionnaireAssert` | A cross-field check a step must pass. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>assert</code></td><td><code>QuestionnaireWhen</code></td><td>the conditions that must hold</td></tr><tr><td><code>message?</code></td><td><code>string</code></td><td>shown when they do not (default 'Check this answer.')</td></tr><tr><td><code>field?</code></td><td><code>string</code></td><td>the field the message points at</td></tr></table> |
| `QuestionnaireBranch` | A branch out of a step. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>when</code></td><td><code>QuestionnaireWhen</code></td><td>when it is taken</td></tr><tr><td><code>goto</code></td><td><code>string</code></td><td>the step it leads to</td></tr></table> |
| `QuestionnaireCondition` | One condition on an answer. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>field</code></td><td><code>string</code></td><td>the field it reads</td></tr><tr><td><code>op?</code></td><td><code>'eq' \| 'neq' \| 'gt' \| 'gte' \| 'lt' \| 'lte' \| 'in' \| 'includes' \| 'contains' \| 'startsWith' \| 'endsWith' \| 'answered' \| 'empty'</code></td><td>how it compares (default 'eq': equal, case-insensitive; on a list: includes)</td></tr><tr><td><code>value?</code></td><td><code>QuestionnaireAnswer \| QuestionnaireAnswer[] \| { field: string }</code></td><td>what it compares with: a value, or { field } for another answer</td></tr></table> |
| `QuestionnaireConfig` | What configure() takes - merged over the markup's script.questionnaire-rules. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>branches?</code></td><td><code>Record&lt;string, QuestionnaireBranch[]&gt;</code></td><td>per step id: the branches, tried in order before the step's data-next</td></tr><tr><td><code>validate?</code></td><td><code>Record&lt;string, QuestionnaireAssert[] \| ((answers: QuestionnaireAnswers, stepAnswers: QuestionnaireAnswers) =&gt; string \| null \| undefined)&gt;</code></td><td>per step id: checks, or a function of (all answers, the step's answers) returning a message when invalid</td></tr><tr><td><code>onSubmit?</code></td><td><code>(answers: QuestionnaireAnswers, context: { history: string[] }) =&gt; void \| Promise&lt;void&gt;</code></td><td>called on submit; a rejection keeps the review and shows why</td></tr><tr><td><code>persist?</code></td><td><code>ViewPersistence</code></td><td>where the draft is kept (default: session storage under a generated key)</td></tr></table> |
| `QuestionnaireDiagramSpec` | An Illustrative Diagram JSON spec - df$.shadcn.diagram.build() renders it. = <code>Record&lt;string, unknown&gt;</code> |
| `QuestionnaireEdge` | A way between two steps. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>from</code></td><td><code>string</code></td><td>the step it leaves</td></tr><tr><td><code>to</code></td><td><code>string</code></td><td>the step it leads to</td></tr><tr><td><code>label</code></td><td><code>string</code></td><td>the choice or rule text that takes it, '' for the default way</td></tr><tr><td><code>kind</code></td><td><code>'choice' \| 'rule' \| 'next'</code></td><td>what makes it: an option's data-goto, a branch rule, or the default next step</td></tr></table> |
| `QuestionnaireInvalidateDetail` | What questionnaire-invalidate carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>cause</code></td><td><code>string</code></td><td>the step whose answers changed</td></tr><tr><td><code>changed</code></td><td><code>string[]</code></td><td>the fields that changed</td></tr><tr><td><code>cleared</code></td><td><code>string[]</code></td><td>the steps whose answers were cleared</td></tr></table> |
| `QuestionnaireInvalidDetail` | What questionnaire-invalid carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>step</code></td><td><code>string</code></td><td>the step that cannot be left</td></tr><tr><td><code>message</code></td><td><code>string</code></td><td>the message shown</td></tr></table> |
| `QuestionnaireJumpRefusedDetail` | What questionnaire-jump-refused carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>to</code></td><td><code>string</code></td><td>the step the diagram click asked for</td></tr><tr><td><code>step</code></td><td><code>string</code></td><td>the step the form is on</td></tr><tr><td><code>reason</code></td><td><code>'unreached' \| 'invalid'</code></td><td>'unreached': further than the answers lead; 'invalid': the current step does not validate</td></tr></table> |
| `QuestionnaireNode` | A step of the flow graph. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>id</code></td><td><code>string</code></td><td>its data-step id</td></tr><tr><td><code>title</code></td><td><code>string</code></td><td>its legend</td></tr><tr><td><code>end</code></td><td><code>boolean</code></td><td>whether it is an end (data-end)</td></tr><tr><td><code>block</code></td><td><code>string</code></td><td>the id of its block, '' outside one</td></tr></table> |
| `QuestionnaireStepDetail` | What questionnaire-step carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>step</code></td><td><code>string</code></td><td>the step now shown</td></tr><tr><td><code>from</code></td><td><code>string</code></td><td>the step left</td></tr><tr><td><code>answers</code></td><td><code>QuestionnaireAnswers</code></td><td>every answer so far</td></tr></table> |
| `QuestionnaireSubmitDetail` | What questionnaire-submit carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>answers</code></td><td><code>QuestionnaireAnswers</code></td><td>the answers on the path taken</td></tr><tr><td><code>history</code></td><td><code>string[]</code></td><td>the steps taken, in order</td></tr></table> |
| `QuestionnaireWhen` | When a rule applies: one condition, a list (all must hold), or { any } / { all }. = <code>QuestionnaireCondition \| QuestionnaireCondition[] \| { any: QuestionnaireCondition[] } \| { all: QuestionnaireCondition[] }</code> |

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
