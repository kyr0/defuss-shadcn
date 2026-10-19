// -- Video ---------------------------------------------------
// A stateful video player over the native <video>: the states default (paused) and playing, the playback position,
// rate, volume, muted and captions as the state's config, controls inside the player or anywhere on the page
// (data-video-for), captions drawn in its own overlay and an imperative API (df$.shadcn.video). The media engine -
// reading the element, applying a config, the controls, the captions - is shared with the Audio component
// (src/shared/media.ts, emitted once in core); this file keeps the states, the API and the init.

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import {
  defussGlobals,
  defussQuery,
  componentState,
  bindComponent,
  bindMedia,
  mediaApply,
  mediaMarkup,
  mediaRead,
  mediaTracks,
} from '../../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

const videoStates = ['default', 'playing'];

/** The config both states take - every key optional; only the keys passed are applied. */
export interface VideoConfig {
  /** the playback position to seek to, seconds; getState() reports the live position */
  time?: number;
  /** the playback rate - 1 is normal speed, 2 twice as fast */
  rate?: number;
  /** the volume, 0 to 1 */
  volume?: number;
  /** the sound is off */
  muted?: boolean;
  /** the key of the text track to show (its id, a <track>'s id or srclang - see the captions menu), '' for none;
   *  true shows the current or first one, false none. getState() reports the key shown */
  captions?: string | boolean;
  /** the video's length, seconds - reported by getState() (0 until the metadata loaded), never set */
  duration?: number;
}

/** One cue of a text track. */
export interface VideoCue {
  /** where it starts, seconds */
  start?: number;
  /** where it ends, seconds */
  end?: number;
  /** the words */
  text?: string;
}

/** A text track of the player's own - in its script.video-tracks JSON or handed to tracks(). The same shape as a Media
 *  Timeline's text rows. */
export interface VideoTextTrack {
  /** its key, unique on the video: captions "<key>" shows it */
  id: string;
  /** subtitles or captions - what is heard (the menu's Subtitles); descriptions - what is seen (its Video captions) */
  kind?: string;
  /** its name in the captions menu; default: the id */
  label?: string;
  /** its language (BCP 47, "de") */
  lang?: string;
  /** shown first when the video shows no other track yet */
  default?: boolean;
  /** its cues */
  items: VideoCue[];
}

// VERIFIED: (verify's API docs gate) the states below are exactly the declared ones, each
// described, and every config field typed, described and named in the code.
/** setState() configs per state. */
export interface VideoStateConfigs {
  /** Paused - at the start, wherever it was paused, or at the end. */
  default: VideoConfig;
  /** Playing. A browser may refuse to start sound without a click on the page (autoplay rules): the state then stays default. */
  playing: VideoConfig;
}

/** The markup of a state - the toggles' aria-pressed, the volume and rate controls, the video's muted attribute. */
function applyMarkup(el: HTMLElement, stateName: string, config: VideoConfig): void {
  mediaMarkup(el, 'video', stateName, config);
}

/** The DOM side of a state: the keys passed are applied to the <video>, then it plays or pauses. */
function triggerStateChange(
  el: HTMLElement,
  stateName: string,
  config: VideoConfig,
  incoming: Record<string, unknown>,
) {
  return mediaApply(el, 'video', stateName, config, incoming);
}

/** Registry-level API; pass the .video element explicitly. Unknown names throw. */
export const videoApi = componentState({
  component: 'video',
  states: videoStates,
  // the config IS the player's settings: a setState names what changes, the rest stays
  mergeConfig: true,
  apply: (el, state, _previous, incoming) => triggerStateChange(el, state.name, state.config, incoming),
  // reflect reality: the native controls, the media keys and the end of the video change it without setState()
  read: (el) => {
    const { playing, config } = mediaRead(el);
    const { time, duration, rate, volume, muted, captions } = config;
    return { name: playing ? 'playing' : 'default', config: { time, duration, rate, volume, muted, captions } };
  },
  markup: (el, state) => applyMarkup(el, state.name, state.config),
});

df$.videoApi = videoApi;
df$.videoStates = videoStates;

function init() {
  dfDollar('.video:not([data-init])')
    .toArray()
    .forEach((el: HTMLElement) => {
      el.dataset.init = '';
      // el.store + el.api (AGENTS.md "State through stores"): $('#my-video').api.setState('playing')
      bindComponent(el, videoApi);
      bindMedia(el, 'video', () => videoApi.getState(el));
    });
}

