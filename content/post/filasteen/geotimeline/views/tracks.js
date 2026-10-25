// Series tracks: one sparkline per timeline-wide series across the
// timeline's span, with a marker at the focused event's date and the latest
// value at or before it. Shown in a drawer under the toolbar.

import { h, icon } from './dom.js';
import { loadD3 } from '../deps.js';
import { rowsOf, toTime, palette, withUnit } from './charts.js';

const HEIGHT = 34;
const fmt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

export function createTracks(ctx) {
    const { model, store } = ctx;
    const series = [...model.series.values()].filter(s => s.track);
    if (!series.length || !model.events.length) return null;

    const drawer = h('div', { class: 'tracks', id: `${ctx.idPrefix}tracks`, hidden: true });
    const toggle = h('button', { type: 'button', class: 'tool', 'aria-expanded': 'false', 'aria-controls': drawer.id },
        icon('chart'), h('span', { class: 'tool-label' }, 'Data'));
    toggle.addEventListener('click', () => {
        drawer.hidden = !drawer.hidden;
        toggle.setAttribute('aria-expanded', String(!drawer.hidden));
        if (!drawer.hidden) draw();
    });

    const t0 = model.events[0].t0;
    const t1 = Math.max(...model.events.map(e => (Number.isFinite(e.t1) ? e.t1 : e.t0)));
    let prepared = null;

    async function prepare() {
        if (!prepared) {
            prepared = Promise.all([loadD3(), ...series.map(s => rowsOf(s, ctx).catch(() => []))]).then(([d3, ...all]) => ({
                d3,
                data: series.map((s, i) => {
                    const rows = all[i];
                    const x = s.x ?? rows.columns?.[0];
                    const ys = s.y ?? (rows.columns ?? []).filter(c => c !== x);
                    return ys.map(y => ({
                        name: ys.length > 1 ? `${s.label}: ${y}` : s.label,
                        unit: s.unit,
                        points: rows.map(r => ({ t: toTime(r[x]), v: r[y], x: r[x] }))
                            .filter(p => p.t !== null && typeof p.v === 'number')
                            .sort((a, b) => a.t - b.t),
                    }));
                }).flat(),
            }));
        }
        return prepared;
    }

    async function draw() {
        if (drawer.hidden) return;
        const { d3, data } = await prepare();
        const width = Math.max(200, drawer.clientWidth - 16);
        const colors = palette(ctx.host);
        const x = d3.scaleLinear().domain([t0, t1]).range([0, width]);
        const focus = model.events.find(e => e.id === store.get().focus);
        drawer.replaceChildren(...data.map((track, i) => {
            const y = d3.scaleLinear().domain([0, d3.max(track.points, p => p.v) || 1]).nice().range([HEIGHT - 3, 3]);
            const line = d3.line().x(p => x(p.t)).y(p => y(p.v));
            const svg = h('svg:svg', { width, height: HEIGHT, viewBox: `0 0 ${width} ${HEIGHT}`, class: 'track-plot', 'aria-hidden': 'true' });
            svg.append(h('svg:line', { x1: 0, x2: width, y1: HEIGHT - 3, y2: HEIGHT - 3, class: 'track-base' }));
            svg.append(h('svg:path', { d: line(track.points) ?? '', stroke: colors[i % colors.length], fill: 'none', 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
            for (const p of track.points) {
                svg.append(h('svg:circle', { cx: x(p.t), cy: y(p.v), r: 3, fill: colors[i % colors.length], class: 'track-dot' }));
            }
            let current = null;
            if (focus) {
                svg.append(h('svg:line', { x1: x(focus.t0), x2: x(focus.t0), y1: 0, y2: HEIGHT, class: 'track-focus' }));
                current = [...track.points].reverse().find(p => p.t <= focus.t0) ?? null;
            }
            return h('div', { class: 'track' },
                h('div', { class: 'track-label' },
                    h('span', { class: 'swatch', style: `background:${colors[i % colors.length]}` }),
                    h('span', { class: 'track-name' }, track.name),
                    h('span', { class: 'track-value' }, current ? `${withUnit(fmt.format(current.v), track.unit)} (${current.x})` : '—')),
                svg);
        }));
    }

    store.subscribe((state, prev) => { if (state.focus !== prev.focus) draw(); });
    let lastWidth = 0;
    new ResizeObserver(() => {
        if (drawer.clientWidth !== lastWidth) {
            lastWidth = drawer.clientWidth;
            draw();
        }
    }).observe(drawer);

    return { toggle, drawer };
}
