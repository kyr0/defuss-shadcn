import type { Props } from 'defuss';
import { ALL_PAGES } from '../nav';

/** Prev/next pager, statically rendered at the end of <main> (replaces the
 * old runtime buildPrevNext injection — same markup, same order). */
export function PrevNext({ active }: Props & { active: string }) {
  const idx = ALL_PAGES.findIndex((p) => p.href === active);
  if (idx === -1) return null;
  const prev = idx > 0 ? ALL_PAGES[idx - 1] : null;
  const next = idx < ALL_PAGES.length - 1 ? ALL_PAGES[idx + 1] : null;
  if (!prev && !next) return null;
  return (
    <nav class="page-nav">
      {prev ? (
        <a class="page-nav-link page-nav-prev" href={prev.href}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          <div>
            <span class="page-nav-label">Previous</span>
            <span class="page-nav-title">{prev.label}</span>
          </div>
        </a>
      ) : (
        <div></div>
      )}
      {next ? (
        <a class="page-nav-link page-nav-next" href={next.href}>
          <div>
            <span class="page-nav-label">Next</span>
            <span class="page-nav-title">{next.label}</span>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </a>
      ) : null}
    </nav>
  );
}
