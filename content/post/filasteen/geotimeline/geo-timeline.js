// <geo-timeline src="timeline.yaml"> — renders a timeline described by a
// schema-1 manifest. Content already inside the element (e.g. a static list
// generated at build time) is shown until the timeline is ready.
//
// Attributes:
//   src     manifest URL (required)
//   hash    "off" to stop syncing state with the URL hash
//
// URL query flags: ?debug lists diagnostics on the page; ?drafts shows
// events marked `draft: true`.

import { loadParsers } from './deps.js';
import { load, fetchText } from './model/load.js';
import { normalize, fold } from './model/normalize.js';
import { validate } from './model/validate.js';
import { selectEvents } from './model/query.js';
import { formatWhen } from './model/dates.js';
import { createStore, readHash, syncHash } from './state.js';
import { h } from './views/dom.js';
import { createScrollView } from './views/scroll.js';
import { createFilters, toggleFilter } from './views/filters.js';
import { createDebugPanel, logDiagnostics } from './views/debug.js';
import { createGlobe } from './views/globe.js';
import { createChartRenderer } from './views/charts.js';
import { createTracks } from './views/tracks.js';
import { createGeoView, createViewSwitch } from './views/geo.js';
import { createThreads } from './views/threads.js';

const STYLE_URL = new URL('./styles.css', import.meta.url).href;
let instances = 0;

// Height of anything fixed to the top of the viewport (a site header), so
// the sticky toolbar sits below it.
function topOffset(host) {
    const x = innerWidth / 2;
    for (const el of document.elementsFromPoint(x, 1)) {
        if (host.contains(el) || el === document.documentElement || el === document.body) continue;
        const pos = getComputedStyle(el).position;
        if (pos === 'fixed' || pos === 'sticky') return Math.round(el.getBoundingClientRect().bottom);
    }
    return 0;
}

// The page's heading font, so cards match the surrounding post.
function headingFont() {
    const heading = document.querySelector('h1, h2');
    return heading ? getComputedStyle(heading).fontFamily : null;
}

class GeoTimeline extends HTMLElement {
    connectedCallback() {
        if (this.shadowRoot) return;
        this.instance = instances++;
        const root = this.attachShadow({ mode: 'open' });
        root.append(
            h('link', { rel: 'stylesheet', href: STYLE_URL }),
            h('div', { class: 'status', role: 'status' }, 'Loading timeline…'),
            h('slot'),
        );
        this.start(root).catch(e => this.fail(root, e));
    }

    fail(root, error) {
        console.error('geo-timeline:', error);
        root.querySelector('.status')?.replaceWith(h('div', { class: 'status error', role: 'alert' },
            `The interactive timeline could not be loaded (${error.message}).`));
    }

