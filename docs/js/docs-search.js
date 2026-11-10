const $ = globalThis.df$;
const root = document.documentElement;
const docsRoot = new URL(root.getAttribute('data-docs-root') || '', location.href);
const dialog = $('#docs-palette').get(0);
const list = $('#docs-palette-list').get(0);
const input = dialog ? $(dialog).find('.command-input').get(0) : undefined;
const status = $('#docs-palette-status').get(0);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const languageName = (tag) => {
    try {
        return new Intl.DisplayNames(['en'], { type: 'language' }).of(tag) ?? tag;
    }
    catch {
        return tag;
    }
};
const saveData = () => {
    const connection = navigator.connection;
    return !!connection?.saveData;
};
let worker;
let lanes = { lexical: 'idle', semantic: 'idle' };
let asked = 0;
/** the static list's nodes while the worker's hits are shown */
let saved = null;
/** the worker's hits in place of the static list */
function showHits(hits) {
    if (!list || !dialog)
        return;
    if (!saved) {
        saved = $(list).children().toArray();
        $(saved).remove();
    }
    $(dialog).attr('data-filter', 'none');
    const items = hits
        .map((hit) => `<button class="command-item docs-hit" type="button" data-href="${esc(hit.id)}">` +
        `<span class="docs-hit-text"><span class="docs-hit-title">${esc(hit.title)}` +
        (hit.type ? ` <span class="type-badge" data-type="${esc(hit.type)}" title="${esc(hit.type)}">${esc(hit.type)}</span>` : '') +
        `</span>${hit.snippet ? `<span class="docs-hit-snippet">${esc(hit.snippet)}</span>` : ''}</span>` +
        `<span class="command-shortcut">${esc(hit.group)}</span></button>`)
        .join('');
    $(list).html(hits.length ? `<div class="command-group" data-docs-results>${items}</div>` : '');
}
/** the static list back, the component's own filter on again */
function showStatic() {
    if (!list || !dialog)
        return;
    if (saved) {
        $(list).empty();
        $(list).append(saved);
        saved = null;
    }
    $(dialog).attr('data-filter', null);
    showLanguage(undefined);
}
function showLanguage(language) {
    if (!status)
        return;
    const badge = $(status).find('[data-docs-search-language]');
    badge.text(language ? languageName(language) : '').attr('title', language ? `defuss-lid reads the query as ${languageName(language)}` : null);
    badge.prop('hidden', !language);
}
const PHASES = { documents: 'search index', tokens: 'token index', runtime: 'ONNX Runtime', model: 'model', index: 'index' };
function showStatus(event) {
    // a lane that just became ready answers the typed query again (keyword first, then keyword + semantic); a
    // progress report changes no lane and asks nothing
    const changed = event.lexical !== lanes.lexical || event.semantic !== lanes.semantic;
    lanes = { lexical: event.lexical, semantic: event.semantic };
    if (!status)
        return;
    $(status).prop('hidden', false).attr('data-lexical', event.lexical).attr('data-semantic', event.semantic);
    const mode = $(status).find('.docs-search-mode');
    const bar = $(status).find('progress');
    const offer = $(status).find('[data-docs-search-semantic]');
    let text = '';
    let progress;
    if (event.lexical !== 'ready')
        text = event.lexical === 'error' ? 'Search index unavailable - filtering the page list' : 'Loading the search index...';
    else if (event.semantic === 'ready')
        text = 'Keyword + semantic search';
    else if (event.semantic === 'loading') {
        text = `Keyword search - loading semantic search (${PHASES[event.phase ?? ''] ?? 'starting'})`;
        if (event.total)
            progress = Math.round((100 * (event.loaded ?? 0)) / event.total);
    }
    else if (event.semantic === 'error')
        text = 'Keyword search - semantic search unavailable';
    else
        text = 'Keyword search';
    mode.text(text).attr('title', event.error ?? null);
    bar.prop('hidden', progress === undefined);
    if (progress !== undefined)
        bar.prop('value', progress);
    offer.prop('hidden', !(event.lexical === 'ready' && event.semantic === 'idle'));
    if (changed && event.lexical === 'ready' && input?.value.trim())
        ask(input.value);
}
function onMessage({ data }) {
    if (data.type === 'status')
        showStatus(data);
    else if (data.type === 'results') {
        // a late answer to an earlier query, or to a query already cleared, shows nothing
        if (data.id !== asked || !input?.value.trim())
            return;
        showHits(data.hits);
        showLanguage(data.language);
    }
    else if (data.type === 'error' && status)
        $(status).find('.docs-search-mode').attr('title', data.message);
}
const send = (message) => worker?.postMessage(message);
function start(semantic) {
    if (worker || !dialog)
        return;
    worker = new Worker(new URL('js/search/search-worker.js', docsRoot), { type: 'module' });
    worker.addEventListener('message', onMessage);
    send({ type: 'start', manifest: new URL('search/manifest.json', docsRoot).href, semantic });
}
function ask(text) {
    const query = text.trim();
    if (!query)
        return showStatic();
    if (lanes.lexical !== 'ready')
        return; // the component's text filter answers until then
    asked += 1;
    send({ type: 'search', id: asked, text: query });
}
if (dialog && list && input) {
    $(input).on('input', () => {
        start(!saveData());
        ask(input.value);
    });
    // the component clears the query on close; the static list returns with it
    $(dialog).on('close', () => {
        if (!dialog.open)
            showStatic();
    });
    if (status)
        $(status)
            .find('[data-docs-search-semantic]')
            .on('click', () => send({ type: 'semantic' }));
    // after the page's own requests: the load event, then an idle moment
    const idle = () => {
        const later = globalThis.requestIdleCallback;
        if (later)
            later(() => start(!saveData()), { timeout: 5000 });
        else
            setTimeout(() => start(!saveData()), 1500);
    };
    if (document.readyState === 'complete')
        idle();
    else
        addEventListener('load', idle, { once: true });
}
export {};
