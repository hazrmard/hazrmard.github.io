// Shared setup for <geo-timeline> and <geo-story>: loading a timeline,
// the context every view reads, and the explorer (toolbar, filters, list,
// map view).

import { loadParsers } from './deps.js';
import { load, fetchText } from './model/load.js';
import { normalize, fold } from './model/normalize.js';
import { validate } from './model/validate.js';
import { selectEvents } from './model/query.js';
import { formatWhen } from './model/dates.js';
import { h } from './views/dom.js';
import { createScrollView } from './views/scroll.js';
import { createFilters, toggleFilter } from './views/filters.js';
import { createChartRenderer } from './views/charts.js';
import { createTracks } from './views/tracks.js';
import { createGeoView, createViewSwitch } from './views/geo.js';
import { createThreads } from './views/threads.js';
import { logDiagnostics } from './views/debug.js';

export const STYLE_URL = new URL('./styles.css', import.meta.url).href;
let instances = 0;

// Height of anything fixed to the top of the viewport (a site header), so
// sticky controls sit below it.
export function topOffset(host) {
    const x = innerWidth / 2;
    for (const el of document.elementsFromPoint(x, 1)) {
        if (host.contains(el) || el === document.documentElement || el === document.body) continue;
        const pos = getComputedStyle(el).position;
        if (pos === 'fixed' || pos === 'sticky') return Math.round(el.getBoundingClientRect().bottom);
    }
    return 0;
}

// The page's heading font, so cards match the surrounding post.
export function headingFont() {
    const heading = document.querySelector('h1, h2');
    return heading ? getComputedStyle(heading).fontFamily : null;
}

export async function loadModel(src, { extraEvents = [] } = {}) {
    const parsers = await loadParsers();
    const loaded = await load(src, { fetchText, yamlLoad: parsers.yamlLoad }, { extraEvents });
    const model = validate(normalize(loaded, parsers));
    logDiagnostics(model.diagnostics, model.title || src);
    return { model, parsers };
}

export const hasMap = model => model.events.some(e => e.where.some(w => w.lat !== null))
    && Boolean(model.basemap.world || model.basemap.regions.size);

// The context views share. `select(state)` returns the matched event ids;
// it is re-run whenever filters, search or thread change.
export function createContext({ model, parsers, store, host, root, select }) {
    const params = new URLSearchParams(location.search);
    const showDrafts = params.has('drafts');
    const run = state => select ? select(state) : selectEvents(model, { ...state, drafts: showDrafts });
    let matched = run(store.get());
    store.subscribe((state, prev) => {
        if (state.filters !== prev.filters || state.query !== prev.query || state.thread !== prev.thread) matched = run(state);
    });
    return {
        model,
        store,
        root,
        host,
        params,
        idPrefix: `gt${instances++}-`,
        showDrafts,
        matched: () => matched,
        fetchText,
        markdown: parsers.markdown,
        formatWhen: when => formatWhen(when, model.options.date_locale),
        onDetailLoaded: (event, detail) => {
            event.searchText += ' ' + fold(detail.text);
        },
    };
}

// Builds the explorer into `ctx`. `scrollOptions` go to the list view.
export function buildExplorer(ctx, { scrollOptions = {} } = {}) {
    const { model, store } = ctx;
    ctx.renderCharts = createChartRenderer(ctx);
    const threads = createThreads(ctx);
    ctx.renderThreads = threads?.renderThreads;
    const filters = createFilters(ctx);
    if (threads) filters.extra.append(threads.section);
    const scroll = createScrollView(ctx, scrollOptions);
    const tracks = createTracks(ctx);
    const mapped = hasMap(model);
    const toolbar = h('div', { class: 'toolbar' }, filters.toolbarItems, tracks?.toggle,
        mapped ? createViewSwitch(store) : null);
    const controls = h('div', { class: 'controls' }, toolbar, threads?.banner, filters.panel, tracks?.drawer);
    const app = h('div', { class: 'app', dataset: { view: store.get().view } }, controls, scroll.el);
    ctx.controls = controls;
    ctx.restoreControls = () => app.insertBefore(controls, scroll.el);
    ctx.restoreGlobe ??= el => app.prepend(el);
    const geo = mapped ? createGeoView(ctx) : null;
    if (geo) app.append(geo.el);
    if (!mapped && store.get().view === 'geo') store.set({ view: 'scroll' });
    ctx.columnRect ??= () => scroll.el.getBoundingClientRect();
    Object.assign(ctx, { app, toolbar, filters, scroll, geo });

    // Badges inside cards toggle filters; thread links open the thread.
    app.addEventListener('click', e => {
        const badge = e.target.closest('.badge[data-group]');
        if (badge) toggleFilter(store, badge.dataset.group, badge.dataset.value);
        const link = e.target.closest('.thread-link[data-thread]');
        if (link) store.set({ thread: link.dataset.thread }, 'threads');
    });
    store.subscribe((state, prev) => {
        if (state.filters !== prev.filters) {
            for (const b of app.querySelectorAll('.badge[data-group]')) {
                b.setAttribute('aria-pressed', String(Boolean(state.filters[b.dataset.group]?.has(b.dataset.value))));
            }
        }
        app.dataset.view = state.view;
    });
    return { app, scroll, geo, controls };
}

// Applies the page's heading font and sticky offset to a host element.
export function fitToPage(host, extra = () => 0) {
    const font = headingFont();
    if (font) host.style.setProperty('--gt-heading-font', font);
    const setOffset = () => host.style.setProperty('--gt-top', `${topOffset(host) + extra()}px`);
    setOffset();
    addEventListener('resize', setOffset, { passive: true });
    return setOffset;
}
