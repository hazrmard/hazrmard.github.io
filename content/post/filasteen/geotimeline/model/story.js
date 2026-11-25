// Pure helpers for story pages: which events a cut-back shows, and where a
// story section is.

import { parsePoint } from './dates.js';
import { matchesFilters } from './query.js';

// Attributes of <geo-cutback> with a fixed meaning; every other attribute
// naming a facet group is a filter on it.
export const CUTBACK_KEYS = new Set(['from', 'to', 'thread', 'events', 'title', 'max', 'more', 'converge', 'class', 'id', 'style']);

const list = value => String(value ?? '').split(',').map(s => s.trim()).filter(Boolean);

// The story's present as a decimal year: `now`, or the latest event.
export function nowOf(model, now) {
    const p = now ? parsePoint(String(now)) : null;
    if (p) return p.t0;
    return model.events.reduce((m, e) => Math.max(m, e.t0), -Infinity);
}

// Reads a cut-back spec from an attribute map.
export function cutbackSpec(attrs, model) {
    const filters = {};
    for (const [key, value] of Object.entries(attrs)) {
        if (!CUTBACK_KEYS.has(key) && model.facets.has(key)) filters[key] = new Set(list(value));
    }
    const max = attrs.max === undefined || attrs.max === '' ? null : Number(attrs.max);
    return {
        from: attrs.from ?? null,
        to: attrs.to ?? null,
        thread: attrs.thread ?? null,
        events: attrs.events ? list(attrs.events) : null,
        title: attrs.title ?? null,
        more: attrs.more ?? null,
        converge: attrs.converge !== undefined && attrs.converge !== 'false',
        max: Number.isFinite(max) && max > 0 ? Math.floor(max) : null,
        filters,
    };
}

// Picks `max` events: the most important first, then an even spread of the
// rest, returned in the original order.
export function pickSpread(events, max) {
    if (!max || events.length <= max) return events;
    const chosen = new Set();
    for (const level of [3, 2, 1]) {
        const pool = events.filter(e => e.importance === level && !chosen.has(e));
        const room = max - chosen.size;
        if (room <= 0) break;
        if (pool.length <= room) pool.forEach(e => chosen.add(e));
        else for (let i = 0; i < room; i++) chosen.add(pool[Math.round(i * (pool.length - 1) / Math.max(1, room - 1))]);
    }
    return events.filter(e => chosen.has(e));
}

// Returns {all, shown, t0, t1, problems}: `all` are the events the spec
// selects (thread or listed order, else chronological), `shown` the ones
// displayed inline (at most `max`). `t0`/`t1` bound the time window.
export function selectCutback(model, spec, { now, storyConverge = true, drafts = false } = {}) {
    const problems = [];
    const byId = new Map(model.events.map(e => [e.id, e]));
    let base;
    if (spec.thread) {
        const thread = model.threads.find(t => t.id === spec.thread);
        if (!thread) problems.push(`unknown thread \`${spec.thread}\``);
        base = (thread?.events ?? []).map(id => byId.get(id)).filter(Boolean);
    } else if (spec.events) {
        base = spec.events.map(id => {
            if (!byId.has(id)) problems.push(`unknown event \`${id}\``);
            return byId.get(id);
        }).filter(Boolean);
    } else {
        base = model.events;
    }

    const point = (text, edge) => {
        if (text === null) return edge === 'from' ? -Infinity : Infinity;
        // `to="now"` is open-ended: it reaches the story's present and the
        // story's own moments after it.
        if (String(text).trim() === 'now') return edge === 'from' ? now : Infinity;
        const p = parsePoint(String(text));
        if (!p) {
            problems.push(`cannot parse \`${edge}="${text}"\``);
            return edge === 'from' ? -Infinity : Infinity;
        }
        return edge === 'from' ? p.t0 : p.t1;
    };
    const t0 = point(spec.from, 'from');
    const t1 = point(spec.to, 'to');
    const withStory = spec.converge && storyConverge;

    const all = base.filter(e => (drafts || !e.draft)
        && (e.register !== 'story' || withStory)
        && e.t0 >= t0 && e.t0 < t1
        && matchesFilters(e, spec.filters, model.facets));
    if (!all.length) problems.push('selects no events');
    return { all, shown: pickSpread(all, spec.max), t0, t1, problems };
}

// A story section's scene from heading attributes: `data-where` is a place
// key or "lat,lon"; `data-name` labels a raw point; `data-when` a date.
export function sceneOf(attrs, model) {
    const out = { points: [], when: null, label: attrs.name ?? null, problems: [] };
    const where = String(attrs.where ?? '').trim();
    const coords = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/.exec(where);
    if (coords) {
        out.points.push({ lat: Number(coords[1]), lon: Number(coords[2]), name: attrs.name ?? null, region: attrs.region ?? null });
    } else {
        for (const key of list(where)) {
            const place = model.places.get(key);
            if (!place) out.problems.push(`unknown place \`${key}\``);
            else if (place.lat !== null) out.points.push({ lat: place.lat, lon: place.lon, name: attrs.name ?? place.name, region: place.region });
        }
    }
    if (attrs.when) {
        const p = parsePoint(String(attrs.when));
        if (p) out.when = p.t0;
        else out.problems.push(`cannot parse \`data-when="${attrs.when}"\``);
    }
    return out;
}
