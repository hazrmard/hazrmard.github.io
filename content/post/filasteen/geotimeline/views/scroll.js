// The default view: a vertical list of events. The event nearest a focus line
// (40% down the viewport) is focused. A gutter on the left draws periods and
// durations from a time→position mapping built from the cards' positions, so
// it stays aligned whatever the cards' heights.

import { h, SVG_NS, prefersReducedMotion } from './dom.js';
import { renderCard } from './card.js';

const FOCUS_LINE = 0.4;
const SCALED_PX_PER_YEAR = 48;
const SCALED_MAX_GAP = 600;

function yearsLabel(dt) {
    if (dt >= 1.5) return `${Math.round(dt)} years`;
    const months = Math.round(dt * 12);
    return months >= 2 ? `${months} months` : '1 month';
}

// Options (all optional), used by story cut-backs and the story explorer:
//   events       a fixed subset of events to list (default: all)
//   fixed        ignore filters/search/display options: list `events` as is
//   bounded      claim the focus only while the focus line is inside the list
//   active       () => bool; when false the view neither claims focus nor scrolls
//   autoScroll   false to not scroll to a focus set elsewhere
//   markers      [{t, label, onClick}] rows placed at time t (story sections)
//   headingLevel level of period headings (cards are one deeper); default 2
//   label        accessible name of the list
export function createScrollView(ctx, opts = {}) {
    const { model, store } = ctx;
    const source = opts.events ?? model.events;
    const active = opts.active ?? (() => true);
    const level = opts.headingLevel ?? 2;
    const cards = new Map();
    const list = h('ol', { class: 'events', 'aria-label': opts.label ?? 'Events' });
    const gutter = document.createElementNS(SVG_NS, 'svg');
    gutter.setAttribute('class', 'gutter');
    gutter.setAttribute('aria-hidden', 'true');
    const root = h('div', { class: 'timeline' }, gutter, list);

    for (const event of source) {
        // Cards sit one level under period headings.
        const li = h('li', { class: event.register === 'story' ? 'card story-event' : 'card', dataset: { id: event.id } },
            renderCard(event, ctx, { headingLevel: Math.min(6, model.periods.length ? level + 1 : level) }));
        cards.set(event.id, li);
    }

    let visible = [];          // events in the list (not hidden), in order
    let selectable = [];       // visible and matching (focus candidates)
    let positions = [];        // [{id, top, bottom}] of selectable cards, relative to the list
    let suppressUntil = 0;
    let frame = 0;

    // ---------------------------------------------------------------- layout

    function rebuild() {
        const state = opts.fixed ? { ...store.get(), mode: 'hide', spacing: 'compressed' } : store.get();
        const matched = opts.fixed ? new Set(source.map(e => e.id)) : ctx.matched();
        list.replaceChildren();
        visible = source.filter(e => (!e.draft || ctx.showDrafts) && (state.mode === 'dim' || matched.has(e.id)));
        selectable = visible.filter(e => matched.has(e.id));

        let prev = null;
        const periodsStarted = new Set();
        const markers = [...(opts.markers ?? [])].sort((a, b) => a.t - b.t);
        const placeMarkers = upTo => {
            while (markers.length && markers[0].t <= upTo) {
                const m = markers.shift();
                list.append(h('li', { class: 'story-marker' },
                    h('button', { type: 'button', class: 'link-button', onclick: m.onClick }, m.label)));
            }
        };
        for (const event of visible) {
            // Period headings where a period begins (only for periods that
            // start inside the list, and once each).
            for (const p of model.periods) {
                if (periodsStarted.has(p.id)) continue;
                if (p.t0 <= event.t0 && (prev === null ? true : p.t0 > prev.t0) && p.t1 > event.t0) {
                    periodsStarted.add(p.id);
                    list.append(h('li', { class: 'period-start', style: p.color ? `--period-color: ${p.color}` : null },
                        h(`h${level}`, { class: 'period-label' }, p.label), h('span', { class: 'period-when' }, ctx.formatWhen(p.when))));
                }
            }
            const li = cards.get(event.id);
            const dt = prev ? event.t0 - prev.t0 : 0;
            if (prev && dt >= model.options.gapYears) {
                list.append(h('li', { class: 'gap', 'aria-hidden': 'true' }, h('span', {}, yearsLabel(dt))));
            }
            placeMarkers(event.t0);
            li.style.marginTop = state.spacing === 'scaled' && prev
                ? `${Math.min(SCALED_MAX_GAP, Math.max(0, dt * SCALED_PX_PER_YEAR))}px` : '';
            li.classList.toggle('dim', !matched.has(event.id));
            list.append(li);
            prev = event;
        }
        placeMarkers(Infinity);
        if (visible.length === 0) {
            list.append(h('li', { class: 'empty' }, 'No events match these filters.'));
        }
        markFocus(state.focus);
        schedule();
    }

    function measure() {
        positions = selectable.map(e => {
            const li = cards.get(e.id);
            return { id: e.id, top: li.offsetTop, bottom: li.offsetTop + li.offsetHeight };
        });
    }

    // Piecewise-linear time→y through each visible card's (t0, top).
    function timeScale() {
        const anchors = visible.map(e => {
            const li = cards.get(e.id);
            return { t: e.t0, y: li.offsetTop + dotOffset(li) };
        });
        const end = list.offsetHeight;
        return t => {
            if (!anchors.length) return 0;
            if (t <= anchors[0].t) return anchors[0].y;
            for (let i = 0; i < anchors.length - 1; i++) {
                const a = anchors[i], b = anchors[i + 1];
                if (t <= b.t) return b.t === a.t ? b.y : a.y + (t - a.t) / (b.t - a.t) * (b.y - a.y);
            }
            return end;
        };
    }

    function dotOffset(li) {
        const title = li.querySelector('.title');
        return title ? title.offsetTop + Math.min(12, title.offsetHeight / 2) : 12;
    }

    function drawGutter() {
        const height = list.offsetHeight;
        gutter.setAttribute('height', height);
        gutter.style.height = `${height}px`;
        gutter.replaceChildren();
        if (!visible.length) return;
        const y = timeScale();
        const add = (tag, attrs) => {
            const el = document.createElementNS(SVG_NS, tag);
            for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
            gutter.append(el);
            return el;
        };
        const first = visible[0], last = visible[visible.length - 1];
        // Periods: lane 0, stacked by nesting depth.
        const lanes = [];
        for (const p of model.periods) {
            if (p.t1 <= first.t0 || p.t0 > last.t1) continue;
            let lane = lanes.findIndex(end => end <= p.t0);
            if (lane === -1) { lane = lanes.length; lanes.push(p.t1); } else lanes[lane] = p.t1;
            const y0 = y(Math.max(p.t0, first.t0)), y1 = p.t1 === Infinity || p.t1 > last.t0 ? height : y(p.t1);
            const rect = add('rect', { x: 2 + lane * 5, y: y0, width: 3, height: Math.max(1, y1 - y0), rx: 1.5, class: 'period-band' });
            if (p.color) rect.style.fill = p.color;
            const title = document.createElementNS(SVG_NS, 'title');
            title.textContent = p.label;
            rect.append(title);
        }
        const axisX = 2 + Math.max(1, lanes.length) * 5 + 6;
        add('line', { x1: axisX, x2: axisX, y1: y(first.t0), y2: height, class: 'axis' });

        // Durations: lanes to the right of the axis.
        const durLanes = [];
        for (const e of visible) {
            const ranged = e.when.end && e.when.end !== e.when.start;
            if (!ranged) continue;
            let lane = durLanes.findIndex(end => end <= e.t0);
            if (lane === -1) { lane = durLanes.length; durLanes.push(e.t1); } else durLanes[lane] = e.t1;
            const li = cards.get(e.id);
            const y0 = li.offsetTop + dotOffset(li);
            const y1 = e.when.open === 'end' ? height : Math.max(y0 + 6, y(e.t1));
            const bar = add('rect', { x: axisX + 5 + lane * 5, y: y0, width: 3, height: y1 - y0, rx: 1.5, class: 'duration', 'data-id': e.id });
            if (li.classList.contains('dim')) bar.classList.add('dim');
        }
        for (const e of visible) {
            const li = cards.get(e.id);
            const dot = add('circle', { cx: axisX, cy: li.offsetTop + dotOffset(li), r: 4, class: 'dot', 'data-id': e.id });
            if (li.classList.contains('dim')) dot.classList.add('dim');
        }
        root.style.setProperty('--gutter-width', `${axisX + 8 + durLanes.length * 5}px`);
        markFocus(store.get().focus);
    }

    function relayout() {
        frame = 0;
        measure();
        drawGutter();
        onScroll();
    }

    function schedule() {
        if (!frame) frame = requestAnimationFrame(relayout);
    }

    new ResizeObserver(schedule).observe(list);
    document.fonts?.ready.then(schedule);

    // ----------------------------------------------------------------- focus

    function markFocus(id) {
        for (const li of list.querySelectorAll('.card.focused')) {
            li.classList.remove('focused');
            li.removeAttribute('aria-current');
        }
        for (const dot of gutter.querySelectorAll('.focused')) dot.classList.remove('focused');
        if (!id || !cards.has(id)) return;
        const li = cards.get(id);
        li.classList.add('focused');
        li.setAttribute('aria-current', 'true');
        for (const el of gutter.querySelectorAll(`[data-id="${CSS.escape(id)}"]`)) el.classList.add('focused');
    }

    function onScroll() {
        if (!root.isConnected || !active() || store.get().view !== 'scroll' || performance.now() < suppressUntil) return;
        if (!positions.length) return;
        const line = innerHeight * FOCUS_LINE - list.getBoundingClientRect().top;
        // Above the list nothing new is focused; the last focus is kept.
        if (line < positions[0].top) return;
        if (opts.bounded && line > positions[positions.length - 1].bottom) return;
        // Last card whose top is above the line.
        let lo = 0, hi = positions.length - 1;
        while (lo < hi) {
            const mid = (lo + hi + 1) >> 1;
            if (positions[mid].top <= line) lo = mid; else hi = mid - 1;
        }
        const id = positions[lo].id;
        if (id !== store.get().focus) store.set({ focus: id }, 'scroll');
    }

    let ticking = false;
    addEventListener('scroll', () => {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(() => { ticking = false; onScroll(); });
        }
    }, { passive: true });

    // Scrolling to an event set elsewhere (a link, the map) must not change
    // the focus on the way, so scroll-driven focus is paused until the
    // scroll arrives, the reader takes over, or a fallback timeout passes.
    let scrollTarget = null;
    function scrollToEvent(id, smooth = true) {
        const li = cards.get(id);
        if (!li || !li.isConnected) return;
        const maxTop = document.documentElement.scrollHeight - innerHeight;
        const top = Math.max(0, Math.min(maxTop, li.getBoundingClientRect().top + scrollY - innerHeight * FOCUS_LINE + 8));
        const distance = top - scrollY;
        const animate = smooth && !prefersReducedMotion();
        scrollTarget = top;
        suppressUntil = performance.now() + 4000;
        // Long distances: jump most of the way, then glide the last screen.
        if (animate && Math.abs(distance) > innerHeight * 3) {
            scrollTo({ top: top - Math.sign(distance) * innerHeight, behavior: 'auto' });
        }
        scrollTo({ top, behavior: animate ? 'smooth' : 'auto' });
        if (!animate || Math.abs(scrollY - top) < 2) release();
    }
    function release() {
        scrollTarget = null;
        suppressUntil = 0;
    }
    addEventListener('scroll', () => {
        if (scrollTarget !== null && Math.abs(scrollY - scrollTarget) < 2) release();
    }, { passive: true });
    for (const type of ['wheel', 'touchstart', 'keydown']) {
        addEventListener(type, () => { if (scrollTarget !== null) release(); }, { passive: true });
    }

    list.addEventListener('click', e => {
        const li = e.target.closest('.card');
        if (!li || li.classList.contains('dim')) return;
        if (e.target.closest('a, button, summary, details[open] .body, input')) return;
        if (getSelection()?.toString()) return;
        store.set({ focus: li.dataset.id }, 'click');
        scrollToEvent(li.dataset.id);
    });

    store.subscribe((state, prev, origin) => {
        const filtersChanged = state.filters !== prev.filters || state.query !== prev.query
            || state.mode !== prev.mode || state.spacing !== prev.spacing || state.thread !== prev.thread;
        if (filtersChanged && !opts.fixed) rebuild();
        const follow = opts.autoScroll !== false && active();
        if (state.focus !== prev.focus) {
            markFocus(state.focus);
            if (follow && origin !== 'scroll' && origin !== 'click' && state.view === 'scroll' && state.focus) scrollToEvent(state.focus);
        }
        if (follow && state.view !== prev.view && state.view === 'scroll' && state.focus) {
            requestAnimationFrame(() => scrollToEvent(state.focus, false));
        }
    });

    rebuild();

    return {
        el: root,
        scrollToEvent,
        relayout: schedule,
        rebuild,
        card: id => cards.get(id),
        contains: id => cards.has(id) && cards.get(id).isConnected,
    };
}
