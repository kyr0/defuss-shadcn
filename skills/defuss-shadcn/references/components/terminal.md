---
name: Terminal
type: ATM
section: mockup
why: The official xterm.js renders and edits the cells (selection, scrollback, links, the clipboard, screen-reader mode); the component adds a shell to it - a prompt, a line editor with history and completion, commands from a registry - a replayed session, the system's tokens as its colours and a State API, from one element.
when: An interactive command line - a shell on a developer's site, a mock DOS or Unix app in a desktop, a REPL or a log that streams into a live terminal. A transcript that only has to be read (install steps, CLI docs, a diff) takes the Code Mockup - no script, copyable text.
where: dist/components/terminal/terminal.css + dist/components/terminal/terminal.js (the extra bundle terminal.css / terminal.js)
supportedStates: default, running, readonly
roots: ".terminal"
---

# Terminal

## Native basis

One `<div class="terminal">`. The runtime adds a `.terminal-screen` and opens the official
[xterm.js](https://xtermjs.org) 6.0.0 in it (with its fit, clipboard, serialize and web-links addons, pinned jsDelivr
builds loaded by the first terminal), then runs a small shell on it: a prompt (`data-prompt`), a line editor and the
commands the page registers. A `<script type="application/json" class="terminal-script">` child replays a session -
commands typed at the prompt and their output.

## Native Web APIs

