// dist/components/video/video.js
var __df$core = globalThis.df$;
var __df$shared = __df$core && __df$core.shadcn && __df$core.shadcn.shared;
if (!__df$shared || __df$shared.abi !== "0.9.10") {
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
if (!__df$shared2 || __df$shared2.abi !== "0.9.10") {
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
if (!__df$shared3 || __df$shared3.abi !== "0.9.10") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals3, defussQuery: defussQuery3, componentState: componentState3, bindComponent: bindComponent3, bindGlobalKeys, mediaOf, mediaTextTracks, mediaTime, textLocale } = __df$shared3;
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
var SPACE_CONTROLS = 'button, a[href], input, select, textarea, summary, video, audio, [contenteditable="true"], [role="button"], [role="slider"], [role="menuitem"], [role="tab"], [role="option"], [role="checkbox"], [role="switch"]';
function onSpace(e) {
  if (e.key !== " " || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey)
    return;
  const target = e.target instanceof Element ? e.target : null;
  const timelines = dfDollar3(".media-timeline[data-init]").toArray();
  const inside = target?.closest(".media-timeline");
  const bound = target?.closest("[data-media-timeline-for]");
  const idle = !target || target === document.body || target === document.documentElement;
  if (!inside && !bound && !idle)
    return;
  const control = idle ? null : target?.closest(SPACE_CONTROLS);
  if (control && !control.matches(".media-timeline-scroll"))
    return;
  const playing = timelines.find((t) => t._timeline && playingOf(runtimeOf(t)));
  if (idle && !playing && dfDollar3('[data-state-name="playing"]:not(.media-timeline)').length)
    return;
  const el = (inside?._timeline ? inside : null) ?? (bound ? timelines.find((t) => t.id === bound.getAttribute("data-media-timeline-for")) : null) ?? playing ?? [...timelines].filter((t) => t._timelineUsed).sort((a, b) => b._timelineUsed - a._timelineUsed)[0] ?? (timelines.length === 1 ? timelines[0] : null);
  if (!el?._timeline || !(runtimeOf(el).duration > 0))
    return;
  e.preventDefault();
  el.api?.setState(now3(el) === "playing" ? "default" : "playing");
  return true;
}
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
    const used = () => {
      el._timelineUsed = performance.now();
    };
    dfDollar3(el).on("pointerdown", used);
    dfDollar3(el).on("focusin", used);
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
  el._timelineUsed = performance.now();
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
  bindGlobalKeys(onSpace);
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

// dist/components/fretboard/fretboard.js
var __df$core4 = globalThis.df$;
var __df$shared4 = __df$core4 && __df$core4.shadcn && __df$core4.shadcn.shared;
if (!__df$shared4 || __df$shared4.abi !== "0.9.10") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals4, defussQuery: defussQuery4, componentState: componentState4, bindComponent: bindComponent4, bindGlobalKeys: bindGlobalKeys2, mediaTime: mediaTime2 } = __df$shared4;
var df$4 = defussGlobals4();
var dfDollar4 = defussQuery4();
var fretboardStates = ["default", "playing", "paused"];
var GCEA = ["G", "C", "E", "A"];
var KINDS = ["chords", "tab", "lyrics"];
var MAX_MEASURES = 999;
var MAX_ITEMS = 5000;
var CHAR_EM = 0.6;
var SIZES = { chords: 0.875, tab: 0.75, lyrics: 0.875 };
var STRETCH_LAST = 0.7;
var MIN_ZOOM = 0.5;
var MAX_ZOOM2 = 3;
var ZOOM_STEP = 1.25;
var ZOOM_KEYS = { "+": "zoom-in", "=": "zoom-in", "-": "zoom-out", "0": "zoom-reset" };
var num2 = (v, fallback) => {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
};
var esc2 = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
var zoomOf = (v) => Math.round(clamp(num2(v, 1), MIN_ZOOM, MAX_ZOOM2) * 1000) / 1000;
var round = (v) => Math.round(v * 1e4) / 1e4;
var runtimeOf2 = (el) => el._fretboard;
var reduced2 = () => globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
var spbOf = (s) => 60 / s.bpm;
function songOf(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.scores))
    return { version: 1, scores: [] };
  try {
    return { version: 1, ...JSON.parse(JSON.stringify(raw)) };
  } catch {
    return { version: 1, scores: [] };
  }
}
function fretOf(v) {
  if (String(v).trim().toLowerCase() === "x")
    return "x";
  const n = num2(v, NaN);
  return Number.isFinite(n) ? clamp(Math.round(n), 0, 36) : null;
}
function barreOf(shape, fret) {
  const at = shape.flatMap((f, i) => f === fret ? [i] : []);
  if (!(fret > 0) || at.length < 2)
    return null;
  const from = at[0];
  const to = at[at.length - 1];
  for (let i = from;i <= to; i++) {
    const f = shape[i];
    if (typeof f !== "number" || f < fret)
      return null;
  }
  return { fret, from, to };
}
var capoOf = (raw) => clamp(Math.round(num2(raw.capo, 0)), 0, 12);
function shapeOf(v, strings) {
  const parts = typeof v === "string" ? /[\s,]/.test(v.trim()) ? v.trim().split(/[\s,]+/) : [...v.trim()] : v;
  if (!Array.isArray(parts) || parts.length !== strings)
    return null;
  const frets = parts.map(fretOf);
  return frets.every((f) => f !== null) ? frets : null;
}
function rawScore(song, id, depth = 0) {
  const own = song.scores.find((s) => s && String(s.id) === id);
  if (!own)
    return null;
  const base = own.from != null && depth < 8 && String(own.from) !== id ? rawScore(song, String(own.from), depth + 1) : null;
  if (!base)
    return own;
  const tracks = [...Array.isArray(base.tracks) ? base.tracks : []];
  for (const t of Array.isArray(own.tracks) ? own.tracks : []) {
    const i = tracks.findIndex((b) => b && t && String(b.id) === String(t.id));
    if (i >= 0)
      tracks[i] = t;
    else
      tracks.push(t);
  }
  return {
    ...base,
    ...own,
    label: own.label,
    chords: { ...base.chords, ...own.chords },
    tracks,
    from: undefined
  };
}
function infosOf(song) {
  return song.scores.filter((s) => s && s.id != null).map((s) => {
    const raw = rawScore(song, String(s.id)) ?? s;
    const key = String(raw.key ?? "");
    const signature = signatureOf(raw);
    const bpm = clamp(num2(raw.bpm, 90), 20, 400);
    return { id: String(s.id), label: labelOf(raw, signature), key, signature, bpm };
  });
}
function signatureOf(raw) {
  const time = Array.isArray(raw.time) ? raw.time : [];
  return `${clamp(Math.round(num2(time[0], 4)), 1, 32)}/${Math.max(1, Math.round(num2(time[1], 4)))}`;
}
var labelOf = (raw, signature) => String(raw.label ?? `${raw.key ? `${raw.key} · ` : ""}${signature}${capoOf(raw) ? ` · capo ${capoOf(raw)}` : ""}`);
function pick(song, key, signature, current) {
  const inKey = infosOf(song).filter((i) => i.key === String(key ?? ""));
  if (!inKey.length)
    return current;
  return (inKey.find((i) => i.signature === String(signature ?? "")) ?? inKey[0]).id;
}
var syllables = (text) => text.split(/\s+/).filter(Boolean).flatMap((w) => w === "_" ? ["_"] : w.split(/(?<=-)(?=.)/));
function build(song, raw) {
  const tuningRaw = Array.isArray(raw.tuning) ? raw.tuning : Array.isArray(song.tuning) ? song.tuning : GCEA;
  const tuning = tuningRaw.length >= 1 && tuningRaw.length <= 12 ? tuningRaw.map(String) : GCEA;
  const n = tuning.length;
  const chords = new Map;
  const barres = new Map;
  for (const [name, v] of Object.entries({ ...song.chords, ...raw.chords })) {
    const withBarre = !!v && typeof v === "object" && !Array.isArray(v);
    const shape = shapeOf(withBarre ? v.frets : v, n);
    if (!shape)
      continue;
    chords.set(name, shape);
    const barre = withBarre ? barreOf(shape, num2(v.barre, 0)) : null;
    if (barre)
      barres.set(name, barre);
  }
  const time = Array.isArray(raw.time) ? raw.time : [];
  const beats = clamp(Math.round(num2(time[0], 4)), 1, 32);
  const bpm = clamp(num2(raw.bpm, 90), 20, 400);
  const tracks = (Array.isArray(raw.tracks) ? raw.tracks : []).filter((t) => t && typeof t === "object" && t.id != null);
  const itemsOf = (t) => (Array.isArray(t.items) ? t.items : []).slice(0, MAX_ITEMS).filter((i) => i && typeof i === "object");
  const startOf = (i) => (clamp(Math.round(num2(i.measure, 1)), 1, MAX_MEASURES) - 1) * beats + Math.max(0, num2(i.beat, 1) - 1);
  let last = 1;
  for (const t of tracks)
    for (const i of itemsOf(t)) {
      const s = startOf(i);
      last = Math.max(last, Math.floor(s / beats) + 1, Math.ceil((s + Math.max(0, num2(i.beats, 0))) / beats));
    }
  const measures = clamp(Math.round(num2(raw.measures, 0)) || last, 1, MAX_MEASURES);
  const total = measures * beats;
  const kindOf = (t) => KINDS.includes(String(t.kind)) ? String(t.kind) : "tab";
  const finish = (list) => {
    const sorted = list.filter((p) => p.start < total).sort((a, b) => a.start - b.start);
    const starts = [...new Set(sorted.map((p) => p.start))];
    return sorted.map(({ beats: b, ...p }) => {
      const next = starts.find((s) => s > p.start) ?? total;
      return { ...p, end: Math.min(total, b !== null ? p.start + Math.max(0, b) : next) };
    });
  };
  const blank = (t, i, start, item) => ({
    id: `${t.id}-${i}`,
    track: String(t.id),
    kind: kindOf(t),
    start,
    end: start,
    text: "",
    notes: [],
    strum: "",
    chord: "",
    beats: item.beats != null && Number.isFinite(num2(item.beats, NaN)) ? num2(item.beats, 0) : null
  });
  const placed = new Map;
  for (const t of tracks.filter((t) => kindOf(t) === "chords"))
    placed.set(String(t.id), finish(itemsOf(t).map((item, i) => ({ ...blank(t, i, startOf(item), item), text: String(item.name ?? item.text ?? "") })).filter((p) => p.text !== "")));
  const chordLane = tracks.find((t) => kindOf(t) === "chords");
  const chordAt = (at) => (chordLane && placed.get(String(chordLane.id))?.find((p) => p.start <= at && at < p.end)?.text) ?? "";
  for (const t of tracks.filter((t) => kindOf(t) === "tab"))
    placed.set(String(t.id), finish(itemsOf(t).map((item, i) => {
      const start = startOf(item);
      const chord = item.chord != null ? String(item.chord) : chordAt(start);
      const shape = chords.get(chord);
      const fromShape = (s) => shape?.[n - s] ?? null;
      const strum = item.strum === "down" || item.strum === "up" ? item.strum : "";
      let notes = [];
      let usesChord = false;
      const note = (s, f) => {
        const string = Math.round(num2(s, NaN));
        if (!(string >= 1 && string <= n))
          return null;
        const fret = f != null && f !== "" ? fretOf(f) : fromShape(string);
        if (f == null || f === "")
          usesChord = true;
        return fret === null ? null : { string, fret };
      };
      const real = (x) => !!x;
      if (Array.isArray(item.notes))
        notes = item.notes.map((x) => x ? note(x.string, x.fret) : null).filter(real);
      else if (item.string != null)
        notes = [note(item.string, item.fret)].filter(real);
      else if (item.chord != null || strum) {
        usesChord = true;
        notes = shape ? shape.map((fret, k) => ({ string: n - k, fret })) : [];
      }
      notes.sort((a, b) => a.string - b.string);
      return { ...blank(t, i, start, item), notes, strum, chord: usesChord ? chord : "" };
    }).filter((p) => p.notes.length || p.strum)));
  for (const t of tracks.filter((t) => kindOf(t) === "lyrics")) {
    const followed = t.follow != null ? placed.get(String(t.follow)) : undefined;
    if (followed && typeof t.text === "string") {
      const notes = [...new Set(followed.map((p) => p.start))].map((start) => ({
        start,
        end: Math.max(...followed.filter((p) => p.start === start).map((p) => p.end))
      }));
      const out = [];
      let k = 0;
      for (const sy of syllables(t.text)) {
        if (k >= notes.length)
          break;
        if (sy === "_") {
          if (out.length)
            out[out.length - 1].end = notes[k].end;
        } else {
          const { start, end } = notes[k];
          out.push({
            id: `${t.id}-${out.length}`,
            track: String(t.id),
            kind: "lyrics",
            start,
            end,
            text: sy,
            notes: [],
            strum: "",
            chord: ""
          });
        }
        k++;
      }
      placed.set(String(t.id), out);
    } else
      placed.set(String(t.id), finish(itemsOf(t).map((item, i) => ({ ...blank(t, i, startOf(item), item), text: String(item.text ?? item.name ?? "") })).filter((p) => p.text !== "")));
  }
  const lanes = tracks.map((t) => {
    const items = placed.get(String(t.id)) ?? [];
    return {
      id: String(t.id),
      kind: kindOf(t),
      label: String(t.label ?? ""),
      lang: String(t.lang ?? ""),
      strums: items.some((p) => p.strum),
      items
    };
  });
  const marks = new Set;
  for (let m = 0;m <= measures; m++)
    marks.add(m * beats);
  for (const l of lanes)
    for (const p of l.items) {
      marks.add(round(p.start));
      marks.add(round(p.end));
    }
  return {
    id: String(raw.id),
    label: labelOf(raw, signatureOf(raw)),
    key: String(raw.key ?? ""),
    bpm,
    beats,
    signature: signatureOf(raw),
    measures,
    total,
    tuning,
    chords,
    barres,
    capo: capoOf(raw),
    lanes,
    marks: [...marks].sort((a, b) => a - b)
  };
}
function nextMark(s, p) {
  let lo = 0;
  let hi = s.marks.length;
  while (lo < hi) {
    const mid = lo + hi >> 1;
    if (s.marks[mid] <= p + 0.000001)
      lo = mid + 1;
    else
      hi = mid;
  }
  return s.marks[lo] ?? s.total;
}
var notesText = (p) => p.notes.map((n) => `${n.string}/${n.fret}`).join(" ");
function activeAt2(s, p) {
  return s.lanes.flatMap((l) => l.items.filter((x) => x.start <= p + 0.000001 && p + 0.000001 < x.end).map((x) => ({
    track: l.id,
    item: x.id,
    kind: l.kind,
    text: l.kind === "tab" ? notesText(x) : x.text,
    start: x.start,
    end: x.end
  })));
}
function positionOf(rt) {
  const s = rt.score;
  if (!s)
    return 0;
  const p = rt.clock ? rt.clock.from + (performance.now() - rt.clock.at) / 1000 / spbOf(s) : rt.position;
  return clamp(p, 0, s.total);
}
var loopRange = (rt) => rt.loop && rt.score ? [(rt.loop.start - 1) * rt.score.beats, rt.loop.end * rt.score.beats] : null;
function loopOf2(raw, s) {
  if (!raw || typeof raw !== "object" || !s)
    return null;
  const r = raw;
  const a = Math.round(num2(r.start, NaN));
  const b = Math.round(num2(r.end, a));
  if (!Number.isFinite(a) || !Number.isFinite(b))
    return null;
  return { start: clamp(Math.min(a, b), 1, s.measures), end: clamp(Math.max(a, b), 1, s.measures) };
}
var sameLoop2 = (a, b) => a === b || !!a && !!b && a.start === b.start && a.end === b.end;
var part2 = (el, name) => dfDollar4(el).find(`.fretboard-${name}`).get(0);
function boundOf2(el, sel) {
  const out = dfDollar4(el).find(sel).toArray();
  if (el.id)
    for (const bound of dfDollar4(`[data-fretboard-for="${CSS.escape(el.id)}"]`).toArray()) {
      if (bound.matches(sel))
        out.push(bound);
      out.push(...dfDollar4(bound).find(sel).toArray());
    }
  return out;
}
function lengthOf2(el, name, rem, fallback) {
  const m = /^\s*(-?[\d.]+)(px|rem|em)?\s*$/.exec(getComputedStyle(el).getPropertyValue(name));
  if (!m)
    return fallback;
  return m[2] === "px" ? Number(m[1]) : Number(m[1]) * rem;
}
function measureWidths(s, rem, beatPx, padPx) {
  const out = Array.from({ length: s.measures }, () => s.beats * beatPx);
  for (const lane of s.lanes) {
    const size = SIZES[lane.kind] * rem;
    const need = new Map;
    for (const p of lane.items) {
      const chars = lane.kind === "tab" ? Math.max(1, ...p.notes.map((n) => String(n.fret).length)) : p.text.length;
      need.set(p.start, Math.max(need.get(p.start) ?? 0, chars * CHAR_EM * size + 0.5 * rem));
    }
    const starts = [...need.keys()].sort((a, b) => a - b);
    starts.forEach((start, i) => {
      const m = Math.floor(start / s.beats);
      if (m >= s.measures)
        return;
      const end = (m + 1) * s.beats;
      const span = Math.max(0.125, Math.min(end, starts[i + 1] ?? end) - start);
      out[m] = Math.max(out[m], need.get(start) * s.beats / span);
    });
  }
  return out.map((w) => Math.ceil(w + 2 * padPx));
}
function breakLines(widths, width) {
  const lines = [];
  let line = [];
  let sum = 0;
  widths.forEach((w, i) => {
    if (line.length && sum + w > width) {
      lines.push(line);
      line = [];
      sum = 0;
    }
    line.push(i);
    sum += w;
  });
  if (line.length)
    lines.push(line);
  return lines;
}
function clefLane(s, l) {
  const n = s.tuning.length;
  if (l.kind === "tab")
    return `<div class="fretboard-lane" data-kind="tab"${l.strums ? " data-strums" : ""} style="--fretboard-strings: ${n}">${s.tuning.map((name, k) => `<span class="fretboard-string-name" data-string="${n - k}" style="--fretboard-s: ${n - k}">${esc2(name)}</span>`).join("")}</div>`;
  return `<div class="fretboard-lane" data-kind="${l.kind}"${l.label ? ` title="${esc2(l.label)}"` : ""}><span class="fretboard-lane-label">${esc2(l.label)}</span></div>`;
}
function itemMarkup(l, p, at) {
  const attrs = `data-item="${esc2(p.id)}" style="--fretboard-at: ${round(at)}"`;
  if (l.kind === "chords")
    return `<span class="fretboard-chord" ${attrs}>${esc2(p.text)}</span>`;
  if (l.kind === "lyrics")
    return `<span class="fretboard-syllable" ${attrs}>${esc2(p.text)}</span>`;
  const frets = p.notes.map((x) => `<span class="fretboard-fret" data-string="${x.string}" style="--fretboard-s: ${x.string}">${x.fret === "x" ? "×" : x.fret}</span>`).join("");
  const strum = p.strum ? `<span class="fretboard-strum" data-dir="${p.strum}"></span>` : "";
  return `<span class="fretboard-hit" ${attrs}${p.chord ? ` title="${esc2(p.chord)}"` : ""}>${frets}${strum}</span>`;
}
function layout(el) {
  const rt = runtimeOf2(el);
  const sheet = part2(el, "sheet");
  if (!sheet)
    return;
  rt.anim?.cancel();
  rt.anim = undefined;
  rt.measure = -1;
  rt.line = -1;
  rt.active = "";
  const s = rt.score;
  if (!s) {
    rt.lineOf = [];
    dfDollar4(sheet).html("");
    return;
  }
  const z = rt.zoom;
  if (sheet.style.getPropertyValue("--fretboard-zoom") !== String(z))
    sheet.style.setProperty("--fretboard-zoom", String(z));
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const cs = getComputedStyle(sheet);
  rt.pad = lengthOf2(sheet, "--fretboard-pad", rem, 0.75 * rem) * z;
  const clef = lengthOf2(sheet, "--fretboard-clef", rem, 2.25 * rem) * z;
  const inner = sheet.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
  const width = Math.max(1, inner - clef);
  const widths = measureWidths(s, rem * z, lengthOf2(sheet, "--fretboard-beat", rem, 2.5 * rem) * z, rt.pad);
  const lines = breakLines(widths, width);
  rt.lineOf = [];
  const byMeasure = s.lanes.map((l) => {
    const per = Array.from({ length: s.measures }, () => []);
    for (const p of l.items)
      per[Math.min(s.measures - 1, Math.floor(p.start / s.beats))].push(p);
    return per;
  });
  const strings = Array.from({ length: s.tuning.length }, (_, k) => `<span class="fretboard-string" data-string="${k + 1}" style="--fretboard-s: ${k + 1}"></span>`).join("");
  const clefMarkup = `<div class="fretboard-clef" aria-hidden="true"><span class="fretboard-number"></span>${s.lanes.map((l) => clefLane(s, l)).join("")}</div>`;
  const markup = lines.map((line, li) => {
    const sum = line.reduce((a, m) => a + widths[m], 0);
    const stretch = li < lines.length - 1 || sum >= STRETCH_LAST * width;
    const measures = line.map((m) => {
      rt.lineOf[m] = li;
      const lanes = s.lanes.map((l, k) => {
        const tab = l.kind === "tab";
        const items = (tab ? strings : "") + byMeasure[k][m].map((p) => itemMarkup(l, p, (p.start - m * s.beats) / s.beats)).join("");
        return `<div class="fretboard-lane" data-kind="${l.kind}" data-track="${esc2(l.id)}"${l.lang ? ` lang="${esc2(l.lang)}"` : ""}${tab && l.strums ? " data-strums" : ""}${tab ? ` aria-hidden="true" style="--fretboard-strings: ${s.tuning.length}"` : ""}>${items}</div>`;
      }).join("");
      return `<div class="fretboard-measure" data-measure="${m + 1}"${m === s.measures - 1 ? " data-last" : ""} style="flex: ${stretch ? widths[m] : 0} 1 ${widths[m]}px; min-inline-size: ${widths[m]}px"><span class="fretboard-number" aria-hidden="true">${m + 1}</span>${lanes}</div>`;
    }).join("");
    return `<div class="fretboard-line" data-line="${li}">${clefMarkup}${measures}</div>`;
  }).join("");
  dfDollar4(sheet).html(markup);
  dfDollar4(sheet).attr("data-lines", String(lines.length));
  paintLoop2(el);
  paint2(el, true);
}
function showScore(el, id) {
  const rt = runtimeOf2(el);
  const p = positionOf(rt);
  const before = rt.score?.total ?? 0;
  const first = rt.song.scores.find((x) => x && x.id != null);
  const raw = rawScore(rt.song, id) ?? (first ? rawScore(rt.song, String(first.id)) : null);
  rt.score = raw ? build(rt.song, raw) : null;
  const s = rt.score;
  const mapped = !s || !before || before === s.total ? p : Math.floor(p / before * s.total / s.beats) * s.beats;
  const at = s ? clamp(mapped, 0, Math.max(0, s.total - 0.001)) : 0;
  if (rt.clock)
    rt.clock = { at: performance.now(), from: at };
  else
    rt.position = at;
  rt.loop = loopOf2(rt.loop, s);
  rt.version++;
  fillControls(el);
  layout(el);
  if (rt.clock)
    schedule(el);
}
function fillControls(el) {
  const rt = runtimeOf2(el);
  const s = rt.score;
  const infos = infosOf(rt.song);
  for (const c of boundOf2(el, "[data-fretboard-control]")) {
    const kind = c.getAttribute("data-fretboard-control");
    if (kind === "position") {
      dfDollar4(c).attr("max", String(s?.total ?? 0));
      continue;
    }
    if (c.localName !== "select")
      continue;
    let options = [];
    let value = "";
    if (kind === "key") {
      options = [...new Set(infos.map((i) => i.key).filter(Boolean))].map((k) => [k, k]);
      value = s?.key ?? "";
    } else if (kind === "signature") {
      options = [...new Set(infos.filter((i) => i.key === (s?.key ?? "")).map((i) => i.signature))].map((x) => [x, x]);
      value = s?.signature ?? "";
    } else if (kind === "score") {
      options = infos.map((i) => [i.id, i.label]);
      value = s?.id ?? "";
    }
    const markup = options.map(([v, l]) => `<option value="${esc2(v)}">${esc2(l)}</option>`).join("");
    if (c._fretboardOptions !== markup) {
      dfDollar4(c).html(markup);
      c._fretboardOptions = markup;
    }
    c.value = value;
  }
}
function lookOf(el, outlet) {
  const attr = (name) => outlet.getAttribute(name) ?? el.getAttribute(name) ?? "";
  return {
    hand: attr("data-hand") === "right" ? "right" : "left",
    orientation: outlet.getAttribute("data-orientation") === "vertical" ? "vertical" : "horizontal",
    colors: attr("data-colors") === "strings" ? "strings" : ""
  };
}
var shapeText = (shape) => shape.some((f) => typeof f === "number" && f > 9) ? shape.join(" ") : shape.join("");
function renderChords(outlet, s, look) {
  const names = [];
  const seen = (name) => name && !names.includes(name) && names.push(name);
  const items = s.lanes.flatMap((l) => l.items.map((p) => [p.start, l.kind === "chords" ? p.text : p.chord])).sort((a, b) => a[0] - b[0]);
  for (const [, name] of items)
    seen(name);
  const chart = (name) => {
    const shape = s.chords.get(name);
    const barre = s.barres.get(name);
    return `<figure class="chord-chart" data-chord="${esc2(name)}"${shape ? ` data-shape="${esc2(shapeText(shape))}"` : ""}${barre ? ` data-barre="${barre.fret}"` : ""}${s.capo ? ` data-capo="${s.capo}"` : ""} data-orientation="${look.orientation}" data-hand="${look.hand}"${look.colors ? ` data-colors="${look.colors}"` : ""}><figcaption>${esc2(name)}</figcaption></figure>`;
  };
  dfDollar4(outlet).html(names.map(chart).join(""));
}
function neckFrets(s) {
  const highest = Math.max(0, ...s.lanes.flatMap((l) => l.items.flatMap((p) => p.notes.map((x) => typeof x.fret === "number" ? x.fret : 0))), ...[...s.chords.values()].flatMap((f) => f.map((x) => typeof x === "number" ? x : 0)));
  return clamp(s.capo + highest + 2, 3, 24);
}
function driveNeck(el, neck, s, active, p) {
  const own = neck._fretboardOwn ??= ["data-tuning", "data-frets", "data-hand", "data-colors"].filter((a) => neck.hasAttribute(a));
  const put = (name, v) => {
    if (!own.includes(name) && neck.getAttribute(name) !== v)
      dfDollar4(neck).attr(name, v);
  };
  put("data-tuning", s.tuning.join(" "));
  put("data-frets", String(neckFrets(s)));
  put("data-hand", el.getAttribute("data-hand") === "right" ? "right" : "left");
  put("data-colors", el.getAttribute("data-colors") === "strings" ? "strings" : null);
  const chord = active.find((a) => a.kind === "chords")?.text ?? "";
  const shape = s.chords.get(chord);
  const tabs = s.lanes.filter((l) => l.kind === "tab");
  const ids = new Set(active.map((a) => a.item));
  const next = Math.min(Infinity, ...tabs.flatMap((l) => l.items.filter((x) => x.start > p + 0.000001).map((x) => x.start)));
  const pairs = (pick) => tabs.flatMap((l) => l.items.filter(pick).flatMap((x) => x.notes)).filter((n) => typeof n.fret === "number").map((n) => `${n.string}/${n.fret}`).join(" ");
  const state = {
    shape: shape ? shapeText(shape) : "",
    barre: s.barres.get(chord)?.fret ?? null,
    notes: pairs((x) => ids.has(x.id)),
    next: pairs((x) => x.start === next),
    capo: s.capo
  };
  const key = JSON.stringify(state);
  if (neck._fretboardNeckFrom === key)
    return;
  neck._fretboardNeckFrom = key;
  if (neck.api)
    neck.api.setState("default", state);
  else {
    const attr = (name, v) => {
      if (neck.getAttribute(name) !== v)
        dfDollar4(neck).attr(name, v);
    };
    attr("data-shape", state.shape || null);
    attr("data-barre", state.barre === null ? null : String(state.barre));
    attr("data-notes", state.notes || null);
    attr("data-next", state.next || null);
    attr("data-capo", state.capo ? String(state.capo) : null);
  }
}
function runCursor(el) {
  const rt = runtimeOf2(el);
  const s = rt.score;
  const sheet = part2(el, "sheet");
  rt.anim?.cancel();
  rt.anim = undefined;
  if (!s || !sheet)
    return;
  const p = positionOf(rt);
  const m = Math.min(s.measures - 1, Math.floor(p / s.beats));
  rt.measure = m;
  const measure = dfDollar4(sheet).find(`.fretboard-measure[data-measure="${m + 1}"]`).get(0);
  if (!measure)
    return;
  let cursor = dfDollar4(sheet).find(".fretboard-cursor").get(0);
  if (!cursor) {
    cursor = dfDollar4('<div class="fretboard-cursor" aria-hidden="true"><div class="fretboard-playhead"></div></div>').get(0);
  }
  if (cursor.parentElement !== measure)
    dfDollar4(measure).append(cursor);
  const head = cursor.firstElementChild;
  const f = clamp((p - m * s.beats) / s.beats, 0, 1);
  head.style.setProperty("left", `${round(f * 100)}%`);
  if (rt.status === "playing" && rt.clock && f < 1 && typeof head.animate === "function")
    rt.anim = head.animate([{ left: `${round(f * 100)}%` }, { left: "100%" }], {
      duration: (1 - f) * s.beats * spbOf(s) * 1000,
      easing: "linear",
      fill: "forwards"
    });
}
function follow(el, line, align) {
  if (el.getAttribute("data-follow") === "none")
    return;
  const sheet = part2(el, "sheet");
  const row = sheet && dfDollar4(sheet).children(".fretboard-line").eq(line).get(0);
  if (!sheet || !row)
    return;
  const behavior = reduced2() ? "auto" : "smooth";
  if (sheet.scrollHeight > sheet.clientHeight + 1) {
    const gap = lineGap(sheet);
    const top = Math.max(0, row.offsetTop - gap);
    const bottom = row.offsetTop + row.offsetHeight + gap;
    if (align || top < sheet.scrollTop)
      sheet.scrollTo({ top, behavior });
    else if (bottom > sheet.scrollTop + sheet.clientHeight)
      sheet.scrollTo({ top: bottom - sheet.clientHeight, behavior });
    return;
  }
  const box = row.getBoundingClientRect();
  const view = document.documentElement.clientHeight;
  if (box.top < 0 || box.bottom > view * (align ? 2 / 3 : 1))
    row.scrollIntoView({ block: align ? "start" : "nearest", behavior });
}
var lineGap = (sheet) => parseFloat(getComputedStyle(sheet).rowGap) || 8;
function paint2(el, restart = false) {
  const rt = runtimeOf2(el);
  const s = rt.score;
  if (!s || !part2(el, "sheet"))
    return;
  const p = positionOf(rt);
  const m = Math.min(s.measures - 1, Math.floor(p / s.beats));
  const playing = rt.status === "playing" && !!rt.clock;
  if (restart || m !== rt.measure || playing !== !!rt.anim)
    runCursor(el);
  const line = rt.lineOf[m] ?? 0;
  if (line !== rt.line) {
    const first = rt.line < 0;
    rt.line = line;
    if (!first)
      follow(el, line, rt.status === "playing");
  }
  const active = activeAt2(s, p);
  for (const b of boundOf2(el, '[data-fretboard-action="toggle"], [data-fretboard-action="loop"]')) {
    const on = b.getAttribute("data-fretboard-action") === "toggle" ? rt.status === "playing" : !!rt.loop;
    if (b.getAttribute("aria-pressed") !== String(on))
      dfDollar4(b).attr("aria-pressed", String(on));
  }
  for (const out of boundOf2(el, "[data-fretboard-output]")) {
    const text = outputText(out.getAttribute("data-fretboard-output") ?? "", rt, s, p, m, active);
    if (dfDollar4(out).text() !== text)
      dfDollar4(out).text(text);
  }
  for (const c of boundOf2(el, '[data-fretboard-control="position"]')) {
    const v = String(Math.floor(p + 0.000001));
    if (c.value !== v)
      c.value = v;
  }
  for (const neck of boundOf2(el, ".fretboard-neck"))
    driveNeck(el, neck, s, active, p);
  const chord = active.find((a) => a.kind === "chords")?.text ?? "";
  for (const outlet of boundOf2(el, '[data-fretboard-outlet="chords"]')) {
    const look = lookOf(el, outlet);
    const drawn = `${rt.version}|${look.hand}|${look.orientation}|${look.colors}`;
    if (outlet._fretboardFor !== drawn) {
      outlet._fretboardFor = drawn;
      renderChords(outlet, s, look);
    }
    dfDollar4(outlet).find(".chord-chart").each((_i, d) => {
      const on = d.getAttribute("data-chord") === chord;
      if (d.hasAttribute("data-active") === on)
        return;
      if (d.api)
        d.api.setState(on ? "active" : "default");
      else
        dfDollar4(d).attr("data-active", on ? "" : null);
    });
  }
  const key = active.map((a) => a.item).join(`
`);
  if (key === rt.active && !restart)
    return;
  rt.active = key;
  const ids = new Set(active.map((a) => a.item));
  dfDollar4(part2(el, "sheet")).find("[data-item]").each((_i, item) => {
    const on = ids.has(item.getAttribute("data-item") ?? "");
    if (item.hasAttribute("data-active") !== on)
      dfDollar4(item).attr("data-active", on ? "" : null);
  });
  el.dispatchEvent(new CustomEvent("fretboard-change", {
    bubbles: true,
    detail: { position: round(p), measure: m + 1, score: s.id, active }
  }));
}
function outputText(kind, rt, s, p, m, active) {
  const spb = spbOf(s);
  if (kind === "time")
    return mediaTime2(p * spb, s.total * spb);
  if (kind === "duration")
    return mediaTime2(s.total * spb);
  if (kind === "measure")
    return String(m + 1);
  if (kind === "measures")
    return String(s.measures);
  if (kind === "beat")
    return String(Math.min(s.beats, Math.floor(p - m * s.beats + 0.000001) + 1));
  if (kind === "bpm")
    return String(s.bpm);
  if (kind === "signature")
    return s.signature;
  if (kind === "key")
    return s.key;
  if (kind === "score")
    return s.label;
  if (kind === "chord")
    return active.find((a) => a.kind === "chords")?.text ?? "";
  if (kind === "loop")
    return rt.loop ? `${rt.loop.start} - ${rt.loop.end}` : "";
  if (kind === "zoom")
    return `${Math.round(rt.zoom * 100)}%`;
  if (kind === "capo")
    return s.capo ? String(s.capo) : "";
  return "";
}
function paintLoop2(el) {
  const rt = runtimeOf2(el);
  const sheet = part2(el, "sheet");
  if (!sheet)
    return;
  dfDollar4(sheet).find(".fretboard-measure").each((_i, m) => {
    const n = Number(m.getAttribute("data-measure"));
    const on = !!rt.loop && n >= rt.loop.start && n <= rt.loop.end;
    if (m.hasAttribute("data-loop") !== on)
      dfDollar4(m).attr("data-loop", on ? "" : null);
  });
}
function schedule(el) {
  const rt = runtimeOf2(el);
  const s = rt.score;
  clearTimeout(rt.timer);
  rt.timer = undefined;
  if (!rt.clock || !s)
    return;
  const p = positionOf(rt);
  const range = loopRange(rt);
  const bound = range ? range[1] : s.total;
  if (p >= bound - 0.000001) {
    if (range) {
      rt.clock = { at: performance.now(), from: range[0] };
      paint2(el, true);
      schedule(el);
    } else {
      rt.clock = undefined;
      rt.position = 0;
      rt.status = "default";
      paint2(el, true);
    }
    rt.report();
    return;
  }
  const next = Math.min(bound, nextMark(s, p));
  rt.timer = setTimeout(() => {
    rt.timer = undefined;
    paint2(el);
    schedule(el);
    rt.report();
  }, Math.max(4, (next - p) * spbOf(s) * 1000 + 2));
}
function runClock2(el, on) {
  const rt = runtimeOf2(el);
  const s = rt.score;
  if (!on || !s || s.total <= 0) {
    clearTimeout(rt.timer);
    rt.timer = undefined;
    if (rt.clock) {
      rt.position = positionOf(rt);
      rt.clock = undefined;
    }
    return;
  }
  if (!rt.clock) {
    const range = loopRange(rt);
    let p = rt.position;
    if (range && (p < range[0] || p >= range[1]))
      p = range[0];
    else if (p >= s.total - 0.000001)
      p = 0;
    rt.position = p;
    rt.clock = { at: performance.now(), from: p };
  }
  schedule(el);
}
function seek2(el, position) {
  const rt = runtimeOf2(el);
  const s = rt.score;
  if (!s)
    return;
  const p = clamp(position, 0, Math.max(0, s.total - 0.001));
  if (rt.clock)
    rt.clock = { at: performance.now(), from: p };
  else
    rt.position = p;
  paint2(el, true);
  if (rt.clock)
    schedule(el);
}
function setLoop2(el, loop) {
  const rt = runtimeOf2(el);
  if (sameLoop2(loop, rt.loop))
    return;
  rt.loop = loop;
  paintLoop2(el);
  const range = loopRange(rt);
  const p = positionOf(rt);
  if (range && (p < range[0] || p >= range[1]))
    seek2(el, range[0]);
  else if (rt.clock)
    schedule(el);
}
function applyMarkup4(el, stateName, config) {
  const zoom = zoomOf(config.zoom);
  const scale = zoom === 1 ? null : String(zoom);
  if (el.getAttribute("data-zoom") !== scale)
    dfDollar4(el).attr("data-zoom", scale);
  const press = (action, on) => dfDollar4(el).find(`[data-fretboard-action="${action}"]`).each((_i, b) => {
    if (b.getAttribute("aria-pressed") !== String(on))
      dfDollar4(b).attr("aria-pressed", String(on));
  });
  press("toggle", stateName === "playing");
  press("loop", !!config.loop);
  const script = dfDollar4(el).children("script.fretboard-source");
  if (!config.data || !script.length)
    return;
  let authored = null;
  try {
    authored = JSON.parse(script.text() || "null");
  } catch {
    authored = null;
  }
  if (JSON.stringify(songOf(authored)) !== JSON.stringify(songOf(config.data)))
    script.text(JSON.stringify(config.data, null, 2));
}
function triggerStateChange4(el, stateName, config, incoming) {
  const rt = runtimeOf2(el);
  applyMarkup4(el, stateName, config);
  if (!rt)
    return;
  let again = false;
  if ("data" in incoming && incoming.data !== rt.song) {
    const song = songOf(incoming.data);
    if (JSON.stringify(song) !== JSON.stringify(rt.song)) {
      rt.song = song;
      again = true;
    }
  }
  const current = rt.score?.id ?? "";
  let id = current;
  if ("zoom" in incoming && (again || incoming.score != null || ("key" in incoming) || ("signature" in incoming)))
    rt.zoom = zoomOf(incoming.zoom);
  if (incoming.score != null)
    id = String(incoming.score);
  else if ("key" in incoming || "signature" in incoming)
    id = pick(rt.song, incoming.key ?? rt.score?.key, incoming.signature ?? rt.score?.signature, current);
  if (again || id !== current)
    showScore(el, id);
  else if ("zoom" in incoming && zoomOf(incoming.zoom) !== rt.zoom) {
    rt.zoom = zoomOf(incoming.zoom);
    layout(el);
    if (rt.line >= 0)
      follow(el, rt.line, false);
  }
  if (stateName !== "playing")
    runClock2(el, false);
  rt.status = stateName === "playing" && !(rt.score && rt.score.total > 0) ? "default" : stateName;
  if (rt.status !== stateName)
    dfDollar4(el).attr("data-state-name", rt.status);
  if ("position" in incoming)
    seek2(el, num2(incoming.position, positionOf(rt)));
  if ("loop" in incoming)
    setLoop2(el, loopOf2(incoming.loop, rt.score));
  runClock2(el, rt.status === "playing");
  paint2(el, true);
  return;
}
var fretboardApi = componentState4({
  component: "fretboard",
  states: fretboardStates,
  mergeConfig: true,
  apply: (el, state, _previous, incoming) => triggerStateChange4(el, state.name, state.config, incoming),
  read: (el, state) => {
    const rt = runtimeOf2(el);
    if (!rt)
      return state;
    const c = state.config;
    const s = rt.score;
    const position = Math.round(positionOf(rt) * 1000) / 1000;
    const score = s?.id ?? "";
    const key = s?.key ?? "";
    const signature = s?.signature ?? "";
    if (rt.status === state.name && c.position === position && c.score === score && c.key === key && c.signature === signature && c.loop === rt.loop && c.zoom === rt.zoom && c.data === rt.song)
      return state;
    return {
      name: rt.status,
      config: { ...c, position, score, key, signature, loop: rt.loop, zoom: rt.zoom, data: rt.song }
    };
  },
  markup: (el, state) => applyMarkup4(el, state.name, state.config)
});
df$4.fretboardApi = fretboardApi;
df$4.fretboardStates = fretboardStates;
var now4 = (el) => runtimeOf2(el)?.status ?? "default";
function stop(el) {
  const rt = runtimeOf2(el);
  const range = loopRange(rt);
  el.api?.setState("default", { position: range ? range[0] : 0 });
}
var SPACE_CONTROLS2 = 'button, a[href], input, select, textarea, summary, [contenteditable="true"], [role="button"], [role="slider"], [role="menuitem"], [role="tab"], [role="option"], [role="checkbox"], [role="switch"]';
function onSpace2(e) {
  if (e.key !== " " || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey)
    return;
  const target = e.target instanceof Element ? e.target : null;
  const tabs = dfDollar4(".fretboard[data-init]").toArray();
  const inside = target?.closest(".fretboard");
  const bound = target?.closest("[data-fretboard-for]");
  const idle = !target || target === document.body || target === document.documentElement;
  if (!inside && !bound && !idle)
    return;
  if (!idle && target?.closest(SPACE_CONTROLS2))
    return;
  const playing = tabs.find((t) => t._fretboard?.status === "playing");
  if (idle && !playing && dfDollar4('[data-state-name="playing"]:not(.fretboard)').length)
    return;
  const el = (inside?._fretboard ? inside : null) ?? (bound ? tabs.find((t) => t.id === bound.getAttribute("data-fretboard-for")) : null) ?? playing ?? [...tabs].filter((t) => t._fretboardUsed).sort((a, b) => b._fretboardUsed - a._fretboardUsed)[0] ?? (tabs.length === 1 ? tabs[0] : null);
  if (!el?._fretboard?.score)
    return;
  e.preventDefault();
  el.api?.setState(el._fretboard.status === "playing" ? "paused" : "playing");
  return true;
}
function onAction2(el, control) {
  const rt = runtimeOf2(el);
  el._fretboardUsed = performance.now();
  const action = control.getAttribute("data-fretboard-action") ?? "";
  if (action === "toggle")
    el.api?.setState(rt.status === "playing" ? "paused" : "playing");
  else if (action === "play")
    el.api?.setState("playing");
  else if (action === "pause") {
    if (rt.status === "playing")
      el.api?.setState("paused");
  } else if (action === "stop")
    stop(el);
  else if (action === "loop" && rt.score)
    el.api?.setState(now4(el), { loop: rt.loop ? null : { start: 1, end: rt.score.measures } });
  else {
    const zoom = zoomFor2(rt, action);
    if (zoom !== null)
      el.api?.setState(now4(el), { zoom });
  }
}
function zoomFor2(rt, action) {
  if (action === "zoom-in")
    return zoomOf(rt.zoom * ZOOM_STEP);
  if (action === "zoom-out")
    return zoomOf(rt.zoom / ZOOM_STEP);
  if (action === "zoom-reset")
    return 1;
  return null;
}
function onControl(el, control) {
  el._fretboardUsed = performance.now();
  const kind = control.getAttribute("data-fretboard-control");
  const value = control.value;
  if (kind === "key")
    el.api?.setState(now4(el), { key: value });
  else if (kind === "signature")
    el.api?.setState(now4(el), { signature: value });
  else if (kind === "score")
    el.api?.setState(now4(el), { score: value });
  else if (kind === "position")
    el.api?.setState(now4(el), { position: Number(value) });
}
function onKey(el, e) {
  const rt = runtimeOf2(el);
  const s = rt.score;
  if (!s || e.altKey || e.ctrlKey || e.metaKey)
    return;
  const p = positionOf(rt);
  const m = Math.min(s.measures - 1, Math.floor(p / s.beats));
  const atBar = p - m * s.beats < 0.01;
  let position = null;
  let loop;
  if (e.key === "ArrowRight")
    position = e.shiftKey ? (m + 1) * s.beats : Math.floor(p + 0.000001) + 1;
  else if (e.key === "ArrowLeft")
    position = e.shiftKey ? (m - (atBar ? 1 : 0)) * s.beats : Math.ceil(p - 0.000001) - 1;
  else if (e.key === "Home")
    position = 0;
  else if (e.key === "End")
    position = (s.measures - 1) * s.beats;
  else if (e.key === "[")
    loop = { start: m + 1, end: rt.loop && rt.loop.end > m ? rt.loop.end : s.measures };
  else if (e.key === "]")
    loop = { start: rt.loop && rt.loop.start <= m + 1 ? rt.loop.start : 1, end: m + 1 };
  else if (e.key === "Escape" && rt.loop)
    loop = null;
  const zoom = zoomFor2(rt, ZOOM_KEYS[e.key] ?? "");
  if (zoom !== null) {
    e.preventDefault();
    if (zoom !== rt.zoom)
      el.api?.setState(now4(el), { zoom });
  } else if (position !== null) {
    e.preventDefault();
    el.api?.setState(now4(el), { position: clamp(position, 0, s.total - 1) });
  } else if (loop !== undefined) {
    e.preventDefault();
    el.api?.setState(now4(el), { loop });
  }
}
function onSheetClick(el, e) {
  const rt = runtimeOf2(el);
  const s = rt.score;
  const target = e.target;
  const measure = target.closest(".fretboard-measure");
  if (!s || !measure)
    return;
  const n = Number(measure.getAttribute("data-measure"));
  if (target.closest(".fretboard-number")) {
    const loop = e.shiftKey && rt.loop ? { start: Math.min(rt.loop.start, n), end: Math.max(rt.loop.end, n) } : { start: n, end: n };
    el.api?.setState(now4(el), { loop });
    return;
  }
  const box = measure.getBoundingClientRect();
  const inner = box.width - 2 * rt.pad;
  const f = inner > 0 ? clamp((e.clientX - box.left - rt.pad) / inner, 0, 0.9999) : 0;
  el.api?.setState(now4(el), { position: (n - 1) * s.beats + Math.floor(f * s.beats) });
}
function init4() {
  dfDollar4(".fretboard:not([data-init])").toArray().forEach((el) => {
    el.dataset.init = "";
    let data = null;
    try {
      data = JSON.parse(dfDollar4(el).children("script.fretboard-source").text() || "null");
    } catch {
      data = null;
    }
    const rt = {
      song: songOf(data),
      score: null,
      status: "default",
      position: 0,
      loop: null,
      lineOf: [],
      measure: -1,
      line: -1,
      active: "",
      pad: 8,
      zoom: zoomOf(el.getAttribute("data-zoom")),
      version: 0,
      report: () => fretboardApi.getState(el)
    };
    el._fretboard = rt;
    const first = rt.song.scores.find((x) => x && x.id != null);
    const raw = first ? rawScore(rt.song, String(first.id)) : null;
    rt.score = raw ? build(rt.song, raw) : null;
    bindComponent4(el, fretboardApi, {
      name: "default",
      config: {
        position: 0,
        score: rt.score?.id ?? "",
        key: rt.score?.key ?? "",
        signature: rt.score?.signature ?? "",
        loop: null,
        zoom: rt.zoom,
        data: rt.song
      }
    });
    const sheet = dfDollar4(`<div class="fretboard-sheet" tabindex="0" role="group" aria-label="${esc2(rt.song.title || el.getAttribute("aria-label") || "Tablature")}"></div>`);
    const header = dfDollar4(el).children(".fretboard-header");
    if (header.length)
      header.after(sheet);
    else
      dfDollar4(el).append(sheet);
    const box = part2(el, "sheet");
    dfDollar4(box).on("click", (e) => {
      box.focus({ preventScroll: true });
      onSheetClick(el, e);
    });
    dfDollar4(box).on("keydown", (e) => onKey(el, e));
    const used = () => {
      el._fretboardUsed = performance.now();
    };
    dfDollar4(el).on("pointerdown", used);
    dfDollar4(el).on("focusin", used);
    dfDollar4(el).on("click", (e) => {
      const control = e.target.closest("[data-fretboard-action]");
      if (control && control.closest(".fretboard") === el)
        onAction2(el, control);
    });
    dfDollar4(el).on("change", (e) => {
      const control = e.target.closest("select[data-fretboard-control]");
      if (control && control.closest(".fretboard") === el)
        onControl(el, control);
    });
    dfDollar4(el).on("input", (e) => {
      const control = e.target.closest("input[data-fretboard-control]");
      if (control && control.closest(".fretboard") === el)
        onControl(el, control);
    });
    let width = 0;
    new ResizeObserver(() => {
      const w = box.clientWidth;
      if (Math.abs(w - width) < 1)
        return;
      width = w;
      layout(el);
    }).observe(box);
    new MutationObserver(() => paint2(el, true)).observe(el, {
      attributes: true,
      attributeFilter: ["data-hand", "data-colors"]
    });
    rt.version++;
    fillControls(el);
    layout(el);
  });
}
if (!document.__fretboardInit) {
  document.__fretboardInit = true;
  bindGlobalKeys2(onSpace2);
  const boundTab = (e, sel) => {
    const control = e.target?.closest?.(sel);
    const bound = control?.closest("[data-fretboard-for]");
    if (!control || !bound || bound.closest(".fretboard"))
      return null;
    const el = dfDollar4(`#${CSS.escape(bound.getAttribute("data-fretboard-for") ?? "")}`).get(0);
    return el?._fretboard ? [el, control] : null;
  };
  document.addEventListener("click", (e) => {
    const hit = boundTab(e, "[data-fretboard-action]");
    if (hit)
      onAction2(...hit);
  });
  document.addEventListener("change", (e) => {
    const hit = boundTab(e, "select[data-fretboard-control]");
    if (hit)
      onControl(...hit);
  });
  document.addEventListener("input", (e) => {
    const hit = boundTab(e, "input[data-fretboard-control]");
    if (hit)
      onControl(...hit);
  });
}
var resolve4 = (target) => typeof target === "string" ? dfDollar4(target).get(0) : target;
df$4.fretboard = {
  load: (target, data) => {
    const el = resolve4(target);
    if (el?._fretboard)
      el.api?.setState(now4(el), { data, score: songOf(data).scores[0]?.id ?? "" });
  },
  data: (target) => {
    const el = resolve4(target);
    return el?._fretboard ? songOf(runtimeOf2(el).song) : { version: 1, scores: [] };
  },
  scores: (target) => {
    const el = resolve4(target);
    return el?._fretboard ? infosOf(runtimeOf2(el).song) : [];
  },
  select: (target, choice) => {
    const el = resolve4(target);
    if (!el?._fretboard)
      return "";
    const c = {};
    if (choice?.score != null)
      c.score = String(choice.score);
    else {
      if (choice?.key != null)
        c.key = String(choice.key);
      if (choice?.signature != null)
        c.signature = String(choice.signature);
    }
    el.api?.setState(now4(el), c);
    return runtimeOf2(el).score?.id ?? "";
  },
  play: (target) => {
    const el = resolve4(target);
    if (el?._fretboard)
      el.api?.setState("playing");
  },
  pause: (target) => {
    const el = resolve4(target);
    if (el?._fretboard && runtimeOf2(el).status === "playing")
      el.api?.setState("paused");
  },
  stop: (target) => {
    const el = resolve4(target);
    if (el?._fretboard)
      stop(el);
  },
  seek: (target, measure, beat = 1) => {
    const el = resolve4(target);
    const s = el?._fretboard ? runtimeOf2(el).score : null;
    if (el && s)
      el.api?.setState(now4(el), { position: (Math.max(1, measure) - 1) * s.beats + Math.max(0, beat - 1) });
  },
  loop: (target, start, end) => {
    const el = resolve4(target);
    if (!el?._fretboard)
      return null;
    const rt = runtimeOf2(el);
    el.api?.setState(now4(el), { loop: start == null ? null : { start, end: end ?? start } });
    return rt.loop ? { ...rt.loop } : null;
  },
  zoom: (target, scale) => {
    const el = resolve4(target);
    if (!el?._fretboard)
      return 1;
    el.api?.setState(now4(el), { zoom: scale });
    return runtimeOf2(el).zoom;
  },
  active: (target, position) => {
    const el = resolve4(target);
    const rt = el?._fretboard ? runtimeOf2(el) : null;
    return rt?.score ? activeAt2(rt.score, position ?? positionOf(rt)) : [];
  }
};
init4();
new MutationObserver(init4).observe(document, { childList: true, subtree: true });

