/**
 * Why: the Video and the Audio component are one engine with two faces - the state of an HTMLMediaElement (time,
 * duration, paused, muted, volume, rate), the declarative controls that drive it and the captions it shows are the
 * same for both, so they live here once (emitted in core, bound through df$.shadcn.shared) instead of in two copies.
 * The components keep what is theirs: their states, their config types, their df$ namespace, their markup and CSS.
 *
 * A player is a root element (`.video`, `.audio`) holding a <video> or <audio>. Its controls carry
 * `data-<prefix>-action` (toggle, play, pause, seek, skip, mute, volume, rate, captions, fullscreen) and its readouts
 * `data-<prefix>-output` (time, duration, remaining) - inside the root, or anywhere on the page with
 * `data-<prefix>-for="<root id>"` (on the control itself, or on a container of controls). Every control goes through
 * the root's own setState, so the store stays the one owner of the state; every media event repaints the controls
 * and reports back (the component syncs its store).
 *
 * Text tracks are keyed here, once: a player's own JSON (`script.<prefix>-tracks`), a Media Timeline's text rows and
 * `<track>` elements all become entries of one list (mediaTextList), so `captions: "<key>"` names what to show and
 * the captions control offers them as a Dropdown Menu when there is more than one.
 *
 * VERIFIED: (video.e2e, audio.e2e) the controls inside and outside, the captions overlay, the menu and the store
 * follow the media; (tmp/probe-autoplay.ts, 2026-10-19) currentTime reads back at once after a seek in Chromium and WebKit, while
 * `ended` turns true only after the seek completes in Chromium - so the state reads `paused`, never `ended`.
 */
import { defussQuery } from './query.js';

/** What a player reports and accepts (time, rate, volume, muted, captions; duration is reported only). setState also
 *  takes captions as true (the current or first track) or false (none). */
export interface MediaConfig {
  /** the playback position, seconds */
  time: number;
  /** the media's length, seconds (0 until its metadata loaded) */
  duration: number;
  /** the playback rate - 1 is normal speed */
  rate: number;
  /** the volume, 0 to 1 */
  volume: number;
  /** the sound is off */
  muted: boolean;
  /** the key of the text track the overlay shows, '' for none */
  captions: string;
}

/** One cue of a keyed text track. */
export interface MediaCue {
  /** where it starts, seconds */
  start?: number;
  /** where it ends, seconds */
  end?: number;
  /** the words */
  text?: string;
  /** the words, when there is no text (a timeline item's label) */
  label?: string;
}

/** A keyed text track - the shape a player's JSON (`script.<prefix>-tracks`) and a Media Timeline's text rows share. */
export interface MediaTextTrack {
  /** its key, unique on the media: captions "<key>" shows it */
  id: string;
  /** subtitles or captions - what is heard (the menu's Subtitles); descriptions - what is seen (its Video captions) */
  kind?: string;
  /** its name in the captions menu; default: the id */
  label?: string;
  /** its language (BCP 47, "de") */
  lang?: string;
  /** shown first when the media shows no other track yet */
  default?: boolean;
  /** its cues */
  items: MediaCue[];
}

/** a text track the media offers: its key, kind, menu label and language */
export interface MediaTextEntry {
  /** the key captions takes */
  key: string;
  /** subtitles, captions or descriptions */
  kind: string;
  /** the name in the menu */
  label: string;
  /** its language */
  lang: string;
  /** the TextTrack itself */
  track: TextTrack;
}

/** the kinds a player shows (chapters and metadata tracks are not text to read) */
const TEXT_KINDS = ['subtitles', 'captions', 'descriptions'];
/** a keyed track as the media keeps it: who added it (a player, a timeline), its menu label, its cues, and whether
 *  its key left the data (retired: empty, disabled, kept for the key's return) */
type Keyed = {
  track: TextTrack;
  owner: object;
  kind: string;
  label: string;
  lang: string;
  cues: TextTrackCue[];
  retired?: boolean;
};

/** what setState applies: any key of a config, captions also as true / false */
type MediaSetConfig = Partial<Omit<MediaConfig, 'captions'>> & { captions?: string | boolean };

