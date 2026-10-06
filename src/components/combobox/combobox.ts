// -- Combobox -------------------------------------------------
// Searchable select with keyboard navigation and popover positioning, plus
// the named-state API bound per dropdown popover, so agents/tests can open
// and close it by name (AGENTS.md "State API").

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
// defussQuery: the callable runtime for scoped lookup + scalar writes
// (plans/defuss-query-morph-integration.md §3 combobox row: filtering an
// existing consumer-authored list is flag-based - NO full renderer; options
// keep node identity, only hidden/aria flags change).
import { defussGlobals, defussQuery, safeShowPopover, componentState, bindComponent } from '../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

// VERIFIED: (verify's component types ratchet - tsc -p tsconfig.components.json) every type
// this file's API docs state - arguments, return values, event details - holds
// against its code: a wrong one is a new type error and fails the build.

/** What combobox:change carries. */
interface ComboboxChangeDetail {
  /** the values of the selected options, in option order */
  values: string[];
  /** their labels, in the same order */
  labels: string[];
  /** a value just created from typed text (multiple + data-creatable), null when none; absent on a single-select */
  created?: string | null;
}

const comboboxStates = ['default', 'open'];

/** setState() configs per state - the states take none; getState() reports the selection. */
export interface ComboboxStateConfigs {
  /** The list closed. */
  default: {
    /** reported by getState(): the chosen label (several joined with ", ") */
    value?: string;
    /** reported by getState(): every chosen option's data-value (else its text), in list order */
    values?: string[];
    /** reported by getState(): the chosen options' texts, in the same order */
    labels?: string[];
  };
  /** The list open (the popover shown). */
  open: {
    /** reported by getState(): the chosen label (several joined with ", ") */
    value?: string;
    /** reported by getState(): every chosen option's data-value (else its text), in list order */
    values?: string[];
    /** reported by getState(): the chosen options' texts, in the same order */
    labels?: string[];
  };
}

/**
 * The markup of a state: none - 'open' lives in the top layer
 * (:popover-open), not in an attribute, so every state renders the authored
 * markup. render() stays the State API's markup function all the same.
 */
function applyMarkup(_el, _stateName) {}

/**
 * UI side of setState (per popover): 'default' closes, 'open' shows. The
 * wrapper's own open()/close() (registered at init) keep aria-expanded,
 * highlight and focus bookkeeping in one place.
 */
function triggerStateChange(popover, stateName, _config) {
  switch (stateName) {
    case 'default':
      popover._close?.();
      break;
    case 'open':
      popover._open?.();
      break;
  }
}

/** Registry-level API; pass the popover element explicitly. Unknown names throw. */
export const comboboxApi = componentState({
  component: 'combobox',
  states: comboboxStates,
  apply: (popover, state) => triggerStateChange(popover, state.name, state.config),
  read: (popover, state) => {
    const selected = Array.from(dfDollar(popover).find('[role="option"][aria-selected="true"]').toArray()) as HTMLElement[];
    const labels = selected.map((o) => o.textContent?.trim() ?? '');
    return {
      // reflect reality: trigger clicks and Escape change the UI too
      name: popover.matches(':popover-open') ? 'open' : 'default',
      // value: the chosen label (joined in multi-select); values / labels:
      // every chosen option's data-value / text, in list order
      config: {
        ...state.config,
        value: labels.join(', '),
        values: selected.map((o) => o.dataset.value ?? o.textContent?.trim() ?? ''),
        labels,
      },
    };
  },
  markup: (el, state) => applyMarkup(el, state.name),
});

df$.comboboxApi = comboboxApi;
df$.comboboxStates = comboboxStates;

/** Escape text for the tag/hidden-input markup rendered through morph. */
const esc = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** A value that is safe inside an element id. */
const idPart = (t: string) => t.replace(/[^\w-]/g, '_');
let comboSeq = 0;

/**
 * Tag input (data-tags on a data-multiple .combobox): the chosen options sit
 * as removable tags INSIDE a field-like box (.combobox-field) next to the
 * text input the user types into - no trigger button. Typing opens and
 * filters the list; Enter picks the EXACT match (case-insensitive) or, with
 * data-creatable, creates a new tag from the text ("Create …" row); arrow
 * keys can pick any other listed option instead. Comma commits like Enter,
 * Backspace in the empty input removes the last tag, Escape closes the list.
 * Created tags become real options (data-created) so they can be toggled
 * like the rest. data-name renders one hidden input per value.
 */