// dist/components/fretboard-neck/fretboard-neck.js
var __df$core5 = globalThis.df$;
var __df$shared5 = __df$core5 && __df$core5.shadcn && __df$core5.shadcn.shared;
if (!__df$shared5 || __df$shared5.abi !== "0.9.10") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals5, defussQuery: defussQuery5, componentState: componentState5, bindComponent: bindComponent5 } = __df$shared5;
var df$5 = defussGlobals5();
var dfDollar5 = defussQuery5();
var fretboardNeckStates = ["default"];
var INLAYS = [3, 5, 7, 10, 12, 15];
var ROLES = ["muted", "chord", "next", "active"];
var described = 0;
var clamp2 = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
var esc3 = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
var numAttr = (el, name) => {
  const v = el.getAttribute(name);
  return v === null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v);
};
function parseShape(text) {
  const s = String(text ?? "").trim();
  if (!s)
    return null;
  const tokens = /[\s,]/.test(s) ? s.split(/[\s,]+/).filter(Boolean) : [...s];
  const out = [];
  for (const t of tokens) {
    if (t === "x" || t === "X")
      out.push("x");
    else if (/^\d{1,2}$/.test(t) && Number(t) <= 24)
      out.push(Number(t));
    else
      return null;
  }
  return out.length >= 1 && out.length <= 12 ? out : null;
}
var shapeText2 = (shape) => shape.some((f) => typeof f === "number" && f > 9) ? shape.join(" ") : shape.join("");
function barreOf2(shape, fret) {
  if (!(fret > 0))
    return null;
  const at = shape.map((f, i) => f === fret ? i : -1).filter((i) => i >= 0);
  if (at.length < 2)
    return null;
  const from = at[0];
  const to = at[at.length - 1];
  for (let i = from;i <= to; i++)
    if (typeof shape[i] !== "number" || shape[i] < fret)
      return null;
  return { fret, from, to };
}
function parseNotes(v) {
  const list = Array.isArray(v) ? v : String(v ?? "").trim().split(/\s+/).filter(Boolean);
  const out = [];
  for (const x of list) {
    const [s, f] = typeof x === "string" ? x.split("/").map(Number) : [Number(x?.string), Number(x?.fret)];
    if (Number.isInteger(s) && s >= 1 && s <= 12 && Number.isInteger(f) && f >= 0 && f <= 24)
      out.push({ string: s, fret: f });
  }
  return out;
}
var notesText2 = (notes) => notes.map((n) => `${n.string}/${n.fret}`).join(" ");
var tuningOf = (el) => (el.getAttribute("data-tuning") ?? "").trim().split(/\s+/).filter(Boolean);
var capoOf2 = (el) => clamp2(Math.round(numAttr(el, "data-capo") ?? 0), 0, 12);
function neckMarkup(el) {
  const shape = parseShape(el.getAttribute("data-shape"));
  const tuning = tuningOf(el);
  const n = tuning.length || shape?.length || Math.max(1, numAttr(el, "data-strings") ?? 4);
  const capo = capoOf2(el);
  const notes = parseNotes(el.getAttribute("data-notes"));
  const next = parseNotes(el.getAttribute("data-next"));
  const highest = Math.max(3, ...(shape ?? []).map((f) => typeof f === "number" ? f : 0), ...notes.map((x) => x.fret), ...next.map((x) => x.fret));
  const frets = clamp2(Math.round(numAttr(el, "data-frets") ?? capo + highest + 2), 3, 24);
  const strings = Array.from({ length: n }, (_, k) => {
    const s = n - k;
    const name = tuning[k] ?? "";
    return `${name ? `<span class="fretboard-neck-string-name" data-string="${s}" style="--fretboard-neck-s: ${s}">${esc3(name)}</span>` : ""}<span class="fretboard-neck-string" data-string="${s}" style="--fretboard-neck-s: ${s}"></span>`;
  }).join("");
  const inlays = INLAYS.filter((f) => f <= frets).map((f) => `<span class="fretboard-neck-inlay" style="--fretboard-neck-f: ${f}"${f === 12 ? " data-double" : ""}></span>`).join("");
  const numbers = INLAYS.filter((f) => f <= frets).map((f) => `<span class="fretboard-neck-fret-number" style="--fretboard-neck-f: ${f}">${f}</span>`).join("");
  const capoBar = capo ? `<span class="fretboard-neck-capo" style="--fretboard-neck-f: ${capo}"></span>` : "";
  const roles = new Map;
  const put = (x, role) => {
    if (x.fret === 0 || x.string < 1 || x.string > n)
      return;
    const k = `${x.string}/${x.fret}`;
    if (ROLES.indexOf(role) > ROLES.indexOf(roles.get(k) ?? ""))
      roles.set(k, role);
  };
  const barre = shape ? barreOf2(shape, numAttr(el, "data-barre") ?? 0) : null;
  (shape ?? []).forEach((fret, k) => {
    if (barre && fret === barre.fret && k >= barre.from && k <= barre.to)
      return;
    put({ string: n - k, fret }, fret === "x" ? "muted" : "chord");
  });
  next.forEach((x) => put(x, "next"));
  notes.forEach((x) => put(x, "active"));
  const bar = barre ? `<span class="fretboard-neck-barre" style="--fretboard-neck-f: ${capo + barre.fret}; --fretboard-neck-s1: ${n - barre.to}; --fretboard-neck-s2: ${n - barre.from}"></span>` : "";
  const dots = [...roles].map(([k, role]) => {
    const [string, fret] = k.split("/");
    const muted = fret === "x";
    return `<span class="fretboard-neck-dot" data-role="${role}" data-string="${string}"${muted && !capo ? " data-nut" : ""} style="--fretboard-neck-s: ${string}; --fretboard-neck-f: ${muted ? capo : capo + Number(fret)}">${role === "active" || role === "muted" ? muted ? "×" : fret : ""}</span>`;
  }).join("");
  const say = (list) => list.map((x) => `string ${x.string} ${x.fret ? `fret ${x.fret}` : "open"}`).join(", ");
  const text = [
    tuning.length ? `${tuning.join(" ")} neck` : `${n} strings`,
    capo ? `capo ${capo}` : "",
    shape ? `shape ${shape.join(" ")}${barre ? `, barre at fret ${barre.fret}` : ""}` : "",
    notes.length ? `sounding ${say(notes)}` : "",
    next.length ? `next ${say(next)}` : ""
  ].filter(Boolean).join("; ");
  const board = `<div class="fretboard-neck-board" aria-hidden="true" style="--fretboard-neck-strings: ${n}; --fretboard-neck-frets: ${frets}"><div class="fretboard-neck-wires"></div>${strings}${inlays}${numbers}${capoBar}${bar}${dots}</div>`;
  return { board, text };
}
function draw(el) {
  const m = neckMarkup(el);
  const rt = el._fretboardNeck;
  if (rt.board !== m.board) {
    rt.board = m.board;
    const board = dfDollar5(m.board).get(0);
    const old = dfDollar5(el).children(".fretboard-neck-board");
    if (old.length)
      old.replaceWith(board);
    else
      dfDollar5(el).prepend(board);
  }
  if (dfDollar5(rt.desc).text() !== m.text)
    dfDollar5(rt.desc).text(m.text);
}
function applyMarkup5(el, _stateName, config) {
  const write = (name, v) => {
    if (el.getAttribute(name) !== v)
      dfDollar5(el).attr(name, v);
  };
  const same = (name, text, norm) => norm(el.getAttribute(name)) === text;
  const shapeNorm = (v) => {
    const s = parseShape(v);
    return s ? shapeText2(s) : null;
  };
  const notesNorm = (v) => notesText2(parseNotes(v)) || null;
  if (config.shape !== undefined) {
    const text = shapeNorm(typeof config.shape === "string" ? config.shape : null);
    if (!same("data-shape", text, shapeNorm))
      write("data-shape", text);
  }
  if (config.barre !== undefined)
    write("data-barre", config.barre === null || !(Number(config.barre) > 0) ? null : String(Math.round(Number(config.barre))));
  if (config.notes !== undefined) {
    const text = notesText2(parseNotes(config.notes)) || null;
    if (!same("data-notes", text, notesNorm))
      write("data-notes", text);
  }
  if (config.next !== undefined) {
    const text = notesText2(parseNotes(config.next)) || null;
    if (!same("data-next", text, notesNorm))
      write("data-next", text);
  }
  if (config.capo !== undefined) {
    const c = clamp2(Math.round(Number(config.capo) || 0), 0, 12);
    write("data-capo", c ? String(c) : null);
  }
}
var configOf = (el) => ({
  shape: el.getAttribute("data-shape") ?? "",
  barre: numAttr(el, "data-barre"),
  notes: el.getAttribute("data-notes") ?? "",
  next: el.getAttribute("data-next") ?? "",
  capo: capoOf2(el)
});
function triggerStateChange5(el, stateName, incoming) {
  applyMarkup5(el, stateName, incoming);
  if (el._fretboardNeck)
    draw(el);
  return;
}
var fretboardNeckApi = componentState5({
  component: "fretboard-neck",
  states: fretboardNeckStates,
  mergeConfig: true,
  apply: (el, state, _previous, incoming) => triggerStateChange5(el, state.name, incoming),
  read: (el, state) => {
    const now = configOf(el);
    const c = state.config;
    if (c.shape === now.shape && c.barre === now.barre && c.notes === now.notes && c.next === now.next && c.capo === now.capo)
      return state;
    return { name: "default", config: now };
  },
  markup: (el, state) => applyMarkup5(el, state.name, state.config)
});
df$5.fretboardNeckApi = fretboardNeckApi;
df$5.fretboardNeckStates = fretboardNeckStates;
function init5() {
  dfDollar5(".fretboard-neck:not([data-init])").toArray().forEach((el) => {
    el.dataset.init = "";
    const desc = dfDollar5(`<span class="fretboard-neck-desc" id="fretboard-neck-desc-${++described}" hidden></span>`).get(0);
    dfDollar5(el).append(desc);
    if (!el.hasAttribute("role"))
      dfDollar5(el).attr("role", "img");
    const by = (el.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean);
    dfDollar5(el).attr("aria-describedby", [...by, desc.id].join(" "));
    el._fretboardNeck = { board: "", desc };
    draw(el);
    bindComponent5(el, fretboardNeckApi, { name: "default", config: configOf(el) });
    new MutationObserver(() => draw(el)).observe(el, {
      attributes: true,
      attributeFilter: [
        "data-tuning",
        "data-strings",
        "data-frets",
        "data-shape",
        "data-barre",
        "data-notes",
        "data-next",
        "data-capo"
      ]
    });
  });
}
var resolve5 = (target) => {
  const el = typeof target === "string" ? dfDollar5(target).get(0) : target;
  const neck = el?.closest?.(".fretboard-neck");
  return neck?._fretboardNeck ? neck : undefined;
};
df$5.fretboardNeck = {
  play: (target, notes, config = {}) => {
    const el = resolve5(target);
    if (!el)
      return [];
    el.api?.setState("default", { ...config, notes });
    return parseNotes(el.getAttribute("data-notes"));
  }
};
init5();
new MutationObserver(init5).observe(document, { childList: true, subtree: true });

