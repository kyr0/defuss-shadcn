---
name: Logon
type: MOL
section: desktop
why: A sign-in and lock screen that checks nothing itself - the users are buttons, the picked one's password is a real form, a submit is an event the page answers with done() or fail(), so any sign-in (or none) fits behind it.
when: The start or lock screen of a desktop. For a sign-in page of a website use the website's Login Form block; for a password prompt in an app use a dialog with a form.
where: dist/components/logon/logon.css + dist/components/logon/logon.js
supportedStates: default, signing-in, error, signed-in
---

# Pattern: Logon

## Native basis

A screen of `<button>`s (the users) and a `<form>` with a password field;
the form submits natively (Enter, the button) and the runtime turns the
submit into `logon-submit`. Inside a positioned desktop it covers the whole
area.

## Native Web APIs

- [`<form>` submit](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/submit_event) - Enter and the button submit; the runtime cancels the navigation
- [`autocomplete="current-password"`](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete) - password managers know the field
- [`aria-invalid`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-invalid) + `role="alert"` - a refused sign-in is announced
- [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) - `logon-submit`, `logon-power`

---

## Structure

```html
<div class="logon" aria-label="Sign in">
  <div class="logon-main">
    <div class="logon-brand"><strong>Workstation</strong><span>Pick your name to begin</span></div>
    <ul class="logon-users">
      <li>
        <button class="logon-user" type="button" data-user="aron">
          <span class="avatar"><img class="avatar-image" src="…" alt="" /></span>
          <span class="logon-name">Aron</span>
        </button>
      </li>
      <li>
        <button class="logon-user" type="button" data-user="guest" data-no-password>
          <span class="avatar"><span class="avatar-fallback">G</span></span>
          <span class="logon-name">Guest</span>
        </button>
      </li>
    </ul>
    <form class="logon-form" hidden>
      <p class="logon-for"></p>
      <div class="logon-field">
        <input class="input" type="password" name="password" aria-label="Password" autocomplete="current-password" />
        <button class="btn" type="submit" aria-label="Sign in"><i data-lucide="arrow-right"></i></button>
      </div>
      <p class="logon-error" role="alert" hidden></p>
    </form>
  </div>
  <div class="logon-power">
    <button class="btn" data-variant="ghost" type="button" data-logon-power="shutdown"><i data-lucide="power"></i> Turn off</button>
  </div>
</div>
```

- `data-user` names a user in the events; `data-no-password` signs in on
  the pick.
- `.logon-for` and `.logon-error` are the runtime's text.
- `data-logon-power` buttons fire `logon-power` with their value.

## Variants

| Attribute | Effect |
|-----------|--------|
| `--logon-background` | The screen's background (default the theme's) |

A desktop look (`data-look`) lays the parts out its own way: tiles beside a
divider, a centred avatar, a small dialog.

## States

| State | Meaning |
|-------|---------|
| `default` | The users to pick from |
| `signing-in` | `{ user }` - the password form for that user |
| `error` | `{ user, message }` - the page refused it; the message shows under the field |
| `signed-in` | `{ user }` - the screen hides |

```js
const logon = document.querySelector('.logon');
logon.addEventListener('logon-submit', (e) => {
  if (e.detail.password === 'secret') df$.shadcn.logon.done(logon);
  else df$.shadcn.logon.fail(logon, 'Wrong password - try again.');
});
df$.shadcn.logon.lock(logon); // later: the lock screen
```

`render(state)` returns the authored screen with the state's
`aria-pressed`, the form's `hidden`, the message and `data-user` /
`data-signed-in`.

---

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type LogonState = 'default' | 'signing-in' | 'error' | 'signed-in'</code> - `setState(name, config)` takes the config of the state it names (`LogonStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | The users to pick from. No config. |
| `signing-in` | A user picked: the password form shows. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>user?</code></td><td><code>string</code></td><td>the data-user of the picked user</td></tr></table> |
| `error` | The page refused the sign-in: the form shows its message. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>user?</code></td><td><code>string</code></td><td>the data-user of the picked user</td></tr><tr><td><code>message?</code></td><td><code>string</code></td><td>what went wrong, shown under the field</td></tr></table> |
| `signed-in` | Signed in: the screen hides. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>user?</code></td><td><code>string</code></td><td>the data-user of the user signed in</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends LogonState&gt;(name: S, config?: LogonStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>LogonStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: LogonState; config: LogonStateConfigs[LogonState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: LogonState; config: LogonStateConfigs[LogonState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: LogonState; config: LogonStateConfigs[LogonState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: LogonState; config: LogonStateConfigs[LogonState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: LogonState; config: LogonStateConfigs[LogonState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.logonApi.setState&lt;S extends LogonState&gt;(el: HTMLElement, name: S, config?: LogonStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>LogonStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.logonApi.getState(el: HTMLElement): { name: LogonState; config: LogonStateConfigs[LogonState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: LogonState; config: LogonStateConfigs[LogonState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.logonApi.render(state: { name: LogonState; config: LogonStateConfigs[LogonState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: LogonState; config: LogonStateConfigs[LogonState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.logonApi.store(el: HTMLElement): Store&lt;{ name: LogonState; config: LogonStateConfigs[LogonState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: LogonState; config: LogonStateConfigs[LogonState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.logonApi.commit&lt;S extends LogonState&gt;(el: HTMLElement, name: S, config?: LogonStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>LogonStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.logonStates: LogonState[]</code> | The declared states, 'default' first: <code>default</code>, <code>signing-in</code>, <code>error</code>, <code>signed-in</code>. |

### `df$.shadcn.logon`

| Member | Description |
|---|---|
| <code>fail(target: string \| HTMLElement, message: string): HTMLElement \| null</code> | Refuse the sign-in: the form shows the message and keeps the user. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .logon element, its id or a selector</td></tr><tr><td><code>message</code></td><td><code>string</code></td><td>what went wrong</td></tr></table> <b>Returns</b> <code>HTMLElement \| null</code> - the screen, null when the target matches none |
| <code>done(target: string \| HTMLElement): HTMLElement \| null</code> | Sign in: the screen hides. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .logon element, its id or a selector</td></tr></table> <b>Returns</b> <code>HTMLElement \| null</code> - the screen, null when the target matches none |
| <code>lock(target: string \| HTMLElement): HTMLElement \| null</code> | Lock: the screen shows again, with the users to pick from. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .logon element, its id or a selector</td></tr></table> <b>Returns</b> <code>HTMLElement \| null</code> - the screen, null when the target matches none |

### Events

| Event | Description |
|---|---|
| `logon-power` | Fires when a power button is pressed - the page shuts down, restarts or sleeps. <code>detail</code>: <code>LogonPowerDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>action</code></td><td><code>string</code></td><td>the data-logon-power of the button: shutdown, restart, sleep ...</td></tr></table> |
| `logon-submit` | Fires when the reader signs in - the user and what they typed; the page answers with done() or fail(). <code>detail</code>: <code>LogonSubmitDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>user</code></td><td><code>string</code></td><td>the picked user's data-user</td></tr><tr><td><code>password</code></td><td><code>string</code></td><td>what was typed into the password field ('' for a user without one) - the page checks it; nothing is kept</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `LogonPowerDetail` | What logon-power carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>action</code></td><td><code>string</code></td><td>the data-logon-power of the button: shutdown, restart, sleep ...</td></tr></table> |
| `LogonSubmitDetail` | What logon-submit carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>user</code></td><td><code>string</code></td><td>the picked user's data-user</td></tr><tr><td><code>password</code></td><td><code>string</code></td><td>what was typed into the password field ('' for a user without one) - the page checks it; nothing is kept</td></tr></table> |

## ARIA

| Attribute | Element | Purpose |
|-----------|---------|---------|
| `aria-label` | `.logon` | Names the screen |
| `aria-pressed` | `.logon-user` | Set by the runtime: the picked user |
| `aria-label` | the password field, an icon-only submit | Their names |
| `aria-invalid` | the password field | Set by the runtime in the `error` state |
| `role="alert"` | `.logon-error` | The message is announced |

## Notes

- Nothing is checked or kept by the component: the password is in the
  event's detail and in the field until the state changes.
- Escape in the form goes back to the users; arrows move between them.
