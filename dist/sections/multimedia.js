// dist/components/video/video.js
var __df$core = globalThis.df$;
var __df$shared = __df$core && __df$core.shadcn && __df$core.shadcn.shared;
if (!__df$shared || __df$shared.abi !== "0.9.9") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals, defussQuery, componentState, bindComponent, bindMedia, mediaApply, mediaMarkup, mediaRead, mediaTracks } = __df$shared;
var df$ = defussGlobals();
var dfDollar = defussQuery();
var videoStates = ["default", "playing"];
function applyMarkup(el, stateName, config) {
  mediaMarkup(el, "video", stateName, config);
}
function triggerStateChange(el, stateName, config, incoming) {
  return mediaApply(el, "video", stateName, config, incoming);
}
var videoApi = componentState({
  component: "video",
  states: videoStates,
  mergeConfig: true,
  apply: (el, state, _previous, incoming) => triggerStateChange(el, state.name, state.config, incoming),
  read: (el) => {
    const { playing, config } = mediaRead(el);
    const { time, duration, rate, volume, muted, captions } = config;
    return { name: playing ? "playing" : "default", config: { time, duration, rate, volume, muted, captions } };
  },
  markup: (el, state) => applyMarkup(el, state.name, state.config)
});
df$.videoApi = videoApi;
df$.videoStates = videoStates;
function init() {
  dfDollar(".video:not([data-init])").toArray().forEach((el) => {
    el.dataset.init = "";
    bindComponent(el, videoApi);
    bindMedia(el, "video", () => videoApi.getState(el));
  });
}
var resolve = (target) => typeof target === "string" ? dfDollar(target).get(0) : target;
var now = (el) => mediaRead(el).playing ? "playing" : "default";
df$.video = {
  play: async (target) => {
    const el = resolve(target);
    if (el?.api)
      await el.api.setState("playing");
  },
  pause: (target) => {
    resolve(target)?.api?.setState("default");
  },
  toggle: (target) => {
    const el = resolve(target);
    if (!el?.api)
      return false;
    const next = now(el) === "playing" ? "default" : "playing";
    el.api.setState(next);
    return next === "playing";
  },
  seek: (target, time) => {
    const el = resolve(target);
    if (el?.api)
      el.api.setState(now(el), { time });
  },
  skip: (target, seconds) => {
    const el = resolve(target);
    if (el?.api)
      el.api.setState(now(el), { time: mediaRead(el).config.time + seconds });
  },
  mute: (target, muted) => {
    const el = resolve(target);
    if (el?.api)
      el.api.setState(now(el), { muted: muted ?? !mediaRead(el).config.muted });
  },
  volume: (target, volume) => {
    const el = resolve(target);
    if (el?.api)
      el.api.setState(now(el), { volume });
  },
  rate: (target, rate) => {
    const el = resolve(target);
    if (el?.api)
      el.api.setState(now(el), { rate });
  },
  captions: (target, key) => {
    const el = resolve(target);
    if (el?.api)
      el.api.setState(now(el), { captions: key ?? (mediaRead(el).config.captions ? "" : true) });
  },
  tracks: (target, tracks, replace) => {
    const el = resolve(target);
    return el?.api ? mediaTracks(el, "video", tracks, replace) : [];
  },
  fullscreen: async (target) => {
    const el = resolve(target);
    if (!el)
      return;
    if (document.fullscreenElement === el)
      await document.exitFullscreen().catch(() => {
        return;
      });
    else
      await el.requestFullscreen().catch(() => {
        return;
      });
  }
};
init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });

// dist/components/audio/audio.js
var __df$core2 = globalThis.df$;
var __df$shared2 = __df$core2 && __df$core2.shadcn && __df$core2.shadcn.shared;
if (!__df$shared2 || __df$shared2.abi !== "0.9.9") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals2, defussQuery: defussQuery2, componentState: componentState2, bindComponent: bindComponent2, bindMedia: bindMedia2, mediaApply: mediaApply2, mediaMarkup: mediaMarkup2, mediaRead: mediaRead2, mediaTracks: mediaTracks2 } = __df$shared2;
var df$2 = defussGlobals2();
var dfDollar2 = defussQuery2();
var audioStates = ["default", "playing"];
function applyMarkup2(el, stateName, config) {
  mediaMarkup2(el, "audio", stateName, config);
}
function triggerStateChange2(el, stateName, config, incoming) {
  return mediaApply2(el, "audio", stateName, config, incoming);
}
var audioApi = componentState2({
  component: "audio",
  states: audioStates,
  mergeConfig: true,
  apply: (el, state, _previous, incoming) => triggerStateChange2(el, state.name, state.config, incoming),
  read: (el) => {
    const { playing, config } = mediaRead2(el);
    const { time, duration, rate, volume, muted, captions } = config;
    return { name: playing ? "playing" : "default", config: { time, duration, rate, volume, muted, captions } };
  },
  markup: (el, state) => applyMarkup2(el, state.name, state.config)
});
df$2.audioApi = audioApi;
df$2.audioStates = audioStates;
function init2() {
  dfDollar2(".audio:not([data-init])").toArray().forEach((el) => {
    el.dataset.init = "";
    bindComponent2(el, audioApi);
    bindMedia2(el, "audio", () => audioApi.getState(el));
  });
}
var resolve2 = (target) => typeof target === "string" ? dfDollar2(target).get(0) : target;
var now2 = (el) => mediaRead2(el).playing ? "playing" : "default";
df$2.audio = {
  play: async (target) => {
    const el = resolve2(target);
    if (el?.api)
      await el.api.setState("playing");
  },
  pause: (target) => {
    resolve2(target)?.api?.setState("default");
  },
  toggle: (target) => {
    const el = resolve2(target);
    if (!el?.api)
      return false;
    const next = now2(el) === "playing" ? "default" : "playing";
    el.api.setState(next);
    return next === "playing";
  },
  seek: (target, time) => {
    const el = resolve2(target);
    if (el?.api)
      el.api.setState(now2(el), { time });
  },
  skip: (target, seconds) => {
    const el = resolve2(target);
    if (el?.api)
      el.api.setState(now2(el), { time: mediaRead2(el).config.time + seconds });
  },
  mute: (target, muted) => {
    const el = resolve2(target);
    if (el?.api)
      el.api.setState(now2(el), { muted: muted ?? !mediaRead2(el).config.muted });
  },
  volume: (target, volume) => {
    const el = resolve2(target);
    if (el?.api)
      el.api.setState(now2(el), { volume });
  },
  rate: (target, rate) => {
    const el = resolve2(target);
    if (el?.api)
      el.api.setState(now2(el), { rate });
  },
  captions: (target, key) => {
    const el = resolve2(target);
    if (el?.api)
      el.api.setState(now2(el), { captions: key ?? (mediaRead2(el).config.captions ? "" : true) });
  },
  tracks: (target, tracks, replace) => {
    const el = resolve2(target);
    return el?.api ? mediaTracks2(el, "audio", tracks, replace) : [];
  }
};
init2();
new MutationObserver(init2).observe(document, { childList: true, subtree: true });