/** a player's state as its read() reports it */
export interface MediaReading {
  /** the media plays (neither paused nor ended) */
  playing: boolean;
  /** the live values */
  config: MediaConfig;
}

const num = (v: unknown, fallback: number): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
};
const pad = (n: number): string => String(n).padStart(2, '0');
const esc = (v: unknown): string =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
/** set (or, with null, remove) an attribute only when it differs - the controls repaint on every timeupdate, and an
 *  unchanged write still wakes every MutationObserver on the way (the State API's read-back, a Slider's) */
const put = (el: Element, name: string, value: string | null): void => {
  if (el.getAttribute(name) !== value) defussQuery()(el).attr(name, value);
};

/**
 * A playback time as a clock: `m:ss`, or `h:mm:ss` once the reference length reaches an hour (so the time and the
 * length of one player line up). Whole seconds, rounded down; anything not a positive number reads 0:00.
 */
export function mediaTime(seconds: number, total: number = seconds): string {
  const s = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds + 1e-6) : 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 || (Number.isFinite(total) && total >= 3600) ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

/** The media element of a player: the element itself when it is one, else its first <video> / <audio>. */
export function mediaOf(root: Element | null | undefined): HTMLMediaElement | null {
  if (!root) return null;
  if (root instanceof HTMLMediaElement) return root;
  return (defussQuery()(root).find<HTMLMediaElement>('video, audio').get(0) as HTMLMediaElement | undefined) ?? null;
}

/** the controls and readouts bound to a player: inside it (unless `inside` is false), and every
 *  [data-<prefix>-for="<its id>"] - the element itself when it is a control, else the controls inside it */
function controlsOf(root: HTMLElement, prefix: string, inside = true): HTMLElement[] {
  const $ = defussQuery();
  const sel = `[data-${prefix}-action], [data-${prefix}-output]`;
  const out: HTMLElement[] = inside ? ($(root).find<HTMLElement>(sel).toArray() as HTMLElement[]) : [];
  if (root.id)
    for (const bound of $(`[data-${prefix}-for="${CSS.escape(root.id)}"]`).toArray() as HTMLElement[]) {
      if (bound.matches(sel)) out.push(bound);
      out.push(...($(bound).find<HTMLElement>(sel).toArray() as HTMLElement[]));
    }
  return out;
}

/** the player a control drives: the nearer of a [data-<prefix>-for] (by id) and the enclosing root */
function playerOf(control: Element, prefix: string): HTMLElement | null {
  const near = control.closest<HTMLElement>(`[data-${prefix}-for], .${prefix}`);
  if (!near) return null;
  const id = near.getAttribute(`data-${prefix}-for`);
  if (id === null) return near;
  return (defussQuery()(`#${CSS.escape(id)}`).get(0) as HTMLElement | undefined) ?? null;
}

/** The live values of a player (read() of the Video and the Audio component). */
export function mediaRead(root: HTMLElement): MediaReading {
  const m = mediaOf(root);
  return {
    playing: !!m && !m.paused && !m.ended,
    config: {
      time: m ? m.currentTime : 0,
      duration: m && Number.isFinite(m.duration) ? m.duration : 0,
      rate: m ? m.playbackRate : 1,
      volume: m ? m.volume : 1,
      muted: m ? m.muted : false,
      captions: m ? shownKey(root, m) : '',
    },
  };
}

/** the key of the track the overlay shows - '' when captions are off or there is none */
function shownKey(root: HTMLElement, m: HTMLMediaElement): string {
  if (root._mediaCaptions === false || !root._mediaTrack) return '';
  return mediaTextList(m).find((e) => e.track === root._mediaTrack)?.key ?? '';
}

/**
 * Add, update or (with replace) retire an owner's keyed text tracks on a media element: a new key becomes a
 * TextTrack (shown when the media shows nothing yet - the one marked default, else the first), a known one gets its
 * cues, label and language replaced (so a track changes while it plays, its selection kept), an owner's key that
 * is no longer listed is emptied and disabled. A TextTrack cannot be removed, so a retired key keeps its track and
 * takes it again when it returns - a page switching layers does not grow the media's track list. Returns the keys
 * now listed.
 */
