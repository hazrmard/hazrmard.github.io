// An orthographic globe on a canvas. It turns to the focused event's place
// and zooms in when that place belongs to a region.
//
// Layouts:
//   side   wide screens: a large globe rising from the bottom of the
//          viewport behind the reading column; the focused place is drawn
//          in the free margin beside the column.
//   strip  narrow screens: a fixed strip along the bottom of the viewport.
//   stage  the geo view: the globe fills its container and can be dragged.

import { loadTopojson } from '../deps.js';
import { h, prefersReducedMotion, toRgb } from './dom.js';
import { fromAngles, toAngles, slerp, rotationTo } from './versor.js';

const SIDE_MIN_MARGIN = 220;   // px of free space beside the column for `side`
const STRIP_HEIGHT = 0.26;     // fraction of the viewport height
const FLIGHT_MS = 1100;
const REGION_LAND_ZOOM = 3;    // switch to a region's detailed coast beyond this zoom

const geoCache = new Map();

function fetchJson(url) {
    if (!geoCache.has(url)) {
        geoCache.set(url, fetch(url).then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
            return r.json();
        }).catch(e => {
            console.warn('geo-timeline:', e.message);
            return null;
        }));
    }
    return geoCache.get(url);
}

// A TopoJSON topology's first object (or `land`) as GeoJSON; GeoJSON as is.
function toGeo(data, topojson) {
    if (!data) return null;
    if (data.type === 'Topology') {
        const key = data.objects.land ? 'land' : Object.keys(data.objects)[0];
        return topojson.feature(data, data.objects[key]);
    }
    return data;
}

// Land fill plus, when the file has one, a separate `coast` line layer (so
// a clipped extract has no false coastline along its clip box).
function toLand(data, topojson) {
    const fill = toGeo(data, topojson);
    const coast = data?.type === 'Topology' && data.objects.coast ? topojson.feature(data, data.objects.coast) : null;
    return fill ? { fill, coast: coast ?? fill } : null;
}

function themeColors(el) {
    const s = getComputedStyle(el);
    const v = name => s.getPropertyValue(name).trim();
    return { text: v('--gt-text') || '#1a1a1a', bg: v('--gt-bg') || '#fff', accent: v('--gt-accent') || '#806915', soft: v('--gt-accent-soft') || '#d4be6a' };
}