// dist/components/media-timeline/media-timeline.js
var __df$core3 = globalThis.df$;
var __df$shared3 = __df$core3 && __df$core3.shadcn && __df$core3.shadcn.shared;
if (!__df$shared3 || __df$shared3.abi !== "0.9.9") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals3, defussQuery: defussQuery3, componentState: componentState3, bindComponent: bindComponent3, mediaOf, mediaTextTracks, mediaTime, textLocale } = __df$shared3;
var df$3 = defussGlobals3();
var dfDollar3 = defussQuery3();
var mediaTimelineStates = ["default", "playing"];
var COLORS = [
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "primary",
  "secondary",
  "accent",
  "muted",
  "destructive"
];
var SCALES = [
  [0.5, 0.1],
  [1, 0.25],
  [2, 0.5],
  [5, 1],
  [10, 2],
  [15, 5],
  [30, 5],
  [60, 10],
  [120, 30],
  [300, 60],
  [600, 120],
  [900, 300],
  [1800, 300],
  [3600, 600],
  [7200, 1800]
];
var MAX_ZOOM = 400;
var TEXT_KINDS = ["subtitles", "captions", "descriptions"];
var UNIT_SECONDS = { h: 3600, min: 60, s: 1 };
var UNIT_NAMES = { h: "hour", min: "minute", s: "second" };
var STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1200, 1800, 3600];
var stepsFor = (per) => per > 1 ? [...Array.from({ length: per }, (_, i) => i + 1).filter((n) => per % n === 0), ...STEPS.map((n) => n * per)] : STEPS;
var MIN_LOOP = 0.1;
var num = (v, fallback) => {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
};
var esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var pct = (t, d) => `${d > 0 ? Math.round(t / d * 1e6) / 1e4 : 0}%`;
var runtimeOf = (el) => el._timeline;
function colorOf(value, fallback) {
  const v = String(value ?? "").trim();
  if (COLORS.includes(v))
    return { name: v, css: "" };
  if (v && !/[;{}<>"]/.test(v) && globalThis.CSS?.supports?.("color", v))
    return { name: "", css: v };
  return fallback;
}
var colorAttr = (c, variable = "--media-timeline-color") => c.name ? { attr: ` data-color="${c.name}"`, style: "" } : c.css ? { attr: "", style: ` ${variable}: ${esc(c.css)};` } : { attr: "", style: "" };
var sameLoop = (a, b) => a === b || !!a && !!b && a.start === b.start && a.end === b.end;
function loopOf(raw, d) {
  if (!raw || typeof raw !== "object")
    return null;
  const r = raw;
  const end = d > 0 ? d : Infinity;
  const a = Math.min(end, Math.max(0, num(r.start, NaN)));
  const b = Math.min(end, Math.max(0, num(r.end, NaN)));
  if (!Number.isFinite(a) || !Number.isFinite(b) || Math.abs(b - a) < MIN_LOOP)
    return null;
  return { start: Math.min(a, b), end: Math.max(a, b) };
}
function dataOf(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.tracks))
    return { version: 1, tracks: [] };
  try {
    return { version: 1, ...JSON.parse(JSON.stringify(raw)) };
  } catch {
    return { version: 1, tracks: [] };
  }
}
function place(data) {
  const known = new Map;
  const tracks = data.tracks.filter((t) => t && Array.isArray(t.items));
  const idOf = (t, i, item) => String(item.id ?? `${t.id}-${i}`);
  tracks.forEach((t) => t.items.forEach((item, i) => {
    const marker = t.kind === "markers" || item.time !== undefined && item.end === undefined;
    const start = num(marker ? item.time ?? item.start : item.start, NaN);
    const end = marker ? start : num(item.end, NaN);
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start)
      known.set(idOf(t, i, item), { start, end });
  }));
  for (let round = 0;round < 4; round++)
    tracks.forEach((t) => t.items.forEach((item, i) => {
      if (!Array.isArray(item.span) || known.has(idOf(t, i, item)))
        return;
      const parts = item.span.map((id) => known.get(String(id))).filter(Boolean);
      if (parts.length && parts.length === item.span.length)
        known.set(idOf(t, i, item), {
          start: Math.min(...parts.map((p) => p.start)),
          end: Math.max(...parts.map((p) => p.end))
        });
    }));
  const rows = tracks.map((t, ti) => {
    const fallback = colorOf(t.color, { name: `chart-${ti % 5 + 1}`, css: "" });
    const items = [];
    t.items.forEach((item, i) => {
      const id = idOf(t, i, item);
      const at = known.get(id);
      if (!at)
        return;
      items.push({
        id,
        track: String(t.id),
        label: String(item.label ?? item.text ?? ""),
        start: at.start,
        end: at.end,
        marker: at.end === at.start,
        lane: 0,
        color: colorOf(item.color, fallback),
        info: item.info
      });
    });
    const lanes = [];
    for (const p of [...items].filter((x) => !x.marker).sort((a, b) => a.start - b.start)) {
      let lane = lanes.findIndex((end) => end <= p.start);
      if (lane < 0)
        lane = lanes.length;
      lanes[lane] = p.end;
      p.lane = lane;
    }
    return {
      id: String(t.id),
      label: String(t.label ?? t.id),
      kind: String(t.kind ?? "regions"),
      for: t.for == null ? "" : String(t.for),
      background: colorOf(t.background, { name: "", css: "" }),
      lanes: Math.max(1, lanes.length),
      items
    };
  });
  return grouped(rows);
}
function grouped(rows) {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const target = (r) => {
    let at = r;
    for (let i = 0;i < rows.length && at?.for; i++)
      at = byId.get(at.for) === at ? undefined : byId.get(at.for);
    return at && at !== r && !at.for ? at : undefined;
  };
  const out = [];
  for (const r of rows) {
    if (target(r))
      continue;
    out.push(...rows.filter((a) => target(a) === r), r);
  }
  return out;
}
function lengthOf(rt) {
  const own = num(rt.data.duration, 0);
  if (own > 0)
    return own;
  const m = rt.media?.duration;
  if (m && Number.isFinite(m) && m > 0)
    return m;
  return Math.max(0, ...rt.rows.flatMap((r) => r.items.map((p) => p.end)));
}
var timeOf = (rt) => rt.media ? rt.media.currentTime : rt.clock ? Math.min(rt.duration, rt.clock.from + (performance.now() - rt.clock.at) / 1000) : rt.time;
var playingOf = (rt) => rt.media ? !rt.media.paused && !rt.media.ended : !!rt.clock;
var rateOf = (rt) => rt.media ? rt.media.playbackRate : 1;
function activeAt(rt, time) {
  return rt.rows.flatMap((r) => r.items.filter((p) => !p.marker && time >= p.start && time < p.end).map((p) => ({ track: r.id, item: p.id, label: p.label, start: p.start, end: p.end })));
}
var part = (el, name) => dfDollar3(el).find(`.media-timeline-${name}`).get(0);
function boundOf(el, sel) {
  const out = dfDollar3(el).find(sel).toArray();
  if (el.id)
    for (const bound of dfDollar3(`[data-media-timeline-for="${CSS.escape(el.id)}"]`).toArray()) {
      if (bound.matches(sel))
        out.push(bound);
      out.push(...dfDollar3(bound).find(sel).toArray());
    }
  return out;
}
var widthOf = (el, rt) => rt.zoom > 0 ? rt.duration * rt.zoom : part(el, "scroll")?.clientWidth ?? 0;
function scaleOf(el, rt) {
  const pxps = rt.duration > 0 ? widthOf(el, rt) / rt.duration : 0;
  return SCALES.find(([label]) => label * pxps >= 56) ?? SCALES[SCALES.length - 1];
}
function scaleRows(el, rt) {
  const d = rt.duration;
  const scales = (Array.isArray(rt.data.scales) ? rt.data.scales : []).filter((s) => s && (UNIT_SECONDS[s.unit] || s.unit === "frame"));
  if (!scales.length) {
    const [major, minor] = scaleOf(el, rt);
    return [{ major, minor, label: "", text: (t) => mediaTime(t, d) }];
  }
  const pxps = d > 0 ? widthOf(el, rt) / d : 0;
  const locale = textLocale(el);
  const secOf = (s) => s.unit === "frame" ? 1 / Math.max(1, num(s.fps, 25)) : UNIT_SECONDS[s.unit];
  return scales.map((s, i) => {
    const sec = secOf(s);
    const parent = i > 0 ? secOf(scales[i - 1]) : Infinity;
    const per = Number.isFinite(parent) && parent > sec ? Math.round(parent / sec) : 0;
    const steps = stepsFor(per);
    const k = steps.find((n) => n * sec * pxps >= 40) ?? steps[steps.length - 1];
    const fine = sec / Math.max(1, Math.round(num(s.divisions, 1)));
    const minor = fine * pxps >= 4 ? fine : sec * pxps >= 4 ? sec : k * sec;
    const format = UNIT_NAMES[s.unit] ? new Intl.NumberFormat(locale, { style: "unit", unit: UNIT_NAMES[s.unit], unitDisplay: "narrow" }) : new Intl.NumberFormat(locale);
    return {
      major: k * sec,
      minor,
      label: String(s.label ?? ""),
      text: (t) => {
        const n = Math.round(t / sec);
        return format.format(per ? n % per : n);
      }
    };
  });
}
function render(el) {
  const rt = runtimeOf(el);
  rt.rows = place(rt.data);
  rt.duration = lengthOf(rt);
  const body = part(el, "body");
  const content = part(el, "content");
  if (!body || !content)
    return;
  dfDollar3(body).attr("hidden", rt.duration > 0 ? null : "");
  const d = rt.duration;
  const scales = scaleRows(el, rt);
  const finest = scales[scales.length - 1];
  content.style.setProperty("inline-size", rt.zoom > 0 ? `max(100%, ${Math.round(d * rt.zoom)}px)` : "100%");
  content.style.setProperty("--media-timeline-major", String(d / finest.major));
  content.style.setProperty("--media-timeline-minor", String(d / finest.minor));
  content.style.setProperty("--media-timeline-scales", String(scales.length));
  const ruler = scales.map((s) => {
    let ticks = "";
    for (let i = 0;i < 2000 && i * s.major < d - s.major / 4; i++)
      ticks += `<span class="media-timeline-tick" style="left: ${pct(i * s.major, d)}">${esc(s.text(i * s.major))}</span>`;
    return `<div class="media-timeline-scale" style="--media-timeline-major: ${d / s.major}; --media-timeline-minor: ${d / s.minor}">${ticks}</div>`;
  }).join("");
  const rows = rt.rows.map((r) => {
    const items = r.items.filter((p) => p.start < d || p.marker && p.start === d).map((p) => {
      const span = `${mediaTime(p.start, d)}${p.marker ? "" : ` - ${mediaTime(p.end, d)}`}`;
      const title = esc(p.label ? `${p.label} · ${span}` : span);
      const c = colorAttr(p.color);
      return p.marker ? `<div class="media-timeline-marker" data-item="${esc(p.id)}"${c.attr} style="left: ${pct(p.start, d)};${c.style}" title="${title}"><span>${esc(p.label)}</span></div>` : `<div class="media-timeline-item" data-item="${esc(p.id)}"${c.attr} style="left: ${pct(p.start, d)}; width: ${pct(Math.min(p.end, d) - p.start, d)}; --lane: ${p.lane};${c.style}" title="${title}"><span>${esc(p.label)}</span></div>`;
    }).join("");
    return `<div class="media-timeline-track" data-track="${esc(r.id)}" data-kind="${esc(r.kind)}"${rowAttrs(r)}>${items}</div>`;
  }).join("");
  const labels = scales.map((s) => `<div class="media-timeline-label" data-ruler>${esc(s.label)}</div>`).join("") + rt.rows.map((r) => `<div class="media-timeline-label" data-kind="${esc(r.kind)}"${rowAttrs(r)}>${esc(r.label)}</div>`).join("");
  dfDollar3(part(el, "ruler")).html(ruler);
  dfDollar3(part(el, "tracks")).html(rows);
  dfDollar3(part(el, "labels")).html(labels);
  rt.active = "";
  const loop = loopOf(rt.loop, d);
  if (!sameLoop(loop, rt.loop))
    rt.loop = loop;
  syncCaptions(el);
  for (const outlet of boundOf(el, '[data-media-timeline-outlet="events"]'))
    renderEvents(outlet, rt);
  rt.current = -2;
  paint(el, true);
}
function rowAttrs(r) {
  const bg = r.background.name ? `var(--${r.background.name})` : r.background.css;
  return `${r.for ? ` data-for="${esc(r.for)}"` : ""}${bg ? " data-background" : ""} style="--lanes: ${r.lanes};${bg ? ` --media-timeline-row: ${esc(bg)};` : ""}"`;
}
function syncCaptions(el) {
  const rt = runtimeOf(el);
  const m = rt.media;
  if (!m)
    return;
  mediaTextTracks(m, rt.data.tracks.filter((t) => TEXT_KINDS.includes(String(t?.kind)) && Array.isArray(t.items)).map((t) => ({
    id: String(t.id),
    kind: String(t.kind),
    label: String(t.label ?? t.id),
    lang: String(t.lang ?? ""),
    default: !!t.default,
    items: t.items
  })), el);
}
function runPlayhead(el) {
  const rt = runtimeOf(el);
  const head = part(el, "playhead");
  if (!head)
    return;
  rt.anim?.cancel();
  rt.anim = undefined;
  const t = Math.min(rt.duration, timeOf(rt));
  head.style.setProperty("left", pct(t, rt.duration));
  const rate = rateOf(rt);
  const to = rt.loop && t < rt.loop.end ? rt.loop.end : rt.duration;
  if (playingOf(rt) && to > t && rate > 0 && typeof head.animate === "function") {
    rt.animFrom = { time: t, rate };
    rt.anim = head.animate([{ left: pct(t, rt.duration) }, { left: pct(to, rt.duration) }], {
      duration: (to - t) / rate * 1000,
      easing: "linear",
      fill: "forwards"
    });
  }
  loopWatch(el);
}
function loopWatch(el) {
  const rt = runtimeOf(el);
  clearTimeout(rt.loopTimer);
  rt.loopTimer = undefined;
  const loop = rt.loop;
  if (!loop || !playingOf(rt))
    return;
  const t = timeOf(rt);
  if (t < loop.start - 0.05 || t >= loop.end - 0.01) {
    seek(el, loop.start);
    return;
  }
  const rate = rateOf(rt) || 1;
  rt.loopTimer = setTimeout(() => {
    rt.loopTimer = undefined;
    if (rt.loop && playingOf(rt) && timeOf(rt) >= rt.loop.end - 0.05)
      seek(el, rt.loop.start);
    else
      loopWatch(el);
  }, Math.max(10, (loop.end - t) / rate * 1000));
}
function paint(el, restart = false) {
  const rt = runtimeOf(el);
  const t = timeOf(rt);
  const d = rt.duration;
  const playing = playingOf(rt);
  const anim = rt.anim;
  const implied = anim && rt.animFrom ? rt.animFrom.time + num(anim.currentTime, 0) / 1000 * rt.animFrom.rate : NaN;
  if (restart || playing !== !!anim || playing && Math.abs(implied - t) > 0.2)
    runPlayhead(el);
  const scroll = part(el, "scroll");
  if (scroll) {
    const now = String(Math.floor(t));
    if (dfDollar3(scroll).attr("aria-valuenow") !== now || restart) {
      dfDollar3(scroll).attr("aria-valuemax", String(Math.floor(d)));
      dfDollar3(scroll).attr("aria-valuenow", now);
      dfDollar3(scroll).attr("aria-valuetext", `${mediaTime(t, d)} of ${mediaTime(d)}`);
    }
    if (playing && scroll.scrollWidth > scroll.clientWidth && d > 0) {
      const x = t / d * scroll.scrollWidth;
      if (x < scroll.scrollLeft || x > scroll.scrollLeft + scroll.clientWidth * 0.85)
        scroll.scrollTo({ left: x - scroll.clientWidth * 0.15, behavior: reduced() ? "auto" : "smooth" });
    }
  }
  paintLoop(el);
  const events = eventsOf(rt);
  let current = -1;
  for (let i = 0;i < events.length && events[i].time <= t + 0.000001; i++)
    current = i;
  if (current !== rt.current) {
    rt.current = current;
    for (const outlet of boundOf(el, '[data-media-timeline-outlet="events"]'))
      dfDollar3(outlet).find("[data-event]").each((_i, li) => {
        const on = Number(li.getAttribute("data-event")) === current;
        if (li.hasAttribute("aria-current") !== on)
          dfDollar3(li).attr("aria-current", on ? "true" : null);
      });
  }
  const active = activeAt(rt, t);
  const key = active.map((a) => `${a.track}
${a.item}`).join(`

`);
  for (const out of boundOf(el, "[data-media-timeline-output]")) {
    const kind = out.getAttribute("data-media-timeline-output");
    const loop = rt.drawing?.loop ?? rt.loop;
    const text = kind === "duration" ? mediaTime(d) : kind === "loop" ? loop ? `${mediaTime(loop.start, d)} - ${mediaTime(loop.end, d)}` : "" : kind === "active" ? active.map((a) => a.label).filter(Boolean).join(" · ") : mediaTime(t, d);
    if (dfDollar3(out).text() !== text)
      dfDollar3(out).text(text);
  }
  if (key === rt.active && !restart)
    return;
  rt.active = key;
  const ids = new Set(active.map((a) => `${a.track}
${a.item}`));
  dfDollar3(el).find(".media-timeline-track").each((_i, row) => {
    const track = row.getAttribute("data-track");
    dfDollar3(row).find(".media-timeline-item").each((_j, item) => {
      const on = ids.has(`${track}
${item.getAttribute("data-item")}`);
      if (item.hasAttribute("data-active") !== on)
        dfDollar3(item).attr("data-active", on ? "" : null);
    });
  });
  for (const outlet of boundOf(el, '[data-media-timeline-outlet="info"]'))
    renderInfo(outlet, rt, active);
  el.dispatchEvent(new CustomEvent("media-timeline-change", { bubbles: true, detail: { time: t, active } }));
}
var reduced = () => globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
function paintLoop(el) {
  const rt = runtimeOf(el);
  const box = part(el, "loop");
  const loop = rt.drawing?.loop ?? rt.loop;
  if (box) {
    const d = rt.duration;
    if (box.hasAttribute("hidden") !== !loop)
      dfDollar3(box).attr("hidden", loop ? null : "");
    if (loop && d > 0) {
      box.style.setProperty("left", pct(loop.start, d));
      box.style.setProperty("width", pct(loop.end - loop.start, d));
    }
  }
  for (const c of boundOf(el, '[data-media-timeline-action="loop-clear"]'))
    if (c.hasAttribute("disabled") !== !rt.loop)
      dfDollar3(c).attr("disabled", rt.loop ? null : "");
}
function eventsOf(rt) {
  return (Array.isArray(rt.data.events) ? rt.data.events : []).filter((e) => e && Number.isFinite(num(e.time, NaN)) && String(e.text ?? "") !== "").map((e) => ({ time: num(e.time, 0), text: String(e.text) })).sort((a, b) => a.time - b.time);
}
function renderEvents(outlet, rt) {
  outlet._timelineEmpty ??= dfDollar3(outlet).html() ?? "";
  const d = rt.duration;
  const items = eventsOf(rt).map((e, i) => `<li class="media-timeline-event" data-event="${i}"><button type="button" class="media-timeline-event-time" data-media-timeline-action="seek" data-value="${e.time}">${esc(mediaTime(e.time, d))}</button><span>${esc(e.text)}</span></li>`).join("");
  dfDollar3(outlet).html(items ? `<ol class="media-timeline-events">${items}</ol>` : outlet._timelineEmpty);
}
function renderInfo(outlet, rt, active) {
  outlet._timelineEmpty ??= dfDollar3(outlet).html() ?? "";
  const d = rt.duration;
  const cards = active.map((a) => {
    const row = rt.rows.find((r) => r.id === a.track);
    const p = row?.items.find((x) => x.id === a.item);
    if (!row || !p?.info)
      return "";
    const fields = Object.entries(p.info.fields ?? {}).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("");
    return `<article class="card media-timeline-card" data-track="${esc(a.track)}" data-item="${esc(a.item)}" data-color="${p.color}"><div class="card-header"><p class="media-timeline-card-meta"><span>${esc(row.label)}</span><span>${esc(`${mediaTime(p.start, d)} - ${mediaTime(p.end, d)}`)}</span></p><h3 class="card-title">${esc(p.info.title ?? p.label)}</h3>${p.info.text ? `<p class="card-description">${esc(p.info.text)}</p>` : ""}</div>${fields ? `<div class="card-content"><dl class="media-timeline-fields">${fields}</dl></div>` : ""}</article>`;
  }).join("");
  dfDollar3(outlet).html(cards || outlet._timelineEmpty);
}
function seek(el, time) {
  const rt = runtimeOf(el);
  const t = Math.min(rt.duration || Infinity, Math.max(0, time));
  if (rt.media) {
    if (Math.abs(rt.media.currentTime - t) > 0.001)
      rt.media.currentTime = t;
  } else {
    rt.time = t;
    if (rt.clock)
      rt.clock = { at: performance.now(), from: t };
  }
  paint(el, true);
}
function runClock(el, on) {
  const rt = runtimeOf(el);
  if (on === !!rt.clock)
    return;
  if (!on) {
    rt.time = timeOf(rt);
    rt.clock = undefined;
    paint(el, true);
    return;
  }
  if (rt.time >= rt.duration)
    rt.time = 0;
  rt.clock = { at: performance.now(), from: rt.time };
  const run = rt.clockRun = (rt.clockRun ?? 0) + 1;
  paint(el, true);
  const tick = () => {
    if (rt.clockRun !== run || !rt.clock)
      return;
    if (timeOf(rt) >= rt.duration) {
      rt.time = rt.duration;
      rt.clock = undefined;
      paint(el, true);
    } else {
      paint(el);
      setTimeout(tick, 250);
    }
    rt.report();
  };
  setTimeout(tick, 250);
}
function setLoop(el, loop) {
  const rt = runtimeOf(el);
  if (sameLoop(loop, rt.loop))
    return;
  rt.loop = loop;
  const t = timeOf(rt);
  if (loop && (t < loop.start || t >= loop.end))
    seek(el, loop.start);
  else
    paint(el, true);
  el.dispatchEvent(new CustomEvent("media-timeline-loop", {
    bubbles: true,
    detail: { loop: loop ? { ...loop } : null }
  }));
}
function applyMarkup3(el, _stateName, config) {
  const zoom = num(config.zoom, 0);
  dfDollar3(el).attr("data-zoom", zoom > 0 ? String(zoom) : null);
  dfDollar3(el).find('[data-media-timeline-action="loop-clear"]').each((_i, c) => {
    if (c.hasAttribute("disabled") !== !config.loop)
      dfDollar3(c).attr("disabled", config.loop ? null : "");
  });
  const script = dfDollar3(el).children("script.media-timeline-source");
  if (!config.data || !script.length)
    return;
  let authored = null;
  try {
    authored = JSON.parse(script.text() || "null");
  } catch {
    authored = null;
  }
  if (JSON.stringify(dataOf(authored)) !== JSON.stringify(dataOf(config.data)))
    script.text(JSON.stringify(config.data, null, 2));
}
function triggerStateChange3(el, stateName, config, incoming) {
  const rt = runtimeOf(el);
  applyMarkup3(el, stateName, config);
  let again = false;
  if ("data" in incoming && incoming.data !== rt.data) {
    const data = dataOf(incoming.data);
    if (JSON.stringify(data) !== JSON.stringify(rt.data)) {
      rt.data = data;
      again = true;
    }
  }
  if ("zoom" in incoming) {
    const zoom = Math.min(MAX_ZOOM, Math.max(0, num(incoming.zoom, 0)));
    if (zoom !== rt.zoom) {
      rt.zoom = zoom;
      again = true;
    }
  }
  if (again)
    render(el);
  const m = rt.media;
  if (!m && stateName !== "playing")
    runClock(el, false);
  if ("time" in incoming)
    seek(el, num(incoming.time, timeOf(rt)));
  if ("loop" in incoming)
    setLoop(el, loopOf(incoming.loop, rt.duration));
  if (!m) {
    runClock(el, stateName === "playing" && rt.duration > 0);
    return;
  }
  if (stateName === "playing" && m.paused)
    return m.play().then(() => {
      return;
    }, () => {
      return;
    });
  if (stateName !== "playing" && !m.paused)
    m.pause();
  return;
}
var mediaTimelineApi = componentState3({
  component: "media-timeline",
  states: mediaTimelineStates,
  mergeConfig: true,
  apply: (el, state, _previous, incoming) => triggerStateChange3(el, state.name, state.config, incoming),
  read: (el, state) => {
    const rt = runtimeOf(el);
    if (!rt)
      return state;
    const name = playingOf(rt) ? "playing" : "default";
    const time = timeOf(rt);
    const c = state.config;
    const loop = rt.loop;
    if (name === state.name && c.time === time && c.zoom === rt.zoom && c.data === rt.data && c.loop === loop)
      return state;
    return { name, config: { ...c, time, zoom: rt.zoom, data: rt.data, loop } };
  },
  markup: (el, state) => applyMarkup3(el, state.name, state.config)
});
df$3.mediaTimelineApi = mediaTimelineApi;
df$3.mediaTimelineStates = mediaTimelineStates;
function attach(el) {
  const rt = runtimeOf(el);
  if (rt.media)
    return;
  const id = el.getAttribute("data-media");
  const target = id ? dfDollar3(`#${CSS.escape(id)}`).get(0) : undefined;
  const m = mediaOf(target);
  if (!m)
    return;
  rt.media = m;
  const changed = (e) => {
    if (e.type === "loadedmetadata" || e.type === "durationchange")
      render(el);
    else if (e.type === "ended" && rt.loop) {
      seek(el, rt.loop.start);
      m.play().catch(() => {
        return;
      });
    } else
      paint(el, e.type !== "timeupdate");
    rt.report();
  };
  for (const type of [
    "play",
    "pause",
    "ended",
    "timeupdate",
    "seeked",
    "ratechange",
    "loadedmetadata",
    "durationchange",
    "emptied"
  ])
    m.addEventListener(type, changed);
  render(el);
}
function keyStep(e, rt, t) {
  const step = e.shiftKey ? 5 : 1;
  if (e.key === "ArrowLeft" || e.key === "ArrowDown")
    return t - step;
  if (e.key === "ArrowRight" || e.key === "ArrowUp")
    return t + step;
  if (e.key === "PageDown")
    return t - 10;
  if (e.key === "PageUp")
    return t + 10;
  if (e.key === "Home")
    return 0;
  if (e.key === "End")
    return rt.duration;
  return null;
}
function loopKey(e, rt, t) {
  if (e.key === "Escape")
    return rt.loop ? null : undefined;
  if (e.key === "[")
    return loopOf({ start: t, end: rt.loop && rt.loop.end > t ? rt.loop.end : rt.duration }, rt.duration);
  if (e.key === "]")
    return loopOf({ start: rt.loop && rt.loop.start < t ? rt.loop.start : 0, end: t }, rt.duration);
  return;
}
function zoomFor(el, action) {
  const rt = runtimeOf(el);
  const width = part(el, "scroll")?.clientWidth ?? 0;
  const fit = rt.duration > 0 ? width / rt.duration : 0;
  const now = rt.zoom || fit;
  if (action === "fit")
    return 0;
  if (action === "zoom-in")
    return Math.min(MAX_ZOOM, now * 1.5);
  if (action === "zoom-out")
    return now / 1.5 <= fit * 1.01 ? 0 : now / 1.5;
  return null;
}
var now3 = (el) => playingOf(runtimeOf(el)) ? "playing" : "default";
function init3() {
  dfDollar3(".media-timeline:not([data-init])").toArray().forEach((el) => {
    el.dataset.init = "";
    let data = null;
    try {
      data = JSON.parse(dfDollar3(el).children("script.media-timeline-source").text() || "null");
    } catch {
      data = null;
    }
    const rt = {
      data: dataOf(data),
      rows: [],
      duration: 0,
      zoom: Math.min(MAX_ZOOM, Math.max(0, num(el.getAttribute("data-zoom"), 0))),
      time: 0,
      media: null,
      active: "",
      loop: null,
      current: -1,
      report: () => mediaTimelineApi.getState(el)
    };
    el._timeline = rt;
    bindComponent3(el, mediaTimelineApi, {
      name: "default",
      config: { time: 0, zoom: rt.zoom, data: rt.data, loop: null }
    });
    dfDollar3(el).append(dfDollar3(`<div class="media-timeline-body" hidden><div class="media-timeline-labels" aria-hidden="true"></div><div class="media-timeline-scroll" role="slider" tabindex="0" aria-label="${esc(el.getAttribute("data-label") ?? "Playback position")}" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0"><div class="media-timeline-content"><div class="media-timeline-ruler" aria-hidden="true"></div><div class="media-timeline-tracks" aria-hidden="true"></div><div class="media-timeline-loop" aria-hidden="true" hidden></div><div class="media-timeline-playhead" aria-hidden="true"></div></div></div></div>`));
    const scroll = part(el, "scroll");
    const timeAt = (e) => {
      const box = part(el, "content")?.getBoundingClientRect();
      if (!box || box.width <= 0)
        return null;
      return Math.min(1, Math.max(0, (e.clientX - box.left) / box.width)) * runtimeOf(el).duration;
    };
    dfDollar3(scroll).on("pointerdown", (e) => {
      if (e.button !== 0 || !part(el, "content")?.contains(e.target))
        return;
      const t = timeAt(e);
      if (t === null)
        return;
      scroll.setPointerCapture?.(e.pointerId);
      scroll.focus({ preventScroll: true });
      const onRuler = !!part(el, "ruler")?.contains(e.target);
      rt.onRuler = onRuler;
      rt.drawing = onRuler ? { from: t, x: e.clientX, loop: null } : undefined;
      seek(el, t);
    });
    dfDollar3(scroll).on("pointermove", (e) => {
      if (!scroll.hasPointerCapture?.(e.pointerId))
        return;
      const t = timeAt(e);
      if (t === null)
        return;
      if (!rt.drawing)
        seek(el, t);
      else if (Math.abs(e.clientX - rt.drawing.x) >= 4) {
        rt.drawing.loop = loopOf({ start: rt.drawing.from, end: t }, rt.duration);
        paint(el);
      }
    });
    const drawn = () => {
      const loop = rt.drawing?.loop;
      rt.drawing = undefined;
      if (loop)
        el.api?.setState(now3(el), { loop });
      else
        paintLoop(el);
    };
    dfDollar3(scroll).on("pointerup", drawn);
    dfDollar3(scroll).on("pointercancel", drawn);
    dfDollar3(scroll).on("dblclick", () => {
      if (rt.loop && rt.onRuler)
        el.api?.setState(now3(el), { loop: null });
    });
    dfDollar3(scroll).on("keydown", (e) => {
      const t = timeOf(rt);
      const loop = loopKey(e, rt, t);
      if (loop !== undefined) {
        e.preventDefault();
        el.api?.setState(now3(el), { loop });
        return;
      }
      const next = keyStep(e, rt, t);
      if (next === null)
        return;
      e.preventDefault();
      el.api?.setState(now3(el), { time: next });
    });
    dfDollar3(el).on("click", (e) => {
      const control = e.target.closest("[data-media-timeline-action]");
      if (!control || control.closest(".media-timeline") !== el)
        return;
      onAction(el, control);
    });
    let width = 0;
    new ResizeObserver(() => {
      const w = scroll.clientWidth;
      if (Math.abs(w - width) < 1)
        return;
      width = w;
      if (runtimeOf(el).zoom === 0)
        render(el);
    }).observe(scroll);
    attach(el);
    render(el);
  });
  dfDollar3(".media-timeline[data-init][data-media]").toArray().forEach((el) => {
    if (el._timeline && !el._timeline.media)
      attach(el);
  });
}
function onAction(el, control) {
  const action = control.getAttribute("data-media-timeline-action") ?? "";
  const zoom = zoomFor(el, action);
  if (zoom !== null)
    el.api?.setState(now3(el), { zoom });
  else if (action === "toggle")
    el.api?.setState(now3(el) === "playing" ? "default" : "playing");
  else if (action === "seek")
    el.api?.setState("default", { time: num(control.getAttribute("data-value"), 0) });
  else if (action === "loop-clear")
    el.api?.setState(now3(el), { loop: null });
}
if (!document.__mediaTimelineInit) {
  document.__mediaTimelineInit = true;
  document.addEventListener("click", (e) => {
    const control = e.target?.closest?.("[data-media-timeline-action]");
    const bound = control?.closest("[data-media-timeline-for]");
    if (!control || !bound || bound.closest(".media-timeline"))
      return;
    const el = dfDollar3(`#${CSS.escape(bound.getAttribute("data-media-timeline-for") ?? "")}`).get(0);
    if (el?._timeline)
      onAction(el, control);
  });
}
var resolve3 = (target) => typeof target === "string" ? dfDollar3(target).get(0) : target;
df$3.mediaTimeline = {
  load: (target, data) => {
    const el = resolve3(target);
    if (el?._timeline)
      el.api?.setState(now3(el), { data });
  },
  data: (target) => {
    const el = resolve3(target);
    return el?._timeline ? dataOf(runtimeOf(el).data) : { version: 1, tracks: [] };
  },
  seek: (target, time) => {
    const el = resolve3(target);
    if (el?._timeline)
      el.api?.setState(now3(el), { time });
  },
  zoom: (target, pxPerSecond) => {
    const el = resolve3(target);
    if (el?._timeline)
      el.api?.setState(now3(el), { zoom: pxPerSecond });
  },
  loop: (target, start, end) => {
    const el = resolve3(target);
    if (!el?._timeline)
      return null;
    const rt = runtimeOf(el);
    el.api?.setState(now3(el), { loop: start == null ? null : { start, end: end ?? rt.duration } });
    return rt.loop ? { ...rt.loop } : null;
  },
  active: (target, time) => {
    const el = resolve3(target);
    if (!el?._timeline)
      return [];
    const rt = runtimeOf(el);
    return activeAt(rt, time ?? timeOf(rt));
  }
};
init3();
new MutationObserver(init3).observe(document, { childList: true, subtree: true });

//# debugId=A595AF0244B565DD64756E2164756E21
//# sourceMappingURL=multimedia.js.map