function initTags(wrapper: HTMLElement) {
  const field = dfDollar(wrapper).find('.combobox-field').get(0) as HTMLElement | null;
  const input = dfDollar(wrapper).find('.combobox-field-input').get(0) as HTMLInputElement | null;
  const popover = dfDollar(wrapper).find('.combobox-content').get(0) as HTMLElement | null;
  const listbox = dfDollar(wrapper).find('[role="listbox"]').get(0) as HTMLElement | null;
  if (!field || !input || !popover || !listbox) return;
  const empty = dfDollar(wrapper).find('.combobox-empty').get(0) as HTMLElement | null;
  const creatable = wrapper.hasAttribute('data-creatable');
  const uid = wrapper.id || popover.id || `dfcb-${++comboSeq}`;
  const options = () => Array.from(dfDollar(listbox).find('[role="option"]:not(.combobox-create)').toArray()) as HTMLElement[];
  const valueOf = (o: HTMLElement) => o.dataset.value ?? o.textContent!.trim();
  const labelOf = (o: HTMLElement) => o.textContent!.trim();

  dfDollar(listbox).attr('aria-multiselectable', 'true');
  // anchor the list to the whole field (not just the input)
  const anchorId = `--combobox-${uid}`;
  dfDollar(field).css('anchorName', anchorId);
  dfDollar(popover).css('positionAnchor', anchorId);

  // tags live inside the field, before the input
  const tags = document.createElement('span');
  tags.className = 'combobox-tags';
  dfDollar(input).before(tags);

  // the "Create …" row, shown while the text matches no option exactly
  let createRow: HTMLElement | null = null;
  if (creatable) {
    createRow = document.createElement('div');
    createRow.className = 'combobox-item combobox-create';
    createRow.id = `${uid}-create`;
    createRow.setAttribute('role', 'option');
    createRow.setAttribute('aria-selected', 'false');
    createRow.hidden = true;
    dfDollar(listbox).append(createRow);
  }

  let highlighted: HTMLElement | null = null;
  const highlight = (el: HTMLElement | null) => {
    if (highlighted) dfDollar(highlighted).data('highlighted', null);
    highlighted = el;
    if (el) {
      dfDollar(el).data('highlighted', '');
      el.scrollIntoView({ block: 'nearest' });
      dfDollar(input).attr('aria-activedescendant', el.id);
    } else dfDollar(input).attr('aria-activedescendant', null);
  };
  const visible = () => [...options(), ...(createRow ? [createRow] : [])].filter((o) => !o.hidden && o.getAttribute('aria-disabled') !== 'true');
  const isOpen = () => popover.matches(':popover-open');
  const open = () => {
    if (!isOpen()) safeShowPopover(popover);
    dfDollar(input).attr('aria-expanded', 'true');
  };
  const close = () => {
    if (isOpen()) popover.hidePopover();
    dfDollar(input).attr('aria-expanded', 'false');
    highlight(null);
  };
  // the State API, like every other combobox: setState('open' | 'default')
  // drives the list (the tag path returns before the main init binds it -
  // without this the docs' State "open" switch did nothing on a tag input)
  (popover as any)._open = () => { open(); filter(); };
  (popover as any)._close = close;
  // el.store + el.api (AGENTS.md "State through stores")
  bindComponent(popover, comboboxApi);

  /** Filter by the typed text; auto-highlight the exact match, else the create row. */
  const filter = () => {
    const text = input.value.trim();
    const q = text.toLowerCase();
    let exact: HTMLElement | null = null;
    let any = false;
    for (const o of options()) {
      const match = !q || labelOf(o).toLowerCase().includes(q);
      dfDollar(o).prop('hidden', !match);
      if (match) any = true;
      if (q && labelOf(o).toLowerCase() === q) exact = o;
    }
    if (createRow) {
      const showCreate = !!text && !exact;
      dfDollar(createRow).prop('hidden', !showCreate);
      if (showCreate) dfDollar(createRow).text(`Create "${text}"`); // literal text (§5.2)
    }
    if (empty) dfDollar(empty).prop('hidden', any || (!!createRow && !createRow.hidden));
    highlight(exact ?? (createRow && !createRow.hidden ? createRow : !creatable ? visible()[0] ?? null : null));
  };

  /** Tags + hidden inputs + combobox:change - the tag input's single renderer. */
  const render = (announce = true, created: string | null = null) => {
    const chosen = options().filter((o) => o.getAttribute('aria-selected') === 'true');
    const labels = chosen.map(labelOf);
    const values = chosen.map(valueOf);
    const name = wrapper.dataset.name;
    dfDollar(tags).morph(
      labels
        .map((label, i) => `<span class="combobox-tag" id="${uid}-tag-${idPart(values[i])}">${esc(label)}<button type="button" class="combobox-tag-remove" data-value="${esc(values[i])}" aria-label="Remove ${esc(label)}" tabindex="-1"><svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></span>`)
        .join('') +
        (name ? values.map((v) => `<input type="hidden" name="${esc(name)}" value="${esc(v)}" id="${uid}-input-${idPart(v)}">`).join('') : ''),
    ); // escaped text + static icon (§5.1)
    // the placeholder only while there are no tags (it would read as a value)
    if (input.dataset.placeholder === undefined) input.dataset.placeholder = input.placeholder;
    input.placeholder = labels.length ? '' : input.dataset.placeholder;
    // Fires when the user changes the selection - the selected values, their labels, and the values created from typed text.
    if (announce) wrapper.dispatchEvent(new CustomEvent<ComboboxChangeDetail>('combobox:change', { bubbles: true, detail: { values, labels, created } }));
  };

  /** Commit: exact match / highlighted row / new tag from the text. */
  const commit = (row: HTMLElement | null) => {
    const text = input.value.trim();
    let created: string | null = null;
    // (createRow &&: without data-creatable both are null - never "create")
    if ((createRow && row === createRow) || (!row && creatable && text)) {
      if (!text) return;
      // an exact match (maybe filtered out by a stale highlight) wins over creating
      const exact = options().find((o) => labelOf(o).toLowerCase() === text.toLowerCase());
      if (exact) row = exact;
      else {
        const option = document.createElement('div');
        option.className = 'combobox-item';
        option.setAttribute('role', 'option');
        option.dataset.value = text;
        option.dataset.created = '';
        option.id = `${uid}-opt-${idPart(text)}-${options().length}`;
        dfDollar(option).text(text); // literal user text (§5.2)
        if (createRow) dfDollar(createRow).before(option);
        else dfDollar(listbox).append(option);
        row = option;
        created = text;
      }
      dfDollar(row).attr('aria-selected', 'true');
    } else if (row) {
      if (row.getAttribute('aria-disabled') === 'true') return;
      // typed to find it → add; clicked / arrowed on a chosen one → toggle off
      const on = row.getAttribute('aria-selected') === 'true';
      dfDollar(row).attr('aria-selected', on && !text ? 'false' : 'true');
    } else return;
    dfDollar(input).val('');
    render(true, created);
    filter();
    input.focus();
  };

  render(false);
  filter();

  field.addEventListener('mousedown', (e) => {
    // clicks on the box (not a tag button) focus the input
    if (!(e.target as HTMLElement).closest('button, input')) {
      e.preventDefault();
      input.focus();
    }
  });
  tags.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.combobox-tag-remove') as HTMLElement | null;
    if (!btn) return;
    const option = options().find((o) => valueOf(o) === btn.dataset.value);
    if (option) dfDollar(option).attr('aria-selected', 'false');
    render();
    filter();
    input.focus();
  });
  input.addEventListener('focus', () => { open(); filter(); });
  input.addEventListener('input', () => { open(); filter(); });
  input.addEventListener('keydown', (e) => {
    const rows = visible();
    const at = highlighted ? rows.indexOf(highlighted) : -1;
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); open(); highlight(rows[Math.min(at + 1, rows.length - 1)] ?? null); break;
      case 'ArrowUp': e.preventDefault(); highlight(rows[Math.max(at - 1, 0)] ?? null); break;
      case 'Enter': e.preventDefault(); commit(highlighted); break;
      case ',': if (input.value.trim()) { e.preventDefault(); commit(highlighted); } break;
      case 'Backspace': {
        if (input.value !== '') break;
        const chosen = options().filter((o) => o.getAttribute('aria-selected') === 'true');
        const last = chosen[chosen.length - 1];
        if (!last) break;
        e.preventDefault();
        dfDollar(last).attr('aria-selected', 'false');
        render();
        filter();
        break;
      }
      case 'Escape': e.preventDefault(); close(); break;
      case 'Tab': close(); break;
    }
  });
  // pointer picks keep focus in the input (mousedown default would blur it)
  listbox.addEventListener('mousedown', (e) => e.preventDefault());
  listbox.addEventListener('click', (e) => {
    const row = (e.target as HTMLElement).closest('[role="option"]') as HTMLElement | null;
    if (row && !row.hidden) commit(row);
  });
  listbox.addEventListener('mousemove', (e) => {
    const row = (e.target as HTMLElement).closest('[role="option"]') as HTMLElement | null;
    if (row && !row.hidden && row !== highlighted) highlight(row);
  });
  // leaving the whole widget closes the list
  wrapper.addEventListener('focusout', (e) => {
    if (!wrapper.contains(e.relatedTarget as Node) && !popover.contains(e.relatedTarget as Node)) close();
  });
  // toggle events are queued: a close fired just before a re-open arrives after
  // it - mirror the popover's REAL state instead of assuming "closed"
  popover.addEventListener('toggle', () => { dfDollar(input).attr('aria-expanded', String(isOpen())); });
}

