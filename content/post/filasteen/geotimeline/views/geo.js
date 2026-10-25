// The geo-first view: the globe takes the stage, a sheet shows the focused
// event and a horizontal scrubber below steps through time. It reads and
// writes the same store as the scroll view, so focus and filters carry over.

import { h, icon, prefersReducedMotion } from './dom.js';
import { renderCard } from './card.js';
import { fromAngles, toAngles } from './versor.js';

const PLAY_MS = 2600;

// Time→x that blends a linear scale with event rank, so dense periods get
// room without losing the sense of elapsed time.
function blendedScale(times, width, mix = 0.6) {
    const sorted = [...new Set(times)].sort((a, b) => a - b);
    const t0 = sorted[0], t1 = sorted[sorted.length - 1];
    const span = t1 - t0 || 1;
    const rank = t => {
        if (sorted.length < 2) return 0.5;
        let lo = 0, hi = sorted.length - 1;
        if (t <= sorted[0]) return 0;
        if (t >= sorted[hi]) return 1;
        while (hi - lo > 1) {
            const mid = (lo + hi) >> 1;
            if (sorted[mid] <= t) lo = mid; else hi = mid;
        }
        const f = (t - sorted[lo]) / (sorted[hi] - sorted[lo] || 1);
        return (lo + f) / (sorted.length - 1);
    };
    const scale = t => width * ((1 - mix) * (t - t0) / span + mix * rank(t));
    scale.domain = [t0, t1];
    return scale;
}

