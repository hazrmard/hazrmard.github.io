// Story pages: a narrative that cuts back to a timeline.
//
//   <geo-story src="timeline.yaml" now="2023-10-07" modes="woven,story,timeline"
//              default="woven" converge cutback-stubs events="story.timeline">
//     <h2 data-where="haifa" data-when="2023-10-09">…</h2>  <p>prose…</p>
//     <geo-cutback from="1878" to="1917" title="…" max="10"> fallback list </geo-cutback>
//     <geo-woven> text shown only when reading woven </geo-woven>
//   </geo-story>
//
// One globe serves the whole page. Story sections (prose between headings
// that carry data-where / data-when) hold it on their place, quietly; cut-backs
// list a slice of the timeline and move it. Readers switch between three
// modes: woven (both), story (prose only, cut-backs reduced to one line) and
// timeline (the full explorer, prose hidden). `converge` lets events marked
// `register: story` join the timeline in cut-backs with `converge` and in
// the timeline mode.

import { STYLE_URL, loadModel, createContext, buildExplorer, topOffset, headingFont, hasMap } from './app.js';
import { createStore, readHash, syncHash } from './state.js';
import { selectEvents } from './model/query.js';
import { cutbackSpec, selectCutback, sceneOf, nowOf } from './model/story.js';
import { formatPoint, parsePoint } from './model/dates.js';
import { h, icon } from './views/dom.js';
import { renderCard } from './views/card.js';
import { createScrollView } from './views/scroll.js';
import { createChartRenderer } from './views/charts.js';
import { createGlobe } from './views/globe.js';
import { createDebugPanel } from './views/debug.js';

const MODES = ['woven', 'story', 'timeline'];
const MODE_LABELS = { woven: 'Woven', story: 'Story', timeline: 'Timeline' };
const FOCUS_LINE = 0.4;
const SCENE_HEADING = 'h1, h2, h3, h4, h5, h6';

const years = dt => {
    const n = Math.round(Math.abs(dt));
    return n === 1 ? '1 year' : `${n} years`;
};
const yearOf = t => (t > 0 ? String(Math.floor(t)) : `${1 - Math.floor(t)} BCE`);
const list = value => String(value ?? '').split(',').map(s => s.trim()).filter(Boolean);
const shown = el => el.getClientRects().length > 0;

function storage(key, value) {
    try {
        if (value === undefined) return localStorage.getItem(key);
        localStorage.setItem(key, value);
    } catch { /* private mode etc.: the preference is just not remembered */ }
    return null;
}

// ---------------------------------------------------------------------------

class GeoStory extends HTMLElement {
    connectedCallback() {
        if (this.shadowRoot) return;
        const root = this.attachShadow({ mode: 'open' });
        this.status = h('div', { class: 'status story-status', role: 'status' }, 'Loading the timeline…');
        this.prose = h('div', { class: 'story-prose' }, h('slot'));
        root.append(h('link', { rel: 'stylesheet', href: STYLE_URL }), this.status, this.prose);
        this.start(root).catch(e => {
            console.error('geo-story:', e);
            // The prose and the static cut-back lists stay readable.
            this.status.className = 'status story-status error';
            this.status.setAttribute('role', 'alert');
            this.status.textContent = `The interactive timeline could not be loaded (${e.message}). The story and its event lists are shown as text.`;
        });
    }