export function mediaTextTracks(
  media: HTMLMediaElement,
  tracks: MediaTextTrack[],
  owner: object,
  replace = true,
): string[] {
  if (typeof VTTCue === 'undefined') return [];
  const reg: Map<string, Keyed> = (media._mediaTexts ??= new Map());
  const retired: WeakSet<TextTrack> = (media._mediaRetired ??= new WeakSet());
  const wanted = (Array.isArray(tracks) ? tracks : []).filter((t) => t && t.id != null && Array.isArray(t.items));
  const ids = new Set(wanted.map((t) => String(t.id)));
  const empty = (k: Keyed) => {
    for (const cue of k.cues) k.track.removeCue(cue);
    k.cues = [];
    if (k.track.mode !== 'disabled') k.track.mode = 'disabled';
  };
  if (replace)
    for (const [key, k] of reg)
      if (k.owner === owner && !k.retired && !ids.has(key)) {
        empty(k);
        k.retired = true;
      }
  const before = mediaTextList(media).some((e) => e.track.mode !== 'disabled');
  const fresh: { k: Keyed; first: boolean }[] = [];
  for (const t of wanted) {
    const key = String(t.id);
    const kind = TEXT_KINDS.includes(String(t.kind)) ? String(t.kind) : 'subtitles';
    let k = reg.get(key);
    // a TextTrack's kind is fixed at its birth: another kind is a new track (the old one leaves the list for good)
    if (k && k.kind !== kind) {
      empty(k);
      retired.add(k.track);
      reg.delete(key);
      k = undefined;
    }
    if (k?.retired) {
      k.retired = false;
      fresh.push({ k, first: !!t.default });
    }
    if (k) k.owner = owner;
    else {
      k = {
        track: media.addTextTrack(kind as TextTrackKind, String(t.label ?? key), String(t.lang ?? '')),
        owner,
        kind,
        label: '',
        lang: '',
        cues: [],
      };
      k.track.mode = 'disabled';
      reg.set(key, k);
      fresh.push({ k, first: !!t.default });
    }
    k.label = String(t.label ?? key);
    k.lang = String(t.lang ?? '');
    for (const cue of k.cues) k.track.removeCue(cue);
    k.cues = [];
    for (const item of t.items) {
      const start = num(item?.start, NaN);
      const end = num(item?.end, NaN);
      const text = String(item?.text ?? item?.label ?? '');
      if (Number.isFinite(start) && Number.isFinite(end) && end > start && text) {
        const cue = new VTTCue(start, end, text);
        k.track.addCue(cue);
        k.cues.push(cue);
      }
    }
  }
  if (!before && fresh.length) (fresh.find((f) => f.first) ?? fresh[0]).k.track.mode = 'showing';
  return [...ids];
}

/** The text tracks a media offers, in its own order: keyed ones by their key, a <track> by its id, else its srclang,
 *  else its label (made unique) - subtitles, captions and descriptions only. */
export function mediaTextList(media: HTMLMediaElement): MediaTextEntry[] {
  const reg: Map<string, Keyed> = media._mediaTexts ?? new Map();
  const retired: WeakSet<TextTrack> | undefined = media._mediaRetired;
  const keyOf = new Map<TextTrack, string>();
  for (const [key, k] of reg) keyOf.set(k.track, key);
  const seen = new Set<string>(reg.keys());
  const out: MediaTextEntry[] = [];
  Array.from(media.textTracks).forEach((t, i) => {
    if (!TEXT_KINDS.includes(t.kind) || retired?.has(t)) return;
    const keyed = keyOf.get(t);
    if (keyed !== undefined) {
      const k = reg.get(keyed)!;
      if (!k.retired) out.push({ key: keyed, kind: t.kind, label: k.label, lang: k.lang, track: t });
      return;
    }
    const base = t.id || t.language || t.label || `track-${i + 1}`;
    let key = base;
    for (let n = 2; seen.has(key); n++) key = `${base}-${n}`;
    seen.add(key);
    out.push({ key, kind: t.kind, label: t.label || key, lang: t.language, track: t });
  });
  return out;
}