function init() {
  dfDollar('.combobox:not([data-init])').toArray().forEach((wrapper) => {
    wrapper.dataset.init = '';
    if (wrapper.hasAttribute('data-tags')) {
      initTags(wrapper as HTMLElement);
      return;
    }
    // scoped lookup through query (§3 direct integration); raw refs below are
    // kept only for native protocols (showPopover/focus/anchor wiring)
    const $wrapper = dfDollar(wrapper);
    const $trigger = $wrapper.find('.combobox-trigger');
    const $value = $wrapper.find('.combobox-value');
    const $popover = $wrapper.find('.combobox-content');
    const $search = $wrapper.find('.combobox-search-input');
    const $listbox = $wrapper.find('[role="listbox"]');
    const $empty = $wrapper.find('.combobox-empty');
    const trigger = $trigger[0] as HTMLElement | undefined;
    const popover = $popover[0] as HTMLElement | undefined;
    const searchInput = $search[0] as HTMLInputElement | undefined;
    const listbox = $listbox[0] as HTMLElement | undefined;
    if (!trigger || !popover || !searchInput || !listbox) return;

    // options are consumer-authored: a snapshot selection, flagged in place
    const allItems = $listbox.find('[role="option"]');
    let highlighted = -1;

    // CSS anchor positioning - unique name per trigger-popover pair
    const anchorId = `--combobox-${popover.id}`;
    $trigger.css('anchorName', anchorId);
    $popover.css('positionAnchor', anchorId);

    // Clear button - injected so consumer markup stays minimal (and the
    // button can't be nested in the trigger's <button>). Visibility is pure
    // CSS: .combobox-clear shows exactly while data-placeholder is absent
    // (combobox.css :has() rule); JS only wires the click and focus.
    // Trusted static icon markup (sanctioned §5.1 exception); inserted via
    // query's exact .after() so lifecycle goes through one adapter.
    const placeholder = $value.data('placeholder') ?? '';
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'combobox-clear';
    clearBtn.setAttribute('aria-label', 'Clear selection');
    dfDollar(clearBtn).html(
      '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    ); // trusted static icon markup (§5.1)
    dfDollar(clearBtn).css('positionAnchor', anchorId);
    $trigger.after(clearBtn);
    // -- Multi-select (data-multiple) ----------------------------------------
    // Several options at once: toggling keeps the popover open, the chosen
    // options show as removable tags BELOW the trigger (buttons may not nest
    // inside the trigger <button>), and data-name renders one hidden input
    // per value so the choice submits with the form.
    const multiple = wrapper.hasAttribute('data-multiple');
    const uid = wrapper.id || popover.id || `dfcb-${++comboSeq}`;
    let tags: HTMLElement | null = null;
    if (multiple) {
      $listbox.attr('aria-multiselectable', 'true');
      tags = document.createElement('div');
      tags.className = 'combobox-tags';
      tags.setAttribute('role', 'list');
      tags.setAttribute('aria-label', `Selected ${trigger.getAttribute('aria-label') || dfDollar('#' + CSS.escape(trigger.getAttribute('aria-labelledby') || '')).get(0)?.textContent?.trim() || 'options'}`);
      dfDollar(clearBtn).after(tags);
      // a tag's × removes its option; focus moves to the neighbouring tag
      // (or back to the trigger) so keyboard users never lose their place
      tags.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('.combobox-tag-remove') as HTMLElement | null;
        if (!btn) return;
        const option = Array.from(allItems).find((o) => (o.dataset.value ?? o.textContent.trim()) === btn.dataset.value);
        const all = dfDollar(tags!).find('.combobox-tag-remove').toArray() as HTMLElement[];
        const at = all.indexOf(btn);
        if (option) dfDollar(option).attr('aria-selected', 'false');
        renderSelection();
        const rest = dfDollar(tags!).find('.combobox-tag-remove').toArray() as HTMLElement[];
        (rest[Math.min(at, rest.length - 1)] ?? trigger).focus();
      });
    }

    /**
     * Mirror the selection into the trigger label (placeholder when empty,
     * the chosen labels otherwise), the tags + hidden inputs (multi), and
     * announce it as combobox:change { values, labels }.
     */
    const renderSelection = (announce = true) => {
      const chosen = Array.from(allItems).filter((o) => o.getAttribute('aria-selected') === 'true');
      const labels = chosen.map((o) => o.textContent.trim());
      const values = chosen.map((o) => o.dataset.value ?? o.textContent.trim());
      // multi: the tags below already list every choice - the trigger shows a
      // summary instead of repeating them: the one label, else "{n} selected"
      // (data-selected-label on .combobox-value translates it, {n} = count)
      const summary = multiple && labels.length > 1
        ? ($value.data('selectedLabel') ?? '{n} selected').replace('{n}', String(labels.length))
        : labels.join(', ');
      if (labels.length) $value.text(summary).attr('data-placeholder', null);
      else $value.text(placeholder).attr('data-placeholder', placeholder);
      if (tags) {
        const name = wrapper.dataset.name;
        dfDollar(tags).morph(
          labels
            .map((label, i) => `<span class="combobox-tag" role="listitem" id="${uid}-tag-${idPart(values[i])}">${esc(label)}<button type="button" class="combobox-tag-remove" data-value="${esc(values[i])}" aria-label="Remove ${esc(label)}"><svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></span>`)
            .join('') +
            (name ? values.map((v) => `<input type="hidden" name="${esc(name)}" value="${esc(v)}" id="${uid}-input-${idPart(v)}">`).join('') : ''),
        ); // escaped option text + static icon (§5.1: text is never parsed as markup)
      }
      if (announce) wrapper.dispatchEvent(new CustomEvent<ComboboxChangeDetail>('combobox:change', { bubbles: true, detail: { values, labels } }));
    };
    // authored aria-selected="true" options are the initial selection
    if (multiple) renderSelection(false);

    clearBtn.addEventListener('click', () => {
      allItems.attr('aria-selected', 'false');
      // placeholder text + data-placeholder are re-declared by renderSelection:
      // the latter is the very marker the CSS :has() rule keys off to hide
      // this button again
      renderSelection();
      // the button goes display:none with the selection - keep focus usable
      trigger.focus();
    });

    const getVisibleItems = () => allItems.filter((item) => !item.hidden && item.getAttribute('aria-disabled') !== 'true');
    const open = () => {
      // deferred show (safeShowPopover): showPopover() mid-exit crashes the
      // headless renderer; hide-then-show is deterministic everywhere.
      safeShowPopover(popover);
      $trigger.attr('aria-expanded', 'true');
      $search.val('');
      filter('');
      searchInput.focus();
    };
    const close = () => {
      popover.hidePopover();
      $trigger.attr('aria-expanded', 'false');
      $search.attr('aria-activedescendant', '');
      clearHighlight();
      trigger.focus();
    };
    // expose for the State API (element members, not module scope)
    popover._open = open;
    popover._close = close;
    // bind-scope the api per popover: `$('#cb-popover').api.setState('open')`
    // el.store + el.api (AGENTS.md "State through stores")
    bindComponent(popover, comboboxApi);
    const isOpen = () => popover.matches(':popover-open');
    // flag-based filtering: hidden props toggle IN PLACE (nodes are never
    // replaced - identity, focus and caret survive), per §3's no-renderer rule
    const filter = (query) => {
      const q = query.toLowerCase(); let hasVisible = false;
      allItems.forEach((item) => { const match = !q || item.textContent.trim().toLowerCase().includes(q); dfDollar(item).prop('hidden', !match); if (match) hasVisible = true; });
      $listbox.find('.combobox-group-label').each(function (this: HTMLElement) {
        const label = this;
        let next = label.nextElementSibling; let groupHasVisible = false;
        while (next && !next.classList.contains('combobox-group-label') && !next.classList.contains('combobox-separator')) {
          if (next.getAttribute('role') === 'option' && !next.hidden) groupHasVisible = true; next = next.nextElementSibling;
        }
        dfDollar(label).prop('hidden', !groupHasVisible);
      });
      $listbox.find('.combobox-separator').each(function (this: HTMLElement) { const sep = this; const prev = sep.previousElementSibling; const next = sep.nextElementSibling; dfDollar(sep).prop('hidden', Boolean((prev && prev.hidden) || (next && next.hidden))); });
      if ($empty.length) $empty.prop('hidden', hasVisible);
    };
    const clearHighlight = () => { allItems.data('highlighted', null); highlighted = -1; };
    const doHighlight = (index) => {
      const items = getVisibleItems(); clearHighlight();
      if (index < 0 || index >= items.length) return;
      highlighted = index; dfDollar(items[index]).data('highlighted', '');
      items[index].scrollIntoView({ block: 'nearest' });
      $search.attr('aria-activedescendant', items[index].id);
    };
    const selectItem = (item) => {
      if (item.getAttribute('aria-disabled') === 'true') return;
      if (multiple) {
        // toggle, keep the list open and the search focused for the next pick
        dfDollar(item).attr('aria-selected', item.getAttribute('aria-selected') === 'true' ? 'false' : 'true');
        renderSelection();
        searchInput.focus();
        return;
      }
      allItems.attr('aria-selected', 'false');
      dfDollar(item).attr('aria-selected', 'true');
      // trigger label mirrors the option's literal text (§3: query .text())
      renderSelection();
      close();
    };
    trigger.addEventListener('click', () => { if (isOpen()) { close(); } else { open(); } });
    searchInput.addEventListener('input', () => { filter(searchInput.value); doHighlight(0); });
    searchInput.addEventListener('keydown', (e) => {
      const items = getVisibleItems();
      switch (e.key) {
        case 'ArrowDown': e.preventDefault(); doHighlight(Math.min(highlighted + 1, items.length - 1)); break;
        case 'ArrowUp': e.preventDefault(); doHighlight(Math.max(highlighted - 1, 0)); break;
        case 'Home': e.preventDefault(); doHighlight(0); break;
        case 'End': e.preventDefault(); doHighlight(items.length - 1); break;
        case 'Enter': e.preventDefault(); if (highlighted >= 0 && items[highlighted]) selectItem(items[highlighted]); break;
        case 'Escape': e.preventDefault(); close(); break;
        case 'Tab': close(); break;
        case 'Backspace': {
          // multi: Backspace in an empty search removes the last chosen option
          if (!multiple || searchInput.value !== '') break;
          const chosen = Array.from(allItems).filter((o) => o.getAttribute('aria-selected') === 'true');
          const last = chosen[chosen.length - 1];
          if (!last) break;
          e.preventDefault();
          dfDollar(last).attr('aria-selected', 'false');
          renderSelection();
          break;
        }
      }
    });
    listbox.addEventListener('click', (e) => { const item = e.target.closest('[role="option"]'); if (item && !item.hidden && item.getAttribute('aria-disabled') !== 'true') selectItem(item); });
    listbox.addEventListener('mousemove', (e) => { const item = e.target.closest('[role="option"]'); if (item && !item.hidden) { const items = getVisibleItems(); doHighlight(items.indexOf(item)); } });
    popover.addEventListener('toggle', () => {
      // queued toggle events may arrive after a re-open - mirror the real state
      const nowOpen = popover.matches(':popover-open');
      $trigger.attr('aria-expanded', String(nowOpen));
      if (!nowOpen) clearHighlight();
    });
  });
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });

