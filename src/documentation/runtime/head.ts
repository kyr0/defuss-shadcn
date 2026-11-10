// -- head.ts - the synchronous <head> bundle (js/head.js) -------------------
// Why: these scripts share the persisted stores (prefs.ts) - one store
// per key, so they ship as ONE classic IIFE built by scripts/build-docs.ts
// (bun build): order matters - theme data, the persisted theme before first
// paint, then the chrome runtime.
// VERIFIED: (documentation.e2e "What's new") whats-new.js runs from this bundle and shares prefs.whatsNew with the
// deferred scripts (df$.shadcn.docs.prefs).
import './themes.js';
import './theme-switcher.js';
import './layout.js';
import './whats-new.js';