/**
 * The markup of a state on a player root - setState runs it on the live root (and its outside controls), render() on
 * a detached copy: the toggles' aria-pressed (toggle = playing, mute, captions), a rate button's aria-pressed, the
 * volume range's and the rate select's value, the media's `muted` attribute. The time, the scrubber and the readouts
 * move by themselves and are not markup.
 */
export function mediaMarkup(
  root: Element,
  prefix: string,
  name: string,
  config: MediaSetConfig,
  controls: HTMLElement[] = defussQuery()(root).find<HTMLElement>(`[data-${prefix}-action]`).toArray() as HTMLElement[],
): void {
  const $ = defussQuery();
  const pressed = (el: HTMLElement, on: boolean) => put(el, 'aria-pressed', on ? 'true' : 'false');
  for (const el of controls) {
    const action = el.getAttribute(`data-${prefix}-action`);
    if (action === 'toggle') pressed(el, name === 'playing');
    else if (action === 'mute' && config.muted !== undefined) pressed(el, !!config.muted);
    else if (action === 'captions' && config.captions !== undefined)
      pressed(el, config.captions !== '' && config.captions !== false);
    else if (action === 'volume' && config.volume !== undefined && el instanceof HTMLInputElement) {
      put(el, 'value', String(config.volume));
      if (el.value !== String(config.volume)) el.value = String(config.volume);
    } else if (action === 'rate' && config.rate !== undefined) {
      if (el instanceof HTMLSelectElement)
        for (const option of Array.from(el.options)) {
          const on = num(option.value, NaN) === config.rate;
          put(option, 'selected', on ? '' : null);
          if (on && el.value !== option.value) el.value = option.value;
        }
      else if (el.hasAttribute('data-value')) pressed(el, num(el.getAttribute('data-value'), NaN) === config.rate);
    }
  }
  const media = root instanceof HTMLMediaElement ? root : $(root).find('video, audio').get(0);
  if (media && config.muted !== undefined) put(media, 'muted', config.muted ? '' : null);
}

/** Show the active cue of the player's caption track in its `.<prefix>-captions` overlay (empty when captions are off). */
function paintCaptions(root: HTMLElement, prefix: string): void {
  const overlay = defussQuery()(root).find(`.${prefix}-captions`);
  if (!overlay.length) return;
  const track: TextTrack | undefined = root._mediaTrack;
  // the cues at the media's time, read here: a paused media that never played keeps activeCues empty (the browser
  // runs "time marches on" only as the time moves), so a description at 0:00 would not show before playback
  const t = mediaOf(root)?.currentTime ?? 0;
  const text =
    root._mediaCaptions !== false && track?.cues
      ? Array.from(track.cues)
          .filter((c) => c.startTime <= t && t < c.endTime)
          .map((c) => ((c as VTTCue).text ?? '').replace(/<[^>]+>/g, ''))
          .join('\n')
      : '';
  if (overlay.text() !== text) overlay.text(text);
}

/** The player's text track: a key asked for before its track existed, else the one that last turned 'showing' (a
 *  <track default>, the browser's own menu, a track a Media Timeline added), else the one chosen, else the first.
 *  The chosen one is kept 'hidden' while captions are on (its cues load and change, the browser draws none: the
 *  overlay does, above the controls and in full screen), every other one 'disabled'. Then the menus follow. */
function takeCaptions(root: HTMLElement, prefix: string): void {
  const m = mediaOf(root);
  if (!m) return;
  const list = mediaTextList(m);
  const asked = root._mediaWanted ? list.find((e) => e.key === root._mediaWanted) : undefined;
  if (asked) root._mediaWanted = undefined;
  const showing = list.filter((e) => e.track.mode === 'showing').pop();
  const chosen = asked ?? showing ?? list.find((e) => e.track === root._mediaTrack) ?? list[0];
  root._mediaTrack = chosen?.track;
  for (const e of list) {
    const mode = e === chosen && root._mediaCaptions !== false ? 'hidden' : 'disabled';
    if (e.track.mode !== mode) e.track.mode = mode;
  }
  const track: TextTrack | undefined = root._mediaTrack;
  if (track && !(root._mediaCued ??= new WeakSet<TextTrack>()).has(track)) {
    root._mediaCued.add(track);
    track.addEventListener('cuechange', () => paintCaptions(root, prefix));
  }
  paintCaptions(root, prefix);
  captionsMenus(root, prefix, list);
}