// dist/components/chord-chart/chord-chart.js
var __df$core6 = globalThis.df$;
var __df$shared6 = __df$core6 && __df$core6.shadcn && __df$core6.shadcn.shared;
if (!__df$shared6 || __df$shared6.abi !== "0.9.10") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals6, defussQuery: defussQuery6, componentState: componentState6, bindComponent: bindComponent6 } = __df$shared6;
var df$6 = defussGlobals6();
var dfDollar6 = defussQuery6();
var chordChartStates = ["default", "active"];
var clamp3 = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
var esc4 = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
function parseShape2(text) {
  const s = String(text ?? "").trim();
  if (!s)
    return null;
  const tokens = /[\s,]/.test(s) ? s.split(/[\s,]+/).filter(Boolean) : [...s];
  const out = [];
  for (const t of tokens) {
    if (t === "x" || t === "X")
      out.push("x");
    else if (/^\d{1,2}$/.test(t) && Number(t) <= 24)
      out.push(Number(t));
    else
      return null;
  }
  return out.length >= 1 && out.length <= 12 ? out : null;
}
var shapeText3 = (shape) => shape.some((f) => typeof f === "number" && f > 9) ? shape.join(" ") : shape.join("");
function barreOf3(shape, fret) {
  if (!(fret > 0))
    return null;
  const at = shape.map((f, i) => f === fret ? i : -1).filter((i) => i >= 0);
  if (at.length < 2)
    return null;
  const from = at[0];
  const to = at[at.length - 1];
  for (let i = from;i <= to; i++)
    if (typeof shape[i] !== "number" || shape[i] < fret)
      return null;
  return { fret, from, to };
}
var numAttr2 = (el, name) => {
  const v = el.getAttribute(name);
  return v === null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v);
};
var captionOf = (el) => dfDollar6(el).children("figcaption").text().trim();
function gridMarkup(el) {
  const name = captionOf(el);
  const shape = parseShape2(el.getAttribute("data-shape"));
  const n = shape?.length ?? Math.max(1, numAttr2(el, "data-strings") ?? 4);
  const played = (shape ?? []).filter((f) => typeof f === "number" && f > 0);
  const top = Math.max(0, ...played);
  const base = top > 4 ? Math.min(...played) : 1;
  const rows = clamp3(top - base + 1, 4, 6);
  const barre = shape ? barreOf3(shape, numAttr2(el, "data-barre") ?? 0) : null;
  const barred = (f, i) => !!barre && f === barre.fret && i >= barre.from && i <= barre.to;
  const marks = (shape ?? []).map((f, i) => f === "x" ? `<span class="chord-chart-mark" data-string="${n - i}" style="--chord-chart-i: ${i}">×</span>` : f === 0 || barred(f, i) ? "" : `<span class="chord-chart-dot" data-string="${n - i}" style="--chord-chart-i: ${i}; --chord-chart-r: ${f - base}"></span>`).join("");
  const bar = barre ? `<span class="chord-chart-barre" style="--chord-chart-i: ${barre.from}; --chord-chart-j: ${barre.to}; --chord-chart-r: ${barre.fret - base}"></span>` : "";
  const capo = clamp3(Math.round(numAttr2(el, "data-capo") ?? 0), 0, 12);
  const label = shape ? `${name ? `${name}: ` : ""}${shape.join(" ")}${barre ? `, barre at fret ${barre.fret}` : ""}${capo ? `, capo ${capo}` : ""}` : name;
  return `<div class="chord-chart-grid" role="img" aria-label="${esc4(label)}" style="--chord-chart-strings: ${n}; --chord-chart-frets: ${rows}"${base > 1 ? ` data-base="${base}"` : ""}${capo && base === 1 ? ` data-capo="${capo}"` : ""}>${bar}${marks}</div>`;
}
function draw2(el) {
  const markup = gridMarkup(el);
  const old = dfDollar6(el).children(".chord-chart-grid");
  if (el._chordChart === markup && old.length)
    return;
  el._chordChart = markup;
  const grid = dfDollar6(markup).get(0);
  if (old.length)
    old.replaceWith(grid);
  else {
    const caption = dfDollar6(el).children("figcaption");
    if (caption.length)
      caption.after(grid);
    else
      dfDollar6(el).append(grid);
  }
}
function applyMarkup6(el, stateName, config) {
  const active = stateName === "active" ? "" : null;
  if (el.getAttribute("data-active") !== active)
    dfDollar6(el).attr("data-active", active);
  if (typeof config.name === "string") {
    const caption = dfDollar6(el).children("figcaption");
    if (!caption.length)
      dfDollar6(el).prepend(dfDollar6(`<figcaption>${esc4(config.name)}</figcaption>`));
    else if (caption.text() !== config.name)
      caption.text(config.name);
  }
  if (typeof config.shape === "string") {
    const parsed = parseShape2(config.shape);
    const text = parsed ? shapeText3(parsed) : null;
    const now = parseShape2(el.getAttribute("data-shape"));
    if ((now ? shapeText3(now) : null) !== text)
      dfDollar6(el).attr("data-shape", text);
  }
  if (config.barre !== undefined) {
    const v = config.barre === null || !(Number(config.barre) > 0) ? null : String(Math.round(Number(config.barre)));
    if (el.getAttribute("data-barre") !== v)
      dfDollar6(el).attr("data-barre", v);
  }
  if (config.capo !== undefined) {
    const c = clamp3(Math.round(Number(config.capo) || 0), 0, 12);
    const v = c ? String(c) : null;
    if (el.getAttribute("data-capo") !== v)
      dfDollar6(el).attr("data-capo", v);
  }
}
var configOf2 = (el) => ({
  name: captionOf(el),
  shape: el.getAttribute("data-shape") ?? "",
  barre: numAttr2(el, "data-barre"),
  capo: numAttr2(el, "data-capo") ?? 0
});
function triggerStateChange6(el, stateName, incoming) {
  applyMarkup6(el, stateName, incoming);
  if (el._chordChart !== undefined)
    draw2(el);
  return;
}
var chordChartApi = componentState6({
  component: "chord-chart",
  states: chordChartStates,
  mergeConfig: true,
  apply: (el, state, _previous, incoming) => triggerStateChange6(el, state.name, incoming),
  read: (el, state) => {
    const name = el.hasAttribute("data-active") ? "active" : "default";
    const now = configOf2(el);
    const c = state.config;
    if (name === state.name && c.name === now.name && c.shape === now.shape && c.barre === now.barre && c.capo === now.capo)
      return state;
    return { name, config: now };
  },
  markup: (el, state) => applyMarkup6(el, state.name, state.config)
});
df$6.chordChartApi = chordChartApi;
df$6.chordChartStates = chordChartStates;
function init6() {
  dfDollar6(".chord-chart:not([data-init])").toArray().forEach((el) => {
    el.dataset.init = "";
    draw2(el);
    bindComponent6(el, chordChartApi, {
      name: el.hasAttribute("data-active") ? "active" : "default",
      config: configOf2(el)
    });
    new MutationObserver(() => draw2(el)).observe(el, {
      attributes: true,
      attributeFilter: ["data-shape", "data-barre", "data-capo", "data-strings"],
      childList: true,
      characterData: true,
      subtree: true
    });
  });
}
var resolve6 = (target) => {
  const el = typeof target === "string" ? dfDollar6(target).get(0) : target;
  const chart = el?.closest?.(".chord-chart");
  return chart?.api ? chart : undefined;
};
df$6.chordChart = {
  chord: (target, chord) => {
    const el = resolve6(target);
    if (!el)
      return null;
    if (chord)
      el.api?.setState(el.hasAttribute("data-active") ? "active" : "default", chord);
    return configOf2(el);
  },
  parse: (shape) => parseShape2(shape)
};
init6();
new MutationObserver(init6).observe(document, { childList: true, subtree: true });