    async start(root) {
        const src = this.getAttribute('src');
        if (!src) throw new Error('missing `src` attribute');
        const extraEvents = list(this.getAttribute('events')).map(u => new URL(u, location.href).href);
        const { model, parsers } = await loadModel(src, { extraEvents });
        const modes = list(this.getAttribute('modes')).filter(m => MODES.includes(m));
        this.modes = modes.length ? modes : MODES;
        const fallbackMode = this.modes.includes(this.getAttribute('default')) ? this.getAttribute('default') : this.modes[0];
        this.converge = this.hasAttribute('converge') && this.getAttribute('converge') !== 'false';
        this.stubs = this.hasAttribute('cutback-stubs') && this.getAttribute('cutback-stubs') !== 'false';
        this.nowT = nowOf(model, this.getAttribute('now'));
        const nowPoint = parsePoint(String(this.getAttribute('now') ?? ''));
        this.nowLabel = nowPoint ? formatPoint(nowPoint, model.options.date_locale) : yearOf(this.nowT);
        this.model = model;
        this.storeKey = `geo-story:${location.pathname}:reading`;

        const stored = storage(this.storeKey);
        const defaults = {
            view: 'scroll', mode: model.options.filter_mode, spacing: model.options.spacing,
            reading: fallbackMode, readings: this.modes,
        };
        const initial = readHash(location.hash, '', defaults);
        if (!/(^|[#&])r=/.test(location.hash) && this.modes.includes(stored)) initial.reading = stored;
        if (initial.focus && !model.events.some(e => e.id === initial.focus)) initial.focus = null;
        initial.view = 'scroll';
        initial.scene = null;
        const store = createStore(initial);
        this.store = store;

        const drafts = new URLSearchParams(location.search).has('drafts');
        this.ctx = createContext({
            model, parsers, store, host: this, root,
            select: state => selectEvents(model, { ...state, drafts, hideStory: !this.converge }),
        });
        this.ctx.renderCharts = createChartRenderer(this.ctx);
        this.parsers = parsers;
        this.problems = [];

        this.segments = this.collectSegments();
        this.cutbacks = this.segments.filter(s => s.type === 'cutback').map(s => s.el);
        for (const cb of this.cutbacks) cb.setup(this);
        this.woven = [...this.querySelectorAll('geo-woven')];

        // Chrome: ribbon with the mode switch, popover, explorer container.
        this.ribbon = this.buildRibbon();
        this.cardPop = h('div', { class: 'popover', role: 'dialog', 'aria-label': 'Event', hidden: true });
        this.explorerEl = h('div', { class: 'story-explorer', hidden: true });
        this.status.remove();
        root.insertBefore(this.ribbon, this.prose);
        root.append(this.explorerEl, this.cardPop);
        if (this.ctx.params.has('debug')) {
            const diags = [...model.diagnostics, ...this.problems.map(message => ({ level: 'warning', file: 'story', line: null, message }))];
            root.append(createDebugPanel(diags));
        }

        const font = headingFont();
        if (font) this.style.setProperty('--gt-heading-font', font);
        const setOffset = () => {
            const top = topOffset(this);
            this.style.setProperty('--gt-top', `${top}px`);
            this.style.setProperty('--gt-explorer-top', `${top + this.ribbon.offsetHeight}px`);
        };
        setOffset();
        addEventListener('resize', setOffset, { passive: true });

        this.globeSet = new Set();
        this.ctxGlobe = {
            ...this.ctx,
            matched: () => (store.get().reading === 'timeline' ? this.ctx.matched() : this.globeSet),
            columnRect: () => (store.get().reading === 'timeline' && this.explorer ? this.explorer.scroll.el : this).getBoundingClientRect(),
        };

        this.bindPopovers();
        store.subscribe((state, prev) => {
            if (state.reading !== prev.reading) this.applyMode(state.reading, prev.reading);
            if (state.focus !== prev.focus || state.scene !== prev.scene) this.drawRibbon();
        });
        syncHash(store, '', defaults);

        let ticking = false;
        addEventListener('scroll', () => {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(() => { ticking = false; this.onScroll(); });
            }
        }, { passive: true });
        addEventListener('resize', () => { this.drawRibbon(); this.onScroll(); }, { passive: true });

        this.applyMode(initial.reading, null);
        this.restoreInitial(initial);

        if (hasMap(model)) {
            createGlobe(this.ctxGlobe).then(globe => {
                this.globe = globe;
                this.ctx.globe = globe;
                root.prepend(globe.el);
                globe.start();
                if (this.explorer?.geo) this.explorer.geo.attachGlobe(globe);
                this.trackGlobe();
                this.onScroll(true);
            }).catch(e => console.warn('geo-story: globe unavailable:', e));
        }
        this.dispatchEvent(new CustomEvent('ready', { detail: { model } }));
    }

    // ------------------------------------------------------------ segments

    // Splits the prose into story sections (from one scene heading to the
    // next) and cut-backs, in document order.
    collectSegments() {
        const segments = [];
        let scene = { points: [], when: this.nowT, label: null };
        let current = null;
        for (const el of this.children) {
            if (el.localName === 'geo-cutback') {
                segments.push({ type: 'cutback', el });
                current = null;
                continue;
            }
            const isScene = el.matches(SCENE_HEADING) && (el.hasAttribute('data-where') || el.hasAttribute('data-when'));
            if (isScene) {
                const next = sceneOf({ ...el.dataset }, this.model);
                this.problems.push(...next.problems.map(p => `heading “${el.textContent.trim()}”: ${p}`));
                // A heading that names only a place or only a date keeps the
                // other from the previous section.
                scene = {
                    points: next.points.length || el.hasAttribute('data-where') ? next.points : scene.points,
                    when: next.when ?? scene.when,
                    label: el.textContent.trim(),
                };
            }
            if (isScene || !current) {
                current = { type: 'story', els: [], scene, heading: isScene ? el : null };
                segments.push(current);
            }
            current.els.push(el);
        }
        return segments;
    }

    segmentTop(seg) {
        const els = seg.type === 'cutback' ? [seg.el] : seg.els;
        const el = els.find(shown);
        return el ? el.getBoundingClientRect().top : null;
    }

    activeSegment() {
        const line = innerHeight * FOCUS_LINE;
        let active = null;
        for (const seg of this.segments) {
            const top = this.segmentTop(seg);
            if (top === null) continue;
            if (top <= line) active = seg;
            else break;
        }
        return active ?? this.segments.find(s => this.segmentTop(s) !== null) ?? null;
    }

    // Keeps the globe, its point set and the scene in step with the section
    // under the focus line.
    onScroll(force = false) {
        const reading = this.store.get().reading;
        if (reading === 'timeline') return;
        const seg = this.activeSegment();
        if (!seg || (seg === this.active && !force)) return;
        this.active = seg;
        const cutbackOpen = seg.type === 'cutback' && seg.el.isOpen();
        if (cutbackOpen) {
            seg.el.visited = true;
            this.globeSet = seg.el.ids;
            const first = seg.el.selection.shown.find(e => e.where.some(w => w.lat !== null));
            const scene = first ? { points: first.where.filter(w => w.lat !== null), when: first.t0 } : null;
            // A focus left over from another cut-back does not carry in.
            const focus = seg.el.contains(this.store.get().focus) ? this.store.get().focus : null;
            this.store.set({ focus, scene }, 'story');
            this.globe?.el.classList.remove('quiet');
        } else {
            const story = seg.type === 'story' ? seg : this.storyBefore(seg);
            this.globeSet = new Set();
            this.store.set({ focus: null, scene: story?.scene ?? null }, 'story');
            this.globe?.el.classList.add('quiet');
        }
        this.globe?.redraw();
        this.drawRibbon();
    }

    storyBefore(seg) {
        const i = this.segments.indexOf(seg);
        for (let j = i; j >= 0; j--) if (this.segments[j].type === 'story') return this.segments[j];
        return this.segments.find(s => s.type === 'story') ?? null;
    }

    storyAfter(seg) {
        const i = this.segments.indexOf(seg);
        return this.segments.slice(i + 1).find(s => s.type === 'story') ?? null;
    }

    scrollToSegment(seg, smooth = false) {
        const el = (seg.type === 'cutback' ? [seg.el] : seg.els).find(shown);
        if (!el) return;
        const top = el.getBoundingClientRect().top + scrollY - innerHeight * FOCUS_LINE + 4;
        scrollTo({ top: Math.max(0, top), behavior: smooth ? 'smooth' : 'auto' });
    }

    // The story section closest in date to t (ties: the earlier section).
    storyNear(t) {
        let best = null;
        for (const seg of this.segments) {
            if (seg.type !== 'story') continue;
            const d = Math.abs((seg.scene.when ?? this.nowT) - t);
            if (!best || d < best.d) best = { d, seg };
        }
        return best?.seg ?? null;
    }

    // The event (as listed in the explorer) closest in date to t.
    eventNear(t) {
        const matched = this.ctx.matched();
        let best = null;
        for (const e of this.model.events) {
            if (!matched.has(e.id)) continue;
            const d = Math.abs(e.t0 - t);
            if (!best || d < best.d) best = { d, e };
        }
        return best?.e ?? null;
    }

    // ---------------------------------------------------------------- modes

    setReading(mode, anchor = this.captureAnchor()) {
        if (!this.modes.includes(mode)) return;
        this.pendingAnchor = anchor;
        storage(this.storeKey, mode);
        this.store.set({ reading: mode }, 'mode');
    }

    captureAnchor() {
        const { reading, focus } = this.store.get();
        if (reading === 'timeline') return { focus };
        const seg = this.activeSegment();
        if (seg?.type === 'cutback' && seg.el.isOpen()) return { cutback: seg, focus: seg.el.contains(focus) ? focus : null };
        return { story: seg?.type === 'story' ? seg : this.storyBefore(seg) };
    }

    applyMode(mode, prev) {
        this.dataset.reading = mode;
        for (const b of this.ribbon.querySelectorAll('[data-mode]')) b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
        for (const w of this.woven) w.hidden = mode !== 'woven';
        for (const cb of this.cutbacks) cb.setMode(mode);
        const timeline = mode === 'timeline';
        this.prose.hidden = timeline;
        this.explorerEl.hidden = !timeline;
        this.closeCard();
        if (timeline) this.ensureExplorer();
        else if (this.store.get().view === 'geo') this.store.set({ view: 'scroll' }, 'mode');
        this.globe?.el.classList.toggle('quiet', !timeline);

        const anchor = this.pendingAnchor;
        this.pendingAnchor = null;
        if (prev !== null && anchor) requestAnimationFrame(() => this.restore(anchor, mode));
        this.active = null;
        requestAnimationFrame(() => { this.onScroll(true); this.drawRibbon(); this.globe?.redraw(); });
    }

    restore(anchor, mode) {
        const store = this.store;
        if (mode === 'timeline') {
            let id = anchor.focus;
            if (!id || !this.ctx.matched().has(id)) id = this.eventNear(anchor.story?.scene.when ?? anchor.cutback?.el.selection.t0 ?? this.nowT)?.id;
            if (!id) return;
            store.set({ focus: id, scene: null }, 'mode');
            this.explorer.scroll.scrollToEvent(id, false);
            return;
        }
        if (anchor.story) return this.scrollToSegment(anchor.story);
        if (anchor.cutback) {
            if (mode === 'story') return this.scrollToSegment(this.storyAfter(anchor.cutback) ?? anchor.cutback);
            return anchor.focus ? anchor.cutback.el.scrollToEvent(anchor.focus) : this.scrollToSegment(anchor.cutback);
        }
        if (anchor.focus) this.revealEvent(anchor.focus, mode);
    }

    // Brings an event into view in the prose modes: its card in a cut-back
    // (woven), else the story section nearest its date.
    revealEvent(id, mode = this.store.get().reading) {
        const event = this.model.events.find(e => e.id === id);
        if (!event) return;
        const cb = mode === 'woven' ? this.cutbacks.find(c => c.contains(id)) : null;
        if (cb) {
            this.store.set({ focus: id }, 'mode');
            cb.scrollToEvent(id);
            return;
        }
        const seg = this.storyNear(event.t0);
        if (seg) this.scrollToSegment(seg);
    }

    restoreInitial(initial) {
        if (!initial.focus) return;
        requestAnimationFrame(() => {
            if (initial.reading === 'timeline') this.explorer?.scroll.scrollToEvent(initial.focus, false);
            else this.revealEvent(initial.focus, initial.reading);
        });
    }

    // Opens the explorer, e.g. from a cut-back's "see all" or a card's
    // badge. Filters and thread are replaced, never merged with earlier ones.
    openTimeline({ focus = null, filters = {}, thread = null } = {}) {
        if (!this.modes.includes('timeline')) return;
        this.store.set({ filters, thread, query: '' }, 'story');
        this.setReading('timeline', { focus });
    }

    ensureExplorer() {
        if (this.explorer) return;
        const markers = this.segments.filter(s => s.type === 'story' && s.heading && s.scene.when !== null).map(s => ({
            t: s.scene.when,
            label: `↩ The story: ${s.heading.textContent.trim()}`,
            onClick: () => this.setReading(this.modes.includes('woven') ? 'woven' : 'story', { story: s }),
        }));
        this.ctx.restoreGlobe = el => this.shadowRoot.prepend(el);
        this.ctx.columnRect = () => this.explorer.scroll.el.getBoundingClientRect();
        this.explorer = buildExplorer(this.ctx, {
            scrollOptions: { markers, active: () => this.store.get().reading === 'timeline' },
        });
        this.explorerEl.append(this.explorer.app);
        if (this.globe && this.explorer.geo) this.explorer.geo.attachGlobe(this.globe);
    }

    // ---------------------------------------------------------------- ribbon

    buildRibbon() {
        this.track = h('svg:svg', { class: 'ribbon-track', 'aria-hidden': 'true', height: 22 });
        const switcher = this.modes.length > 1 ? h('div', { class: 'mode-switch', role: 'group', 'aria-label': 'Reading mode' },
            this.modes.map(m => h('button', {
                type: 'button', class: 'tool', 'data-mode': m, 'aria-pressed': 'false',
                onclick: () => this.setReading(m),
            }, MODE_LABELS[m]))) : null;
        const ribbon = h('div', { class: 'ribbon' }, this.track, switcher);
        new ResizeObserver(() => this.drawRibbon()).observe(ribbon);
        return ribbon;
    }

    // The span from the earliest cut-back to the story's present: cut-backs
    // fill in once read, the story's present is marked, and a marker shows
    // where the reader is in time.
    drawRibbon() {
        const svg = this.track;
        if (!svg) return;
        const width = svg.clientWidth || svg.parentNode?.clientWidth || 0;
        svg.replaceChildren();
        if (!width) return;
        const spans = this.cutbacks.map(cb => cb.span()).filter(Boolean);
        const t0 = Math.min(this.nowT, ...spans.map(s => s[0]));
        const t1 = Math.max(this.nowT, ...spans.map(s => s[1]));
        const pad = 6;
        const x = t => pad + (width - pad * 2) * ((t - t0) / ((t1 - t0) || 1));
        const add = (tag, attrs, text) => {
            const el = svg.appendChild(h(`svg:${tag}`, attrs));
            if (text) el.textContent = text;
            return el;
        };
        add('line', { x1: pad, x2: width - pad, y1: 8, y2: 8, class: 'ribbon-line' });
        for (const cb of this.cutbacks) {
            const s = cb.span();
            if (!s) continue;
            add('rect', { x: x(s[0]), y: 5, width: Math.max(3, x(s[1]) - x(s[0])), height: 6, rx: 3, class: cb.visited ? 'ribbon-span visited' : 'ribbon-span' });
        }
        add('line', { x1: x(this.nowT), x2: x(this.nowT), y1: 2, y2: 14, class: 'ribbon-now' });
        const { focus, scene, reading } = this.store.get();
        const event = focus ? this.model.events.find(e => e.id === focus) : null;
        const t = event?.t0 ?? (reading !== 'timeline' ? scene?.when : null);
        if (Number.isFinite(t)) add('circle', { cx: x(Math.max(t0, Math.min(t1, t))), cy: 8, r: 4, class: 'ribbon-pos' });
        add('text', { x: pad, y: 21, class: 'ribbon-label' }, yearOf(t0));
        add('text', { x: width - pad, y: 21, class: 'ribbon-label', 'text-anchor': 'end' }, `the story · ${yearOf(this.nowT)}`);
    }

    // -------------------------------------------------------------- popovers

    // Links in the prose to `#e=<id>` show the event's card instead of
    // navigating: on hover or keyboard focus, and pinned on click or tap.
    bindPopovers() {
        let hideTimer = null;
        const eventOf = a => {
            const id = new URLSearchParams(a.hash.slice(1)).get('e');
            return id ? this.model.events.find(e => e.id === id) : null;
        };
        const linkOf = target => target.closest?.('a[href*="#e="]');
        this.addEventListener('mouseover', e => {
            const a = linkOf(e.target);
            if (!a || this.pinned) return;
            clearTimeout(hideTimer);
            const event = eventOf(a);
            if (event) this.openCard(a, event, false);
        });
        this.addEventListener('mouseout', e => {
            if (linkOf(e.target) && !this.pinned) hideTimer = setTimeout(() => this.closeCard(), 300);
        });
        this.addEventListener('focusin', e => {
            const a = linkOf(e.target);
            const event = a && eventOf(a);
            if (event && !this.pinned && !this.refocusing) this.openCard(a, event, false);
        });
        this.addEventListener('focusout', e => {
            if (linkOf(e.target) && !this.pinned && !this.cardPop.contains(e.relatedTarget)) hideTimer = setTimeout(() => this.closeCard(), 150);
        });
        this.addEventListener('click', e => {
            const a = linkOf(e.target);
            const event = a && eventOf(a);
            if (!event) return;
            e.preventDefault();
            this.openCard(a, event, true);
        });
        this.cardPop.addEventListener('mouseenter', () => clearTimeout(hideTimer));
        // Badges and thread links on the card open the timeline with them.
        this.cardPop.addEventListener('click', e => {
            const id = this.cardPop.querySelector('article')?.dataset.event;
            const badge = e.target.closest('.badge[data-group]');
            const thread = e.target.closest('.thread-link[data-thread]');
            if (badge) this.openTimeline({ focus: id, filters: { [badge.dataset.group]: new Set([badge.dataset.value]) } });
            else if (thread) this.openTimeline({ focus: id, thread: thread.dataset.thread });
        });
        this.cardPop.addEventListener('mouseleave', () => { if (!this.pinned) hideTimer = setTimeout(() => this.closeCard(), 300); });
        addEventListener('keydown', e => { if (e.key === 'Escape' && !this.cardPop.hidden) { this.closeCard(); this.returnFocus(); } });
        addEventListener('pointerdown', e => {
            if (this.cardPop.hidden || !this.pinned) return;
            const path = e.composedPath();
            if (!path.includes(this.cardPop) && !path.includes(this.cardLink)) this.closeCard();
        });
        addEventListener('scroll', () => { if (!this.cardPop.hidden && !this.pinned) this.closeCard(); }, { passive: true });
    }

    openCard(link, event, pin) {
        this.pinned = pin;
        this.cardLink = link;
        const actions = h('div', { class: 'popover-actions' },
            this.modes.includes('timeline') ? h('button', { type: 'button', class: 'tool', onclick: () => this.openTimeline({ focus: event.id }) }, 'Show in the timeline') : null,
            h('button', { type: 'button', class: 'tool icon-only', 'aria-label': 'Close', onclick: () => { this.closeCard(); this.returnFocus(); } }, icon('close')));
        const card = renderCard(event, { ...this.ctx, idPrefix: `${this.ctx.idPrefix}pop-` }, { headingLevel: 3 });
        card.dataset.event = event.id;
        this.cardPop.replaceChildren(card, actions);
        this.cardPop.hidden = false;
        const r = link.getBoundingClientRect();
        const w = Math.min(380, innerWidth - 24);
        this.cardPop.style.width = `${w}px`;
        this.cardPop.style.left = `${Math.max(12, Math.min(innerWidth - w - 12, r.left))}px`;
        const below = r.bottom + 8;
        const height = this.cardPop.offsetHeight;
        this.cardPop.style.top = `${below + height < innerHeight - 8 ? below : Math.max(8, r.top - height - 8)}px`;
        if (pin) this.cardPop.querySelector('.popover-actions button')?.focus({ preventScroll: true });
    }

    // Back to the link that opened the card, without reopening it.
    returnFocus() {
        this.refocusing = true;
        this.cardLink?.focus();
        this.refocusing = false;
    }

    closeCard() {
        if (!this.cardPop) return;
        this.cardPop.hidden = true;
        this.pinned = false;
    }

    // ----------------------------------------------------------------- globe

    // Shown while the story fills the bottom of the viewport. In story
    // sections it is quiet: kept out from behind the prose and dimmed.
    trackGlobe() {
        const globe = this.globe;
        let ticking = false;
        const update = () => {
            ticking = false;
            const r = this.getBoundingClientRect();
            const inView = this.store.get().view === 'geo' || (r.top < innerHeight * 0.5 && r.bottom > innerHeight * 0.95);
            globe.el.classList.toggle('active', inView);
            const col = this.ctxGlobe.columnRect();
            globe.el.style.setProperty('--col-left', `${col.left}px`);
            globe.el.style.setProperty('--col-right', `${col.right}px`);
        };
        addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
        addEventListener('resize', update, { passive: true });
        this.store.subscribe(update);
        update();
    }
}

// ---------------------------------------------------------------------------

class GeoCutback extends HTMLElement {
    connectedCallback() {
        if (this.shadowRoot) return;
        const root = this.attachShadow({ mode: 'open' });
        root.append(h('link', { rel: 'stylesheet', href: STYLE_URL }), h('slot'));
    }

    setup(story) {
        const { model } = story;
        const attrs = Object.fromEntries([...this.attributes].map(a => [a.name, a.value]));
        this.spec = cutbackSpec(attrs, model);
        this.story = story;
        this.selection = selectCutback(model, this.spec, {
            now: story.nowT,
            storyConverge: story.converge,
            drafts: story.ctx.showDrafts,
        });
        const label = this.spec.title ?? attrs.id ?? `${attrs.from ?? ''}–${attrs.to ?? ''}`;
        story.problems.push(...this.selection.problems.map(p => `cut-back “${label}”: ${p}`));
        if (this.selection.all.length > 15 && !this.spec.max) story.problems.push(`cut-back “${label}”: ${this.selection.all.length} events inline; consider max=`);
        this.ids = new Set(this.selection.shown.map(e => e.id));
        this.visited = false;
        this.open = false;
        this.render();
    }

    span() {
        const all = this.selection.all;
        if (!all.length) return null;
        const times = all.map(e => e.t0);
        return [Math.min(...times), Math.max(...times)];
    }

    render() {
        const story = this.story;
        const sel = this.selection;
        const root = this.shadowRoot;
        const ctx = createContext({ model: story.model, parsers: story.parsers, store: story.store, host: story, root, select: () => this.ids });
        ctx.renderCharts = createChartRenderer(ctx);
        const span = this.span();
        const spanLabel = span ? (yearOf(span[0]) === yearOf(span[1]) ? yearOf(span[0]) : `${yearOf(span[0])}–${yearOf(span[1])}`) : '';
        const title = this.spec.title ?? spanLabel;
        const before = span ? story.nowT - span[0] : 0;
        const titleId = `${ctx.idPrefix}title`;

        this.view = createScrollView(ctx, {
            events: sel.shown,
            fixed: true,
            bounded: true,
            autoScroll: false,
            active: () => story.store.get().reading !== 'timeline' && this.isOpen(),
            headingLevel: 3,
            label: title,
        });

        const next = () => story.storyAfter(story.segments.find(s => s.el === this));
        const toStory = () => { const seg = next(); if (seg) story.scrollToSegment(seg, true); };
        const kicker = this.spec.converge ? 'Back to the present' : 'Cut back';
        const sub = span ? (this.spec.converge ? `${spanLabel} · up to the story` : `${spanLabel} · ${years(before)} before the story`) : 'No events';
        const head = h('header', { class: 'cutback-head' },
            h('p', { class: 'cutback-kicker' }, icon('prev'), kicker),
            h('h2', { class: 'cutback-title', id: titleId }, title),
            h('p', { class: 'cutback-sub' }, sub, ` · ${sel.all.length} ${sel.all.length === 1 ? 'event' : 'events'}`),
            h('button', { type: 'button', class: 'link-button cutback-skip', onclick: toStory }, 'Skip to the story ↓'));

        const more = sel.all.length > sel.shown.length && story.modes.includes('timeline')
            ? h('button', {
                type: 'button', class: 'tool cutback-more',
                // The explorer opens at the window's first event, narrowed by
                // the cut-back's own filters or thread, so its events follow
                // in order.
                onclick: () => story.openTimeline({ focus: sel.all[0].id, filters: this.spec.filters, thread: this.spec.thread }),
            }, this.spec.more ?? `Continue in the timeline: all ${sel.all.length} events from ${spanLabel}`) : null;

        const last = span ? span[1] : story.nowT;
        const footText = this.spec.converge
            ? 'The timeline has reached the story.'
            : `The story resumes · ${story.nowLabel} · ${years(story.nowT - last)} later`;
        const foot = h('footer', { class: 'cutback-foot' },
            more,
            h('button', { type: 'button', class: 'link-button cutback-return', onclick: toStory }, `↓ ${footText}`));

        this.body = h('section', { class: `cutback${this.spec.converge ? ' converge' : ''}`, 'aria-labelledby': titleId }, head, this.view.el, foot);
        this.stub = h('button', {
            type: 'button', class: 'cutback-stub', 'aria-expanded': 'false',
            onclick: () => { this.open = !this.open; this.setMode(story.store.get().reading); story.onScroll(true); },
        }, icon('prev'), `${title} · ${sel.all.length} ${sel.all.length === 1 ? 'event' : 'events'}`);

        // Badges and thread links inside cut-back cards open the explorer.
        this.body.addEventListener('click', e => {
            const badge = e.target.closest('.badge[data-group]');
            const card = e.target.closest('.card');
            if (badge) story.openTimeline({ focus: card?.dataset.id, filters: { [badge.dataset.group]: new Set([badge.dataset.value]) } });
        });
        root.querySelector('slot')?.remove();
        root.append(this.stub, this.body);
    }

    isOpen() {
        const reading = this.story?.store.get().reading;
        return reading === 'woven' || (reading === 'story' && this.open);
    }

    setMode(mode) {
        if (!this.body) return;
        this.dataset.mode = mode;
        const stubbed = mode === 'story';
        this.hidden = stubbed && !this.story.stubs;
        this.stub.hidden = !stubbed;
        this.stub.setAttribute('aria-expanded', String(this.open));
        this.body.hidden = !this.isOpen();
        if (!this.body.hidden) this.view.relayout();
    }

    contains(id) {
        return Boolean(id) && this.ids?.has(id);
    }

    scrollToEvent(id) {
        this.view?.scrollToEvent(id, false);
    }
}

// Text shown only in the woven reading (bridges between story and history).
class GeoWoven extends HTMLElement {}

if (!customElements.get('geo-cutback')) customElements.define('geo-cutback', GeoCutback);
if (!customElements.get('geo-woven')) customElements.define('geo-woven', GeoWoven);
if (!customElements.get('geo-story')) customElements.define('geo-story', GeoStory);