function rgba(color, alpha) {
    const [r, g, b] = toRgb(color);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export async function createGlobe(ctx) {
    const { model, store } = ctx;
    const topojson = await loadTopojson();
    const d3 = globalThis.d3;

    const canvas = h('canvas', { class: 'globe-canvas', 'aria-hidden': 'true' });
    const el = h('div', { class: 'globe', 'data-layout': 'side' }, canvas);
    const g = canvas.getContext('2d');
    const projection = d3.geoOrthographic().precision(0.3);
    const path = d3.geoPath(projection, g);
    const graticule = d3.geoGraticule10();

    const world = toLand(await fetchJson(model.basemap.world ?? ''), topojson);
    const regionLand = new Map();
    for (const r of model.basemap.regions.values()) {
        if (r.land) fetchJson(r.land).then(data => { regionLand.set(r.key, toLand(data, topojson)); draw(); });
    }

    let layout = 'side';
    let mode = 'backdrop';          // backdrop | stage
    let colors = null;
    let size = { w: 0, h: 0, dpr: 1 };
    let frame = null;
    // The current view: rotation quaternion and zoom (1 = whole globe).
    let view = { q: fromAngles([0, 0, 0]), zoom: 1 };
    let target = null;
    let anim = null;
    let boundaries = [];            // GeoJSON features for the focused period

    // ------------------------------------------------------------ geometry

    function located(e) {
        return e.where.filter(w => w.lat !== null && w.lon !== null);
    }

    // Screen geometry for the current layout.
    function frameGeometry() {
        const { w, h: ht } = size;
        if (mode === 'stage') {
            const sheet = ctx.stageInset?.() ?? { right: 0, bottom: 0 };
            const cw = w - sheet.right, ch = ht - sheet.bottom;
            const radius = Math.min(cw, ch) * 0.42;
            return { cx: cw / 2, cy: ch / 2, radius, anchor: [cw / 2, ch / 2], regionWidth: Math.min(cw, ch) * 0.9 };
        }
        if (layout === 'strip') {
            const radius = Math.max(w, ht) * 0.95;
            const capTop = ht * 0.12;
            return { cx: w / 2, cy: capTop + radius, radius, anchor: [w / 2, ht * 0.55], regionWidth: w * 0.9 };
        }
        const column = ctx.columnRect?.() ?? { left: w * 0.3, right: w * 0.7 };
        const radius = Math.max(w, ht) * 0.72;
        const capTop = ht * 0.5;
        const margin = Math.max(w - column.right, column.left);
        const ax = (w - column.right) >= column.left ? column.right + margin / 2 : column.left / 2;
        return { cx: w / 2, cy: capTop + radius, radius, anchor: [ax, ht * 0.78], regionWidth: Math.max(margin * 2.2, w * 0.45) };
    }

    function viewFor(event) {
        const geom = frameGeometry();
        const pts = event ? located(event) : model.events.flatMap(located);
        if (!pts.length) return null;
        const center = pts.length === 1 ? [pts[0].lon, pts[0].lat]
            : d3.geoCentroid({ type: 'MultiPoint', coordinates: pts.map(p => [p.lon, p.lat]) });
        const regions = new Set(pts.map(p => p.region));
        const region = event && regions.size === 1 ? model.basemap.regions.get([...regions][0]) : null;
        const zoom = region ? Math.max(1, geom.regionWidth / (region.span * Math.PI / 180) / geom.radius) : 1;
        // Where `center` must appear: the anchor, as a point on the unrotated sphere.
        placeProjection(geom, zoom, [0, 0, 0]);
        const onSphere = projection.invert(geom.anchor);
        const rotation = onSphere && !Number.isNaN(onSphere[0]) ? rotationTo(center, onSphere) : [-center[0], -center[1], 0];
        return { q: fromAngles(rotation), zoom };
    }

    // In the backdrop the globe grows downwards: the top of the cap stays put
    // while the radius grows, like descending towards the surface.
    function placeProjection(geom, zoom, rotation) {
        const cy = mode === 'stage' ? geom.cy : geom.cy + geom.radius * (zoom - 1);
        projection.rotate(rotation).scale(geom.radius * zoom).translate([geom.cx, cy]);
    }

    function applyView(v) {
        placeProjection(frameGeometry(), v.zoom, toAngles(v.q));
    }

    // --------------------------------------------------------------- drawing

    function draw() {
        if (!size.w || !colors) return;
        applyView(view);
        const { w, h: ht, dpr } = size;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, w, ht);
        const r = projection.scale();
        const [tx, ty] = projection.translate();
        const c = colors;

        // Atmosphere and ocean.
        // (A ring only: inside its inner circle a radial gradient would
        // paint its first colour over the whole disc.)
        const outer = r + Math.min(60, r * 0.06);
        const glow = g.createRadialGradient(tx, ty, r, tx, ty, outer);
        glow.addColorStop(0, c.atmosphere);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = glow;
        g.beginPath();
        g.arc(tx, ty, outer, 0, 2 * Math.PI);
        g.arc(tx, ty, r, 0, 2 * Math.PI, true);
        g.fill('evenodd');
        g.beginPath();
        path({ type: 'Sphere' });
        g.fillStyle = c.ocean;
        g.fill();

        g.beginPath();
        path(graticule);
        g.strokeStyle = c.graticule;
        g.lineWidth = 0.6;
        g.stroke();

        // Land: when zoomed in, a region's detailed coast over the world fill
        // (fills are opaque, so the overlap does not show).
        const fine = view.zoom >= REGION_LAND_ZOOM ? [...regionLand.values()].filter(Boolean) : [];
        const layers = [world, ...fine].filter(Boolean);
        g.fillStyle = c.land;
        for (const land of layers) {
            g.beginPath();
            path(land.fill);
            g.fill();
        }
        g.strokeStyle = c.coast;
        g.lineWidth = 0.8;
        for (const land of fine.length ? fine : layers) {
            g.beginPath();
            path(land.coast);
            g.stroke();
        }

        for (const f of boundaries) {
            g.beginPath();
            path(f);
            g.fillStyle = c.boundaryFill;
            g.fill();
            g.setLineDash([4, 3]);
            g.strokeStyle = c.boundary;
            g.lineWidth = 1.2;
            g.stroke();
            g.setLineDash([]);
        }

        drawEvents();
    }

    function visibleOnGlobe(lon, lat) {
        const rot = projection.rotate();
        return d3.geoDistance([lon, lat], [-rot[0], -rot[1]]) < Math.PI / 2 - 0.01;
    }

    let hits = [];
    function drawEvents() {
        const matched = ctx.matched();
        const focus = store.get().focus;
        const groups = new Map();
        for (const e of model.events) {
            if (!matched.has(e.id)) continue;
            for (const p of located(e)) {
                const key = `${p.lon.toFixed(3)},${p.lat.toFixed(3)}`;
                if (!groups.has(key)) groups.set(key, { lon: p.lon, lat: p.lat, name: p.name, approximate: p.approximate, events: [] });
                groups.get(key).events.push(e.id);
            }
        }
        hits = [];
        const c = colors;
        let focused = null;
        for (const grp of groups.values()) {
            if (!visibleOnGlobe(grp.lon, grp.lat)) continue;
            const [x, y] = projection([grp.lon, grp.lat]);
            const n = grp.events.length;
            const radius = Math.min(9, 2.5 + Math.sqrt(n) * 1.4);
            hits.push({ x, y, radius: Math.max(radius, 10), group: grp });
            g.beginPath();
            g.arc(x, y, radius, 0, 2 * Math.PI);
            g.fillStyle = c.point;
            g.fill();
            if (grp.events.includes(focus)) focused = { x, y, grp };
        }
        if (focused) {
            const { x, y, grp } = focused;
            g.beginPath();
            g.arc(x, y, 11, 0, 2 * Math.PI);
            g.strokeStyle = c.focus;
            g.lineWidth = 2;
            if (grp.approximate) g.setLineDash([3, 3]);
            g.stroke();
            g.setLineDash([]);
            g.beginPath();
            g.arc(x, y, 4, 0, 2 * Math.PI);
            g.fillStyle = c.focus;
            g.fill();
            if (grp.name) {
                g.font = `600 13px ${getComputedStyle(el).fontFamily}`;
                g.textBaseline = 'middle';
                g.lineWidth = 4;
                g.strokeStyle = c.halo;
                g.strokeText(grp.name, x + 16, y);
                g.fillStyle = c.label;
                g.fillText(grp.name, x + 16, y);
            }
        }
    }

    function refreshColors() {
        const t = themeColors(el);
        const a = rgba;
        // Opaque mix of text into background, for fills that overlap.
        const mix = k => {
            const [r1, g1, b1] = toRgb(t.bg), [r2, g2, b2] = toRgb(t.text);
            return `rgb(${Math.round(r1 + (r2 - r1) * k)}, ${Math.round(g1 + (g2 - g1) * k)}, ${Math.round(b1 + (b2 - b1) * k)})`;
        };
        colors = {
            ocean: a(t.text, 0.035),
            graticule: a(t.text, 0.06),
            land: mix(0.12),
            coast: a(t.text, 0.28),
            atmosphere: a(t.soft, 0.35),
            boundary: a(t.accent, 0.8),
            boundaryFill: a(t.accent, 0.08),
            point: a(t.text, 0.45),
            focus: t.accent,
            label: t.text,
            halo: a(t.bg, 0.85),
        };
        draw();
    }

    // ------------------------------------------------------------- motion

    function flyTo(next) {
        if (!next) return;
        target = next;
        cancelAnimationFrame(frame);
        if (prefersReducedMotion() || !size.w) {
            view = next;
            anim = null;
            draw();
            return;
        }
        const from = view;
        const rot = slerp(from.q, next.q);
        const z0 = Math.log(from.zoom), z1 = Math.log(next.zoom);
        const start = performance.now();
        const ease = d3.easeCubicInOut;
        anim = true;
        const step = now => {
            const t = Math.min(1, (now - start) / FLIGHT_MS);
            const e = ease(t);
            view = { q: rot(e), zoom: Math.exp(z0 + (z1 - z0) * e) };
            draw();
            if (t < 1) frame = requestAnimationFrame(step);
            else anim = null;
        };
        frame = requestAnimationFrame(step);
    }

    async function updateBoundaries(event) {
        const urls = new Set();
        if (event) {
            for (const p of model.periods) {
                if (p.t0 <= event.t0 && event.t0 < p.t1) p.boundaries.forEach(u => urls.add(u));
            }
            for (const w of event.where) if (w.geo) urls.add(w.geo.split('#')[0]);
        }
        const key = [...urls].join('|');
        if (key === updateBoundaries.key) return;
        updateBoundaries.key = key;
        const loaded = await Promise.all([...urls].map(u => fetchJson(u).then(d => toGeo(d, topojson))));
        if (key !== updateBoundaries.key) return;
        boundaries = loaded.filter(Boolean);
        draw();
    }

    function focusChanged() {
        const id = store.get().focus;
        const event = id ? model.events.find(e => e.id === id) : null;
        updateBoundaries(event);
        const next = event ? viewFor(event) : null;
        if (next) flyTo(next);
        else draw();
    }

    // ------------------------------------------------------------- sizing

    function resize() {
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(2, devicePixelRatio || 1);
        size = { w: rect.width, h: rect.height, dpr };
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        if (mode === 'backdrop') {
            const column = ctx.columnRect?.();
            const free = column ? Math.max(innerWidth - column.right, column.left) : 0;
            const next = free >= SIDE_MIN_MARGIN ? 'side' : 'strip';
            if (next !== layout) {
                layout = next;
                el.dataset.layout = layout;
                return resize();
            }
        }
        // A new frame means a new target: a flight planned for the old
        // geometry would land in the wrong place.
        cancelAnimationFrame(frame);
        anim = null;
        const id = store.get().focus;
        const event = id ? model.events.find(e => e.id === id) : null;
        view = viewFor(event) ?? view;
        draw();
    }

    new ResizeObserver(() => resize()).observe(canvas);
    const themeObserver = new MutationObserver(refreshColors);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', refreshColors);

    store.subscribe((state, prev) => {
        if (state.focus !== prev.focus) focusChanged();
        else if (state.filters !== prev.filters || state.query !== prev.query || state.thread !== prev.thread) draw();
    });

    return {
        el,
        canvas,
        start() {
            refreshColors();
            resize();
            focusChanged();
        },
        setMode(next) {
            mode = next;
            el.dataset.layout = mode === 'stage' ? 'stage' : layout;
            requestAnimationFrame(resize);
        },
        // For the geo view: hit testing and direct manipulation.
        hitTest(x, y) {
            let best = null;
            for (const hit of hits) {
                const d = Math.hypot(hit.x - x, hit.y - y);
                if (d <= hit.radius && (!best || d < best.d)) best = { d, group: hit.group };
            }
            return best?.group ?? null;
        },
        getView: () => view,
        setView(v) {
            cancelAnimationFrame(frame);
            anim = null;
            view = v;
            draw();
        },
        projection: () => projection,
        redraw: draw,
        isAnimating: () => Boolean(anim),
        target: () => target,
    };
}