/** the menu's group names: the player's JSON labels over the English defaults */
const menuLabels = (root: HTMLElement): { off: string; subtitles: string; descriptions: string } => ({
  off: 'Off',
  subtitles: 'Subtitles',
  descriptions: 'Video captions',
  ...root._mediaLabels,
});

/** a radio item of the captions menu */
const menuItem = (key: string, text: string, extra = ''): string =>
  `<button class="dropdown-item dropdown-radio" role="menuitemradio" aria-checked="false" tabindex="-1" data-value="${esc(key)}">${esc(text)}${extra}</button>`;

/**
 * The captions menu of every captions control, while the media offers two or more text tracks: a Dropdown Menu
 * beside the control (its popovertarget, so the native popover opens even without dropdown.js, which adds the
 * keyboard, the anchoring and the submenus) - Off, then per group (Subtitles: subtitles and captions, what is heard;
 * Video captions: descriptions, what is seen) one item, or a submenu when the group holds more than one. The menu is
 * rebuilt only when the tracks or the labels change (an open submenu stays open); its checks follow the choice.
 */
function captionsMenus(root: HTMLElement, prefix: string, list: MediaTextEntry[]): void {
  const $ = defussQuery();
  const shown = root._mediaCaptions === false ? '' : (list.find((e) => e.track === root._mediaTrack)?.key ?? '');
  const labels = menuLabels(root);
  const heard = list.filter((e) => e.kind !== 'descriptions');
  const seen = list.filter((e) => e.kind === 'descriptions');
  let items = menuItem('', labels.off);
  for (const [name, entries] of [
    [labels.subtitles, heard],
    [labels.descriptions, seen],
  ] as const) {
    if (!entries.length) continue;
    items += '<div class="dropdown-separator" role="separator"></div>';
    items +=
      entries.length === 1
        ? menuItem(entries[0].key, name, `<span class="dropdown-shortcut">${esc(entries[0].label)}</span>`)
        : `<div class="dropdown-sub"><button class="dropdown-item dropdown-sub-trigger" role="menuitem" tabindex="-1">${esc(name)}<span class="dropdown-shortcut" data-${prefix}-menu-current></span></button><div class="dropdown-content dropdown-sub-content" role="menu" popover aria-label="${esc(name)}" data-size="sm">${entries.map((e) => menuItem(e.key, e.label)).join('')}</div></div>`;
  }
  for (const control of controlsOf(root, prefix)) {
    if (control.getAttribute(`data-${prefix}-action`) !== 'captions') continue;
    let menu: HTMLElement | undefined = control._mediaMenu;
    if (list.length < 2) {
      // back to a toggle: no popup, so no menu button's ARIA either
      if (menu)
        for (const name of ['popovertarget', 'aria-haspopup', 'aria-controls', 'aria-expanded'])
          put(control, name, null);
      continue;
    }
    if (!menu) {
      let id = `${control.id || root.id || prefix}-captions-menu`;
      for (let n = 2; $(`#${CSS.escape(id)}`).length; n++) id = `${control.id || root.id || prefix}-captions-menu-${n}`;
      menu = $(
        `<div class="dropdown-content" role="menu" popover id="${esc(id)}" data-size="sm" data-align="end" aria-label="${esc(control.getAttribute('aria-label') ?? 'Captions')}"></div>`,
      ).get(0) as HTMLElement;
      control._mediaMenu = menu;
      const choose = (item: Element | null) => {
        if (!item || !item.hasAttribute('data-value') || !root.api) return;
        const m = mediaOf(root);
        root.api.setState(m && !m.paused && !m.ended ? 'playing' : 'default', {
          captions: item.getAttribute('data-value') ?? '',
        });
        if (menu!.matches(':popover-open')) menu!.hidePopover();
      };
      // a click (pointer), dropdown:select (dropdown.js - Enter, Space)
      menu.addEventListener('click', (e) => choose((e.target as Element).closest('[role="menuitemradio"]')));
      menu.addEventListener('dropdown:select', (e) => choose((e as CustomEvent<{ item: HTMLElement }>).detail?.item));
      put(control, 'data-dropdown-trigger', id);
      // inside the player, at its end: the overlay bar's light tokens stay out of the menu
      if (root.contains(control)) $(root).append(menu);
      else $(control).after(menu);
    }
    put(control, 'popovertarget', menu.id);
    if (control.hasAttribute('data-init')) {
      // dropdown.js wrote these once, at its init; the engine keeps them while the button is a menu button
      put(control, 'aria-haspopup', 'menu');
      put(control, 'aria-controls', menu.id);
    }
    if (menu._mediaItems !== items) {
      menu._mediaItems = items;
      $(menu).html(items);
    }
    for (const item of $(menu).find<HTMLElement>('[role="menuitemradio"]').toArray() as HTMLElement[])
      put(item, 'aria-checked', item.getAttribute('data-value') === shown ? 'true' : 'false');
    for (const current of $(menu).find<HTMLElement>(`[data-${prefix}-menu-current]`).toArray() as HTMLElement[]) {
      const sub = current.closest('.dropdown-sub');
      const on = sub ? $(sub).find<HTMLElement>('[role="menuitemradio"][aria-checked="true"]').get(0) : undefined;
      const text = on ? $(on).text() : '';
      if ($(current).text() !== text) $(current).text(text);
    }
  }
}

