// -- head.ts - the synchronous <head> bundle (js/head.js) -------------------
// Why: these three scripts share the persisted stores (prefs.ts) - one store
// per key, so they ship as ONE classic IIFE built by scripts/build-docs.ts
// (bun build): order matters - theme data, the persisted theme before first
// paint, then the chrome runtime.
import './themes.js';
import './theme-switcher.js';
import './layout.js';
