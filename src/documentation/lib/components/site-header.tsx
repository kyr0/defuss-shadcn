import type { Props } from 'defuss';
import { repoFile } from '../repo';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(repoFile('package.json'), 'utf8')) as { version: string };

/**
 * The fixed docs header. Statically rendered into every page (this replaces
 * the old <site-header> custom element). Runtime behaviors (palette wiring,
 * theme grid, star count, toggles) live in runtime/layout.ts and bind to the
 * ids below; the version badge is stamped from package.json at build time.
 */
export function SiteHeader(_props: Props) {
  return (
    <>
      <header class="site-header">
        <button class="sidebar-toggle" id="sidebar-toggle" aria-label="Toggle navigation menu">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <a href="index.html" class="header-brand">
          <img src="images/favicon.webp" alt="defuss-shadcn logo" class="header-brand-logo" />
          <span class="header-brand-name">defuss<em>-shadcn</em></span>
          <span class="badge header-brand-version" data-variant="outline" style="font-family:var(--font-mono);">
            v{pkg.version}
          </span>
        </a>
        {/* Search trigger next to the version badge: clicking it (or Enter/
            Space) opens the site's own <dialog class="command"> palette below.
            The input never receives keystrokes. */}
        <div class="header-search" role="search">
          <input
            type="text"
            class="header-search-input"
            placeholder="Search docs… (⌘K)"
            aria-label="Search documentation"
            autocomplete="off"
            readonly
          />
        </div>
        <div style="flex:1;"></div>
        <nav style="display:flex;align-items:center;gap:0.25rem;">
          <a href="https://github.com/kyr0/defuss-shadcn" target="_blank" rel="noopener" class="header-action">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span class="github-label">GitHub</span>
            <span class="github-stars"></span>
          </a>
          <button id="wide-toggle" class="header-action theme-toggle-btn" aria-label="Toggle wide layout" aria-pressed="false">
            <svg id="icon-wide-expand" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3" />
              <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
              <path d="M3 16v3a2 2 0 0 0 2 2h3" />
              <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
            </svg>
            <svg id="icon-wide-collapse" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none">
              <path d="M8 3v3a2 2 0 0 1-2 2H3" />
              <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
              <path d="M3 16h3a2 2 0 0 1 2 2v3" />
              <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
            </svg>
          </button>
          <button id="theme-toggle" class="header-action theme-toggle-btn" aria-label="Toggle dark mode">
            <svg id="icon-sun" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
            <svg id="icon-moon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          </button>
          <button id="theme-selector-btn" class="header-action theme-toggle-btn" aria-label="Change color theme" popovertarget="theme-popover">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" />
              <circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" />
              <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" />
              <circle cx="6.5" cy="12" r="0.5" fill="currentColor" />
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
            </svg>
          </button>
        </nav>
      </header>
      <div id="theme-popover" popover class="theme-popover">
        <div class="theme-popover-header">
          <span class="theme-popover-title">Theme</span>
          <button class="theme-reset-btn" id="theme-reset-btn">Reset</button>
        </div>
        <div class="theme-grid" id="theme-grid"></div>
      </div>
      {/* Docs-wide search palette — the shipped command component, fed by the
          generated search index (filled at runtime from js/search-index.js).
          First dialog.command in document order, so command.js's Cmd/Ctrl+K
          targets it, not any in-page demo. */}
      <dialog id="docs-palette" class="command" aria-label="Search documentation">
        <div class="command-content">
          <div class="command-input-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input class="command-input" type="text" placeholder="Search documentation…" autocomplete="off" autocorrect="off" spellcheck="false" />
          </div>
          <div class="command-list" id="docs-palette-list"></div>
          <div class="command-empty" hidden>No results found.</div>
        </div>
      </dialog>
    </>
  );
}