/** Repaint what moves by itself: the toggles, the scrubber, the readouts, the volume and rate controls, the captions. */
export function mediaPaint(root: HTMLElement, prefix: string): void {
  const $ = defussQuery();
  const { playing, config } = mediaRead(root);
  const controls = controlsOf(root, prefix);
  mediaMarkup(root, prefix, playing ? 'playing' : 'default', config, controls);
  const total = mediaTime(config.duration);
  for (const el of controls) {
    const action = el.getAttribute(`data-${prefix}-action`);
    const output = el.getAttribute(`data-${prefix}-output`);
    if (action === 'seek' && el instanceof HTMLInputElement) {
      if (config.duration > 0) put(el, 'max', String(config.duration));
      put(el, 'aria-valuetext', `${mediaTime(config.time, config.duration)} of ${total}`);
      if (!el._mediaDragging && Math.abs(num(el.value, 0) - config.time) > 0.05) {
        const slider = el.api as { setState?: (n: string, c: Record<string, unknown>) => unknown } | undefined;
        if (slider?.setState) slider.setState('default', { value: config.time });
        else el.value = String(config.time);
      }
    } else if (action === 'fullscreen') {
      put(el, 'aria-pressed', document.fullscreenElement === root ? 'true' : 'false');
    }
    if (output) {
      const text =
        output === 'duration'
          ? total
          : output === 'remaining'
            ? `-${mediaTime(config.duration - config.time, config.duration)}`
            : mediaTime(config.time, config.duration);
      if ($(el).text() !== text) $(el).text(text);
    }
  }
  paintCaptions(root, prefix);
}

/**
 * Apply the keys a setState call passed (`incoming`: time, rate, volume, muted, captions - nothing else, so a merged
 * config never seeks back to a stale time), write the state's markup, then play or pause. Returns, when it starts
 * playback, play()'s promise settled: it never rejects (a refused play() - autoplay rules, no source - leaves the
 * media paused and the state reads 'default').
 */