// dist/components/knob/knob.js
var __df$core7 = globalThis.df$;
var __df$shared7 = __df$core7 && __df$core7.shadcn && __df$core7.shadcn.shared;
if (!__df$shared7 || __df$shared7.abi !== "0.9.10") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals7, defussQuery: defussQuery7, componentState: componentState7, bindComponent: bindComponent7, textLocale: textLocale2 } = __df$shared7;
var df$7 = defussGlobals7();
var dfDollar7 = defussQuery7();
var knobStates = ["default", "adjusting", "disabled"];
var MIN_SPEED = 0.02;
var KEY_STEP = 0.01;
var FINE_STEP = 0.001;
var PAGE_STEP = 0.1;
var MAX_TICKS = 49;
var THEME_COLORS = /^(chart-[1-5]|primary|destructive|foreground|muted-foreground)$/;
var rings = 0;
var clamp4 = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
var num3 = (v, fallback) => {
  const n = typeof v === "number" ? v : v === null || v === undefined || v === "" ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
};
var esc5 = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
var tidy = (v) => Number(v.toPrecision(12));
var round4 = (v) => String(Math.round(v * 1e4) / 1e4);
var sameSign = (r) => r.min !== 0 && r.max !== 0 && Math.sign(r.min) === Math.sign(r.max);
var linear = {
  value: (p, r) => r.min + p * (r.max - r.min),
  position: (v, r) => r.max === r.min ? 0 : (v - r.min) / (r.max - r.min)
};
var SCALES2 = {
  linear,
  exponential: {
    value: (p, r) => sameSign(r) ? r.min * Math.pow(r.max / r.min, p) : linear.value(p, r),
    position: (v, r) => sameSign(r) ? Math.log(v / r.min) / Math.log(r.max / r.min) : linear.position(v, r)
  },
  logarithmic: {
    value: (p, r) => sameSign(r) ? r.min + r.max - r.min * Math.pow(r.max / r.min, 1 - p) : linear.value(p, r),
    position: (v, r) => sameSign(r) ? 1 - Math.log((r.min + r.max - v) / r.min) / Math.log(r.max / r.min) : linear.position(v, r)
  },
  power: {
    value: (p, r) => r.min + (r.max - r.min) * Math.pow(p, r.exponent),
    position: (v, r) => Math.pow(clamp4(linear.position(v, r), 0, 1), 1 / r.exponent)
  },
  decibel: {
    value: (p, r) => {
      const floor = Math.pow(10, (r.min - r.max) / (20 * r.exponent));
      return r.max + 20 * r.exponent * Math.log10(floor + (1 - floor) * p);
    },
    position: (v, r) => {
      const floor = Math.pow(10, (r.min - r.max) / (20 * r.exponent));
      return (Math.pow(10, (v - r.max) / (20 * r.exponent)) - floor) / (1 - floor);
    }
  }
};
var fixed = (locale, digits) => new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
var three = (locale) => new Intl.NumberFormat(locale, { minimumSignificantDigits: 3, maximumSignificantDigits: 3 });
var autoDecimals = (c) => {
  if (c.step !== null)
    return Math.min(6, (String(c.step).split(".")[1] ?? "").length);
  const span = Math.abs(c.max - c.min);
  return span >= 100 ? 0 : span >= 10 ? 1 : 2;
};
var withUnit = (text, unit) => unit ? `${text} ${unit}` : text;
var SI = [
  [1e9, "G"],
  [1e6, "M"],
  [1000, "k"],
  [1, ""],
  [0.001, "m"]
];
var FORMATS = {
  number: (v, c) => withUnit(fixed(c.locale, c.decimals ?? autoDecimals(c)).format(v), c.unit),
  si: (v, c) => {
    const a = Math.abs(v);
    const [f, prefix] = a === 0 ? [1, ""] : SI.find(([x]) => a >= x) ?? SI[SI.length - 1];
    const n = c.decimals === null ? three(c.locale) : fixed(c.locale, c.decimals);
    return withUnit(n.format(v / f), `${prefix}${c.unit}`);
  },
  percent: (v, c) => new Intl.NumberFormat(c.locale, {
    style: "percent",
    minimumFractionDigits: c.decimals ?? 0,
    maximumFractionDigits: c.decimals ?? 0
  }).format(v),
  time: (v, c) => {
    const n = c.decimals === null ? three(c.locale) : fixed(c.locale, c.decimals);
    return Math.abs(v) < 1 ? `${n.format(v * 1000)} ms` : `${n.format(v)} s`;
  },
  signed: (v, c) => {
    const d = c.decimals ?? autoDecimals(c);
    const text = new Intl.NumberFormat(c.locale, {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
      signDisplay: "exceptZero"
    }).format(v);
    return withUnit(text, c.unit);
  }
};
var runtimeOf3 = (el) => el._knob;
var inputOf = (el) => dfDollar7(el).find("input.knob-input").get(0);
function rangeOf(el, input) {
  const scale = el.getAttribute("data-scale") ?? "linear";
  const exponent = num3(el.getAttribute("data-exponent"), scale === "decibel" ? 3 : 2);
  return {
    min: num3(input.getAttribute("min"), 0),
    max: num3(input.getAttribute("max"), 100),
    exponent: exponent > 0 ? exponent : 1
  };
}
var scaleOf2 = (el) => SCALES2[el.getAttribute("data-scale") ?? "linear"] ?? linear;
function valueAt(el, p) {
  const r = rangeOf(el, runtimeOf3(el).input);
  let v = NaN;
  try {
    v = scaleOf2(el).value(clamp4(p, 0, 1), r);
  } catch {
    v = NaN;
  }
  return Number.isFinite(v) ? v : linear.value(clamp4(p, 0, 1), r);
}
function positionAt(el, v) {
  const r = rangeOf(el, runtimeOf3(el).input);
  let p = NaN;
  try {
    p = scaleOf2(el).position(v, r);
  } catch {
    p = NaN;
  }
  return clamp4(Number.isFinite(p) ? p : linear.position(v, r), 0, 1);
}
function settle(el, v) {
  const input = runtimeOf3(el).input;
  const r = rangeOf(el, input);
  const lo = Math.min(r.min, r.max);
  const hi = Math.max(r.min, r.max);
  let out = clamp4(Number.isFinite(v) ? v : lo, lo, hi);
  const step = Number(input.getAttribute("step"));
  if (step > 0)
    out = clamp4(r.min + Math.round((out - r.min) / step) * step, lo, hi);
  return tidy(out);
}
function textOf(el, v) {
  const input = runtimeOf3(el).input;
  const r = rangeOf(el, input);
  const d = Number.parseInt(el.getAttribute("data-decimals") ?? "", 10);
  const context = {
    unit: el.getAttribute("data-unit") ?? "",
    decimals: Number.isFinite(d) && d >= 0 ? Math.min(d, 20) : null,
    locale: textLocale2(el),
    min: r.min,
    max: r.max,
    step: Number(input.getAttribute("step")) > 0 ? Number(input.getAttribute("step")) : null
  };
  const format = FORMATS[el.getAttribute("data-format") ?? "number"] ?? FORMATS.number;
  try {
    return String(format(v, context));
  } catch {
    return FORMATS.number(v, context);
  }
}
function ringsOf(raw) {
  if (!Array.isArray(raw))
    return [];
  const seen = new Set;
  return raw.filter((r) => r && typeof r === "object" && r.id != null && !seen.has(String(r.id)) && seen.add(String(r.id))).map((r) => ({
    id: String(r.id),
    label: r.label == null ? String(r.id) : String(r.label),
    amount: clamp4(num3(r.amount, 0), -1, 1),
    ...r.color == null ? {} : { color: String(r.color) },
    bipolar: r.bipolar === true
  }));
}
function colorOf2(ring, i) {
  const c = ring.color ?? "";
  if (THEME_COLORS.test(c))
    return `var(--${c})`;
  if (c && typeof CSS !== "undefined" && CSS.supports("color", c))
    return c;
  return `var(--chart-${i % 5 + 1})`;
}
function ringsText(list) {
  if (!list.length)
    return "";
  const share = (r) => `${r.bipolar ? "±" : r.amount < 0 ? "-" : "+"} ${Math.round(Math.abs(r.amount) * 100)} %`;
  return `Modulated by ${list.map((r) => `${r.label} (${share(r)})`).join(", ")}`;
}
function ticksOf(el) {
  const attr = el.getAttribute("data-ticks");
  if (attr === null)
    return [];
  const count = Number.parseInt(attr, 10);
  if (count >= 2)
    return Array.from({ length: Math.min(count, MAX_TICKS) }, (_, i) => i / (Math.min(count, MAX_TICKS) - 1));
  const input = runtimeOf3(el).input;
  const step = Number(input.getAttribute("step"));
  const r = rangeOf(el, input);
  const steps = step > 0 ? Math.floor(Math.abs(r.max - r.min) / step + 0.000000001) + 1 : Infinity;
  if (steps > MAX_TICKS)
    return [];
  const dir = Math.sign(r.max - r.min) || 1;
  return Array.from({ length: steps }, (_, i) => positionAt(el, r.min + i * step * dir));
}
function renderDial(el) {
  const rt = runtimeOf3(el);
  const n = rt.rings.length;
  const markup = rt.rings.map((r, i) => `<span class="knob-ring" data-ring="${esc5(r.id)}"${r.bipolar ? " data-bipolar" : ""} title="${esc5(r.label ?? r.id)}" style="--knob-ring: ${i + 1}; --knob-ring-color: ${esc5(colorOf2(r, i))}"></span>`).join("");
  const ticks = ticksOf(el).map((t) => `<span class="knob-tick" style="--knob-t: ${round4(t)}"></span>`).join("");
  const id = rt.dial.getAttribute("data-describes") ?? "";
  dfDollar7(rt.dial).html(`${markup}${ticks}<span class="knob-track"></span><span class="knob-face"><span class="knob-pointer"></span></span><span class="knob-rings-text" id="${esc5(id)}">${esc5(ringsText(rt.rings))}</span>`);
  rt.dial.style.setProperty("--knob-rings", String(n));
  if (el.hasAttribute("data-radius"))
    rt.dial.style.setProperty("--knob-radius", `${Math.max(8, num3(el.getAttribute("data-radius"), 8))}px`);
}
function redraw(el) {
  renderDial(el);
  show(el, runtimeOf3(el).value, true, false);
}
function paint3(el) {
  const rt = runtimeOf3(el);
  const dial = rt.dial;
  const origin = el.hasAttribute("data-origin") ? positionAt(el, num3(el.getAttribute("data-origin"), 0)) : 0;
  dial.style.setProperty("--knob-p", round4(rt.p));
  dial.style.setProperty("--knob-o", round4(origin));
  let effective = rt.p;
  let modulated = false;
  dfDollar7(dial).children(".knob-ring").each((i, ring) => {
    const r = rt.rings[i];
    if (!r)
      return;
    const reach = Math.abs(r.amount);
    const from = r.bipolar ? rt.p - reach : Math.min(rt.p, rt.p + r.amount);
    const to = r.bipolar ? rt.p + reach : Math.max(rt.p, rt.p + r.amount);
    ring.style.setProperty("--knob-from", round4(clamp4(from, 0, 1)));
    ring.style.setProperty("--knob-to", round4(clamp4(to, 0, 1)));
    const out = rt.live.get(r.id);
    if (out === undefined) {
      if (ring.hasAttribute("data-live"))
        dfDollar7(ring).attr("data-live", null);
      return;
    }
    const at = clamp4(rt.p + r.amount * out, 0, 1);
    effective += r.amount * out;
    modulated = true;
    ring.style.setProperty("--knob-at-lo", round4(Math.min(rt.p, at)));
    ring.style.setProperty("--knob-at-hi", round4(Math.max(rt.p, at)));
    if (!ring.hasAttribute("data-live"))
      dfDollar7(ring).attr("data-live", "");
  });
  dial.style.setProperty("--knob-e", round4(clamp4(effective, 0, 1)));
  if (dial.hasAttribute("data-modulated") !== modulated)
    dfDollar7(dial).attr("data-modulated", modulated ? "" : null);
  const text = textOf(el, rt.value);
  if (rt.input.getAttribute("aria-valuetext") !== text)
    dfDollar7(rt.input).attr("aria-valuetext", text);
  dfDollar7(el).find(".knob-value").each((_i, out) => {
    if (dfDollar7(out).text() !== text)
      dfDollar7(out).text(text);
  });
}
function show(el, v, committed, emit = true) {
  const rt = runtimeOf3(el);
  const value = settle(el, v);
  const changed = value !== rt.value;
  rt.value = value;
  rt.p = positionAt(el, value);
  if (rt.input.value !== String(value))
    rt.input.value = String(value);
  paint3(el);
  if (!emit) {
    if (committed)
      rt.committed = value;
    return;
  }
  const done = committed && value !== rt.committed;
  if (!changed && !done)
    return;
  rt.writing = true;
  try {
    if (changed)
      rt.input.dispatchEvent(new Event("input", { bubbles: true }));
    if (done) {
      rt.committed = value;
      rt.input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  } finally {
    rt.writing = false;
  }
  el.dispatchEvent(new CustomEvent("knob-change", {
    bubbles: true,
    detail: { value, position: Math.round(rt.p * 1e4) / 1e4, text: textOf(el, value), committed }
  }));
}
var defaultOf = (el) => num3(el.getAttribute("data-default"), num3(runtimeOf3(el).input.defaultValue, rangeOf(el, runtimeOf3(el).input).min));
function applyMarkup7(el, stateName) {
  const input = inputOf(el);
  if (!input)
    return;
  if (stateName === "disabled") {
    if (!input.hasAttribute("disabled"))
      dfDollar7(input).attr("disabled", "");
  } else if (input.hasAttribute("disabled"))
    dfDollar7(input).attr("disabled", null);
}
function triggerStateChange7(el, stateName, incoming) {
  applyMarkup7(el, stateName);
  const rt = runtimeOf3(el);
  if (!rt)
    return;
  if (stateName !== "adjusting" && rt.drag)
    endDrag(el, false, false);
  if (stateName !== "adjusting")
    rt.dial.style.removeProperty("--knob-reach");
  if ("value" in incoming)
    show(el, num3(incoming.value, rt.value), true);
  return;
}
var knobApi = componentState7({
  component: "knob",
  states: knobStates,
  mergeConfig: true,
  apply: (el, state, _previous, incoming) => triggerStateChange7(el, state.name, incoming),
  read: (el, state) => {
    const rt = runtimeOf3(el);
    if (!rt)
      return state;
    const name = rt.input.disabled ? "disabled" : state.name === "disabled" ? "default" : state.name;
    if (name === state.name && state.config.value === rt.value)
      return state;
    return { name, config: { ...state.config, value: rt.value } };
  },
  markup: (el, state) => applyMarkup7(el, state.name),
  events: ["input", "change"]
});
df$7.knobApi = knobApi;
df$7.knobStates = knobStates;
function speedAt(d, e) {
  const dist = Math.hypot(e.clientX - d.cx, e.clientY - d.cy);
  return dist <= d.radius ? 1 : Math.max(MIN_SPEED, d.radius / dist);
}
function reach(el, e) {
  const rt = runtimeOf3(el);
  if (!rt.drag)
    return;
  const dist = Math.hypot(e.clientX - rt.drag.cx, e.clientY - rt.drag.cy);
  rt.dial.style.setProperty("--knob-reach", `${Math.round(dist)}px`);
}
var radiusOf = (el, box) => Math.max(8, num3(el.getAttribute("data-radius"), box.width));
function onPointerDown(el, e) {
  const rt = runtimeOf3(el);
  if (!rt || rt.input.disabled || e.button !== 0)
    return;
  e.preventDefault();
  rt.input.focus({ preventScroll: true, focusVisible: false });
  if (e.ctrlKey || e.metaKey) {
    show(el, defaultOf(el), true);
    return;
  }
  const box = rt.dial.getBoundingClientRect();
  rt.drag = {
    id: e.pointerId,
    x: e.clientX,
    p: rt.p,
    start: rt.value,
    cx: box.left + box.width / 2,
    cy: box.top + box.height / 2,
    radius: radiusOf(el, box)
  };
  rt.dial.style.setProperty("--knob-radius", `${Math.round(rt.drag.radius)}px`);
  try {
    rt.dial.setPointerCapture(e.pointerId);
  } catch {}
  el.api?.setState("adjusting");
  reach(el, e);
}
function onPointerMove(el, e) {
  const rt = runtimeOf3(el);
  const d = rt?.drag;
  if (!d || e.pointerId !== d.id)
    return;
  const dx = e.clientX - d.x;
  d.x = e.clientX;
  const travel = Math.max(20, num3(el.getAttribute("data-travel"), 200));
  d.p = clamp4(d.p + dx / travel * speedAt(d, e) * (e.shiftKey ? 0.1 : 1), 0, 1);
  reach(el, e);
  show(el, valueAt(el, d.p), false);
}
function endDrag(el, cancel, rest = true) {
  const rt = runtimeOf3(el);
  const d = rt.drag;
  if (!d)
    return;
  rt.drag = null;
  try {
    if (rt.dial.hasPointerCapture(d.id))
      rt.dial.releasePointerCapture(d.id);
  } catch {}
  show(el, cancel ? d.start : rt.value, true);
  if (rest && el.dataset.stateName === "adjusting")
    el.api?.setState("default");
}
function onKey2(el, e) {
  const rt = runtimeOf3(el);
  if (!rt || rt.input.disabled || e.altKey || e.ctrlKey || e.metaKey)
    return;
  if (e.key === "Escape") {
    if (!rt.drag)
      return;
    e.preventDefault();
    endDrag(el, true);
    return;
  }
  const dir = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
  const step = Number(rt.input.getAttribute("step"));
  let value = null;
  if (dir && step > 0)
    value = rt.value + dir * step * Math.sign(rangeOf(el, rt.input).max - rangeOf(el, rt.input).min || 1);
  else if (dir)
    value = valueAt(el, rt.p + dir * (e.shiftKey ? FINE_STEP : KEY_STEP));
  else if (e.key === "PageUp" || e.key === "PageDown")
    value = valueAt(el, rt.p + (e.key === "PageUp" ? PAGE_STEP : -PAGE_STEP));
  else if (e.key === "Home" || e.key === "End")
    value = valueAt(el, e.key === "Home" ? 0 : 1);
  else if (e.key === "Delete" || e.key === "Backspace")
    value = defaultOf(el);
  else if (e.key === "Enter" && !rt.drag) {
    e.preventDefault();
    openEditor(el);
    return;
  }
  if (value === null)
    return;
  e.preventDefault();
  if (rt.drag)
    rt.drag.p = positionAt(el, settle(el, value));
  show(el, value, true);
}
function editScaleOf(el) {
  const format = el.getAttribute("data-format") ?? "number";
  if (format === "percent")
    return { factor: 100, unit: "%" };
  if (format === "time")
    return { factor: 1, unit: "s" };
  return { factor: 1, unit: el.getAttribute("data-unit") ?? "" };
}
function openEditor(el) {
  const rt = runtimeOf3(el);
  if (!rt || rt.input.disabled || rt.editor)
    return;
  const { factor, unit } = editScaleOf(el);
  const r = rangeOf(el, rt.input);
  const step = Number(rt.input.getAttribute("step"));
  const id = `${rt.dial.getAttribute("data-describes") ?? "knob"}-edit`;
  const name = dfDollar7(el).find(".knob-label").text().trim() || rt.input.getAttribute("aria-label") || "Value";
  const typed = (v) => String(tidy(v * factor));
  const editor = dfDollar7(`<div class="number-input knob-editor" data-size="xs"><input type="number" id="${esc5(id)}" min="${typed(Math.min(r.min, r.max))}" max="${typed(Math.max(r.min, r.max))}" step="${step > 0 ? typed(step) : "any"}" value="${typed(rt.value)}" aria-label="${esc5(name)}" enterkeyhint="done" />${unit ? `<label class="number-input-unit" for="${esc5(id)}">${esc5(unit)}</label>` : ""}</div>`).get(0);
  const output = dfDollar7(el).find(".knob-value").get(0);
  const middle = output ? output.offsetTop + output.offsetHeight / 2 : rt.dial.offsetTop + rt.dial.offsetHeight + 16;
  editor.style.setProperty("top", `${middle}px`);
  if (output)
    output.style.setProperty("visibility", "hidden");
  dfDollar7(el).append(editor);
  rt.editor = editor;
  const field = dfDollar7(editor).find("input").get(0);
  const close = (commit, back) => {
    if (rt.editor !== editor)
      return;
    rt.editor = null;
    const n = field.valueAsNumber;
    editor.remove();
    if (output)
      output.style.removeProperty("visibility");
    if (commit && Number.isFinite(n))
      show(el, n / factor, true);
    if (back)
      rt.input.focus({ preventScroll: true });
  };
  dfDollar7(field).on("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== "Escape")
      return;
    e.preventDefault();
    e.stopPropagation();
    close(e.key === "Enter", true);
  });
  dfDollar7(field).on("blur", () => close(true, false));
  field.focus({ preventScroll: true });
  field.select();
}
function init7() {
  dfDollar7(".knob:not([data-init])").toArray().forEach((el) => {
    el.dataset.init = "";
    const input = inputOf(el);
    if (!input)
      return;
    if (!input.hasAttribute("step")) {
      dfDollar7(input).attr("step", "any");
      if (input.hasAttribute("value"))
        input.value = input.defaultValue;
    }
    let data = null;
    try {
      data = JSON.parse(dfDollar7(el).children("script.knob-rings").text() || "null");
    } catch {
      data = null;
    }
    const id = `knob-rings-${++rings}`;
    const dial = dfDollar7(`<span class="knob-dial" aria-hidden="true" data-describes="${id}"></span>`).get(0);
    dfDollar7(input).before(dial);
    const described = (input.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean);
    dfDollar7(input).attr("aria-describedby", [...described, id].join(" "));
    const rt = {
      input,
      dial,
      value: NaN,
      p: 0,
      committed: NaN,
      rings: ringsOf(data),
      live: new Map,
      drag: null,
      writing: false,
      editor: null
    };
    el._knob = rt;
    renderDial(el);
    show(el, num3(input.value, defaultOf(el)), true, false);
    bindComponent7(el, knobApi, { name: input.disabled ? "disabled" : "default", config: { value: rt.value } });
    dfDollar7(dial).on("pointerdown", (e) => onPointerDown(el, e));
    dfDollar7(dial).on("pointermove", (e) => onPointerMove(el, e));
    dfDollar7(dial).on("pointerup", () => endDrag(el, false));
    dfDollar7(dial).on("pointercancel", () => endDrag(el, false));
    dfDollar7(dial).on("lostpointercapture", () => endDrag(el, false));
    dfDollar7(dial).on("dblclick", () => {
      if (!input.disabled)
        show(el, defaultOf(el), true);
    });
    dfDollar7(input).on("keydown", (e) => onKey2(el, e));
    dfDollar7(el).on("dblclick", (e) => {
      if (e.target.closest?.(".knob-value"))
        openEditor(el);
    });
    dfDollar7(input).on("input", () => {
      if (!rt.writing && Number(input.value) !== rt.value)
        show(el, num3(input.value, rt.value), true, false);
    });
    if (input.form)
      dfDollar7(input.form).on("reset", () => {
        setTimeout(() => show(el, num3(input.value, defaultOf(el)), true, false));
      });
    const again = () => redraw(el);
    new MutationObserver(again).observe(el, {
      attributes: true,
      attributeFilter: [
        "data-scale",
        "data-exponent",
        "data-origin",
        "data-unit",
        "data-format",
        "data-decimals",
        "data-ticks"
      ]
    });
    new MutationObserver(again).observe(input, { attributes: true, attributeFilter: ["min", "max", "step"] });
  });
}
var resolve7 = (target) => {
  const el = typeof target === "string" ? dfDollar7(target).get(0) : target;
  const knob = el?.closest?.(".knob");
  return knob?._knob ? knob : undefined;
};
df$7.knob = {
  value: (target, value) => {
    const el = resolve7(target);
    if (!el)
      return NaN;
    if (value !== undefined)
      el.api?.setState(el.dataset.stateName === "disabled" ? "disabled" : "default", { value });
    return runtimeOf3(el).value;
  },
  position: (target) => {
    const el = resolve7(target);
    return el ? runtimeOf3(el).p : NaN;
  },
  reset: (target) => {
    const el = resolve7(target);
    if (!el)
      return NaN;
    show(el, defaultOf(el), true);
    return runtimeOf3(el).value;
  },
  rings: (target, list) => {
    const el = resolve7(target);
    if (!el)
      return [];
    const rt = runtimeOf3(el);
    if (list !== undefined) {
      rt.rings = ringsOf(list);
      for (const id of rt.live.keys())
        if (!rt.rings.some((r) => r.id === id))
          rt.live.delete(id);
      renderDial(el);
      paint3(el);
    }
    return rt.rings.map((r) => ({ ...r }));
  },
  modulate: (target, values) => {
    const el = resolve7(target);
    if (!el)
      return NaN;
    const rt = runtimeOf3(el);
    if (values === null)
      rt.live.clear();
    else
      for (const [id, out] of Object.entries(values ?? {})) {
        const ring = rt.rings.find((r) => r.id === id);
        if (!ring || out === null || !Number.isFinite(Number(out)))
          rt.live.delete(id);
        else
          rt.live.set(id, clamp4(Number(out), ring.bipolar ? -1 : 0, 1));
      }
    paint3(el);
    let p = rt.p;
    for (const r of rt.rings)
      p += r.amount * (rt.live.get(r.id) ?? 0);
    return settle(el, valueAt(el, clamp4(p, 0, 1)));
  },
  scale: (name, scale) => {
    if (!name || typeof scale?.value !== "function" || typeof scale?.position !== "function")
      return;
    SCALES2[name] = scale;
    for (const el of dfDollar7(`.knob[data-init][data-scale="${CSS.escape(name)}"]`).toArray())
      if (el._knob)
        redraw(el);
  },
  format: (name, format) => {
    if (!name || typeof format !== "function")
      return;
    FORMATS[name] = format;
    for (const el of dfDollar7(`.knob[data-init][data-format="${CSS.escape(name)}"]`).toArray())
      if (el._knob)
        paint3(el);
  }
};
init7();
new MutationObserver(init7).observe(document, { childList: true, subtree: true });

