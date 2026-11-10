import type { Frame, Page } from 'playwright';

/**
 * Why: the scaffolds and the Website templates translate their markup with defuss-i18n (the Translation guide)
 * - every translated target needs a template per language, every translated attribute a variant per language.
 * The library's own validator checks that coverage on the live markup, so a string added in English only fails
 * by name. The pinned build is the one the pages import (served offline by vendor-offline.ts).
 */
export const I18N_URL = 'https://cdn.jsdelivr.net/npm/defuss-i18n@0.2.0/dist/core.js';

/** validateI18n's findings for the component at `root`, in English and German ("CODE: message") */
export function translationGaps(page: Page | Frame, root: string): Promise<string[]> {
  return page.evaluate(
    async ({ root, url }) => {
      const { validateI18n } = await import(url);
      const el = document.querySelector(root);
      if (!el) return [`no ${root}`];
      return validateI18n(el, { locales: ['en', 'de'] }).map((d: { code: string; message: string }) => `${d.code}: ${d.message}`);
    },
    { root, url: I18N_URL },
  );
}

/** picks a language in the app's Language Switcher (`[data-app-locale]`, the first one) the way a click does: its
 *  value changes and language-change fires, which the page's bind() turns into the defuss-i18n locale */
export async function chooseLanguage(page: Page | Frame, tag: string): Promise<void> {
  await page.waitForFunction(() => document.querySelector('[data-app-locale]')?.hasAttribute('data-init'));
  const chosen = await page.evaluate((tag) => {
    const el = document.querySelector('[data-app-locale]') as HTMLElement;
    return (globalThis as any).df$.shadcn.languageSwitcher.choose(el, tag) || el.getAttribute('data-value') === tag;
  }, tag);
  if (!chosen) throw new Error(`the language switcher does not offer ${tag}`);
}

/** the language the app's Language Switcher shows (its data-value) */
export const shownLanguage = (page: Page | Frame): Promise<string | null> =>
  page.evaluate(() => document.querySelector('[data-app-locale]')?.getAttribute('data-value') ?? null);

/** the language a bound root renders (defuss-i18n writes `lang` on it) */
export const renderedLanguage = (page: Page | Frame, root: string): Promise<string | null> =>
  page.evaluate((root) => document.querySelector(root)?.getAttribute('lang') ?? null, root);
