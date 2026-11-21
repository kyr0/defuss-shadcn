---
name: Chat Components
type: ORG
section: chat
why: A Component Schema document is plain JSON a script or a language model writes; the runtime turns it into the system's own components - a Card with Inputs, Number Inputs (currency), Selects, Radio Groups, Checkboxes, Switches, Sliders, Ratings, date fields or a whole Questionnaire - so a chat asks with real, accessible form controls and gets typed answers back.
when: A chat (bot, assistant, scripted conversation) needs a structured answer - confirm a plan, enter an amount, pick from choices, fill a short form, walk a multi-step questionnaire, tap a quick reply. A plain Form or Questionnaire outside a conversation; a Bubble for text only.
where: dist/components/chat-components/chat-components.css + dist/components/chat-components/chat-components.js
supportedStates: default, answered, cancelled
---

# Pattern: Chat Components

## Native basis

A `<div class="chat-components">` that holds its document in a
`<script type="application/json" class="chat-components-schema">`. The runtime
validates the document and writes the card into a `.chat-components-body`:
a `<form class="card">` whose fields are native controls of the shipped
components (or a `<form class="questionnaire">` for a multi-step one), with
native constraint validation. Every text in the document is written as text -
nothing in it becomes markup, so a language model's output cannot inject any.

---

## Native Web APIs

