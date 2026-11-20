<!-- The individual examples of Logon: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Logon"
<div class="logon" id="logon-demo" aria-label="Sign in">
  <div class="logon-main">
    <div class="logon-brand">
      <strong>Workstation</strong>
      <span class="text-sm text-muted-foreground">Pick your name to begin</span>
    </div>
    <ul class="logon-users">
      <li>
        <button class="logon-user" type="button" data-user="ada">
          <span class="avatar"><span class="avatar-fallback">AL</span></span>
          <span class="logon-name">Ada</span>
        </button>
      </li>
      <li>
        <button class="logon-user" type="button" data-user="guest" data-no-password="">
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
    <button class="btn" data-variant="ghost" type="button" data-logon-power="shutdown"
      ><i data-lucide="power"></i> Turn off</button
    >
  </div>
</div>
```