export function createGeoView(ctx) {
    const { model, store } = ctx;
    const mapCell = h('div', { class: 'stage-map' });
    const sheetBody = h('div', { class: 'sheet-body', 'aria-live': 'polite' });
    const prev = h('button', { type: 'button', class: 'tool icon-only', 'aria-label': 'Previous event' }, icon('prev'));
    const play = h('button', { type: 'button', class: 'tool icon-only', 'aria-label': 'Play through events', 'aria-pressed': 'false' }, icon('play'));
    const next = h('button', { type: 'button', class: 'tool icon-only', 'aria-label': 'Next event' }, icon('next'));
    const sheet = h('aside', { class: 'sheet', 'aria-label': 'Focused event' }, sheetBody);
    const axis = h('svg:svg', { class: 'scrub-axis', 'aria-hidden': 'true' });
    const track = h('div', { class: 'scrub-track', role: 'slider', tabindex: '0', 'aria-label': 'Timeline', 'aria-valuemin': '0' }, axis);
    const scrubber = h('div', { class: 'scrubber' }, h('div', { class: 'scrub-buttons' }, prev, play, next), track);
    const controlsSlot = h('div', { class: 'stage-controls' });
    const stage = h('section', { class: 'stage', 'aria-label': 'Map view', hidden: true }, controlsSlot, mapCell, sheet, scrubber);

    const selectable = () => {
        const matched = ctx.matched();
        return model.events.filter(e => matched.has(e.id));
    };
    let list = selectable();
    let scale = null;

    // ------------------------------------------------------------- focus

    function step(delta) {
        list = selectable();
        if (!list.length) return;
        const i = list.findIndex(e => e.id === store.get().focus);
        const j = i === -1 ? (delta > 0 ? 0 : list.length - 1) : Math.max(0, Math.min(list.length - 1, i + delta));
        store.set({ focus: list[j].id }, 'geo');
        return j < list.length - 1;
    }
    prev.addEventListener('click', () => { stopPlay(); step(-1); });
    next.addEventListener('click', () => { stopPlay(); step(1); });

    let timer = null;
    function stopPlay() {
        clearInterval(timer);
        timer = null;
        play.setAttribute('aria-pressed', 'false');
        play.replaceChildren(icon('play'));
        play.setAttribute('aria-label', 'Play through events');
    }
    play.addEventListener('click', () => {
        if (timer) return stopPlay();
        play.setAttribute('aria-pressed', 'true');
        play.replaceChildren(icon('pause'));
        play.setAttribute('aria-label', 'Pause');
        if (!step(1)) return stopPlay();
        timer = setInterval(() => { if (!step(1)) stopPlay(); }, PLAY_MS);
    });

    // ----------------------------------------------------------- scrubber

    function drawAxis() {
        list = selectable();
        const width = track.clientWidth;
        const height = track.clientHeight || 44;
        axis.setAttribute('width', width);
        axis.setAttribute('height', height);
        axis.replaceChildren();
        if (!list.length || !width) return;
        const pad = 10;
        const all = model.events.filter(e => !e.draft || ctx.showDrafts);
        const inner = blendedScale(all.map(e => e.t0), width - pad * 2);
        scale = t => pad + inner(t);
        const add = (tag, attrs) => axis.appendChild(h(`svg:${tag}`, attrs));
        for (const p of model.periods) {
            const a = Math.max(p.t0, inner.domain[0]), b = Math.min(p.t1, inner.domain[1]);
            if (b <= a) continue;
            const r = add('rect', { x: scale(a), y: 4, width: Math.max(1, scale(b) - scale(a)), height: 4, rx: 2, class: 'scrub-period' });
            if (p.color) r.style.fill = p.color;
        }
        add('line', { x1: pad, x2: width - pad, y1: 22, y2: 22, class: 'scrub-line' });
        for (const e of list) {
            add('line', { x1: scale(e.t0), x2: scale(e.t0), y1: 16, y2: 28, class: 'scrub-tick', 'data-id': e.id });
        }
        // Year labels from a linear tick set, skipping any that would collide.
        const d3 = globalThis.d3;
        const years = d3 ? d3.ticks(inner.domain[0], inner.domain[1], 24) : [];
        let lastX = -Infinity;
        for (const y of years) {
            const x = scale(y);
            if (x - lastX < 42 || x > width - 16) continue;
            lastX = x;
            const t = add('text', { x, y: height - 4, class: 'scrub-label', 'text-anchor': 'middle' });
            t.textContent = String(Math.round(y));
        }
        add('circle', { cx: -10, cy: 22, r: 6, class: 'scrub-focus' });
        markFocus();
    }

    function markFocus() {
        const id = store.get().focus;
        const e = model.events.find(x => x.id === id);
        const dot = axis.querySelector('.scrub-focus');
        for (const t of axis.querySelectorAll('.scrub-tick.focused')) t.classList.remove('focused');
        if (e && dot && scale) {
            dot.setAttribute('cx', scale(e.t0));
            axis.querySelector(`.scrub-tick[data-id="${CSS.escape(e.id)}"]`)?.classList.add('focused');
        }
        const i = list.findIndex(x => x.id === id);
        track.setAttribute('aria-valuemax', String(Math.max(0, list.length - 1)));
        track.setAttribute('aria-valuenow', String(Math.max(0, i)));
        track.setAttribute('aria-valuetext', e ? `${e.whenLabel}: ${e.titleText}` : 'No event selected');
        prev.disabled = i <= 0;
        next.disabled = i === list.length - 1;
    }

    function nearestAt(clientX) {
        if (!scale || !list.length) return null;
        const x = clientX - track.getBoundingClientRect().left;
        let best = null;
        for (const e of list) {
            const d = Math.abs(scale(e.t0) - x);
            if (!best || d < best.d) best = { d, e };
        }
        return best.e;
    }
    let scrubbing = false;
    track.addEventListener('pointerdown', ev => {
        scrubbing = true;
        track.setPointerCapture(ev.pointerId);
        stopPlay();
        const e = nearestAt(ev.clientX);
        if (e) store.set({ focus: e.id }, 'geo');
    });
    track.addEventListener('pointermove', ev => {
        if (!scrubbing) return;
        const e = nearestAt(ev.clientX);
        if (e && e.id !== store.get().focus) store.set({ focus: e.id }, 'geo');
    });
    track.addEventListener('pointerup', () => { scrubbing = false; });
    track.addEventListener('keydown', ev => {
        if (ev.key === 'Home' || ev.key === 'End') {
            ev.preventDefault();
            list = selectable();
            if (list.length) store.set({ focus: list[ev.key === 'Home' ? 0 : list.length - 1].id }, 'geo');
        }
    });

    // --------------------------------------------------------------- sheet

    function renderSheet() {
        const id = store.get().focus;
        const e = model.events.find(x => x.id === id);
        if (!e) {
            sheetBody.replaceChildren(h('p', { class: 'sheet-empty' }, list.length
                ? 'Select a place on the map or a point on the timeline below.'
                : 'No events match these filters.'));
            return;
        }
        const card = renderCard(e, { ...ctx, idPrefix: `${ctx.idPrefix}sheet-` }, { headingLevel: 2 });
        if (!e.where.some(w => w.lat !== null)) {
            card.querySelector('header').append(h('p', { class: 'no-place' }, 'This event has no location on the map.'));
        }
        sheetBody.replaceChildren(card);
        sheetBody.scrollTop = 0;
    }

    // ------------------------------------------------------- globe control

    let globe = null;
    function attachGlobe(g) {
        globe = g;
        const canvas = g.canvas;
        let drag = null;
        const pointers = new Map();
        canvas.addEventListener('pointerdown', ev => {
            if (store.get().view !== 'geo') return;
            canvas.setPointerCapture(ev.pointerId);
            pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
            const v = g.getView();
            drag = { x: ev.clientX, y: ev.clientY, angles: toAngles(v.q), zoom: v.zoom, moved: false, dist: null };
            if (pointers.size === 2) {
                const [a, b] = [...pointers.values()];
                drag.dist = Math.hypot(a.x - b.x, a.y - b.y);
            }
            stopPlay();
        });
        canvas.addEventListener('pointermove', ev => {
            if (!drag) {
                const rect = canvas.getBoundingClientRect();
                canvas.style.cursor = g.hitTest(ev.clientX - rect.left, ev.clientY - rect.top) ? 'pointer' : 'grab';
                return;
            }
            pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
            if (pointers.size === 2 && drag.dist) {
                const [a, b] = [...pointers.values()];
                const zoom = Math.max(0.8, Math.min(60, drag.zoom * Math.hypot(a.x - b.x, a.y - b.y) / drag.dist));
                g.setView({ q: g.getView().q, zoom });
                drag.moved = true;
                return;
            }
            const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
            if (Math.hypot(dx, dy) > 4) drag.moved = true;
            if (!drag.moved) return;
            const k = 180 / Math.PI / g.projection().scale();
            const [l, p, gm] = drag.angles;
            g.setView({ q: fromAngles([l + dx * k, Math.max(-89, Math.min(89, p - dy * k)), gm]), zoom: g.getView().zoom });
            canvas.style.cursor = 'grabbing';
        });
        const end = ev => {
            pointers.delete(ev.pointerId);
            if (!drag) return;
            const moved = drag.moved;
            drag = pointers.size ? drag : null;
            if (moved) return;
            const rect = canvas.getBoundingClientRect();
            const group = g.hitTest(ev.clientX - rect.left, ev.clientY - rect.top);
            if (!group) return;
            // Several events at one place: step through them on repeated clicks.
            const ids = group.events;
            const i = ids.indexOf(store.get().focus);
            store.set({ focus: ids[(i + 1) % ids.length] }, 'map');
        };
        canvas.addEventListener('pointerup', end);
        canvas.addEventListener('pointercancel', ev => { pointers.delete(ev.pointerId); drag = null; });
        canvas.addEventListener('wheel', ev => {
            if (store.get().view !== 'geo') return;
            ev.preventDefault();
            const v = g.getView();
            g.setView({ q: v.q, zoom: Math.max(0.8, Math.min(60, v.zoom * Math.exp(-ev.deltaY * 0.0015))) });
        }, { passive: false });
        if (store.get().view === 'geo') enter();
    }

    // ---------------------------------------------------------- enter/exit

    let savedOverflow = null;
    function onKey(ev) {
        if (store.get().view !== 'geo' || ev.defaultPrevented) return;
        if (ev.target.closest?.('input, textarea, select, [contenteditable]')) return;
        const path = ev.composedPath();
        if (path.some(n => n.matches?.('input, textarea, select'))) return;
        if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') { ev.preventDefault(); stopPlay(); step(1); }
        else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') { ev.preventDefault(); stopPlay(); step(-1); }
        else if (ev.key === 'Escape' && !path.some(n => n.classList?.contains('panel'))) store.set({ view: 'scroll' }, 'geo');
    }
    addEventListener('keydown', onKey);

    function enter() {
        stage.hidden = false;
        controlsSlot.append(ctx.controls);
        if (globe) {
            mapCell.append(globe.el);
            globe.setMode('stage');
        }
        savedOverflow ??= document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';
        requestAnimationFrame(() => {
            drawAxis();
            renderSheet();
            if (!store.get().focus) step(1);
        });
    }

    function exit() {
        stopPlay();
        stage.hidden = true;
        ctx.restoreControls();
        if (globe) {
            ctx.restoreGlobe(globe.el);
            globe.setMode('backdrop');
        }
        document.documentElement.style.overflow = savedOverflow ?? '';
        savedOverflow = null;
    }

    new ResizeObserver(() => { if (!stage.hidden) drawAxis(); }).observe(track);

    store.subscribe((state, prev) => {
        if (state.view !== prev.view) {
            if (state.view === 'geo') enter(); else exit();
        }
        if (state.view !== 'geo') return;
        if (state.filters !== prev.filters || state.query !== prev.query || state.thread !== prev.thread) {
            drawAxis();
            if (!ctx.matched().has(state.focus)) renderSheet();
        }
        if (state.focus !== prev.focus) {
            markFocus();
            renderSheet();
        }
    });

    return { el: stage, attachGlobe, enter, isOpen: () => !stage.hidden, reducedMotion: prefersReducedMotion };
}

export function createViewSwitch(store) {
    const make = (view, label, name) => {
        const b = h('button', { type: 'button', class: 'tool', 'aria-pressed': String(store.get().view === view) },
            icon(name), h('span', { class: 'tool-label' }, label));
        b.addEventListener('click', () => store.set({ view }, 'switch'));
        return b;
    };
    const list = make('scroll', 'List', 'list');
    const map = make('geo', 'Map', 'globe');
    store.subscribe(state => {
        list.setAttribute('aria-pressed', String(state.view === 'scroll'));
        map.setAttribute('aria-pressed', String(state.view === 'geo'));
    });
    return h('div', { class: 'view-switch', role: 'group', 'aria-label': 'View' }, list, map);
}