// dist/components/envelope/envelope.js
var __df$core8 = globalThis.df$;
var __df$shared8 = __df$core8 && __df$core8.shadcn && __df$core8.shadcn.shared;
if (!__df$shared8 || __df$shared8.abi !== "0.9.10") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals8, defussQuery: defussQuery8, componentState: componentState8, bindComponent: bindComponent8, textLocale: textLocale3 } = __df$shared8;
var df$8 = defussGlobals8();
var dfDollar8 = defussQuery8();
var envelopeStates = ["default", "playing", "editing", "disabled"];
var MAX_TIME = 32;
var F_MIN = 20;
var F_MAX = 20000;
var SAMPLES = 256;
var BAND_TYPES = ["lowpass", "highpass", "bandpass", "lowshelf", "highshelf", "peaking", "notch", "allpass"];
var TYPE_NAMES = {
  lowpass: "Low pass",
  highpass: "High pass",
  bandpass: "Band pass",
  lowshelf: "Low shelf",
  highshelf: "High shelf",
  peaking: "Bell",
  notch: "Notch",
  allpass: "All pass"
};
var STAGES = ["delay", "attack", "hold", "decay", "sustain", "release"];
var STAGE_NAMES = {
  delay: "Delay",
  attack: "Attack",
  hold: "Hold",
  decay: "Decay",
  sustain: "Sustain",
  release: "Release"
};
var PHASE_MARKS = {
  delay: "Dly",
  attack: "A",
  hold: "H",
  decay: "D",
  sustain: "S",
  release: "R"
};
var THEME_COLORS2 = /^(chart-[1-5]|primary|destructive|foreground|muted-foreground)$/;
var DEFAULTS = {
  adsr: { attack: 0.01, decay: 0.3, sustain: 0.7, release: 0.5 },
  dynamics: { threshold: -18, ratio: 4, knee: 6, makeup: 0, attack: 0.01, release: 0.1 }
};
var described2 = 0;
var clamp5 = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
var num4 = (v, fallback) => {
  const n = typeof v === "number" ? v : v === null || v === undefined || v === "" ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
};
var esc6 = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
var tidy2 = (v) => Number(v.toPrecision(6));
var r1 = (v) => String(Math.round(v * 10) / 10);
var runtimeOf4 = (el) => el._envelope;
var kindOf = (el) => {
  const k = el.getAttribute("data-kind");
  return k === "dynamics" || k === "filter" ? k : "adsr";
};
function shape(t, curve) {
  const k = curve * 8;
  if (Math.abs(k) < 0.0001)
    return t;
  return (1 - Math.exp(-k * t)) / (1 - Math.exp(-k));
}
var bendFor = (share) => clamp5(2 * Math.log(share / (1 - share)) / 8, -1, 1);
function levelAt(p, t, gateOff, v0 = 0) {
  const held = (s) => {
    let u = s;
    const delay = p.delay ?? 0;
    if (u < delay)
      return { value: v0, phase: "delay" };
    u -= delay;
    if (u < p.attack)
      return { value: v0 + (1 - v0) * shape(u / p.attack, p.attackCurve), phase: "attack" };
    u -= p.attack;
    const hold = p.hold ?? 0;
    if (u < hold)
      return { value: 1, phase: "hold" };
    u -= hold;
    if (u < p.decay)
      return { value: 1 + (p.sustain - 1) * shape(u / p.decay, p.decayCurve), phase: "decay" };
    return { value: p.sustain, phase: "sustain" };
  };
  if (t < 0)
    return { value: v0, phase: "idle" };
  if (gateOff === null || t < gateOff)
    return held(t);
  const from = held(gateOff).value;
  const r = t - gateOff;
  if (r >= p.release || from <= 0)
    return { value: 0, phase: "idle" };
  return { value: from * (1 - shape(r / p.release, p.releaseCurve)), phase: "release" };
}
var sustainStart = (p) => (p.delay ?? 0) + p.attack + (p.hold ?? 0) + p.decay;
function staticCurve(p, x) {
  const over = x - p.threshold;
  const w = p.knee;
  if (2 * over < -w)
    return x;
  if (w > 0 && 2 * Math.abs(over) <= w)
    return x + (1 / p.ratio - 1) * (over + w / 2) ** 2 / (2 * w);
  return p.threshold + over / p.ratio;
}
var audio;
var biquad = null;
var freqs = null;
function frequencies() {
  if (!freqs) {
    freqs = new Float32Array(SAMPLES);
    for (let i = 0;i < SAMPLES; i++)
      freqs[i] = F_MIN * (F_MAX / F_MIN) ** (i / (SAMPLES - 1));
  }
  return freqs;
}
var stages = (b) => b.type === "lowpass" || b.type === "highpass" ? Math.round(b.slope / 12) : 1;
function bandDb(b, at) {
  const out = new Float32Array(at.length);
  if (audio === undefined) {
    try {
      audio = new OfflineAudioContext(1, 128, 48000);
      biquad = audio.createBiquadFilter();
    } catch {
      audio = null;
    }
  }
  if (!biquad)
    return out;
  biquad.type = b.type;
  biquad.frequency.value = b.frequency;
  biquad.Q.value = b.Q;
  biquad.gain.value = b.gain;
  const mag = new Float32Array(at.length);
  biquad.getFrequencyResponse(at, mag, new Float32Array(at.length));
  const n = stages(b);
  for (let i = 0;i < at.length; i++)
    out[i] = Math.max(-120, 20 * Math.log10(mag[i] || 0.000001) * n);
  return out;
}
function bandY(b) {
  if (b.type === "peaking")
    return b.gain;
  if (b.type === "lowshelf" || b.type === "highshelf")
    return b.gain / 2;
  if (b.type === "lowpass" || b.type === "highpass")
    return b.Q * stages(b);
  return 0;
}
var QS = { cut: [-12, 24], q: [0.1, 24] };
var isCut = (t) => t === "lowpass" || t === "highpass";
var hasGain = (t) => t === "peaking" || t === "lowshelf" || t === "highshelf";
var hasQ = (t) => t !== "lowshelf" && t !== "highshelf";
function bandOf(raw) {
  if (!raw || typeof raw !== "object")
    return null;
  const r = raw;
  const type = BAND_TYPES.includes(String(r.type)) ? String(r.type) : "peaking";
  const [qlo, qhi] = isCut(type) ? QS.cut : QS.q;
  const band = {
    type,
    frequency: tidy2(clamp5(num4(r.frequency, 1000), F_MIN, F_MAX)),
    Q: hasQ(type) ? tidy2(clamp5(num4(r.Q, isCut(type) ? 0 : 1), qlo, qhi)) : 1,
    gain: hasGain(type) ? tidy2(clamp5(num4(r.gain, 0), -24, 24)) : 0,
    slope: isCut(type) ? clamp5(Math.round(num4(r.slope, 12) / 12) * 12, 12, 48) : 12,
    on: r.on !== false
  };
  const out = {};
  if (typeof r.id === "string" && r.id)
    out.id = r.id;
  if (typeof r.label === "string" && r.label)
    out.label = r.label;
  Object.assign(out, band);
  if (typeof r.color === "string" && r.color)
    out.color = r.color;
  return out;
}
function paramsOf(kind, raw, base) {
  const r = raw && typeof raw === "object" ? raw : {};
  if (kind === "filter") {
    const list = Array.isArray(r.bands) ? r.bands : base ? base.bands : [];
    return { bands: list.map(bandOf).filter((b) => !!b) };
  }
  const b = base ?? DEFAULTS[kind];
  const pick = (key, lo, hi, fallback) => tidy2(clamp5(num4(r[key], num4(b[key], fallback)), lo, hi));
  if (kind === "dynamics")
    return {
      threshold: pick("threshold", -96, 0, -18),
      ratio: pick("ratio", 1, 100, 4),
      knee: pick("knee", 0, 24, 6),
      makeup: pick("makeup", -24, 24, 0),
      attack: pick("attack", 0, 1, 0.01),
      release: pick("release", 0, 5, 0.1)
    };
  const out = {};
  const has = (key) => (key in r) || (base ? base[key] !== undefined : false);
  if (has("delay"))
    out.delay = pick("delay", 0, MAX_TIME, 0);
  out.attack = pick("attack", 0, MAX_TIME, 0.01);
  if (has("hold"))
    out.hold = pick("hold", 0, MAX_TIME, 0);
  out.decay = pick("decay", 0, MAX_TIME, 0.3);
  out.sustain = pick("sustain", 0, 1, 0.7);
  out.release = pick("release", 0, MAX_TIME, 0.5);
  out.attackCurve = pick("attackCurve", -1, 1, 0);
  out.decayCurve = pick("decayCurve", -1, 1, 0);
  out.releaseCurve = pick("releaseCurve", -1, 1, 0);
  return out;
}
var clone = (p) => JSON.parse(JSON.stringify(p));
var keyOf = (b, i) => b.id ?? String(i + 1);
function liveBand(rt, b, i) {
  const m = rt.mod.get(keyOf(b, i));
  return m ? bandOf({ ...b, ...m }) ?? b : b;
}
var fmt = (locale, o) => new Intl.NumberFormat(locale, o);
function timeText(locale, s) {
  if (s <= 0)
    return `0 ms`;
  if (s < 1)
    return `${fmt(locale, { maximumSignificantDigits: 3 }).format(s * 1000)} ms`;
  return `${fmt(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(s)} s`;
}
var pctText = (locale, v) => fmt(locale, { style: "percent" }).format(v);
var dbText = (locale, v) => `${fmt(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: "exceptZero" }).format(v)} dB`;
var bendText = (locale, v) => fmt(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: "exceptZero" }).format(v);
var ratioText = (locale, v) => v >= 100 ? "∞:1" : `${fmt(locale, { maximumFractionDigits: v < 10 ? 1 : 0 }).format(v)}:1`;
function hzText(locale, f) {
  if (f < 1000)
    return `${fmt(locale, { maximumSignificantDigits: 3 }).format(f)} Hz`;
  return `${fmt(locale, { maximumSignificantDigits: 3 }).format(f / 1000)} kHz`;
}
var qText = (locale, q) => `Q ${fmt(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(q)}`;
var bandName = (b, i) => b.label ?? `${TYPE_NAMES[b.type]} ${i + 1}`;
function bandText(locale, b) {
  const parts = [hzText(locale, b.frequency)];
  if (hasGain(b.type))
    parts.push(dbText(locale, b.gain));
  if (isCut(b.type))
    parts.push(`${b.slope} dB/oct`, `resonance ${dbText(locale, b.Q)}`);
  else if (hasQ(b.type))
    parts.push(qText(locale, b.Q));
  if (!b.on)
    parts.push("off");
  return parts.join(", ");
}
function summary(el) {
  const rt = runtimeOf4(el);
  const locale = textLocale3(el);
  if (rt.kind === "filter") {
    const bands = rt.params.bands;
    return bands.length ? bands.map((b, i) => `${bandName(b, i)}: ${TYPE_NAMES[b.type].toLowerCase()}, ${bandText(locale, b)}`).join("; ") : "No bands";
  }
  if (rt.kind === "dynamics") {
    const p = rt.params;
    return `Threshold ${dbText(locale, p.threshold)}, ratio ${ratioText(locale, p.ratio)}, knee ${fmt(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(p.knee)} dB, makeup ${dbText(locale, p.makeup)}, attack ${timeText(locale, p.attack)}, release ${timeText(locale, p.release)}`;
  }
  const p = rt.params;
  const parts = [];
  if (p.delay !== undefined)
    parts.push(`delay ${timeText(locale, p.delay)}`);
  parts.push(`attack ${timeText(locale, p.attack)}`);
  if (p.hold !== undefined)
    parts.push(`hold ${timeText(locale, p.hold)}`);
  parts.push(`decay ${timeText(locale, p.decay)}`, `sustain ${pctText(locale, p.sustain)}`, `release ${timeText(locale, p.release)}`);
  const s = parts.join(", ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function colorOf3(color, i) {
  if (color && THEME_COLORS2.test(color))
    return `var(--${color})`;
  if (color && globalThis.CSS?.supports?.("color", color))
    return color;
  return `var(--chart-${i % 5 + 1})`;
}
function viewOf(el, p, kind) {
  const range = Math.abs(num4(el.getAttribute("data-range"), kind === "dynamics" ? 60 : 24)) || 24;
  if (kind !== "adsr")
    return { T: 1, sustainWidth: 0, floor: -range, range };
  const a = p;
  const span = sustainStart(a) + a.release;
  const sustainWidth = Math.max(span * 0.25, 0.05);
  const T = Math.max(span + sustainWidth, num4(el.getAttribute("data-length"), 0));
  return { T, sustainWidth, floor: -range, range };
}
var gateAt = (p, v) => sustainStart(p) + v.sustainWidth;
var fxFreq = (f) => Math.log(f / F_MIN) / Math.log(F_MAX / F_MIN);
var freqFx = (fx) => F_MIN * (F_MAX / F_MIN) ** fx;
function handlesOf(el) {
  const rt = runtimeOf4(el);
  const v = rt.view;
  const locale = textLocale3(el);
  const time = (key, from) => ({
    setX: (fx) => set(el, { [key]: Math.max(0, fx * v.T - from()) }, key),
    keyX: (dir, fine) => {
      const now = rt.params[key] ?? 0;
      const f = fine ? 1.01 : 1.1;
      set(el, { [key]: dir > 0 ? Math.max(0.001, now * f) : now < 0.0011 ? 0 : now / f }, key);
    }
  });
  if (rt.kind === "adsr") {
    const p = rt.params;
    const d = p.delay ?? 0;
    const peak = d + p.attack;
    const held = peak + (p.hold ?? 0);
    const sus = held + p.decay;
    const gate = gateAt(p, v);
    const out = [];
    const bend = (key, label, t, y, share) => out.push({
      id: key,
      label,
      x: t / v.T,
      y,
      text: `${label} ${bendText(locale, p[key])}`,
      now: p[key],
      min: -1,
      max: 1,
      setY: (fy) => set(el, { [key]: bendFor(clamp5(share(fy), 0.02, 0.98)) }, key),
      keyY: (dir, fine) => set(el, { [key]: clamp5(p[key] + dir * (fine ? 0.01 : 0.05), -1, 1) }, key),
      keyX: (dir, fine) => set(el, { [key]: clamp5(p[key] + dir * (fine ? 0.01 : 0.05), -1, 1) }, key)
    });
    if (p.delay !== undefined)
      out.push({
        id: "delay",
        label: "Delay",
        x: d / v.T,
        y: 0,
        text: `Delay ${timeText(locale, d)}`,
        now: d,
        min: 0,
        max: MAX_TIME,
        ...time("delay", () => 0)
      });
    out.push({
      id: "attack",
      label: "Attack",
      x: peak / v.T,
      y: 1,
      text: `Attack ${timeText(locale, p.attack)}`,
      now: p.attack,
      min: 0,
      max: MAX_TIME,
      ...time("attack", () => d)
    });
    if (p.attack > 0)
      bend("attackCurve", "Attack curve", d + p.attack / 2, shape(0.5, p.attackCurve), (fy) => fy);
    if (p.hold !== undefined)
      out.push({
        id: "hold",
        label: "Hold",
        x: held / v.T,
        y: 1,
        text: `Hold ${timeText(locale, p.hold)}`,
        now: p.hold,
        min: 0,
        max: MAX_TIME,
        ...time("hold", () => peak)
      });
    out.push({
      id: "decay",
      label: "Decay and sustain",
      x: sus / v.T,
      y: p.sustain,
      text: `Decay ${timeText(locale, p.decay)}, sustain ${pctText(locale, p.sustain)}`,
      now: p.decay,
      min: 0,
      max: MAX_TIME,
      ...time("decay", () => held),
      setY: (fy) => set(el, { sustain: clamp5(fy, 0, 1) }, "sustain"),
      keyY: (dir, fine) => set(el, { sustain: clamp5(p.sustain + dir * (fine ? 0.001 : 0.01), 0, 1) }, "sustain")
    });
    if (p.decay > 0 && p.sustain < 0.999)
      bend("decayCurve", "Decay curve", held + p.decay / 2, 1 + (p.sustain - 1) * shape(0.5, p.decayCurve), (fy) => (1 - fy) / (1 - p.sustain));
    out.push({
      id: "release",
      label: "Release",
      x: (gate + p.release) / v.T,
      y: 0,
      text: `Release ${timeText(locale, p.release)}`,
      now: p.release,
      min: 0,
      max: MAX_TIME,
      ...time("release", () => gateAt(rt.params, v))
    });
    if (p.release > 0 && p.sustain > 0.001)
      bend("releaseCurve", "Release curve", gate + p.release / 2, p.sustain * (1 - shape(0.5, p.releaseCurve)), (fy) => 1 - fy / p.sustain);
    return out;
  }
  if (rt.kind === "dynamics") {
    const p = rt.params;
    const span = -v.floor;
    const fy = (db) => (db - v.floor) / span;
    const out0 = staticCurve(p, 0) + p.makeup;
    return [
      {
        id: "threshold",
        label: "Threshold",
        x: fy(p.threshold),
        y: fy(staticCurve(p, p.threshold) + p.makeup),
        text: `Threshold ${dbText(locale, p.threshold)}`,
        now: p.threshold,
        min: v.floor,
        max: 0,
        setX: (fx) => set(el, { threshold: clamp5(v.floor + fx * span, v.floor, 0) }, "threshold"),
        keyX: (dir, fine) => set(el, { threshold: clamp5(p.threshold + dir * (fine ? 0.1 : 1), v.floor, 0) }, "threshold"),
        keyY: (dir, fine) => set(el, { knee: clamp5(p.knee + dir * (fine ? 0.1 : 1), 0, 24) }, "knee")
      },
      {
        id: "ratio",
        label: "Ratio",
        x: 1,
        y: fy(out0),
        text: `Ratio ${ratioText(locale, p.ratio)}`,
        now: p.ratio,
        min: 1,
        max: 100,
        setY: (fyv) => {
          const o = v.floor + fyv * span - p.makeup;
          const ratio = o <= p.threshold + 0.01 ? 100 : o >= 0 ? 1 : -p.threshold / (o - p.threshold);
          set(el, { ratio: clamp5(ratio, 1, 100) }, "ratio");
        },
        keyY: (dir, fine) => {
          const f = fine ? 1.01 : 1.1;
          set(el, { ratio: clamp5(dir < 0 ? p.ratio * f : p.ratio / f, 1, 100) }, "ratio");
        }
      }
    ];
  }
  const bands = rt.params.bands;
  const R = v.range;
  return bands.map((b, i) => {
    const key = keyOf(b, i);
    const put = (patch, param) => {
      const next = rt.params.bands.map((x, j) => j === i ? { ...x, ...patch } : x);
      set(el, { bands: next }, `${key}.${param}`);
    };
    const yParam = (dbv) => {
      if (b.type === "peaking")
        return { gain: clamp5(dbv, -24, 24) };
      if (b.type === "lowshelf" || b.type === "highshelf")
        return { gain: clamp5(dbv * 2, -24, 24) };
      if (isCut(b.type))
        return { Q: clamp5(dbv / stages(b), QS.cut[0], QS.cut[1]) };
      return null;
    };
    const q = (dir, fine) => {
      if (!hasQ(b.type))
        return;
      if (isCut(b.type))
        put({ Q: clamp5(b.Q + dir * (fine ? 0.1 : 0.5), QS.cut[0], QS.cut[1]) }, "Q");
      else
        put({ Q: clamp5(b.Q * (dir > 0 ? fine ? 1.01 : 1.1 : 1 / (fine ? 1.01 : 1.1)), QS.q[0], QS.q[1]) }, "Q");
    };
    return {
      id: key,
      label: bandName(b, i),
      x: fxFreq(b.frequency),
      y: (clamp5(bandY(b), -R, R) + R) / (2 * R),
      text: `${bandName(b, i)} ${bandText(locale, b)}`,
      now: b.frequency,
      min: F_MIN,
      max: F_MAX,
      color: colorOf3(b.color, i),
      off: !b.on,
      setX: (fx) => put({ frequency: clamp5(freqFx(fx), F_MIN, F_MAX) }, "frequency"),
      setY: (fy) => {
        const patch = yParam(fy * 2 * R - R);
        if (patch)
          put(patch, Object.keys(patch)[0]);
      },
      keyX: (dir, fine) => put({ frequency: clamp5(b.frequency * 2 ** (dir * (fine ? 0.1 : 1) / 12), F_MIN, F_MAX) }, "frequency"),
      keyY: (dir, fine) => {
        const patch = yParam(bandY(b) + dir * (fine ? 0.1 : 0.5));
        if (patch)
          put(patch, Object.keys(patch)[0]);
      },
      keyQ: q
    };
  });
}
var X = (fx) => r1(fx * 1000);
var Y = (fy) => r1((1 - fy) * 1000);
var line = (pts) => pts.length ? `M${pts.map(([x, y]) => `${X(x)} ${Y(y)}`).join("L")}` : "";
function paths(el) {
  const rt = runtimeOf4(el);
  const v = rt.view;
  const out = {
    grid: "",
    major: "",
    ref: "",
    fill: "",
    ghost: "",
    curve: "",
    stages: {},
    bands: [],
    labels: ""
  };
  const label = (axis, at, text) => `<span class="envelope-tick" data-axis="${axis}" style="--envelope-${axis}: ${Math.round(at * 1e4) / 1e4}">${esc6(text)}</span>`;
  if (rt.kind === "adsr") {
    const p = rt.params;
    const gate = gateAt(p, v);
    for (const y of [0.25, 0.5, 0.75])
      out.grid += `M0 ${Y(y)}H1000`;
    const at = (t) => levelAt(p, t, gate).value;
    const bounds = {};
    let t0 = 0;
    for (const s of STAGES) {
      const len = s === "delay" ? p.delay ?? 0 : s === "hold" ? p.hold ?? 0 : s === "sustain" ? v.sustainWidth : s === "release" ? p.release : p[s];
      bounds[s] = [t0, t0 + len];
      t0 += len;
    }
    const all = [];
    for (const s of STAGES) {
      const [a, b] = bounds[s];
      if (b - a <= 0) {
        out.stages[s] = "";
        continue;
      }
      const bent = s === "attack" || s === "decay" || s === "release";
      const n = bent ? 48 : 1;
      const pts = [];
      for (let i = 0;i <= n; i++) {
        const t = a + (b - a) * i / n;
        const value = i === n && s !== "release" ? at(b - 0.000000001) : s === "release" && i === n ? 0 : at(t);
        pts.push([t / v.T, value]);
      }
      out.stages[s] = line(pts);
      all.push(...pts);
    }
    out.curve = line(all);
    if (all.length)
      out.fill = `${line(all)}L${X(all[all.length - 1][0])} 1000L0 1000Z`;
    return out;
  }
  if (rt.kind === "dynamics") {
    const p = rt.params;
    const span = -v.floor;
    const fy = (db) => (db - v.floor) / span;
    const step = span > 48 ? 12 : 6;
    for (let db = -step;db > v.floor; db -= step) {
      out.grid += `M${X(fy(db))} 0V1000M0 ${Y(fy(db))}H1000`;
      out.labels += label("x", fy(db), String(db)) + label("y", fy(db), String(db));
    }
    out.ref = `M0 1000L1000 0M${X(fy(p.threshold))} 0V1000`;
    const pts = [];
    for (let i = 0;i <= 160; i++) {
      const x = v.floor + span * i / 160;
      pts.push([fy(x), clamp5(fy(staticCurve(p, x) + p.makeup), -0.05, 1.05)]);
    }
    out.curve = line(pts);
    out.fill = `${line(pts)}L1000 1000L0 1000Z`;
    return out;
  }
  const R = v.range;
  const fy = (db) => (clamp5(db, -R * 1.2, R * 1.2) + R) / (2 * R);
  for (let dec = 10;dec <= 1e4; dec *= 10)
    for (let m = 1;m <= 9; m++) {
      const f = dec * m;
      if (f < F_MIN || f > F_MAX)
        continue;
      const path = `M${X(fxFreq(f))} 0V1000`;
      if (m === 1)
        out.major += path;
      else
        out.grid += path;
    }
  for (const f of [50, 100, 200, 500, 1000, 2000, 5000, 1e4])
    out.labels += label("x", fxFreq(f), f >= 1000 ? `${f / 1000}k` : String(f));
  const dbStep = R >= 18 ? 6 : 3;
  for (let db = dbStep;db < R; db += dbStep)
    out.grid += `M0 ${Y(fy(db))}H1000M0 ${Y(fy(-db))}H1000`;
  for (let db = dbStep * 2;db < R; db += dbStep * 2)
    out.labels += label("y", fy(db), `+${db}`) + label("y", fy(-db), `-${db}`);
  out.ref = `M0 ${Y(fy(0))}H1000`;
  const at = frequencies();
  const bands = rt.params.bands;
  const xs = Array.from(at, fxFreq);
  const sum = (list) => {
    const total = new Float32Array(at.length);
    for (const b of list) {
      if (!b.on)
        continue;
      const db = bandDb(b, at);
      for (let i = 0;i < at.length; i++)
        total[i] += db[i];
    }
    return total;
  };
  bands.forEach((b, i) => {
    const db = bandDb(b, at);
    out.bands.push({ d: line(xs.map((x, j) => [x, fy(db[j])])), color: colorOf3(b.color, i), off: !b.on });
  });
  const total = sum(bands.map((b, i) => liveBand(rt, b, i)));
  const pts = xs.map((x, j) => [x, fy(total[j])]);
  out.curve = line(pts);
  out.fill = `${line(pts)}L1000 ${Y(fy(0))}L0 ${Y(fy(0))}Z`;
  if (rt.mod.size)
    out.ghost = line(xs.map((x, j) => [x, fy(sum(bands)[j])]));
  return out;
}
function draw3(el) {
  const rt = runtimeOf4(el);
  if (!rt.frozen)
    rt.view = viewOf(el, rt.params, rt.kind);
  const d = paths(el);
  const svg = dfDollar8(rt.svg);
  const put = (sel, value) => {
    const path = svg.find(sel).get(0);
    if (path && path.getAttribute("d") !== value)
      dfDollar8(path).attr("d", value || null);
  };
  put(".envelope-grid", d.grid);
  put(".envelope-grid-major", d.major);
  put(".envelope-ref", d.ref);
  put(".envelope-fill", d.fill);
  put(".envelope-ghost", d.ghost);
  put(".envelope-curve", d.curve);
  for (const s of STAGES)
    put(`.envelope-stage[data-stage="${s}"]`, d.stages[s] ?? "");
  const bandPaths = svg.find(".envelope-band-curve").toArray();
  if (bandPaths.length !== d.bands.length) {
    for (const p of bandPaths)
      p.remove();
    const markup = d.bands.map(() => '<path class="envelope-band-curve"></path>').join("");
    if (markup) {
      const made = dfDollar8(`<svg>${markup}</svg>`).children().toArray();
      const ref = svg.find(".envelope-fill").get(0);
      for (const p of made)
        ref?.before(p);
    }
  }
  svg.find(".envelope-band-curve").toArray().forEach((p, i) => {
    const b = d.bands[i];
    if (p.getAttribute("d") !== b.d)
      dfDollar8(p).attr("d", b.d);
    p.style.setProperty("--envelope-band-color", b.color);
    dfDollar8(p).attr("data-off", b.off ? "" : null);
  });
  const labels = dfDollar8(rt.plot).find(".envelope-ticks");
  if (labels.html() !== d.labels)
    labels.html(d.labels);
  drawHandles(el);
  drawPhases(el);
  const text = summary(el);
  if (dfDollar8(rt.desc).text() !== text)
    dfDollar8(rt.desc).text(text);
}
function drawHandles(el) {
  const rt = runtimeOf4(el);
  const box = dfDollar8(rt.plot).find(".envelope-handles");
  const readonly = el.hasAttribute("data-readonly");
  const list = readonly ? [] : handlesOf(el);
  const disabled = rt.status === "disabled";
  const have = new Map(box.children(".envelope-handle").toArray().map((h) => [
    h.getAttribute("data-handle") ?? "",
    h
  ]));
  for (const [id, h] of have)
    if (!list.some((x) => x.id === id))
      h.remove();
  for (const h of list) {
    let node = have.get(h.id);
    if (!node) {
      node = dfDollar8(`<span class="envelope-handle" role="slider" data-handle="${esc6(h.id)}"></span>`).get(0);
      box.append(node);
    }
    const n = dfDollar8(node);
    const attrs = {
      tabindex: disabled ? "-1" : "0",
      "aria-label": h.label,
      "aria-valuemin": String(h.min),
      "aria-valuemax": String(h.max),
      "aria-valuenow": String(tidy2(h.now)),
      "aria-valuetext": h.text,
      "aria-disabled": disabled ? "true" : null,
      "data-bend": h.id.endsWith("Curve") ? "" : null,
      "data-off": h.off ? "" : null,
      "data-active": rt.drag?.handle === h.id || rt.status === "editing" && rt.editHandle === h.id ? "" : null
    };
    for (const [k, val] of Object.entries(attrs))
      if (node.getAttribute(k) !== val)
        n.attr(k, val);
    node.style.setProperty("--envelope-x", String(Math.round(h.x * 1e4) / 1e4));
    node.style.setProperty("--envelope-y", String(Math.round(h.y * 1e4) / 1e4));
    if (h.color)
      node.style.setProperty("--envelope-handle-color", h.color);
  }
}
function drawPhases(el) {
  const rt = runtimeOf4(el);
  const strip = dfDollar8(rt.graph).find(".envelope-phases");
  if (!strip.length)
    return;
  if (rt.kind !== "adsr") {
    if (strip.html())
      strip.html("");
    return;
  }
  const p = rt.params;
  const v = rt.view;
  let t0 = 0;
  let markup = "";
  for (const s of STAGES) {
    const len = s === "delay" ? p.delay : s === "hold" ? p.hold : s === "sustain" ? v.sustainWidth : p[s];
    if (len === undefined)
      continue;
    const from = t0 / v.T;
    t0 += len;
    markup += `<span class="envelope-phase" data-phase="${s}" style="--envelope-from: ${Math.round(from * 1e4) / 1e4}; --envelope-to: ${Math.round(t0 / v.T * 1e4) / 1e4}" title="${STAGE_NAMES[s]}">${PHASE_MARKS[s]}</span>`;
  }
  if (strip.html() !== markup)
    strip.html(markup);
  showPhase(el, rt.play?.phase ?? rt.live?.phase ?? "idle");
}
function showPhase(el, phase) {
  const rt = runtimeOf4(el);
  const active = rt.status === "playing" && phase !== "idle" ? phase : null;
  if (rt.graph.getAttribute("data-phase") !== active)
    dfDollar8(rt.graph).attr("data-phase", active);
  for (const node of dfDollar8(rt.graph).find(".envelope-stage, .envelope-phase").toArray()) {
    const on = (node.getAttribute("data-stage") ?? node.getAttribute("data-phase")) === active;
    if (node.hasAttribute("data-active") !== on)
      dfDollar8(node).attr("data-active", on ? "" : null);
  }
}
function showDot(el, x, y = 0) {
  const rt = runtimeOf4(el);
  const dot = dfDollar8(rt.plot).find(".envelope-dot").get(0);
  const head = dfDollar8(rt.plot).find(".envelope-playhead").get(0);
  for (const n of [dot, head]) {
    if (!n)
      continue;
    if (x === null) {
      if (!n.hidden)
        n.hidden = true;
      continue;
    }
    n.hidden = false;
    n.style.setProperty("--envelope-x", String(Math.round(clamp5(x, 0, 1) * 1e4) / 1e4));
    n.style.setProperty("--envelope-y", String(Math.round(clamp5(y, 0, 1) * 1e4) / 1e4));
  }
}
function boundOf3(el, sel) {
  const out = dfDollar8(el).find(sel).toArray();
  if (el.id)
    for (const bound of dfDollar8(`[data-envelope-for="${CSS.escape(el.id)}"]`).toArray()) {
      if (bound.matches(sel))
        out.push(bound);
      out.push(...dfDollar8(bound).find(sel).toArray());
    }
  return out;
}
function ownerOf(node) {
  const forId = node.closest("[data-envelope-for]")?.getAttribute("data-envelope-for");
  const el = forId ? dfDollar8(`#${CSS.escape(forId)}`).get(0) : node.closest(".envelope");
  return el?._envelope ? el : undefined;
}
function paramValue(rt, name) {
  if (rt.kind !== "filter")
    return rt.params[name];
  const [band, key] = name.split(".");
  const bands = rt.params.bands;
  const b = bands.find((x, i) => keyOf(x, i) === band);
  return b ? b[key] : undefined;
}
function paramPatch(rt, name, value) {
  if (rt.kind !== "filter")
    return name in rt.params || name === "delay" || name === "hold" ? { [name]: value } : null;
  const [band, key] = name.split(".");
  const bands = rt.params.bands;
  const i = bands.findIndex((x, j) => keyOf(x, j) === band);
  if (i < 0 || !key)
    return null;
  return { bands: bands.map((b, j) => j === i ? { ...b, [key]: value } : b) };
}
var fieldValue = (field) => field instanceof HTMLInputElement && field.type === "checkbox" ? field.checked : field.tagName === "SELECT" && Number.isNaN(Number(field.value)) ? field.value : Number(field.value);
var fieldOf = (ctl) => ctl.matches("input, select") ? ctl : dfDollar8(ctl).find("input, select").get(0) ?? null;
function syncControls(el, except) {
  const rt = runtimeOf4(el);
  rt.writing = true;
  try {
    for (const ctl of boundOf3(el, "[data-envelope-param]")) {
      if (ctl === except || except && ctl.contains(except))
        continue;
      const value = paramValue(rt, ctl.getAttribute("data-envelope-param") ?? "");
      if (value === undefined)
        continue;
      const field = fieldOf(ctl);
      if (!field)
        continue;
      if (field instanceof HTMLInputElement && field.type === "checkbox") {
        if (field.checked !== !!value) {
          field.checked = !!value;
          field.dispatchEvent(new Event("input", { bubbles: true }));
        }
        continue;
      }
      if (field.value === String(value))
        continue;
      const knob = ctl.closest(".knob");
      if (knob && df$8.knob)
        df$8.knob.value(knob, Number(value));
      else {
        field.value = String(value);
        field.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
  } finally {
    rt.writing = false;
  }
}
function writeOutputs(el) {
  const rt = runtimeOf4(el);
  const locale = textLocale3(el);
  for (const out of boundOf3(el, "[data-envelope-output]")) {
    const what = out.getAttribute("data-envelope-output");
    let text = "";
    if (what === "phase")
      text = STAGE_NAMES[rt.play?.phase ?? rt.live?.phase ?? ""] ?? (rt.status === "playing" ? "" : "");
    else if (what === "reduction")
      text = rt.live ? dbText(locale, -rt.live.gr) : dbText(locale, 0);
    else if (what === "value")
      text = rt.kind === "adsr" ? pctText(locale, rt.play?.value ?? 0) : rt.live?.input != null ? dbText(locale, rt.live.input - rt.live.gr + rt.params.makeup) : "";
    if (dfDollar8(out).text() !== text)
      dfDollar8(out).text(text);
  }
  for (const btn of boundOf3(el, '[data-envelope-action="gate"]')) {
    const on = String(!!rt.play && rt.play.gateOff === null);
    if (btn.getAttribute("aria-pressed") !== on)
      dfDollar8(btn).attr("aria-pressed", on);
  }
}
var sourceText = (json, authored) => json === authored.json ? authored.text : json;
function set(el, patch, handle, committed = !runtimeOf4(el).drag, from = null) {
  const rt = runtimeOf4(el);
  const next = paramsOf(rt.kind, { ...rt.params, ...patch }, rt.params);
  const changed = JSON.stringify(next) !== JSON.stringify(rt.params);
  rt.params = next;
  if (changed) {
    draw3(el);
    syncControls(el, from);
    for (const c of rt.chains)
      tune(el, c);
  }
  if (committed)
    writeSource(el);
  if (!changed && !committed)
    return;
  el.dispatchEvent(new CustomEvent("envelope-change", {
    bubbles: true,
    detail: { params: clone(rt.params), handle, committed }
  }));
}
function writeSource(el) {
  const rt = runtimeOf4(el);
  const script = dfDollar8(el).children("script.envelope-source");
  if (!script.length)
    return;
  const text = sourceText(JSON.stringify(rt.params), rt.authored);
  if (script.text() !== text)
    script.text(text);
}
function tick(el) {
  const rt = runtimeOf4(el);
  rt.frame = 0;
  const play = rt.play;
  if (!play || !el.isConnected)
    return;
  const p = rt.params;
  const t = (performance.now() - play.start) / 1000;
  if (play.gateLen !== null && play.gateOff === null && t >= play.gateLen)
    play.gateOff = play.gateLen;
  const { value, phase } = levelAt(p, t, play.gateOff, play.v0);
  play.value = value;
  if (phase === "idle") {
    finish(el);
    return;
  }
  const v = rt.view;
  const s0 = sustainStart(p);
  const x = play.gateOff !== null ? gateAt(p, v) + (t - play.gateOff) : t < s0 ? t : s0 + Math.min(t - s0, v.sustainWidth);
  showDot(el, x / v.T, value);
  if (phase !== play.phase) {
    play.phase = phase;
    showPhase(el, phase);
    told(el, "envelope-phase", { value, phase, time: t });
  }
  writeOutputs(el);
  told(el, "envelope-value", { value, phase, time: t });
  rt.frame = requestAnimationFrame(() => tick(el));
}
function told(el, type, detail) {
  if (type === "envelope-phase")
    el.dispatchEvent(new CustomEvent("envelope-phase", { bubbles: true, detail }));
  else
    el.dispatchEvent(new CustomEvent("envelope-value", { bubbles: true, detail }));
}
function noteOn(el, gate) {
  const rt = runtimeOf4(el);
  if (rt.kind !== "adsr" || rt.status === "disabled")
    return;
  const v0 = rt.play?.value ?? 0;
  rt.play = { start: performance.now(), gateOff: null, gateLen: gate, v0, phase: "", value: v0 };
  if (rt.status !== "playing") {
    rt.status = "playing";
    dfDollar8(el).attr("data-state-name", "playing");
  }
  if (!rt.frame)
    rt.frame = requestAnimationFrame(() => tick(el));
  writeOutputs(el);
}
function noteOff(el) {
  const rt = runtimeOf4(el);
  const play = rt.play;
  if (!play || play.gateOff !== null)
    return;
  play.gateOff = (performance.now() - play.start) / 1000;
  writeOutputs(el);
}
function finish(el) {
  const rt = runtimeOf4(el);
  if (rt.frame)
    cancelAnimationFrame(rt.frame);
  rt.frame = 0;
  const had = !!rt.play || !!rt.live || rt.mod.size > 0;
  rt.play = null;
  rt.live = null;
  dfDollar8(rt.graph).find(".envelope-meter").get(0)?.style.removeProperty("--envelope-reduction");
  if (rt.mod.size) {
    rt.mod.clear();
    draw3(el);
    for (const c of rt.chains)
      tune(el, c);
  }
  showDot(el, null);
  if (rt.status === "playing") {
    rt.status = "default";
    dfDollar8(el).attr("data-state-name", "default");
  }
  showPhase(el, "idle");
  writeOutputs(el);
  if (had)
    told(el, "envelope-phase", { value: 0, phase: "idle", time: 0 });
}
function feed(el, db, time, reduction) {
  const rt = runtimeOf4(el);
  const p = rt.params;
  const x = clamp5(db, -120, 24);
  const target = Math.max(0, x - staticCurve(p, x));
  const live = rt.live ?? { gr: 0, input: null, at: time, phase: "idle", quiet: 0 };
  const before = live.gr;
  if (reduction !== undefined)
    live.gr = Math.max(0, reduction);
  else {
    const dt = Math.max(0, time - live.at);
    const tau = target > live.gr ? p.attack : p.release;
    live.gr = target + (live.gr - target) * (tau > 0 ? Math.exp(-dt / tau) : 0);
  }
  live.input = x;
  live.at = time;
  const phase = live.gr > before + 0.001 ? "attack" : live.gr < before - 0.001 ? "release" : live.gr < 0.05 ? "idle" : live.phase === "idle" ? "attack" : live.phase;
  rt.live = live;
  if (rt.status !== "playing" && rt.status !== "disabled") {
    rt.status = "playing";
    dfDollar8(el).attr("data-state-name", "playing");
  }
  const v = rt.view;
  const output = x - live.gr + p.makeup;
  showDot(el, (x - v.floor) / -v.floor, (output - v.floor) / -v.floor);
  const meter = dfDollar8(rt.graph).find(".envelope-meter").get(0);
  meter?.style.setProperty("--envelope-reduction", String(Math.round(clamp5(live.gr / 24, 0, 1) * 1e4) / 1e4));
  if (phase !== live.phase) {
    live.phase = phase;
    showPhase(el, phase);
    told(el, "envelope-phase", { value: live.gr, phase, time, input: x, output });
  }
  writeOutputs(el);
  told(el, "envelope-value", { value: live.gr, phase, time, input: x, output });
  return live.gr;
}
function tune(el, c) {
  const rt = runtimeOf4(el);
  if (rt.kind === "dynamics") {
    const p = rt.params;
    if (!c.comp || !c.makeup)
      return;
    c.comp.threshold.value = p.threshold;
    c.comp.ratio.value = Math.min(20, p.ratio);
    c.comp.knee.value = Math.min(40, p.knee);
    c.comp.attack.value = p.attack;
    c.comp.release.value = Math.min(1, p.release);
    c.makeup.gain.value = 10 ** (p.makeup / 20);
    return;
  }
  const bands = rt.params.bands.map((b, i) => liveBand(rt, b, i)).filter((b) => b.on);
  const shapeKey = bands.map((b) => `${b.type}/${stages(b)}`).join(",");
  if (shapeKey !== c.shape) {
    c.input.disconnect();
    for (const n of c.nodes)
      n.disconnect();
    c.nodes = [];
    for (const b of bands)
      for (let i = 0;i < stages(b); i++) {
        const f = c.ctx.createBiquadFilter();
        f.type = b.type;
        c.nodes.push(f);
      }
    let prev = c.input;
    for (const n of c.nodes) {
      prev.connect(n);
      prev = n;
    }
    prev.connect(c.output);
    c.shape = shapeKey;
  }
  let k = 0;
  for (const b of bands)
    for (let i = 0;i < stages(b); i++) {
      const f = c.nodes[k++];
      f.frequency.value = b.frequency;
      f.Q.value = b.Q;
      f.gain.value = b.gain;
    }
}
function follow2(el, c) {
  c.frame = 0;
  const rt = runtimeOf4(el);
  if (!c.analyser || !c.comp || !rt.chains.includes(c) || !el.isConnected)
    return;
  if (c.ctx instanceof AudioContext && c.ctx.state === "running") {
    const data = new Float32Array(c.analyser.fftSize);
    c.analyser.getFloatTimeDomainData(data);
    let peak = 0;
    for (const s of data)
      peak = Math.max(peak, Math.abs(s));
    const db = peak > 0 ? 20 * Math.log10(peak) : -120;
    if (db > rt.view.floor)
      feed(el, db, c.ctx.currentTime, -c.comp.reduction);
    else if (rt.live && c.ctx.currentTime - rt.live.at > 0.3)
      finish(el);
  }
  c.frame = requestAnimationFrame(() => follow2(el, c));
}
function applyMarkup8(el, stateName, config = {}) {
  const disabled = stateName === "disabled" ? "true" : null;
  if (el.getAttribute("aria-disabled") !== disabled)
    dfDollar8(el).attr("aria-disabled", disabled);
  const script = dfDollar8(el).children("script.envelope-source");
  if (!config.params || !script.length)
    return;
  const rt = el._envelope;
  const kind = kindOf(el);
  let authoredRaw = null;
  const authoredText = rt?.authored.text ?? script.text();
  try {
    authoredRaw = JSON.parse(authoredText || "null");
  } catch {
    authoredRaw = null;
  }
  const authored = paramsOf(kind, authoredRaw);
  const json = JSON.stringify(paramsOf(kind, config.params, rt?.params ?? authored));
  const text = sourceText(json, { text: authoredText, json: JSON.stringify(authored) });
  if (script.text() !== text)
    script.text(text);
}
function triggerStateChange8(el, stateName, incoming) {
  const rt = runtimeOf4(el);
  if (!rt) {
    applyMarkup8(el, stateName, incoming);
    return;
  }
  const was = rt.status;
  if (incoming.params)
    set(el, incoming.params, null, true);
  applyMarkup8(el, stateName, { params: rt.params });
  if (stateName !== "editing" && rt.drag)
    endDrag2(el, false, false);
  rt.status = stateName;
  rt.editHandle = stateName === "editing" ? incoming.handle ?? rt.drag?.handle ?? rt.editHandle : null;
  if (stateName === "playing") {
    if (was !== "playing" && rt.kind === "adsr")
      noteOn(el, incoming.gate !== undefined && Number.isFinite(Number(incoming.gate)) ? Math.max(0, Number(incoming.gate)) : null);
  } else if (was === "playing")
    finish(el);
  rt.status = stateName;
  draw3(el);
  writeOutputs(el);
}
var envelopeApi = componentState8({
  component: "envelope",
  states: envelopeStates,
  mergeConfig: true,
  apply: (el, state, _previous, incoming) => triggerStateChange8(el, state.name, incoming),
  read: (el, state) => {
    const rt = runtimeOf4(el);
    if (!rt)
      return state;
    const c = state.config;
    const params = rt.params;
    const handle = rt.status === "editing" ? rt.drag?.handle ?? rt.editHandle ?? undefined : undefined;
    if (rt.status === state.name && JSON.stringify(c.params) === JSON.stringify(params) && c.handle === handle && c.gate === undefined)
      return state;
    const config = { params: clone(params) };
    if (handle)
      config.handle = handle;
    return { name: rt.status, config };
  },
  markup: (el, state) => applyMarkup8(el, state.name, state.config),
  events: ["envelope-change", "envelope-phase"]
});
df$8.envelopeApi = envelopeApi;
df$8.envelopeStates = envelopeStates;
function onPointerDown2(el, e) {
  const rt = runtimeOf4(el);
  const node = e.target.closest?.(".envelope-handle");
  if (!rt || !node || rt.status === "disabled" || e.button !== 0)
    return;
  e.preventDefault();
  node.focus({ preventScroll: true, focusVisible: false });
  const id = node.getAttribute("data-handle") ?? "";
  rt.pressed = { id, at: performance.now() };
  if (e.ctrlKey || e.metaKey) {
    resetHandle(el, id);
    return;
  }
  const h = handlesOf(el).find((x) => x.id === id);
  if (!h)
    return;
  rt.frozen = true;
  rt.drag = {
    id: e.pointerId,
    handle: id,
    x: e.clientX,
    y: e.clientY,
    fx: h.x,
    fy: h.y,
    start: JSON.stringify(rt.params)
  };
  try {
    rt.plot.setPointerCapture(e.pointerId);
  } catch {}
  if (rt.status !== "playing")
    el.api?.setState("editing", { handle: id });
  else
    drawHandles(el);
}
function onPointerMove2(el, e) {
  const rt = runtimeOf4(el);
  const d = rt?.drag;
  if (!d || e.pointerId !== d.id)
    return;
  const box = rt.plot.getBoundingClientRect();
  const f = e.shiftKey ? 0.1 : 1;
  d.fx += (e.clientX - d.x) / Math.max(1, box.width) * f;
  d.fy -= (e.clientY - d.y) / Math.max(1, box.height) * f;
  d.x = e.clientX;
  d.y = e.clientY;
  const h = handlesOf(el).find((x) => x.id === d.handle);
  h?.setX?.(Math.max(0, d.fx));
  handlesOf(el).find((x) => x.id === d.handle)?.setY?.(clamp5(d.fy, 0, 1));
}
function endDrag2(el, cancel, rest = true) {
  const rt = runtimeOf4(el);
  const d = rt.drag;
  if (!d)
    return;
  rt.drag = null;
  try {
    if (rt.plot.hasPointerCapture(d.id))
      rt.plot.releasePointerCapture(d.id);
  } catch {}
  rt.frozen = false;
  if (cancel)
    set(el, JSON.parse(d.start), d.handle, true);
  else
    set(el, {}, d.handle, true);
  draw3(el);
  if (rest && rt.status === "editing")
    el.api?.setState("default");
}
function resetHandle(el, id) {
  const rt = runtimeOf4(el);
  let authored;
  try {
    authored = paramsOf(rt.kind, JSON.parse(rt.authored.text || "null"));
  } catch {
    authored = paramsOf(rt.kind, null);
  }
  if (rt.kind === "filter") {
    const bands = rt.params.bands;
    const i = bands.findIndex((b, j) => keyOf(b, j) === id);
    const was = authored.bands.find((b, j) => keyOf(b, j) === id);
    if (i >= 0 && was)
      set(el, { bands: bands.map((b, j) => j === i ? was : b) }, id, true);
    return;
  }
  const a = authored;
  const keys = { decay: ["decay", "sustain"], threshold: ["threshold", "knee"] };
  const patch = {};
  for (const k of keys[id] ?? [id])
    if (a[k] !== undefined)
      patch[k] = a[k];
  set(el, patch, id, true);
}
function onKey3(el, e) {
  const rt = runtimeOf4(el);
  const node = e.target.closest?.(".envelope-handle");
  if (!rt || !node || rt.status === "disabled" || e.altKey || e.ctrlKey || e.metaKey)
    return;
  if (e.key === "Escape") {
    if (!rt.drag)
      return;
    e.preventDefault();
    endDrag2(el, true);
    return;
  }
  const id = node.getAttribute("data-handle") ?? "";
  const h = handlesOf(el).find((x) => x.id === id);
  if (!h)
    return;
  const fine = e.shiftKey;
  const run = {
    ArrowRight: h.keyX && (() => h.keyX(1, fine)),
    ArrowLeft: h.keyX && (() => h.keyX(-1, fine)),
    ArrowUp: h.keyY && (() => h.keyY(1, fine)),
    ArrowDown: h.keyY && (() => h.keyY(-1, fine)),
    PageUp: h.keyQ && (() => h.keyQ(1, fine)),
    PageDown: h.keyQ && (() => h.keyQ(-1, fine)),
    Delete: () => resetHandle(el, id),
    Backspace: () => resetHandle(el, id)
  };
  const fn = run[e.key];
  if (!fn)
    return;
  e.preventDefault();
  fn();
}
var GRAPH = `<div class="envelope-graph"><div class="envelope-plot"><svg class="envelope-svg" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path class="envelope-grid"></path><path class="envelope-grid-major"></path><path class="envelope-ref"></path><path class="envelope-fill"></path><path class="envelope-ghost"></path><path class="envelope-curve"></path>${STAGES.map((s) => `<path class="envelope-stage" data-stage="${s}"></path>`).join("")}</svg><div class="envelope-ticks" aria-hidden="true"></div><span class="envelope-playhead" hidden></span><span class="envelope-dot" hidden></span><div class="envelope-handles"></div></div><span class="envelope-meter" aria-hidden="true"></span><div class="envelope-phases" aria-hidden="true"></div></div>`;
function init8() {
  dfDollar8(".envelope:not([data-init])").toArray().forEach((el) => {
    el.dataset.init = "";
    const kind = kindOf(el);
    const script = dfDollar8(el).children("script.envelope-source");
    const text = script.length ? script.text() : "";
    let raw = null;
    try {
      raw = JSON.parse(text || "null");
    } catch {
      raw = null;
    }
    const params = paramsOf(kind, raw);
    const graph = dfDollar8(GRAPH).get(0);
    if (script.length)
      script.after(graph);
    else
      dfDollar8(el).prepend(graph);
    const desc = dfDollar8(`<span class="envelope-desc" id="envelope-desc-${++described2}" hidden></span>`).get(0);
    dfDollar8(graph).after(desc);
    if (!el.hasAttribute("role"))
      dfDollar8(el).attr("role", "group");
    const by = (el.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean);
    dfDollar8(el).attr("aria-describedby", [...by, desc.id].join(" "));
    const rt = {
      kind,
      params,
      authored: { text, json: JSON.stringify(params) },
      status: el.getAttribute("aria-disabled") === "true" ? "disabled" : "default",
      graph,
      plot: dfDollar8(graph).find(".envelope-plot").get(0),
      svg: dfDollar8(graph).find("svg").get(0),
      view: viewOf(el, params, kind),
      frozen: false,
      drag: null,
      play: null,
      live: null,
      mod: new Map,
      chains: [],
      frame: 0,
      writing: false,
      desc,
      editHandle: null,
      pressed: null
    };
    el._envelope = rt;
    draw3(el);
    syncControls(el);
    writeOutputs(el);
    bindComponent8(el, envelopeApi, { name: rt.status, config: { params: clone(params) } });
    dfDollar8(rt.plot).on("pointerdown", (e) => onPointerDown2(el, e));
    dfDollar8(rt.plot).on("pointermove", (e) => onPointerMove2(el, e));
    dfDollar8(rt.plot).on("pointerup", () => endDrag2(el, false));
    dfDollar8(rt.plot).on("pointercancel", () => endDrag2(el, false));
    dfDollar8(rt.plot).on("lostpointercapture", () => endDrag2(el, false));
    dfDollar8(rt.plot).on("dblclick", (e) => {
      const node = e.target.closest?.(".envelope-handle");
      const id = node?.getAttribute("data-handle") ?? (rt.pressed && performance.now() - rt.pressed.at < 800 ? rt.pressed.id : null);
      if (id && rt.status !== "disabled")
        resetHandle(el, id);
    });
    dfDollar8(rt.plot).on("keydown", (e) => onKey3(el, e));
    dfDollar8(rt.plot).on("wheel", (e) => {
      const node = e.target.closest?.(".envelope-handle");
      if (!node || rt.status === "disabled" || rt.kind !== "filter")
        return;
      const h = handlesOf(el).find((x) => x.id === node.getAttribute("data-handle"));
      if (!h?.keyQ)
        return;
      e.preventDefault();
      h.keyQ(e.deltaY < 0 ? 1 : -1, e.shiftKey);
    });
    new MutationObserver(() => draw3(el)).observe(el, {
      attributes: true,
      attributeFilter: ["data-range", "data-length", "data-readonly", "lang"]
    });
  });
}
if (!document.__envelopeInit) {
  document.__envelopeInit = true;
  document.addEventListener("input", (e) => {
    const node = e.target;
    const ctl = node.closest?.("[data-envelope-param]");
    if (!ctl)
      return;
    const el = ownerOf(ctl);
    const rt = el && runtimeOf4(el);
    if (!el || !rt || rt.writing || rt.status === "disabled")
      return;
    const field = fieldOf(ctl);
    if (!field)
      return;
    const name = ctl.getAttribute("data-envelope-param") ?? "";
    const patch = paramPatch(rt, name, fieldValue(field));
    if (patch)
      set(el, patch, name, true, ctl);
  });
  const action = (e) => {
    const btn = e.target.closest?.("[data-envelope-action]");
    const el = btn && ownerOf(btn);
    return btn && el ? { el, btn, name: btn.getAttribute("data-envelope-action") ?? "" } : null;
  };
  document.addEventListener("pointerdown", (e) => {
    const a = action(e);
    if (!a || a.name !== "gate" || e.button !== 0)
      return;
    e.preventDefault();
    a.btn.focus?.({ preventScroll: true, focusVisible: false });
    noteOn(a.el, null);
    const up = () => {
      noteOff(a.el);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("pointercancel", up);
    };
    document.addEventListener("pointerup", up);
    document.addEventListener("pointercancel", up);
  });
  document.addEventListener("keydown", (e) => {
    const a = action(e);
    if (!a || a.name !== "gate" || e.key !== " " && e.key !== "Enter")
      return;
    e.preventDefault();
    if (!e.repeat)
      noteOn(a.el, null);
  });
  document.addEventListener("keyup", (e) => {
    const a = action(e);
    if (!a || a.name !== "gate" || e.key !== " " && e.key !== "Enter")
      return;
    e.preventDefault();
    noteOff(a.el);
  });
  document.addEventListener("reset", (e) => {
    const form = e.target;
    setTimeout(() => {
      const reads = dfDollar8(form).find("[data-envelope-param]").toArray().map((ctl) => {
        const field = fieldOf(ctl);
        return {
          el: ownerOf(ctl),
          name: ctl.getAttribute("data-envelope-param") ?? "",
          value: field && fieldValue(field)
        };
      });
      for (const { el, name, value } of reads) {
        if (!el || value === null)
          continue;
        const patch = paramPatch(runtimeOf4(el), name, value);
        if (patch)
          set(el, patch, name, true);
      }
    });
  });
  document.addEventListener("click", (e) => {
    const a = action(e);
    if (!a)
      return;
    const rt = runtimeOf4(a.el);
    if (a.name === "trigger") {
      const gate = num4(a.btn.getAttribute("data-value"), NaN);
      noteOn(a.el, Number.isFinite(gate) ? gate : sustainStart(rt.params) + 0.25);
    } else if (a.name === "stop")
      finish(a.el);
    else if (a.name === "reset")
      set(a.el, JSON.parse(rt.authored.json), null, true);
  });
}
var resolve8 = (target) => {
  const el = typeof target === "string" ? dfDollar8(target).get(0) : target;
  const env = el?.closest?.(".envelope");
  return env?._envelope ? env : undefined;
};
df$8.envelope = {
  params: (target, params) => {
    const el = resolve8(target);
    if (!el)
      return null;
    if (params)
      set(el, params, null, true);
    return clone(runtimeOf4(el).params);
  },
  noteOn: (target) => {
    const el = resolve8(target);
    if (el)
      noteOn(el, null);
  },
  noteOff: (target) => {
    const el = resolve8(target);
    if (el)
      noteOff(el);
  },
  trigger: (target, gate) => {
    const el = resolve8(target);
    if (!el)
      return;
    const p = runtimeOf4(el).params;
    noteOn(el, gate !== undefined && Number.isFinite(gate) ? Math.max(0, gate) : sustainStart(p) + 0.25);
  },
  stop: (target) => {
    const el = resolve8(target);
    if (el)
      finish(el);
  },
  valueAt: (target, time, gate) => {
    const el = resolve8(target);
    if (!el || runtimeOf4(el).kind !== "adsr")
      return { value: 0, phase: "idle" };
    return levelAt(runtimeOf4(el).params, time, gate ?? null);
  },
  schedule: (target, param, options = {}) => {
    const el = resolve8(target);
    if (!el || runtimeOf4(el).kind !== "adsr" || !param)
      return NaN;
    const p = runtimeOf4(el).params;
    const start = num4(options.start, 0);
    const gate = Math.max(0, num4(options.gate, sustainStart(p) + 0.25));
    const min = num4(options.min, 0);
    const max = num4(options.max, 1);
    const map = (v) => options.scale === "exponential" && min > 0 && max > 0 ? min * (max / min) ** v : min + (max - min) * v;
    const write = (from, length) => {
      if (length <= 0)
        return;
      const n = Math.max(2, Math.ceil(length * 200));
      const curve = new Float32Array(n);
      for (let i = 0;i < n; i++)
        curve[i] = map(levelAt(p, from + length * i / (n - 1), gate).value);
      param.setValueCurveAtTime(curve, start + from, length);
    };
    param.cancelScheduledValues(start);
    param.setValueAtTime(map(0), start);
    write(0, gate);
    write(gate, p.release);
    param.setValueAtTime(map(0), start + gate + p.release);
    return start + gate + p.release;
  },
  input: (target, level, time) => {
    const el = resolve8(target);
    if (!el || runtimeOf4(el).kind !== "dynamics")
      return 0;
    if (level === null || !Number.isFinite(Number(level))) {
      finish(el);
      return 0;
    }
    if (runtimeOf4(el).status === "disabled")
      return 0;
    return feed(el, Number(level), time !== undefined && Number.isFinite(time) ? time : performance.now() / 1000);
  },
  transfer: (target, level) => {
    const el = resolve8(target);
    if (!el || runtimeOf4(el).kind !== "dynamics")
      return NaN;
    const p = runtimeOf4(el).params;
    return staticCurve(p, level) + p.makeup;
  },
  modulate: (target, values) => {
    const el = resolve8(target);
    if (!el)
      return;
    const rt = runtimeOf4(el);
    if (rt.kind !== "filter" || rt.status === "disabled")
      return;
    if (values === null)
      rt.mod.clear();
    else
      for (const [key, v] of Object.entries(values ?? {})) {
        if (!v)
          rt.mod.delete(key);
        else {
          const m = {};
          for (const k of ["frequency", "gain", "Q"])
            if (Number.isFinite(Number(v[k])))
              m[k] = Number(v[k]);
          rt.mod.set(key, m);
        }
      }
    if (!rt.mod.size) {
      draw3(el);
      for (const c of rt.chains)
        tune(el, c);
      finish(el);
      return;
    }
    if (rt.status !== "playing") {
      rt.status = "playing";
      dfDollar8(el).attr("data-state-name", "playing");
    }
    draw3(el);
    for (const c of rt.chains)
      tune(el, c);
  },
  response: (target, frequencies) => {
    const el = resolve8(target);
    if (!el || runtimeOf4(el).kind !== "filter")
      return [];
    const rt = runtimeOf4(el);
    const at = Float32Array.from(frequencies ?? []);
    const total = Array.from({ length: at.length }, () => 0);
    rt.params.bands.forEach((b, i) => {
      const live = liveBand(rt, b, i);
      if (!live.on)
        return;
      const db = bandDb(live, at);
      for (let j = 0;j < at.length; j++)
        total[j] += db[j];
    });
    return total.map((v) => Math.round(v * 1000) / 1000);
  },
  connect: (target, context) => {
    const el = resolve8(target);
    if (!el || !context)
      return null;
    const rt = runtimeOf4(el);
    if (rt.kind === "adsr")
      return null;
    const c = {
      ctx: context,
      input: context.createGain(),
      output: context.createGain(),
      nodes: [],
      shape: "",
      comp: null,
      analyser: null,
      makeup: null,
      frame: 0
    };
    if (rt.kind === "dynamics") {
      c.analyser = context.createAnalyser();
      c.analyser.fftSize = 1024;
      c.comp = context.createDynamicsCompressor();
      c.makeup = context.createGain();
      c.input.connect(c.analyser);
      c.analyser.connect(c.comp);
      c.comp.connect(c.makeup);
      c.makeup.connect(c.output);
      c.nodes = [c.analyser, c.comp, c.makeup];
    }
    rt.chains.push(c);
    tune(el, c);
    if (c.comp)
      c.frame = requestAnimationFrame(() => follow2(el, c));
    return {
      input: c.input,
      output: c.output,
      compressor: c.comp,
      disconnect: () => {
        rt.chains = rt.chains.filter((x) => x !== c);
        if (c.frame)
          cancelAnimationFrame(c.frame);
        c.input.disconnect();
        for (const n of c.nodes)
          n.disconnect();
        c.output.disconnect();
      }
    };
  }
};
init8();
new MutationObserver(init8).observe(document, { childList: true, subtree: true });

// dist/components/tacho/tacho.js
var __df$core9 = globalThis.df$;
var __df$shared9 = __df$core9 && __df$core9.shadcn && __df$core9.shadcn.shared;
if (!__df$shared9 || __df$shared9.abi !== "0.9.10") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals9, defussQuery: defussQuery9, componentState: componentState9, bindComponent: bindComponent9, textLocale: textLocale4 } = __df$shared9;
var df$9 = defussGlobals9();
var dfDollar9 = defussQuery9();
var tachoStates = ["default", "idle"];
var NAMES = {
  sharp: ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"],
  flat: ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"]
};
var NEEDLES = { spring: [220, 18], smooth: [220, 2 * Math.sqrt(220)] };
var STOP = 0.025;
var BOUNCE = 0.35;
var R = 100;
var MAJOR = 12;
var MINOR = 6;
var LABEL = 13;
var clamp6 = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
var num5 = (v, fallback) => {
  const n = typeof v === "number" ? v : v === null || v === undefined || v === "" ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
};
var esc7 = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
var r2 = (v) => String(Math.round(v * 100) / 100);
var runtimeOf5 = (el) => el._tacho;
var meterOf = (el) => dfDollar9(el).children("meter.tacho-meter").get(0) ?? undefined;
function rangeOf2(meter) {
  const min = num5(meter.getAttribute("min"), 0);
  const max = Math.max(min, num5(meter.getAttribute("max"), 1));
  const low = clamp6(num5(meter.getAttribute("low"), min), min, max);
  const high = clamp6(num5(meter.getAttribute("high"), max), low, max);
  const optimum = clamp6(num5(meter.getAttribute("optimum"), (min + max) / 2), min, max);
  const value = clamp6(num5(meter.getAttribute("value"), 0), min, max);
  const zoned = meter.hasAttribute("low") || meter.hasAttribute("high");
  return { min, max, low, high, optimum, value, zoned };
}
function regionsOf(r) {
  const at = r.optimum < r.low ? 0 : r.optimum > r.high ? 2 : 1;
  const zone = (i) => i === at ? "optimum" : Math.abs(i - at) === 1 ? "suboptimum" : "even-less-good";
  return [
    { from: r.min, to: r.low, zone: zone(0) },
    { from: r.low, to: r.high, zone: zone(1) },
    { from: r.high, to: r.max, zone: zone(2) }
  ];
}
function zoneOf(r, v) {
  if (!r.zoned)
    return null;
  const regions = regionsOf(r);
  return (v < r.low ? regions[0] : v > r.high ? regions[2] : regions[1]).zone;
}
var sweepOf = (el) => clamp6(num5(el.getAttribute("data-sweep"), 120), 30, 300);
var fractionOf = (r, v) => r.max > r.min ? (clamp6(v, r.min, r.max) - r.min) / (r.max - r.min) : 0.5;
var restOf = (el, r) => clamp6(num5(el.getAttribute("data-rest"), r.zoned ? r.optimum : (r.min + r.max) / 2), r.min, r.max);
function niceStep(span) {
  const raw = span / 10;
  const p = 10 ** Math.floor(Math.log10(raw));
  return ([1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= raw) ?? raw) || 1;
}
var autoDecimals2 = (c) => {
  const span = Math.abs(c.max - c.min);
  return Number.isInteger(c.min) && Number.isInteger(c.max) && span >= 10 ? 0 : span >= 1 ? 1 : 2;
};
var digitsOf = (c) => c.decimals !== null ? [c.decimals, c.decimals] : c.tick ? [0, 3] : [autoDecimals2(c), autoDecimals2(c)];
var fixed2 = (locale, [lo, hi], sign = false) => new Intl.NumberFormat(locale, {
  minimumFractionDigits: lo,
  maximumFractionDigits: hi,
  signDisplay: sign ? "exceptZero" : "auto"
});
var withUnit2 = (text, c) => c.unit && !c.tick ? `${text} ${c.unit}` : text;
var FORMATS2 = {
  number: (v, c) => withUnit2(fixed2(c.locale, digitsOf(c)).format(v), c),
  signed: (v, c) => withUnit2(fixed2(c.locale, digitsOf(c), true).format(v), c),
  pan: (v, c) => {
    const n = fixed2(c.locale, c.decimals === null ? [0, c.tick ? 3 : 0] : [c.decimals, c.decimals]).format(Math.abs(v));
    return Number(n.replace(/\D/g, "")) === 0 ? "C" : `${v < 0 ? "L" : "R"}${n}`;
  }
};
function formatted(el, meter, v, tick) {
  const r = rangeOf2(meter);
  const d = el.getAttribute("data-decimals");
  const context = {
    unit: el.getAttribute("data-unit") ?? "",
    decimals: tick || d === null || d === "" || !Number.isFinite(Number(d)) ? null : Math.max(0, Math.min(6, Math.round(Number(d)))),
    locale: textLocale4(el),
    min: r.min,
    max: r.max,
    tick
  };
  const format = FORMATS2[el.getAttribute("data-format") ?? "number"] ?? FORMATS2.number;
  try {
    return String(format(v, context));
  } catch {
    return FORMATS2.number(v, context);
  }
}
var pointAt = (deg, radius) => {
  const a = deg * Math.PI / 180;
  return [radius * Math.sin(a), -radius * Math.cos(a)];
};
function arc(from, to, radius) {
  if (to - from < 0.000001)
    return "";
  const [x1, y1] = pointAt(from, radius);
  const [x2, y2] = pointAt(to, radius);
  return `M${r2(x1)} ${r2(y1)}A${radius} ${radius} 0 ${to - from > 180 ? 1 : 0} 1 ${r2(x2)} ${r2(y2)}`;
}
function ticksOf2(el, r) {
  const span = r.max - r.min;
  if (span <= 0)
    return [];
  const major = num5(el.getAttribute("data-ticks"), niceStep(span));
  if (major <= 0 || span / major > 100)
    return [];
  const minors = clamp6(Math.round(num5(el.getAttribute("data-minor"), 1)), 0, 9);
  const step = major / (minors + 1);
  const out = [];
  const first = Math.ceil((r.min - 0.000000001) / step);
  for (let i = first;i * step <= r.max + 0.000000001; i++) {
    const value = Number((i * step).toPrecision(12));
    const k = value / major;
    out.push({ value, major: Math.abs(k - Math.round(k)) < 0.000001 });
  }
  return out;
}
function labelled(el, r, value) {
  const mode = el.getAttribute("data-labels");
  if (mode === "none")
    return false;
  if (mode === "ends")
    return Math.abs(value - r.min) < 0.000000001 || Math.abs(value - r.max) < 0.000000001;
  const step = Number(mode);
  if (mode && Number.isFinite(step) && step > 0) {
    const k = value / step;
    return Math.abs(k - Math.round(k)) < 0.000001;
  }
  return true;
}
function dialMarkup(el, meter) {
  const r = rangeOf2(meter);
  const sweep = sweepOf(el);
  const angle = (v) => -sweep / 2 + fractionOf(r, v) * sweep;
  let [x0, y0, x1, y1] = [-16, -16, 16, 22];
  for (let d = -sweep / 2;d <= sweep / 2 + 0.000000001; d += sweep / 60) {
    const [x, y] = pointAt(d, R + LABEL + 9);
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  for (const d of [-90, 0, 90, 180]) {
    if (Math.abs(d) > sweep / 2)
      continue;
    const [x, y] = pointAt(d, R + LABEL + 9);
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  const box = `${r2(x0)} ${r2(y0)} ${r2(x1 - x0)} ${r2(y1 - y0)}`;
  let parts = `<path class="tacho-track" d="${arc(-sweep / 2, sweep / 2, R)}"></path>`;
  if (r.zoned)
    for (const z of regionsOf(r)) {
      const d = arc(angle(z.from), angle(z.to), R - 3.5);
      if (d)
        parts += `<path class="tacho-zone" data-zone="${z.zone}" d="${d}"></path>`;
    }
  let majors = "";
  let minors = "";
  let labels = "";
  for (const t of ticksOf2(el, r)) {
    const a = angle(t.value);
    const [xa, ya] = pointAt(a, R);
    const [xb, yb] = pointAt(a, R - (t.major ? MAJOR : MINOR));
    const d = `M${r2(xa)} ${r2(ya)}L${r2(xb)} ${r2(yb)}`;
    if (t.major)
      majors += d;
    else
      minors += d;
    if (t.major && labelled(el, r, t.value)) {
      const [x, y] = pointAt(a, R + LABEL);
      labels += `<text class="tacho-tick-label" x="${r2(x)}" y="${r2(y)}">${esc7(formatted(el, meter, t.value, true))}</text>`;
    }
  }
  parts += `<path class="tacho-tick" d="${minors}"></path><path class="tacho-tick" data-major="" d="${majors}"></path>${labels}`;
  parts += `<g class="tacho-needle" transform="rotate(${r2(angle(restOf(el, r)))})"><path class="tacho-needle-blade" d="M-2.4 0L-0.6 ${-(R - 4)}L0.6 ${-(R - 4)}L2.4 0L1.6 14L-1.6 14Z"></path></g>`;
  parts += `<circle class="tacho-pivot" r="7"></circle><circle class="tacho-pivot-cap" r="2.5"></circle>`;
  return `<svg class="tacho-dial" viewBox="${box}" aria-hidden="true" focusable="false">${parts}</svg>`;
}
function redraw2(el) {
  const rt = runtimeOf5(el);
  const svg = dfDollar9(dialMarkup(el, rt.meter)).get(0);
  dfDollar9(rt.dial).replaceWith(svg);
  rt.dial = svg;
  rt.needle = dfDollar9(svg).find(".tacho-needle").get(0);
  point(el);
  writeAngle(el);
}
function writeAngle(el) {
  const rt = runtimeOf5(el);
  const sweep = sweepOf(el);
  const t = `rotate(${r2(-sweep / 2 + rt.p * sweep)})`;
  if (rt.needle.getAttribute("transform") !== t)
    dfDollar9(rt.needle).attr("transform", t);
}
var reduced3 = () => globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
function point(el) {
  const rt = runtimeOf5(el);
  const r = rangeOf2(rt.meter);
  rt.target = fractionOf(r, rt.status === "idle" ? restOf(el, r) : r.value);
  const mode = el.getAttribute("data-needle") ?? "spring";
  if (mode === "instant" || !NEEDLES[mode] || reduced3()) {
    rt.p = rt.target;
    rt.v = 0;
    writeAngle(el);
    settle2(rt);
    return;
  }
  if (!rt.frame) {
    rt.last = performance.now();
    rt.frame = requestAnimationFrame((now) => tick2(el, now));
  }
}
function tick2(el, now) {
  const rt = runtimeOf5(el);
  rt.frame = 0;
  if (!el.isConnected)
    return;
  const [k, c] = NEEDLES[el.getAttribute("data-needle") ?? "spring"] ?? NEEDLES.spring;
  let dt = Math.min(0.05, Math.max(0, (now - rt.last) / 1000));
  rt.last = now;
  while (dt > 0) {
    const h = Math.min(dt, 1 / 240);
    rt.v += (-k * (rt.p - rt.target) - c * rt.v) * h;
    rt.p += rt.v * h;
    if (rt.p < -STOP || rt.p > 1 + STOP) {
      rt.p = clamp6(rt.p, -STOP, 1 + STOP);
      rt.v = -rt.v * BOUNCE;
    }
    dt -= h;
  }
  if (Math.abs(rt.p - rt.target) < 0.0002 && Math.abs(rt.v) < 0.002) {
    rt.p = rt.target;
    rt.v = 0;
    writeAngle(el);
    settle2(rt);
    return;
  }
  writeAngle(el);
  rt.frame = requestAnimationFrame((t) => tick2(el, t));
}
function settle2(rt) {
  const waiting = rt.waiting;
  rt.waiting = [];
  for (const done of waiting)
    done();
}
var textOf2 = (el, sel) => dfDollar9(el).children(sel).text();
function applyMarkup9(el, stateName, config) {
  const meter = meterOf(el);
  if (!meter)
    return;
  if (config.value !== undefined && Number.isFinite(Number(config.value))) {
    const r = rangeOf2(meter);
    const v = String(Number(clamp6(Number(config.value), r.min, r.max).toPrecision(12)));
    if (meter.getAttribute("value") !== v)
      dfDollar9(meter).attr("value", v);
  }
  const r = rangeOf2(meter);
  const write = (sel, text) => {
    const node = dfDollar9(el).children(sel);
    if (node.length && text !== undefined && node.text() !== text)
      node.text(text);
  };
  write(".tacho-label", config.label);
  const text = typeof config.text === "string" ? config.text : formatted(el, meter, r.value, false);
  write(".tacho-value", text);
  write(".tacho-caption", config.caption);
  const label = config.label ?? textOf2(el, ".tacho-label");
  const caption = config.caption ?? textOf2(el, ".tacho-caption");
  const spoken = typeof config.text === "string" ? [label, text, caption].filter(Boolean).join(", ") : text;
  if (meter.getAttribute("aria-valuetext") !== spoken)
    dfDollar9(meter).attr("aria-valuetext", spoken || null);
  const zone = zoneOf(r, r.value);
  if (el.getAttribute("data-zone") !== zone)
    dfDollar9(el).attr("data-zone", zone);
  const idle = stateName === "idle" ? "" : null;
  if (el.getAttribute("data-idle") !== idle)
    dfDollar9(el).attr("data-idle", idle);
}
function configOf3(el) {
  const rt = runtimeOf5(el);
  return {
    value: rangeOf2(rt.meter).value,
    label: textOf2(el, ".tacho-label"),
    text: rt.text,
    caption: textOf2(el, ".tacho-caption")
  };
}
function show2(el, stateName, incoming) {
  const rt = runtimeOf5(el);
  if ("text" in incoming)
    rt.text = typeof incoming.text === "string" ? incoming.text : null;
  const before = JSON.stringify(configOf3(el)) + rt.status;
  rt.status = stateName;
  applyMarkup9(el, stateName, { ...configOf3(el), ...incoming, text: rt.text });
  point(el);
  const now = configOf3(el);
  if (JSON.stringify(now) + rt.status === before)
    return;
  el.dispatchEvent(new CustomEvent("tacho-change", {
    bubbles: true,
    detail: {
      value: now.value,
      zone: el.getAttribute("data-zone"),
      label: now.label,
      text: textOf2(el, ".tacho-value"),
      caption: now.caption
    }
  }));
}
function triggerStateChange9(el, stateName, config, incoming) {
  if (!runtimeOf5(el))
    applyMarkup9(el, stateName, config);
  else
    show2(el, stateName, incoming);
  return;
}
var tachoApi = componentState9({
  component: "tacho",
  states: tachoStates,
  mergeConfig: true,
  apply: (el, state, _previous, incoming) => triggerStateChange9(el, state.name, state.config, incoming),
  read: (el, state) => {
    const rt = runtimeOf5(el);
    if (!rt)
      return state;
    const c = state.config;
    const now = configOf3(el);
    if (rt.status === state.name && c.value === now.value && c.label === now.label && c.text === now.text && c.caption === now.caption)
      return state;
    return { name: rt.status, config: now };
  },
  markup: (el, state) => applyMarkup9(el, state.name, state.config),
  events: ["tacho-change"]
});
df$9.tachoApi = tachoApi;
df$9.tachoStates = tachoStates;
function midiOf(name) {
  const m = /^\s*([A-Ga-g])([#♯b♭]?)(-?\d+)\s*$/.exec(name);
  if (!m)
    return null;
  const base = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[m[1].toLowerCase()];
  const shift = m[2] === "#" || m[2] === "♯" ? 1 : m[2] === "b" || m[2] === "♭" ? -1 : 0;
  return base + shift + (Number(m[3]) + 1) * 12;
}
function pitchOf(hz, options = {}) {
  const a4 = num5(options.a4, 440) > 0 ? num5(options.a4, 440) : 440;
  const exact = 69 + 12 * Math.log2(hz / a4);
  const strings = (options.strings ?? []).map(midiOf).filter((n) => n !== null);
  const midi = strings.length ? strings.reduce((a, b) => Math.abs(b - exact) < Math.abs(a - exact) ? b : a) : Math.round(exact);
  const names = options.notation === "flat" ? NAMES.flat : NAMES.sharp;
  return {
    note: names[(midi % 12 + 12) % 12],
    octave: Math.floor(midi / 12) - 1,
    cents: Math.round((exact - midi) * 1000) / 10,
    target: Math.round(a4 * 2 ** ((midi - 69) / 12) * 100) / 100
  };
}
function detectPitch(x, sampleRate) {
  const n = x.length;
  let power = 0;
  for (let i = 0;i < n; i++)
    power += x[i] * x[i];
  if (n < 64 || Math.sqrt(power / n) < 0.01)
    return null;
  const minLag = Math.max(2, Math.floor(sampleRate / 2000));
  const maxLag = Math.min(n >> 1, Math.ceil(sampleRate / 50));
  const w = n - maxLag - 1;
  const nsdf = new Float32Array(maxLag + 2);
  for (let tau = 0;tau <= maxLag + 1; tau++) {
    let acf = 0;
    let m = 0;
    for (let i = 0;i < w; i++) {
      const a = x[i];
      const b = x[i + tau];
      acf += a * b;
      m += a * a + b * b;
    }
    nsdf[tau] = m > 0 ? 2 * acf / m : 0;
  }
  const maxima = [];
  let t = 1;
  while (t <= maxLag && nsdf[t] > 0)
    t++;
  while (t <= maxLag) {
    while (t <= maxLag && nsdf[t] <= 0)
      t++;
    let at = -1;
    while (t <= maxLag && nsdf[t] > 0) {
      if (at < 0 || nsdf[t] > nsdf[at])
        at = t;
      t++;
    }
    if (at > 0)
      maxima.push(at);
  }
  if (!maxima.length)
    return null;
  const highest = Math.max(...maxima.map((i) => nsdf[i]));
  const best = maxima.find((i) => i >= minLag && nsdf[i] >= 0.9 * highest);
  if (best === undefined)
    return null;
  const a = nsdf[best - 1];
  const b = nsdf[best];
  const c = nsdf[best + 1];
  const d = a - 2 * b + c;
  const shift = d ? 0.5 * (a - c) / d : 0;
  return { frequency: sampleRate / (best + shift), clarity: Math.min(1, b - 0.25 * (a - c) * shift) };
}
function tuneTo(el, hz, options = {}) {
  if (hz === null || !Number.isFinite(Number(hz)) || Number(hz) <= 0) {
    if (runtimeOf5(el).status !== "idle")
      el.api?.setState("idle");
    return null;
  }
  const p = pitchOf(Number(hz), options);
  const locale = textLocale4(el);
  const cents = new Intl.NumberFormat(locale, { maximumFractionDigits: 0, signDisplay: "exceptZero" }).format(p.cents);
  el.api?.setState("default", {
    value: p.cents,
    label: p.note,
    text: `${new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Number(hz))} Hz`,
    caption: `${p.note}${p.octave} · ${cents} ct`
  });
  return p;
}
function listenFrame(el) {
  const rt = runtimeOf5(el);
  const l = rt.listen;
  if (!l || !el.isConnected)
    return;
  l.frame = 0;
  const ctx = l.node.context;
  if (!(ctx instanceof AudioContext) || ctx.state === "running") {
    const data = new Float32Array(l.node.fftSize);
    l.node.getFloatTimeDomainData(data);
    const found = detectPitch(data, ctx.sampleRate);
    if (found && found.clarity >= 0.85) {
      l.quiet = 0;
      tuneTo(el, found.frequency, l.options);
    } else if (++l.quiet > 12 && rt.status !== "idle")
      tuneTo(el, null);
  }
  l.frame = requestAnimationFrame(() => listenFrame(el));
}
function init9() {
  dfDollar9(".tacho:not([data-init])").toArray().forEach((el) => {
    el.dataset.init = "";
    const meter = meterOf(el);
    if (!meter)
      return;
    const dial = dfDollar9(dialMarkup(el, meter)).get(0);
    dfDollar9(meter).before(dial);
    const authored = textOf2(el, ".tacho-value").trim();
    const r = rangeOf2(meter);
    const rt = {
      meter,
      dial,
      needle: dfDollar9(dial).find(".tacho-needle").get(0),
      status: el.hasAttribute("data-idle") ? "idle" : "default",
      text: authored && authored !== formatted(el, meter, r.value, false) ? authored : null,
      p: fractionOf(r, restOf(el, r)),
      v: 0,
      target: 0,
      frame: 0,
      last: 0,
      waiting: [],
      listen: null
    };
    el._tacho = rt;
    applyMarkup9(el, rt.status, configOf3(el));
    point(el);
    bindComponent9(el, tachoApi, { name: rt.status, config: configOf3(el) });
    new MutationObserver((records) => {
      const scale = records.some((m) => m.attributeName !== "value" && m.attributeName !== "aria-valuetext");
      if (scale)
        redraw2(el);
      if (records.some((m) => m.attributeName === "value"))
        show2(el, rt.status, {});
      else if (scale)
        applyMarkup9(el, rt.status, configOf3(el));
    }).observe(meter, { attributes: true, attributeFilter: ["value", "min", "max", "low", "high", "optimum"] });
    new MutationObserver(() => {
      redraw2(el);
      applyMarkup9(el, rt.status, configOf3(el));
    }).observe(el, {
      attributes: true,
      attributeFilter: [
        "data-sweep",
        "data-ticks",
        "data-minor",
        "data-labels",
        "data-format",
        "data-unit",
        "data-decimals",
        "data-rest",
        "lang"
      ]
    });
  });
}
if (!document.__tachoInit) {
  document.__tachoInit = true;
  document.addEventListener("input", (e) => {
    const node = e.target.closest?.("[data-tacho-for]");
    const field = e.target;
    if (!node || !(field instanceof HTMLInputElement))
      return;
    const el = dfDollar9(`#${CSS.escape(node.getAttribute("data-tacho-for") ?? "")}`).get(0);
    if (!el?._tacho || !Number.isFinite(field.valueAsNumber))
      return;
    el.api?.setState("default", { value: field.valueAsNumber });
  });
}
var resolve9 = (target) => {
  const el = typeof target === "string" ? dfDollar9(target).get(0) : target;
  const tacho = el?.closest?.(".tacho");
  return tacho?._tacho ? tacho : undefined;
};
df$9.tacho = {
  value: (target, value) => {
    const el = resolve9(target);
    if (!el)
      return NaN;
    if (value !== undefined && Number.isFinite(value))
      el.api?.setState("default", { value });
    return rangeOf2(runtimeOf5(el).meter).value;
  },
  tune: (target, frequency, options) => {
    const el = resolve9(target);
    return el ? tuneTo(el, frequency, options) : null;
  },
  listen: (target, source, options = {}) => {
    const el = resolve9(target);
    if (!el)
      return null;
    const rt = runtimeOf5(el);
    if (rt.listen) {
      if (rt.listen.frame)
        cancelAnimationFrame(rt.listen.frame);
      try {
        rt.listen.source.disconnect(rt.listen.node);
      } catch {}
      rt.listen = null;
    }
    if (!source) {
      tuneTo(el, null);
      return null;
    }
    const node = source.context.createAnalyser();
    node.fftSize = 4096;
    source.connect(node);
    rt.listen = { node, source, frame: 0, quiet: 0, options };
    rt.listen.frame = requestAnimationFrame(() => listenFrame(el));
    return node;
  },
  pitch: (frequency, options) => pitchOf(frequency, options),
  detect: (samples, sampleRate) => detectPitch(samples, sampleRate),
  settled: (target) => {
    const el = resolve9(target);
    if (!el || !runtimeOf5(el).frame)
      return Promise.resolve();
    return new Promise((done) => runtimeOf5(el).waiting.push(done));
  },
  format: (name, format) => {
    if (!name || typeof format !== "function")
      return;
    FORMATS2[name] = format;
    for (const el of dfDollar9(`.tacho[data-init][data-format="${CSS.escape(name)}"]`).toArray())
      if (el._tacho) {
        redraw2(el);
        applyMarkup9(el, runtimeOf5(el).status, configOf3(el));
      }
  }
};
init9();
new MutationObserver(init9).observe(document, { childList: true, subtree: true });

//# debugId=97B2D74D0169143964756E2164756E21
//# sourceMappingURL=multimedia.js.map