- [ES modules - dynamic `import()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import) - xterm.js and its addons load with the first terminal, never on a page without one
- [`ResizeObserver`](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) - the screen fits its box on every resize (the fit addon proposes the columns and rows)
- [`IntersectionObserver`](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver) - `data-autoplay` replays the session when the terminal first comes into view
- [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) - Ctrl+C aborts the running command (its handler gets the signal)
- [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) - `terminal-command` before a line runs (cancelable), `terminal-ready` once open
- [Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API) - the clipboard addon answers OSC 52 (a program copies or pastes)
- [Custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*) + [`color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix) - the colours xterm paints with, set by the variants from the tokens; the browser converts any colour syntax
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion), [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast), [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - no blinking cursor and no typing, a brighter text, the system colours

## Structure

```html
<div class="terminal" id="shell" aria-label="A shell - type help" data-prompt="$ " data-title="bash"></div>
```

A replayed session: each step is typed at the prompt and answered by its `output` (or by the command, when it has
none). `data-autoplay` plays it when the terminal first shows (after that many ms); a key press finishes it at once.

```html
<div class="terminal" aria-label="A shell" data-prompt="~ % " data-rows="8" data-autoplay="400">
  <script type="application/json" class="terminal-script">
    [
      { "command": "whoami", "output": "sam - infrastructure engineer", "tone": "success" },
      { "command": "help" }
    ]
  </script>
</div>
```

The page's commands, through the namespace - a handler returns its output (text, lines, or a promise of them) or
writes through its context:

```html
<script type="module">
  df$.shadcn.terminal.commands('shell', {
    date: () => new Date().toDateString(),
    greet: { description: 'says hello', run: ({ args }) => `Hello, ${args[0] ?? 'world'}!` },
  });
</script>
```

## Window (on `.terminal`)

| Attribute | Meaning |
|-----------|---------|
| `data-chrome="mac"` | Red / amber / green dots |
| `data-chrome="none"` | No bar - the screen fills the element (a window of its own around it) |
| `data-title="…"` | A centered title in the bar |
| `data-rows="n"` | n rows high (the width fits); without it the screen fills the element (`--terminal-height`, default 20rem) |
| `aria-label` | The terminal's name - also the input's |

## Shell (on `.terminal`)

| Attribute | Meaning |
|-----------|---------|
| `data-prompt` | The prompt (default `$ `) - `~ % `, a DOS prompt; a command changes it with `prompt()` |
| `data-prompt-tone` | The prompt's tone: `success` · `warning` · `info` · `destructive` · `muted` · `bold` |
| `data-not-found` | The answer to an unknown command; `{name}` is the name (default `{name}: command not found`) |
| `data-autoplay="ms"` | Replays `script.terminal-script` when the terminal first shows, after that many ms |
| `data-speed="ms"` | Typing speed of a replay, ms per character (default 45) |
| `data-readonly` | Output only: no prompt, no input (the `readonly` state) - a log, a replay to watch |
| `data-cursor` | `block` (default) · `bar` · `underline` |
| `data-blink="false"` | A steady cursor (always steady with reduced motion) |
| `data-scrollback` | Lines kept above the screen (default 1000) |
| `data-screen-reader` | xterm's screen-reader mode: the output in a live region, the rows in an accessibility tree |

## Script steps (`script.terminal-script`, a JSON array)

| Field | Meaning |
|-------|---------|
| `command` | Typed at the prompt, then run - answered by `output` when the step has one, else by the command |
| `output` | Text written (after the command, or alone); an array is one line each |
| `tone` | The output's tone |
| `wait` | ms before the step |
| `typing: false` | The command appears at once |

## Built-in commands

`help` (lists the commands, `help <name>` one of them), `clear`, `echo`, `history`. A command the page registers
with the same name takes its place; commands are found as typed, else in lower case (`DIR` finds `dir`).

## Keys (the input focused)

| Key | Does |
|-----|------|
| Enter | Runs the line |
| Left, Right / Home, End (Ctrl+A / Ctrl+E) | Move in the line |
| Backspace / Delete | Delete before / at the cursor |
| Up, Down | The history |
| Tab | Completes the command's name (several matches are listed) - on an empty line it moves the focus on |
| Shift+Tab | Moves the focus back |
| Ctrl+C | Aborts the running command, or drops the line |
| Ctrl+L | Clears the screen |
| Ctrl+U | Deletes the line before the cursor |
| any key | Finishes a replay at once |

## Variants (`data-variant`)

| Value | Look |
|-------|------|
| *(none)* | A dark screen in every theme - the Code Mockup's palette |
| `muted` | The page's muted surface and text (light in light mode); the ANSI colours mixed toward the text |
| `dos` | A PC's text mode: the 16 colours on black, square corners, an underline cursor |

Every colour is a custom property the runtime reads (`--terminal-background`, `-foreground`, `-cursor`,
`-cursor-accent`, `-selection`, `--terminal-black` ... `--terminal-bright-white`), with `--terminal-cursor-style`
and `--terminal-line-height` - set any of them on the element, a theme change is followed.

## Sizes (`data-size`)

| Value | Font size |
|-------|-----------|
| `sm` | 0.75rem |
| *(none)* | 0.875rem |
| `lg` | 1rem |

## ARIA

| Attribute | Element | Notes |
|-----------|---------|-------|
| `aria-label` | `.terminal` | Authored; the runtime gives xterm's input the same name |
| `aria-busy="true"` | `.terminal` | While a command or a replay runs (`running`) |
| `data-readonly` | `.terminal` | The `readonly` state - xterm takes no input |
| live region, accessibility tree | xterm | With `data-screen-reader` (xterm's screen-reader mode) |

## States

| State | Meaning |
|-------|---------|
| `default` | A prompt that takes input (`{ prompt }` sets `data-prompt`) |
| `running` | A command runs - `setState('running', { command })` runs it as if typed; without a command the script replays. Lands in `default` |
| `readonly` | Output only: no prompt, no input (`data-readonly`) |

```js
const term = document.querySelector('#shell');
term.api.setState('running', { command: 'help' }); // typed and run
await term.api.settled();
df$.shadcn.terminal.text(term); // what the screen shows, as text
```

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type TerminalState = 'default' | 'running' | 'readonly'</code> - `setState(name, config)` takes the config of the state it names (`TerminalStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | A prompt that takes input. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>prompt?</code></td><td><code>string</code></td><td>the prompt text (written to data-prompt)</td></tr></table> |
| `running` | A command runs (setState runs it as if typed) - or, without one, the script replays. Lands in default. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>command?</code></td><td><code>string</code></td><td>the command line to run</td></tr></table> |
| `readonly` | Output only: no prompt, no input (data-readonly). No config. |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends TerminalState&gt;(name: S, config?: TerminalStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>TerminalStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: TerminalState; config: TerminalStateConfigs[TerminalState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: TerminalState; config: TerminalStateConfigs[TerminalState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: TerminalState; config: TerminalStateConfigs[TerminalState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: TerminalState; config: TerminalStateConfigs[TerminalState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: TerminalState; config: TerminalStateConfigs[TerminalState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.terminalApi.setState&lt;S extends TerminalState&gt;(el: HTMLElement, name: S, config?: TerminalStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>TerminalStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.terminalApi.getState(el: HTMLElement): { name: TerminalState; config: TerminalStateConfigs[TerminalState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: TerminalState; config: TerminalStateConfigs[TerminalState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.terminalApi.render(state: { name: TerminalState; config: TerminalStateConfigs[TerminalState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: TerminalState; config: TerminalStateConfigs[TerminalState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.terminalApi.store(el: HTMLElement): Store&lt;{ name: TerminalState; config: TerminalStateConfigs[TerminalState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: TerminalState; config: TerminalStateConfigs[TerminalState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.terminalApi.commit&lt;S extends TerminalState&gt;(el: HTMLElement, name: S, config?: TerminalStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>TerminalStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.terminalStates: TerminalState[]</code> | The declared states, 'default' first: <code>default</code>, <code>running</code>, <code>readonly</code>. |

### `df$.shadcn.terminal`

| Member | Description |
|---|---|
| <code>load(): Promise&lt;void&gt;</code> | Imports the official xterm.js build, its addons and its stylesheet (the first terminal does it by itself). <b>Returns</b> <code>Promise&lt;void&gt;</code> - once they have loaded |
| <code>configure(options: { urls?: Partial&lt;TerminalUrls&gt; }): void</code> | Where the vendor files come from - call it before the first terminal opens to self-host them. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>options</code></td><td><code>{ urls?: Partial&lt;TerminalUrls&gt; }</code></td><td>the URLs to use instead of the pinned jsDelivr ones (any subset)</td></tr></table> |
| <code>write(target: string \| HTMLElement, text: string): Promise&lt;void&gt;</code> | Writes text: above the prompt while one waits (the line being typed stays), else where the cursor is. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .terminal element, its id or a selector</td></tr><tr><td><code>text</code></td><td><code>string</code></td><td>the text ("\n" starts a new line; VT sequences and tone() work)</td></tr></table> <b>Returns</b> <code>Promise&lt;void&gt;</code> - once it is on screen |
| <code>writeln(target: string \| HTMLElement, text: string = ''): Promise&lt;void&gt;</code> | Writes a line - write() with a new line after it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .terminal element, its id or a selector</td></tr><tr><td><code>text</code></td><td><code>string</code> = <code>''</code></td><td>the line</td></tr></table> <b>Returns</b> <code>Promise&lt;void&gt;</code> - once it is on screen |
| <code>clear(target: string \| HTMLElement): Promise&lt;void&gt;</code> | Clears the screen and the scrollback; a waiting prompt is drawn again at the top. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .terminal element, its id or a selector</td></tr></table> <b>Returns</b> <code>Promise&lt;void&gt;</code> - once it is clear |
| <code>run(target: string \| HTMLElement, line: string): Promise&lt;void&gt;</code> | Runs a command line as if it were typed at the prompt (the State API's running state does the same). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .terminal element, its id or a selector</td></tr><tr><td><code>line</code></td><td><code>string</code></td><td>the command line</td></tr></table> <b>Returns</b> <code>Promise&lt;void&gt;</code> - once the command has run and a prompt waits again |
| <code>play(target: string \| HTMLElement, steps?: TerminalStep[]): Promise&lt;void&gt;</code> | Replays a session: commands typed at the prompt and their output (a key finishes it at once). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .terminal element, its id or a selector</td></tr><tr><td><code>steps?</code></td><td><code>TerminalStep[]</code></td><td>the steps (default: the element's script.terminal-script)</td></tr></table> <b>Returns</b> <code>Promise&lt;void&gt;</code> - once the session has played |
| <code>commands(target: 'global' \| string \| HTMLElement, commands: Record&lt;string, TerminalCommand \| TerminalCommandSpec&gt;): (() =&gt; void)</code> | Adds commands - to one terminal, or to every terminal on the page with 'global'. A name the terminal knows already (a built-in too) takes the new command. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>'global' \| string \| HTMLElement</code></td><td>'global', or the .terminal element, its id or a selector</td></tr><tr><td><code>commands</code></td><td><code>Record&lt;string, TerminalCommand \| TerminalCommandSpec&gt;</code></td><td>each name with its handler, or with { run, description, hidden }</td></tr></table> <b>Returns</b> <code>(() =&gt; void)</code> - a function that removes them again |
| <code>prompt(target: string \| HTMLElement, text: string): void</code> | Sets the prompt (data-prompt) - a waiting prompt changes at once. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .terminal element, its id or a selector</td></tr><tr><td><code>text</code></td><td><code>string</code></td><td>the prompt text</td></tr></table> |
| <code>text(target: string \| HTMLElement): string</code> | The screen and the scrollback as plain text (lines trimmed at the end, trailing empty lines left out). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .terminal element, its id or a selector</td></tr></table> <b>Returns</b> <code>string</code> - the text ('' before the terminal has opened) |
| <code>serialize(target: string \| HTMLElement, format: 'html' \| 'vt' = 'html'): string</code> | The screen and the scrollback serialized by the serialize addon - as HTML (colours inline) or as VT sequences. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .terminal element, its id or a selector</td></tr><tr><td><code>format</code></td><td><code>'html' \| 'vt'</code> = <code>'html'</code></td><td>'html' (default) or 'vt'</td></tr></table> <b>Returns</b> <code>string</code> - the serialized buffer ('' before the terminal has opened) |
| <code>focus(target: string \| HTMLElement): void</code> | Focuses the terminal's input. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .terminal element, its id or a selector</td></tr></table> |
| <code>tone(text: string, tone: TerminalTone): string</code> | Text in a tone, as the VT sequences xterm draws in the theme's colours. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>text</code></td><td><code>string</code></td><td>the text</td></tr><tr><td><code>tone</code></td><td><code>TerminalTone</code></td><td>success, warning, info, destructive, muted or bold</td></tr></table> <b>Returns</b> <code>string</code> - the text wrapped in the tone's SGR sequence (unchanged for an unknown tone) |
| <code>xterm(target: string \| HTMLElement): Promise&lt;XtermLike&gt;</code> | The xterm.js Terminal behind the element - for what this API does not cover. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .terminal element, its id or a selector</td></tr></table> <b>Returns</b> <code>Promise&lt;XtermLike&gt;</code> - the instance, once the terminal has opened |
| <code>theme(target: string \| HTMLElement): Record&lt;string, string&gt;</code> | The xterm theme the element's --terminal-* custom properties describe. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .terminal element, its id or a selector</td></tr></table> <b>Returns</b> <code>Record&lt;string, string&gt;</code> - xterm's theme (colours as rgba()), {} for no terminal |
| <code>url: string</code> | The pinned official xterm.js build the component loads (always this exact version). |

### Events

| Event | Description |
|---|---|
| `terminal-command` | Fires when a command line is submitted, before it runs - preventDefault() keeps the terminal from running it (the page answers through write()). <code>detail</code>: <code>TerminalCommandDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>line</code></td><td><code>string</code></td><td>the whole line</td></tr><tr><td><code>name</code></td><td><code>string</code></td><td>the command's name (the first word)</td></tr><tr><td><code>args</code></td><td><code>string[]</code></td><td>the words after it</td></tr></table> |
| `terminal-ready` | Fires once the xterm is open and sized - its columns and rows. <code>detail</code>: <code>TerminalReadyDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>cols</code></td><td><code>number</code></td><td>columns</td></tr><tr><td><code>rows</code></td><td><code>number</code></td><td>rows</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `TerminalCommand` | A command: what it returns (text, lines, or a promise of them) is written after it. = <code>(context: TerminalCommandContext,) =&gt; string \| string[] \| void \| Promise&lt;string \| string[] \| void&gt;</code> |
| `TerminalCommandContext` | What a command handler gets: its words, the line, ways to write, and a signal that Ctrl+C aborts. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>string</code></td><td>the command's name as typed (the first word)</td></tr><tr><td><code>args</code></td><td><code>string[]</code></td><td>the words after the name ("quoted words" stay one)</td></tr><tr><td><code>line</code></td><td><code>string</code></td><td>the whole line as typed</td></tr><tr><td><code>terminal</code></td><td><code>HTMLElement</code></td><td>the terminal element</td></tr><tr><td><code>write</code></td><td><code>(text: string) =&gt; void</code></td><td>writes text - "\n" starts a new line</td></tr><tr><td><code>writeln</code></td><td><code>(text?: string) =&gt; void</code></td><td>writes a line</td></tr><tr><td><code>signal</code></td><td><code>AbortSignal</code></td><td>aborted by Ctrl+C, setState('default') or the element leaving the page</td></tr></table> |
| `TerminalCommandDetail` | Fires when a command line is submitted, before it runs. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>line</code></td><td><code>string</code></td><td>the whole line</td></tr><tr><td><code>name</code></td><td><code>string</code></td><td>the command's name (the first word)</td></tr><tr><td><code>args</code></td><td><code>string[]</code></td><td>the words after it</td></tr></table> |
| `TerminalCommandSpec` | A command with a description - help lists it. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>run</code></td><td><code>TerminalCommand</code></td><td>runs the command</td></tr><tr><td><code>description?</code></td><td><code>string</code></td><td>one line for help</td></tr><tr><td><code>hidden?</code></td><td><code>boolean</code></td><td>left out of help and Tab completion</td></tr></table> |
| `TerminalReadyDetail` | Fires once the xterm is open and sized. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>cols</code></td><td><code>number</code></td><td>columns</td></tr><tr><td><code>rows</code></td><td><code>number</code></td><td>rows</td></tr></table> |
| `TerminalStep` | One step of a replayed session (script.terminal-script holds an array of them). <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>command?</code></td><td><code>string</code></td><td>a command line, typed at the prompt and run - through `output` when it is given, else through the command</td></tr><tr><td><code>output?</code></td><td><code>string \| string[]</code></td><td>text written (after the command, or alone); an array writes one line each</td></tr><tr><td><code>tone?</code></td><td><code>TerminalTone</code></td><td>the output's tone</td></tr><tr><td><code>wait?</code></td><td><code>number</code></td><td>ms to wait before the step</td></tr><tr><td><code>typing?</code></td><td><code>boolean</code></td><td>false: the command appears at once instead of being typed</td></tr></table> |
| `TerminalTone` | A tone of the system - the same words as the Code Mockup's line tones. = <code>'success' \| 'warning' \| 'info' \| 'destructive' \| 'muted' \| 'bold'</code> |
| `TerminalUrls` | Where the vendor files come from - the pinned jsDelivr builds, or self-hosted copies of the same versions. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>xterm</code></td><td><code>string</code></td><td>the xterm.js ES module (exports Terminal)</td></tr><tr><td><code>css</code></td><td><code>string</code></td><td>xterm's stylesheet</td></tr><tr><td><code>fit</code></td><td><code>string</code></td><td>the fit addon - sizes the terminal to its box</td></tr><tr><td><code>clipboard</code></td><td><code>string</code></td><td>the clipboard addon - OSC 52: programs reach the browser's clipboard</td></tr><tr><td><code>serialize</code></td><td><code>string</code></td><td>the serialize addon - the buffer as VT sequences or HTML</td></tr><tr><td><code>webLinks</code></td><td><code>string</code></td><td>the web-links addon - URLs in the output become links</td></tr></table> |
| `XtermBuffer` | An xterm buffer: the scrollback and the screen. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>length</code></td><td><code>number</code></td><td>lines in the buffer (scrollback + screen)</td></tr><tr><td><code>cursorX</code></td><td><code>number</code></td><td>the cursor's column</td></tr><tr><td><code>getLine</code></td><td><code>(y: number) =&gt; XtermBufferLine \| undefined</code></td><td>the line at y (0 = the oldest in the scrollback)</td></tr></table> |
| `XtermBufferLine` | One line of an xterm buffer. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>translateToString</code></td><td><code>(trimRight?: boolean) =&gt; string</code></td><td>the line as text; trimRight leaves out the cells never written at its end</td></tr></table> |
| `XtermDisposable` | What xterm returns for a listener - disposing it removes the listener. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>dispose</code></td><td><code>() =&gt; void</code></td><td>removes the listener</td></tr></table> |
| `XtermLike` | The official xterm.js Terminal - the members this component uses (the instance has every other one too). <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>cols</code></td><td><code>number</code></td><td>columns</td></tr><tr><td><code>rows</code></td><td><code>number</code></td><td>rows</td></tr><tr><td><code>options</code></td><td><code>Record&lt;string, unknown&gt;</code></td><td>live options (theme, fonts, cursor ...)</td></tr><tr><td><code>buffer</code></td><td><code>{ active: XtermBuffer }</code></td><td>the screen buffer</td></tr><tr><td><code>open</code></td><td><code>(parent: HTMLElement) =&gt; void</code></td><td>opens the terminal in an element</td></tr><tr><td><code>write</code></td><td><code>(data: string, callback?: () =&gt; void) =&gt; void</code></td><td>writes data (VT sequences allowed); the callback runs once it is parsed</td></tr><tr><td><code>clear</code></td><td><code>() =&gt; void</code></td><td>clears the scrollback and the screen but the cursor line</td></tr><tr><td><code>focus</code></td><td><code>() =&gt; void</code></td><td>focuses the terminal</td></tr><tr><td><code>resize</code></td><td><code>(cols: number, rows: number) =&gt; void</code></td><td>resizes to cols x rows</td></tr><tr><td><code>loadAddon</code></td><td><code>(addon: unknown) =&gt; void</code></td><td>loads an addon</td></tr><tr><td><code>onData</code></td><td><code>(listener: (data: string) =&gt; void) =&gt; XtermDisposable</code></td><td>listens to typed / pasted data</td></tr><tr><td><code>attachCustomKeyEventHandler</code></td><td><code>(handler: (event: KeyboardEvent) =&gt; boolean) =&gt; void</code></td><td>decides per key event whether xterm handles it (false: the browser does)</td></tr><tr><td><code>scrollToBottom</code></td><td><code>() =&gt; void</code></td><td>scrolls to the newest line</td></tr><tr><td><code>dispose</code></td><td><code>() =&gt; void</code></td><td>disposes the terminal</td></tr></table> |

## Notes

- **Extra bundle**: the Terminal ships in `terminal.css` / `terminal.js`, loaded after `all.*` (or `core.*`) - and
  xterm.js with its addons and stylesheet load from jsDelivr with the first terminal (pinned: `@xterm/xterm@6.0.0`,
  `addon-fit@0.11.0`, `addon-clipboard@0.2.0`, `addon-serialize@0.14.0`, `addon-web-links@0.12.0`).
  `df$.shadcn.terminal.configure({ urls })` self-hosts them.
- **xterm's own element**: xterm.js names the element it draws in `terminal xterm` - the component claims and styles only `.terminal:not(.xterm)`, so a selector of your own that means the component should skip `.xterm` too.
- **Hidden at first**: a terminal in a closed window or a hidden tab opens when its box first has a size - xterm
  measures its cells when it opens.
- **Output from the page**: `write()` / `writeln()` put text above a waiting prompt (what is being typed stays);
  `tone(text, tone)` colours it with the theme's ANSI colours; `serialize()` returns the buffer as HTML or VT
  sequences, `text()` as plain text.
- **Width**: the line editor counts one column per character - wide characters (CJK, emoji) in a typed line put the
  cursor off by their extra columns; output is drawn by xterm and is not affected.
- A transcript to read and copy (no input) takes the [Code Mockup](mockup-code.md).