    async start(root) {
        const src = this.getAttribute('src');
        if (!src) throw new Error('missing `src` attribute');
        const params = new URLSearchParams(location.search);
        const parsers = await loadParsers();
        const loaded = await load(src, { fetchText, yamlLoad: parsers.yamlLoad });
        const model = validate(normalize(loaded, parsers));
        logDiagnostics(model.diagnostics, model.title || src);

        const defaults = { view: model.options.view, mode: model.options.filter_mode, spacing: model.options.spacing };
        const prefix = this.id ? `${this.id}.` : '';
        const hashOn = this.getAttribute('hash') !== 'off';
        const initial = hashOn ? readHash(location.hash, prefix, defaults) : readHash('', prefix, defaults);
        if (initial.focus && !model.events.some(e => e.id === initial.focus)) initial.focus = null;
        const store = createStore(initial);

        let matched = selectEvents(model, { ...initial, drafts: params.has('drafts') });
        store.subscribe((state, prev) => {
            if (state.filters !== prev.filters || state.query !== prev.query || state.thread !== prev.thread) {
                matched = selectEvents(model, { ...state, drafts: params.has('drafts') });
            }
        });

        const ctx = {
            model,
            store,
            root,
            host: this,
            idPrefix: `gt${this.instance}-`,
            showDrafts: params.has('drafts'),
            matched: () => matched,
            fetchText,
            markdown: parsers.markdown,
            formatWhen: when => formatWhen(when, model.options.date_locale),
            onDetailLoaded: (event, detail) => {
                event.searchText += ' ' + fold(detail.text);
            },
        };

        ctx.renderCharts = createChartRenderer(ctx);
        const threads = createThreads(ctx);
        ctx.renderThreads = threads?.renderThreads;
        const filters = createFilters(ctx);
        if (threads) filters.extra.append(threads.section);
        const scroll = createScrollView(ctx);
        const tracks = createTracks(ctx);
        const hasPlaces = model.events.some(e => e.where.some(w => w.lat !== null))
            && Boolean(model.basemap.world || model.basemap.regions.size);
        const toolbar = h('div', { class: 'toolbar' }, filters.toolbarItems, tracks?.toggle,
            hasPlaces ? createViewSwitch(store) : null);
        const controls = h('div', { class: 'controls' }, toolbar, threads?.banner, filters.panel, tracks?.drawer);
        const app = h('div', { class: 'app', dataset: { view: initial.view } }, controls, scroll.el);
        ctx.controls = controls;
        ctx.restoreControls = () => app.insertBefore(controls, scroll.el);
        ctx.restoreGlobe = el => app.prepend(el);
        const geo = hasPlaces ? createGeoView(ctx) : null;
        if (geo) app.append(geo.el);
        if (!hasPlaces && initial.view === 'geo') store.set({ view: 'scroll' });
        ctx.app = app;
        ctx.toolbar = toolbar;
        ctx.filters = filters;
        ctx.scroll = scroll;

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

        if (params.has('debug')) app.append(createDebugPanel(model.diagnostics));

        const font = headingFont();
        if (font) this.style.setProperty('--gt-heading-font', font);
        const setOffset = () => this.style.setProperty('--gt-top', `${topOffset(this)}px`);
        setOffset();
        addEventListener('resize', setOffset, { passive: true });

        root.querySelector('.status').remove();
        root.querySelector('slot').remove();
        root.append(app);
        if (hashOn) syncHash(store, prefix, defaults);
        if (initial.focus) requestAnimationFrame(() => scroll.scrollToEvent(initial.focus, false));

        if (geo && store.get().view === 'geo') geo.enter();
        if (hasPlaces) {
            ctx.columnRect = () => scroll.el.getBoundingClientRect();
            createGlobe(ctx).then(globe => {
                ctx.globe = globe;
                this.globe = globe;
                app.prepend(globe.el);
                globe.start();
                geo.attachGlobe(globe);
                this.trackGlobeVisibility(globe);
                // On phones the bottom strip opens the map view.
                globe.el.addEventListener('click', () => {
                    if (store.get().view === 'scroll' && globe.el.dataset.layout === 'strip') store.set({ view: 'geo' }, 'strip');
                });
            }).catch(e => console.warn('geo-timeline: globe unavailable:', e));
        }

        this.model = model;
        this.store = store;
        this.dispatchEvent(new CustomEvent('ready', { detail: { model } }));
    }
}

// The backdrop globe is shown only while the timeline fills the bottom of
// the viewport, so it never covers the rest of the page.
GeoTimeline.prototype.trackGlobeVisibility = function (globe) {
    let ticking = false;
    const update = () => {
        ticking = false;
        const r = this.getBoundingClientRect();
        const inView = this.store.get().view === 'geo' || (r.top < innerHeight * 0.5 && r.bottom > innerHeight * 0.95);
        globe.el.classList.toggle('active', inView);
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update, { passive: true });
    this.store.subscribe(update);
    update();
};

if (!customElements.get('geo-timeline')) customElements.define('geo-timeline', GeoTimeline);
