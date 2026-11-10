// -- whats-new.ts - the "What's new" marks of this browser (bundled into js/head.js) ----------------
// Which pages a reader has not seen: the releases since their last visit (else the newest), minus the pages opened
// since (whats-new-core.ts decides, prefs.whatsNew keeps it). On every page - the first load and after each SPA
// navigation - the page shown counts as opened, the sidebar's dots show on the links and the sections that hold
// unseen pages, and the front page's "What's new" dialog and its trigger say the same.
// A page the reader had not opened yet also says what is new on it: its examples a fresh release added or changed
// (their labels carry data-whats-new-example, the whats-new-examples build plugin) get a dot, and a note at the top
// links them - written with df$ (defuss-morph), gone on the next visit. The changelog gathers every unseen page with
// its examples into "New for you" above its releases; with nothing unseen it stays hidden.
// VERIFIED: (documentation.e2e "What's new") the front page's own mark never shows on a first visit (it is the page
// shown), a page opened by a full load keeps its mark cleared on the next page, an unseen page lists and marks its
// changed examples once, and the changelog's "New for you" lists only the unseen pages.
import { prefs } from './prefs.js';
import { freshVersions, markOf, opened, visit, type WhatsNewSeen } from './whats-new-core.js';

(function () {
  'use strict';
  const root = document.documentElement;
  const versions = (root.getAttribute('data-whats-new') || '').split(/\s+/).filter(Boolean);
  if (!versions.length) return;

  let state: WhatsNewSeen = visit(prefs.whatsNew.value, versions);
  if (state !== prefs.whatsNew.value) prefs.whatsNew.set(state);

  const idOf = (path: string | null): string => (path || 'index.html').replace(/^.*\//, '').replace(/\.html$/, '');
  const esc = (v: string): string =>
    v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
  const LABEL = { created: 'New', updated: 'Updated' } as const;
  const VARIANT = { created: 'info', updated: 'success' } as const;

  /** a heading's own text - its permalink's glyph left out */
  const textOf = ($: any, el: HTMLElement): string =>
    String($(el).text() || '')
      .replace(String($(el).find('.heading-anchor').text() || '\u0000'), '')
      .trim();

  /** the page's own note and example dots: shown when the reader arrives on a page they had not opened */
  function pageNews($: any, arrival: 'created' | 'updated' | null, fresh: Set<string>): void {
    $('main [data-whats-new-mark]').remove();
    $('main [data-whats-new-here]').remove();
    if (!arrival) return;
    const items: { id: string; text: string; kind: 'created' | 'updated' }[] = [];
    for (const el of $('main [data-whats-new-example]').toArray() as HTMLElement[]) {
      const kind = markOf(el.getAttribute('data-whats-new-example') || '', fresh, [], '');
      if (!kind || !el.id) continue;
      items.push({ id: el.id, text: textOf($, el), kind });
      $(el).append(
        $(
          `<span class="indicator-dot whats-new-mark" data-whats-new-mark data-variant="${VARIANT[kind]}" role="img" aria-label="${LABEL[kind]}" title="${LABEL[kind]}"></span>`,
        ),
      );
    }
    const changelog = $('a.sidebar-link[data-page$="/changelog.html"]').attr('data-page');
    const docsRoot = new URL(root.getAttribute('data-docs-root') || '', location.href);
    const log = changelog ? ` - the <a class="link" href="${esc(new URL(changelog, docsRoot).href)}">changelog</a> says what` : '';
    const body =
      arrival === 'created'
        ? `<p class="alert-description">This page is new since your last visit.</p>`
        : items.length
          ? `<ul class="alert-description whats-new-here-list">${items
              .map(
                (i) =>
                  `<li><a class="link" href="#${esc(i.id)}">${esc(i.text)}</a> <span class="whats-new-kind-tag">${i.kind === 'created' ? 'new' : 'changed'}</span></li>`,
              )
              .join('')}</ul>`
          : `<p class="alert-description">This page changed since your last visit${log}.</p>`;
    const note = $(
      `<div class="alert whats-new-here" data-whats-new-here role="note" aria-label="What's new on this page"><div class="alert-content"><h5 class="alert-title">What's new on this page</h5>${body}</div></div>`,
    );
    const after = $('main .page-toc').get(0) ?? $('main .page-header').get(0);
    if (after) $(after).after(note);
  }

  /** the changelog's "New for you": every unseen page of a fresh release, with its changed examples */
  function forYou($: any, marks: Map<string, 'created' | 'updated'>, fresh: Set<string>): void {
    const box = $('[data-whats-new-for-you]').get(0) as HTMLElement | undefined;
    if (!box) return;
    const rows = new Map<string, string>();
    for (const block of $('[data-whats-new-pages]').toArray() as HTMLElement[]) {
      if (!fresh.has(block.getAttribute('data-whats-new-pages') || '')) continue;
      for (const li of $(block).find('[data-whats-new-page]').toArray() as HTMLElement[]) {
        const id = li.getAttribute('data-whats-new-page') || '';
        if (marks.has(id) && !rows.has(id)) rows.set(id, `<li data-whats-new-page="${esc(id)}">${$(li).html() || ''}</li>`);
      }
    }
    box.hidden = !rows.size;
    $(box).html(
      rows.size
        ? `<h2 class="whats-new-for-you-title">New for you</h2><p class="text-sm text-muted-foreground mt-0">The pages and examples changed since your last visit that you have not opened yet.</p><ul class="whats-new-list whats-new-tree">${[...rows.values()].join('')}</ul>`
        : '',
    );
  }

  /** the marks on the page as this browser should see them */
  function apply(): void {
    const $ = (globalThis as any).df$;
    if (!$) return;
    const fresh = freshVersions(versions, state.baseline);
    const links = $('a.sidebar-link[data-whats-new]').toArray() as HTMLElement[];
    // the page shown is opened - after the page has said what is new on it
    const here = idOf(root.getAttribute('data-page'));
    const own = links.find((a) => idOf(a.getAttribute('data-page')) === here);
    const arrival = own ? markOf(own.getAttribute('data-whats-new') || '', fresh, state.seen, here) : null;
    if (arrival) {
      state = opened(state, here);
      prefs.whatsNew.set(state);
    }
    pageNews($, arrival, fresh);
    const marks = new Map<string, 'created' | 'updated'>();
    for (const a of links) {
      const id = idOf(a.getAttribute('data-page'));
      const mark = markOf(a.getAttribute('data-whats-new') || '', fresh, state.seen, id);
      if (mark) {
        a.setAttribute('data-unseen', mark);
        marks.set(id, mark);
      } else a.removeAttribute('data-unseen');
    }
    // a dot on a link shows its page's mark; in a section's or a submenu's summary, the first unseen page inside it
    for (const dot of $('[data-whats-new-dot]').toArray() as HTMLElement[]) {
      const summary = dot.closest('summary');
      const host = summary ? summary.parentElement : dot.closest('a');
      const mark = host?.matches('a')
        ? host.getAttribute('data-unseen')
        : ($(host).find('a[data-unseen="created"]').get(0) ? 'created' : $(host).find('a[data-unseen]').get(0) ? 'updated' : null);
      dot.hidden = !mark;
      if (!mark) continue;
      dot.setAttribute('data-variant', VARIANT[mark as 'created' | 'updated']);
      dot.setAttribute('aria-label', LABEL[mark as 'created' | 'updated']);
      dot.setAttribute('title', LABEL[mark as 'created' | 'updated']);
    }
    // the front page's dialog and the changelog: the releases, their pages and examples, the count on the trigger
    for (const el of $('[data-whats-new-release]').toArray() as HTMLElement[]) {
      const isFresh = fresh.has(el.getAttribute('data-whats-new-release') || '');
      el.toggleAttribute('data-fresh', isFresh);
      const badge = $(el).find('[data-whats-new-fresh]').get(0) as HTMLElement | undefined;
      if (badge) badge.hidden = !isFresh;
    }
    for (const el of $('[data-whats-new-item]').toArray() as HTMLElement[]) {
      const mark = marks.get(el.getAttribute('data-whats-new-item') || '');
      if (mark) el.setAttribute('data-unseen', mark);
      else el.removeAttribute('data-unseen');
    }
    for (const el of $('[data-whats-new-example-link]').toArray() as HTMLElement[]) {
      const release = el.closest('[data-whats-new-pages]')?.getAttribute('data-whats-new-pages') || '';
      if (marks.has(el.getAttribute('data-whats-new-example-link') || '') && fresh.has(release))
        el.setAttribute('data-unseen', el.getAttribute('data-kind') || 'updated');
      else el.removeAttribute('data-unseen');
    }
    forYou($, marks, fresh);
    for (const el of $('[data-whats-new-count]').toArray() as HTMLElement[]) {
      $(el).text(String(marks.size));
      el.hidden = !marks.size;
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    const docs = (globalThis as any).df$?.shadcn?.docs;
    if (docs) {
      // the docs' handle on it (tests, a "mark all as seen")
      docs.whatsNew = {
        state: () => state,
        seeAll: () => {
          state = { visited: versions[0], baseline: versions[0], seen: [] };
          prefs.whatsNew.set(state);
          apply();
        },
      };
    }
    if (docs?.onPageReady) docs.onPageReady(apply);
    else apply();
  });
})();