- [`<form>` / constraint validation](https://developer.mozilla.org/en-US/docs/Web/HTML/Constraint_validation) - `required`, `min` / `max`, `pattern`, `type="email"` checked by the browser before an answer is sent
- [`SubmitEvent.submitter`](https://developer.mozilla.org/en-US/docs/Web/API/SubmitEvent/submitter) - which action sent the card
- [`<fieldset>` / `<legend>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/fieldset) - choice groups and ratings named by their label
- [`<output>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/output) - a slider's value
- [`Intl.NumberFormat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat) - amounts in the answer's sentence
- [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) - `chat-components-answer` with the typed answers
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) · [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) · [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)

---

## Structure

```html
<div class="chat-components" id="budget-card">
  <script type="application/json" class="chat-components-schema">
    {
      "schema": "component-schema",
      "version": 1,
      "id": "budget",
      "title": "Confirm the budget",
      "description": "Two things before I start.",
      "body": [
        { "type": "currency", "name": "budget", "label": "Budget", "currency": "EUR", "required": true },
        { "type": "radio", "name": "start", "label": "Start", "options": ["Now", "On Monday"], "other": "Another day" }
      ],
      "actions": [
        { "id": "confirm", "label": "Confirm", "submit": true },
        { "id": "later", "label": "Not now", "variant": "outline", "cancel": true }
      ]
    }
  </script>
  <!-- optional: start answered -->
  <script type="application/json" class="chat-components-answers">
    { "action": "confirm", "answers": { "budget": 1200, "start": "Now" } }
  </script>
</div>
```

The runtime adds `<div class="chat-components-body">` with the card - never
author it. In a chat the element sits in a Message's `.message-content`:

```html
<div class="message">
  <div class="message-avatar">
    <span class="avatar" data-size="sm"><span class="avatar-fallback">AI</span></span>
  </div>
  <div class="message-content"><div class="chat-components" id="c1">…</div></div>
</div>
```

The document's every node, the JSON Schema and the Markdown fence
(` ```ui::component-schema `) are on the Component Schema page
(`component-schema.html`); scripted conversations on Chat Scripts
(`chat-scripts.html`).

---

## Variants

| Document                 | Renders                                                                           |
| ------------------------ | --------------------------------------------------------------------------------- |
| fields + `actions`       | a Card form; a `submit` action checks the fields and sends the answers            |
| an action with `reply`   | a quick reply: it answers with its text                                           |
| an action with `cancel`  | closes the card unanswered (state `cancelled`)                                    |
| one `questionnaire` node | the Questionnaire (steps, branches, Other, review); its Send is the submit action |
| content nodes only       | a read-only card (text, list, table, facts, plan, alert, divider)                 |
| an invalid document      | a destructive Alert naming each problem's path - never a broken form              |

---

## States

| State       | Meaning                                                                                             |
| ----------- | --------------------------------------------------------------------------------------------------- |
| `default`   | Open: the fields can be answered, every action shows                                                |
| `answered`  | Sent: the fields keep the answers read only, the chosen action stays marked (`{ action, answers }`) |
| `cancelled` | Closed without an answer (`{ action }`)                                                             |

```js
document
  .querySelector('#budget-card')
  .api.setState('answered', { action: 'confirm', answers: { budget: 1200, start: 'Now' } });
```

`data-answered="answered|cancelled"` mirrors the state on the element.

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type ChatComponentsState = 'default' | 'answered' | 'cancelled'</code> - `setState(name, config)` takes the config of the state it names (`ChatComponentsStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | Open: the fields can be answered, every action shows. No config. |
| `answered` | Answered: the fields show the answers read only, the chosen action stays marked. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>action?</code></td><td><code>string</code></td><td>the action that finished it</td></tr><tr><td><code>answers?</code></td><td><code>ComponentAnswers</code></td><td>the answers (answered)</td></tr></table> |
| `cancelled` | Cancelled: closed without an answer, the chosen action stays marked. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>action?</code></td><td><code>string</code></td><td>the action that finished it</td></tr><tr><td><code>answers?</code></td><td><code>ComponentAnswers</code></td><td>the answers (answered)</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends ChatComponentsState&gt;(name: S, config?: ChatComponentsStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>ChatComponentsStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: ChatComponentsState; config: ChatComponentsStateConfigs[ChatComponentsState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: ChatComponentsState; config: ChatComponentsStateConfigs[ChatComponentsState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: ChatComponentsState; config: ChatComponentsStateConfigs[ChatComponentsState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: ChatComponentsState; config: ChatComponentsStateConfigs[ChatComponentsState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: ChatComponentsState; config: ChatComponentsStateConfigs[ChatComponentsState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.chatComponentsApi.setState&lt;S extends ChatComponentsState&gt;(el: HTMLElement, name: S, config?: ChatComponentsStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>ChatComponentsStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.chatComponentsApi.getState(el: HTMLElement): { name: ChatComponentsState; config: ChatComponentsStateConfigs[ChatComponentsState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: ChatComponentsState; config: ChatComponentsStateConfigs[ChatComponentsState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.chatComponentsApi.render(state: { name: ChatComponentsState; config: ChatComponentsStateConfigs[ChatComponentsState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: ChatComponentsState; config: ChatComponentsStateConfigs[ChatComponentsState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.chatComponentsApi.store(el: HTMLElement): Store&lt;{ name: ChatComponentsState; config: ChatComponentsStateConfigs[ChatComponentsState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: ChatComponentsState; config: ChatComponentsStateConfigs[ChatComponentsState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.chatComponentsApi.commit&lt;S extends ChatComponentsState&gt;(el: HTMLElement, name: S, config?: ChatComponentsStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>ChatComponentsStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.chatComponentsStates: ChatComponentsState[]</code> | The declared states, 'default' first: <code>default</code>, <code>answered</code>, <code>cancelled</code>. |

### `df$.shadcn.chatComponents`

| Member | Description |
|---|---|
| <code>fence: string</code> | The Markdown fence info string of a Component Schema document: "ui::component-schema". |
| <code>validate(spec: unknown): ComponentProblem[]</code> | Check a Component Schema document - errors keep a card from showing, warnings (unknown keys) are reported only. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>spec</code></td><td><code>unknown</code></td><td>the document (any parsed JSON)</td></tr></table> <b>Returns</b> <code>ComponentProblem[]</code> - the problems, each with its JSON path; empty when the document is fine |
| <code>markup(spec: ComponentSchema, options?: { id?: string; answers?: ChatComponentsResult \| null }): string</code> | The markup of a .chat-components element for a document - append it to a message (Session.append); the runtime builds the card. Pass answers to show it answered. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>spec</code></td><td><code>ComponentSchema</code></td><td>the Component Schema document</td></tr><tr><td><code>options?</code></td><td><code>{ id?: string; answers?: ChatComponentsResult \| null }</code></td><td>id: the element's id (generated when missing); answers: { action, answers } to start answered</td></tr></table> <b>Returns</b> <code>string</code> - the element's markup |
| <code>mount(target: string \| HTMLElement, spec: ComponentSchema): void</code> | Show another document in a card: it is rebuilt and opens again. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .chat-components element or its selector</td></tr><tr><td><code>spec</code></td><td><code>ComponentSchema</code></td><td>the new document</td></tr></table> |
| <code>answers(target: string \| HTMLElement): ComponentAnswers</code> | The answers the card's fields hold now, typed by the document. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .chat-components element or its selector</td></tr></table> <b>Returns</b> <code>ComponentAnswers</code> - every field's answer by name |
| <code>summary(spec: ComponentSchema, answers: ComponentAnswers, action?: string): string</code> | The answers of a document as one readable sentence. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>spec</code></td><td><code>ComponentSchema</code></td><td>the document</td></tr><tr><td><code>answers</code></td><td><code>ComponentAnswers</code></td><td>its answers</td></tr><tr><td><code>action?</code></td><td><code>string</code></td><td>the action that finished it (a quick reply's text when there are no fields)</td></tr></table> <b>Returns</b> <code>string</code> - a sentence such as "Budget: €12,000.00; Start: On Monday" |
| <code>jsonSchema(): Record&lt;string, unknown&gt;</code> | The Component Schema as a JSON Schema object (draft 2020-12) - for a tool definition or a structured output. <b>Returns</b> <code>Record&lt;string, unknown&gt;</code> - the JSON Schema |
| <code>tool(name?: string): Record&lt;string, unknown&gt;</code> | An OpenAI-style function tool whose arguments are a Component Schema document. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name?</code></td><td><code>string</code></td><td>the tool's name (default "show_components")</td></tr></table> <b>Returns</b> <code>Record&lt;string, unknown&gt;</code> - } |
| <code>fences(markdown: string): ComponentSchemaFence[]</code> | Find ```ui::component-schema fences in Markdown (an answer while it streams too). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>markdown</code></td><td><code>string</code></td><td>the text</td></tr></table> <b>Returns</b> <code>ComponentSchemaFence[]</code> - each fence with its place, source, parsed document and whether it is closed |

### `df$.shadcn.chatScript`

| Member | Description |
|---|---|
| <code>create(script: ChatScript, hooks?: ChatScriptHooks, state?: ChatScriptState \| null): ChatScriptRun</code> | A script's run driven through hooks - the host keeps its own transcript (say, ask, user, rewind). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>script</code></td><td><code>ChatScript</code></td><td>the scripted conversation</td></tr><tr><td><code>hooks?</code></td><td><code>ChatScriptHooks</code></td><td>how the run reaches the page</td></tr><tr><td><code>state?</code></td><td><code>ChatScriptState \| null</code></td><td>a state() to resume from</td></tr></table> <b>Returns</b> <code>ChatScriptRun</code> - the run: start(), reply(), answer(), back(), restart(), state() |
| <code>run(target: string \| HTMLElement, script: ChatScript, options?: ChatScriptRunOptions): ChatScriptRun</code> | Run a script in a Session: bot rows, a typing indicator, cards, the reader's answers - and a composer for free text. It starts at once (or resumes what persist kept). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .session element or its selector</td></tr><tr><td><code>script</code></td><td><code>ChatScript</code></td><td>the scripted conversation</td></tr><tr><td><code>options?</code></td><td><code>ChatScriptRunOptions</code></td><td>composer, bot, delay, echo, persist, on</td></tr></table> <b>Returns</b> <code>ChatScriptRun</code> - the run |
| <code>validate(script: ChatScript): ComponentProblem[]</code> | Check a script: a missing start, nodes leading nowhere, cards that do not validate. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>script</code></td><td><code>ChatScript</code></td><td>the scripted conversation</td></tr></table> <b>Returns</b> <code>ComponentProblem[]</code> - the problems, each with its path |

### Events

| Event | Description |
|---|---|
| `chat-components-answer` | Fires when the reader finishes a card - an action, a quick reply, or a questionnaire's Send: the answers, typed. <code>detail</code>: <code>ChatComponentsAnswerDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>id</code></td><td><code>string</code></td><td>the document's id ('' without one)</td></tr><tr><td><code>action</code></td><td><code>string</code></td><td>the action that finished the card</td></tr><tr><td><code>answers</code></td><td><code>ComponentAnswers</code></td><td>the answers, typed by the document's fields</td></tr><tr><td><code>reply</code></td><td><code>string \| null</code></td><td>a quick reply's text, else null</td></tr><tr><td><code>summary</code></td><td><code>string</code></td><td>one readable sentence of the answers - for the transcript and a language model</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `ChatComponentsAnswerDetail` | What chat-components-answer carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>id</code></td><td><code>string</code></td><td>the document's id ('' without one)</td></tr><tr><td><code>action</code></td><td><code>string</code></td><td>the action that finished the card</td></tr><tr><td><code>answers</code></td><td><code>ComponentAnswers</code></td><td>the answers, typed by the document's fields</td></tr><tr><td><code>reply</code></td><td><code>string \| null</code></td><td>a quick reply's text, else null</td></tr><tr><td><code>summary</code></td><td><code>string</code></td><td>one readable sentence of the answers - for the transcript and a language model</td></tr></table> |
| `ChatComponentsResult` | How a card was finished - the config of the answered and cancelled states. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>action?</code></td><td><code>string</code></td><td>the action that finished it</td></tr><tr><td><code>answers?</code></td><td><code>ComponentAnswers</code></td><td>the answers (answered)</td></tr></table> |
| `ChatScript` | A scripted conversation (version 1). <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>version</code></td><td><code>number</code></td><td>the format's version: 1</td></tr><tr><td><code>id?</code></td><td><code>string</code></td><td>names the script</td></tr><tr><td><code>start</code></td><td><code>string</code></td><td>the first node</td></tr><tr><td><code>nodes</code></td><td><code>Record&lt;string, ChatScriptNode&gt;</code></td><td>the nodes by id</td></tr><tr><td><code>fallback?</code></td><td><code>string</code></td><td>said when the reader types while the bot waits for a card (default: a hint to use it)</td></tr></table> |
| `ChatScriptHooks` | How a script reaches the page - a host keeps its own transcript through these. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>say?</code></td><td><code>(text: string, node: string) =&gt; void</code></td><td>the bot says a line</td></tr><tr><td><code>ask?</code></td><td><code>(spec: ComponentSchema, node: string) =&gt; void</code></td><td>the bot asks with a card</td></tr><tr><td><code>user?</code></td><td><code>(text: string, node: string) =&gt; void</code></td><td>the reader's turn (their text, or a card's summary)</td></tr><tr><td><code>typing?</code></td><td><code>(on: boolean) =&gt; void</code></td><td>the bot is typing (true) or done (false)</td></tr><tr><td><code>rewind?</code></td><td><code>(rows: number) =&gt; void</code></td><td>keep only the first `rows` turns (back() and restart() rewind)</td></tr><tr><td><code>step?</code></td><td><code>(node: string, answers: ComponentAnswers) =&gt; void</code></td><td>a node was entered</td></tr><tr><td><code>end?</code></td><td><code>(answers: ComponentAnswers, history: string[]) =&gt; void</code></td><td>the conversation reached an end node</td></tr></table> |
| `ChatScriptMatch` | A free-text route: the first match decides where the conversation goes. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>pattern?</code></td><td><code>string</code></td><td>a regular expression tested on the reader's text (case-insensitive); omitted: any text</td></tr><tr><td><code>goto</code></td><td><code>string</code></td><td>the node it leads to</td></tr></table> |
| `ChatScriptNode` | A node of a script: what the bot says, how it asks, where it goes next. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>say?</code></td><td><code>string \| string[]</code></td><td>the bot's lines ({{name}} is filled from the answers; inline **bold** and `code`)</td></tr><tr><td><code>ask?</code></td><td><code>ComponentSchema</code></td><td>ask with Chat Components: a Component Schema document</td></tr><tr><td><code>input?</code></td><td><code>string</code></td><td>ask for free text: the composer's next message is the answer under this name</td></tr><tr><td><code>match?</code></td><td><code>ChatScriptMatch[]</code></td><td>routes for free text (also typed while a card is open)</td></tr><tr><td><code>branches?</code></td><td><code>Array&lt;{ when: unknown; goto: string }&gt;</code></td><td>the Questionnaire's grammar: the first branch whose when holds is taken</td></tr><tr><td><code>next?</code></td><td><code>string</code></td><td>the node after this one</td></tr><tr><td><code>end?</code></td><td><code>boolean</code></td><td>the conversation ends here</td></tr></table> |
| `ChatScriptRun` | A running script. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>start</code></td><td><code>() =&gt; Promise&lt;void&gt;</code></td><td>start (or resume from the state given to create)</td></tr><tr><td><code>reply</code></td><td><code>(text: string) =&gt; Promise&lt;void&gt;</code></td><td>the reader typed text: an input's answer, or routed by match</td></tr><tr><td><code>answer</code></td><td><code>(detail: ChatComponentsAnswerDetail) =&gt; Promise&lt;void&gt;</code></td><td>the reader finished the current card (the chat-components-answer detail)</td></tr><tr><td><code>back</code></td><td><code>() =&gt; Promise&lt;boolean&gt;</code></td><td>back to the last question asked - its turns and answers undone</td></tr><tr><td><code>restart</code></td><td><code>() =&gt; Promise&lt;void&gt;</code></td><td>from the start, with no answers</td></tr><tr><td><code>state</code></td><td><code>() =&gt; ChatScriptState</code></td><td>where the run stands (a copy)</td></tr></table> |
| `ChatScriptRunOptions` | How chatScript.run() writes a conversation into a Session. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>composer?</code></td><td><code>string \| HTMLElement</code></td><td>the composer: a form whose textarea the reader types in (Enter sends)</td></tr><tr><td><code>bot?</code></td><td><code>{ name?: string; initials?: string }</code></td><td>the bot's name and its avatar letters</td></tr><tr><td><code>delay?</code></td><td><code>boolean</code></td><td>typing pauses: false for none (reduced motion has none)</td></tr><tr><td><code>persist?</code></td><td><code>string</code></td><td>keep the conversation in storage under this key (local storage)</td></tr><tr><td><code>on?</code></td><td><code>{ step?: ChatScriptHooks['step']; end?: ChatScriptHooks['end'] }</code></td><td>the hooks' extra listeners: step and end</td></tr></table> |
| `ChatScriptState` | Where a run stands - what state() returns and create() resumes from. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>node</code></td><td><code>string</code></td><td>the current node</td></tr><tr><td><code>answers</code></td><td><code>ComponentAnswers</code></td><td>every answer so far</td></tr><tr><td><code>history</code></td><td><code>string[]</code></td><td>the nodes entered, in order</td></tr><tr><td><code>waiting</code></td><td><code>'text' \| 'components' \| 'end' \| 'busy'</code></td><td>what the run waits for</td></tr><tr><td><code>rows</code></td><td><code>number</code></td><td>the turns written so far (for rewind)</td></tr><tr><td><code>marks</code></td><td><code>Array&lt;{ rows: number; answers: ComponentAnswers }&gt;</code></td><td>per history entry: the turns and the answers when it was entered</td></tr></table> |
| `ComponentAction` | A button of a card. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>id</code></td><td><code>string</code></td><td>names the action in the answer</td></tr><tr><td><code>label</code></td><td><code>string</code></td><td>the button's text</td></tr><tr><td><code>variant?</code></td><td><code>'default' \| 'secondary' \| 'outline' \| 'ghost' \| 'destructive'</code></td><td>the Button variant</td></tr><tr><td><code>submit?</code></td><td><code>boolean</code></td><td>checks the fields and sends the answers</td></tr><tr><td><code>reply?</code></td><td><code>string</code></td><td>a quick reply: the text it answers with</td></tr><tr><td><code>cancel?</code></td><td><code>boolean</code></td><td>ends the card without an answer (the cancelled state)</td></tr></table> |
| `ComponentAnswer` | One answer: a text, a number, a yes / no, the picked values of a group, null when unanswered. = <code>string \| number \| boolean \| string[] \| null</code> |
| `ComponentAnswers` | Every answer of a card, by field name. = <code>Record&lt;string, ComponentAnswer&gt;</code> |
| `ComponentBranch` | A branch of a questionnaire: when the answers hold the condition, go to a step. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>when</code></td><td><code>unknown</code></td><td>the Questionnaire's condition grammar: { field, op, value }, a list (all hold) or { any } / { all }</td></tr><tr><td><code>goto</code></td><td><code>string</code></td><td>the step it leads to</td></tr></table> |
| `ComponentFact` | A row of a facts list. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>label</code></td><td><code>string</code></td><td>the term</td></tr><tr><td><code>value</code></td><td><code>string \| number</code></td><td>its value</td></tr></table> |
| `ComponentNode` | One node of a card's body. Which fields apply depends on its type - the Component Schema page lists them. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>type</code></td><td><code>ComponentNodeType</code></td><td>what the node is</td></tr><tr><td><code>name?</code></td><td><code>string</code></td><td>a field's answer name (letters, digits, - and _); a checkable plan's too</td></tr><tr><td><code>label?</code></td><td><code>string</code></td><td>a field's label; a table's caption</td></tr><tr><td><code>hint?</code></td><td><code>string</code></td><td>a short help line under a field</td></tr><tr><td><code>text?</code></td><td><code>string</code></td><td>the text of a text node or an alert (inline **bold**, *emphasis* and `code`)</td></tr><tr><td><code>title?</code></td><td><code>string</code></td><td>an alert's or a questionnaire's title</td></tr><tr><td><code>tone?</code></td><td><code>'default' \| 'destructive'</code></td><td>an alert's tone</td></tr><tr><td><code>items?</code></td><td><code>string[]</code></td><td>a list's items</td></tr><tr><td><code>ordered?</code></td><td><code>boolean</code></td><td>a list: numbered</td></tr><tr><td><code>columns?</code></td><td><code>string[]</code></td><td>a table's column headings</td></tr><tr><td><code>rows?</code></td><td><code>Array&lt;Array&lt;string \| number&gt;&gt;</code></td><td>a table's rows</td></tr><tr><td><code>facts?</code></td><td><code>ComponentFact[]</code></td><td>a facts list's rows</td></tr><tr><td><code>steps?</code></td><td><code>ComponentStep[]</code></td><td>a plan's or a questionnaire's steps</td></tr><tr><td><code>required?</code></td><td><code>boolean</code></td><td>a field must be answered</td></tr><tr><td><code>default?</code></td><td><code>ComponentAnswer</code></td><td>a field's starting answer</td></tr><tr><td><code>placeholder?</code></td><td><code>string</code></td><td>a field's placeholder text</td></tr><tr><td><code>inputType?</code></td><td><code>'text' \| 'email' \| 'url' \| 'tel' \| 'time'</code></td><td>an input's kind</td></tr><tr><td><code>min?</code></td><td><code>number \| string</code></td><td>the lowest number, amount, slider value or date (YYYY-MM-DD)</td></tr><tr><td><code>max?</code></td><td><code>number \| string</code></td><td>the highest number, amount, slider value or date; a rating's number of stars (default 5)</td></tr><tr><td><code>step?</code></td><td><code>number</code></td><td>a number's or a slider's step</td></tr><tr><td><code>unit?</code></td><td><code>string</code></td><td>a number's unit, shown beside it (h, kg, %)</td></tr><tr><td><code>currency?</code></td><td><code>string</code></td><td>a currency field: the ISO 4217 code (EUR, USD, JPY)</td></tr><tr><td><code>locale?</code></td><td><code>string</code></td><td>a currency field: the locale that formats it (default: the page's language)</td></tr><tr><td><code>minLength?</code></td><td><code>number</code></td><td>an input's or a textarea's shortest answer</td></tr><tr><td><code>maxLength?</code></td><td><code>number</code></td><td>an input's or a textarea's longest answer</td></tr><tr><td><code>pattern?</code></td><td><code>string</code></td><td>an input's pattern (a regular expression the whole answer must match)</td></tr><tr><td><code>lines?</code></td><td><code>number</code></td><td>a textarea's height in lines</td></tr><tr><td><code>options?</code></td><td><code>Array&lt;string \| ComponentOption&gt;</code></td><td>a select's, a radio group's or a checkbox group's choices (a string is value and label)</td></tr><tr><td><code>other?</code></td><td><code>string</code></td><td>a radio or checkbox group: the label of a free-text "Other" choice</td></tr><tr><td><code>branches?</code></td><td><code>Record&lt;string, ComponentBranch[]&gt;</code></td><td>a questionnaire: branches per step id, tried before the step's next</td></tr><tr><td><code>autoAdvance?</code></td><td><code>boolean</code></td><td>a questionnaire: a single choice moves on once picked</td></tr><tr><td><code>review?</code></td><td><code>string</code></td><td>a questionnaire: the title of its review step (default "Check your answers")</td></tr></table> |
| `ComponentNodeType` | What a node is: content to read (text, list, table, facts, plan, alert, divider), a field to answer, or a questionnaire - several steps of fields. = <code>'text' \| 'list' \| 'table' \| 'facts' \| 'plan' \| 'alert' \| 'divider' \| 'input' \| 'textarea' \| 'number' \| 'currency' \| 'select' \| 'radio' \| 'checkbox' \| 'switch' \| 'slider' \| 'rating' \| 'date' \| 'questionnaire'</code> |
| `ComponentOption` | A choice of a select, a radio group or a checkbox group. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value</code></td><td><code>string</code></td><td>the answer it gives</td></tr><tr><td><code>label?</code></td><td><code>string</code></td><td>what the reader sees (default: the value)</td></tr><tr><td><code>description?</code></td><td><code>string</code></td><td>a second line under the label</td></tr><tr><td><code>goto?</code></td><td><code>string</code></td><td>in a questionnaire step: the step this choice leads to</td></tr></table> |
| `ComponentProblem` | A problem validate() found. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>path</code></td><td><code>string</code></td><td>where: a JSON path such as body[2].options</td></tr><tr><td><code>message</code></td><td><code>string</code></td><td>what is wrong</td></tr><tr><td><code>level</code></td><td><code>'error' \| 'warning'</code></td><td>an error keeps the card from showing; a warning is reported only</td></tr></table> |
| `ComponentSchema` | A Component Schema document - what a chat shows: a card of content, fields and actions (version 1). <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>schema?</code></td><td><code>'component-schema'</code></td><td>marks the document: "component-schema"</td></tr><tr><td><code>version</code></td><td><code>number</code></td><td>the format's version: 1</td></tr><tr><td><code>id?</code></td><td><code>string</code></td><td>names the card - its answer carries it</td></tr><tr><td><code>title?</code></td><td><code>string</code></td><td>the card's title</td></tr><tr><td><code>description?</code></td><td><code>string</code></td><td>a line under the title</td></tr><tr><td><code>body?</code></td><td><code>ComponentNode[]</code></td><td>what the card shows, top to bottom</td></tr><tr><td><code>actions?</code></td><td><code>ComponentAction[]</code></td><td>its buttons (default: Send when it has fields)</td></tr></table> |
| `ComponentSchemaFence` | A Component Schema fence found in Markdown. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>start</code></td><td><code>number</code></td><td>where the fence starts in the text</td></tr><tr><td><code>end</code></td><td><code>number</code></td><td>where it ends (after its closing line; the text's length while it is still open)</td></tr><tr><td><code>source</code></td><td><code>string</code></td><td>the JSON between the fence lines</td></tr><tr><td><code>spec</code></td><td><code>ComponentSchema \| null</code></td><td>the parsed document, null when the JSON does not parse</td></tr><tr><td><code>closed</code></td><td><code>boolean</code></td><td>false while the fence is still being written (no closing line yet)</td></tr><tr><td><code>error</code></td><td><code>string</code></td><td>the JSON parse error, '' when it parses</td></tr></table> |
| `ComponentStep` | A step of a plan, or a step of a questionnaire. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>id?</code></td><td><code>string</code></td><td>the step's id (a questionnaire's steps need one; a checkable plan answers with them)</td></tr><tr><td><code>title</code></td><td><code>string</code></td><td>what the step says or asks</td></tr><tr><td><code>description?</code></td><td><code>string</code></td><td>a second line under the title</td></tr><tr><td><code>fields?</code></td><td><code>ComponentNode[]</code></td><td>a questionnaire step: its fields</td></tr><tr><td><code>optional?</code></td><td><code>boolean</code></td><td>a questionnaire step: may be skipped</td></tr><tr><td><code>next?</code></td><td><code>string</code></td><td>a questionnaire step: the step after it (default: the next one)</td></tr></table> |

---

## ARIA

| Element                  | Attribute                          | Notes                                    |
| ------------------------ | ---------------------------------- | ---------------------------------------- |
| `.chat-components`       | `aria-label`                       | the document's title (set by `markup()`) |
| the card form            | `aria-labelledby`                  | its title, when it has one               |
| a field                  | `<label for>` / `aria-describedby` | its label and its hint                   |
| a choice group, a rating | `<fieldset>` + `<legend>`          | the group's label                        |
| the chosen action        | `aria-pressed="true"`              | after the answer                         |
| an invalid document      | `role="alert"`                     | the Alert listing the problems           |

---

## Notes

- Answers are typed by the document: number, currency, slider and rating answer
  numbers; a switch and a single checkbox `true` / `false`; a checkbox group and
  a checkable plan a list; an empty field `null`. An "Other" choice answers
  `"other"` under its name and the text under `<name>Other`.
- The answer event `chat-components-answer` bubbles; its `summary` is one
  readable sentence - put it in the transcript as the reader's turn and hand it
  (with the JSON answers) to a language model.
- A questionnaire inside a card keeps no draft (`data-persist="none"`) - the
  conversation's own store keeps the answer.
- `df$.shadcn.chatComponents.fences(markdown)` finds the documents a language
  model wrote in ` ```ui::component-schema ` fences; `tool()` is the same
  document as an OpenAI-style function tool.
- Composes Card, Label, Input, Textarea, Number Input, Select, Radio Group,
  Checkbox, Switch, Slider, Rating, Questionnaire, Table, Alert, Separator and
  Button - their scripts must be loaded (all.js does).
