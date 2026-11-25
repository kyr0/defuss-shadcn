// dist/components/terminal/terminal.js
var __df$core = globalThis.df$;
var __df$shared = __df$core && __df$core.shadcn && __df$core.shadcn.shared;
if (!__df$shared || __df$shared.abi !== "0.10.2") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals, defussQuery, componentState, bindComponent } = __df$shared;
var df$ = defussGlobals();
var dfDollar = defussQuery();
var terminalStates = ["default", "running", "readonly"];
var XTERM_URL = "https://cdn.jsdelivr.net/npm/@xterm/xterm@6.0.0/lib/xterm.mjs";
var PINNED = {
  xterm: XTERM_URL,
  css: "https://cdn.jsdelivr.net/npm/@xterm/xterm@6.0.0/css/xterm.css",
  fit: "https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0.11.0/lib/addon-fit.mjs",
  clipboard: "https://cdn.jsdelivr.net/npm/@xterm/addon-clipboard@0.2.0/lib/addon-clipboard.mjs",
  serialize: "https://cdn.jsdelivr.net/npm/@xterm/addon-serialize@0.14.0/lib/addon-serialize.mjs",
  webLinks: "https://cdn.jsdelivr.net/npm/@xterm/addon-web-links@0.12.0/lib/addon-web-links.mjs"
};
var urls = { ...PINNED };
var vendorPromise = null;
var loadedFrom = "";
var LOAD_MS = 20000;
var sheets = new Map;
function sheet(url) {
  const known = sheets.get(url);
  if (known)
    return known;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = url;
  link.dataset.terminal = "";
  const pending = new Promise((resolve, reject) => {
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`the xterm stylesheet could not be loaded from ${url}`));
  });
  pending.catch(() => {
    if (sheets.get(url) === pending)
      sheets.delete(url);
    link.remove();
  });
  sheets.set(url, pending);
  dfDollar(document.head).append(link);
  return pending;
}
function load() {
  const key = JSON.stringify(urls);
  if (vendorPromise && key === loadedFrom)
    return vendorPromise;
  loadedFrom = key;
  const files = [urls.xterm, urls.fit, urls.clipboard, urls.serialize, urls.webLinks];
  const modules = Promise.all(files.map((vendorUrl) => Promise.resolve().then(() => import(/* @vite-ignore */ vendorUrl))));
  let timer = 0;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`xterm.js did not load within ${LOAD_MS / 1000} s`)), LOAD_MS);
  });
  const css = sheet(urls.css);
  const pending = Promise.race([modules.then((loaded) => css.then(() => loaded)), deadline]).then(([xterm, fit, clipboard, serialize, links]) => ({
    Terminal: xterm.Terminal,
    FitAddon: fit.FitAddon,
    ClipboardAddon: clipboard.ClipboardAddon,
    SerializeAddon: serialize.SerializeAddon,
    WebLinksAddon: links.WebLinksAddon
  })).finally(() => clearTimeout(timer));
  pending.catch(() => {
    if (vendorPromise === pending)
      vendorPromise = null;
  });
  vendorPromise = pending;
  return pending;
}
var COLORS = [
  ["background", "background"],
  ["foreground", "foreground"],
  ["cursor", "cursor"],
  ["cursorAccent", "cursor-accent"],
  ["selectionBackground", "selection"],
  ["black", "black"],
  ["red", "red"],
  ["green", "green"],
  ["yellow", "yellow"],
  ["blue", "blue"],
  ["magenta", "magenta"],
  ["cyan", "cyan"],
  ["white", "white"],
  ["brightBlack", "bright-black"],
  ["brightRed", "bright-red"],
  ["brightGreen", "bright-green"],
  ["brightYellow", "bright-yellow"],
  ["brightBlue", "bright-blue"],
  ["brightMagenta", "bright-magenta"],
  ["brightCyan", "bright-cyan"],
  ["brightWhite", "bright-white"]
];
var probe = null;
function rgba(css) {
  if (!css)
    return "";
  probe ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!probe)
    return "";
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = "rgba(1, 2, 3, 0.5)";
  probe.fillStyle = css;
  if (probe.fillStyle === "rgba(1, 2, 3, 0.5)")
    return "";
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
  return `rgba(${r}, ${g}, ${b}, ${Math.round(a / 255 * 100) / 100})`;
}
function themeOf(el) {
  const cs = getComputedStyle(el);
  const theme = {};
  for (const [key, prop] of COLORS) {
    const value = rgba(cs.getPropertyValue(`--terminal-${prop}`).trim());
    if (value)
      theme[key] = value;
  }
  if (theme.foreground) {
    const fg = theme.foreground.replace(/[\d.]+\)$/, "");
    theme.scrollbarSliderBackground = `${fg}0.2)`;
    theme.scrollbarSliderHoverBackground = `${fg}0.35)`;
    theme.scrollbarSliderActiveBackground = `${fg}0.5)`;
  }
  return theme;
}
var reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
function optionsOf(el, host) {
  const cs = getComputedStyle(host);
  const ecs = getComputedStyle(el);
  const style = el.dataset.cursor || ecs.getPropertyValue("--terminal-cursor-style").trim() || "block";
  return {
    theme: themeOf(el),
    fontFamily: cs.fontFamily,
    fontSize: parseFloat(cs.fontSize) || 14,
    lineHeight: parseFloat(ecs.getPropertyValue("--terminal-line-height")) || 1.2,
    cursorStyle: ["block", "bar", "underline"].includes(style) ? style : "block",
    cursorBlink: !reducedMotion() && el.dataset.blink !== "false",
    scrollback: Math.max(0, Number(el.dataset.scrollback) || 1000),
    convertEol: true,
    allowProposedApi: true,
    screenReaderMode: el.hasAttribute("data-screen-reader"),
    disableStdin: el.hasAttribute("data-readonly")
  };
}
var SGR = {
  success: "32",
  warning: "33",
  info: "34",
  destructive: "31",
  muted: "90",
  bold: "1"
};
function tone(text, tone) {
  const code = SGR[tone];
  return code ? `\x1B[${code}m${text}\x1B[0m` : text;
}
var ESC = "\x1B";
var CSI = new RegExp(`${ESC}\\[[0-9;]*[A-Za-z]`, "g");
var KEY_SEQ = new RegExp(`^${ESC}(?:\\[[0-9;]*[A-Za-z~]|O[A-Za-z])`);
var visible = (text) => text.replace(CSI, "").length;
function words(line) {
  const out = [];
  for (const m of line.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g))
    out.push(m[1] ?? m[2] ?? m[3] ?? "");
  return out;
}
var resolve = (t) => typeof t === "string" ? dfDollar("#" + CSS.escape(t)).get(0) ?? dfDollar(t).get(0) ?? null : t;
var live = new Set;
function put(s, data) {
  s.chain = s.chain.then(() => new Promise((done) => s.term.write(data, done)));
  return s.chain;
}
var promptOf = (s) => {
  const text = s.el.dataset.prompt ?? "$ ";
  const t = s.el.dataset.promptTone;
  return t ? tone(text, t) : text;
};
function draw(s) {
  const cols = Math.max(1, s.term.cols);
  const prompt = promptOf(s);
  const p = visible(prompt);
  const up = Math.floor((p + s.shown) / cols);
  let out = (up ? `\x1B[${up}A` : "") + "\r\x1B[J" + prompt + s.line;
  const end = p + s.line.length;
  if (end > 0 && end % cols === 0)
    out += " \b";
  const target = p + s.cursor;
  const back = Math.floor(end / cols) - Math.floor(target / cols);
  out += (back ? `\x1B[${back}A` : "") + "\r" + (target % cols ? `\x1B[${target % cols}C` : "");
  s.shown = s.cursor;
  return put(s, out);
}
function erase(s) {
  const cols = Math.max(1, s.term.cols);
  const up = Math.floor((visible(promptOf(s)) + s.shown) / cols);
  s.shown = 0;
  return put(s, (up ? `\x1B[${up}A` : "") + "\r\x1B[J");
}
async function showPrompt(s) {
  if (s.el.hasAttribute("data-readonly") || !s.el.isConnected)
    return;
  await s.chain;
  if (s.term.buffer.active.cursorX !== 0)
    await put(s, `\r
`);
  s.line = "";
  s.cursor = 0;
  s.shown = 0;
  s.at = s.history.length;
  s.prompted = true;
  await draw(s);
  drain(s);
}
function drain(s) {
  if (!s.queue)
    return;
  const queued = s.queue;
  s.queue = "";
  feed(s, queued);
}
var asText = (value) => value == null ? "" : Array.isArray(value) ? value.join(`
`) : String(value);
async function output(s, text, newline = false) {
  const data = text.replace(/\r?\n/g, `\r
`) + (newline ? `\r
` : "");
  if (!s.prompted)
    return put(s, data);
  await erase(s);
  await put(s, data);
  if (s.term.buffer.active.cursorX !== 0)
    await put(s, `\r
`);
  await draw(s);
}
var globalCommands = new Map;
var asSpec = (c) => typeof c === "function" ? { run: c } : c;
function commandsOf(s) {
  const all = new Map(BUILTINS);
  for (const [k, v] of globalCommands)
    all.set(k, v);
  for (const [k, v] of s.el._terminalCommands ?? [])
    all.set(k, v);
  return all;
}
function lookup(s, name) {
  const all = commandsOf(s);
  return all.get(name) ?? all.get(name.toLowerCase());
}
var BUILTINS = new Map([
  [
    "help",
    {
      description: "lists the commands (help <name>: one of them)",
      run: (c) => {
        const s = c.terminal._terminal;
        const all = [...commandsOf(s)].filter(([, v]) => !v.hidden).sort(([a], [b]) => a.localeCompare(b));
        if (c.args[0]) {
          const one = lookup(s, c.args[0]);
          return one ? `${c.args[0]} - ${one.description || "no description"}` : `help: no command ${c.args[0]}`;
        }
        const width = Math.max(...all.map(([k]) => k.length));
        return all.map(([k, v]) => `${tone(k.padEnd(width), "bold")}  ${v.description ?? ""}`.trimEnd());
      }
    }
  ],
  [
    "clear",
    {
      description: "clears the screen",
      run: (c) => {
        const s = c.terminal._terminal;
        return put(s, "\x1B[H\x1B[2J").then(() => s.term.clear());
      }
    }
  ],
  ["echo", { description: "writes its words", run: (c) => c.args.join(" ") }],
  [
    "history",
    {
      description: "lists the commands typed so far",
      run: (c) => {
        const s = c.terminal._terminal;
        return s.history.map((h, i) => `${String(i + 1).padStart(4)}  ${h}`);
      }
    }
  ]
]);
var settle = (s) => {
  const name = s.el.hasAttribute("data-readonly") ? "readonly" : s.busy || s.playing ? "running" : "default";
  dfDollar(s.el).attr("aria-busy", name === "running" ? "true" : null);
  const config = name === "running" && s.running ? { command: s.running } : { prompt: s.el.dataset.prompt ?? "$ " };
  if (s.el.store)
    terminalApi.commit(s.el, name, config);
};
async function execute(s, line, fixed) {
  const [name = "", ...args] = words(line);
  const el = s.el;
  if (line.trim()) {
    const go = el.dispatchEvent(new CustomEvent("terminal-command", {
      bubbles: true,
      cancelable: true,
      detail: { line, name, args }
    }));
    if (go || fixed) {
      const ac = new AbortController;
      s.busy = ac;
      s.running = line;
      settle(s);
      const ctx = {
        name,
        args,
        line,
        terminal: el,
        write: (text) => void put(s, String(text).replace(/\r?\n/g, `\r
`)),
        writeln: (text = "") => void put(s, String(text).replace(/\r?\n/g, `\r
`) + `\r
`),
        signal: ac.signal
      };
      try {
        let result;
        if (fixed && "output" in fixed) {
          const text = asText(fixed.output);
          result = fixed.tone ? text.split(`
`).map((l) => tone(l, fixed.tone)) : text;
        } else {
          const spec = lookup(s, name);
          if (!spec)
            result = tone(notFound(el, name), "destructive");
          else {
            const aborted = new Promise((done) => ac.signal.addEventListener("abort", () => done(), { once: true }));
            result = await Promise.race([Promise.resolve(spec.run(ctx)), aborted]);
          }
        }
        if (!ac.signal.aborted) {
          let text = asText(result);
          if (text && fixed?.tone && !("output" in fixed))
            text = text.split(`
`).map((l) => tone(l, fixed.tone)).join(`
`);
          if (text)
            await put(s, text.replace(/\r?\n/g, `\r
`) + `\r
`);
        }
      } catch (err) {
        await put(s, tone(`${name}: ${err instanceof Error ? err.message : String(err)}`, "destructive") + `\r
`);
      } finally {
        if (s.busy === ac) {
          s.busy = null;
          s.running = "";
        }
      }
    }
  }
  if (!s.playing) {
    await showPrompt(s);
    settle(s);
  }
}
var notFound = (el, name) => (el.dataset.notFound ?? "{name}: command not found").replace("{name}", name);
async function complete(s) {
  const before = s.line.slice(0, s.cursor);
  if (/\s/.test(before))
    return;
  const names = [...commandsOf(s)].filter(([k, v]) => !v.hidden && k.startsWith(before)).map(([k]) => k);
  if (!names.length)
    return;
  if (names.length === 1)
    return insert(s, names[0].slice(before.length) + " ");
  let common = names[0];
  for (const n of names)
    while (!n.startsWith(common))
      common = common.slice(0, -1);
  if (common.length > before.length)
    return insert(s, common.slice(before.length));
  await output(s, names.sort().join("  "));
}
function insert(s, text) {
  s.line = s.line.slice(0, s.cursor) + text + s.line.slice(s.cursor);
  s.cursor += text.length;
  return draw(s);
}
function feed(s, data) {
  for (let i = 0;i < data.length; ) {
    if (!s.prompted) {
      s.queue += data.slice(i);
      return;
    }
    const rest = data.slice(i);
    const seq = KEY_SEQ.exec(rest)?.[0];
    const key = seq ?? rest[0];
    i += key.length;
    switch (key) {
      case "\r":
      case `
`: {
        const line = s.line;
        s.cursor = s.line.length;
        draw(s);
        put(s, `\r
`);
        s.prompted = false;
        if (line.trim() && line !== s.history[s.history.length - 1])
          s.history.push(line);
        execute(s, line);
        if (data[i - 1] === "\r" && data[i] === `
`)
          i++;
        continue;
      }
      case "":
      case "\b":
        if (s.cursor > 0) {
          s.line = s.line.slice(0, s.cursor - 1) + s.line.slice(s.cursor);
          s.cursor--;
          draw(s);
        }
        continue;
      case "\x1B[3~":
        if (s.cursor < s.line.length) {
          s.line = s.line.slice(0, s.cursor) + s.line.slice(s.cursor + 1);
          draw(s);
        }
        continue;
      case "\x1B[D":
        if (s.cursor > 0) {
          s.cursor--;
          draw(s);
        }
        continue;
      case "\x1B[C":
        if (s.cursor < s.line.length) {
          s.cursor++;
          draw(s);
        }
        continue;
      case "\x1B[H":
      case "\x1BOH":
      case "\x01":
        s.cursor = 0;
        draw(s);
        continue;
      case "\x1B[F":
      case "\x1BOF":
      case "\x05":
        s.cursor = s.line.length;
        draw(s);
        continue;
      case "\x1B[A":
      case "\x1B[B": {
        if (!s.history.length)
          continue;
        if (s.at === s.history.length)
          s.draft = s.line;
        s.at = Math.max(0, Math.min(s.history.length, s.at + (key === "\x1B[A" ? -1 : 1)));
        s.line = s.at === s.history.length ? s.draft : s.history[s.at];
        s.cursor = s.line.length;
        draw(s);
        continue;
      }
      case "\x15":
        s.line = s.line.slice(s.cursor);
        s.cursor = 0;
        draw(s);
        continue;
      case "\x03":
        s.cursor = s.line.length;
        draw(s);
        put(s, "^C");
        s.prompted = false;
        showPrompt(s);
        continue;
      case "\f":
        s.prompted = false;
        put(s, "\x1B[H\x1B[2J").then(() => {
          s.term.clear();
          s.prompted = true;
          s.shown = 0;
          return draw(s);
        }).then(() => drain(s));
        continue;
      case "\t":
        complete(s);
        continue;
      default:
        if (key.length === 1 && key >= " " && key !== "") {
          let end = 0;
          while (end < rest.length && rest.charCodeAt(end) >= 32 && rest.charCodeAt(end) !== 127)
            end++;
          const run = rest.slice(0, end) || key;
          i += run.length - 1;
          insert(s, run);
        }
    }
  }
}
function onData(s, data) {
  if (s.el.hasAttribute("data-readonly"))
    return;
  if (s.playing) {
    s.skip = true;
    return;
  }
  if (s.busy) {
    if (data.includes("\x03")) {
      s.busy.abort();
      s.queue = "";
      put(s, `^C\r
`);
    } else
      s.queue += data;
    return;
  }
  feed(s, data);
}
var sleep = (s, ms) => s.skip || ms <= 0 ? Promise.resolve() : new Promise((done) => setTimeout(done, ms));
function scriptOf(el) {
  const script = dfDollar(el).children("script.terminal-script").get(0);
  if (!script)
    return [];
  try {
    const steps = JSON.parse(script.textContent || "[]");
    return Array.isArray(steps) ? steps : [];
  } catch (err) {
    console.error("[terminal] the script is not valid JSON:", err instanceof Error ? err.message : String(err));
    return [];
  }
}
async function typeCommand(s, text, typing) {
  const delay = Math.max(0, Number(s.el.dataset.speed ?? 45));
  if (s.el.hasAttribute("data-readonly")) {
    await put(s, (s.term.buffer.active.cursorX ? `\r
` : "") + promptOf(s));
    for (let i = 0;i < text.length; i++) {
      await put(s, text[i]);
      if (typing && !s.skip && !reducedMotion())
        await sleep(s, delay * (0.6 + i * 7 % 5 / 10));
    }
    return put(s, `\r
`);
  }
  if (!s.prompted)
    await showPrompt(s);
  if (s.line) {
    s.line = "";
    s.cursor = 0;
    await draw(s);
  }
  for (let i = 0;i < text.length; i++) {
    if (s.skip || !typing || reducedMotion()) {
      await insert(s, text.slice(i));
      break;
    }
    await insert(s, text[i]);
    await sleep(s, delay * (0.6 + i * 7 % 5 / 10));
  }
  s.cursor = s.line.length;
  await draw(s);
  await put(s, `\r
`);
  s.prompted = false;
}
async function play(s, steps) {
  if (s.playing)
    return s.playing;
  s.playing = (async () => {
    settle(s);
    for (const step of steps) {
      if (!s.el.isConnected)
        break;
      await sleep(s, Number(step.wait) || 0);
      if (typeof step.command === "string") {
        await typeCommand(s, step.command, step.typing !== false);
        if (step.command.trim() && step.command !== s.history[s.history.length - 1])
          s.history.push(step.command);
        await execute(s, step.command, "output" in step ? { output: step.output, tone: step.tone } : step.tone ? { tone: step.tone } : undefined);
      } else if (step.output != null) {
        const text = asText(step.output);
        await output(s, step.tone ? text.split(`
`).map((l) => tone(l, step.tone)).join(`
`) : text, true);
      }
    }
  })().finally(() => {
    s.playing = null;
    s.skip = false;
    showPrompt(s).then(() => settle(s));
  });
  return s.playing;
}
async function open(el) {
  const host = document.createElement("div");
  host.className = "terminal-screen";
  host.setAttribute("data-ce-chrome", "");
  dfDollar(el).append(host);
  let vendor;
  try {
    vendor = await load();
  } catch (err) {
    dfDollar(el).attr("data-error", "");
    const out = document.createElement("output");
    out.className = "terminal-error";
    out.setAttribute("role", "alert");
    dfDollar(out).text(`The terminal could not start: ${err instanceof Error ? err.message : String(err)}`);
    dfDollar(host).append(out);
    throw err;
  }
  await document.fonts?.ready;
  await sized(host);
  const term = new vendor.Terminal(optionsOf(el, host));
  const fit = new vendor.FitAddon;
  const serialize = new vendor.SerializeAddon;
  term.loadAddon(fit);
  term.loadAddon(serialize);
  term.loadAddon(new vendor.ClipboardAddon);
  term.loadAddon(new vendor.WebLinksAddon);
  term.open(host);
  const s = {
    el,
    term,
    fit,
    serialize,
    line: "",
    cursor: 0,
    shown: 0,
    prompted: false,
    history: [],
    at: 0,
    draft: "",
    busy: null,
    running: "",
    playing: null,
    skip: false,
    queue: "",
    chain: Promise.resolve(),
    theme: "",
    observer: new ResizeObserver(() => resize(s))
  };
  s.theme = JSON.stringify(term.options.theme);
  el._terminal = s;
  live.add(el);
  resize(s, true);
  s.observer.observe(host);
  term.onData((data) => onData(s, data));
  term.attachCustomKeyEventHandler((e) => !(e.key === "Tab" && (e.shiftKey || !s.prompted || !s.line || el.hasAttribute("data-readonly"))));
  const label = el.getAttribute("aria-label");
  const textarea = dfDollar(host).find("textarea").get(0);
  if (textarea && label)
    textarea.setAttribute("aria-label", label);
  el.dispatchEvent(new CustomEvent("terminal-ready", {
    bubbles: true,
    detail: { cols: term.cols, rows: term.rows }
  }));
  dfDollar(el).attr("data-ready", "");
  if (el.hasAttribute("data-autoplay") && scriptOf(el).length)
    autoplay(el, s);
  else
    await showPrompt(s);
  settle(s);
  return s;
}
function sized(host) {
  if (host.clientWidth > 0)
    return Promise.resolve();
  return new Promise((done) => {
    const ro = new ResizeObserver(() => {
      if (host.clientWidth <= 0)
        return;
      ro.disconnect();
      done();
    });
    ro.observe(host);
  });
}
function autoplay(el, s) {
  const delay = Math.max(0, Number(el.getAttribute("data-autoplay")) || 0);
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting))
      return;
    io.disconnect();
    s.playing = new Promise((done) => setTimeout(done, delay));
    s.playing.then(() => {
      s.playing = null;
      return play(s, scriptOf(el));
    });
  }, { threshold: 0.35 });
  io.observe(el);
}
function resize(s, first = false) {
  if (!s.el.isConnected)
    return;
  const dims = s.fit.proposeDimensions();
  if (!dims || !Number.isFinite(dims.cols) || dims.cols < 2)
    return;
  const rows = Number(s.el.dataset.rows) || dims.rows;
  if (dims.cols === s.term.cols && rows === s.term.rows && !first)
    return;
  s.term.resize(dims.cols, Math.max(1, rows));
  if (s.prompted)
    draw(s);
}
function session(target) {
  const el = resolve(target);
  if (!el)
    return Promise.reject(new Error("no terminal"));
  init();
  return el._terminalReady ?? Promise.reject(new Error("not a .terminal"));
}
function applyMarkup(el, name, config = {}) {
  dfDollar(el).attr("data-readonly", name === "readonly" ? "" : null);
  dfDollar(el).attr("aria-busy", name === "running" ? "true" : null);
  if (name === "default" && typeof config.prompt === "string" && config.prompt !== (el.dataset.prompt ?? "$ "))
    dfDollar(el).attr("data-prompt", config.prompt);
}
async function triggerStateChange(el, name, config = {}) {
  if (!el.hasAttribute("data-ready")) {
    if (name !== "running")
      applyMarkup(el, name, config);
    else
      el._terminalReady.then(() => triggerStateChange(el, name, config), () => {});
    return;
  }
  const s = await el._terminalReady;
  if (name === "running") {
    const command = typeof config.command === "string" ? config.command : "";
    if (s.busy && s.running === command)
      return;
    if (!command)
      return play(s, scriptOf(el));
    if (el.hasAttribute("data-readonly"))
      applyMarkup(el, "default", {});
    s.term.options.disableStdin = false;
    await typeCommand(s, command, false);
    s.history.push(command);
    return execute(s, command);
  }
  s.busy?.abort();
  if (s.playing)
    s.skip = true;
  const was = el.hasAttribute("data-readonly");
  const prompt = el.dataset.prompt;
  applyMarkup(el, name, config);
  s.term.options.disableStdin = name === "readonly";
  if (name === "readonly") {
    if (s.prompted)
      await erase(s);
    s.prompted = false;
  } else if (was || !s.prompted) {
    s.prompted = false;
    if (!s.playing)
      await showPrompt(s);
  } else if (prompt !== el.dataset.prompt)
    await draw(s);
  settle(s);
}
var terminalApi = componentState({
  component: "terminal",
  states: terminalStates,
  apply: (el, state) => triggerStateChange(el, state.name, state.config),
  read: (el) => {
    const s = el._terminal;
    const name = el.hasAttribute("data-readonly") ? "readonly" : s?.busy || s?.playing ? "running" : "default";
    const prompt = el.dataset.prompt ?? "$ ";
    return { name, config: name === "running" && s?.running ? { command: s.running } : { prompt } };
  },
  markup: (el, state) => applyMarkup(el, state.name, state.config)
});
df$.terminalApi = terminalApi;
df$.terminalStates = terminalStates;
df$.terminal = {
  load: () => load().then(() => {
    return;
  }),
  configure: (options) => {
    Object.assign(urls, options?.urls ?? {});
  },
  write: (target, text) => session(target).then((s) => output(s, String(text))),
  writeln: (target, text = "") => session(target).then((s) => output(s, String(text), true)),
  clear: (target) => session(target).then(async (s) => {
    await put(s, "\x1B[H\x1B[2J");
    s.term.clear();
    if (s.prompted) {
      s.shown = 0;
      await draw(s);
    }
  }),
  run: (target, line) => {
    const el = resolve(target);
    if (!el?.api)
      return Promise.reject(new Error("no terminal"));
    el.api.setState("running", { command: String(line) });
    return el.api.settled();
  },
  play: (target, steps) => session(target).then((s) => play(s, steps ?? scriptOf(s.el))),
  commands: (target, commands) => {
    const el = target === "global" ? null : resolve(target);
    if (target !== "global" && !el)
      return () => {};
    const map = el ? el._terminalCommands ??= new Map : globalCommands;
    const added = Object.entries(commands ?? {}).map(([k, v]) => [k, asSpec(v)]);
    for (const [k, v] of added)
      map.set(k, v);
    return () => {
      for (const [k, v] of added)
        if (map.get(k) === v)
          map.delete(k);
    };
  },
  prompt: (target, text) => {
    const el = resolve(target);
    if (el?.api && el.api.getState().name === "default")
      el.api.setState("default", { prompt: String(text) });
    else if (el)
      dfDollar(el).attr("data-prompt", String(text));
  },
  text: (target) => {
    const s = resolve(target)?._terminal;
    if (!s)
      return "";
    const buf = s.term.buffer.active;
    const lines = [];
    for (let y = 0;y < buf.length; y++)
      lines.push((buf.getLine(y)?.translateToString(true) ?? "").trimEnd());
    while (lines.length && !lines[lines.length - 1])
      lines.pop();
    return lines.join(`
`);
  },
  serialize: (target, format = "html") => {
    const s = resolve(target)?._terminal;
    if (!s)
      return "";
    return format === "vt" ? s.serialize.serialize() : s.serialize.serializeAsHTML({ includeGlobalBackground: true });
  },
  focus: (target) => {
    session(target).then((s) => s.term.focus());
  },
  tone,
  xterm: (target) => session(target).then((s) => s.term),
  theme: (target) => {
    const el = resolve(target);
    return el ? themeOf(el) : {};
  },
  url: XTERM_URL
};
var themeWatched = false;
function watchTheme() {
  if (themeWatched)
    return;
  themeWatched = true;
  let timer = 0;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      for (const el of live) {
        const s = el._terminal;
        if (!s)
          continue;
        const theme = themeOf(el);
        const json = JSON.stringify(theme);
        if (json === s.theme)
          continue;
        s.theme = json;
        s.term.options.theme = theme;
      }
    }, 60);
  };
  const mo = new MutationObserver(schedule);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme"] });
  if (document.head)
    mo.observe(document.head, { childList: true, subtree: true, characterData: true });
  for (const q of ["(prefers-color-scheme: dark)", "(prefers-contrast: more)", "(forced-colors: active)"])
    matchMedia(q).addEventListener("change", schedule);
  document.addEventListener("defuss-theme-change", schedule);
}
function sweep() {
  for (const el of live) {
    if (el.isConnected)
      continue;
    const s = el._terminal;
    live.delete(el);
    s.busy?.abort();
    s.observer.disconnect();
    s.term.dispose();
  }
}
function init() {
  sweep();
  dfDollar(".terminal:not([data-init]):not(.xterm)").toArray().forEach((el) => {
    el.dataset.init = "";
    bindComponent(el, terminalApi, {
      name: el.hasAttribute("data-readonly") ? "readonly" : "default",
      config: el.hasAttribute("data-readonly") ? {} : { prompt: el.dataset.prompt ?? "$ " }
    });
    watchTheme();
    const ready = open(el);
    ready.catch((err) => console.error("[terminal]", err instanceof Error ? err.message : String(err)));
    el._terminalReady = ready;
  });
}
init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });

//# debugId=8BE8A09BC0817C4264756E2164756E21
//# sourceMappingURL=mockup.js.map