const resolve = (target: string | HTMLElement): HTMLElement | undefined =>
  typeof target === 'string' ? dfDollar(target).get(0) : target;
/** the state a call keeps: playing stays playing */
const now = (el: HTMLElement): string => (mediaRead(el).playing ? 'playing' : 'default');

df$.video = {
  /**
   * Start playback (the playing state).
   * @param target - the .video element or its selector
   * @returns resolves once playback started, or the browser refused it (the state then reads default)
   */
  play: async (target: string | HTMLElement): Promise<void> => {
    const el = resolve(target);
    if (el?.api) await el.api.setState('playing');
  },
  /**
   * Pause (the default state).
   * @param target - the .video element or its selector
   */
  pause: (target: string | HTMLElement): void => {
    resolve(target)?.api?.setState('default');
  },
  /**
   * Play when paused, pause when playing - what a toggle control does.
   * @param target - the .video element or its selector
   * @returns true when it plays now
   */
  toggle: (target: string | HTMLElement): boolean => {
    const el = resolve(target);
    if (!el?.api) return false;
    const next = now(el) === 'playing' ? 'default' : 'playing';
    el.api.setState(next);
    return next === 'playing';
  },
  /**
   * Go to a time; playing stays playing.
   * @param target - the .video element or its selector
   * @param time - seconds from the start (clamped to the video's length)
   */
  seek: (target: string | HTMLElement, time: number): void => {
    const el = resolve(target);
    if (el?.api) el.api.setState(now(el), { time });
  },
  /**
   * Move by some seconds - forward, or back with a negative number.
   * @param target - the .video element or its selector
   * @param seconds - how far to move
   */
  skip: (target: string | HTMLElement, seconds: number): void => {
    const el = resolve(target);
    if (el?.api) el.api.setState(now(el), { time: mediaRead(el).config.time + seconds });
  },
  /**
   * Switch the sound off or on.
   * @param target - the .video element or its selector
   * @param muted - true for off; default: the opposite of now
   */
  mute: (target: string | HTMLElement, muted?: boolean): void => {
    const el = resolve(target);
    if (el?.api) el.api.setState(now(el), { muted: muted ?? !mediaRead(el).config.muted });
  },
  /**
   * Set the volume.
   * @param target - the .video element or its selector
   * @param volume - 0 to 1
   */
  volume: (target: string | HTMLElement, volume: number): void => {
    const el = resolve(target);
    if (el?.api) el.api.setState(now(el), { volume });
  },
  /**
   * Set the playback rate.
   * @param target - the .video element or its selector
   * @param rate - 1 is normal speed, 0.5 half, 2 twice as fast
   */
  rate: (target: string | HTMLElement, rate: number): void => {
    const el = resolve(target);
    if (el?.api) el.api.setState(now(el), { rate });
  },
  /**
   * Show a text track by its key, or none.
   * @param target - the .video element or its selector
   * @param key - the track's key, '' or false for none, true for the current or first one; default: none when one
   *   shows, else the current or first one
   */
  captions: (target: string | HTMLElement, key?: string | boolean): void => {
    const el = resolve(target);
    if (el?.api) el.api.setState(now(el), { captions: key ?? (mediaRead(el).config.captions ? '' : true) });
  },
  /**
   * Add or update the player's own text tracks by key - while it plays too: a track that shows keeps showing with
   * its new cues. The captions menu lists every track of the video (a Media Timeline's text rows and <track>
   * elements as well).
   * @param target - the .video element or its selector
   * @param tracks - the tracks, each with its id
   * @param replace - also retire the player's own tracks not listed
   * @returns the keys listed
   */
  tracks: (target: string | HTMLElement, tracks: VideoTextTrack[], replace?: boolean): string[] => {
    const el = resolve(target);
    return el?.api ? mediaTracks(el, 'video', tracks, replace) : [];
  },
  /**
   * Show the player full screen (controls and captions included), or leave full screen. Browsers allow it only from
   * a click or a key press.
   * @param target - the .video element or its selector
   * @returns resolves when the change is done or refused
   */
  fullscreen: async (target: string | HTMLElement): Promise<void> => {
    const el = resolve(target);
    if (!el) return;
    if (document.fullscreenElement === el) await document.exitFullscreen().catch(() => undefined);
    else await el.requestFullscreen().catch(() => undefined);
  },
};

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
