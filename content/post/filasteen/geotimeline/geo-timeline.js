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
//
// For a narrative page that cuts back to the timeline, see story.js.

import { STYLE_URL, loadModel, createContext, buildExplorer, fitToPage, hasMap } from './app.js';
import { createStore, readHash, syncHash } from './state.js';
import { h } from './views/dom.js';
import { createDebugPanel } from './views/debug.js';
import { createGlobe } from './views/globe.js';

class GeoTimeline extends HTMLElement {
    connectedCallback() {
        if (this.shadowRoot) return;
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
        const { model, parsers } = await loadModel(src);

        const defaults = { view: model.options.view, mode: model.options.filter_mode, spacing: model.options.spacing };
        const prefix = this.id ? `${this.id}.` : '';
        const hashOn = this.getAttribute('hash') !== 'off';
        const initial = readHash(hashOn ? location.hash : '', prefix, defaults);
        if (initial.focus && !model.events.some(e => e.id === initial.focus)) initial.focus = null;
        const store = createStore(initial);
        const ctx = createContext({ model, parsers, store, host: this, root });
        const { app, scroll, geo } = buildExplorer(ctx);

        if (ctx.params.has('debug')) app.append(createDebugPanel(model.diagnostics));
        fitToPage(this);

        root.querySelector('.status').remove();
        root.querySelector('slot').remove();
        root.append(app);
        if (hashOn) syncHash(store, prefix, defaults);
        if (initial.focus) requestAnimationFrame(() => scroll.scrollToEvent(initial.focus, false));

        if (geo && store.get().view === 'geo') geo.enter();
        if (hasMap(model)) {
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
