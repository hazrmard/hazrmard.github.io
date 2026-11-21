// Charts attached to events (collapsible, drawn with Observable Plot on first
// open) and shared data loading for series tracks.
//
// Colour: categorical slots in a fixed order per chart (validated for
// adjacent-pair colour-vision separation on light and dark surfaces). Text
// never takes a series colour. Each chart has a legend for 2+ series and a
// table view.

import { h, icon, toRgb } from './dom.js';
import { loadD3, loadPlot } from '../deps.js';
import { parsePoint } from '../model/dates.js';

const PALETTE = {
    light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
    dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
};

const dataCache = new Map();

export function isDark(el) {
    const [r, g, b] = toRgb(getComputedStyle(el).getPropertyValue('--gt-bg').trim() || '#fff');
    return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128;
}

export const palette = el => PALETTE[isDark(el) ? 'dark' : 'light'];

// A chart x value as decimal years, when it is a year or date.
export function toTime(value) {
    if (value instanceof Date) return value.getUTCFullYear() + value.getUTCMonth() / 12 + (value.getUTCDate() - 1) / 365.25;
    const p = parsePoint(String(value));
    return p ? p.t0 : null;
}

// Rows of a chart or series spec, parsed from CSV with numbers typed.
export async function rowsOf(spec, ctx) {
    const d3 = await loadD3();
    const key = spec.file ?? spec.table;
    if (!dataCache.has(key)) {
        const text = spec.file ? ctx.fetchText(spec.file) : Promise.resolve(spec.table);
        dataCache.set(key, text.then(t => d3.csvParse(t.trim(), row => {
            const out = {};
            for (const [k, v] of Object.entries(row)) {
                const trimmed = v.trim();
                out[k.trim()] = trimmed !== '' && !Number.isNaN(Number(trimmed)) ? Number(trimmed) : trimmed;
            }
            return out;
        })).catch(e => {
            dataCache.delete(key);
            throw e;
        }));
    }
    return dataCache.get(key);
}

// Fills in x/y from the data when the spec leaves them out.
function columns(spec, rows) {
    const keys = rows.columns ?? Object.keys(rows[0] ?? {});
    const x = spec.x ?? keys[0];
    const y = spec.y ?? keys.filter(k => k !== x && typeof rows[0]?.[k] === 'number');
    return { x, y };
}

export const withUnit = (text, unit) => (!unit ? text : unit === '%' ? `${text}%` : `${text} ${unit}`);

const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });
const full = new Intl.NumberFormat();

function tableView(rows, x, y) {
    return h('details', { class: 'table-view' },
        h('summary', {}, 'Table'),
        h('div', { class: 'table-scroll' }, h('table', {},
            h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, x), y.map(c => h('th', { scope: 'col' }, c)))),
            h('tbody', {}, rows.map(r => h('tr', {},
                h('th', { scope: 'row' }, String(r[x])),
                y.map(c => h('td', {}, typeof r[c] === 'number' ? full.format(r[c]) : String(r[c] ?? '')))))))));
}

function legend(y, colors) {
    if (y.length < 2) return null;
    return h('ul', { class: 'legend' }, y.map((name, i) =>
        h('li', {}, h('span', { class: 'swatch', style: `background:${colors[i % colors.length]}` }), name)));
}

function sourcesLine(spec, ctx) {
    if (!spec.sources?.length && !spec.note) return null;
    const labels = (spec.sources ?? []).map(k => ctx.model.sources.get(k)?.label ?? k);
    return h('p', { class: 'chart-note' }, labels.length ? `Source: ${labels.join('; ')}` : null,
        labels.length && spec.note ? '. ' : null, spec.note);
}

// Resolves `{series: key}` and merges per-event overrides.
function resolve(spec, ctx) {
    if (!spec.series) return spec;
    const base = ctx.model.series.get(spec.series);
    if (!base) return null;
    const merged = { ...base };
    for (const [k, v] of Object.entries(spec)) {
        if (v !== null && v !== undefined && k !== 'series' && !(Array.isArray(v) && v.length === 0)) merged[k] = v;
    }
    return merged;
}

