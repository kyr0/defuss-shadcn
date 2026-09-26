import type { Props } from 'defuss';
import { themeFiles } from '../repo';

/**
 * Why: the shipped theme-switcher component's menu is data-driven, so the
 * demo renders the real menu from the generated theme files in dist/theme/
 * (build.ts runs before build:docs - the manifest IS the file tree). What a
 * reader sees, copies, and what the e2e fixture instantiates stay the same
 * set by construction.
 */
export function ThemeSwitcherDemo(props: Props & { id?: string }) {
  const id = props.id ?? 'theme-switcher-demo';
  const themes = themeFiles();
  return (
    <div class="theme-switcher">
      <button
        class="btn theme-switcher-trigger"
        id={`${id}-trigger`}
        type="button"
        popovertarget={`${id}-menu`}
        aria-expanded="false"
        aria-haspopup="menu"
      >
        <span class="theme-switcher-dot" aria-hidden="true" />
        <span class="theme-switcher-label">Default</span>
        <svg class="theme-switcher-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <div id={`${id}-menu`} class="theme-switcher-menu" popover="auto" role="menu" aria-labelledby={`${id}-trigger`} data-state-demo>
        <button class="theme-switcher-item" role="menuitemradio" aria-checked="true" data-theme-id="default" data-theme-label="Default" tabindex="-1">
          <span class="theme-switcher-dots" aria-hidden="true" />
          <span class="theme-switcher-name">Default</span>
          <svg class="theme-switcher-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </button>
        {themes.map((t) => (
          <button
            class="theme-switcher-item"
            role="menuitemradio"
            aria-checked="false"
            data-theme-id={t.id}
            data-theme-label={t.label}
            data-theme-colors={t.colors.join(',')}
            tabindex="-1"
          >
            <span class="theme-switcher-dots" aria-hidden="true" />
            <span class="theme-switcher-name">{t.label}</span>
            <svg class="theme-switcher-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