export function mediaApply(
  root: HTMLElement,
  prefix: string,
  name: string,
  config: MediaSetConfig,
  incoming: Record<string, unknown>,
): Promise<void> | undefined {
  const m = mediaOf(root);
  if ('captions' in incoming) {
    const v = incoming.captions;
    root._mediaCaptions = !(v === false || v === '' || v === null);
    root._mediaWanted = typeof v === 'string' && v !== '' ? v : undefined;
    takeCaptions(root, prefix);
  }
  if (m) {
    const rate = num(incoming.rate, 0);
    if (rate > 0 && m.playbackRate !== rate) m.playbackRate = rate;
    if ('volume' in incoming) {
      const v = Math.min(1, Math.max(0, num(incoming.volume, m.volume)));
      if (m.volume !== v) m.volume = v;
    }
    if ('muted' in incoming && m.muted !== !!incoming.muted) m.muted = !!incoming.muted;
    if ('time' in incoming) {
      const end = Number.isFinite(m.duration) ? m.duration : Infinity;
      const t = Math.min(end, Math.max(0, num(incoming.time, m.currentTime)));
      if (Math.abs(m.currentTime - t) > 0.001) m.currentTime = t;
    }
  }
  mediaMarkup(root, prefix, name, config, controlsOf(root, prefix));
  if (!m) return undefined;
  if (name === 'playing' && m.paused)
    return m.play().then(
      () => undefined,
      () => undefined,
    );
  if (name !== 'playing' && !m.paused) m.pause();
  return undefined;
}

/**
 * A player's own text tracks, added or updated by key (while it plays, too - a chosen track keeps showing with its
 * new cues); with replace, the player's keys not listed are retired. The menu and the overlay follow. Returns the
 * keys listed.
 */
export function mediaTracks(root: HTMLElement, prefix: string, tracks: MediaTextTrack[], replace = false): string[] {
  const m = mediaOf(root);
  if (!m) return [];
  const keys = mediaTextTracks(m, tracks, root, replace);
  takeCaptions(root, prefix);
  return keys;
}

/** the state a control asks for, applied through the player's own setState */
function drive(root: HTMLElement, prefix: string, control: HTMLElement, event: Event): void {
  const api = root.api;
  const m = mediaOf(root);
  if (!api || !m) return;
  const now = m.paused || m.ended ? 'default' : 'playing';
  const action = control.getAttribute(`data-${prefix}-action`);
  const value = (control as HTMLInputElement).value;
  if (event.type === 'click') {
    if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement) return;
    if (action === 'toggle') api.setState(now === 'playing' ? 'default' : 'playing');
    else if (action === 'play') api.setState('playing');
    else if (action === 'pause') api.setState('default');
    else if (action === 'skip') api.setState(now, { time: m.currentTime + num(control.getAttribute('data-value'), 0) });
    else if (action === 'mute') api.setState(now, { muted: !m.muted });
    else if (action === 'captions') {
      // two or more tracks: the menu opens (popovertarget) - built fresh, so a timeline's new labels show
      takeCaptions(root, prefix);
      if (!control.hasAttribute('popovertarget'))
        api.setState(now, { captions: root._mediaCaptions === false || !root._mediaTrack ? true : '' });
    } else if (action === 'rate' && control.hasAttribute('data-value'))
      api.setState(now, { rate: num(control.getAttribute('data-value'), 1) });
    else if (action === 'fullscreen') {
      if (document.fullscreenElement === root) void document.exitFullscreen?.().catch(() => undefined);
      else void root.requestFullscreen?.().catch(() => undefined);
    }
    return;
  }
  if (action === 'seek' && control instanceof HTMLInputElement) api.setState(now, { time: num(value, 0) });
  else if (action === 'volume' && control instanceof HTMLInputElement) {
    const v = num(value, 1);
    api.setState(now, v > 0 && m.muted ? { volume: v, muted: false } : { volume: v });
  } else if (action === 'rate' && control instanceof HTMLSelectElement) api.setState(now, { rate: num(value, 1) });
}