export async function drawChart(container, spec, event, ctx) {
    const resolved = resolve(spec, ctx);
    if (!resolved) throw new Error(`unknown series \`${spec.series}\``);
    const rows = await rowsOf(resolved, ctx);
    if (!rows.length) throw new Error('no data rows');
    const { x, y } = columns(resolved, rows);
    const colors = palette(ctx.host);
    const mark = resolved.mark ?? 'line';
    const parts = [];

    if (mark === 'stat') {
        const value = rows[0][y[0]];
        parts.push(h('div', { class: 'stat' },
            h('div', { class: 'stat-value' }, typeof value === 'number' ? compact.format(value) : String(value)),
            h('div', { class: 'stat-label' }, [String(rows[0][x] ?? ''), resolved.unit].filter(Boolean).join(' · '))));
    } else {
        const Plot = await loadPlot();
        const width = Math.max(240, container.clientWidth || 480);
        const long = rows.flatMap(r => y.map(series => ({ x: r[x], series, value: r[series] })))
            .filter(d => typeof d.value === 'number');
        const timeX = rows.every(r => toTime(r[x]) !== null) && mark !== 'bar';
        if (timeX) long.forEach(d => { d.t = toTime(d.x); });
        const color = { domain: y, range: colors.slice(0, Math.max(1, y.length)) };
        const style = { background: 'transparent', color: 'currentColor', fontSize: '12px', overflow: 'visible' };
        const css = getComputedStyle(ctx.host);
        const surface = css.getPropertyValue('--gt-surface').trim() || '#fff';
        const accent = css.getPropertyValue('--gt-accent').trim() || '#806915';
        const yLabel = resolved.unit ?? (y.length === 1 ? y[0] : null);
        let plot;
        if (mark === 'bar') {
            const n = new Set(long.map(d => d.x)).size;
            plot = Plot.plot({
                width, height: Math.min(420, 36 + n * y.length * 26), style, color,
                marginLeft: Math.min(180, 12 + Math.max(...long.map(d => String(d.x).length)) * 6.5),
                x: { grid: true, label: yLabel, tickFormat: v => compact.format(v), nice: true },
                y: { label: null, padding: 0.3, domain: y.length > 1 ? y : [...new Set(long.map(d => d.x))] },
                fy: y.length > 1 ? { label: null } : undefined,
                marks: [
                    Plot.barX(long, { y: y.length > 1 ? 'series' : 'x', fy: y.length > 1 ? 'x' : undefined, x: 'value', fill: 'series', rx: 4, tip: true, title: d => `${d.x}${y.length > 1 ? ` — ${d.series}` : ''}: ${withUnit(full.format(d.value), resolved.unit)}` }),
                    Plot.ruleX([0]),
                ],
            });
        } else {
            const xKey = timeX ? 't' : 'x';
            const marks = [Plot.ruleY([0], { stroke: 'currentColor', strokeOpacity: 0.15 })];
            if (mark === 'area') marks.push(Plot.areaY(long, { x: xKey, y: 'value', fill: 'series', fillOpacity: 0.1, z: 'series' }));
            if (mark !== 'dot') marks.push(Plot.lineY(long, { x: xKey, y: 'value', stroke: 'series', strokeWidth: 2, z: 'series' }));
            marks.push(Plot.dot(long, { x: xKey, y: 'value', fill: 'series', r: 4, stroke: surface, strokeWidth: 2 }));
            marks.push(Plot.tip(long, Plot.pointer({ x: xKey, y: 'value', title: d => `${d.x}${y.length > 1 ? ` — ${d.series}` : ''}: ${withUnit(full.format(d.value), resolved.unit)}` })));
            if (timeX && event) {
                marks.push(Plot.ruleX([event.t0], { stroke: accent, strokeWidth: 1.5, strokeDasharray: '3,3' }));
                marks.push(Plot.text([event.t0], { x: d => d, frameAnchor: 'top', dy: -2, text: () => event.whenLabel, fill: 'currentColor', fontSize: 11, textAnchor: 'start', dx: 4 }));
            }
            plot = Plot.plot({
                width, height: 200, style, color, marginTop: 24,
                x: { label: null, tickFormat: timeX ? (v => String(Math.floor(v))) : undefined, ...(timeX ? { type: 'linear' } : { type: 'point' }) },
                y: { grid: true, label: yLabel, tickFormat: v => compact.format(v), nice: true, zero: true },
                marks,
            });
        }
        plot.setAttribute('role', 'img');
        plot.setAttribute('aria-label', `${resolved.title ?? resolved.label ?? 'Chart'}: ${y.join(', ')} by ${x}. A table follows.`);
        parts.push(legend(y, colors), plot);
    }
    parts.push(tableView(rows, x, y), sourcesLine(resolved, ctx));
    container.replaceChildren(...parts.filter(Boolean));
}

export function createChartRenderer(ctx) {
    // Colours are computed when drawing, so drawn charts are redrawn when
    // the page theme changes.
    const drawn = new Set();
    const redraw = () => {
        for (const item of drawn) drawChart(item.body, item.spec, item.event, ctx).catch(() => {});
    };
    new MutationObserver(redraw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', redraw);

    return function renderCharts(event) {
        return event.data.map(spec => {
            const resolved = resolve(spec, ctx);
            const title = spec.title ?? resolved?.title ?? resolved?.label ?? 'Data';
            const body = h('div', { class: 'body chart-body' }, h('p', { class: 'loading' }, 'Loading chart…'));
            const el = h('details', { class: 'chart' }, h('summary', {}, icon('chart'), title), body);
            el.addEventListener('toggle', () => {
                if (!el.open || body.dataset.drawn) return;
                body.dataset.drawn = '1';
                drawChart(body, spec, event, ctx).then(() => drawn.add({ body, spec, event })).catch(e => {
                    delete body.dataset.drawn;
                    body.replaceChildren(h('p', { class: 'error' }, `Could not draw this chart (${e.message}).`));
                });
            });
            return el;
        });
    };
}
