/**
 * Why: a number or a date is formatted in the language of the text around it,
 * never in the browser's - "Item 1,284 of 250,000" in an English sentence on
 * a German browser came out as "1.284 of 250.000", and a counter in an
 * English deck animated "1.000,0 → 135,9". The text's language is the nearest
 * `lang` attribute (the page's <html lang>, or a part authored in another
 * language); without one the system's own strings are English, so is the
 * format. Emitted once in core - components, the docs runtime and pages bind
 * to `df$.shadcn.shared.textLocale`.
 */
export const DEFAULT_LOCALE = 'en';

/** a lang value Intl accepts (lang="" or a malformed tag would make Intl throw) */
function valid(tag: string | null | undefined): string | null {
  const t = tag?.trim();
  if (!t) return null;
  try {
    return Intl.getCanonicalLocales(t)[0] ?? null;
  } catch {
    return null;
  }
}

/** The locale to format for `el`: its nearest [lang], else the document's, else 'en'. */
export function textLocale(el?: Element | null): string {
  return (
    valid(el?.closest?.('[lang]')?.getAttribute('lang')) ??
    valid(typeof document !== 'undefined' ? document.documentElement?.getAttribute('lang') : null) ??
    DEFAULT_LOCALE
  );
}