/** one document-level listener per player kind: every control on the page, bound now or added later */
function delegate(prefix: string): void {
  const flag = `__${prefix}MediaInit` as const;
  if (document[flag]) return;
  document[flag] = true;
  const handle = (event: Event) => {
    const control = (event.target as Element | null)?.closest?.<HTMLElement>(`[data-${prefix}-action]`);
    const root = control && playerOf(control, prefix);
    if (control && root) drive(root, prefix, control, event);
  };
  // a range and a select report through `input` (a select fires it too, before `change`)
  document.addEventListener('click', handle);
  document.addEventListener('input', handle);
  document.addEventListener('change', (event) => {
    if (event.target instanceof HTMLInputElement) event.target._mediaDragging = false;
  });
  // a dragged scrubber keeps its thumb: the time readout follows, the thumb is not set back under the pointer
  document.addEventListener('pointerdown', (event) => {
    const t = (event.target as Element | null)?.closest?.<HTMLInputElement>(`input[data-${prefix}-action="seek"]`);
    if (t) t._mediaDragging = true;
  });
  document.addEventListener('pointerup', () => {
    for (const t of defussQuery()(`input[data-${prefix}-action="seek"]`).toArray() as HTMLInputElement[])
      t._mediaDragging = false;
  });
}

/**
 * Bind a player root once (the component's init): the authored controls set the starting volume, rate and captions;
 * every media event repaints the controls and calls `report` (the component reads its state back into its store); a
 * click on a <video> without native controls plays or pauses; full screen controls hide where the page may not use it.
 */
export function bindMedia(root: HTMLElement, prefix: string, report: () => void): void {
  const $ = defussQuery();
  const m = mediaOf(root);
  const own = $(root).find<HTMLElement>(`[data-${prefix}-action]`).toArray() as HTMLElement[];
  const captions = own.find((el) => el.getAttribute(`data-${prefix}-action`) === 'captions');
  root._mediaCaptions = captions ? captions.getAttribute('aria-pressed') !== 'false' : true;
  const source = $(root).find<HTMLScriptElement>(`script.${prefix}-tracks`).get(0);
  if (m && source) {
    let data: { labels?: Record<string, string>; tracks?: MediaTextTrack[] } | null = null;
    try {
      data = JSON.parse($(source).text() || 'null');
    } catch {
      data = null;
    }
    if (data && typeof data === 'object') {
      if (data.labels && typeof data.labels === 'object') root._mediaLabels = { ...data.labels };
      mediaTextTracks(m, data.tracks ?? [], root);
    }
  }
  for (const el of controlsOf(root, prefix))
    if (el.getAttribute(`data-${prefix}-action`) === 'fullscreen' && !document.fullscreenEnabled) put(el, 'hidden', '');
  if (m) {
    const volume = own.find((el) => el.getAttribute(`data-${prefix}-action`) === 'volume') as
      | HTMLInputElement
      | undefined;
    if (volume) m.volume = Math.min(1, Math.max(0, num(volume.getAttribute('value'), 1)));
    const rate = own.find(
      (el) => el instanceof HTMLSelectElement && el.getAttribute(`data-${prefix}-action`) === 'rate',
    ) as HTMLSelectElement | undefined;
    if (rate && num(rate.value, 0) > 0) m.playbackRate = num(rate.value, 1);
    const changed = () => {
      mediaPaint(root, prefix);
      report();
    };
    for (const type of [
      'play',
      'pause',
      'ended',
      'timeupdate',
      'seeking',
      'seeked',
      'volumechange',
      'ratechange',
      'loadedmetadata',
      'durationchange',
      'emptied',
    ])
      m.addEventListener(type, changed);
    m.textTracks.addEventListener('addtrack', () => takeCaptions(root, prefix));
    // a <track>'s cues arrive after it is chosen: show the one at the current time without waiting for playback
    $(m)
      .find('track')
      .on('load', () => paintCaptions(root, prefix));
    m.textTracks.addEventListener('change', () => takeCaptions(root, prefix));
    takeCaptions(root, prefix);
    if (m instanceof HTMLVideoElement)
      m.addEventListener('click', () => {
        if (m.controls || !root.api) return;
        root.api.setState(m.paused || m.ended ? 'playing' : 'default');
      });
  }
  root.addEventListener('fullscreenchange', () => mediaPaint(root, prefix));
  delegate(prefix);
  mediaPaint(root, prefix);
}
