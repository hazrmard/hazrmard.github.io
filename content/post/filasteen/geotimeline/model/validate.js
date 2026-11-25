// Cross-reference checks that need the whole model, and thread membership.

import { matchesFilters } from './query.js';

export function validate(model) {
    const { events, sources, series, threads, diagnostics } = model;
    const at = (e, message, level = 'warning') => diagnostics.push({ level, file: e.file, line: e.line, message: `${e.id}: ${message}` });
    const byId = new Map(events.map(e => [e.id, e]));
    const threadIds = new Set(threads.map(t => t.id));

    for (const e of events) {
        for (const s of e.sources) {
            if (!sources.has(s.ref)) at(e, `unknown source \`${s.ref}\``);
        }
        if (e.sources.length === 0) at(e, 'no `sources`', 'info');
        if (e.where.length === 0) at(e, 'no `where`', 'info');
        for (const w of e.where) {
            if (w.lat === null && !w.geo && w.place) at(e, `place \`${w.place}\` has no coordinates`, 'info');
        }
        for (const t of e.threads) {
            if (!threadIds.has(t)) at(e, `unknown thread \`${t}\``);
        }
        for (const c of e.data) {
            if (c.series && !series.has(c.series)) at(e, `unknown series \`${c.series}\``);
        }
    }

    // Thread membership: explicit list (in its order), then `match`, then
    // events that name the thread themselves (chronological).
    for (const thread of threads) {
        const members = [];
        const seen = new Set();
        const add = e => { if (e && !seen.has(e.id)) { seen.add(e.id); members.push(e); } };
        for (const id of thread.listed) {
            const e = byId.get(id);
            if (!e) diagnostics.push({ level: 'warning', file: 'threads', line: null, message: `thread \`${thread.id}\` lists unknown event \`${id}\`` });
            add(e);
        }
        const rest = events.filter(e => e.threads.includes(thread.id)
            || (thread.match && matchesFilters(e, toFilters(thread.match), model.facets)));
        rest.forEach(add);
        thread.events = members.map(e => e.id);
    }
    for (const e of events) {
        e.threads = threads.filter(t => t.events.includes(e.id)).map(t => t.id);
    }
    return model;
}

function toFilters(match) {
    const filters = {};
    for (const [group, values] of Object.entries(match)) {
        filters[group] = new Set([].concat(values).map(String));
    }
    return filters;
}

export function summarize(diagnostics) {
    const counts = { error: 0, warning: 0, info: 0 };
    for (const d of diagnostics) counts[d.level] = (counts[d.level] || 0) + 1;
    return counts;
}
